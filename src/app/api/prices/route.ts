import { NextResponse } from "next/server";

const AUXITE_API = "https://api.auxite.io/api/prices?chain=84532";
const GOLDAPI_URL = "https://www.goldapi.io/api";
const GOLDAPI_KEY = process.env.GOLDAPI_KEY || process.env.NEXT_PUBLIC_GOLDAPI_KEY || "";

const TROY_OZ_TO_GRAM = 31.1035;
const SETTINGS_KEY = "auxite:price-settings";

const DEFAULT_SETTINGS: Record<string, { askAdjust: number; bidAdjust: number }> = {
  AUXG: { askAdjust: 2, bidAdjust: -1 },
  AUXS: { askAdjust: 3, bidAdjust: -1.5 },
  AUXPT: { askAdjust: 2.5, bidAdjust: -1.25 },
  AUXPD: { askAdjust: 2.5, bidAdjust: -1.25 },
};

let cachedData: any = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 3000;

let goldApiCache: Record<string, number> = {};
let goldApiLastFetch: number = 0;
const GOLDAPI_CACHE_DURATION = 300000;

const FALLBACK = {
  AUXG: { oz: 2650, gram: 85.22 },
  AUXS: { oz: 30, gram: 0.97 },
  AUXPT: { oz: 980, gram: 31.52 },
  AUXPD: { oz: 1050, gram: 33.76 },
};

const GOLDAPI_SYMBOLS: Record<string, string> = {
  AUXG: "XAU",
  AUXS: "XAG", 
  AUXPT: "XPT",
  AUXPD: "XPD",
};

// Redis'ten spread ayarlarını al
async function getSpreadSettings(): Promise<Record<string, { askAdjust: number; bidAdjust: number }>> {
  try {
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    
    const settings = await redis.get(SETTINGS_KEY);
    if (settings && typeof settings === "object") {
      return { ...DEFAULT_SETTINGS, ...(settings as any) };
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error("Redis error:", error);
    return DEFAULT_SETTINGS;
  }
}

async function fetchAllGoldApiChanges(): Promise<Record<string, number>> {
  if (Object.keys(goldApiCache).length > 0 && Date.now() - goldApiLastFetch < GOLDAPI_CACHE_DURATION) {
    return goldApiCache;
  }

  if (!GOLDAPI_KEY) return { AUXG: 0, AUXS: 0, AUXPT: 0, AUXPD: 0 };

  const changes: Record<string, number> = {};
  
  for (const [symbol, goldSymbol] of Object.entries(GOLDAPI_SYMBOLS)) {
    try {
      const response = await fetch(`${GOLDAPI_URL}/${goldSymbol}/USD`, {
        headers: {
          "x-access-token": GOLDAPI_KEY,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        let changePercent = 0;
        if (data.chg_percent !== null && data.chg_percent !== undefined) {
          changePercent = data.chg_percent;
        } else if (data.ch && data.prev_close_price) {
          changePercent = (data.ch / data.prev_close_price) * 100;
        }
        
        changes[symbol] = Math.round(changePercent * 100) / 100;
      } else {
        changes[symbol] = goldApiCache[symbol] || 0;
      }
      
      await new Promise(resolve => setTimeout(resolve, 250));
    } catch (error) {
      changes[symbol] = goldApiCache[symbol] || 0;
    }
  }

  goldApiCache = changes;
  goldApiLastFetch = Date.now();
  
  return changes;
}

export async function GET() {
  const now = Date.now();

  if (cachedData && now - lastFetchTime < CACHE_DURATION) {
    return NextResponse.json(cachedData);
  }

  try {
    // Paralel olarak tüm verileri çek
    const [auxiteResponse, goldApiChanges, spreadSettings] = await Promise.all([
      fetch(AUXITE_API, { cache: "no-store" }),
      fetchAllGoldApiChanges(),
      getSpreadSettings(),
    ]);

    if (!auxiteResponse.ok) throw new Error("Auxite API error");

    const data = await auxiteResponse.json();
    const basePrices: Record<string, number> = {};
    const prices: Record<string, number> = {}; // Ask prices (spread uygulanmış)
    const bidPrices: Record<string, number> = {}; // Bid prices (spread uygulanmış)
    const spotPrices: Record<string, number> = {};

    if (data.ok && data.data) {
      for (const item of data.data) {
        const symbol = item.symbol;
        const priceOz = parseFloat(item.priceOz || item.price || 0);
        const priceGram = priceOz / TROY_OZ_TO_GRAM;
        const basePrice = Math.round(priceGram * 100) / 100;

        // Base fiyat
        basePrices[symbol] = basePrice;
        spotPrices[symbol] = priceOz;

        // Spread ayarlarını uygula
        const settings = spreadSettings[symbol] || DEFAULT_SETTINGS[symbol];
        if (settings) {
          prices[symbol] = Math.round(basePrice * (1 + settings.askAdjust / 100) * 100) / 100;
          bidPrices[symbol] = Math.round(basePrice * (1 + settings.bidAdjust / 100) * 100) / 100;
        } else {
          prices[symbol] = basePrice;
          bidPrices[symbol] = basePrice;
        }
      }
    }

    const result = { 
      success: true, 
      basePrices,
      prices, 
      bidPrices, 
      spotPrices, 
      changes: goldApiChanges,
      spreadSettings,
      timestamp: now, 
      source: "auxite" 
    };
    cachedData = result;
    lastFetchTime = now;

    return NextResponse.json(result);
  } catch (error) {
    if (cachedData) return NextResponse.json({ ...cachedData, cached: true });

    const basePrices: Record<string, number> = {};
    const prices: Record<string, number> = {};
    const bidPrices: Record<string, number> = {};
    
    for (const [s, d] of Object.entries(FALLBACK)) {
      basePrices[s] = d.gram;
      const settings = DEFAULT_SETTINGS[s];
      prices[s] = Math.round(d.gram * (1 + settings.askAdjust / 100) * 100) / 100;
      bidPrices[s] = Math.round(d.gram * (1 + settings.bidAdjust / 100) * 100) / 100;
    }

    return NextResponse.json({
      success: true, 
      basePrices,
      prices, 
      bidPrices,
      spotPrices: Object.fromEntries(Object.entries(FALLBACK).map(([k, v]) => [k, v.oz])),
      changes: { AUXG: 0, AUXS: 0, AUXPT: 0, AUXPD: 0 },
      spreadSettings: DEFAULT_SETTINGS,
      timestamp: now, 
      source: "fallback",
    });
  }
}
