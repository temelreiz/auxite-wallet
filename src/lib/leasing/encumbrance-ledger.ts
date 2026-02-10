// ============================================
// ENCUMBRANCE LEDGER — Auxite Metal Leasing Engine
// Tracks allocated / encumbered / available metal per user
// Core formula: available = total_allocated - encumbered - pending_redemptions
// Prevents rehypothecation: encumbered metal cannot be re-leased, sold, or transferred
// ============================================

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ============================================
// REDIS KEY NAMESPACE
// ============================================
const KEYS = {
  // User-level encumbrance
  userEncumbrance: (address: string) => `leasing:encumbrance:user:${address}`,
  userLeases: (address: string) => `leasing:encumbrance:user:${address}:leases`,
  // Lease-level entries
  leaseEntry: (leaseId: string) => `leasing:encumbrance:lease:${leaseId}`,
  // Platform-level aggregates
  platformMetal: (metal: string) => `leasing:encumbrance:platform:${metal}`,
  platformSummary: 'leasing:encumbrance:platform:summary',
  // Ledger log (audit trail)
  ledgerLog: (address: string) => `leasing:encumbrance:log:${address}`,
  platformLog: 'leasing:encumbrance:log:platform',
};

// ============================================
// TYPES
// ============================================
export type EncumbranceAction = 'encumber' | 'release' | 'partial_release' | 'mature' | 'default';
export type LeaseStatus = 'active' | 'maturing' | 'matured' | 'released' | 'defaulted';

export interface UserEncumbrance {
  address: string;
  metals: Record<string, MetalEncumbrance>;
  updatedAt: number;
}

export interface MetalEncumbrance {
  metal: string;
  totalAllocatedOz: number;       // Total metal user has allocated
  encumberedOz: number;           // Currently locked in leases
  pendingRedemptionOz: number;    // Pending maturity/withdrawal
  availableOz: number;            // = totalAllocated - encumbered - pendingRedemption
  activeLeaseCount: number;
}

export interface LeaseEncumbranceEntry {
  leaseId: string;
  poolId: string;
  address: string;
  metal: string;
  encumberedOz: number;
  originalOz: number;
  tenor: string;
  tenorDays: number;
  startDate: number;
  maturityDate: number;
  expectedYieldOz: number;        // Expected yield in metal terms
  expectedYieldPercent: number;
  counterpartyId: string;
  status: LeaseStatus;
  createdAt: number;
  updatedAt: number;
}

export interface PlatformMetalState {
  metal: string;
  totalAllocatedOz: number;       // All users' allocated metal
  totalEncumberedOz: number;      // All metal locked in leases
  totalPendingOz: number;         // All pending redemptions
  totalAvailableOz: number;       // Available for new leases
  activeLeaseCount: number;
  utilizationPercent: number;     // encumbered / allocated * 100
  updatedAt: number;
}

export interface LedgerLogEntry {
  action: EncumbranceAction;
  leaseId: string;
  address: string;
  metal: string;
  amountOz: number;
  balanceBefore: number;
  balanceAfter: number;
  timestamp: number;
  note: string;
}

// ============================================
// USER ENCUMBRANCE
// ============================================
export async function getUserEncumbrance(address: string): Promise<UserEncumbrance> {
  try {
    const raw = await redis.get(KEYS.userEncumbrance(address));
    if (raw && typeof raw === 'object') return raw as UserEncumbrance;
  } catch (e) {
    console.warn(`Failed to fetch encumbrance for ${address}`, e);
  }

  // Return empty state
  return {
    address,
    metals: {},
    updatedAt: Date.now(),
  };
}

function ensureMetalState(encumbrance: UserEncumbrance, metal: string): MetalEncumbrance {
  if (!encumbrance.metals[metal]) {
    encumbrance.metals[metal] = {
      metal,
      totalAllocatedOz: 0,
      encumberedOz: 0,
      pendingRedemptionOz: 0,
      availableOz: 0,
      activeLeaseCount: 0,
    };
  }
  return encumbrance.metals[metal];
}

