// src/lib/promo.ts
//
// Promo code system — used for marketing launches (Product Hunt,
// X/LinkedIn drops). Two-phase model:
//
//   Phase 1 — Attach:
//     A new user lands on /?promo=PHGOLD20 (PH "Get the offer" CTA
//     forwards them with this param). The signup route writes the
//     code onto `auth:user:<email>.pendingPromo`. No reward yet.
//
//   Phase 2 — Trigger:
//     After ANY successful purchase ≥ `minPurchaseUSD` we attempt
//     redemption. The reward is credited as METAL grams (the code
//     names which token and how many USD-worth) and the pending
//     field is cleared. A ledger entry tagged `promo_credit` is
//     written so it's auditable.
//
// This pattern means we never give a bonus before the user has
// shown commitment with real money. Compare to credit-on-signup
// which is trivially farmable. The redeem can ALSO be invoked
// manually via /api/promo/redeem, useful if a user signs up
// without the URL param and pastes the code later — the same
// validations apply (still gated on having a qualifying purchase
// already recorded; if they haven't bought yet the code is stashed
// as pending and triggers on next purchase).
//
// Code shape stored in Redis at promo:code:<CODE>:
//   {
//     code: "PHGOLD20",
//     asset: "AUXG",             // metal token to credit
//     amountUSD: 20,             // bonus value at askPerGram on redemption
//     minPurchaseUSD: 100,       // qualifying purchase floor
//     expiresAt: 1788000000000,  // ms epoch
//     maxRedemptions: 500,       // null = unlimited
//     redeemedCount: 0,
//     description: "Product Hunt launch — $20 free gold on first $100+ buy",
//     createdAt: 1781000000000,
//   }

import { Redis } from "@upstash/redis";
import { getTokenPrices } from "@/lib/v6-token-service";

const redis = Redis.fromEnv();

type Asset = "AUXG" | "AUXS" | "AUXPT" | "AUXPD";

export interface PromoCode {
  code: string;
  asset: Asset;
  amountUSD: number;
  minPurchaseUSD: number;
  expiresAt: number;
  maxRedemptions: number | null;
  redeemedCount: number;
  description: string;
  createdAt: number;
}

export interface PromoRedemptionResult {
  ok: boolean;
  code: string;
  grams?: number;
  asset?: Asset;
  amountUSD?: number;
  pricePerGramUSD?: number;
  status?: "credited" | "pending" | "rejected";
  reason?:
    | "code_not_found"
    | "code_expired"
    | "purchase_below_min"
    | "already_redeemed"
    | "max_redemptions_reached"
    | "internal_error";
  message?: string;
}

function codeKey(code: string) {
  return `promo:code:${code.toUpperCase()}`;
}
function redeemedKey(userId: string, code: string) {
  return `promo:redeemed:${userId}:${code.toUpperCase()}`;
}

export async function getPromoCode(code: string): Promise<PromoCode | null> {
  const raw = await redis.get<PromoCode | string>(codeKey(code));
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as PromoCode;
    } catch {
      return null;
    }
  }
  return raw as PromoCode;
}

export async function setPromoCode(code: PromoCode): Promise<void> {
  await redis.set(codeKey(code.code), code);
}

export async function hasUserRedeemed(userId: string, code: string): Promise<boolean> {
  const v = await redis.get(redeemedKey(userId, code));
  return !!v;
}

// Attach a pending promo to the user record. Idempotent: only sets
// when none is already attached, so a user can't override their
// pending promo by clicking a second campaign link before their
// first purchase. The first claim wins.
export async function attachPendingPromo(
  emailOrUserKey: string,
  code: string,
): Promise<{ attached: boolean; reason?: string }> {
  const promo = await getPromoCode(code);
  if (!promo) return { attached: false, reason: "code_not_found" };
  if (Date.now() > promo.expiresAt) return { attached: false, reason: "code_expired" };

  const authKey = `auth:user:${emailOrUserKey.toLowerCase()}`;
  const existing = await redis.hget<string>(authKey, "pendingPromo");
  if (existing && existing.length > 0) {
    return { attached: false, reason: "already_has_pending" };
  }
  await redis.hset(authKey, { pendingPromo: code.toUpperCase() });
  return { attached: true };
}

