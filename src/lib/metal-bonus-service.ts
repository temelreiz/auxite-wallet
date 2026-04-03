/**
 * Metal Bonus Service — Liquidity Credit System
 *
 * All bonuses are metal-denominated (AUXG-B, AUXS-B, etc.)
 * Replaces the old AUXM-based bonus system.
 *
 * Bonus Types:
 *   1. Deposit Bonus: 2% on deposits over $50
 *   2. Welcome Gold: 5 AUXG (unlocked after first demo trade, activated after KYC)
 *   3. Referral Bonus: 0.5% for both parties on first deposit
 *
 * Unlock: 30 days OR 5x trade volume (whichever comes first)
 * Cost Controls: $100/user, $50K global cap
 */

import { redis } from '@/lib/redis';

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export const BONUS_CONFIG = {
  // Feature flag
  enabled: process.env.BONUS_SYSTEM_V2_ENABLED !== 'false',

  // Deposit Bonus
  depositBonusPercent: parseFloat(process.env.DEPOSIT_BONUS_PERCENT || '2'),
  minDepositForBonus: parseFloat(process.env.MIN_DEPOSIT_FOR_BONUS || '50'),

  // Welcome Gold (Start With Gold campaign)
  welcomeBonusAuxg: parseFloat(process.env.WELCOME_BONUS_AUXG || '5'),
  welcomeBonusAuxs: parseFloat(process.env.WELCOME_BONUS_AUXS || '10'), // Legacy
  minDepositForWelcome: parseFloat(process.env.MIN_DEPOSIT_FOR_WELCOME || '100'),

  // Referral Bonus
  referralBonusPercent: parseFloat(process.env.REFERRAL_BONUS_PERCENT || '0.5'),

  // Unlock Conditions (Hybrid: time OR volume)
  unlockDays: parseInt(process.env.BONUS_UNLOCK_DAYS || '30'),
  volumeMultiplier: parseFloat(process.env.BONUS_VOLUME_MULTIPLIER || '5'),

  // Cost Controls
  maxBonusPerUserUsd: parseFloat(process.env.MAX_BONUS_PER_USER_USD || '100'),
  globalCapUsd: parseFloat(process.env.GLOBAL_CAP_USD || '50000'),

  // Campaign
  campaignDurationDays: parseInt(process.env.CAMPAIGN_DURATION_DAYS || '30'),

  // Abuse Prevention
  maxAccountsPerIp: parseInt(process.env.MAX_BONUS_ACCOUNTS_PER_IP || '3'),
  ipWindowHours: 24,

  // Supported bonus metals
  bonusMetals: ['AUXG', 'AUXS', 'AUXPT', 'AUXPD'] as const,
} as const;

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type BonusMetal = typeof BONUS_CONFIG.bonusMetals[number];
export type BonusType = 'deposit' | 'welcome' | 'referral';

export interface BonusGrant {
  userId: string;
  type: BonusType;
  asset: BonusMetal;
  amountGrams: number;
  valueUsd: number;
  grantedAt: string;
}

export interface BonusStatus {
  bonusBalances: Record<string, number>;
  totalBonusValueUsd: number;
  unlockPercent: number;
  unlockMethod: 'time' | 'volume' | 'none';
  daysRemaining: number;
  volumeProgress: number;
  volumeRequired: number;
  currentVolumeUsd: number;
  welcomeClaimed: boolean;
  totalCostUsd: number;
  maxCostUsd: number;
}

// ═══════════════════════════════════════════════════════════════
// DEPOSIT BONUS
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate deposit bonus in metal grams.
 * Returns bonus amount in the same metal as the deposit.
 */
export function calculateDepositBonus(
  depositAmountUsd: number,
  metalPricePerGram: number,
): { bonusGrams: number; bonusValueUsd: number } {
  if (!BONUS_CONFIG.enabled) return { bonusGrams: 0, bonusValueUsd: 0 };
  if (depositAmountUsd < BONUS_CONFIG.minDepositForBonus) return { bonusGrams: 0, bonusValueUsd: 0 };
  if (metalPricePerGram <= 0) return { bonusGrams: 0, bonusValueUsd: 0 };

  const bonusValueUsd = depositAmountUsd * (BONUS_CONFIG.depositBonusPercent / 100);
  const bonusGrams = bonusValueUsd / metalPricePerGram;

  return { bonusGrams, bonusValueUsd };
}

// ═══════════════════════════════════════════════════════════════
// WELCOME BONUS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if user is eligible for welcome bonus.
 * Requires: KYC verified + first deposit >= $100 + not already claimed.
 */
