import { NextResponse } from "next/server";
import {
  getPreciousMetalRates,
  getAuxiteMetalRates,
  getUsdTlRate,
  getMetalPricesInUsd,
  KT_TO_AUXITE_MAP,
} from "@/lib/kuveytturk-service";
import { calculateAllExecutionPrices, getPricingConfig, roundPrice, roundPriceOz } from "@/lib/pricing-engine";

const TROY_OZ_TO_GRAM = 31.1035;

let cachedData: any = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 15000; // 15 seconds

export async function GET() {
  const now = Date.now();

  // Cache check
  if (cachedData && now - lastFetchTime < CACHE_DURATION) {
    return NextResponse.json({ ...cachedData, cached: true });
  }

  try {
    // Fetch KuveytTürk metal prices + USD/TL rate + pricing config in parallel
    const [metalPricesUsd, pricingConfig, usdTlRate, rawRates] = await Promise.all([
      getMetalPricesInUsd(),
      getPricingConfig(),
      getUsdTlRate(),
      getAuxiteMetalRates(),
    ]);

    const basePrices: Record<string, number> = {};      // Market Reference (spot, per gram USD)
    const executionPrices: Record<string, number> = {};  // Execution Price (with markup, per gram USD)
    const spotPrices: Record<string, number> = {};       // Spot price per oz USD
    const changes: Record<string, number> = {};
    const tlPrices: Record<string, { buy: number; sell: number }> = {};  // TL prices

    // Build spot prices per gram (USD)
    const spotPerGram: Record<string, number> = {};

    for (const [symbol, priceData] of Object.entries(metalPricesUsd)) {
      const priceGramUsd = priceData.buyRateUSD;
      const priceOzUsd = priceData.buyRateUSDOz;

      spotPerGram[symbol] = priceGramUsd;
      basePrices[symbol] = roundPrice(priceGramUsd, symbol);
      spotPrices[symbol] = roundPriceOz(priceOzUsd);
      changes[symbol] = 0; // KuveytTürk doesn't provide change %, can be calculated later

      // Store TL prices for reference
      tlPrices[symbol] = {
        buy: priceData.buyRateTL,
        sell: priceData.sellRateTL,
      };
    }

    // Calculate execution prices using existing Hybrid Pricing Engine
    const execResults = await calculateAllExecutionPrices(spotPerGram, 0);

    for (const [symbol, result] of Object.entries(execResults)) {
      executionPrices[symbol] = roundPrice(result.executionPrice, symbol);
    }

    const hasRealData = Object.keys(metalPricesUsd).length > 0;

    const result = {
      success: true,
      // Market Reference Prices (spot, no markup, USD/gram)
      basePrices,
      // Execution Prices (with hybrid markup, USD/gram)
      prices: executionPrices,
      executionPrices,
      // Spot prices in troy oz (USD)
      spotPrices,
      // 24h changes (%)
      changes,
      // TL prices from KuveytTürk (TL/gram)
      tlPrices,
      // USD/TL rate
      usdTlRate: {
        buy: usdTlRate.buy,
        sell: usdTlRate.sell,
      },
      // Pricing metadata
      pricingEngine: {
        volatilityMode: pricingConfig.volatilityMode,
        source: hasRealData ? "kuveytturk" : "fallback",
      },
      timestamp: now,
      source: "kuveytturk",
    };

    cachedData = result;
    lastFetchTime = now;

    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ KuveytTürk Prices API error:", error);

    if (cachedData) {
      return NextResponse.json({ ...cachedData, cached: true, error: "Using cache" });
    }

    return NextResponse.json(
      {
        success: false,
        error: "KuveytTürk API unavailable",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}