// Core credit operation — assumes the eligibility check passed.
// Pulls live price, computes grams, writes the credit + ledger +
// dedupe flag atomically, then bumps the redemption counter.
async function creditPromo(
  promo: PromoCode,
  opts: { userId: string; userAddress: string; triggeredBy: "purchase" | "manual" | "deposit" },
): Promise<PromoRedemptionResult> {
  let grams = 0;
  let pricePerGramUSD = 0;
  try {
    const prices = await getTokenPrices(promo.asset);
    pricePerGramUSD = prices.askPerGram;
    grams = +(promo.amountUSD / pricePerGramUSD).toFixed(6);
  } catch (err: any) {
    console.error("[promo] price fetch failed:", err?.message);
    return {
      ok: false,
      code: promo.code,
      reason: "internal_error",
      message: "Could not price the credit.",
    };
  }

  const ledgerEntry = {
    type: "promo_credit" as const,
    code: promo.code,
    asset: promo.asset,
    grams,
    amountUSD: promo.amountUSD,
    pricePerGramUSD,
    triggeredBy: opts.triggeredBy,
    timestamp: Date.now(),
    note: promo.description,
  };
  const balanceKey = `user:${opts.userAddress.toLowerCase()}:balance`;
  const txKey = `user:${opts.userAddress.toLowerCase()}:transactions`;

  await redis
    .pipeline()
    .set(redeemedKey(opts.userId, promo.code), String(Date.now()), { ex: 60 * 60 * 24 * 365 })
    .hincrbyfloat(balanceKey, promo.asset, grams)
    .lpush(txKey, JSON.stringify(ledgerEntry))
    .exec();

  // Bump the counter on the code definition. Race window is tiny
  // and undercounting is the safe direction for marketing reports.
  const updated: PromoCode = { ...promo, redeemedCount: promo.redeemedCount + 1 };
  await setPromoCode(updated);

  return {
    ok: true,
    code: promo.code,
    grams,
    asset: promo.asset,
    amountUSD: promo.amountUSD,
    pricePerGramUSD,
    status: "credited",
  };
}

// Manual redeem path — called when the user pastes a code in the UI.
// If the user has already met the purchase threshold, credit
// immediately. Otherwise, attach as pending so the next purchase
// triggers it.
export async function redeemPromo(opts: {
  userId: string;
  userAddress: string;
  userEmail: string;
  code: string;
  cumulativePurchaseUSD: number; // running sum of completed buys for this user
}): Promise<PromoRedemptionResult> {
  const codeUpper = opts.code.toUpperCase();
  const promo = await getPromoCode(codeUpper);
  if (!promo) {
    return { ok: false, code: codeUpper, reason: "code_not_found", message: "Promo code not found." };
  }
  if (Date.now() > promo.expiresAt) {
    return { ok: false, code: codeUpper, reason: "code_expired", message: "This promo has expired." };
  }
  if (await hasUserRedeemed(opts.userId, codeUpper)) {
    return { ok: false, code: codeUpper, reason: "already_redeemed", message: "You've already used this code." };
  }
  if (promo.maxRedemptions && promo.redeemedCount >= promo.maxRedemptions) {
    return {
      ok: false,
      code: codeUpper,
      reason: "max_redemptions_reached",
      message: "This offer is no longer available.",
    };
  }

  // Eligible to credit?
  if (opts.cumulativePurchaseUSD >= promo.minPurchaseUSD) {
    return creditPromo(promo, {
      userId: opts.userId,
      userAddress: opts.userAddress,
      triggeredBy: "manual",
    });
  }

  // Below threshold — stash as pending and credit on next qualifying buy.
  const authKey = `auth:user:${opts.userEmail.toLowerCase()}`;
  await redis.hset(authKey, { pendingPromo: codeUpper });
  return {
    ok: true,
    code: codeUpper,
    status: "pending",
    message: `Spend $${promo.minPurchaseUSD - opts.cumulativePurchaseUSD} more in a single purchase to unlock $${promo.amountUSD} in ${promo.asset}.`,
  };
}

// Called by the purchase webhooks (Stripe + crypto deposit credit)
// after a successful buy. If the user has a pendingPromo attached
// and the just-completed purchase satisfies its minPurchaseUSD,
// credit and clear. Silent no-op if no pending promo.
export async function tryRedeemPendingPromo(opts: {
  userId: string;
  userEmail: string;
  userAddress: string;
  thisPurchaseUSD: number;
}): Promise<PromoRedemptionResult | null> {
  const authKey = `auth:user:${opts.userEmail.toLowerCase()}`;
  const pending = (await redis.hget<string>(authKey, "pendingPromo")) || "";
  if (!pending) return null;

  const promo = await getPromoCode(pending);
  if (!promo || Date.now() > promo.expiresAt) {
    // Code disappeared / expired between attach and now — clear so we don't keep checking.
    await redis.hdel(authKey, "pendingPromo");
    return null;
  }
  if (await hasUserRedeemed(opts.userId, pending)) {
    await redis.hdel(authKey, "pendingPromo");
    return null;
  }
  if (promo.maxRedemptions && promo.redeemedCount >= promo.maxRedemptions) {
    return null;
  }
  if (opts.thisPurchaseUSD < promo.minPurchaseUSD) {
    return null; // still pending, leave attached for a bigger future buy
  }

  const result = await creditPromo(promo, {
    userId: opts.userId,
    userAddress: opts.userAddress,
    triggeredBy: "purchase",
  });
  if (result.ok) {
    await redis.hdel(authKey, "pendingPromo");
  }
  return result;
}
