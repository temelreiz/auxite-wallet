// ============================================
// YIELD SMOOTHER — Auxite Metal Leasing Engine
// Rolling average rate smoothing to prevent wild swings
// Max daily change cap: 10bps, 7-day rolling window
// ============================================

import { Redis } from '@upstash/redis';
import type { ComputedYield } from './yield-builder';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ============================================
// REDIS KEY NAMESPACE
// ============================================
const KEYS = {
  config: 'leasing:smoother:config',
  window: (metal: string, tenor: string) => `leasing:smoother:window:${metal}:${tenor}`,
  lastSmoothed: (metal: string, tenor: string) => `leasing:smoother:last:${metal}:${tenor}`,
};

// ============================================
// TYPES
// ============================================
export interface SmootherConfig {
  enabled: boolean;
  windowDays: number;              // Rolling window size (default: 7)
  maxDailyChangeBps: number;       // Max change per computation cycle (default: 10 = 0.10%)
  minDataPoints: number;           // Minimum data points before smoothing kicks in
  weightRecent: boolean;           // Weight recent observations more heavily
  decayFactor: number;             // Exponential decay factor (0.8 = 80% weight retention per day)
}

export interface SmoothedRate {
  metal: string;
  tenor: string;
  // Raw input
  rawRateLow: number;
  rawRateHigh: number;
  rawRateMid: number;
  // Smoothed output
  smoothedRateLow: number;
  smoothedRateHigh: number;
  smoothedRateMid: number;
  // Metadata
  windowSize: number;
  dataPointsUsed: number;
  changeCapped: boolean;
  cappedDirection: 'up' | 'down' | 'none';
  smoothedAt: number;
}

interface WindowEntry {
  rateLow: number;
  rateHigh: number;
  rateMid: number;
  quoteCount: number;
  timestamp: number;
}

// ============================================
// DEFAULT CONFIG
// ============================================
const DEFAULT_CONFIG: SmootherConfig = {
  enabled: true,
  windowDays: 7,
  maxDailyChangeBps: 10,           // 0.10% max change per cycle
  minDataPoints: 3,                // Need at least 3 data points
  weightRecent: true,
  decayFactor: 0.85,               // Recent data weighted 85% more per day
};

// ============================================
// CONFIG
// ============================================
export async function getSmootherConfig(): Promise<SmootherConfig> {
  try {
    const raw = await redis.get(KEYS.config);
    if (raw && typeof raw === 'object') {
      return { ...DEFAULT_CONFIG, ...(raw as Partial<SmootherConfig>) };
    }
  } catch (e) {
    console.warn('Failed to fetch smoother config, using defaults', e);
  }
  return DEFAULT_CONFIG;
}

export async function setSmootherConfig(config: Partial<SmootherConfig>): Promise<SmootherConfig> {
  const current = await getSmootherConfig();
  const merged = { ...current, ...config };
  await redis.set(KEYS.config, merged);
  return merged;
}

// ============================================
// ROLLING WINDOW MANAGEMENT
// ============================================
async function addToWindow(metal: string, tenor: string, entry: WindowEntry): Promise<void> {
  const key = KEYS.window(metal, tenor);
  await redis.lpush(key, JSON.stringify(entry));
  // Keep max 30 days of data (safety cap)
  await redis.ltrim(key, 0, 29);
}

async function getWindow(metal: string, tenor: string, maxEntries: number): Promise<WindowEntry[]> {
  try {
    const key = KEYS.window(metal, tenor);
    const raw = await redis.lrange(key, 0, maxEntries - 1);
    if (!raw || raw.length === 0) return [];

    return raw.map((item) => {
      if (typeof item === 'string') {
        return JSON.parse(item) as WindowEntry;
      }
      return item as WindowEntry;
    });
  } catch (e) {
    console.warn(`Failed to fetch smoother window for ${metal}/${tenor}`, e);
    return [];
  }
}

