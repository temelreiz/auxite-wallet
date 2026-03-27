// lib/live-prices.ts
// Shared live price fetcher for admin and other server-side calculations
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export interface LivePrices {
  auxm: number; usd: number; usdt: number; usdc: number;
  eth: number; btc: number; xrp: number; sol: number;
  auxg: number; auxs: number; auxpt: number; auxpd: number;
  [key: string]: number;
}

/**
 * Get live USD prices for all supported assets.
 * Falls back to reasonable defaults if APIs are unreachable.
 */
export async function getLivePrices(): Promise<LivePrices> {
  const prices: LivePrices = {
    auxm: 1, usd: 1, usdt: 1, usdc: 1,
    eth: 2000, btc: 87000, xrp: 2.3, sol: 200,
    auxg: 145, auxs: 2.26, auxpt: 60, auxpd: 45,
  };

  try {
    // Fetch crypto prices from Binance
    const symbols = ['ETHUSDT', 'BTCUSDT'];
    const binanceRes = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbols=${JSON.stringify(symbols)}`
    ).then(r => r.json()).catch(() => []);

    for (const item of binanceRes) {
      if (item.symbol === 'ETHUSDT') prices.eth = parseFloat(item.price);
      if (item.symbol === 'BTCUSDT') prices.btc = parseFloat(item.price);
    }

    // Fetch metal prices from cache (per gram)
    const TROY_OUNCE_TO_GRAMS = 31.1035;
    const metalPrices = await redis.get('metal:prices:cache');
    if (metalPrices) {
      const mp = typeof metalPrices === 'string' ? JSON.parse(metalPrices) : metalPrices;
      // Safety: if gold > 500, cache has ounce prices — convert to grams
      const isOunce = mp.gold > 500;
      const div = isOunce ? TROY_OUNCE_TO_GRAMS : 1;
      if (mp.gold) prices.auxg = mp.gold / div;
      if (mp.silver) prices.auxs = mp.silver / div;
      if (mp.platinum) prices.auxpt = mp.platinum / div;
      if (mp.palladium) prices.auxpd = mp.palladium / div;
    }
  } catch (e) {
    console.warn('Failed to fetch live prices, using defaults');
  }

  return prices;
}
