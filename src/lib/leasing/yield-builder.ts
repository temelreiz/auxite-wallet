// ============================================
// YIELD BUILDER — Auxite Metal Leasing Engine
// Blended rate calculator: counterparty quotes → user-facing yield range
// Formula: Displayed Yield = Weighted Avg Lease Rate - Auxite Spread - Risk Buffer
// ============================================

import { Redis } from '@upstash/redis';
import {
  getActiveQuotes,
  getCounterparty,
  type LeaseQuote,
  type CounterpartyTier,
} from './counterparty-manager';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ============================================
// REDIS KEY NAMESPACE
// ============================================
const KEYS = {
  config: 'leasing:yield:config',
  computed: (metal: string, tenor: string) => `leasing:yield:computed:${metal}:${tenor}`,
  computedAll: 'leasing:yield:computed:all',
  history: (metal: string) => `leasing:yield:history:${metal}`,
};

// ============================================
// TYPES
// ============================================
export interface YieldBuilderConfig {
  auxiteSpreadBps: number;          // Platform margin in basis points (50 = 0.50%)
  riskBufferBps: number;            // Volatility shield (25 = 0.25%)
  minQuotesForBlend: number;        // Minimum quotes needed (1 for early stage)
  riskWeightByTier: Record<CounterpartyTier, number>;
  displayAsRange: boolean;
  rangeWidthBps: number;            // 35 bps range width when few quotes
  fallbackEnabled: boolean;
}

export interface ComputedYield {
  metal: string;
  tenor: string;
  tenorDays: number;
  // Raw rates from counterparties
  weightedAvgRate: number;
  bestRate: number;
  worstRate: number;
  quoteCount: number;
  // After deductions
  auxiteSpread: number;
  riskBuffer: number;
  // Final user-facing
  displayRateLow: number;
  displayRateHigh: number;
  displayRateMid: number;
  // Metadata
  internalBuffer: number;           // Dealer rate minus display high (revenue shield)
  computedAt: number;
  source: string;
  fallbackUsed: boolean;
}

export interface YieldSnapshot {
  metals: Record<string, Record<string, ComputedYield>>;
  sofr: number;
  computedAt: number;
  source: string;
}

// ============================================
// DEFAULT CONFIG
// ============================================
const DEFAULT_CONFIG: YieldBuilderConfig = {
  auxiteSpreadBps: 50,              // 0.50% platform margin
  riskBufferBps: 25,                // 0.25% volatility shield
  minQuotesForBlend: 1,             // Start with 1 (scale to 3)
  riskWeightByTier: {
    bullion_bank: 1.0,
    otc_dealer: 0.7,
    central_bank: 1.2,
  },
  displayAsRange: true,
  rangeWidthBps: 35,                // 0.35% range width
  fallbackEnabled: true,
};

// Fallback rates (current hardcoded — used when no counterparty quotes exist)
const FALLBACK_RATES: Record<string, Record<string, number>> = {
  AUXG: { '3M': 1.53, '6M': 2.03, '12M': 2.53 },
  AUXS: { '3M': 1.23, '6M': 1.73, '12M': 2.23 },
  AUXPT: { '3M': 2.03, '6M': 2.53, '12M': 3.03 },
  AUXPD: { '3M': 1.83, '6M': 2.33, '12M': 2.83 },
};

const TENOR_DAYS: Record<string, number> = {
  '3M': 90,
  '6M': 180,
  '12M': 365,
};

// ============================================
// CONFIG
// ============================================
export async function getYieldConfig(): Promise<YieldBuilderConfig> {
  try {
    const raw = await redis.get(KEYS.config);
    if (raw && typeof raw === 'object') {
      return { ...DEFAULT_CONFIG, ...(raw as Partial<YieldBuilderConfig>) };
    }
  } catch (e) {
    console.warn('Failed to fetch yield config, using defaults', e);
  }
  return DEFAULT_CONFIG;
}

export async function setYieldConfig(config: Partial<YieldBuilderConfig>): Promise<YieldBuilderConfig> {
  const current = await getYieldConfig();
  const merged = { ...current, ...config };
  await redis.set(KEYS.config, merged);
  return merged;
}

