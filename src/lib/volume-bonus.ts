// Volume Bonus — credits a fixed amount of metal to the user when they
// finish a qualifying trade during an active "volume_bonus" campaign.
//
// Why a separate module (not folded into metal-bonus-service):
//   metal-bonus-service handles the standing welcome/deposit/referral
//   bonuses that fund the funnel year-round. Volume bonuses are short,
//   admin-defined activation campaigns (e.g. "$100 trade → 0.1g AUXG,
//   first 500 users"). They have their own pool caps, eligibility
//   windows, and announcement copy, so the lifecycle is genuinely
//   separate.
//
// Storage shape (Redis, lives next to existing auxite:campaigns):
//   campaign:volume:{id}:claimed_users     SET of user IDs (claimed once)
//   campaign:volume:{id}:usage_count       INT (atomic counter)
//   campaign:volume:{id}:total_paid_grams  FLOAT (running total)
//
// The Campaign record itself stays in auxite:campaigns as before — this
// module only owns the per-user/per-campaign claim ledger.

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const CAMPAIGNS_KEY = 'auxite:campaigns';

export const BONUS_METALS = ['AUXG', 'AUXS', 'AUXPT', 'AUXPD'] as const;
export type BonusMetal = (typeof BONUS_METALS)[number];

export type EligibilityFilter =
  | 'all'           // any user with a successful trade above min
  | 'kyc_verified'  // only KYC-completed accounts
  | 'no_kyc'        // only sub-KYC traders (new lower-limit tier)
  | 'dormant_60d';  // user with 60+ days of zero trades

export interface VolumeBonusCampaign {
  id: string;
  name: { tr: string; en: string };
  description: { tr: string; en: string };
  type: 'volume_bonus';
  // Volume bonus specific
  bonusAsset: BonusMetal;
  bonusAmountGrams: number;
  minTradeUsd: number;
  /** Max number of unique users that can claim. After this, claims silently no-op. */
  poolCap: number;
  eligibility: EligibilityFilter;
  // Standard campaign fields (mirrors generic Campaign)
  startDate: string; // ISO
  endDate: string;   // ISO
  active: boolean;
  usageCount: number;
  createdAt: string;
}

interface MaybeVolumeCampaign {
  id?: unknown;
  type?: unknown;
  active?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  bonusAsset?: unknown;
  bonusAmountGrams?: unknown;
  minTradeUsd?: unknown;
  poolCap?: unknown;
  eligibility?: unknown;
  usageCount?: unknown;
}

function isVolumeCampaign(c: unknown): c is VolumeBonusCampaign {
  if (!c || typeof c !== 'object') return false;
  const o = c as MaybeVolumeCampaign;
  return (
    o.type === 'volume_bonus' &&
    typeof o.id === 'string' &&
    typeof o.bonusAsset === 'string' &&
    typeof o.bonusAmountGrams === 'number' &&
    typeof o.minTradeUsd === 'number' &&
    typeof o.poolCap === 'number'
  );
}

/** Pull every active volume_bonus campaign currently in-window. */
export async function getActiveVolumeBonusCampaigns(): Promise<VolumeBonusCampaign[]> {
  const raw = (await redis.get<unknown[]>(CAMPAIGNS_KEY)) ?? [];
  const now = Date.now();
  return raw.filter(isVolumeCampaign).filter((c) => {
    if (!c.active) return false;
    const start = Date.parse(c.startDate);
    const end = Date.parse(c.endDate);
    if (Number.isNaN(start) || Number.isNaN(end)) return false;
    return start <= now && end >= now;
  });
}

/** True iff this user already claimed this campaign. */
export async function hasClaimed(campaignId: string, userId: string): Promise<boolean> {
  const member = await redis.sismember(`campaign:volume:${campaignId}:claimed_users`, userId);
  return member === 1;
}

/**
 * Record a successful claim. Uses SADD to make idempotent — re-calls return
 * false. Returns true on a fresh claim (so the caller can increment the
 * usage counter), false if the user was already in the set.
 */
async function recordClaim(campaignId: string, userId: string, bonusGrams: number): Promise<boolean> {
  const added = await redis.sadd(`campaign:volume:${campaignId}:claimed_users`, userId);
  if (added === 0) return false;
  // Atomic counters separate from the canonical Campaign object so we
  // don't need read-modify-write on the campaigns array under load.
  await redis.incr(`campaign:volume:${campaignId}:usage_count`);
  await redis.incrbyfloat(`campaign:volume:${campaignId}:total_paid_grams`, bonusGrams);
  return true;
}

