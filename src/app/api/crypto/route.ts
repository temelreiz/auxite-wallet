import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const [ethRes, btcRes, tryRes] = await Promise.all([
      fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT", { cache: 'no-store' }),
      fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT", { cache: 'no-store' }),
      fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=USDTTRY", { cache: 'no-store' }),
    ]);

    if (!ethRes.ok || !btcRes.ok || !tryRes.ok) {
      throw new Error("Binance API error");
    }

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
      timestamp: Date.now(),
    });
  } catch (error) {
    return NextResponse.json({
      ethereum: { usd: 3500, usd_24h_change: 0 },
      bitcoin: { usd: 95000, usd_24h_change: 0 },
      tether: { try: 34.5 },
      timestamp: Date.now(),
    });
  }
}