export async function checkWelcomeBonusEligibility(
  userId: string,
  walletAddress: string,
): Promise<{ eligible: boolean; reason?: string }> {
  if (!BONUS_CONFIG.enabled) return { eligible: false, reason: 'Bonus system disabled' };

  // Already claimed?
  const claimed = await redis.get(`user:${userId}:bonus:welcomeClaimed`);
  if (claimed === 'true') return { eligible: false, reason: 'Already claimed' };

  // KYC verified?
  const kycData = await redis.get(`kyc:${walletAddress.toLowerCase()}`);
  if (kycData) {
    const kyc = typeof kycData === 'string' ? JSON.parse(kycData) : kycData;
    if (kyc.status !== 'approved' && kyc.level !== 'verified' && kyc.level !== 'enhanced') {
      return { eligible: false, reason: 'KYC not verified' };
    }
  } else {
    return { eligible: false, reason: 'KYC not started' };
  }

  return { eligible: true };
}

/**
 * Get welcome bonus amount (in AUXS grams). Legacy.
 */
export function getWelcomeBonusAmount(silverPricePerGram: number): { bonusGrams: number; bonusValueUsd: number } {
  const bonusGrams = BONUS_CONFIG.welcomeBonusAuxs;
  const bonusValueUsd = bonusGrams * silverPricePerGram;
  return { bonusGrams, bonusValueUsd };
}

/**
 * Get Welcome Gold amount (in AUXG grams). Start With Gold campaign.
 */
export function getWelcomeGoldAmount(goldPricePerGram: number): { bonusGrams: number; bonusValueUsd: number } {
  const bonusGrams = BONUS_CONFIG.welcomeBonusAuxg;
  const bonusValueUsd = bonusGrams * goldPricePerGram;
  return { bonusGrams, bonusValueUsd };
}

// ═══════════════════════════════════════════════════════════════
// REFERRAL BONUS
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate referral bonus (0.5% of deposit for both parties).
 */
export function calculateReferralBonus(
  depositAmountUsd: number,
  metalPricePerGram: number,
): { bonusGrams: number; bonusValueUsd: number } {
  if (!BONUS_CONFIG.enabled) return { bonusGrams: 0, bonusValueUsd: 0 };
  if (metalPricePerGram <= 0) return { bonusGrams: 0, bonusValueUsd: 0 };

  const bonusValueUsd = depositAmountUsd * (BONUS_CONFIG.referralBonusPercent / 100);
  const bonusGrams = bonusValueUsd / metalPricePerGram;

  return { bonusGrams, bonusValueUsd };
}

// ═══════════════════════════════════════════════════════════════
// COST CONTROLS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if bonus can be granted within cost caps.
 * Returns adjusted amount if partial grant is possible.
 */
export async function checkCostCaps(
  userId: string,
  bonusValueUsd: number,
): Promise<{ allowed: boolean; adjustedValueUsd: number; reason?: string }> {
  // Per-user cap
  const userCostStr = await redis.get(`user:${userId}:bonus:totalCostUsd`);
  const userCost = parseFloat(userCostStr as string || '0');
  const userRemaining = BONUS_CONFIG.maxBonusPerUserUsd - userCost;

  if (userRemaining <= 0) {
    return { allowed: false, adjustedValueUsd: 0, reason: 'Per-user bonus cap reached' };
  }

  // Global cap
  const globalCostStr = await redis.get('campaign:bonus:globalCostUsd');
  const globalCost = parseFloat(globalCostStr as string || '0');
  const globalRemaining = BONUS_CONFIG.globalCapUsd - globalCost;

  if (globalRemaining <= 0) {
    return { allowed: false, adjustedValueUsd: 0, reason: 'Global bonus cap reached' };
  }

  // Adjust to fit within caps
  const maxAllowed = Math.min(bonusValueUsd, userRemaining, globalRemaining);

  return { allowed: true, adjustedValueUsd: maxAllowed };
}

/**
 * Record bonus cost for cap tracking.
 */
export async function recordBonusCost(userId: string, bonusValueUsd: number): Promise<void> {
  const userKey = `user:${userId}:bonus:totalCostUsd`;
  const globalKey = 'campaign:bonus:globalCostUsd';

  const userCost = parseFloat((await redis.get(userKey) as string) || '0');
  await redis.set(userKey, (userCost + bonusValueUsd).toString());

  const globalCost = parseFloat((await redis.get(globalKey) as string) || '0');
  await redis.set(globalKey, (globalCost + bonusValueUsd).toString());
}

