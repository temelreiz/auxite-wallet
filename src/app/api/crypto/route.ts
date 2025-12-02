import { NextResponse } from "next/server";

// CoinGecko API - Free, no API key required
const COINGECKO_API = "https://api.coingecko.com/api/v3/simple/price";

// Coin IDs for CoinGecko
const COIN_IDS = "bitcoin,ethereum,ripple,solana";

export async function GET() {
  try {
    // CoinGecko API call
    const response = await fetch(
      `${COINGECKO_API}?ids=${COIN_IDS}&vs_currencies=usd&include_24hr_change=true`,
      {
        headers: {
          "Accept": "application/json",
        },
        next: { revalidate: 5 }, // Cache for 5 seconds
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();

    // Parse CoinGecko response
    const result = {
      bitcoin: {
        usd: data.bitcoin?.usd || 0,
        usd_24h_change: data.bitcoin?.usd_24h_change || 0,
      },
      ethereum: {
        usd: data.ethereum?.usd || 0,
        usd_24h_change: data.ethereum?.usd_24h_change || 0,
      },
      ripple: {
        usd: data.ripple?.usd || 0,
        usd_24h_change: data.ripple?.usd_24h_change || 0,
      },
      solana: {
        usd: data.solana?.usd || 0,
        usd_24h_change: data.solana?.usd_24h_change || 0,
      },
      source: "coingecko",
      timestamp: Date.now(),
    };

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10",
      },
    });
  } catch (error) {
    console.error("CoinGecko API error:", error);

    // Try Binance as fallback
    try {
      const binanceResponse = await fetch(
        "https://api.binance.com/api/v3/ticker/24hr?symbols=[\"BTCUSDT\",\"ETHUSDT\",\"XRPUSDT\",\"SOLUSDT\"]",
        { next: { revalidate: 5 } }
      );

      if (binanceResponse.ok) {
        const binanceData = await binanceResponse.json();
        const prices: Record<string, { usd: number; usd_24h_change: number }> = {};

        for (const ticker of binanceData) {
          const price = parseFloat(ticker.lastPrice);
          const change = parseFloat(ticker.priceChangePercent);

          if (ticker.symbol === "BTCUSDT") {
            prices.bitcoin = { usd: price, usd_24h_change: change };
          } else if (ticker.symbol === "ETHUSDT") {
            prices.ethereum = { usd: price, usd_24h_change: change };
          } else if (ticker.symbol === "XRPUSDT") {
            prices.ripple = { usd: price, usd_24h_change: change };
          } else if (ticker.symbol === "SOLUSDT") {
            prices.solana = { usd: price, usd_24h_change: change };
          }
        }

        return NextResponse.json({
          ...prices,
          source: "binance",
          timestamp: Date.now(),
        });
      }
    } catch (binanceError) {
      console.error("Binance fallback error:", binanceError);
    }

    // Final fallback - static prices
    return NextResponse.json(
      {
        ethereum: { usd: 3650, usd_24h_change: 1.5 },
        bitcoin: { usd: 97500, usd_24h_change: 2.1 },
        ripple: { usd: 2.20, usd_24h_change: -0.8 },
        solana: { usd: 235, usd_24h_change: 3.2 },
        source: "fallback",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 200 }
    );
  }
}
