import { NextResponse } from "next/server";

const COINGECKO_API = "https://api.coingecko.com/api/v3/simple/price";

let cachedData: any = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 5000; // 5 saniye

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
      `${COINGECKO_API}?ids=bitcoin,ethereum,ripple,solana&vs_currencies=usd&include_24hr_change=true`,
      { 
        cache: "no-store",
        headers: {
          'Accept': 'application/json',
        }
      }
    );

    if (!response.ok) throw new Error("CoinGecko API error");

    const data = await response.json();
    
    const prices = {
      bitcoin: { 
        usd: data.bitcoin?.usd || 0, 
        usd_24h_change: data.bitcoin?.usd_24h_change || 0 
      },
      ethereum: { 
        usd: data.ethereum?.usd || 0, 
        usd_24h_change: data.ethereum?.usd_24h_change || 0 
      },
      ripple: { 
        usd: data.ripple?.usd || 0, 
        usd_24h_change: data.ripple?.usd_24h_change || 0 
      },
      solana: { 
        usd: data.solana?.usd || 0, 
        usd_24h_change: data.solana?.usd_24h_change || 0 
      },
      tether: { usd: 1, usd_24h_change: 0 },
    };

    const result = { ...prices, source: "coingecko", timestamp: now };
    cachedData = result;
    lastFetchTime = now;
    return NextResponse.json(result);
  } catch (error) {
    console.error("CoinGecko error:", error);
    
    if (cachedData) {
      return NextResponse.json({ ...cachedData, cached: true });
    }
    return NextResponse.json({ ...FALLBACK_PRICES, source: "fallback" });
  }
}