function recalcAvailable(metalState: MetalEncumbrance): void {
  metalState.availableOz = Math.max(
    0,
    metalState.totalAllocatedOz - metalState.encumberedOz - metalState.pendingRedemptionOz
  );
}

// ============================================
// SET TOTAL ALLOCATED (called when user allocates metal)
// ============================================
export async function setTotalAllocated(
  address: string,
  metal: string,
  totalOz: number
): Promise<UserEncumbrance> {
  const encumbrance = await getUserEncumbrance(address);
  const metalState = ensureMetalState(encumbrance, metal);

  metalState.totalAllocatedOz = totalOz;
  recalcAvailable(metalState);
  encumbrance.updatedAt = Date.now();

  await redis.set(KEYS.userEncumbrance(address), encumbrance);
  await updatePlatformState(metal);
  return encumbrance;
}

// ============================================
// ENCUMBER METAL (lock for lease)
// ============================================
export async function encumberMetal(
  address: string,
  metal: string,
  amountOz: number,
  leaseEntry: Omit<LeaseEncumbranceEntry, 'createdAt' | 'updatedAt' | 'status'>
): Promise<{ success: boolean; error?: string; entry?: LeaseEncumbranceEntry }> {
  const encumbrance = await getUserEncumbrance(address);
  const metalState = ensureMetalState(encumbrance, metal);

  // Check availability (no rehypothecation)
  if (amountOz > metalState.availableOz) {
    return {
      success: false,
      error: `Insufficient available metal. Requested: ${amountOz} oz, Available: ${metalState.availableOz} oz`,
    };
  }

  const now = Date.now();
  const balanceBefore = metalState.availableOz;

  // Update metal state
  metalState.encumberedOz += amountOz;
  metalState.activeLeaseCount += 1;
  recalcAvailable(metalState);
  encumbrance.updatedAt = now;

  // Create lease entry
  const entry: LeaseEncumbranceEntry = {
    ...leaseEntry,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  // Log entry
  const log: LedgerLogEntry = {
    action: 'encumber',
    leaseId: entry.leaseId,
    address,
    metal,
    amountOz,
    balanceBefore,
    balanceAfter: metalState.availableOz,
    timestamp: now,
    note: `Encumbered ${amountOz} oz ${metal} for lease ${entry.leaseId} (Pool: ${entry.poolId})`,
  };

  // Persist all
  await Promise.all([
    redis.set(KEYS.userEncumbrance(address), encumbrance),
    redis.set(KEYS.leaseEntry(entry.leaseId), entry),
    redis.sadd(KEYS.userLeases(address), entry.leaseId),
    redis.lpush(KEYS.ledgerLog(address), JSON.stringify(log)),
    redis.ltrim(KEYS.ledgerLog(address), 0, 499), // Keep 500 log entries
    redis.lpush(KEYS.platformLog, JSON.stringify(log)),
    redis.ltrim(KEYS.platformLog, 0, 999),
  ]);

  await updatePlatformState(metal);

  return { success: true, entry };
}

// ============================================
// RELEASE ENCUMBRANCE (lease matured or withdrawn)
// ============================================
export async function releaseEncumbrance(
  leaseId: string,
  reason: 'mature' | 'release' | 'default' = 'mature',
  yieldOz: number = 0
): Promise<{ success: boolean; error?: string }> {
  // Get lease entry
  let rawEntry;
  try {
    rawEntry = await redis.get(KEYS.leaseEntry(leaseId));
  } catch (e) {
    return { success: false, error: `Failed to fetch lease entry: ${e}` };
  }

  if (!rawEntry || typeof rawEntry !== 'object') {
    return { success: false, error: `Lease entry ${leaseId} not found` };
  }

  const entry = rawEntry as LeaseEncumbranceEntry;

  if (entry.status !== 'active' && entry.status !== 'maturing') {
    return { success: false, error: `Lease ${leaseId} is not active (status: ${entry.status})` };
  }

  const encumbrance = await getUserEncumbrance(entry.address);
  const metalState = ensureMetalState(encumbrance, entry.metal);
  const now = Date.now();
  const balanceBefore = metalState.availableOz;

  // Release encumbered metal
  metalState.encumberedOz = Math.max(0, metalState.encumberedOz - entry.encumberedOz);
  metalState.activeLeaseCount = Math.max(0, metalState.activeLeaseCount - 1);

  // If matured with yield, add yield to total allocated
  if (reason === 'mature' && yieldOz > 0) {
    metalState.totalAllocatedOz += yieldOz;
  }

  recalcAvailable(metalState);
  encumbrance.updatedAt = now;

  // Update lease entry status
  const newStatus: LeaseStatus = reason === 'default' ? 'defaulted' : reason === 'mature' ? 'matured' : 'released';
  const updatedEntry: LeaseEncumbranceEntry = {
    ...entry,
    status: newStatus,
    updatedAt: now,
  };

  // Log
  const log: LedgerLogEntry = {
    action: reason,
    leaseId,
    address: entry.address,
    metal: entry.metal,
    amountOz: entry.encumberedOz,
    balanceBefore,
    balanceAfter: metalState.availableOz,
    timestamp: now,
    note: `Released ${entry.encumberedOz} oz ${entry.metal} from lease ${leaseId} (reason: ${reason}${yieldOz > 0 ? `, yield: ${yieldOz} oz` : ''})`,
  };

  await Promise.all([
    redis.set(KEYS.userEncumbrance(entry.address), encumbrance),
    redis.set(KEYS.leaseEntry(leaseId), updatedEntry),
    redis.lpush(KEYS.ledgerLog(entry.address), JSON.stringify(log)),
    redis.ltrim(KEYS.ledgerLog(entry.address), 0, 499),
    redis.lpush(KEYS.platformLog, JSON.stringify(log)),
    redis.ltrim(KEYS.platformLog, 0, 999),
  ]);

  await updatePlatformState(entry.metal);

  return { success: true };
}

// ============================================
// MOVE TO PENDING REDEMPTION (pre-maturity state)
// ============================================
export async function moveToPendingRedemption(leaseId: string): Promise<{ success: boolean; error?: string }> {
  let rawEntry;
  try {
    rawEntry = await redis.get(KEYS.leaseEntry(leaseId));
  } catch (e) {
    return { success: false, error: `Failed to fetch lease entry: ${e}` };
  }

  if (!rawEntry || typeof rawEntry !== 'object') {
    return { success: false, error: `Lease entry ${leaseId} not found` };
  }

  const entry = rawEntry as LeaseEncumbranceEntry;

  if (entry.status !== 'active') {
    return { success: false, error: `Lease ${leaseId} is not active` };
  }

  const encumbrance = await getUserEncumbrance(entry.address);
  const metalState = ensureMetalState(encumbrance, entry.metal);
  const now = Date.now();

  // Move from encumbered to pending
  metalState.encumberedOz = Math.max(0, metalState.encumberedOz - entry.encumberedOz);
  metalState.pendingRedemptionOz += entry.encumberedOz;
  recalcAvailable(metalState);
  encumbrance.updatedAt = now;

  // Update lease status
  const updatedEntry: LeaseEncumbranceEntry = {
    ...entry,
    status: 'maturing',
    updatedAt: now,
  };

  await Promise.all([
    redis.set(KEYS.userEncumbrance(entry.address), encumbrance),
    redis.set(KEYS.leaseEntry(leaseId), updatedEntry),
  ]);

  await updatePlatformState(entry.metal);

  return { success: true };
}

// ============================================
// COMPLETE PENDING REDEMPTION (after maturity settlement)
// ============================================
export async function completePendingRedemption(
  leaseId: string,
  yieldOz: number = 0
): Promise<{ success: boolean; error?: string }> {
  let rawEntry;
  try {
    rawEntry = await redis.get(KEYS.leaseEntry(leaseId));
  } catch (e) {
    return { success: false, error: `Failed to fetch lease entry: ${e}` };
  }

  if (!rawEntry || typeof rawEntry !== 'object') {
    return { success: false, error: `Lease entry ${leaseId} not found` };
  }

  const entry = rawEntry as LeaseEncumbranceEntry;

  if (entry.status !== 'maturing') {
    return { success: false, error: `Lease ${leaseId} is not in maturing state` };
  }

  const encumbrance = await getUserEncumbrance(entry.address);
  const metalState = ensureMetalState(encumbrance, entry.metal);
  const now = Date.now();
  const balanceBefore = metalState.availableOz;

  // Remove from pending, add yield to allocated
  metalState.pendingRedemptionOz = Math.max(0, metalState.pendingRedemptionOz - entry.encumberedOz);
  metalState.activeLeaseCount = Math.max(0, metalState.activeLeaseCount - 1);

  if (yieldOz > 0) {
    metalState.totalAllocatedOz += yieldOz;
  }

  recalcAvailable(metalState);
  encumbrance.updatedAt = now;

  // Update lease status
  const updatedEntry: LeaseEncumbranceEntry = {
    ...entry,
    status: 'matured',
    updatedAt: now,
  };

  const log: LedgerLogEntry = {
    action: 'mature',
    leaseId,
    address: entry.address,
    metal: entry.metal,
    amountOz: entry.encumberedOz,
    balanceBefore,
    balanceAfter: metalState.availableOz,
    timestamp: now,
    note: `Matured lease ${leaseId}: ${entry.encumberedOz} oz ${entry.metal} released${yieldOz > 0 ? `, yield: ${yieldOz} oz credited` : ''}`,
  };

  await Promise.all([
    redis.set(KEYS.userEncumbrance(entry.address), encumbrance),
    redis.set(KEYS.leaseEntry(leaseId), updatedEntry),
    redis.lpush(KEYS.ledgerLog(entry.address), JSON.stringify(log)),
    redis.ltrim(KEYS.ledgerLog(entry.address), 0, 499),
    redis.lpush(KEYS.platformLog, JSON.stringify(log)),
    redis.ltrim(KEYS.platformLog, 0, 999),
  ]);

  await updatePlatformState(entry.metal);

  return { success: true };
}

// ============================================
// AVAILABILITY CHECK (pre-lease validation)
// ============================================
export async function checkAvailability(
  address: string,
  metal: string,
  requiredOz: number
): Promise<{ available: boolean; currentAvailableOz: number; shortfallOz: number }> {
  const encumbrance = await getUserEncumbrance(address);
  const metalState = ensureMetalState(encumbrance, metal);

  const shortfall = Math.max(0, requiredOz - metalState.availableOz);

  return {
    available: requiredOz <= metalState.availableOz,
    currentAvailableOz: metalState.availableOz,
    shortfallOz: shortfall,
  };
}

// ============================================
// GET USER'S ACTIVE LEASES
// ============================================
export async function getUserLeases(address: string): Promise<LeaseEncumbranceEntry[]> {
  try {
    const leaseIds = await redis.smembers(KEYS.userLeases(address));
    if (!leaseIds || leaseIds.length === 0) return [];

    const entries: LeaseEncumbranceEntry[] = [];
    for (const id of leaseIds) {
      const raw = await redis.get(KEYS.leaseEntry(id as string));
      if (raw && typeof raw === 'object') {
        entries.push(raw as LeaseEncumbranceEntry);
      }
    }

    return entries.sort((a, b) => b.createdAt - a.createdAt);
  } catch (e) {
    console.warn(`Failed to fetch leases for ${address}`, e);
    return [];
  }
}

export async function getUserActiveLeases(address: string): Promise<LeaseEncumbranceEntry[]> {
  const all = await getUserLeases(address);
  return all.filter((e) => e.status === 'active' || e.status === 'maturing');
}

// ============================================
// GET LEASE ENTRY
// ============================================
export async function getLeaseEntry(leaseId: string): Promise<LeaseEncumbranceEntry | null> {
  try {
    const raw = await redis.get(KEYS.leaseEntry(leaseId));
    if (raw && typeof raw === 'object') return raw as LeaseEncumbranceEntry;
  } catch (e) {
    console.warn(`Failed to fetch lease entry ${leaseId}`, e);
  }
  return null;
}

// ============================================
// PLATFORM-LEVEL STATE
// ============================================
async function updatePlatformState(metal: string): Promise<void> {
  try {
    // This is a simplified aggregation — in production, use a proper scan or maintain counters
    // For now, we update the platform metal state based on individual operations
    const currentRaw = await redis.get(KEYS.platformMetal(metal));
    const current: PlatformMetalState = (currentRaw && typeof currentRaw === 'object')
      ? currentRaw as PlatformMetalState
      : {
          metal,
          totalAllocatedOz: 0,
          totalEncumberedOz: 0,
          totalPendingOz: 0,
          totalAvailableOz: 0,
          activeLeaseCount: 0,
          utilizationPercent: 0,
          updatedAt: Date.now(),
        };

    current.updatedAt = Date.now();
    if (current.totalAllocatedOz > 0) {
      current.utilizationPercent = parseFloat(
        ((current.totalEncumberedOz / current.totalAllocatedOz) * 100).toFixed(2)
      );
    }

    await redis.set(KEYS.platformMetal(metal), current);
  } catch (e) {
    console.warn(`Failed to update platform state for ${metal}`, e);
  }
}

export async function recalculatePlatformState(metal: string): Promise<PlatformMetalState> {
  // Full recalculation — scan all users' encumbrance for this metal
  // In production with many users, this would use Redis pipelines or pre-aggregated counters
  const state: PlatformMetalState = {
    metal,
    totalAllocatedOz: 0,
    totalEncumberedOz: 0,
    totalPendingOz: 0,
    totalAvailableOz: 0,
    activeLeaseCount: 0,
    utilizationPercent: 0,
    updatedAt: Date.now(),
  };

  // Note: In production, maintain running counters instead of full scans
  // This function exists for admin reconciliation
  await redis.set(KEYS.platformMetal(metal), state);
  return state;
}

export async function getPlatformMetalState(metal: string): Promise<PlatformMetalState> {
  try {
    const raw = await redis.get(KEYS.platformMetal(metal));
    if (raw && typeof raw === 'object') return raw as PlatformMetalState;
  } catch (e) {
    console.warn(`Failed to fetch platform state for ${metal}`, e);
  }

  return {
    metal,
    totalAllocatedOz: 0,
    totalEncumberedOz: 0,
    totalPendingOz: 0,
    totalAvailableOz: 0,
    activeLeaseCount: 0,
    utilizationPercent: 0,
    updatedAt: Date.now(),
  };
}

export async function getPlatformSummary(): Promise<Record<string, PlatformMetalState>> {
  const metals = ['AUXG', 'AUXS', 'AUXPT', 'AUXPD'];
  const summary: Record<string, PlatformMetalState> = {};

  for (const metal of metals) {
    summary[metal] = await getPlatformMetalState(metal);
  }

  return summary;
}

// ============================================
// LEDGER LOG (audit trail)
// ============================================
export async function getUserLedgerLog(address: string, limit: number = 50): Promise<LedgerLogEntry[]> {
  try {
    const raw = await redis.lrange(KEYS.ledgerLog(address), 0, limit - 1);
    if (!raw || raw.length === 0) return [];

    return raw.map((item) => {
      if (typeof item === 'string') return JSON.parse(item) as LedgerLogEntry;
      return item as LedgerLogEntry;
    });
  } catch (e) {
    console.warn(`Failed to fetch ledger log for ${address}`, e);
    return [];
  }
}

export async function getPlatformLedgerLog(limit: number = 100): Promise<LedgerLogEntry[]> {
  try {
    const raw = await redis.lrange(KEYS.platformLog, 0, limit - 1);
    if (!raw || raw.length === 0) return [];

    return raw.map((item) => {
      if (typeof item === 'string') return JSON.parse(item) as LedgerLogEntry;
      return item as LedgerLogEntry;
    });
  } catch (e) {
    console.warn('Failed to fetch platform ledger log', e);
    return [];
  }
}
