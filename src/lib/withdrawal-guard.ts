// src/lib/withdrawal-guard.ts
// ============================================================================
// WITHDRAWAL GUARDRAILS
//   P1 — KYC gate: only identity-verified accounts can move value OUT.
//   P2 — Card-funded hold: value funded via card (Stripe) cannot be withdrawn
//        until it settles (default 7 days). Defeats the classic onramp fraud
//        (stolen-card fund → instant crypto cashout → chargeback, where we'd
//        lose both the crypto AND the money) and bridges the Stripe→bank
//        payout delay.
// ============================================================================

import { Redis } from "@upstash/redis";
import { isKycVerified } from "@/lib/kyc-limits";
import { getTokenPrices } from "@/lib/v6-token-service";
import { getCryptoSpotPrice } from "@/lib/crypto-liquidation-service";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Hold window for card-funded value. Tunable via env without a redeploy.
const HOLD_DAYS = Math.max(0, parseInt(process.env.CARD_FUNDING_HOLD_DAYS || "7", 10) || 7);
const HOLD_MS = HOLD_DAYS * 24 * 60 * 60 * 1000;
const cardHoldKey = (a: string) => `user:${a.toLowerCase()}:card_holds`;

export interface GuardResult {
  ok: boolean;
  code?: string;
  error?: string;
  details?: Record<string, unknown>;
}

// ── P1: KYC gate ────────────────────────────────────────────────────────────
// Fail CLOSED: an account we cannot verify never gets value out.
export async function requireKycForWithdraw(address: string): Promise<GuardResult> {
  try {
    if (await isKycVerified(address)) return { ok: true };
  } catch (e) {
    console.error("[withdrawal-guard] KYC lookup failed:", e);
    return { ok: false, code: "kyc_check_failed", error: "Kimlik doğrulama kontrolü başarısız. Lütfen tekrar deneyin." };
  }
  return {
    ok: false,
    code: "kyc_required",
    error: "Para çekmek için kimlik doğrulaması (KYC) gerekli. Lütfen önce KYC'yi tamamlayın.",
  };
}

// ── P2: card-funded hold ─────────────────────────────────────────────────────

// Called from the Stripe webhook right after a card payment credits the user.
export async function recordCardFundingHold(
  address: string,
  amountUsd: number,
  paymentIntentId: string,
): Promise<void> {
  if (!address || !(amountUsd > 0)) return;
  const now = Date.now();
  const entry = JSON.stringify({ amountUsd, paymentIntentId, creditedAt: now, holdUntil: now + HOLD_MS });
  await redis.lpush(cardHoldKey(address), entry);
  await redis.ltrim(cardHoldKey(address), 0, 499); // keep bounded
}

// Drop a hold when its card payment is refunded, so a refunded deposit doesn't
// keep locking the account.
export async function releaseCardHoldByPaymentIntent(address: string, paymentIntentId: string): Promise<void> {
  if (!address || !paymentIntentId) return;
  const key = cardHoldKey(address);
  const raw = await redis.lrange(key, 0, 499);
  if (!raw?.length) return;
  const keep: string[] = [];
  for (const r of raw) {
    let h: any;
    try { h = typeof r === "string" ? JSON.parse(r) : r; } catch { keep.push(typeof r === "string" ? r : JSON.stringify(r)); continue; }
    if (h?.paymentIntentId === paymentIntentId) continue; // drop matching hold
    keep.push(typeof r === "string" ? r : JSON.stringify(r));
  }
  await redis.del(key);
  if (keep.length) await redis.rpush(key, ...keep);
}

// Sum still-held card USD; opportunistically prune expired entries.
export async function getHeldUsd(address: string): Promise<{ heldUsd: number; earliestRelease: number | null }> {
  const key = cardHoldKey(address);
  const raw = await redis.lrange(key, 0, 499);
  if (!raw?.length) return { heldUsd: 0, earliestRelease: null };
  const now = Date.now();
  let held = 0;
  let earliest: number | null = null;
  const keep: string[] = [];
  for (const r of raw) {
    let h: any;
    try { h = typeof r === "string" ? JSON.parse(r) : r; } catch { continue; }
    const until = Number(h?.holdUntil) || 0;
    if (until > now) {
      held += Number(h.amountUsd) || 0;
      if (earliest === null || until < earliest) earliest = until;
      keep.push(typeof r === "string" ? r : JSON.stringify(r));
    }
  }
  if (keep.length !== raw.length) {
    await redis.del(key);
    if (keep.length) await redis.rpush(key, ...keep);
  }
  return { heldUsd: held, earliestRelease: earliest };
}

// Total USD value of an account: metals (bid/g) + stables + crypto (spot).
async function getAccountUsdValue(address: string): Promise<number> {
  const bal = (await redis.hgetall(`user:${address.toLowerCase()}:balance`)) || {};
  const n = (k: string) => { const v = parseFloat((bal as any)[k]); return Number.isFinite(v) ? v : 0; };
  let usd = n("usdt") + n("usdc") + n("auxm") + n("usd") + n("bonusAuxm");
  for (const c of ["eth", "btc", "xrp", "sol"]) {
    const amt = n(c);
    if (amt) { try { const p = await getCryptoSpotPrice(c); if (p > 0) usd += amt * p; } catch {} }
  }
  for (const m of ["auxg", "auxs", "auxpt", "auxpd"]) {
    const amt = n(m);
    if (amt) { try { const pr = await getTokenPrices(m); usd += amt * (pr.bidPerGram || 0); } catch {} }
  }
  return usd;
}

// USD value of a withdrawal of `amount` units of `coin`.
export async function usdValueOf(coin: string, amount: number): Promise<number> {
  const c = (coin || "").toLowerCase();
  if (["usdt", "usdc", "auxm", "usd"].includes(c)) return amount;
  try { const p = await getCryptoSpotPrice(c); if (p > 0) return amount * p; } catch {}
  return amount; // best-effort fallback
}

// Enforce the hold: a withdrawal may not remove value that's still card-held.
// Fast path: no active holds → allow with zero valuation overhead.
export async function assertCardHoldAllows(address: string, withdrawUsd: number): Promise<GuardResult> {
  const { heldUsd, earliestRelease } = await getHeldUsd(address);
  if (heldUsd <= 0) return { ok: true };

  const totalUsd = await getAccountUsdValue(address);
  const availableUsd = totalUsd - heldUsd;
  const EPS = 0.01;
  if (withdrawUsd > availableUsd + EPS) {
    const releaseStr = earliestRelease ? new Date(earliestRelease).toISOString().slice(0, 10) : null;
    return {
      ok: false,
      code: "card_funding_hold",
      error:
        `Kart ile yatırılan ${heldUsd.toFixed(2)} USD takas için ${HOLD_DAYS} gün beklemede. ` +
        `Şu an çekilebilir: ${Math.max(0, availableUsd).toFixed(2)} USD.` +
        (releaseStr ? ` İlk serbest bırakma: ${releaseStr}.` : ""),
      details: { heldUsd, availableUsd: Math.max(0, availableUsd), withdrawUsd, earliestRelease },
    };
  }
  return { ok: true };
}
