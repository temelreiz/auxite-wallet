// ════════════════════════════════════════════════════════════════════════════
// KYC LIMITS
// ════════════════════════════════════════════════════════════════════════════
// Soft AML threshold: users may purchase up to NO_KYC_LIMIT_USD per
// transaction without completing KYC. Above the threshold, the API rejects
// with `kyc_required` and the client deep-links the user into the KYC flow.
//
// Strategy: per-transaction. Split-buys can technically bypass the cap,
// but the tradeoff is intentional — lower onboarding friction wins more
// new users than a tighter cumulative cap would catch attackers.
//
// All rails (card via Stripe, in-app AUXR buy, Wise wire credits) share
// this limit so the UX is consistent — "you can spend up to $500 with
// just an email, more with KYC" is one mental model the user holds across
// every funding flow.
// ════════════════════════════════════════════════════════════════════════════

import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const NO_KYC_LIMIT_USD = 500;
export const NO_KYC_CUMULATIVE_30D_USD = 1000;
const ROLLING_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

// Statuses that count as "KYC done" — superset of provider-specific labels
// returned by Sumsub / other vendors. Matches /api/auxr/buy gate.
const VERIFIED_KYC_STATUSES = new Set(["approved", "verified", "enhanced"]);

export async function isKycVerified(walletAddress: string): Promise<boolean> {
  try {
    const raw = await redis.get(`kyc:${walletAddress.toLowerCase()}`);
    if (!raw) return false;
    const kyc = typeof raw === "string" ? JSON.parse(raw) : raw;
    return VERIFIED_KYC_STATUSES.has(String(kyc?.status || "").toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Sum of USD purchases the user has made WITHOUT KYC over the last 30 days.
 * Reads `kyc:nokyc:30d:{wallet}` — a list of {ts, usd} entries written by
 * recordNoKycSpend after each successful unverified purchase.
 */
export async function getRecentNoKycSpendUSD(walletAddress: string): Promise<number> {
  try {
    const key = `kyc:nokyc:30d:${walletAddress.toLowerCase()}`;
    const raw = await redis.lrange(key, 0, 199);
    const cutoff = Date.now() - ROLLING_WINDOW_MS;
    let total = 0;
    for (const r of raw) {
      try {
        const e = typeof r === "string" ? JSON.parse(r) : r;
        if (e && typeof e.ts === "number" && typeof e.usd === "number" && e.ts > cutoff) {
          total += e.usd;
        }
      } catch { /* skip bad entry */ }
    }
    return total;
  } catch {
    return 0;
  }
}

/**
 * Record an unverified-user purchase against the rolling 30d window. Call
 * from every successful purchase path (Stripe webhook, AUXR buy, Wise wire)
 * AFTER the credit has landed. Safe to no-op for KYC-verified users — they
 * don't have a limit to track.
 */
export async function recordNoKycSpend(walletAddress: string, usd: number): Promise<void> {
  if (!Number.isFinite(usd) || usd <= 0) return;
  try {
    const key = `kyc:nokyc:30d:${walletAddress.toLowerCase()}`;
    await redis.lpush(key, JSON.stringify({ ts: Date.now(), usd }));
    // Hard cap the list size so a long-running unverified user can't grow
    // the key unbounded. 200 entries / 30d = ~7/day, way past realistic.
    await redis.ltrim(key, 0, 199);
    // TTL slightly past the rolling window so stale keys disappear when the
    // user stops buying. Reset on every write — naturally rolls forward.
    await redis.expire(key, Math.ceil(ROLLING_WINDOW_MS / 1000) + 86400);
  } catch (e) {
    console.warn("[kyc-limits] recordNoKycSpend failed (non-blocking):", e);
  }
}

export interface KycLimitDecision {
  allowed: boolean;
  kycVerified: boolean;
  limitUSD: number;                     // per-tx ceiling (NO_KYC_LIMIT_USD)
  cumulativeLimit30dUSD: number;        // 30d ceiling (NO_KYC_CUMULATIVE_30D_USD)
  recentSpendUSD: number;               // user's last-30d unverified spend
  remainingUSD: number;                 // how much they can still spend in 30d
  requestedUSD: number;
  reason?: "amount_exceeds_no_kyc_limit" | "amount_exceeds_30d_cumulative_limit";
}

/**
 * Two-tier gate for unverified users:
 *   1. Per-transaction ceiling: requested > NO_KYC_LIMIT_USD → reject
 *   2. 30-day cumulative ceiling: requested + recentSpend > 30d limit → reject
 *
 * Verified users always pass. The shape of the returned decision is the same
 * either way so the UI can show "$X remaining" copy even on success.
 */
export async function checkKycLimit(
  walletAddress: string,
  requestedUSD: number,
): Promise<KycLimitDecision> {
  const kycVerified = await isKycVerified(walletAddress);
  const recentSpendUSD = kycVerified ? 0 : await getRecentNoKycSpendUSD(walletAddress);
  const remainingUSD = kycVerified
    ? Number.POSITIVE_INFINITY
    : Math.max(0, NO_KYC_CUMULATIVE_30D_USD - recentSpendUSD);

  const base = {
    kycVerified,
    limitUSD: NO_KYC_LIMIT_USD,
    cumulativeLimit30dUSD: NO_KYC_CUMULATIVE_30D_USD,
    recentSpendUSD,
    remainingUSD,
    requestedUSD,
  };

  if (kycVerified) return { allowed: true, ...base };
  if (requestedUSD > NO_KYC_LIMIT_USD) {
    return { allowed: false, ...base, reason: "amount_exceeds_no_kyc_limit" };
  }
  if (requestedUSD > remainingUSD) {
    return { allowed: false, ...base, reason: "amount_exceeds_30d_cumulative_limit" };
  }
  return { allowed: true, ...base };
}
