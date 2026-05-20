// ============================================================================
// TREASURY EXPOSURE TRACKER
// ----------------------------------------------------------------------------
// Real-time net position ledger for AUXG/AUXS/AUXPT/AUXPD. Updated on every
// stake/unstake/buy/sell event. This is the foundation Phase 2 (Abaxx hedge)
// and Phase 3 (Singapore vault allocation) will read from to size hedges
// and allocate physical bullion.
//
// Redis schema:
//   treasury:exposure:{metal}     hash  { locked, total, lastUpdated }
//   treasury:audit:log            list  JSON ExposureEvent[]  (capped 10K)
//   treasury:alerts:{metal}:{key} key   "1" with TTL (debounce)
//
// `locked` = grams currently in staking escrow contracts
// `total`  = grams in circulation (sum of all user balances + locked)
// `free`   = total - locked (synthesized at read time)
//
// IMPORTANT: This module is the SOURCE OF TRUTH for treasury net exposure.
// All stake/unstake/trade endpoints MUST call recordExposureChange() so the
// ledger stays consistent. Inconsistency between this ledger and on-chain
// reality is a treasury operations alert (reconciler will flag it).
// ============================================================================

import { redis, getRedis } from "@/lib/redis";

export type MetalSymbol = "AUXG" | "AUXS" | "AUXPT" | "AUXPD";

export const METALS: MetalSymbol[] = ["AUXG", "AUXS", "AUXPT", "AUXPD"];

export type ExposureChange =
  | "stake"          // user locks tokens in staking contract
  | "unstake"        // maturity payout or early withdraw
  | "buy"            // user buys metal — total supply grows
  | "sell"           // user sells metal — total supply shrinks
  | "mint"           // treasury issues new tokens against physical allocation
  | "burn"           // treasury redeems tokens against physical withdraw
  | "transfer_in"    // user-to-user (no exposure change, audit-only)
  | "transfer_out";

export interface ExposureSnapshot {
  metal: MetalSymbol;
  locked: number;       // grams escrowed in staking
  total: number;        // total grams in circulation
  free: number;         // total - locked
  lastUpdated: number;  // unix ms
}

export interface ExposureEvent {
  metal: MetalSymbol;
  type: ExposureChange;
  amount: number;          // grams (positive for inflow, see signs below)
  deltaLocked: number;     // change in locked balance
  deltaTotal: number;      // change in total supply
  refId?: string;          // stakeId / txHash / orderId
  walletAddress?: string;  // user that triggered (lowercase)
  timestamp: number;
  reason?: string;         // human-readable note for audit
}

// Per-event sign conventions (positive deltas applied via hincrbyfloat):
//   stake           → locked +amount, total 0
//   unstake         → locked −amount, total +reward (if reward > 0)
//   buy             → locked 0, total +amount
//   sell            → locked 0, total −amount
//   mint            → locked 0, total +amount  (treasury → vault allocation)
//   burn            → locked 0, total −amount  (vault redemption)
//   transfer_in/out → both 0 (no platform exposure change)
function computeDeltas(type: ExposureChange, amount: number, rewardGrams = 0): {
  deltaLocked: number;
  deltaTotal: number;
} {
  switch (type) {
    case "stake":     return { deltaLocked: +amount, deltaTotal: 0 };
    case "unstake":   return { deltaLocked: -amount, deltaTotal: +rewardGrams };
    case "buy":
    case "mint":      return { deltaLocked: 0, deltaTotal: +amount };
    case "sell":
    case "burn":      return { deltaLocked: 0, deltaTotal: -amount };
    case "transfer_in":
    case "transfer_out": return { deltaLocked: 0, deltaTotal: 0 };
  }
}

// ── Alert thresholds (per-metal, in grams).
// AUXG: 5kg ≈ $700K notional; AUXS at 100kg parity since silver is ~1/85 gold;
// PT/PD similar to gold by USD notional. These trigger ops alerts so we can
// hedge or allocate physical inventory.
const LOCKED_ALERT_GRAMS: Record<MetalSymbol, number> = {
  AUXG: 5000,    // 5 kg gold
  AUXS: 400000,  // 400 kg silver
  AUXPT: 5000,   // 5 kg platinum
  AUXPD: 5000,   // 5 kg palladium
};

const ALERT_DEBOUNCE_SECONDS = 6 * 60 * 60; // 6h between identical alerts

// Internal helpers
function exposureKey(metal: MetalSymbol): string {
  return `treasury:exposure:${metal}`;
}

function alertDebounceKey(metal: MetalSymbol, kind: string): string {
  return `treasury:alerts:${metal}:${kind}`;
}

