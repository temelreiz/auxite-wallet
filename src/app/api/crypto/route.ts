import { NextResponse } from "next/server";

const BINANCE_API = "https://api.binance.com/api/v3/ticker/24hr";
const COINGECKO_API = "https://api.coingecko.com/api/v3/simple/price";
const SYMBOLS = ["BTCUSDT", "ETHUSDT", "XRPUSDT", "SOLUSDT"];

let cachedData: any = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 5000; // 10 saniye

const FALLBACK_PRICES = {
  bitcoin: { usd: 92000, usd_24h_change: 0 },
  ethereum: { usd: 3100, usd_24h_change: 0 },
  ripple: { usd: 2.10, usd_24h_change: 0 },
  solana: { usd: 140, usd_24h_change: 0 },
  tether: { usd: 1, usd_24h_change: 0 },
};

async function fetchFromBinance() {
  const symbolsParam = JSON.stringify(SYMBOLS);
  const response = await fetch(
    `${BINANCE_API}?symbols=${encodeURIComponent(symbolsParam)}`,
    { cache: "no-store", next: { revalidate: 0 } }
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

  return prices;
}

async function fetchFromCoinGecko() {
  const response = await fetch(
    `${COINGECKO_API}?ids=bitcoin,ethereum,ripple,solana&vs_currencies=usd&include_24hr_change=true`,
    { cache: "no-store" }
  );

  if (!response.ok) throw new Error("CoinGecko API error");

  const data = await response.json();
  return {
    bitcoin: { usd: data.bitcoin?.usd || 0, usd_24h_change: data.bitcoin?.usd_24h_change || 0 },
    ethereum: { usd: data.ethereum?.usd || 0, usd_24h_change: data.ethereum?.usd_24h_change || 0 },
    ripple: { usd: data.ripple?.usd || 0, usd_24h_change: data.ripple?.usd_24h_change || 0 },
    solana: { usd: data.solana?.usd || 0, usd_24h_change: data.solana?.usd_24h_change || 0 },
    tether: { usd: 1, usd_24h_change: 0 },
  };
}

export async function GET() {
  const now = Date.now();

  if (cachedData && now - lastFetchTime < CACHE_DURATION) {
    return NextResponse.json(cachedData);
  }

  // Try Binance first
  try {
    const prices = await fetchFromBinance();
    const result = { ...prices, source: "binance", timestamp: now };
    cachedData = result;
    lastFetchTime = now;
    return NextResponse.json(result);
  } catch (binanceError) {
    console.error("Binance error:", binanceError);
  }

  // Fallback to CoinGecko
  try {
    const prices = await fetchFromCoinGecko();
    const result = { ...prices, source: "coingecko", timestamp: now };
    cachedData = result;
    lastFetchTime = now;
    return NextResponse.json(result);
  } catch (geckoError) {
    console.error("CoinGecko error:", geckoError);
  }

  // Use cached or fallback
  if (cachedData) return NextResponse.json({ ...cachedData, cached: true });
  return NextResponse.json({ ...FALLBACK_PRICES, source: "fallback" });
}
