import { NextResponse } from "next/server";
import { calculateAllExecutionPrices, getPricingConfig, roundPrice, roundPriceOz } from "@/lib/pricing-engine";
import { getMetalPricesInUsd, getUsdTlRate, getAuxiteMetalRates } from "@/lib/kuveytturk-service";

const GOLDAPI_URL = "https://www.goldapi.io/api";
const GOLDAPI_KEY = process.env.GOLDAPI_KEY || "";
const KUVEYTTURK_CLIENT_ID = process.env.KUVEYTTURK_CLIENT_ID || "";

const TROY_OZ_TO_GRAM = 31.1035;

let cachedData: any = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 15000; // 15 seconds (faster for KuveytTürk)

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

// ============================================
// PRIMARY: KuveytTürk API
// ============================================

async function fetchKuveytTurkPrices(): Promise<Record<string, { price: number; change: number }> | null> {
  if (!KUVEYTTURK_CLIENT_ID) {
    console.warn("⚠️ KUVEYTTURK_CLIENT_ID not set, skipping KuveytTürk");
    return null;
  }

  try {
    const metalPricesUsd = await getMetalPricesInUsd();

    const results: Record<string, { price: number; change: number }> = {};

    for (const [symbol, priceData] of Object.entries(metalPricesUsd)) {
      if (priceData.buyRateUSDOz > 0) {
        results[symbol] = {
          price: priceData.buyRateUSDOz, // $/oz format (same as GoldAPI)
          change: 0, // KuveytTürk doesn't provide change %
        };
        console.log(`✅ KT ${symbol}: $${priceData.buyRateUSDOz.toFixed(2)}/oz (${priceData.buyRateTL.toFixed(2)} TL/gr)`);
      }
    }

    if (Object.keys(results).length === 0) return null;
    return results;
  } catch (error) {
    console.error("❌ KuveytTürk fetch failed:", error);
    return null;
  }
}

// ============================================
// FALLBACK: GoldAPI
// ============================================

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
          console.log(`✅ GoldAPI ${symbol}: $${priceOz}/oz (${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%)`);
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

// ============================================
// MAIN HANDLER
// ============================================

export async function GET() {
  const now = Date.now();

  // Cache check
  if (cachedData && now - lastFetchTime < CACHE_DURATION) {
    return NextResponse.json({ ...cachedData, cached: true });
  }

  try {
    // Try KuveytTürk first (primary), fall back to GoldAPI
    let priceData: Record<string, { price: number; change: number }> | null = null;
    let source = "fallback";

    // Primary: KuveytTürk
    priceData = await fetchKuveytTurkPrices();
    if (priceData && Object.keys(priceData).length >= 3) {
      source = "kuveytturk";
      console.log("📊 Price source: KuveytTürk");
    }

    // Fallback: GoldAPI
    if (!priceData || Object.keys(priceData).length < 3) {
      console.log("⚠️ KuveytTürk failed or incomplete, trying GoldAPI...");
      const goldData = await fetchGoldApiPrices();
      if (goldData) {
        // Merge: use KuveytTürk data where available, fill gaps with GoldAPI
        priceData = { ...goldData, ...(priceData || {}) };
        source = priceData === goldData ? "goldapi" : "kuveytturk+goldapi";
      }
    }

    // Fetch pricing config
    const pricingConfig = await getPricingConfig();

    // If all APIs failed and we have cache, use cache
    if (!priceData && cachedData) {
      return NextResponse.json({ ...cachedData, cached: true, stale: true });
    }

    const basePrices: Record<string, number> = {};
    const executionPrices: Record<string, number> = {};
    const spotPrices: Record<string, number> = {};
    const changes: Record<string, number> = {};

    const spotPerGram: Record<string, number> = {};

    for (const symbol of Object.keys(GOLDAPI_SYMBOLS)) {
      const apiData = priceData?.[symbol];
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

    const hasRealData = priceData !== null && Object.keys(priceData).length > 0;

    // Fetch TL prices if KuveytTürk is available
    let tlPrices: Record<string, { buy: number; sell: number }> | undefined;
    let usdTlRate: { buy: number; sell: number } | undefined;

    if (source.includes("kuveytturk")) {
      try {
        const [rates, usdTl] = await Promise.all([
          getAuxiteMetalRates(),
          getUsdTlRate(),
        ]);
        tlPrices = {};
        for (const [symbol, rate] of Object.entries(rates)) {
          tlPrices[symbol] = { buy: rate.buyRate, sell: rate.sellRate };
        }
        usdTlRate = { buy: usdTl.buy, sell: usdTl.sell };
      } catch {
        // Non-critical, skip TL prices
      }
    }

    const result = {
      success: true,
      basePrices,
      prices: executionPrices,
      executionPrices,
      spotPrices,
      changes,
      // KuveytTürk specific data
      ...(tlPrices && { tlPrices }),
      ...(usdTlRate && { usdTlRate }),
      pricingEngine: {
        volatilityMode: pricingConfig.volatilityMode,
        source: hasRealData ? source : "fallback",
      },
      timestamp: now,
      source: hasRealData ? source : "fallback",
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
      timestamp: Date.now(),
      source: "fallback",
    });
  }
}
