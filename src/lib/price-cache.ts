// Price Cache - Cache metal prices to avoid API rate limits
import { Redis } from '@upstash/redis';
import { getMetalPricesInUsd } from './kuveytturk-service';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const CACHE_TTL = 60; // 60 saniye cache
const TROY_OUNCE_TO_GRAMS = 31.1035;

interface CachedPrices {
  gold: number;
  silver: number;
  platinum: number;
  palladium: number;
  timestamp: number;
}

export async function getMetalPrices(): Promise<CachedPrices> {
  // Check cache first
  const cached = await redis.get('metal:prices:cache');
  
  if (cached) {
    const data = typeof cached === 'string' ? JSON.parse(cached) : cached;
    // Safety: reject cache if it has ounce prices (gold > 500 $/g is impossible)
    if (data.gold > 500) {
      console.warn('🚨 Cache has ounce prices, discarding');
      await redis.del('metal:prices:cache');
    } else {
      console.log(`📦 Using cached prices (${((Date.now() - data.timestamp) / 1000).toFixed(0)}s old)`);
      return data;
    }
  }

  // Fetch fresh prices — KuveytTürk first (the venue we actually trade on),
  // GoldAPI international spot as fallback. Headline/display price uses the KT
  // buy rate ($/gram), so what users see matches what we sell at.
  let prices: CachedPrices | null = null;
  try {
    // Bound the KuveytTürk call — it has no internal timeout, so when KT is
    // unresponsive this await would hang forever (the try/catch only catches
    // errors, not hangs), stalling every caller (e.g. Stripe PI creation) past
    // the 30s client timeout. Race it against a 4s deadline so a hung KT falls
    // through to GoldAPI / stale cache instead of blocking.
    const kt = await Promise.race([
      getMetalPricesInUsd(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('KT timeout (4s)')), 4000)),
    ]);
    if (kt.AUXG?.buyRateUSD && kt.AUXS?.buyRateUSD && kt.AUXPT?.buyRateUSD && kt.AUXPD?.buyRateUSD) {
      prices = {
        gold: kt.AUXG.buyRateUSD,
        silver: kt.AUXS.buyRateUSD,
        platinum: kt.AUXPT.buyRateUSD,
        palladium: kt.AUXPD.buyRateUSD,
        timestamp: Date.now(),
      };
      console.log('📊 Price source: KuveytTürk (buy $/g)');
    }
  } catch (e) {
    console.warn('⚠️ KT prices unavailable, falling back to GoldAPI:', e);
  }
  if (!prices) {
    console.log('🌐 Fetching fresh prices from GoldAPI...');
    prices = await fetchFromGoldAPI();
  }

  // Safety: never cache ounce prices (gold > $500/g is impossible)
  if (prices.gold > 500) {
    console.error('🚨 Refusing to cache ounce prices! gold =', prices.gold);
    return getFallbackPrices();
  }

  // Cache it
  await redis.setex('metal:prices:cache', CACHE_TTL, JSON.stringify(prices));

  // Also save as stale backup
  await redis.set('metal:prices:stale', JSON.stringify(prices));
  
  return prices;
}

