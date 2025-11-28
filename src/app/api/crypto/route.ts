import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const FALLBACK = {
  ethereum: { usd: 3500, usd_24h_change: 0 },
  bitcoin: { usd: 95000, usd_24h_change: 0 },
  tether: { try: 34.5 },
};

// Memory cache
let cachedResult: any = null;
let cacheTime = 0;
const CACHE_DURATION = 5000; // 5 saniye

async function fetchWithTimeout(url: string, timeout = 3000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const res = await fetch(url, { 
      cache: 'no-store',
      signal: controller.signal 
    });
    clearTimeout(timeoutId);
    return res;
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

export async function GET() {
  const now = Date.now();
  
  // Cache geçerliyse döndür
  if (cachedResult && (now - cacheTime) < CACHE_DURATION) {
    return NextResponse.json({ ...cachedResult, cached: true });
  }

  // 1. Önce Binance dene
  try {
    const [ethRes, btcRes, tryRes] = await Promise.all([
      fetchWithTimeout("https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT"),
      fetchWithTimeout("https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT"),
      fetchWithTimeout("https://api.binance.com/api/v3/ticker/24hr?symbol=USDTTRY"),
    ]);

    if (ethRes.ok && btcRes.ok && tryRes.ok) {
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
        source: "binance",
        timestamp: now,
      };

      cachedResult = result;
      cacheTime = now;
      return NextResponse.json(result);
    }
  } catch (e) {
    // Binance failed
  }

  // 2. CoinGecko dene
  try {
    const res = await fetchWithTimeout(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin,tether&vs_currencies=usd,try&include_24hr_change=true"
    );

    if (res.ok) {
      const data = await res.json();
      const result = {
        ethereum: {
          usd: data.ethereum?.usd || FALLBACK.ethereum.usd,
          usd_24h_change: data.ethereum?.usd_24h_change || 0,
        },
        bitcoin: {
          usd: data.bitcoin?.usd || FALLBACK.bitcoin.usd,
          usd_24h_change: data.bitcoin?.usd_24h_change || 0,
        },
        tether: {
          try: data.tether?.try || FALLBACK.tether.try,
        },
        source: "coingecko",
        timestamp: now,
      };

      cachedResult = result;
      cacheTime = now;
      return NextResponse.json(result);
    }
  } catch (e) {
    // CoinGecko failed
  }

  // 3. Cache varsa döndür
  if (cachedResult) {
    return NextResponse.json({ ...cachedResult, cached: true, stale: true });
  }

  // 4. Fallback
  return NextResponse.json({
    ...FALLBACK,
    source: "fallback",
    timestamp: now,
  });
}
