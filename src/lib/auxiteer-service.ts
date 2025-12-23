/**
 * Auxiteer Service
 * Trade API'de tier bazlı fee hesaplamak için helper fonksiyonlar
 */

import { Redis } from '@upstash/redis';

// ============================================
// TYPES
// ============================================

export interface AuxiteerTierConfig {
  id: string;
  name: string;
  spread: number;  // Percentage (e.g., 1.00 for 1%)
  fee: number;     // Percentage (e.g., 0.35 for 0.35%)
  requirements: {
    kyc: boolean;
    minBalanceUsd: number;
    minDays: number;
    metalAsset: boolean;
    activeEarnLease: boolean;
    invitation: boolean;
  };
}

export interface UserTierInfo {
  tier: AuxiteerTierConfig;
  stats: {
    balanceUsd: number;
    daysSinceRegistration: number;
    isKycVerified: boolean;
    hasMetalAsset: boolean;
    hasActiveLease: boolean;
  };
}

// ============================================
// TIER CONFIGURATION
// ============================================

// Default tiers (fallback if Redis is empty)
export const DEFAULT_AUXITEER_TIERS: AuxiteerTierConfig[] = [
  {
    id: 'regular',
    name: 'Regular',
    spread: 1.00,
    fee: 0.35,
    requirements: {
      kyc: false,
      minBalanceUsd: 0,
      minDays: 0,
      metalAsset: false,
      activeEarnLease: false,
      invitation: false,
    },
  },
  {
    id: 'core',
    name: 'Core',
    spread: 0.80,
    fee: 0.25,
    requirements: {
      kyc: true,
      minBalanceUsd: 10000,
      minDays: 7,
      metalAsset: false,
      activeEarnLease: false,
      invitation: false,
    },
  },
  {
    id: 'reserve',
    name: 'Reserve',
    spread: 0.65,
    fee: 0.18,
    requirements: {
      kyc: true,
      minBalanceUsd: 100000,
      minDays: 30,
      metalAsset: true,
      activeEarnLease: false,
      invitation: false,
    },
  },
  {
    id: 'vault',
    name: 'Vault',
    spread: 0.50,
    fee: 0.12,
    requirements: {
      kyc: true,
      minBalanceUsd: 500000,
      minDays: 90,
      metalAsset: true,
      activeEarnLease: true,
      invitation: false,
    },
  },
  {
    id: 'sovereign',
    name: 'Sovereign',
    spread: 0,  // Custom
    fee: 0,     // Custom
    requirements: {
      kyc: true,
      minBalanceUsd: 1000000,
      minDays: 180,
      metalAsset: true,
      activeEarnLease: true,
      invitation: true,
    },
  },
];

// Redis key for tier config
const TIER_CONFIG_KEY = 'auxiteer:tier:config';

// Cache for tier config (5 minute TTL)
let tierConfigCache: { tiers: AuxiteerTierConfig[]; timestamp: number } | null = null;
const CACHE_TTL = 30 * 1000; // 30 seconds // 5 minutes

/**
 * Get tier configuration from Redis (with caching)
 */
async function getTierConfig(): Promise<AuxiteerTierConfig[]> {
  // Check cache
  if (tierConfigCache && Date.now() - tierConfigCache.timestamp < CACHE_TTL) {
    return tierConfigCache.tiers;
  }
  
  try {
    const config = await redis.get(TIER_CONFIG_KEY);
    
    if (config) {
      const tiers = typeof config === 'string' ? JSON.parse(config) : config;
      tierConfigCache = { tiers, timestamp: Date.now() };
      return tiers;
    }
  } catch (e) {
    console.error('Failed to get tier config from Redis:', e);
  }
  
  // Return default if Redis fails or is empty
  return DEFAULT_AUXITEER_TIERS;
}

// Export for backwards compatibility
export const AUXITEER_TIERS = DEFAULT_AUXITEER_TIERS;

