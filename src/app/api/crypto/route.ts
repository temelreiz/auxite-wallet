import { NextResponse } from "next/server";

export const runtime = 'edge';

const COINCAP_API = "https://api.coincap.io/v2/assets";

const FALLBACK_PRICES = {
  bitcoin: { usd: 92000, usd_24h_change: 0 },
  ethereum: { usd: 3100, usd_24h_change: 0 },
  ripple: { usd: 2.10, usd_24h_change: 0 },
  solana: { usd: 140, usd_24h_change: 0 },
  tether: { usd: 1, usd_24h_change: 0 },
};

export async function GET() {
  try {
    const response = await fetch(
      `${COINCAP_API}?ids=bitcoin,ethereum,xrp,solana`,
      { 
        headers: { 'Accept': 'application/json' },
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

    return NextResponse.json({ ...prices, source: "coincap", timestamp: Date.now() });
  } catch (error) {
    console.error("CoinCap error:", error);
    return NextResponse.json({ ...FALLBACK_PRICES, source: "fallback" });
  }
}