export interface VolumeBonusGrant {
  campaignId: string;
  campaignNameTr: string;
  bonusAsset: BonusMetal;
  bonusAmountGrams: number;
  newBalance: number;
}

interface ApplyContext {
  userId: string;            // canonical user identifier (typically lowercased EVM address)
  walletAddress: string;     // address used in the balance Redis keys
  tradeUsdValue: number;     // notional USD value of the trade that just settled
  kycVerified: boolean;      // pulled from caller — we don't refetch here
  daysSinceLastTrade?: number; // optional, used for 'dormant_60d' eligibility
}

function passesEligibility(c: VolumeBonusCampaign, ctx: ApplyContext): boolean {
  switch (c.eligibility) {
    case 'all':
      return true;
    case 'kyc_verified':
      return ctx.kycVerified;
    case 'no_kyc':
      return !ctx.kycVerified;
    case 'dormant_60d':
      return (ctx.daysSinceLastTrade ?? 0) >= 60;
    default:
      return false;
  }
}

/**
 * Award any active volume-bonus campaign(s) the user qualifies for.
 * Idempotent per (campaign, user) pair. Pool caps are enforced atomically
 * via SADD + INCR. Returns the list of grants that fired so the caller
 * can flash a toast / push a notification.
 *
 * The actual balance credit goes through writeBonusBalance — we keep
 * the storage write here so trade-route hookups stay a single function
 * call.
 */
export async function applyVolumeBonusIfEligible(ctx: ApplyContext): Promise<VolumeBonusGrant[]> {
  const grants: VolumeBonusGrant[] = [];
  const campaigns = await getActiveVolumeBonusCampaigns();
  if (campaigns.length === 0) return grants;

  for (const c of campaigns) {
    if (ctx.tradeUsdValue < c.minTradeUsd) continue;
    if (!passesEligibility(c, ctx)) continue;

    // Pool cap check is cheap to read but races with concurrent claims
    // — recordClaim's SADD is the actual race winner. We do the read
    // here only to short-circuit obvious losers before touching write
    // keys, but still trust recordClaim's outcome below.
    const used = (await redis.get<number>(`campaign:volume:${c.id}:usage_count`)) ?? 0;
    if (used >= c.poolCap) continue;

    const fresh = await recordClaim(c.id, ctx.userId, c.bonusAmountGrams);
    if (!fresh) continue; // user already claimed this one

    // Credit the metal grams to the user's bonus balance. Same key shape
    // metal-bonus-service uses so the existing balance reader picks it
    // up without changes.
    const balanceKey = `bonus_balance:${ctx.walletAddress}:${c.bonusAsset}`;
    const newBalance = await redis.incrbyfloat(balanceKey, c.bonusAmountGrams);

    grants.push({
      campaignId: c.id,
      campaignNameTr: c.name.tr,
      bonusAsset: c.bonusAsset,
      bonusAmountGrams: c.bonusAmountGrams,
      newBalance: typeof newBalance === 'number' ? newBalance : parseFloat(String(newBalance)),
    });
  }

  return grants;
}

/** Admin-facing live stats for a campaign — used by the progress card. */
export interface VolumeBonusStats {
  usageCount: number;
  poolCap: number;
  poolRemaining: number;
  totalPaidGrams: number;
  bonusAsset: BonusMetal;
}

export async function getVolumeBonusStats(c: VolumeBonusCampaign): Promise<VolumeBonusStats> {
  const used = (await redis.get<number>(`campaign:volume:${c.id}:usage_count`)) ?? 0;
  const totalPaidGramsRaw = await redis.get(`campaign:volume:${c.id}:total_paid_grams`);
  const totalPaidGrams =
    typeof totalPaidGramsRaw === 'number'
      ? totalPaidGramsRaw
      : totalPaidGramsRaw
        ? parseFloat(String(totalPaidGramsRaw))
        : 0;
  return {
    usageCount: used,
    poolCap: c.poolCap,
    poolRemaining: Math.max(0, c.poolCap - used),
    totalPaidGrams,
    bonusAsset: c.bonusAsset,
  };
}