// ============================================
// REDIS KEYS
// ============================================

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const KEYS = {
  userMeta: (address: string) => `user:${address.toLowerCase()}:meta`,
  userBalance: (address: string) => `user:${address.toLowerCase()}:balance`,
  kycData: (address: string) => `kyc:${address.toLowerCase()}`,
  leasePositions: (address: string) => `user:${address.toLowerCase()}:leases`,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

interface UserMeta {
  walletAddress: string;
  registeredAt: string;
  invitedToSovereign: boolean;
}

async function getUserMeta(address: string): Promise<UserMeta | null> {
  const data = await redis.get(KEYS.userMeta(address));
  if (!data) return null;
  return typeof data === 'string' ? JSON.parse(data) as UserMeta : data as UserMeta;
}

async function getKycStatus(address: string): Promise<boolean> {
  const kycData = await redis.get(KEYS.kycData(address));
  if (!kycData) return false;
  
  const kyc = typeof kycData === 'string' ? JSON.parse(kycData) : kycData;
  return kyc.status === 'approved' && ['verified', 'enhanced'].includes(kyc.level);
}

async function hasActiveLeasePosition(address: string): Promise<boolean> {
  const leases = await redis.get(KEYS.leasePositions(address));
  if (!leases) return false;
  
  const positions = typeof leases === 'string' ? JSON.parse(leases) : leases;
  if (!Array.isArray(positions)) return false;
  
  return positions.some((p: any) => p.status === 'active' && p.endDate > new Date().toISOString());
}

function calculateDaysSinceRegistration(registeredAt: string): number {
  const regDate = new Date(registeredAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - regDate.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

async function calculateBalanceUsd(address: string): Promise<{ balanceUsd: number; hasMetalAsset: boolean }> {
  const balance = await redis.hgetall(KEYS.userBalance(address));
  if (!balance) return { balanceUsd: 0, hasMetalAsset: false };
  
  // Metal prices (should come from price API in production)
  const metalPrices = {
    auxg: 85,    // USD per gram gold
    auxs: 1,     // USD per gram silver
    auxpt: 32,   // USD per gram platinum
    auxpd: 34,   // USD per gram palladium
  };
  
  let totalUsd = 0;
  let hasMetalAsset = false;
  
  // Metal balances
  const auxg = parseFloat(balance.auxg as string || '0');
  const auxs = parseFloat(balance.auxs as string || '0');
  const auxpt = parseFloat(balance.auxpt as string || '0');
  const auxpd = parseFloat(balance.auxpd as string || '0');
  
  if (auxg > 0 || auxs > 0 || auxpt > 0 || auxpd > 0) {
    hasMetalAsset = true;
  }
  
  totalUsd += auxg * metalPrices.auxg;
  totalUsd += auxs * metalPrices.auxs;
  totalUsd += auxpt * metalPrices.auxpt;
  totalUsd += auxpd * metalPrices.auxpd;
  
  // Stablecoins & fiat
  totalUsd += parseFloat(balance.auxm as string || '0');
  totalUsd += parseFloat(balance.usdt as string || '0');
  totalUsd += parseFloat(balance.usd as string || '0');
  
  return { balanceUsd: totalUsd, hasMetalAsset };
}

// ============================================
// MAIN FUNCTION: Get User Tier
// ============================================

/**
 * Kullanıcının Auxiteer tier bilgisini döndürür
 * Trade API'de fee hesaplamak için kullanılır
 * Redis'ten güncel tier config'i okur
 */
export async function getUserTier(address: string): Promise<UserTierInfo> {
  const normalizedAddress = address.toLowerCase();
  
  // Get user data and tier config in parallel
  const [userMeta, isKycVerified, hasActiveLease, balanceData, tierConfig] = await Promise.all([
    getUserMeta(normalizedAddress),
    getKycStatus(normalizedAddress),
    hasActiveLeasePosition(normalizedAddress),
    calculateBalanceUsd(normalizedAddress),
    getTierConfig(), // Get from Redis
  ]);
  
  const daysSinceReg = userMeta ? calculateDaysSinceRegistration(userMeta.registeredAt) : 0;
  const invitedToSovereign = userMeta?.invitedToSovereign || false;
  const { balanceUsd, hasMetalAsset } = balanceData;
  
  // Determine tier (check from highest to lowest)
  const tiers = [...tierConfig].reverse();
  let userTier = tierConfig[0]; // Default: Regular (first tier)
  
  for (const tier of tiers) {
    const req = tier.requirements;
    
    // Sovereign requires invitation
    if (req.invitation && !invitedToSovereign) continue;
    
    // Check requirements
    if (req.kyc && !isKycVerified) continue;
    if (balanceUsd < req.minBalanceUsd) continue;
    if (daysSinceReg < req.minDays) continue;
    if (req.metalAsset && !hasMetalAsset) continue;
    if (req.activeEarnLease && !hasActiveLease) continue;
    
    // All requirements met
    userTier = tier;
    break;
  }
  
  return {
    tier: userTier,
    stats: {
      balanceUsd,
      daysSinceRegistration: daysSinceReg,
      isKycVerified,
      hasMetalAsset,
      hasActiveLease,
    },
  };
}

/**
 * Tier bazlı fee hesapla
 * @param amount İşlem tutarı
 * @param tierFee Tier fee yüzdesi (örn: 0.35)
 * @returns Fee tutarı
 */
export function calculateTierFee(amount: number, tierFee: number): number {
  return amount * (tierFee / 100);
}

/**
 * Hızlı tier fee alma (sadece fee değeri)
 */
export async function getUserTierFee(address: string): Promise<number> {
  const { tier } = await getUserTier(address);
  return tier.fee;
}

/**
 * Default tier döndür (bağlantısız kullanıcılar için)
 */
export function getDefaultTier(): AuxiteerTierConfig {
  return AUXITEER_TIERS[0]; // Regular
}

export default { getUserTier, calculateTierFee, getUserTierFee, getDefaultTier, AUXITEER_TIERS };
