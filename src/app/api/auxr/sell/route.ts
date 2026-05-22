// ============================================================================
// POST /api/auxr/sell
// ----------------------------------------------------------------------------
// Burn AUXR units and credit the user's AUXM balance with the proceeds at
// current NAV minus sell spread. Mirror of /api/auxr/buy.
//
// Phase 1A: off-chain. Reserves shrink by basket grams via
// auxr-reserve.recordBurn().
//
// Same auth / KYC / idempotency contract as buy.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getUserBalance,
  redis,
  getRedis,
  addTransaction,
} from "@/lib/redis";
import { quoteSell } from "@/lib/auxr-pricing";
import { recordBurn } from "@/lib/auxr-reserve";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BodySchema = z.object({
  address: z.string().min(10),
  unitsAUXR: z.number().positive(),
  source: z.string().optional(),
  refId: z.string().min(4).max(64).optional(),
});

// Canonical KYC check — reads kyc:{address}.status (same source as
// /api/user/profile + the mobile client). See buy route for the rationale.
const VERIFIED_KYC_STATUSES = new Set(["approved", "verified", "enhanced"]);
async function isKycVerified(walletAddress: string): Promise<boolean> {
  try {
    const raw = await redis.get(`kyc:${walletAddress.toLowerCase()}`);
    if (!raw) return false;
    const kyc = typeof raw === "string" ? JSON.parse(raw) : raw;
    return VERIFIED_KYC_STATUSES.has(String(kyc?.status || "").toLowerCase());
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  let body: z.infer<typeof BodySchema>;
  try {
    const raw = await request.json();
    body = BodySchema.parse(raw);
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: "invalid_request", details: e?.message },
      { status: 400 }
    );
  }

  const { address, unitsAUXR, source, refId } = body;
  const normalizedAddress = address.toLowerCase();

  // Idempotency
  if (refId) {
    const cached = await redis.get(`auxr:idempotency:${refId}`);
    if (cached) {
      try {
        const parsed = typeof cached === "string" ? JSON.parse(cached) : cached;
        return NextResponse.json({ success: true, replay: true, ...parsed });
      } catch {}
    }
  }

  // KYC required to redeem (matches buy — no demo redemption to USD).
  const kycVerified = await isKycVerified(normalizedAddress);
  if (!kycVerified) {
    return NextResponse.json(
      { success: false, error: "kyc_required" },
      { status: 403 }
    );
  }

  const balance = await getUserBalance(normalizedAddress);
  if (balance.auxr < unitsAUXR - 1e-9) {
    return NextResponse.json(
      {
        success: false,
        error: "insufficient_auxr",
        availableAuxr: balance.auxr,
        requiredAuxr: unitsAUXR,
      },
      { status: 400 }
    );
  }

  const quote = await quoteSell(unitsAUXR);

  // Execute: burn AUXR, credit AUXM. Proceeds go to paid auxm (not bonus)
  // because bonus is one-way (only ever credited by promotional flow).
  const balanceKey = `user:${normalizedAddress}:balance`;
  const pipe = getRedis().pipeline();
  pipe.hincrbyfloat(balanceKey, "auxr", -unitsAUXR);
  pipe.hincrbyfloat(balanceKey, "auxm", quote.proceedsUSD);
  pipe.hset(balanceKey, {
    totalAuxm: balance.auxm + quote.proceedsUSD + balance.bonusAuxm,
  });
  await pipe.exec();

  try {
    await recordBurn({
      unitsAUXR,
      refId,
      walletAddress: normalizedAddress,
      reason: `sell via ${source || "unknown"} — ${unitsAUXR.toFixed(6)} units`,
    });
  } catch (e) {
    console.error("[/api/auxr/sell] reserve burn failed:", e);
  }

  const txId = await addTransaction(normalizedAddress, {
    type: "swap",
    fromToken: "AUXR",
    toToken: "AUXM",
    fromAmount: unitsAUXR,
    toAmount: quote.proceedsUSD,
    status: "completed",
    metadata: {
      navUSD: quote.navUSD,
      sellPriceUSD: quote.sellPriceUSD,
      spreadUSD: quote.spreadUSD,
      source: source || null,
      refId: refId || null,
      metalsReleasedGrams: quote.metalsReleasedGrams,
    },
  });

  const result = {
    txId,
    unitsAUXR,
    proceedsUSD: quote.proceedsUSD,
    sellPriceUSD: quote.sellPriceUSD,
    navUSD: quote.navUSD,
    spreadUSD: quote.spreadUSD,
    timestamp: Date.now(),
  };

  if (refId) {
    await redis.set(`auxr:idempotency:${refId}`, JSON.stringify(result), {
      ex: 24 * 60 * 60,
    });
  }

  return NextResponse.json({ success: true, ...result });
}
