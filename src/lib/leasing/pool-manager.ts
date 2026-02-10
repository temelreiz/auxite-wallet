// ============================================
// POOL MANAGER — Auxite Metal Leasing Engine
// Pool aggregation: multiple users pool metal for bulk counterparty lease
// Lifecycle: forming → active → leased → maturing → completed
// One active forming pool per metal+tenor
// ============================================

import { Redis } from '@upstash/redis';
import {
  encumberMetal,
  releaseEncumbrance,
  checkAvailability,
  type LeaseEncumbranceEntry,
} from './encumbrance-ledger';
import {
  getActiveQuotes,
  type LeaseQuote,
} from './counterparty-manager';
import {
  updateExposure,
  preLeaseRiskCheck,
  accrueToBufferPool,
} from './risk-buffer';
import { getYieldConfig } from './yield-builder';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ============================================
// REDIS KEY NAMESPACE
// ============================================
const KEYS = {
  pool: (id: string) => `leasing:pool:${id}`,
  poolMembers: (id: string) => `leasing:pool:${id}:members`,
  activePool: (metal: string, tenor: string) => `leasing:pool:active:${metal}:${tenor}`,
  allPools: 'leasing:pool:all',
  userPools: (address: string) => `leasing:pool:user:${address}`,
  poolHistory: 'leasing:pool:history',
  config: 'leasing:pool:config',
};

// ============================================
// TYPES
// ============================================
export type PoolStatus = 'forming' | 'active' | 'leased' | 'maturing' | 'completed' | 'cancelled';

export interface LeasingPool {
  id: string;
  metal: string;
  tenor: string;
  tenorDays: number;
  status: PoolStatus;
  // Size
  targetSizeOz: number;           // Target pool size
  currentSizeOz: number;          // Current committed metal
  minSizeOz: number;              // Min to activate
  memberCount: number;
  // Rates
  counterpartyRate: number;       // Rate from counterparty (before spread)
  displayRateLow: number;         // User-facing rate range
  displayRateHigh: number;
  auxiteSpreadBps: number;        // Platform spread
  riskBufferBps: number;          // Risk buffer
  // Execution
  counterpartyId: string | null;
  counterpartyName: string | null;
  quoteId: string | null;
  // Timeline
  formingDeadline: number;        // Auto-cancel if not filled
  leaseStartDate: number | null;
  maturityDate: number | null;
  // Metadata
  createdAt: number;
  updatedAt: number;
  executedAt: number | null;
  completedAt: number | null;
  executedBy: string | null;
}

export interface PoolMember {
  address: string;
  metal: string;
  amountOz: number;
  sharePercent: number;           // % of pool
  expectedYieldOz: number;
  expectedYieldPercent: number;
  leaseId: string;                // Reference to encumbrance entry
  joinedAt: number;
  status: 'active' | 'withdrawn' | 'completed';
}

export interface PoolConfig {
  // Size limits
  defaultTargetSizeOz: Record<string, number>;  // per metal
  defaultMinSizeOz: Record<string, number>;      // per metal
  maxMembersPerPool: number;
  // Timing
  formingWindowHours: number;      // How long pool stays in forming state
  // Execution
  autoExecuteEnabled: boolean;     // Auto-execute when pool hits target
  minQuotesForExecution: number;   // Need at least N active quotes
}

// ============================================
// DEFAULT CONFIG
// ============================================
const DEFAULT_CONFIG: PoolConfig = {
  defaultTargetSizeOz: {
    AUXG: 100,     // 100 oz gold (~$250K)
    AUXS: 5000,    // 5000 oz silver (~$125K)
    AUXPT: 50,     // 50 oz platinum (~$50K)
    AUXPD: 100,    // 100 oz palladium (~$100K)
  },
  defaultMinSizeOz: {
    AUXG: 10,
    AUXS: 500,
    AUXPT: 5,
    AUXPD: 10,
  },
  maxMembersPerPool: 100,
  formingWindowHours: 72,          // 3 days to fill
  autoExecuteEnabled: false,       // Admin-triggered for now
  minQuotesForExecution: 1,
};

const TENOR_DAYS: Record<string, number> = {
  '3M': 90,
  '6M': 180,
  '12M': 365,
};

