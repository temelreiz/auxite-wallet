import { NextResponse } from "next/server";

// HTX (Huobi) Public API - no API key needed for market data
const HTX_API = "https://api.huobi.pro/market/tickers";

export async function GET() {
  try {
    const response = await fetch(HTX_API, {
      headers: { "Accept": "application/json" },
      next: { revalidate: 10 },
    });

    if (!response.ok) {
      throw new Error(`HTX API error: ${response.status}`);
    }

    const data = await response.json();

    const prices: Record<string, { usd: number; usd_24h_change: number }> = {};

    if (data.status === "ok" && Array.isArray(data.data)) {
      for (const ticker of data.data) {
        if (ticker.symbol === "btcusdt") {
          prices.bitcoin = { usd: ticker.close, usd_24h_change: ((ticker.close - ticker.open) / ticker.open) * 100 };
        } else if (ticker.symbol === "ethusdt") {
          prices.ethereum = { usd: ticker.close, usd_24h_change: ((ticker.close - ticker.open) / ticker.open) * 100 };
        }
      }
    }

    // Add USDT/USDC as stablecoins
    prices.tether = { usd: 1.00, usd_24h_change: 0 };
    prices.usdcoin = { usd: 1.00, usd_24h_change: 0 };

    return NextResponse.json({
      ...prices,
      source: "htx",
      timestamp: Date.now(),
    }, {
      headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" },
    });
  } catch (error) {
    console.error("HTX crypto API error:", error);

    return NextResponse.json({
      ethereum: { usd: 2000, usd_24h_change: 0 },
      bitcoin: { usd: 85000, usd_24h_change: 0 },
      tether: { usd: 1.00, usd_24h_change: 0 },
      usdcoin: { usd: 1.00, usd_24h_change: 0 },
      source: "fallback",
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 200 });
  }
}
