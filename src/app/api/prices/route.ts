import { NextResponse } from "next/server";

const GOLDAPI_URL = "https://www.goldapi.io/api";
const GOLDAPI_KEY = process.env.GOLDAPI_KEY || "";

const TROY_OZ_TO_GRAM = 31.1035;

const DEFAULT_SETTINGS: Record<string, { askAdjust: number; bidAdjust: number }> = {
  AUXG: { askAdjust: 2, bidAdjust: -1 },
  AUXS: { askAdjust: 3, bidAdjust: -1.5 },
  AUXPT: { askAdjust: 2.5, bidAdjust: -1.25 },
  AUXPD: { askAdjust: 2.5, bidAdjust: -1.25 },
};

let cachedData: any = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 30000; // 30 saniye cache - rate limit önleme

const GOLDAPI_SYMBOLS: Record<string, string> = {
  AUXG: "XAU",
  AUXS: "XAG", 
  AUXPT: "XPT",
  AUXPD: "XPD",
};

const FALLBACK_PRICES: Record<string, { oz: number; gram: number }> = {
  AUXG: { oz: 2750, gram: 88.42 },
  AUXS: { oz: 31, gram: 1.00 },
  AUXPT: { oz: 1000, gram: 32.15 },
  AUXPD: { oz: 1000, gram: 32.15 },
};

// Redis'ten spread ayarlarını al
async function getSpreadSettings(): Promise<Record<string, { askAdjust: number; bidAdjust: number }>> {
  try {
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    
    const adminConfig = await redis.get("admin:spread:config:v2");
    
    if (adminConfig && typeof adminConfig === "object") {
      const config = adminConfig as any;
      const metals = config.metals || config;
      const symbolMap: Record<string, string> = { gold: "AUXG", silver: "AUXS", platinum: "AUXPT", palladium: "AUXPD" };
      const settings: Record<string, { askAdjust: number; bidAdjust: number }> = {};
      
      for (const [metalName, symbol] of Object.entries(symbolMap)) {
        const metalSpread = metals[metalName];
        if (metalSpread) {
          settings[symbol] = { askAdjust: metalSpread.buy || 2, bidAdjust: -(metalSpread.sell || 1) };
        } else {
          settings[symbol] = DEFAULT_SETTINGS[symbol];
        }
      }
      return { ...DEFAULT_SETTINGS, ...settings };
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error("Redis spread error:", error);
    return DEFAULT_SETTINGS;
  }
}

// GoldAPI'den fiyatları çek - Tüm metaller başarılı olmalı
async function fetchGoldApiPrices(): Promise<Record<string, { price: number; change: number }> | null> {
  if (!GOLDAPI_KEY) {
    console.warn("⚠️ GOLDAPI_KEY not set");
    return null;
  }

  const results: Record<string, { price: number; change: number }> = {};
  const metals = Object.entries(GOLDAPI_SYMBOLS);
  let successCount = 0;

  for (const [symbol, goldSymbol] of metals) {
    try {
      const response = await fetch(`${GOLDAPI_URL}/${goldSymbol}/USD`, {
        headers: {
          "x-access-token": GOLDAPI_KEY,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (response.ok) {
        const data = await response.json();
        const priceOz = data.price || 0;
        const changePercent = data.chg_percent || (data.ch && data.prev_close_price ? (data.ch / data.prev_close_price) * 100 : 0);
        
        if (priceOz > 0) {
          results[symbol] = {
            price: priceOz,
            change: Math.round(changePercent * 100) / 100,
          };
          successCount++;
          console.log(`✅ ${symbol}: $${priceOz}/oz (${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%)`);
        } else {
          console.warn(`⚠️ GoldAPI ${symbol}: invalid price 0`);
        }
      } else {
        console.warn(`⚠️ GoldAPI ${symbol} error: ${response.status}`);
      }

      // Rate limit önleme
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error(`❌ GoldAPI ${symbol} fetch error:`, error);
    }
  }

  // Tüm 4 metal başarılı olmalı, yoksa null dön (cache kullanılacak)
  if (successCount < 4) {
    console.warn(`⚠️ Only ${successCount}/4 metals fetched, using cache`);
    return null;
  }

  return results;
}

export async function GET() {
  const now = Date.now();

  // Cache kontrolü
  if (cachedData && now - lastFetchTime < CACHE_DURATION) {
    return NextResponse.json({ ...cachedData, cached: true });
  }

  try {
    // Paralel olarak verileri çek
    const [goldApiData, spreadSettings] = await Promise.all([
      fetchGoldApiPrices(),
      getSpreadSettings(),
    ]);

    // GoldAPI başarısız olduysa ve cache varsa, cache'i kullan
    if (goldApiData === null && cachedData) {
      console.log("⚠️ GoldAPI failed, using cached data");
      return NextResponse.json({ ...cachedData, cached: true, stale: true });
    }

    const basePrices: Record<string, number> = {};
    const prices: Record<string, number> = {};
    const bidPrices: Record<string, number> = {};
    const spotPrices: Record<string, number> = {};
    const changes: Record<string, number> = {};

    for (const symbol of Object.keys(GOLDAPI_SYMBOLS)) {
      const apiData = goldApiData?.[symbol];
      const fallback = FALLBACK_PRICES[symbol];
      
      // Fiyat: API'den veya fallback
      const priceOz = apiData?.price || fallback.oz;
      const priceGram = priceOz / TROY_OZ_TO_GRAM;
      const basePrice = Math.round(priceGram * 100) / 100;

      basePrices[symbol] = basePrice;
      spotPrices[symbol] = priceOz;
      changes[symbol] = apiData?.change || 0;

      // Spread uygula
      const settings = spreadSettings[symbol] || DEFAULT_SETTINGS[symbol];
      prices[symbol] = Math.round(basePrice * (1 + settings.askAdjust / 100) * 100) / 100;
      bidPrices[symbol] = Math.round(basePrice * (1 + settings.bidAdjust / 100) * 100) / 100;
    }

    const hasRealData = Object.keys(goldApiData).length > 0;
    
    const result = {
      success: true,
      basePrices,
      prices,
      bidPrices,
      spotPrices,
      changes,
      spreadSettings,
      timestamp: now,
      source: hasRealData ? "goldapi" : "fallback",
    };

    cachedData = result;
    lastFetchTime = now;

    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ Prices API error:", error);

    // Fallback response
    if (cachedData) {
      return NextResponse.json({ ...cachedData, cached: true, error: "Using cache" });
    }

    const basePrices: Record<string, number> = {};
    const prices: Record<string, number> = {};
    const bidPrices: Record<string, number> = {};

    for (const [symbol, fallback] of Object.entries(FALLBACK_PRICES)) {
      basePrices[symbol] = fallback.gram;
      const settings = DEFAULT_SETTINGS[symbol];
      prices[symbol] = Math.round(fallback.gram * (1 + settings.askAdjust / 100) * 100) / 100;
      bidPrices[symbol] = Math.round(fallback.gram * (1 + settings.bidAdjust / 100) * 100) / 100;
    }

    return NextResponse.json({
      success: true,
      basePrices,
      prices,
      bidPrices,
      spotPrices: Object.fromEntries(Object.entries(FALLBACK_PRICES).map(([k, v]) => [k, v.oz])),
      changes: { AUXG: 0, AUXS: 0, AUXPT: 0, AUXPD: 0 },
      spreadSettings: DEFAULT_SETTINGS,
      timestamp: now,
      source: "fallback",
    });
  }
}