// ============================================
// CONFIG
// ============================================
export async function getPoolConfig(): Promise<PoolConfig> {
  try {
    const raw = await redis.get(KEYS.config);
    if (raw && typeof raw === 'object') {
      return { ...DEFAULT_CONFIG, ...(raw as Partial<PoolConfig>) };
    }
  } catch (e) {
    console.warn('Failed to fetch pool config, using defaults', e);
  }
  return DEFAULT_CONFIG;
}

export async function setPoolConfig(config: Partial<PoolConfig>): Promise<PoolConfig> {
  const current = await getPoolConfig();
  const merged = { ...current, ...config };
  await redis.set(KEYS.config, merged);
  return merged;
}

// ============================================
// POOL LIFECYCLE
// ============================================

// Get or create the forming pool for a metal+tenor
export async function getOrCreateFormingPool(metal: string, tenor: string): Promise<LeasingPool> {
  // Check for existing forming pool
  const existing = await getActiveFormingPool(metal, tenor);
  if (existing) return existing;

  // Create new pool
  const config = await getPoolConfig();
  const yieldConfig = await getYieldConfig();
  const now = Date.now();
  const id = `POOL-${metal}-${tenor}-${now.toString(36)}`;

  const pool: LeasingPool = {
    id,
    metal,
    tenor,
    tenorDays: TENOR_DAYS[tenor] || 180,
    status: 'forming',
    targetSizeOz: config.defaultTargetSizeOz[metal] || 100,
    currentSizeOz: 0,
    minSizeOz: config.defaultMinSizeOz[metal] || 10,
    memberCount: 0,
    counterpartyRate: 0,
    displayRateLow: 0,
    displayRateHigh: 0,
    auxiteSpreadBps: yieldConfig.auxiteSpreadBps,
    riskBufferBps: yieldConfig.riskBufferBps,
    counterpartyId: null,
    counterpartyName: null,
    quoteId: null,
    formingDeadline: now + (config.formingWindowHours * 60 * 60 * 1000),
    leaseStartDate: null,
    maturityDate: null,
    createdAt: now,
    updatedAt: now,
    executedAt: null,
    completedAt: null,
    executedBy: null,
  };

  await Promise.all([
    redis.set(KEYS.pool(id), pool),
    redis.set(KEYS.activePool(metal, tenor), id),
    redis.sadd(KEYS.allPools, id),
  ]);

  return pool;
}

async function getActiveFormingPool(metal: string, tenor: string): Promise<LeasingPool | null> {
  try {
    const poolId = await redis.get(KEYS.activePool(metal, tenor));
    if (!poolId || typeof poolId !== 'string') return null;

    const pool = await getPool(poolId);
    if (pool && pool.status === 'forming') {
      // Check if past deadline
      if (Date.now() > pool.formingDeadline) {
        // Auto-cancel expired pool
        await updatePoolStatus(pool.id, 'cancelled');
        await redis.del(KEYS.activePool(metal, tenor));
        return null;
      }
      return pool;
    }
    return null;
  } catch (e) {
    console.warn(`Failed to fetch forming pool for ${metal}/${tenor}`, e);
    return null;
  }
}

