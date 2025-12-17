import { NextResponse } from "next/server";

// Binance API - No API key required for public endpoints
const BINANCE_API = "https://api.binance.com/api/v3/ticker/24hr";

// Symbol mapping - USDCUSDT eklendi (USDT değerini hesaplamak için)
const SYMBOLS = ["BTCUSDT", "ETHUSDT", "XRPUSDT", "SOLUSDT", "USDCUSDT"];

// Price adjustments from settings (ask/bid spread)
const DEFAULT_SETTINGS = {
  BTC: { askAdjust: 1, bidAdjust: -0.5 },
  ETH: { askAdjust: 1, bidAdjust: -0.5 },
  XRP: { askAdjust: 1, bidAdjust: -0.5 },
  SOL: { askAdjust: 1, bidAdjust: -0.5 },
};

// USDT/TRY rate (approximate)
const USDT_TRY_RATE = 42.51;

export async function GET() {
  try {
    // Fetch all symbols in one request
    const symbolsParam = JSON.stringify(SYMBOLS);
    const response = await fetch(
      `${BINANCE_API}?symbols=${encodeURIComponent(symbolsParam)}`,
      {
        headers: {
          "Accept": "application/json",
        },
        next: { revalidate: 5 }, // Cache for 5 seconds
      }
    );

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data = await response.json();

    // Parse Binance response
    const prices: Record<string, { usd: number; usd_24h_change: number; try?: number }> = {};
    
    // USDT değeri için USDCUSDT kullanacağız
    let usdtPrice = 1.00;
    let usdtChange = 0;

    for (const ticker of data) {
      const symbol = ticker.symbol;
      const price = parseFloat(ticker.lastPrice);
      const change24h = parseFloat(ticker.priceChangePercent);

      if (symbol === "BTCUSDT") {
        prices.bitcoin = { usd: price, usd_24h_change: change24h };
      } else if (symbol === "ETHUSDT") {
        prices.ethereum = { usd: price, usd_24h_change: change24h };
      } else if (symbol === "XRPUSDT") {
        prices.ripple = { usd: price, usd_24h_change: change24h };
      } else if (symbol === "SOLUSDT") {
        prices.solana = { usd: price, usd_24h_change: change24h };
      } else if (symbol === "USDCUSDT") {
        // USDCUSDT = 1 USDC kaç USDT eder
        // USDT'nin USD değeri ≈ 1 / USDCUSDT (çünkü USDC ≈ $1)
        usdtPrice = 1 / price;
        usdtChange = -change24h; // Ters ilişki
      }
    }

    // Add USDT with USD value
    prices.tether = { 
      usd: usdtPrice, 
      usd_24h_change: usdtChange,
      try: USDT_TRY_RATE 
    };

    const result = {
      ...prices,
      source: "binance",
      timestamp: Date.now(),
    };

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10",
      },
    });
  } catch (error) {
    console.error("Binance API error:", error);

    // Fallback prices
    return NextResponse.json(
      {
        ethereum: { usd: 3650, usd_24h_change: 0 },
        bitcoin: { usd: 97500, usd_24h_change: 0 },
        ripple: { usd: 2.20, usd_24h_change: 0 },
        solana: { usd: 235, usd_24h_change: 0 },
        tether: { usd: 1.00, usd_24h_change: 0, try: USDT_TRY_RATE },
        source: "fallback",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 200 }
    );
  }
}
