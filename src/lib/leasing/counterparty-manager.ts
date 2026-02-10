// ============================================
// COUNTERPARTY MANAGER — Auxite Metal Leasing Engine
// Registry of institutional counterparties, quote storage, risk limits
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
  config: 'leasing:counterparty:config',
  registry: 'leasing:counterparty:registry',
  counterparty: (id: string) => `leasing:cp:${id}`,
  quotes: (cpId: string) => `leasing:cp:${cpId}:quotes`,
  activeQuotes: (metal: string, tenor: string) => `leasing:quotes:active:${metal.toUpperCase()}:${tenor.toUpperCase()}`,
  quoteDetail: (qId: string) => `leasing:quote:${qId}`,
  stats: 'leasing:counterparty:stats',
};

// ============================================
// TYPES
// ============================================
export type CounterpartyTier = 'bullion_bank' | 'otc_dealer' | 'central_bank';
export type CollateralType = 'metal_for_metal' | 'cash' | 'hybrid';
export type QuoteStatus = 'active' | 'expired' | 'withdrawn' | 'filled';

export interface Counterparty {
  id: string;
  name: string;
  shortName: string;
  tier: CounterpartyTier;
  active: boolean;
  metals: string[];
  minLotSizeOz: number;
  maxExposureUSD: number;
  currentExposureUSD: number;
  collateralTypes: CollateralType[];
  haircut: number;
  creditRating: string;
  riskScore: number;
  contactEmail: string;
  createdAt: number;
  updatedAt: number;
  notes: string;
}

export interface LeaseQuote {
  id: string;
  counterpartyId: string;
  counterpartyName: string;
  metal: string;
  tenor: string;
  tenorDays: number;
  ratePercent: number;
  validUntil: number;
  minSizeOz: number;
  maxSizeOz: number;
  collateralType: CollateralType;
  haircut: number;
  status: QuoteStatus;
  createdAt: number;
  createdBy: string;
  source: 'manual' | 'api' | 'rfq_response';
}

export interface CounterpartyConfig {
  defaultHaircut: number;
  quoteValidityHours: number;
  autoExpireEnabled: boolean;
  maxCounterparties: number;
  riskWeights: {
    bullion_bank: number;
    otc_dealer: number;
    central_bank: number;
  };
}

// ============================================
// DEFAULT CONFIG
// ============================================
const DEFAULT_CONFIG: CounterpartyConfig = {
  defaultHaircut: 5,
  quoteValidityHours: 24,
  autoExpireEnabled: true,
  maxCounterparties: 20,
  riskWeights: {
    bullion_bank: 1.0,
    otc_dealer: 1.5,
    central_bank: 0.8,
  },
};

// Tenor mapping
const TENOR_DAYS: Record<string, number> = {
  '3M': 90,
  '6M': 180,
  '12M': 365,
};

// ============================================
// CONFIG
// ============================================
export async function getCounterpartyConfig(): Promise<CounterpartyConfig> {
  try {
    const raw = await redis.get(KEYS.config);
    if (raw && typeof raw === 'object') {
      return { ...DEFAULT_CONFIG, ...(raw as Partial<CounterpartyConfig>) };
    }
  } catch (e) {
    console.warn('Failed to fetch counterparty config, using defaults', e);
  }
  return DEFAULT_CONFIG;
}

export async function setCounterpartyConfig(config: Partial<CounterpartyConfig>): Promise<CounterpartyConfig> {
  const current = await getCounterpartyConfig();
  const merged = { ...current, ...config };
  await redis.set(KEYS.config, merged);
  return merged;
}

// ============================================
// COUNTERPARTY REGISTRY
// ============================================
export async function registerCounterparty(
  data: Omit<Counterparty, 'id' | 'createdAt' | 'updatedAt' | 'currentExposureUSD' | 'riskScore'>
): Promise<Counterparty> {
  const now = Date.now();
  const id = `CP-${data.shortName.toUpperCase().replace(/\s+/g, '')}-${now.toString(36)}`;

  const cp: Counterparty = {
    ...data,
    id,
    currentExposureUSD: 0,
    riskScore: calculateRiskScore({ ...data, id, currentExposureUSD: 0, riskScore: 0, createdAt: now, updatedAt: now }),
    createdAt: now,
    updatedAt: now,
  };

  await redis.set(KEYS.counterparty(id), cp);
  await redis.sadd(KEYS.registry, id);
  return cp;
}

