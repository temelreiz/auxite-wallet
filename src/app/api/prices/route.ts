import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const DEFAULT_SETTINGS = {
  AUXG: { askAdjust: 2, bidAdjust: -1 },
  AUXS: { askAdjust: 3, bidAdjust: -1.5 },
  AUXPT: { askAdjust: 2.5, bidAdjust: -1.25 },
  AUXPD: { askAdjust: 2.5, bidAdjust: -1.25 },
};

const FALLBACK_PRICES = {
  AUXG: { price: 4167, symbol: "AUXG" },
  AUXS: { price: 54, symbol: "AUXS" },
  AUXPT: { price: 1643, symbol: "AUXPT" },
  AUXPD: { price: 1426, symbol: "AUXPD" },
};

const SETTINGS_KEY = "auxite:price-settings";
const PRICES_24H_KEY = "auxite:prices-24h";

// Caches
let settingsCache: any = null;
let settingsCacheTime = 0;
let cachedResult: any = null;
let cacheTime = 0;

const SETTINGS_CACHE_DURATION = 30000;
const CACHE_DURATION = 3000;

async function getRedis() {
  try {
    const { Redis } = await import("@upstash/redis");
    return new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  } catch {
    return null;
  }
}

async function getSettings() {
  const now = Date.now();
  if (settingsCache && (now - settingsCacheTime) < SETTINGS_CACHE_DURATION) {
    return settingsCache;
  }
  
  try {
    const redis = await getRedis();
    if (redis) {
      const settings = await redis.get(SETTINGS_KEY);
      if (settings && typeof settings === "object") {
        settingsCache = { ...DEFAULT_SETTINGS, ...(settings as any) };
        settingsCacheTime = now;
        return settingsCache;
      }
    }
  } catch {}
  
  return DEFAULT_SETTINGS;
}

async function get24hPrices() {
  try {
    const redis = await getRedis();
    if (redis) {
      const prices = await redis.get(PRICES_24H_KEY);
      if (prices) return prices as Record<string, number>;
    }
  } catch {}
  return null;
}

async function save24hPrices(prices: Record<string, number>) {
  try {
    const redis = await getRedis();
    if (redis) {
      // 24 saat sonra expire
      await redis.set(PRICES_24H_KEY, prices, { ex: 86400 });
    }
  } catch {}
}

export async function GET() {
  const now = Date.now();
  
  if (cachedResult && (now - cacheTime) < CACHE_DURATION) {
    return NextResponse.json({ ...cachedResult, cached: true });
  }

  let data: any[] = [];
  let source = "fallback";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const res = await fetch("https://api.auxite.io/api/prices?chain=84532", {
      cache: "no-store",
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      if (json.ok && json.data && json.data.length > 0) {
        data = json.data;
        source = "auxite";
      }
    }
  } catch {}

  if (data.length === 0) {
    data = Object.values(FALLBACK_PRICES);
    source = "fallback";
    
    if (cachedResult) {
      return NextResponse.json({ ...cachedResult, cached: true, stale: true });
    }
  }

  const settings = await getSettings();
  const prices24h = await get24hPrices();

  const prices: Record<string, number> = {};
  const bidPrices: Record<string, number> = {};
  const basePrices: Record<string, number> = {};
  const directions: Record<string, string> = {};
  const changes: Record<string, number> = {};
  const currentBasePrices: Record<string, number> = {};

  for (const item of data) {
    const symbol = item.symbol;
    const basePricePerGram = item.price / 31.1035;
    
    const metalSettings = settings[symbol as keyof typeof settings] || { askAdjust: 2, bidAdjust: -1 };
    
    const askPrice = basePricePerGram * (1 + metalSettings.askAdjust / 100);
    const bidPrice = basePricePerGram * (1 + metalSettings.bidAdjust / 100);
    
    basePrices[symbol] = Math.round(basePricePerGram * 100) / 100;
    prices[symbol] = Math.round(askPrice * 100) / 100;
    bidPrices[symbol] = Math.round(bidPrice * 100) / 100;
    currentBasePrices[symbol] = basePricePerGram;
    
    // 24h değişim hesapla
    if (prices24h && prices24h[symbol]) {
      const oldPrice = prices24h[symbol];
      const change = ((basePricePerGram - oldPrice) / oldPrice) * 100;
      changes[symbol] = Math.round(change * 100) / 100;
      directions[symbol] = change > 0.01 ? "up" : change < -0.01 ? "down" : "neutral";
    } else {
      changes[symbol] = 0;
      directions[symbol] = "neutral";
    }
  }

  // İlk kez çalışıyorsa 24h fiyatları kaydet
  if (!prices24h && Object.keys(currentBasePrices).length > 0) {
    await save24hPrices(currentBasePrices);
  }

  const result = {
    prices,
    bidPrices,
    basePrices,
    directions,
    changes,
    timestamp: now,
    source,
    settings,
  };

  cachedResult = result;
  cacheTime = now;

  return NextResponse.json(result);
}