// ============================================
// WEIGHTED AVERAGE COMPUTATION
// ============================================
async function computeWeightedRate(
  quotes: LeaseQuote[],
  config: YieldBuilderConfig
): Promise<{ weightedAvg: number; bestRate: number; worstRate: number }> {
  if (quotes.length === 0) return { weightedAvg: 0, bestRate: 0, worstRate: 0 };

  let totalWeight = 0;
  let weightedSum = 0;
  let bestRate = -Infinity;
  let worstRate = Infinity;

  for (const q of quotes) {
    const cp = await getCounterparty(q.counterpartyId);
    const tierWeight = cp
      ? (config.riskWeightByTier[cp.tier] || 1.0)
      : 1.0;

    // Size weight: larger quotes = more weight (cap at 2x)
    const sizeWeight = Math.min((q.maxSizeOz || 1000) / 1000, 2.0);

    const weight = tierWeight * sizeWeight;
    weightedSum += q.ratePercent * weight;
    totalWeight += weight;

    if (q.ratePercent > bestRate) bestRate = q.ratePercent;
    if (q.ratePercent < worstRate) worstRate = q.ratePercent;
  }

  return {
    weightedAvg: totalWeight > 0 ? weightedSum / totalWeight : 0,
    bestRate: bestRate === -Infinity ? 0 : bestRate,
    worstRate: worstRate === Infinity ? 0 : worstRate,
  };
}

// ============================================
// COMPUTE YIELD FOR SINGLE METAL+TENOR
// ============================================
export async function computeYieldForTenor(
  metal: string,
  tenor: string
): Promise<ComputedYield> {
  const config = await getYieldConfig();
  const quotes = await getActiveQuotes(metal, tenor);
  const now = Date.now();

  // If not enough quotes, use fallback
  if (quotes.length < config.minQuotesForBlend) {
    const fallbackRate = FALLBACK_RATES[metal.toUpperCase()]?.[tenor.toUpperCase()] || 2.0;

    return {
      metal,
      tenor,
      tenorDays: TENOR_DAYS[tenor] || 180,
      weightedAvgRate: fallbackRate + (config.auxiteSpreadBps + config.riskBufferBps) / 100,
      bestRate: fallbackRate + (config.auxiteSpreadBps + config.riskBufferBps) / 100,
      worstRate: fallbackRate + (config.auxiteSpreadBps + config.riskBufferBps) / 100,
      quoteCount: 0,
      auxiteSpread: config.auxiteSpreadBps / 100,
      riskBuffer: config.riskBufferBps / 100,
      displayRateLow: fallbackRate,
      displayRateHigh: fallbackRate,
      displayRateMid: fallbackRate,
      internalBuffer: 0,
      computedAt: now,
      source: 'fallback',
      fallbackUsed: true,
    };
  }

  // Compute blended rate
  const { weightedAvg, bestRate, worstRate } = await computeWeightedRate(quotes, config);

  // Deduct spreads
  const auxiteSpread = config.auxiteSpreadBps / 100;
  const riskBuffer = config.riskBufferBps / 100;
  const netRate = weightedAvg - auxiteSpread - riskBuffer;

  // Build range
  let displayRateLow: number;
  let displayRateHigh: number;

  if (config.displayAsRange && quotes.length >= 2) {
    // Multiple quotes: range from worst to best (after deductions)
    displayRateLow = Math.max(0.1, worstRate - auxiteSpread - riskBuffer);
    displayRateHigh = Math.max(0.1, bestRate - auxiteSpread - riskBuffer);
  } else if (config.displayAsRange) {
    // Single quote: create range with configured width
    const halfRange = (config.rangeWidthBps / 100) / 2;
    displayRateLow = Math.max(0.1, netRate - halfRange);
    displayRateHigh = Math.max(0.1, netRate + halfRange);
  } else {
    displayRateLow = Math.max(0.1, netRate);
    displayRateHigh = Math.max(0.1, netRate);
  }

  const displayRateMid = (displayRateLow + displayRateHigh) / 2;
  const internalBuffer = weightedAvg - displayRateHigh;

  const computed: ComputedYield = {
    metal,
    tenor,
    tenorDays: TENOR_DAYS[tenor] || 180,
    weightedAvgRate: weightedAvg,
    bestRate,
    worstRate,
    quoteCount: quotes.length,
    auxiteSpread,
    riskBuffer,
    displayRateLow: parseFloat(displayRateLow.toFixed(2)),
    displayRateHigh: parseFloat(displayRateHigh.toFixed(2)),
    displayRateMid: parseFloat(displayRateMid.toFixed(2)),
    internalBuffer: parseFloat(internalBuffer.toFixed(4)),
    computedAt: now,
    source: 'counterparty_blend',
    fallbackUsed: false,
  };

  // Cache computed yield
  await redis.set(KEYS.computed(metal, tenor), computed);

  return computed;
}