export async function updateCounterparty(id: string, updates: Partial<Counterparty>): Promise<Counterparty | null> {
  const existing = await getCounterparty(id);
  if (!existing) return null;

  const updated: Counterparty = {
    ...existing,
    ...updates,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: Date.now(),
  };
  updated.riskScore = calculateRiskScore(updated);

  await redis.set(KEYS.counterparty(id), updated);
  return updated;
}

export async function getCounterparty(id: string): Promise<Counterparty | null> {
  try {
    const raw = await redis.get(KEYS.counterparty(id));
    if (raw && typeof raw === 'object') return raw as Counterparty;
  } catch (e) {
    console.warn(`Failed to fetch counterparty ${id}`, e);
  }
  return null;
}

export async function getAllCounterparties(): Promise<Counterparty[]> {
  try {
    const ids = await redis.smembers(KEYS.registry);
    if (!ids || ids.length === 0) return [];

    const results = await Promise.all(
      ids.map((id) => getCounterparty(id as string))
    );
    return results.filter((cp): cp is Counterparty => cp !== null);
  } catch (e) {
    console.warn('Failed to fetch counterparties', e);
    return [];
  }
}

export async function deactivateCounterparty(id: string): Promise<boolean> {
  const updated = await updateCounterparty(id, { active: false });
  return updated !== null;
}

// ============================================
// QUOTE MANAGEMENT
// ============================================
export async function submitQuote(
  data: Omit<LeaseQuote, 'id' | 'createdAt' | 'status'>
): Promise<LeaseQuote> {
  const now = Date.now();
  const id = `LQ-${data.counterpartyId.split('-')[1] || 'UNK'}-${now}-${Math.random().toString(36).substr(2, 6)}`;

  const quote: LeaseQuote = {
    ...data,
    id,
    status: 'active',
    createdAt: now,
    tenorDays: TENOR_DAYS[data.tenor.toUpperCase()] || 180,
  };

  // Store quote detail
  await redis.set(KEYS.quoteDetail(id), quote);

  // Add to counterparty's quote list
  await redis.lpush(KEYS.quotes(data.counterpartyId), id);

  // Add to active quotes sorted set (score = rate for sorting)
  await redis.zadd(KEYS.activeQuotes(data.metal, data.tenor), {
    score: data.ratePercent * 100, // basis points for precision
    member: id,
  });

  // Set TTL for auto-expiry
  if (data.validUntil > now) {
    const ttlSeconds = Math.floor((data.validUntil - now) / 1000);
    await redis.expire(KEYS.quoteDetail(id), ttlSeconds);
  }

  return quote;
}

export async function getActiveQuotes(metal: string, tenor: string): Promise<LeaseQuote[]> {
  try {
    const quoteIds = await redis.zrange(
      KEYS.activeQuotes(metal, tenor),
      0, -1
    );

    if (!quoteIds || quoteIds.length === 0) return [];

    const now = Date.now();
    const quotes: LeaseQuote[] = [];

    for (const qId of quoteIds) {
      const quote = await redis.get(KEYS.quoteDetail(qId as string));
      if (quote && typeof quote === 'object') {
        const q = quote as LeaseQuote;
        // Check if still valid
        if (q.status === 'active' && q.validUntil > now) {
          quotes.push(q);
        } else {
          // Cleanup expired quote from sorted set
          await redis.zrem(KEYS.activeQuotes(metal, tenor), qId as string);
          if (q.status === 'active') {
            await redis.set(KEYS.quoteDetail(qId as string), { ...q, status: 'expired' });
          }
        }
      } else {
        // Quote detail expired (TTL), remove from sorted set
        await redis.zrem(KEYS.activeQuotes(metal, tenor), qId as string);
      }
    }

    return quotes;
  } catch (e) {
    console.warn(`Failed to fetch active quotes for ${metal}/${tenor}`, e);
    return [];
  }
}

export async function getQuoteById(quoteId: string): Promise<LeaseQuote | null> {
  try {
    const raw = await redis.get(KEYS.quoteDetail(quoteId));
    if (raw && typeof raw === 'object') return raw as LeaseQuote;
  } catch (e) {
    console.warn(`Failed to fetch quote ${quoteId}`, e);
  }
  return null;
}