// ============================================
// JOIN POOL
// ============================================
export async function joinPool(
  metal: string,
  tenor: string,
  address: string,
  amountOz: number
): Promise<{ success: boolean; pool?: LeasingPool; member?: PoolMember; error?: string }> {
  // 1. Check user has available metal
  const availability = await checkAvailability(address, metal, amountOz);
  if (!availability.available) {
    return {
      success: false,
      error: `Insufficient available ${metal}. Requested: ${amountOz} oz, Available: ${availability.currentAvailableOz} oz`,
    };
  }

  // 2. Get or create forming pool
  const pool = await getOrCreateFormingPool(metal, tenor);
  if (pool.status !== 'forming') {
    return { success: false, error: `Pool ${pool.id} is not accepting new members (status: ${pool.status})` };
  }

  // 3. Check pool capacity
  const config = await getPoolConfig();
  if (pool.memberCount >= config.maxMembersPerPool) {
    return { success: false, error: `Pool ${pool.id} is full (${pool.memberCount} members)` };
  }

  // 4. Check if amount would exceed target
  const remainingCapacity = pool.targetSizeOz - pool.currentSizeOz;
  const actualAmount = Math.min(amountOz, remainingCapacity);
  if (actualAmount <= 0) {
    return { success: false, error: `Pool ${pool.id} is at target capacity` };
  }

  // 5. Create lease ID and encumber metal
  const leaseId = `LEASE-${pool.id}-${address.slice(-8)}-${Date.now().toString(36)}`;
  const now = Date.now();

  const encumbranceResult = await encumberMetal(address, metal, actualAmount, {
    leaseId,
    poolId: pool.id,
    address,
    metal,
    encumberedOz: actualAmount,
    originalOz: actualAmount,
    tenor,
    tenorDays: TENOR_DAYS[tenor] || 180,
    startDate: now,
    maturityDate: now + ((TENOR_DAYS[tenor] || 180) * 24 * 60 * 60 * 1000),
    expectedYieldOz: 0,    // Will be calculated at execution
    expectedYieldPercent: 0,
    counterpartyId: '',     // Will be set at execution
  });

  if (!encumbranceResult.success) {
    return { success: false, error: encumbranceResult.error };
  }

  // 6. Create pool member
  const member: PoolMember = {
    address,
    metal,
    amountOz: actualAmount,
    sharePercent: 0,    // Recalculated after all joins
    expectedYieldOz: 0, // Calculated at execution
    expectedYieldPercent: 0,
    leaseId,
    joinedAt: now,
    status: 'active',
  };

  // 7. Update pool
  pool.currentSizeOz += actualAmount;
  pool.memberCount += 1;
  pool.updatedAt = now;

  // Recalculate shares
  await redis.lpush(KEYS.poolMembers(pool.id), JSON.stringify(member));
  await redis.set(KEYS.pool(pool.id), pool);
  await redis.sadd(KEYS.userPools(address), pool.id);

  // Recalculate all member shares
  await recalculateShares(pool.id);

  return { success: true, pool, member };
}

// ============================================
// WITHDRAW FROM POOL
// ============================================
export async function withdrawFromPool(
  poolId: string,
  address: string
): Promise<{ success: boolean; error?: string }> {
  const pool = await getPool(poolId);
  if (!pool) return { success: false, error: 'Pool not found' };

  if (pool.status !== 'forming') {
    return { success: false, error: `Cannot withdraw from pool in ${pool.status} state. Only forming pools allow withdrawals.` };
  }

  // Find member
  const members = await getPoolMembers(poolId);
  const member = members.find((m) => m.address === address && m.status === 'active');
  if (!member) return { success: false, error: 'No active membership found' };

  // Release encumbrance
  await releaseEncumbrance(member.leaseId, 'release');

  // Update member status
  member.status = 'withdrawn';

  // Update pool
  pool.currentSizeOz -= member.amountOz;
  pool.memberCount = Math.max(0, pool.memberCount - 1);
  pool.updatedAt = Date.now();

  // Rebuild member list without withdrawn member (or mark as withdrawn)
  await redis.set(KEYS.pool(poolId), pool);
  await redis.srem(KEYS.userPools(address), poolId);

  // Recalculate shares
  await recalculateShares(poolId);

  return { success: true };
}

