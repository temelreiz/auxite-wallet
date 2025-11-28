import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const DEFAULT_SETTINGS = {
  AUXG: { askAdjust: 2, bidAdjust: -1 },
  AUXS: { askAdjust: 3, bidAdjust: -1.5 },
  AUXPT: { askAdjust: 2.5, bidAdjust: -1.25 },
  AUXPD: { askAdjust: 2.5, bidAdjust: -1.25 },
  ETH: { askAdjust: 1, bidAdjust: -0.5 },
  BTC: { askAdjust: 1, bidAdjust: -0.5 },
};

const FALLBACK_PRICES = {
  AUXG: { price: 4167, symbol: "AUXG" },
  AUXS: { price: 54, symbol: "AUXS" },
  AUXPT: { price: 1643, symbol: "AUXPT" },
  AUXPD: { price: 1426, symbol: "AUXPD" },
};

const SETTINGS_KEY = "auxite:price-settings";

// Memory cache
let cachedResult: any = null;
let cacheTime = 0;
const CACHE_DURATION = 5000;

// Redis'ten settings al
async function getSettings() {
  try {
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    const settings = await redis.get(SETTINGS_KEY);
    if (settings && typeof settings === "object") {
      return { ...DEFAULT_SETTINGS, ...settings };
    }
  } catch (e) {
    console.error("Redis settings error:", e);
  }
  return DEFAULT_SETTINGS;
}

export async function GET() {
  const now = Date.now();
  
  // Cache geçerliyse döndür
  if (cachedResult && (now - cacheTime) < CACHE_DURATION) {
    return NextResponse.json({ ...cachedResult, cached: true });
  }

  let data: any[] = [];
  let source = "fallback";

  // Auxite API'yi dene
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
  } catch (e) {}

  // API başarısızsa fallback
  if (data.length === 0) {
    data = Object.values(FALLBACK_PRICES);
    source = "fallback";
    
    if (cachedResult) {
      return NextResponse.json({ ...cachedResult, cached: true, stale: true });
    }
  }

  // Redis'ten settings al
  const settings = await getSettings();

  // Fiyatları hesapla
  const prices: Record<string, number> = {};
  const bidPrices: Record<string, number> = {};
  const basePrices: Record<string, number> = {};
  const directions: Record<string, string> = {};
  const changes: Record<string, number> = {};

  for (const item of data) {
    const symbol = item.symbol;
    const basePricePerGram = item.price / 31.1035;
    
    const metalSettings = settings[symbol as keyof typeof settings] || { askAdjust: 2, bidAdjust: -1 };
    
    const askPrice = basePricePerGram * (1 + metalSettings.askAdjust / 100);
    const bidPrice = basePricePerGram * (1 + metalSettings.bidAdjust / 100);
    
    basePrices[symbol] = Math.round(basePricePerGram * 100) / 100;
    prices[symbol] = Math.round(askPrice * 100) / 100;
    bidPrices[symbol] = Math.round(bidPrice * 100) / 100;
    changes[symbol] = 0;
    directions[symbol] = "neutral";
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
