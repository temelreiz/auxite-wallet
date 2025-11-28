import { NextResponse } from "next/server";

// Cache
let cachedData: any = null;
let lastFetchTime = 0;
const CACHE_DURATION = 30000; // 30 saniye

export async function GET() {
  const now = Date.now();
  
  // Cache geçerliyse döndür
  if (cachedData && (now - lastFetchTime) < CACHE_DURATION) {
    return NextResponse.json(cachedData);
  }

  try {
    // Binance API - rate limit yok, daha güvenilir
    const [ethRes, btcRes, tryRes] = await Promise.all([
      fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT"),
      fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT"),
      fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=USDTTRY"),
    ]);

    const [ethData, btcData, tryData] = await Promise.all([
      ethRes.json(),
      btcRes.json(),
      tryRes.json(),
    ]);

    const result = {
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
    };

    // Cache güncelle
    cachedData = result;
    lastFetchTime = now;

    return NextResponse.json(result);
  } catch (error) {
    // Hata durumunda cache veya fallback
    if (cachedData) {
      return NextResponse.json(cachedData);
    }
    
    return NextResponse.json({
      ethereum: { usd: 3500, usd_24h_change: 0 },
      bitcoin: { usd: 95000, usd_24h_change: 0 },
      tether: { try: 34.5 },
    });
  }
}