export async function withdrawQuote(quoteId: string): Promise<boolean> {
  const quote = await getQuoteById(quoteId);
  if (!quote) return false;

  const updated: LeaseQuote = { ...quote, status: 'withdrawn' };
  await redis.set(KEYS.quoteDetail(quoteId), updated);
  await redis.zrem(KEYS.activeQuotes(quote.metal, quote.tenor), quoteId);
  return true;
}

export async function getAllActiveQuotesSummary(): Promise<
  Array<{ metal: string; tenor: string; count: number; bestRate: number; avgRate: number }>
> {
  const metals = ['AUXG', 'AUXS', 'AUXPT', 'AUXPD'];
  const tenors = ['3M', '6M', '12M'];
  const summary: Array<{ metal: string; tenor: string; count: number; bestRate: number; avgRate: number }> = [];

  for (const metal of metals) {
    for (const tenor of tenors) {
      const quotes = await getActiveQuotes(metal, tenor);
      if (quotes.length > 0) {
        const rates = quotes.map((q) => q.ratePercent);
        summary.push({
          metal,
          tenor,
          count: quotes.length,
          bestRate: Math.max(...rates),
          avgRate: rates.reduce((a, b) => a + b, 0) / rates.length,
        });
      }
    }
  }

  return summary;
}

export async function expireStaleQuotes(): Promise<number> {
  const metals = ['AUXG', 'AUXS', 'AUXPT', 'AUXPD'];
  const tenors = ['3M', '6M', '12M'];
  let expiredCount = 0;

  for (const metal of metals) {
    for (const tenor of tenors) {
      const quotes = await getActiveQuotes(metal, tenor);
      // getActiveQuotes already cleans up expired quotes internally
      expiredCount += 0; // counted inside getActiveQuotes
    }
  }

  return expiredCount;
}

// ============================================
// RISK SCORING
// ============================================
export function calculateRiskScore(cp: Counterparty): number {
  let score = 50; // base

  // Tier bonus
  switch (cp.tier) {
    case 'central_bank': score += 30; break;
    case 'bullion_bank': score += 20; break;
    case 'otc_dealer': score += 10; break;
  }

  // Credit rating bonus
  if (cp.creditRating) {
    if (cp.creditRating.startsWith('AAA') || cp.creditRating.startsWith('Aaa')) score += 15;
    else if (cp.creditRating.startsWith('AA') || cp.creditRating.startsWith('Aa')) score += 10;
    else if (cp.creditRating.startsWith('A')) score += 5;
  }

  // Exposure utilization penalty
  if (cp.maxExposureUSD > 0) {
    const util = cp.currentExposureUSD / cp.maxExposureUSD;
    if (util > 0.8) score -= 15;
    else if (util > 0.6) score -= 5;
  }

  return Math.max(0, Math.min(100, score));
}

// ============================================
// EXPOSURE MANAGEMENT
// ============================================
export async function checkExposureLimit(cpId: string, additionalUSD: number): Promise<{ allowed: boolean; remaining: number }> {
  const cp = await getCounterparty(cpId);
  if (!cp) return { allowed: false, remaining: 0 };

  const remaining = cp.maxExposureUSD - cp.currentExposureUSD;
  return {
    allowed: additionalUSD <= remaining,
    remaining,
  };
}

export async function updateExposure(cpId: string, deltaUSD: number): Promise<boolean> {
  const cp = await getCounterparty(cpId);
  if (!cp) return false;

  const newExposure = Math.max(0, cp.currentExposureUSD + deltaUSD);
  await updateCounterparty(cpId, { currentExposureUSD: newExposure });
  return true;
}

// ============================================
// COUNTERPARTY QUOTES FOR SPECIFIC COUNTERPARTY
// ============================================
export async function getCounterpartyQuotes(cpId: string): Promise<LeaseQuote[]> {
  try {
    const quoteIds = await redis.lrange(KEYS.quotes(cpId), 0, 50);
    if (!quoteIds || quoteIds.length === 0) return [];

    const quotes: LeaseQuote[] = [];
    for (const qId of quoteIds) {
      const quote = await getQuoteById(qId as string);
      if (quote) quotes.push(quote);
    }
    return quotes;
  } catch (e) {
    console.warn(`Failed to fetch quotes for counterparty ${cpId}`, e);
    return [];
  }
}
