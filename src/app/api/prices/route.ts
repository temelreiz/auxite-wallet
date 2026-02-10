import { NextResponse } from "next/server";
import { calculateAllExecutionPrices, getPricingConfig, roundPrice, roundPriceOz } from "@/lib/pricing-engine";

const GOLDAPI_URL = "https://www.goldapi.io/api";
const GOLDAPI_KEY = process.env.GOLDAPI_KEY || "";

const TROY_OZ_TO_GRAM = 31.1035;

let cachedData: any = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 30000; // 30 seconds

const GOLDAPI_SYMBOLS: Record<string, string> = {
  AUXG: "XAU",
  AUXS: "XAG",
  AUXPT: "XPT",
  AUXPD: "XPD",
};

// Updated fallback prices - February 2026 market rates
const FALLBACK_PRICES: Record<string, { oz: number; gram: number }> = {
  AUXG: { oz: 5050, gram: 162.4 },
  AUXS: { oz: 89, gram: 2.86 },
  AUXPT: { oz: 2280, gram: 73.3 },
  AUXPD: { oz: 1820, gram: 58.5 },
};

// GoldAPI'den fiyatları çek
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
        }
      } else {
        console.warn(`⚠️ GoldAPI ${symbol} error: ${response.status}`);
      }

      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error(`❌ GoldAPI ${symbol} fetch error:`, error);
    }
  }

  if (successCount === 0) return null;
  return results;
}

export async function GET() {
  const now = Date.now();

  // Cache check
  if (cachedData && now - lastFetchTime < CACHE_DURATION) {
    return NextResponse.json({ ...cachedData, cached: true });
  }

  try {
    // Fetch prices and config in parallel
    const [goldApiData, pricingConfig] = await Promise.all([
      fetchGoldApiPrices(),
      getPricingConfig(),
    ]);

    // If GoldAPI failed and we have cache, use cache
    if (goldApiData === null && cachedData) {
      return NextResponse.json({ ...cachedData, cached: true, stale: true });
    }

    const basePrices: Record<string, number> = {};      // Market Reference (spot, per gram)
    const executionPrices: Record<string, number> = {};  // Execution Price (with markup, per gram)
    const spotPrices: Record<string, number> = {};       // Spot price per oz
    const changes: Record<string, number> = {};

    // Build spot prices per gram
    const spotPerGram: Record<string, number> = {};

    for (const symbol of Object.keys(GOLDAPI_SYMBOLS)) {
      const apiData = goldApiData?.[symbol];
      const fallback = FALLBACK_PRICES[symbol];

      const priceOz = apiData?.price || fallback.oz;
      const priceGram = priceOz / TROY_OZ_TO_GRAM;

      spotPerGram[symbol] = priceGram;
      basePrices[symbol] = roundPrice(priceGram, symbol);
      spotPrices[symbol] = roundPriceOz(priceOz);
      changes[symbol] = apiData?.change || 0;
    }

    // Calculate execution prices using Hybrid Pricing Engine
    const execResults = await calculateAllExecutionPrices(spotPerGram, 0);

    for (const [symbol, result] of Object.entries(execResults)) {
      executionPrices[symbol] = roundPrice(result.executionPrice, symbol);
    }

    const hasRealData = goldApiData !== null && Object.keys(goldApiData).length > 0;

    const result = {
      success: true,
      // Market Reference Prices (spot, no markup)
      basePrices,
      // Execution Prices (with hybrid markup) - replaces old "prices" / askPrices
      prices: executionPrices,
      executionPrices,
      // Spot prices in troy oz
      spotPrices,
      // 24h changes
      changes,
      // Pricing metadata
      pricingEngine: {
        volatilityMode: pricingConfig.volatilityMode,
        source: hasRealData ? "LBMA" : "fallback",
      },
      timestamp: now,
      source: hasRealData ? "goldapi" : "fallback",
    };

    cachedData = result;
    lastFetchTime = now;

    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ Prices API error:", error);

    if (cachedData) {
      return NextResponse.json({ ...cachedData, cached: true, error: "Using cache" });
    }

    // Final fallback
    const basePrices: Record<string, number> = {};
    const executionPrices: Record<string, number> = {};

    for (const [symbol, fallback] of Object.entries(FALLBACK_PRICES)) {
      basePrices[symbol] = fallback.gram;
      // Apply default markup (~0.35% for gold)
      executionPrices[symbol] = roundPrice(fallback.gram * 1.0035, symbol);
    }

    return NextResponse.json({
      success: true,
      basePrices,
      prices: executionPrices,
      executionPrices,
      spotPrices: Object.fromEntries(Object.entries(FALLBACK_PRICES).map(([k, v]) => [k, v.oz])),
      changes: { AUXG: 0, AUXS: 0, AUXPT: 0, AUXPD: 0 },
      pricingEngine: { volatilityMode: "normal", source: "fallback" },
      timestamp: now,
      source: "fallback",
    });
  }
}