async function maybeAlertLockedThreshold(metal: MetalSymbol, locked: number): Promise<void> {
  const threshold = LOCKED_ALERT_GRAMS[metal];
  if (locked < threshold) return;
  const key = alertDebounceKey(metal, "locked-high");
  const seen = await redis.get(key);
  if (seen) return;
  await redis.set(key, "1", { ex: ALERT_DEBOUNCE_SECONDS });
  // Lightweight signal — Phase 2 hedge engine will subscribe to this list.
  await redis.lpush("treasury:alerts:pending", JSON.stringify({
    metal,
    kind: "locked-high",
    locked,
    threshold,
    at: Date.now(),
  }));
  await redis.ltrim("treasury:alerts:pending", 0, 999);
  console.warn(`[treasury] ⚠️ ${metal} locked ${locked.toFixed(2)}g exceeds ${threshold}g threshold`);
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Record an exposure change. Idempotency is the caller's responsibility — if
 * the same event might fire twice (e.g. webhook retries), pass a stable
 * `refId` so reconciliation can detect duplicates later.
 */
export async function recordExposureChange(params: {
  metal: MetalSymbol;
  type: ExposureChange;
  amount: number;
  rewardGrams?: number;
  refId?: string;
  walletAddress?: string;
  reason?: string;
}): Promise<ExposureEvent> {
  const { metal, type, amount } = params;
  if (!METALS.includes(metal)) {
    throw new Error(`treasury: unsupported metal ${metal}`);
  }
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`treasury: invalid amount ${amount}`);
  }

  const { deltaLocked, deltaTotal } = computeDeltas(type, amount, params.rewardGrams || 0);
  const now = Date.now();
  const key = exposureKey(metal);

  // Apply deltas atomically. hincrbyfloat preserves precision better than
  // read-modify-write for high-frequency stake events. We use the raw
  // Upstash client's pipeline() since our redis wrapper doesn't proxy it
  // with the full method surface.
  const pipe = getRedis().pipeline();
  if (deltaLocked !== 0) pipe.hincrbyfloat(key, "locked", deltaLocked);
  if (deltaTotal !== 0) pipe.hincrbyfloat(key, "total", deltaTotal);
  pipe.hset(key, { lastUpdated: now });
  await pipe.exec();

  const event: ExposureEvent = {
    metal,
    type,
    amount,
    deltaLocked,
    deltaTotal,
    refId: params.refId,
    walletAddress: params.walletAddress?.toLowerCase(),
    timestamp: now,
    reason: params.reason,
  };

  // Audit log — capped at 10K most-recent events. Phase 2 reconciler will
  // diff this against on-chain events nightly.
  await redis.lpush("treasury:audit:log", JSON.stringify(event));
  await redis.ltrim("treasury:audit:log", 0, 9999);

  // Threshold alert check — only re-read locked when the lock side changed.
  if (deltaLocked !== 0) {
    const lockedRaw = await redis.hget(key, "locked");
    const locked = parseFloat(String(lockedRaw || 0));
    await maybeAlertLockedThreshold(metal, locked).catch(() => {
      // alerts are best-effort; never break the recording path
    });
  }

  return event;
}

/** Read the current snapshot for one metal. */
export async function getExposure(metal: MetalSymbol): Promise<ExposureSnapshot> {
  const data = await redis.hgetall(exposureKey(metal));
  const locked = parseFloat(String(data?.locked || 0));
  const total = parseFloat(String(data?.total || 0));
  return {
    metal,
    locked,
    total,
    free: Math.max(0, total - locked),
    lastUpdated: parseInt(String(data?.lastUpdated || 0), 10) || 0,
  };
}

/** Read snapshots for all four metals. */
export async function getAllExposures(): Promise<Record<MetalSymbol, ExposureSnapshot>> {
  const entries = await Promise.all(METALS.map((m) => getExposure(m)));
  return Object.fromEntries(entries.map((e) => [e.metal, e])) as Record<MetalSymbol, ExposureSnapshot>;
}

/**
 * Recent audit-log entries for ops review. Most-recent first.
 * `limit` capped at 1000 to keep payloads small.
 */
export async function getRecentEvents(limit = 100): Promise<ExposureEvent[]> {
  const safeLimit = Math.min(Math.max(1, limit), 1000);
  const raw = await redis.lrange("treasury:audit:log", 0, safeLimit - 1);
  return raw
    .map((s) => {
      try { return typeof s === "string" ? JSON.parse(s) : s; }
      catch { return null; }
    })
    .filter(Boolean);
}

/** Pending threshold alerts (Phase 2 hedge engine reads from here). */
export async function getPendingAlerts(): Promise<any[]> {
  const raw = await redis.lrange("treasury:alerts:pending", 0, 99);
  return raw.map((s) => {
    try { return typeof s === "string" ? JSON.parse(s) : s; }
    catch { return null; }
  }).filter(Boolean);
}

/**
 * Reconcile the ledger from the canonical platform:staked:{metal}.active key
 * that existing staking code already maintains. Used by /api/admin/treasury
 * to detect drift before Phase 2 ships its dedicated reconciler.
 *
 * Returns the platform-tracked locked value so the dashboard can show
 * both numbers side-by-side.
 */
export async function getLegacyPlatformStaked(metal: MetalSymbol): Promise<number> {
  const raw = await redis.hget(`platform:staked:${metal}`, "active");
  return parseFloat(String(raw || 0)) || 0;
}
