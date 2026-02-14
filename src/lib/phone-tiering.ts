/**
 * Phone Tiering System
 * Institutional-grade contact verification model
 *
 * Tier 0: No phone → No custody (registration OK, deposit blocked)
 * Tier 1: Verified phone → Custody active (SMS/OTP verified)
 * Tier 2: Voice verified → High-net-worth enabled (future)
 *
 * Phone is required at custody activation threshold:
 * - First funding, vault allocation, or yield participation
 *
 * High-risk actions blocked without verified phone:
 * - Withdraw, redemption, yield participation, large conversion (>$10k)
 */

import { redis } from '@/lib/redis';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type PhoneTier = 0 | 1 | 2;

export type CommunicationPreference = 'phone' | 'email' | 'both';

export interface PhoneTieringData {
  tier: PhoneTier;
  phone: string;                          // Raw phone number
  phoneVerified: boolean;                 // OTP/SMS verified
  phoneVerifiedAt: string | null;         // ISO timestamp
  voiceVerified: boolean;                 // Tier 2: voice call verified
  voiceVerifiedAt: string | null;
  communicationPreference: CommunicationPreference;
  updatedAt: string;
}

export interface PhoneGateResult {
  allowed: boolean;
  reason?: string;
  requiredTier: PhoneTier;
  currentTier: PhoneTier;
  action: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HIGH-RISK ACTIONS THAT REQUIRE PHONE
// ═══════════════════════════════════════════════════════════════════════════

const HIGH_RISK_ACTIONS = [
  'withdraw',
  'redemption',
  'yield_participate',
  'large_conversion',    // >$10,000
  'delivery_request',
] as const;

const CUSTODY_ACTIVATION_ACTIONS = [
  'first_funding',
  'vault_allocation',
  'yield_participate',
] as const;

type HighRiskAction = typeof HIGH_RISK_ACTIONS[number];
type CustodyAction = typeof CUSTODY_ACTIVATION_ACTIONS[number];

// Minimum tier required for each action
const ACTION_TIER_REQUIREMENTS: Record<string, PhoneTier> = {
  // Custody activation requires Tier 1
  first_funding: 1,
  vault_allocation: 1,
  yield_participate: 1,
  // High-risk actions require Tier 1
  withdraw: 1,
  redemption: 1,
  large_conversion: 1,
  delivery_request: 1,
};

// ═══════════════════════════════════════════════════════════════════════════
// CORE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get phone tiering data for a user
 */
export async function getPhoneTiering(walletAddress: string): Promise<PhoneTieringData> {
  const key = `user:${walletAddress.toLowerCase()}:phone_tiering`;
  const data = await redis.hgetall(key) as Record<string, string> | null;

  if (!data || Object.keys(data).length === 0) {
    return {
      tier: 0,
      phone: '',
      phoneVerified: false,
      phoneVerifiedAt: null,
      voiceVerified: false,
      voiceVerifiedAt: null,
      communicationPreference: 'email',
      updatedAt: '',
    };
  }

  const phoneVerified = data.phoneVerified === 'true';
  const voiceVerified = data.voiceVerified === 'true';

  return {
    tier: voiceVerified ? 2 : phoneVerified ? 1 : 0,
    phone: data.phone || '',
    phoneVerified,
    phoneVerifiedAt: data.phoneVerifiedAt || null,
    voiceVerified,
    voiceVerifiedAt: data.voiceVerifiedAt || null,
    communicationPreference: (data.communicationPreference as CommunicationPreference) || 'email',
    updatedAt: data.updatedAt || '',
  };
}

/**
 * Calculate phone tier from data
 */
export function calculateTier(data: { phoneVerified: boolean; voiceVerified: boolean }): PhoneTier {
  if (data.voiceVerified) return 2;
  if (data.phoneVerified) return 1;
  return 0;
}

/**
 * Set phone number (unverified - Tier 0 stays)
 */
export async function setPhoneNumber(walletAddress: string, phone: string): Promise<PhoneTieringData> {
  const key = `user:${walletAddress.toLowerCase()}:phone_tiering`;
  const now = new Date().toISOString();

  await redis.hset(key, {
    phone,
    updatedAt: now,
  });

  // Also update user profile
  const normalizedAddress = walletAddress.toLowerCase();
  const userId = await redis.get(`user:address:${normalizedAddress}`);
  if (userId) {
    await redis.hset(`user:${userId}`, { phone });
  }

  return getPhoneTiering(walletAddress);
}

/**
 * Verify phone number (OTP verified → Tier 1)
 */
export async function verifyPhone(walletAddress: string): Promise<PhoneTieringData> {
  const key = `user:${walletAddress.toLowerCase()}:phone_tiering`;
  const now = new Date().toISOString();

  await redis.hset(key, {
    phoneVerified: 'true',
    phoneVerifiedAt: now,
    updatedAt: now,
  });

  return getPhoneTiering(walletAddress);
}

/**
 * Voice verify phone (→ Tier 2)
 */
export async function voiceVerifyPhone(walletAddress: string): Promise<PhoneTieringData> {
  const key = `user:${walletAddress.toLowerCase()}:phone_tiering`;
  const now = new Date().toISOString();

  await redis.hset(key, {
    voiceVerified: 'true',
    voiceVerifiedAt: now,
    updatedAt: now,
  });

  return getPhoneTiering(walletAddress);
}

/**
 * Update communication preference
 */
export async function setCommunicationPreference(
  walletAddress: string,
  preference: CommunicationPreference
): Promise<PhoneTieringData> {
  const key = `user:${walletAddress.toLowerCase()}:phone_tiering`;
  const now = new Date().toISOString();

  await redis.hset(key, {
    communicationPreference: preference,
    updatedAt: now,
  });

  return getPhoneTiering(walletAddress);
}

// ═══════════════════════════════════════════════════════════════════════════
// GATE / GUARD FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if an action is allowed based on phone tier
 * Used as a gate before high-risk operations
 */
export async function checkPhoneGate(
  walletAddress: string,
  action: string
): Promise<PhoneGateResult> {
  const tiering = await getPhoneTiering(walletAddress);
  const requiredTier = ACTION_TIER_REQUIREMENTS[action] ?? 0;

  if (tiering.tier >= requiredTier) {
    return {
      allowed: true,
      currentTier: tiering.tier,
      requiredTier,
      action,
    };
  }

  return {
    allowed: false,
    reason: `This action requires a verified contact number (Tier ${requiredTier}). Your current tier is ${tiering.tier}.`,
    currentTier: tiering.tier,
    requiredTier,
    action,
  };
}

/**
 * Quick check: is phone verified? (Tier >= 1)
 */
export async function isPhoneVerified(walletAddress: string): Promise<boolean> {
  const tiering = await getPhoneTiering(walletAddress);
  return tiering.tier >= 1;
}

/**
 * Quick check: is custody allowed? (Tier >= 1 + KYC verified)
 */
export async function isCustodyAllowed(walletAddress: string): Promise<{
  allowed: boolean;
  reason?: string;
  phoneVerified: boolean;
  kycVerified: boolean;
}> {
  const tiering = await getPhoneTiering(walletAddress);
  const normalizedAddress = walletAddress.toLowerCase();

  // Check KYC status
  let kycVerified = false;
  try {
    const userId = await redis.get(`user:address:${normalizedAddress}`);
    if (userId) {
      const userData = await redis.hgetall(`user:${userId}`) as Record<string, string> | null;
      kycVerified = userData?.kycVerified === 'true';
    }
  } catch (_) {}

  const phoneVerified = tiering.tier >= 1;

  if (phoneVerified && kycVerified) {
    return { allowed: true, phoneVerified, kycVerified };
  }

  const reasons: string[] = [];
  if (!kycVerified) reasons.push('KYC verification required');
  if (!phoneVerified) reasons.push('Verified contact number required');

  return {
    allowed: false,
    reason: reasons.join('. '),
    phoneVerified,
    kycVerified,
  };
}