// ═══════════════════════════════════════════════════════════════
// UNLOCK CALCULATION (HYBRID: TIME OR VOLUME)
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate progressive unlock percentage.
 * max(timeProgress, volumeProgress) — whichever is higher wins.
 */
export async function calculateUnlockPercent(userId: string): Promise<{
  unlockPercent: number;
  timeProgress: number;
  volumeProgress: number;
  daysElapsed: number;
  currentVolumeUsd: number;
  totalBonusValueUsd: number;
}> {
  // Time-based progress
  const grantedAtStr = await redis.get(`user:${userId}:bonus:grantedAt`);
  let timeProgress = 0;
  let daysElapsed = 0;

  if (grantedAtStr) {
    const grantedAt = new Date(grantedAtStr as string);
    daysElapsed = (Date.now() - grantedAt.getTime()) / (1000 * 60 * 60 * 24);
    timeProgress = Math.min(1, daysElapsed / BONUS_CONFIG.unlockDays);
  }

  // Volume-based progress
  const volumeStr = await redis.get(`user:${userId}:bonus:volumeUsd`);
  const currentVolumeUsd = parseFloat(volumeStr as string || '0');

  const costStr = await redis.get(`user:${userId}:bonus:totalCostUsd`);
  const totalBonusValueUsd = parseFloat(costStr as string || '0');

  let volumeProgress = 0;
  if (totalBonusValueUsd > 0) {
    const volumeRequired = totalBonusValueUsd * BONUS_CONFIG.volumeMultiplier;
    volumeProgress = Math.min(1, currentVolumeUsd / volumeRequired);
  }

  // Hybrid: take the higher of the two
  const unlockPercent = Math.max(timeProgress, volumeProgress) * 100;

  return {
    unlockPercent: Math.min(100, unlockPercent),
    timeProgress: timeProgress * 100,
    volumeProgress: volumeProgress * 100,
    daysElapsed,
    currentVolumeUsd,
    totalBonusValueUsd,
  };
}

/**
 * Record trade volume for unlock tracking.
 */
export async function recordVolume(userId: string, amountUsd: number): Promise<number> {
  const key = `user:${userId}:bonus:volumeUsd`;
  const current = parseFloat((await redis.get(key) as string) || '0');
  const newTotal = current + amountUsd;
  await redis.set(key, newTotal.toString());
  return newTotal;
}

// ═══════════════════════════════════════════════════════════════
// BONUS GRANT
// ═══════════════════════════════════════════════════════════════

/**
 * Grant bonus to user. Handles all cap checks, records cost, sets grantedAt.
 */
export async function grantBonus(
  userId: string,
  type: BonusType,
  asset: BonusMetal,
  amountGrams: number,
  valueUsd: number,
): Promise<{ granted: boolean; grantedGrams: number; reason?: string }> {
  if (!BONUS_CONFIG.enabled) return { granted: false, grantedGrams: 0, reason: 'Disabled' };
  if (amountGrams <= 0 || valueUsd <= 0) return { granted: false, grantedGrams: 0, reason: 'Zero amount' };

  // Check cost caps
  const caps = await checkCostCaps(userId, valueUsd);
  if (!caps.allowed) return { granted: false, grantedGrams: 0, reason: caps.reason };

  // Adjust if partially allowed
  const ratio = caps.adjustedValueUsd / valueUsd;
  const adjustedGrams = amountGrams * ratio;
  const adjustedValueUsd = caps.adjustedValueUsd;

  // Credit bonus balance
  const bonusKey = `user:${userId}:balance:bonus${asset}`;
  const currentBonus = parseFloat((await redis.get(bonusKey) as string) || '0');
  await redis.set(bonusKey, (currentBonus + adjustedGrams).toString());

  // Also credit main balance (bonus is part of total display balance)
  const mainKey = `user:${userId}:balance:${asset.toLowerCase()}`;
  const currentMain = parseFloat((await redis.get(mainKey) as string) || '0');
  await redis.set(mainKey, (currentMain + adjustedGrams).toString());

  // Record cost
  await recordBonusCost(userId, adjustedValueUsd);

  // Set grantedAt if first bonus
  const existingGrantedAt = await redis.get(`user:${userId}:bonus:grantedAt`);
  if (!existingGrantedAt) {
    await redis.set(`user:${userId}:bonus:grantedAt`, new Date().toISOString());
  }

  // Record bonus transaction
  const bonusTx: BonusGrant = {
    userId,
    type,
    asset,
    amountGrams: adjustedGrams,
    valueUsd: adjustedValueUsd,
    grantedAt: new Date().toISOString(),
  };

  // Append to user's bonus history
  await redis.lpush(`user:${userId}:bonus:history`, JSON.stringify(bonusTx));

  // Track welcome claim
  if (type === 'welcome') {
    await redis.set(`user:${userId}:bonus:welcomeClaimed`, 'true');
  }

  console.log(`🎁 Bonus granted: ${type} ${adjustedGrams.toFixed(3)}g ${asset} ($${adjustedValueUsd.toFixed(2)}) to ${userId}`);

  return { granted: true, grantedGrams: adjustedGrams };
}

