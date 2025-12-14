// Price Cache - Cache metal prices to avoid API rate limits
import { Redis } from '@upstash/redis';

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
    console.log(`📦 Using cached prices (${((Date.now() - data.timestamp) / 1000).toFixed(0)}s old)`);
    return data;
  }

  // Fetch fresh prices
  console.log('🌐 Fetching fresh prices from GoldAPI...');
  const prices = await fetchFromGoldAPI();
  
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
        headers: { 'x-access-token': apiKey }
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
    console.log('📦 Using stale fallback prices');
    return { ...data, timestamp: Date.now() };
  }

  // Last resort - hardcoded
  console.warn('⚠️ Using hardcoded fallback prices');
  return {
    gold: 135.80,
    silver: 1.88,
    platinum: 53.25,
    palladium: 47.29,
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