// ============================================
// EXECUTE POOL (admin action — lease to counterparty)
// ============================================
export async function executePool(
  poolId: string,
  quoteId: string,
  executedBy: string
): Promise<{ success: boolean; error?: string }> {
  const pool = await getPool(poolId);
  if (!pool) return { success: false, error: 'Pool not found' };

  if (pool.status !== 'forming') {
    return { success: false, error: `Pool must be in forming state to execute (current: ${pool.status})` };
  }

  if (pool.currentSizeOz < pool.minSizeOz) {
    return { success: false, error: `Pool size ${pool.currentSizeOz} oz below minimum ${pool.minSizeOz} oz` };
  }

  // Get the quote
  const quotes = await getActiveQuotes(pool.metal, pool.tenor);
  const quote = quotes.find((q) => q.id === quoteId);
  if (!quote) return { success: false, error: `Quote ${quoteId} not found or expired` };

  // Pre-lease risk check
  // Estimate USD value (simplified — would use spot price in production)
  const estimatedUSD = pool.currentSizeOz * getEstimatedSpotPrice(pool.metal);
  const riskCheck = await preLeaseRiskCheck(quote.counterpartyId, pool.metal, estimatedUSD);
  if (!riskCheck.approved) {
    const failures = riskCheck.checks.filter((c) => !c.passed).map((c) => c.detail).join('; ');
    return { success: false, error: `Risk check failed: ${failures}` };
  }

  const now = Date.now();
  const maturityDate = now + (pool.tenorDays * 24 * 60 * 60 * 1000);

  // Calculate rates
  const yieldConfig = await getYieldConfig();
  const counterpartyRate = quote.ratePercent;
  const auxiteSpread = yieldConfig.auxiteSpreadBps / 100;
  const riskBuffer = yieldConfig.riskBufferBps / 100;
  const userRate = counterpartyRate - auxiteSpread - riskBuffer;

  // Update pool
  pool.status = 'leased';
  pool.counterpartyId = quote.counterpartyId;
  pool.counterpartyName = quote.counterpartyName;
  pool.quoteId = quoteId;
  pool.counterpartyRate = counterpartyRate;
  pool.displayRateLow = Math.max(0.1, userRate - 0.175);
  pool.displayRateHigh = Math.max(0.1, userRate + 0.175);
  pool.auxiteSpreadBps = yieldConfig.auxiteSpreadBps;
  pool.riskBufferBps = yieldConfig.riskBufferBps;
  pool.leaseStartDate = now;
  pool.maturityDate = maturityDate;
  pool.executedAt = now;
  pool.executedBy = executedBy;
  pool.updatedAt = now;

  // Update counterparty exposure
  await updateExposure(quote.counterpartyId, estimatedUSD, pool.metal, pool.currentSizeOz);

  // Accrue risk buffer to buffer pool
  const bufferUSD = estimatedUSD * (riskBuffer / 100) * (pool.tenorDays / 365);
  await accrueToBufferPool(poolId, pool.metal, yieldConfig.riskBufferBps, bufferUSD);

  // Clear forming pool slot
  await redis.del(KEYS.activePool(pool.metal, pool.tenor));

  // Update member expected yields
  const members = await getPoolMembers(poolId);
  for (const member of members) {
    if (member.status === 'active') {
      member.expectedYieldPercent = userRate;
      member.expectedYieldOz = member.amountOz * (userRate / 100) * (pool.tenorDays / 365);
    }
  }

  await redis.set(KEYS.pool(poolId), pool);

  return { success: true };
}

// ============================================
// MATURE POOL (admin action — distribute yield)
// ============================================
export async function maturePool(poolId: string): Promise<{ success: boolean; error?: string }> {
  const pool = await getPool(poolId);
  if (!pool) return { success: false, error: 'Pool not found' };

  if (pool.status !== 'leased') {
    return { success: false, error: `Pool must be in leased state to mature (current: ${pool.status})` };
  }

  const now = Date.now();
  const members = await getPoolMembers(poolId);

  // Calculate and distribute yield
  const userRate = pool.counterpartyRate - (pool.auxiteSpreadBps / 100) - (pool.riskBufferBps / 100);

  for (const member of members) {
    if (member.status === 'active') {
      const yieldOz = member.amountOz * (userRate / 100) * (pool.tenorDays / 365);

      // Release encumbrance with yield credit
      await releaseEncumbrance(member.leaseId, 'mature', yieldOz);

      member.expectedYieldOz = yieldOz;
      member.status = 'completed';
    }
  }

  // Release counterparty exposure
  if (pool.counterpartyId) {
    const estimatedUSD = pool.currentSizeOz * getEstimatedSpotPrice(pool.metal);
    await updateExposure(pool.counterpartyId, -estimatedUSD, pool.metal, -pool.currentSizeOz);
  }

  // Update pool
  pool.status = 'completed';
  pool.completedAt = now;
  pool.updatedAt = now;

  await redis.set(KEYS.pool(poolId), pool);

  // Log to history
  await redis.lpush(KEYS.poolHistory, JSON.stringify({
    poolId: pool.id,
    metal: pool.metal,
    tenor: pool.tenor,
    sizeOz: pool.currentSizeOz,
    memberCount: pool.memberCount,
    counterpartyRate: pool.counterpartyRate,
    completedAt: now,
  }));
  await redis.ltrim(KEYS.poolHistory, 0, 499);

  return { success: true };
}

// ============================================
// HELPER FUNCTIONS
// ============================================
export async function getPool(poolId: string): Promise<LeasingPool | null> {
  try {
    const raw = await redis.get(KEYS.pool(poolId));
    if (raw && typeof raw === 'object') return raw as LeasingPool;
  } catch (e) {
    console.warn(`Failed to fetch pool ${poolId}`, e);
  }
  return null;
}

