import { NextResponse } from "next/server";

export const runtime = 'edge';

const CRYPTOCOMPARE_API = "https://min-api.cryptocompare.com/data/pricemultifull";

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
      `${CRYPTOCOMPARE_API}?fsyms=BTC,ETH,XRP,SOL&tsyms=USD`,
      { 
        headers: { 'Accept': 'application/json' },
      }
    );

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();
    const raw = data.RAW;
    
    if (!raw) throw new Error("No data");

    const prices = {
      bitcoin: { 
        usd: raw.BTC?.USD?.PRICE || 0, 
        usd_24h_change: raw.BTC?.USD?.CHANGEPCT24HOUR || 0 
      },
      ethereum: { 
        usd: raw.ETH?.USD?.PRICE || 0, 
        usd_24h_change: raw.ETH?.USD?.CHANGEPCT24HOUR || 0 
      },
      ripple: { 
        usd: raw.XRP?.USD?.PRICE || 0, 
        usd_24h_change: raw.XRP?.USD?.CHANGEPCT24HOUR || 0 
      },
      solana: { 
        usd: raw.SOL?.USD?.PRICE || 0, 
        usd_24h_change: raw.SOL?.USD?.CHANGEPCT24HOUR || 0 
      },
      tether: { usd: 1, usd_24h_change: 0 },
    };

    return NextResponse.json({ ...prices, source: "cryptocompare", timestamp: Date.now() });
  } catch (error: any) {
    console.error("CryptoCompare error:", error.message);
    return NextResponse.json({ ...FALLBACK_PRICES, source: "fallback", error: error.message });
  }
}