async function getLastSmoothedRate(metal: string, tenor: string): Promise<SmoothedRate | null> {
  try {
    const raw = await redis.get(KEYS.lastSmoothed(metal, tenor));
    if (raw && typeof raw === 'object') return raw as SmoothedRate;
  } catch (e) {
    console.warn(`Failed to fetch last smoothed rate for ${metal}/${tenor}`, e);
  }
  return null;
}

// ============================================
// CORE SMOOTHING ALGORITHM
// ============================================
function computeWeightedAverage(
  entries: WindowEntry[],
  config: SmootherConfig,
  field: 'rateLow' | 'rateHigh' | 'rateMid'
): number {
  if (entries.length === 0) return 0;
  if (entries.length === 1) return entries[0][field];

  const now = Date.now();

  if (config.weightRecent) {
    // Exponential decay weighting — recent observations matter more
    let totalWeight = 0;
    let weightedSum = 0;

    for (const entry of entries) {
      const ageMs = now - entry.timestamp;
      const ageDays = ageMs / (24 * 60 * 60 * 1000);
      const weight = Math.pow(config.decayFactor, ageDays);

      weightedSum += entry[field] * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : entries[0][field];
  } else {
    // Simple average
    const sum = entries.reduce((acc, e) => acc + e[field], 0);
    return sum / entries.length;
  }
}

function applyChangeCap(
  newRate: number,
  previousRate: number,
  maxChangeBps: number
): { rate: number; capped: boolean; direction: 'up' | 'down' | 'none' } {
  const maxChange = maxChangeBps / 100; // Convert bps to percent
  const change = newRate - previousRate;

  if (Math.abs(change) <= maxChange) {
    return { rate: newRate, capped: false, direction: 'none' };
  }

  if (change > 0) {
    return { rate: previousRate + maxChange, capped: true, direction: 'up' };
  } else {
    return { rate: previousRate - maxChange, capped: true, direction: 'down' };
  }
}

// ============================================
// SMOOTH YIELD
// ============================================
export async function smoothYield(computed: ComputedYield): Promise<SmoothedRate> {
  const config = await getSmootherConfig();

  // If smoothing disabled, pass through
  if (!config.enabled) {
    return {
      metal: computed.metal,
      tenor: computed.tenor,
      rawRateLow: computed.displayRateLow,
      rawRateHigh: computed.displayRateHigh,
      rawRateMid: computed.displayRateMid,
      smoothedRateLow: computed.displayRateLow,
      smoothedRateHigh: computed.displayRateHigh,
      smoothedRateMid: computed.displayRateMid,
      windowSize: 0,
      dataPointsUsed: 0,
      changeCapped: false,
      cappedDirection: 'none',
      smoothedAt: Date.now(),
    };
  }

  // Add current rate to rolling window
  const entry: WindowEntry = {
    rateLow: computed.displayRateLow,
    rateHigh: computed.displayRateHigh,
    rateMid: computed.displayRateMid,
    quoteCount: computed.quoteCount,
    timestamp: Date.now(),
  };
  await addToWindow(computed.metal, computed.tenor, entry);

  // Get rolling window
  const window = await getWindow(computed.metal, computed.tenor, config.windowDays);

  // If not enough data points, don't smooth
  if (window.length < config.minDataPoints) {
    const result: SmoothedRate = {
      metal: computed.metal,
      tenor: computed.tenor,
      rawRateLow: computed.displayRateLow,
      rawRateHigh: computed.displayRateHigh,
      rawRateMid: computed.displayRateMid,
      smoothedRateLow: computed.displayRateLow,
      smoothedRateHigh: computed.displayRateHigh,
      smoothedRateMid: computed.displayRateMid,
      windowSize: window.length,
      dataPointsUsed: window.length,
      changeCapped: false,
      cappedDirection: 'none',
      smoothedAt: Date.now(),
    };

    await redis.set(KEYS.lastSmoothed(computed.metal, computed.tenor), result);
    return result;
  }

  // Compute weighted averages
  let smoothedLow = computeWeightedAverage(window, config, 'rateLow');
  let smoothedHigh = computeWeightedAverage(window, config, 'rateHigh');
  let smoothedMid = computeWeightedAverage(window, config, 'rateMid');

  // Apply change cap against previous smoothed rate
  let changeCapped = false;
  let cappedDirection: 'up' | 'down' | 'none' = 'none';

  const lastSmoothed = await getLastSmoothedRate(computed.metal, computed.tenor);
  if (lastSmoothed) {
    const midCap = applyChangeCap(smoothedMid, lastSmoothed.smoothedRateMid, config.maxDailyChangeBps);
    smoothedMid = midCap.rate;
    changeCapped = midCap.capped;
    cappedDirection = midCap.direction;

    const lowCap = applyChangeCap(smoothedLow, lastSmoothed.smoothedRateLow, config.maxDailyChangeBps);
    smoothedLow = lowCap.rate;

    const highCap = applyChangeCap(smoothedHigh, lastSmoothed.smoothedRateHigh, config.maxDailyChangeBps);
    smoothedHigh = highCap.rate;
  }

  // Ensure low <= mid <= high
  smoothedLow = Math.min(smoothedLow, smoothedMid);
  smoothedHigh = Math.max(smoothedHigh, smoothedMid);

  // Floor at 0.1%
  smoothedLow = Math.max(0.1, smoothedLow);
  smoothedHigh = Math.max(0.1, smoothedHigh);
  smoothedMid = Math.max(0.1, smoothedMid);

  const result: SmoothedRate = {
    metal: computed.metal,
    tenor: computed.tenor,
    rawRateLow: computed.displayRateLow,
    rawRateHigh: computed.displayRateHigh,
    rawRateMid: computed.displayRateMid,
    smoothedRateLow: parseFloat(smoothedLow.toFixed(2)),
    smoothedRateHigh: parseFloat(smoothedHigh.toFixed(2)),
    smoothedRateMid: parseFloat(smoothedMid.toFixed(2)),
    windowSize: config.windowDays,
    dataPointsUsed: window.length,
    changeCapped,
    cappedDirection,
    smoothedAt: Date.now(),
  };

  // Cache last smoothed rate
  await redis.set(KEYS.lastSmoothed(computed.metal, computed.tenor), result);

  return result;
}

// ============================================
// BATCH SMOOTH ALL METALS
// ============================================
export async function smoothAllYields(
  computedYields: Record<string, Record<string, ComputedYield>>
): Promise<Record<string, Record<string, SmoothedRate>>> {
  const results: Record<string, Record<string, SmoothedRate>> = {};

  for (const [metal, tenors] of Object.entries(computedYields)) {
    results[metal] = {};
    for (const [tenor, computed] of Object.entries(tenors)) {
      results[metal][tenor] = await smoothYield(computed as ComputedYield);
    }
  }

  return results;
}

// ============================================
// RESET SMOOTHER (admin utility)
// ============================================
export async function resetSmootherWindow(metal: string, tenor: string): Promise<void> {
  await redis.del(KEYS.window(metal, tenor));
  await redis.del(KEYS.lastSmoothed(metal, tenor));
}

export async function resetAllSmootherWindows(): Promise<void> {
  const metals = ['AUXG', 'AUXS', 'AUXPT', 'AUXPD'];
  const tenors = ['3M', '6M', '12M'];

  for (const metal of metals) {
    for (const tenor of tenors) {
      await resetSmootherWindow(metal, tenor);
    }
  }
}

// ============================================
// DIAGNOSTICS
// ============================================
export async function getSmootherDiagnostics(metal: string, tenor: string): Promise<{
  config: SmootherConfig;
  windowEntries: WindowEntry[];
  lastSmoothed: SmoothedRate | null;
}> {
  const config = await getSmootherConfig();
  const windowEntries = await getWindow(metal, tenor, 30);
  const lastSmoothed = await getLastSmoothedRate(metal, tenor);

  return { config, windowEntries, lastSmoothed };
}
