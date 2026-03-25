// src/app/api/prices/htx/route.ts
// HTX Price Feed - Returns current prices from HTX for BTC, ETH, USDT pairs

import { NextResponse } from "next/server";
import { getMarketTicker, getMarketTickers } from "@/lib/htx-client";

// Cache to avoid hitting HTX on every request
let cachedPrices: Record<string, unknown> | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 10_000; // 10 seconds

const TRACKED_SYMBOLS = [
  { symbol: "btcusdt", base: "BTC", quote: "USDT" },
  { symbol: "ethusdt", base: "ETH", quote: "USDT" },
  { symbol: "usdcusdt", base: "USDC", quote: "USDT" },
  { symbol: "ethbtc", base: "ETH", quote: "BTC" },
];

export async function GET() {
  try {
    const now = Date.now();

    // Return cached if fresh
    if (cachedPrices && now - lastFetchTime < CACHE_DURATION) {
      return NextResponse.json({
        success: true,
        source: "htx",
        cached: true,
        ...cachedPrices,
      });
    }

    // Fetch all tickers in one call (more efficient)
    const prices: Record<
      string,
      {
        bid: number;
        ask: number;
        last: number;
        high: number;
        low: number;
        volume: number;
        change24h: number;
      }
    > = {};

    // Try bulk fetch first
    let bulkSuccess = false;
    try {
      const allTickers = await getMarketTickers();
      const tickerMap = new Map(
        allTickers.map((t) => [t.symbol, t])
      );

      for (const { symbol, base, quote } of TRACKED_SYMBOLS) {
        const ticker = tickerMap.get(symbol);
        if (ticker) {
          const change24h =
            ticker.open > 0
              ? ((ticker.close - ticker.open) / ticker.open) * 100
              : 0;

          prices[`${base}_${quote}`] = {
            bid: ticker.close, // Merged ticker uses close as approximation
            ask: ticker.close,
            last: ticker.close,
            high: ticker.high,
            low: ticker.low,
            volume: ticker.vol,
            change24h: parseFloat(change24h.toFixed(2)),
          };
        }
      }

      bulkSuccess = Object.keys(prices).length > 0;
    } catch (bulkErr) {
      console.warn("[HTX Prices] Bulk ticker fetch failed, falling back to individual:", bulkErr);
    }

    // Fallback: fetch individually with merged ticker (has bid/ask)
    if (!bulkSuccess) {
      const results = await Promise.allSettled(
        TRACKED_SYMBOLS.map(({ symbol }) => getMarketTicker(symbol))
      );

      for (let i = 0; i < TRACKED_SYMBOLS.length; i++) {
        const { base, quote } = TRACKED_SYMBOLS[i];
        const result = results[i];

        if (result.status === "fulfilled") {
          const ticker = result.value;
          const change24h =
            ticker.open > 0
              ? ((ticker.close - ticker.open) / ticker.open) * 100
              : 0;

          prices[`${base}_${quote}`] = {
            bid: ticker.bid,
            ask: ticker.ask,
            last: ticker.close,
            high: ticker.high,
            low: ticker.low,
            volume: ticker.vol,
            change24h: parseFloat(change24h.toFixed(2)),
          };
        }
      }
    }

    // Build response
    const response = {
      prices,
      timestamp: new Date().toISOString(),
      pairsAvailable: Object.keys(prices).length,
    };

    // Cache the result
    cachedPrices = response;
    lastFetchTime = now;

    return NextResponse.json({
      success: true,
      source: "htx",
      cached: false,
      ...response,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[HTX Prices] Error:", message);

    // Return cached data if available, even if stale
    if (cachedPrices) {
      return NextResponse.json({
        success: true,
        source: "htx",
        cached: true,
        stale: true,
        ...cachedPrices,
      });
    }

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
