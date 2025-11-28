import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const errors: string[] = [];
  
  // Binance dene
  try {
    const [ethRes, btcRes, tryRes] = await Promise.all([
      fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT", { cache: 'no-store' }),
      fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT", { cache: 'no-store' }),
      fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=USDTTRY", { cache: 'no-store' }),
    ]);

    if (ethRes.ok && btcRes.ok && tryRes.ok) {
      const [ethData, btcData, tryData] = await Promise.all([
        ethRes.json(),
        btcRes.json(),
        tryRes.json(),
      ]);

      return NextResponse.json({
        ethereum: {
          usd: parseFloat(ethData.lastPrice),
          usd_24h_change: parseFloat(ethData.priceChangePercent),
        },
        bitcoin: {
          usd: parseFloat(btcData.lastPrice),
          usd_24h_change: parseFloat(btcData.priceChangePercent),
        },
        tether: {
          try: parseFloat(tryData.lastPrice),
        },
        source: "binance",
        timestamp: Date.now(),
      });
    } else {
      errors.push(`Binance status: ETH=${ethRes.status}, BTC=${btcRes.status}, TRY=${tryRes.status}`);
    }
  } catch (e: any) {
    errors.push(`Binance error: ${e.message}`);
  }

  // CoinGecko dene
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin,tether&vs_currencies=usd,try&include_24hr_change=true",
      { cache: 'no-store' }
    );

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({
        ethereum: {
          usd: data.ethereum?.usd || 0,
          usd_24h_change: data.ethereum?.usd_24h_change || 0,
        },
        bitcoin: {
          usd: data.bitcoin?.usd || 0,
          usd_24h_change: data.bitcoin?.usd_24h_change || 0,
        },
        tether: {
          try: data.tether?.try || 0,
        },
        source: "coingecko",
        errors,
        timestamp: Date.now(),
      });
    }
  } catch (e: any) {
    errors.push(`CoinGecko error: ${e.message}`);
  }

  return NextResponse.json({
    ethereum: { usd: 3500, usd_24h_change: 0 },
    bitcoin: { usd: 95000, usd_24h_change: 0 },
    tether: { try: 34.5 },
    source: "fallback",
    errors,
    timestamp: Date.now(),
  });
}
