import { NextResponse } from "next/server";

// Multi-source crypto price aggregator
// Uses median of HTX, Binance, CoinGecko for reliability

interface PriceResult {
  eth: number;
  btc: number;
  source: string;
}

async function fetchHTX(): Promise<PriceResult | null> {
  try {
    const res = await fetch("https://api.huobi.pro/market/tickers", {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== "ok" || !Array.isArray(data.data)) return null;
    let eth = 0, btc = 0;
    for (const t of data.data) {
      if (t.symbol === "ethusdt") eth = t.close;
      if (t.symbol === "btcusdt") btc = t.close;
    }
    return eth > 0 && btc > 0 ? { eth, btc, source: "htx" } : null;
  } catch { return null; }
}

async function fetchBinance(): Promise<PriceResult | null> {
  try {
    const [ethRes, btcRes] = await Promise.all([
      fetch("https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT", { signal: AbortSignal.timeout(5000) }),
      fetch("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT", { signal: AbortSignal.timeout(5000) }),
    ]);
    if (!ethRes.ok || !btcRes.ok) return null;
    const ethData = await ethRes.json();
    const btcData = await btcRes.json();
    const eth = parseFloat(ethData.price);
    const btc = parseFloat(btcData.price);
    return eth > 0 && btc > 0 ? { eth, btc, source: "binance" } : null;
  } catch { return null; }
}

async function fetchCoinGecko(): Promise<PriceResult | null> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin&vs_currencies=usd",
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const eth = data.ethereum?.usd;
    const btc = data.bitcoin?.usd;
    return eth > 0 && btc > 0 ? { eth, btc, source: "coingecko" } : null;
  } catch { return null; }
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// In-memory cache
let priceCache: { eth: number; btc: number; sources: string[]; timestamp: number } | null = null;

export async function GET() {
  try {
    // Return cache if fresh (< 10 seconds)
    if (priceCache && Date.now() - priceCache.timestamp < 10000) {
      return NextResponse.json({
        ethereum: { usd: priceCache.eth, usd_24h_change: 0 },
        bitcoin: { usd: priceCache.btc, usd_24h_change: 0 },
        tether: { usd: 1.00, usd_24h_change: 0 },
        usdcoin: { usd: 1.00, usd_24h_change: 0 },
        source: priceCache.sources.join("+"),
        sources: priceCache.sources,
        timestamp: priceCache.timestamp,
      }, {
        headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" },
      });
    }

    // Fetch from all 3 sources in parallel
    const [htx, binance, coingecko] = await Promise.all([
      fetchHTX(),
      fetchBinance(),
      fetchCoinGecko(),
    ]);

    const ethPrices: number[] = [];
    const btcPrices: number[] = [];
    const sources: string[] = [];

    if (htx) { ethPrices.push(htx.eth); btcPrices.push(htx.btc); sources.push("htx"); }
    if (binance) { ethPrices.push(binance.eth); btcPrices.push(binance.btc); sources.push("binance"); }
    if (coingecko) { ethPrices.push(coingecko.eth); btcPrices.push(coingecko.btc); sources.push("coingecko"); }

    let ethPrice: number;
    let btcPrice: number;

    if (ethPrices.length > 0) {
      ethPrice = median(ethPrices);
      btcPrice = median(btcPrices);
    } else {
      // All sources failed - use stale cache or hardcoded fallback
      ethPrice = priceCache?.eth || 2000;
      btcPrice = priceCache?.btc || 85000;
      sources.push("fallback");
    }

    // Update cache
    priceCache = { eth: ethPrice, btc: btcPrice, sources, timestamp: Date.now() };

    return NextResponse.json({
      ethereum: { usd: ethPrice, usd_24h_change: 0 },
      bitcoin: { usd: btcPrice, usd_24h_change: 0 },
      tether: { usd: 1.00, usd_24h_change: 0 },
      usdcoin: { usd: 1.00, usd_24h_change: 0 },
      source: sources.join("+"),
      sources,
      timestamp: Date.now(),
    }, {
      headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" },
    });
  } catch (error) {
    console.error("Multi-source crypto API error:", error);

    return NextResponse.json({
      ethereum: { usd: priceCache?.eth || 2000, usd_24h_change: 0 },
      bitcoin: { usd: priceCache?.btc || 85000, usd_24h_change: 0 },
      tether: { usd: 1.00, usd_24h_change: 0 },
      usdcoin: { usd: 1.00, usd_24h_change: 0 },
      source: "fallback",
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 200 });
  }
}