async function fetchFromGoldAPI(): Promise<CachedPrices> {
  const apiKey = process.env.GOLDAPI_KEY;
  
  if (!apiKey) {
    console.warn('⚠️ GOLDAPI_KEY not set, using fallback');
    return getFallbackPrices();
  }

  try {
    const metals = ['XAU', 'XAG', 'XPT', 'XPD'];
    const prices: any = {};

    for (const metal of metals) {
      const res = await fetch(`https://www.goldapi.io/api/${metal}/USD`, {
        headers: { 'x-access-token': apiKey },
        // Never hang the request path; fall through to stale cache on timeout.
        signal: AbortSignal.timeout(6000),
      });
      
      if (res.status === 429) {
        console.warn('⚠️ GoldAPI rate limited, using fallback');
        return getFallbackPrices();
      }
      
      if (!res.ok) {
        throw new Error(`GoldAPI error: ${res.status}`);
      }
      
      const data = await res.json();
      prices[metal] = data.price;
    }

    return {
      gold: prices.XAU / TROY_OUNCE_TO_GRAMS,
      silver: prices.XAG / TROY_OUNCE_TO_GRAMS,
      platinum: prices.XPT / TROY_OUNCE_TO_GRAMS,
      palladium: prices.XPD / TROY_OUNCE_TO_GRAMS,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('GoldAPI fetch error:', error);
    return getFallbackPrices();
  }
}

async function getFallbackPrices(): Promise<CachedPrices> {
  // Try stale cache
  const stale = await redis.get('metal:prices:stale');
  if (stale) {
    const data = typeof stale === 'string' ? JSON.parse(stale) : stale;

    // Safety: if stale data has ounce prices (gold > 500), convert to grams
    if (data.gold > 500) {
      console.warn('🚨 Stale cache has ounce prices, converting to grams');
      data.gold = data.gold / TROY_OUNCE_TO_GRAMS;
      data.silver = data.silver / TROY_OUNCE_TO_GRAMS;
      data.platinum = data.platinum / TROY_OUNCE_TO_GRAMS;
      data.palladium = data.palladium / TROY_OUNCE_TO_GRAMS;
      // Fix the stale cache so this doesn't happen again
      await redis.set('metal:prices:stale', JSON.stringify({ ...data, timestamp: Date.now() }));
    }

    console.log('📦 Using stale fallback prices');
    return { ...data, timestamp: Date.now() };
  }

  // Last resort - hardcoded (per gram)
  console.warn('⚠️ Using hardcoded fallback prices');
  return {
    gold: 145.00,
    silver: 2.26,
    platinum: 60.00,
    palladium: 45.00,
    timestamp: Date.now(),
  };
}

export async function getMetalPrice(metal: string): Promise<number> {
  const prices = await getMetalPrices();

  switch (metal.toUpperCase()) {
    case 'AUXG': case 'GOLD': return prices.gold;
    case 'AUXS': case 'SILVER': return prices.silver;
    case 'AUXPT': case 'PLATINUM': return prices.platinum;
    case 'AUXPD': case 'PALLADIUM': return prices.palladium;
    default: throw new Error(`Unknown metal: ${metal}`);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// COST-BASIS PRICE — KuveytTürk (the venue we actually trade on), $/gram.
// Used for the BUY/SELL *charge* so the quote reflects real procurement cost:
//   buy  → KT buyRate-USD  (bank ask = what we pay to procure)
//   sell → KT sellRate-USD (bank bid = what we get when we sell back)
// Falls back to GoldAPI international spot (getMetalPrice) if KT is unavailable.
// NOTE: valuation/display consumers still use getMetalPrices (spot) — this is
// only for the trade charge path.
// ════════════════════════════════════════════════════════════════════════════
function toAuxSymbol(metal: string): 'AUXG' | 'AUXS' | 'AUXPT' | 'AUXPD' | null {
  switch (metal.toUpperCase()) {
    case 'AUXG': case 'GOLD': return 'AUXG';
    case 'AUXS': case 'SILVER': return 'AUXS';
    case 'AUXPT': case 'PLATINUM': return 'AUXPT';
    case 'AUXPD': case 'PALLADIUM': return 'AUXPD';
    default: return null;
  }
}

export async function getMetalUsdPrice(metal: string, type: 'buy' | 'sell'): Promise<number> {
  const symbol = toAuxSymbol(metal);
  if (symbol) {
    try {
      // Bound KT — no internal timeout, so a hung KT would stall the whole
      // request path (this is the price call on the Stripe PI creation path).
      // Race a 4s deadline so a hang falls through to GoldAPI spot instead.
      const kt = await Promise.race([
        getMetalPricesInUsd(), // 15s-cached inside kuveytturk-service
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('KT timeout (4s)')), 4000)),
      ]);
      const r = kt[symbol];
      const p = r ? (type === 'buy' ? r.buyRateUSD : r.sellRateUSD) : 0;
      if (p && p > 0) return p;
    } catch (e) {
      console.warn(`⚠️ KT price unavailable for ${metal} (${type}), falling back to spot:`, e);
    }
  }
  // Fallback: GoldAPI international spot (single mid price, no bid/ask split)
  return getMetalPrice(metal);
}
