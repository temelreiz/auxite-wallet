// src/app/api/stripe/onramp-session/route.ts
//
// Mints a Stripe onramp session for the signed-in customer and returns the
// hosted page URL. The delivery address is always that customer's own deposit
// address, never the shared hot wallet, because only per-user addresses can be
// credited automatically.

import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { requireSelf } from "@/lib/security/require-user";
import { blockUSPersonForFeature } from "@/lib/security/us-geofence";
import { assertAccountActive } from "@/lib/security/account-guard";
import { getClientIP } from "@/lib/security/rate-limiter";
import { armWatch, getUserDepositAddresses, isHdConfigured } from "@/lib/hd-deposit";
import { createOnrampRedirect, isOnrampEnabled, isOnrampUnavailable, onrampSessionParams } from "@/lib/stripe-onramp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const limiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 h"),
  prefix: "ratelimit:stripe:onramp",
});

export async function POST(req: NextRequest) {
  if (!isOnrampEnabled() || !isHdConfigured()) {
    return NextResponse.json({ error: "Not available", code: "onramp_unavailable" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const userAddress = String(body.userAddress || "").trim().toLowerCase();
  const self = requireSelf(req, userAddress);
  if (!self.ok) return self.response;
  if (!/^0x[0-9a-f]{40}$/.test(userAddress)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  const ip = getClientIP(req);
  const { success } = await limiter.limit(userAddress);
  if (!success) {
    return NextResponse.json({ error: "Too many requests", code: "rate_limited" }, { status: 429 });
  }

  const usGate = await blockUSPersonForFeature("fiatOnRamp", userAddress, req);
  if (usGate) return usGate;

  const gate = await assertAccountActive(userAddress);
  if (!gate.ok) return NextResponse.json({ error: gate.error, code: gate.code }, { status: 403 });

  try {
    const { evm, btc } = await getUserDepositAddresses(userAddress);
    await armWatch(evm, btc);
    const url = await createOnrampRedirect(onrampSessionParams(evm, btc, ip));
    return NextResponse.json({ url });
  } catch (err: any) {
    if (isOnrampUnavailable(err?.code)) {
      return NextResponse.json({ error: "Not available in your location", code: "onramp_unavailable" }, { status: 422 });
    }
    console.error("[stripe/onramp-session]", err?.code, err?.message);
    return NextResponse.json({ error: "Could not start the purchase", code: "onramp_failed" }, { status: 502 });
  }
}
