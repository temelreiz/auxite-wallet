// ============================================================================
// YIELD ACCOUNTING ENGINE
// ----------------------------------------------------------------------------
// Replaces the pre-promised `expectedReward` model with day-by-day actual
// income accrual. When Phase 2 (Abaxx futures roll) and Phase 3 (Singapore
// vault lease income) come online, recordDailyIncome() is how real PnL
// reaches each user's stake.
//
// Phase 1 mode (TODAY):
//   No income source wired yet. recordDailyIncome() is callable but no cron
//   fires it. Stakes still pay expectedReward at maturity. This module just
//   builds the rails — the existing staking-reminders cron continues to work.
//
// Phase 2 mode (after Abaxx authenticated API ships):
//   abaxx-hedge.ts settles each day → recordDailyIncome({ source: "abaxx_roll" })
//   Daily cron distributes pool → accruedReward per stake
//
// Phase 3 mode (after Singapore vault contract):
//   vault-allocation.ts books monthly lease income →
//   recordDailyIncome({ source: "vault_lease" })
//
// Redis schema:
//   treasury:income:{metal}:{YYYY-MM-DD}  hash {abaxx_roll, vault_lease, total}
//   treasury:yield:pool:{metal}           hash {accrued, distributed}
//   stake:{stakeId}:accruedReward         string  grams accrued so far
//   stake:{stakeId}:accrualLog            list    daily entries (capped 365)
//
// Distribution rule:
//   Each day's income is split across all active stakes weighted by
//   (amount × remaining_days). This rewards both size and lock duration —
//   matches how a real bullion lease pool prices commitments.
// ============================================================================

import { redis } from "@/lib/redis";
import type { MetalSymbol } from "@/lib/treasury-exposure";
import { METALS } from "@/lib/treasury-exposure";

export type YieldSource = "abaxx_roll" | "vault_lease" | "otc_spread" | "manual";

export interface DailyIncomeEntry {
  metal: MetalSymbol;
  date: string;            // YYYY-MM-DD UTC
  source: YieldSource;
  grams: number;           // metal grams added to pool (already net of fees)
  usdValue?: number;       // optional reference value at the time of booking
  note?: string;
  refId?: string;          // e.g. abaxx position id or vault statement id
  recordedAt: number;
}

export interface StakeAccrual {
  stakeId: string;
  metal: MetalSymbol;
  amount: number;
  startDate: number;
  endDate: number;
  accruedReward: number;
  lastAccrualAt: number;
}

function dateKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function poolKey(metal: MetalSymbol): string {
  return `treasury:yield:pool:${metal}`;
}

function incomeKey(metal: MetalSymbol, date: string): string {
  return `treasury:income:${metal}:${date}`;
}

// ── Income recording (Phase 2/3 wires these) ─────────────────────────────────

/**
 * Book a real income event for the day. Phase 2/3 modules call this whenever
 * a hedge roll settles or vault lease pays. Pool grows; subsequent
 * distribution runs allocate to active stakes.
 */
export async function recordDailyIncome(params: {
  metal: MetalSymbol;
  source: YieldSource;
  grams: number;
  usdValue?: number;
  refId?: string;
  note?: string;
}): Promise<DailyIncomeEntry> {
  const { metal, source, grams } = params;
  if (!METALS.includes(metal)) throw new Error(`yield: invalid metal ${metal}`);
  if (!Number.isFinite(grams)) throw new Error(`yield: invalid grams ${grams}`);

  const date = dateKey();
  const now = Date.now();
  const entry: DailyIncomeEntry = {
    metal,
    date,
    source,
    grams,
    usdValue: params.usdValue,
    note: params.note,
    refId: params.refId,
    recordedAt: now,
  };

  // Bump per-day income tally + global pool counter
  const multi = redis.multi();
  multi.hincrbyfloat(incomeKey(metal, date), source, grams);
  multi.hincrbyfloat(incomeKey(metal, date), "total", grams);
  multi.hincrbyfloat(poolKey(metal), "accrued", grams);
  multi.lpush(`treasury:income:log`, JSON.stringify(entry));
  multi.ltrim(`treasury:income:log`, 0, 9999);
  await multi.exec();

  return entry;
}

/** Read the pool snapshot — accrued vs distributed so far for a metal. */
export async function getYieldPool(metal: MetalSymbol): Promise<{
  metal: MetalSymbol;
  accrued: number;
  distributed: number;
  available: number;
}> {
  const data = await redis.hgetall(poolKey(metal));
  const accrued = parseFloat(String(data?.accrued || 0));
  const distributed = parseFloat(String(data?.distributed || 0));
  return {
    metal,
    accrued,
    distributed,
    available: Math.max(0, accrued - distributed),
  };
}

// ── Stake accrual (per-user reward tracking) ─────────────────────────────────

/**
 * Read the accumulated reward grams for a stake. This is the number the
 * maturity cron should pay out instead of `expectedReward` once Phase 2/3
 * ship. Returns 0 before any distribution has run.
 */
export async function getAccruedReward(stakeId: string): Promise<number> {
  const raw = await redis.get(`stake:${stakeId}:accruedReward`);
  return parseFloat(String(raw || 0)) || 0;
}