// ============================================
// COMPUTE ALL YIELDS (12 combinations: 4 metals x 3 tenors)
// ============================================
export async function computeAllYields(): Promise<YieldSnapshot> {
  const metals = ['AUXG', 'AUXS', 'AUXPT', 'AUXPD'];
  const tenors = ['3M', '6M', '12M'];

  const results: Record<string, Record<string, ComputedYield>> = {};

  for (const metal of metals) {
    results[metal] = {};
    for (const tenor of tenors) {
      results[metal][tenor] = await computeYieldForTenor(metal, tenor);
    }
  }

  const snapshot: YieldSnapshot = {
    metals: results,
    sofr: 0, // Will be populated by lease-rates route if needed
    computedAt: Date.now(),
    source: Object.values(results).some((m) =>
      Object.values(m).some((t) => !t.fallbackUsed)
    )
      ? 'counterparty_blend'
      : 'fallback',
  };

  // Cache full snapshot
  await redis.set(KEYS.computedAll, snapshot);

  return snapshot;
}

// ============================================
// READ CACHED YIELDS
// ============================================
export async function getComputedYield(metal: string, tenor: string): Promise<ComputedYield | null> {
  try {
    const raw = await redis.get(KEYS.computed(metal, tenor));
    if (raw && typeof raw === 'object') return raw as ComputedYield;
  } catch (e) {
    console.warn(`Failed to fetch computed yield for ${metal}/${tenor}`, e);
  }
  return null;
}

export async function getYieldSnapshot(): Promise<YieldSnapshot | null> {
  try {
    const raw = await redis.get(KEYS.computedAll);
    if (raw && typeof raw === 'object') return raw as YieldSnapshot;
  } catch (e) {
    console.warn('Failed to fetch yield snapshot', e);
  }
  return null;
}

// ============================================
// YIELD HISTORY
// ============================================
export async function recordYieldHistory(computed: ComputedYield): Promise<void> {
  try {
    const entry = {
      rate: computed.displayRateMid,
      low: computed.displayRateLow,
      high: computed.displayRateHigh,
      quoteCount: computed.quoteCount,
      timestamp: computed.computedAt,
    };
    await redis.lpush(KEYS.history(computed.metal), JSON.stringify(entry));
    await redis.ltrim(KEYS.history(computed.metal), 0, 364); // Keep 1 year of daily snapshots
  } catch (e) {
    console.warn('Failed to record yield history', e);
  }
}

// ============================================
// TRANSFORM TO LEGACY FORMAT (for backward compatibility with useLeaseRates)
// ============================================
export function transformSnapshotToLegacyFormat(snapshot: YieldSnapshot): Record<string, any> {
  const metalNameMap: Record<string, string> = {
    AUXG: 'gold',
    AUXS: 'silver',
    AUXPT: 'platinum',
    AUXPD: 'palladium',
  };

  const rates: Record<string, any> = {};

  for (const [metal, tenors] of Object.entries(snapshot.metals)) {
    const name = metalNameMap[metal] || metal.toLowerCase();
    rates[name] = {};

    for (const [tenor, yield_] of Object.entries(tenors)) {
      const y = yield_ as ComputedYield;
      rates[name][tenor.toLowerCase()] = y.displayRateMid;
      rates[name][`${tenor.toLowerCase()}_low`] = y.displayRateLow;
      rates[name][`${tenor.toLowerCase()}_high`] = y.displayRateHigh;
      rates[name][`${tenor.toLowerCase()}_range`] = !y.fallbackUsed;
    }
  }

  rates.lastUpdated = new Date(snapshot.computedAt).toISOString();
  rates.source = snapshot.source;

  return rates;
}
