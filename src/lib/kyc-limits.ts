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

export interface KycLimitDecision {
  allowed: boolean;
  kycVerified: boolean;
  limitUSD: number;
  requestedUSD: number;
  reason?: "amount_exceeds_no_kyc_limit";
}

/**
 * Decide whether a USD-denominated purchase may proceed without KYC.
 *
 * - Verified users: always allowed (caller still owns balance/spread checks).
 * - Unverified users: allowed when requestedUSD <= NO_KYC_LIMIT_USD.
 *
 * Caller should surface `decision.reason` to the client so the UI can deep
 * link into the KYC flow with the exact threshold in the message.
 */
export async function checkKycLimit(
  walletAddress: string,
  requestedUSD: number,
): Promise<KycLimitDecision> {
  const kycVerified = await isKycVerified(walletAddress);
  if (kycVerified || requestedUSD <= NO_KYC_LIMIT_USD) {
    return { allowed: true, kycVerified, limitUSD: NO_KYC_LIMIT_USD, requestedUSD };
  }
  return {
    allowed: false,
    kycVerified: false,
    limitUSD: NO_KYC_LIMIT_USD,
    requestedUSD,
    reason: "amount_exceeds_no_kyc_limit",
  };
}
