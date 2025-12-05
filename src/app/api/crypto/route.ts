import { NextResponse } from "next/server";

const COINCAP_API = "https://api.coincap.io/v2/assets";

let cachedData: any = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 3000; // 3 saniye

const FALLBACK_PRICES = {
  bitcoin: { usd: 92000, usd_24h_change: 0 },
  ethereum: { usd: 3100, usd_24h_change: 0 },
  ripple: { usd: 2.10, usd_24h_change: 0 },
  solana: { usd: 140, usd_24h_change: 0 },
  tether: { usd: 1, usd_24h_change: 0 },
};

export async function GET() {
  const now = Date.now();

  if (cachedData && now - lastFetchTime < CACHE_DURATION) {
    return NextResponse.json(cachedData);
  }

  try {
    const response = await fetch(
      `${COINCAP_API}?ids=bitcoin,ethereum,xrp,solana`,
      { 
        cache: "no-store",
        headers: { 'Accept': 'application/json' }
      }
    );

    if (!response.ok) throw new Error("CoinCap API error");

    const { data } = await response.json();
    
    const prices: Record<string, { usd: number; usd_24h_change: number }> = {
      tether: { usd: 1, usd_24h_change: 0 },
    };

    for (const coin of data) {
      const usd = parseFloat(coin.priceUsd) || 0;
      const change = parseFloat(coin.changePercent24Hr) || 0;
      
      if (coin.id === "bitcoin") prices.bitcoin = { usd, usd_24h_change: change };
      if (coin.id === "ethereum") prices.ethereum = { usd, usd_24h_change: change };
      if (coin.id === "xrp") prices.ripple = { usd, usd_24h_change: change };
      if (coin.id === "solana") prices.solana = { usd, usd_24h_change: change };
    }

    const result = { ...prices, source: "coincap", timestamp: now };
    cachedData = result;
    lastFetchTime = now;
    return NextResponse.json(result);
  } catch (error) {
    console.error("CoinCap error:", error);
    
    if (cachedData) return NextResponse.json({ ...cachedData, cached: true });
    return NextResponse.json({ ...FALLBACK_PRICES, source: "fallback" });
  }
}