/**
 * Apply a per-stake reward credit. Called by distributePoolToStakes() — not
 * directly by API routes.
 */
export async function creditStakeReward(
  stakeId: string,
  metal: MetalSymbol,
  grams: number,
  reason: string,
): Promise<void> {
  if (!(grams > 0)) return;
  const multi = redis.multi();
  multi.incrbyfloat(`stake:${stakeId}:accruedReward`, grams);
  multi.lpush(`stake:${stakeId}:accrualLog`, JSON.stringify({
    grams, reason, at: Date.now(),
  }));
  multi.ltrim(`stake:${stakeId}:accrualLog`, 0, 364);
  multi.hincrbyfloat(poolKey(metal), "distributed", grams);
  await multi.exec();
}

// ── Distribution (daily cron will call this) ─────────────────────────────────

/**
 * Distribute the available pool for one metal to all currently-active stakes,
 * weighted by (amount × days_remaining). Days_remaining caps at 365 so a
 * 12m stake on day 1 doesn't completely starve 3m stakes near maturity.
 *
 * Returns the dry-run breakdown when `commit=false` so ops can preview.
 *
 * SAFETY: This function only EVER reduces `pool.available`. If the active
 * stake set is empty it bails — the pool waits for the next active staker.
 */
export async function distributePoolToStakes(params: {
  metal: MetalSymbol;
  commit: boolean;
}): Promise<{
  metal: MetalSymbol;
  poolBefore: number;
  totalDistributed: number;
  stakeCount: number;
  breakdown: Array<{ stakeId: string; weight: number; share: number }>;
}> {
  const { metal, commit } = params;
  const pool = await getYieldPool(metal);
  if (pool.available <= 0) {
    return { metal, poolBefore: 0, totalDistributed: 0, stakeCount: 0, breakdown: [] };
  }

  // Iterate every wallet's stake list. For Phase 1 we accept the O(N)
  // SCAN cost — staker count is small. Phase 4 will switch to an indexed
  // `treasury:stakers:active` set updated on each stake create/mature.
  const stakeKeyPrefix = "stakes:";
  const stakeKeys = await redis.keys(`${stakeKeyPrefix}*`);
  const candidates: StakeAccrual[] = [];
  const now = Date.now();

  for (const key of stakeKeys) {
    const raw = await redis.get(key);
    if (!raw) continue;
    const list = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(list)) continue;
    for (const s of list) {
      if (s?.status !== "active") continue;
      if (String(s?.metal).toUpperCase() !== metal) continue;
      const start = new Date(s.startDate).getTime();
      const end = new Date(s.endDate).getTime();
      if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
      if (end <= now) continue; // already matured, maturity cron handles it
      candidates.push({
        stakeId: s.id,
        metal,
        amount: parseFloat(String(s.amount)) || 0,
        startDate: start,
        endDate: end,
        accruedReward: 0,
        lastAccrualAt: 0,
      });
    }
  }

  if (candidates.length === 0) {
    return { metal, poolBefore: pool.available, totalDistributed: 0, stakeCount: 0, breakdown: [] };
  }

  // Weight = amount × min(remaining_days, 365)
  const weights = candidates.map((c) => {
    const remainingMs = c.endDate - now;
    const remainingDays = Math.max(1, Math.min(365, Math.ceil(remainingMs / 86_400_000)));
    return c.amount * remainingDays;
  });
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (!(totalWeight > 0)) {
    return { metal, poolBefore: pool.available, totalDistributed: 0, stakeCount: candidates.length, breakdown: [] };
  }

  const breakdown: Array<{ stakeId: string; weight: number; share: number }> = [];
  let totalDistributed = 0;

  for (let i = 0; i < candidates.length; i++) {
    const share = (pool.available * weights[i]) / totalWeight;
    breakdown.push({ stakeId: candidates[i].stakeId, weight: weights[i], share });
    totalDistributed += share;
    if (commit && share > 0) {
      await creditStakeReward(candidates[i].stakeId, metal, share, `daily-pool ${dateKey()}`);
    }
  }

  return {
    metal,
    poolBefore: pool.available,
    totalDistributed,
    stakeCount: candidates.length,
    breakdown,
  };
}

/** Run distribution for all four metals. */
export async function distributeAllMetals(commit: boolean) {
  const results = [];
  for (const metal of METALS) {
    results.push(await distributePoolToStakes({ metal, commit }));
  }
  return results;
}

// ── Reporting (admin dashboard reads these) ──────────────────────────────────

export async function getRecentIncome(limit = 50): Promise<DailyIncomeEntry[]> {
  const raw = await redis.lrange("treasury:income:log", 0, Math.min(limit, 500) - 1);
  return raw.map((s) => {
    try { return typeof s === "string" ? JSON.parse(s) : s; }
    catch { return null; }
  }).filter(Boolean);
}

export async function getIncomeForDay(metal: MetalSymbol, date?: string): Promise<Record<string, number>> {
  const d = date || dateKey();
  const data = await redis.hgetall(incomeKey(metal, d));
  if (!data) return {};
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, parseFloat(String(v))])
  );
}
