import { NextResponse } from "next/server";

const BINANCE_API = "https://api.binance.com/api/v3/ticker/24hr";
const SYMBOLS = ["BTCUSDT", "ETHUSDT", "XRPUSDT", "SOLUSDT"];

let cachedData: any = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 3000;

const FALLBACK_PRICES = {
  bitcoin: { usd: 97000, usd_24h_change: 0 },
  ethereum: { usd: 3600, usd_24h_change: 0 },
  ripple: { usd: 2.50, usd_24h_change: 0 },
  solana: { usd: 230, usd_24h_change: 0 },
  tether: { usd: 1, usd_24h_change: 0 },
};

export async function GET() {
  const now = Date.now();

  if (cachedData && now - lastFetchTime < CACHE_DURATION) {
    return NextResponse.json(cachedData);
  }

  try {
    const symbolsParam = JSON.stringify(SYMBOLS);
    const response = await fetch(
      `${BINANCE_API}?symbols=${encodeURIComponent(symbolsParam)}`,
      { cache: "no-store" }
    );

    if (!response.ok) throw new Error("Binance API error");

    const data = await response.json();
    const prices: Record<string, { usd: number; usd_24h_change: number }> = {
      tether: { usd: 1, usd_24h_change: 0 },
    };

    for (const ticker of data) {
      const price = parseFloat(ticker.lastPrice);
      const change = parseFloat(ticker.priceChangePercent);

      switch (ticker.symbol) {
        case "BTCUSDT": prices.bitcoin = { usd: price, usd_24h_change: change }; break;
        case "ETHUSDT": prices.ethereum = { usd: price, usd_24h_change: change }; break;
        case "XRPUSDT": prices.ripple = { usd: price, usd_24h_change: change }; break;
        case "SOLUSDT": prices.solana = { usd: price, usd_24h_change: change }; break;
      }
    }

    const result = { ...prices, source: "binance", timestamp: now };
    cachedData = result;
    lastFetchTime = now;

    return NextResponse.json(result);
  } catch (error) {
    if (cachedData) return NextResponse.json({ ...cachedData, cached: true });
    return NextResponse.json({ ...FALLBACK_PRICES, source: "fallback" });
  }
}
