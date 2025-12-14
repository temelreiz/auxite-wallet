// src/app/api/crypto/chart/route.ts
// Binance API'den OHLCV (candlestick) verisi çeker

import { NextRequest, NextResponse } from "next/server";

export const runtime = 'edge';
export const revalidate = 0;

const BINANCE_API = "https://api.binance.com/api/v3/klines";

// Symbol mapping
const SYMBOL_MAP: Record<string, string> = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
  XRP: "XRPUSDT",
  SOL: "SOLUSDT",
};

// Interval mapping
const INTERVAL_MAP: Record<string, string> = {
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "1h": "1h",
  "4h": "4h",
  "1D": "1d",
  "1W": "1w",
};

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol")?.toUpperCase() || "BTC";
    const interval = searchParams.get("interval") || "1h";
    const limit = parseInt(searchParams.get("limit") || "100");

    const binanceSymbol = SYMBOL_MAP[symbol];
    if (!binanceSymbol) {
      return NextResponse.json(
        { error: `Unknown symbol: ${symbol}` },
        { status: 400 }
      );
    }

    const binanceInterval = INTERVAL_MAP[interval] || "1h";

    const response = await fetch(
      `${BINANCE_API}?symbol=${binanceSymbol}&interval=${binanceInterval}&limit=${limit}`,
      {
        headers: { Accept: "application/json" },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data = await response.json();

    // Binance kline format:
    // [openTime, open, high, low, close, volume, closeTime, quoteVolume, trades, takerBuyBase, takerBuyQuote, ignore]
    const candles: CandleData[] = data.map((k: any[]) => ({
      time: k[0], // Open time in ms
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));

    return NextResponse.json({
      symbol,
      interval,
      candles,
      source: "binance",
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error("Binance chart error:", error.message);
    return NextResponse.json(
      { error: error.message || "Failed to fetch chart data", source: "error" },
      { status: 500 }
    );
  }
}
