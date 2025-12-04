import { NextResponse } from "next/server";

const BINANCE_TICKER_API = "https://api.binance.com/api/v3/ticker/price";
const BINANCE_24HR_API = "https://api.binance.com/api/v3/ticker/24hr";

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

async function fetchFromBinance() {
  // Her coin için ayrı istek yap (daha güvenilir)
  const symbols = [
    { symbol: "BTCUSDT", name: "bitcoin" },
    { symbol: "ETHUSDT", name: "ethereum" },
    { symbol: "XRPUSDT", name: "ripple" },
    { symbol: "SOLUSDT", name: "solana" },
  ];

  const prices: Record<string, { usd: number; usd_24h_change: number }> = {
    tether: { usd: 1, usd_24h_change: 0 },
  };

  await Promise.all(
    symbols.map(async ({ symbol, name }) => {
      try {
        const response = await fetch(
          `${BINANCE_24HR_API}?symbol=${symbol}`,
          { 
            cache: "no-store",
            headers: {
              'Accept': 'application/json',
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          prices[name] = {
            usd: parseFloat(data.lastPrice) || 0,
            usd_24h_change: parseFloat(data.priceChangePercent) || 0,
          };
        }
      } catch (e) {
        console.error(`Binance ${symbol} error:`, e);
      }
    })
  );

  // En az 2 fiyat geldiyse başarılı say
  const validPrices = Object.keys(prices).filter(k => k !== 'tether' && prices[k].usd > 0);
  if (validPrices.length < 2) {
    throw new Error("Not enough prices from Binance");
  }

  return prices;
}

export async function GET() {
  const now = Date.now();

  if (cachedData && now - lastFetchTime < CACHE_DURATION) {
    return NextResponse.json(cachedData);
  }

  try {
    const prices = await fetchFromBinance();
    const result = { ...prices, source: "binance", timestamp: now };
    cachedData = result;
    lastFetchTime = now;
    return NextResponse.json(result);
  } catch (error) {
    console.error("Binance error:", error);
    
    // Fallback to cached or default
    if (cachedData) {
      return NextResponse.json({ ...cachedData, cached: true });
    }
    return NextResponse.json({ ...FALLBACK_PRICES, source: "fallback" });
  }
}