export async function getPoolMembers(poolId: string): Promise<PoolMember[]> {
  try {
    const raw = await redis.lrange(KEYS.poolMembers(poolId), 0, -1);
    if (!raw || raw.length === 0) return [];

    return raw.map((item) => {
      if (typeof item === 'string') return JSON.parse(item) as PoolMember;
      return item as PoolMember;
    });
  } catch (e) {
    console.warn(`Failed to fetch pool members for ${poolId}`, e);
    return [];
  }
}

async function recalculateShares(poolId: string): Promise<void> {
  const pool = await getPool(poolId);
  if (!pool || pool.currentSizeOz <= 0) return;

  const members = await getPoolMembers(poolId);
  const activeMembers = members.filter((m) => m.status === 'active');

  // Recalculate shares
  for (const member of activeMembers) {
    member.sharePercent = parseFloat(((member.amountOz / pool.currentSizeOz) * 100).toFixed(4));
  }

  // Rebuild member list in Redis
  await redis.del(KEYS.poolMembers(poolId));
  for (const member of members) {
    await redis.rpush(KEYS.poolMembers(poolId), JSON.stringify(member));
  }
}

async function updatePoolStatus(poolId: string, status: PoolStatus): Promise<void> {
  const pool = await getPool(poolId);
  if (!pool) return;

  pool.status = status;
  pool.updatedAt = Date.now();
  await redis.set(KEYS.pool(poolId), pool);
}

// Simplified spot price estimates (would use pricing engine in production)
function getEstimatedSpotPrice(metal: string): number {
  const prices: Record<string, number> = {
    AUXG: 2500,    // Gold $/oz
    AUXS: 30,      // Silver $/oz
    AUXPT: 1000,   // Platinum $/oz
    AUXPD: 1100,   // Palladium $/oz
  };
  return prices[metal.toUpperCase()] || 2500;
}

// ============================================
// QUERY FUNCTIONS
// ============================================
export async function getAllPools(): Promise<LeasingPool[]> {
  try {
    const ids = await redis.smembers(KEYS.allPools);
    if (!ids || ids.length === 0) return [];

    const pools: LeasingPool[] = [];
    for (const id of ids) {
      const pool = await getPool(id as string);
      if (pool) pools.push(pool);
    }

    return pools.sort((a, b) => b.createdAt - a.createdAt);
  } catch (e) {
    console.warn('Failed to fetch all pools', e);
    return [];
  }
}

export async function getActivePools(): Promise<LeasingPool[]> {
  const all = await getAllPools();
  return all.filter((p) => ['forming', 'active', 'leased', 'maturing'].includes(p.status));
}

export async function getUserPools(address: string): Promise<LeasingPool[]> {
  try {
    const ids = await redis.smembers(KEYS.userPools(address));
    if (!ids || ids.length === 0) return [];

    const pools: LeasingPool[] = [];
    for (const id of ids) {
      const pool = await getPool(id as string);
      if (pool) pools.push(pool);
    }

    return pools.sort((a, b) => b.createdAt - a.createdAt);
  } catch (e) {
    console.warn(`Failed to fetch pools for ${address}`, e);
    return [];
  }
}

export async function getPoolsByStatus(status: PoolStatus): Promise<LeasingPool[]> {
  const all = await getAllPools();
  return all.filter((p) => p.status === status);
}

export async function getPoolSummary(): Promise<{
  forming: number;
  leased: number;
  completed: number;
  totalMetalOz: Record<string, number>;
  totalValueUSD: number;
}> {
  const all = await getAllPools();

  const summary = {
    forming: 0,
    leased: 0,
    completed: 0,
    totalMetalOz: {} as Record<string, number>,
    totalValueUSD: 0,
  };

  for (const pool of all) {
    if (pool.status === 'forming') summary.forming++;
    else if (pool.status === 'leased') summary.leased++;
    else if (pool.status === 'completed') summary.completed++;

    if (['forming', 'leased'].includes(pool.status)) {
      summary.totalMetalOz[pool.metal] = (summary.totalMetalOz[pool.metal] || 0) + pool.currentSizeOz;
      summary.totalValueUSD += pool.currentSizeOz * getEstimatedSpotPrice(pool.metal);
    }
  }

  return summary;
}

export async function getPoolHistory(limit: number = 50): Promise<any[]> {
  try {
    const raw = await redis.lrange(KEYS.poolHistory, 0, limit - 1);
    if (!raw || raw.length === 0) return [];

    return raw.map((item) => {
      if (typeof item === 'string') return JSON.parse(item);
      return item;
    });
  } catch (e) {
    console.warn('Failed to fetch pool history', e);
    return [];
  }
}
