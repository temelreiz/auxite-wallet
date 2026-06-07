// src/app/api/promo/redeem/route.ts
//
// User-facing promo code endpoint. Two call patterns:
//
//   POST { code: "PHGOLD20", emailOrWallet: "x@y.com" or "0x..." }
//     → "attach" path. Stashes the code on the user record as
//        pendingPromo. The next qualifying purchase triggers the
//        credit via stripe/webhook.tryRedeemPendingPromo. Returns
//        the code's terms (minPurchaseUSD, amountUSD, asset) so the
//        UI can render a banner.
//
//   POST { code: "PHGOLD20", emailOrWallet, attemptRedeem: true }
//     → "attempt" path. Used when the UI wants to immediately try
//        crediting because the user has already bought through
//        another rail (crypto deposit, AUXR conversion). Reads the
//        user's cumulative purchase total from their transaction
//        list, and credits if it clears the threshold.
//
// We bias toward "attach now, credit at the right moment" — that's
// how the Product Hunt campaign expects to operate (paste code in
// signup, get bonus on first $100+ buy).

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import {
  attachPendingPromo,
  getPromoCode,
  redeemPromo,
} from "@/lib/promo";

const redis = Redis.fromEnv();

// Resolve { userId, email, address } from whatever identifier the
// client sent us. Email is canonical, but mobile users sometimes
// have a wallet address before email auth completes, so we accept
// both.
async function resolveUser(emailOrWallet: string): Promise<
  { userId: string; email: string; address: string } | null
> {
  const id = emailOrWallet.toLowerCase().trim();
  if (!id) return null;

  if (id.startsWith("0x")) {
    const userId = await redis.get<string>(`user:address:${id}`);
    if (!userId) return null;
    const profile = await redis.hgetall<Record<string, string>>(`user:${userId}`);
    return { userId, email: profile?.email || "", address: id };
  }
  // Email path: read auth:user:<email> for canonical id + walletAddress
  const authData = await redis.hgetall<Record<string, string>>(`auth:user:${id}`);
  if (!authData || !authData.id) return null;
  return {
    userId: authData.id,
    email: id,
    address: (authData.walletAddress || "").toLowerCase(),
  };
}

// Sum of past completed metal purchases for this address. Used by
// the attempt-redeem path so a user who already bought through a
// non-card rail (crypto deposit) can still trigger the credit by
// pasting the code afterward.
async function cumulativePurchaseUSD(userAddress: string): Promise<number> {
  if (!userAddress) return 0;
  const entries = (await redis.lrange<string>(`user:${userAddress}:transactions`, 0, 199)) || [];
  let total = 0;
  for (const raw of entries) {
    try {
      const tx = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (tx?.type === "buy" || tx?.action === "buy" || tx?.type === "metal_purchase") {
        const amt = Number(tx.amountUSD || tx.usdValue || tx.usd || 0);
        if (Number.isFinite(amt)) total += amt;
      }
    } catch {
      /* skip malformed entries */
    }
  }
  return total;
}

export async function POST(req: NextRequest) {
  let body: { code?: string; emailOrWallet?: string; attemptRedeem?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const code = String(body.code || "").trim().toUpperCase();
  const emailOrWallet = String(body.emailOrWallet || "").trim();
  if (!code) return NextResponse.json({ ok: false, error: "Code is required" }, { status: 400 });
  if (!emailOrWallet) {
    return NextResponse.json({ ok: false, error: "emailOrWallet is required" }, { status: 400 });
  }

  // Look up the code first so we can report its terms back even if
  // the user is brand new and we haven't created their record yet.
  const promo = await getPromoCode(code);
  if (!promo) {
    return NextResponse.json(
      { ok: false, error: "Promo code not found", code },
      { status: 404 },
    );
  }
  if (Date.now() > promo.expiresAt) {
    return NextResponse.json(
      { ok: false, error: "This promo has expired", code },
      { status: 410 },
    );
  }

  const user = await resolveUser(emailOrWallet);
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "User not found — sign up first", code },
      { status: 404 },
    );
  }

  // Attempt-redeem (rare path: user already bought, pasted code afterward)
  if (body.attemptRedeem) {
    const cumulative = await cumulativePurchaseUSD(user.address);
    const result = await redeemPromo({
      userId: user.userId,
      userAddress: user.address,
      userEmail: user.email,
      code,
      cumulativePurchaseUSD: cumulative,
    });
    return NextResponse.json({
      ...result,
      terms: {
        minPurchaseUSD: promo.minPurchaseUSD,
        amountUSD: promo.amountUSD,
        asset: promo.asset,
      },
    });
  }

  // Default path: attach for next qualifying purchase.
  const attach = await attachPendingPromo(user.email || user.address, code);
  return NextResponse.json({
    ok: attach.attached,
    code,
    status: attach.attached ? "pending" : "rejected",
    reason: attach.reason,
    terms: {
      minPurchaseUSD: promo.minPurchaseUSD,
      amountUSD: promo.amountUSD,
      asset: promo.asset,
    },
    message: attach.attached
      ? `Make a single purchase of $${promo.minPurchaseUSD} or more to unlock $${promo.amountUSD} in ${promo.asset}.`
      : attach.reason === "already_has_pending"
        ? "You already have a promo code waiting on your next purchase."
        : "Could not attach the code.",
  });
}