// ═══════════════════════════════════════════════════════════════
// ABUSE PREVENTION
// ═══════════════════════════════════════════════════════════════

/**
 * Check IP velocity — flag if too many accounts from same IP.
 */
export async function checkIpVelocity(
  userId: string,
  ip: string,
): Promise<{ allowed: boolean; reason?: string }> {
  const key = `bonus:ip:${ip}:users`;

  // Track users per IP using a simple list approach
  const existing = (await redis.get(key) as string) || '';
  const users = existing ? existing.split(',').filter(Boolean) : [];

  if (!users.includes(userId)) {
    users.push(userId);
    await redis.set(key, users.join(','));
    await redis.expire(key, BONUS_CONFIG.ipWindowHours * 3600);
  }

  if (users.length > BONUS_CONFIG.maxAccountsPerIp) {
    return { allowed: false, reason: `Too many accounts from same IP (${users.length})` };
  }

  return { allowed: true };
}

// ═══════════════════════════════════════════════════════════════
// STATUS & INFO
// ═══════════════════════════════════════════════════════════════

/**
 * Get full bonus status for a user.
 */
export async function getBonusStatus(userId: string): Promise<BonusStatus> {
  const bonusBalances: Record<string, number> = {};
  let totalBonusValueUsd = 0;

  // Get bonus balances for all metals
  for (const metal of BONUS_CONFIG.bonusMetals) {
    const balStr = await redis.get(`user:${userId}:balance:bonus${metal}`);
    const bal = parseFloat(balStr as string || '0');
    if (bal > 0) bonusBalances[metal] = bal;
  }

  // Get unlock progress
  const unlock = await calculateUnlockPercent(userId);

  // Get welcome claim status
  const welcomeClaimed = (await redis.get(`user:${userId}:bonus:welcomeClaimed`)) === 'true';

  // Get cost
  const costStr = await redis.get(`user:${userId}:bonus:totalCostUsd`);
  const totalCostUsd = parseFloat(costStr as string || '0');
  totalBonusValueUsd = totalCostUsd;

  const volumeRequired = totalCostUsd * BONUS_CONFIG.volumeMultiplier;

  return {
    bonusBalances,
    totalBonusValueUsd,
    unlockPercent: unlock.unlockPercent,
    unlockMethod: unlock.timeProgress >= unlock.volumeProgress ? 'time' : 'volume',
    daysRemaining: Math.max(0, BONUS_CONFIG.unlockDays - unlock.daysElapsed),
    volumeProgress: unlock.volumeProgress,
    volumeRequired,
    currentVolumeUsd: unlock.currentVolumeUsd,
    welcomeClaimed,
    totalCostUsd,
    maxCostUsd: BONUS_CONFIG.maxBonusPerUserUsd,
  };
}

/**
 * Get campaign-wide info for admin panel.
 */
export async function getCampaignInfo(): Promise<{
  enabled: boolean;
  globalCostUsd: number;
  globalCapUsd: number;
  globalRemaining: number;
  depositBonusPercent: number;
  welcomeBonusAuxs: number;
  referralBonusPercent: number;
}> {
  const globalCostStr = await redis.get('campaign:bonus:globalCostUsd');
  const globalCostUsd = parseFloat(globalCostStr as string || '0');

  return {
    enabled: BONUS_CONFIG.enabled,
    globalCostUsd,
    globalCapUsd: BONUS_CONFIG.globalCapUsd,
    globalRemaining: BONUS_CONFIG.globalCapUsd - globalCostUsd,
    depositBonusPercent: BONUS_CONFIG.depositBonusPercent,
    welcomeBonusAuxg: BONUS_CONFIG.welcomeBonusAuxg,
    welcomeBonusAuxs: BONUS_CONFIG.welcomeBonusAuxs,
    referralBonusPercent: BONUS_CONFIG.referralBonusPercent,
  };
}
