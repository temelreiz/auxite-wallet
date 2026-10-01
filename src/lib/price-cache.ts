// Price Cache - Cache metal prices to avoid API rate limits
import { Redis } from '@upstash/redis';
import { getMetalPricesInUsd } from './kuveytturk-service';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const CACHE_TTL = 60; // 60 saniye cache
const TROY_OUNCE_TO_GRAMS = 31.1035;

// ── KuveytTürk circuit breaker ──────────────────────────────────────────────
// KT has no internal timeout. When it's unresponsive, EVERY price call would
// wait out the deadline — and the card (Stripe PI) path calls it several times
// per request, stacking to ~16s+. So: race KT against a 4s deadline, and when
// it trips, mark KT "down" in Redis for 120s so subsequent calls skip it
// entirely and go straight to GoldAPI/spot (fast). Restores automatically.
const KT_DOWN_KEY = 'metal:kt:down';
async function fetchKtBounded(): Promise<Awaited<ReturnType<typeof getMetalPricesInUsd>>> {
  if (await redis.get(KT_DOWN_KEY).catch(() => null)) {
    throw new Error('KT circuit open — skipping');
  }
  try {
    return await Promise.race([
      getMetalPricesInUsd(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('KT timeout (4s)')), 4000)),
    ]);
  } catch (e) {
    redis.set(KT_DOWN_KEY, '1', { ex: 120 }).catch(() => {});
    throw e;
  }
}

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
    const kt = await fetchKtBounded();
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

// ════════════════════════════════════════════════════════════════════════════
// SPOT PRICE — single-source market spot for VALUATION / NAV (AUXR navUSD).
// ----------------------------------------------------------------------------
// The NAV feed an exchange follows must be ONE consistent source. `getMetalPrices`
// mixes KuveytTürk bank BUY-rate (primary) with GoldAPI spot (fallback via the
// circuit breaker): the two sets differ ~1-2.5% and the feed flip-flops between
// them every time KT hiccups, producing erratic candle wicks. KT's rate is also a
// Turkish-bank procurement price (with dealer spread) — not a global spot — and
// can freeze (palladium stuck at 48.73 $/g since 2026-09-28 while spot was ~38).
//
// So valuation/NAV uses GoldAPI international spot ONLY, here. KT buy/sell rates
// stay reserved for the trade-CHARGE path (`getMetalUsdPrice`), their real job.
// On a fetch failure we serve the LAST-GOOD spot with its ORIGINAL timestamp
// (never a different source, never a re-stamped stale value), so there is no
// cross-source jump and genuine staleness remains detectable downstream.
// ════════════════════════════════════════════════════════════════════════════
const SPOT_CACHE_KEY = 'metal:spot:cache';
const SPOT_STALE_KEY = 'metal:spot:stale';
const SPOT_CACHE_TTL = 60;

const sanePerGram = (d: any): boolean =>
  !!d && [d.gold, d.silver, d.platinum, d.palladium].every((v) => typeof v === 'number' && v > 0 && v < 500);

async function fetchGoldSpotStrict(): Promise<CachedPrices> {
  const apiKey = process.env.GOLDAPI_KEY;
  if (!apiKey) throw new Error('GOLDAPI_KEY not set');
  const map: Record<string, string> = { XAU: 'gold', XAG: 'silver', XPT: 'platinum', XPD: 'palladium' };
  const out: any = { timestamp: Date.now() };
  for (const sym of Object.keys(map)) {
    const res = await fetch(`https://www.goldapi.io/api/${sym}/USD`, {
      headers: { 'x-access-token': apiKey },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error(`GoldAPI ${sym} ${res.status}`);
    const data = await res.json();
    const perGram = Number(data?.price) / TROY_OUNCE_TO_GRAMS;
    if (!(perGram > 0)) throw new Error(`GoldAPI ${sym} bad price`);
    out[map[sym]] = perGram;
  }
  if (!sanePerGram(out)) throw new Error('GoldAPI spot failed sanity check');
  return out as CachedPrices;
}

/**
 * Market spot ($/gram) for valuation/NAV. Single consistent source (GoldAPI),
 * 60s cache, last-good stale fallback with original timestamp preserved.
 */
export async function getMetalSpotPrices(): Promise<CachedPrices> {
  const cached = await redis.get(SPOT_CACHE_KEY).catch(() => null);
  if (cached) {
    const d = typeof cached === 'string' ? JSON.parse(cached) : cached;
    if (sanePerGram(d)) return d;
  }
  try {
    const fresh = await fetchGoldSpotStrict();
    await redis.setex(SPOT_CACHE_KEY, SPOT_CACHE_TTL, JSON.stringify(fresh)).catch(() => {});
    await redis.set(SPOT_STALE_KEY, JSON.stringify(fresh)).catch(() => {});
    return fresh;
  } catch (e) {
    console.warn('[spot] GoldAPI unavailable, serving last-good spot:', e);
  }
  const stale = await redis.get(SPOT_STALE_KEY).catch(() => null);
  if (stale) {
    const d = typeof stale === 'string' ? JSON.parse(stale) : stale;
    if (sanePerGram(d)) return d; // keep ORIGINAL timestamp — do not re-stamp
  }
  // Last resort: hardcoded, with timestamp 0 so staleness is unmistakable.
  console.warn('⚠️ [spot] no cache/stale available, using hardcoded spot (stale ts=0)');
  return { gold: 145.0, silver: 2.26, platinum: 60.0, palladium: 45.0, timestamp: 0 };
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
      const kt = await fetchKtBounded(); // 15s-cached inside KT + 4s deadline + circuit breaker
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
