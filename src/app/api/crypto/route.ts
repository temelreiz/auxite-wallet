import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_SETTINGS = {
  ETH: { askAdjust: 1, bidAdjust: -0.5 },
  BTC: { askAdjust: 1, bidAdjust: -0.5 },
};

const SETTINGS_KEY = "auxite:price-settings";

// Redis'ten settings al
async function getSettings() {
  try {
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    const settings = await redis.get(SETTINGS_KEY);
    if (settings && typeof settings === "object") {
      return { ...DEFAULT_SETTINGS, ...(settings as any) };
    }
  } catch (e) {
    console.error("Redis settings error:", e);
  }
  return DEFAULT_SETTINGS;
}

export async function GET() {
  // Settings al
  const settings = await getSettings();
  const ethSettings = settings.ETH || DEFAULT_SETTINGS.ETH;
  const btcSettings = settings.BTC || DEFAULT_SETTINGS.BTC;

  // 1. Kraken API
  try {
    const res = await fetch(
      "https://api.kraken.com/0/public/Ticker?pair=ETHUSD,XBTUSD",
      { cache: 'no-store' }
    );

    if (res.ok) {
      const data = await res.json();
      if (!data.error || data.error.length === 0) {
        const ethResult = data.result?.XETHZUSD || data.result?.ETHUSD;
        const btcResult = data.result?.XXBTZUSD || data.result?.XBTUSD;
        
        const ethBase = parseFloat(ethResult?.c?.[0] || "0");
        const btcBase = parseFloat(btcResult?.c?.[0] || "0");
        
        // 24h değişim hesapla
        const ethOpen = parseFloat(ethResult?.o || "0");
        const btcOpen = parseFloat(btcResult?.o || "0");
        const ethChange = ethOpen > 0 ? ((ethBase - ethOpen) / ethOpen) * 100 : 0;
        const btcChange = btcOpen > 0 ? ((btcBase - btcOpen) / btcOpen) * 100 : 0;
        
        // Spread uygula
        const ethAsk = ethBase * (1 + ethSettings.askAdjust / 100);
        const ethBid = ethBase * (1 + ethSettings.bidAdjust / 100);
        const btcAsk = btcBase * (1 + btcSettings.askAdjust / 100);
        const btcBid = btcBase * (1 + btcSettings.bidAdjust / 100);
        
        // TRY kuru
        let tryRate = 34.5;
        try {
          const tryRes = await fetch(
            "https://api.exchangerate-api.com/v4/latest/USD",
            { cache: 'no-store' }
          );
          if (tryRes.ok) {
            const tryData = await tryRes.json();
            tryRate = tryData.rates?.TRY || 34.5;
          }
        } catch {}

        if (ethBase > 0 && btcBase > 0) {
          return NextResponse.json({
            ethereum: { 
              usd: Math.round(ethAsk * 100) / 100,
              usd_base: Math.round(ethBase * 100) / 100,
              usd_bid: Math.round(ethBid * 100) / 100,
              usd_24h_change: Math.round(ethChange * 100) / 100,
            },
            bitcoin: { 
              usd: Math.round(btcAsk * 100) / 100,
              usd_base: Math.round(btcBase * 100) / 100,
              usd_bid: Math.round(btcBid * 100) / 100,
              usd_24h_change: Math.round(btcChange * 100) / 100,
            },
            tether: { try: tryRate },
            settings: { ETH: ethSettings, BTC: btcSettings },
            source: "kraken",
            timestamp: Date.now(),
          });
        }
      }
    }
  } catch (e) {}

  // 2. CoinGecko fallback
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin,tether&vs_currencies=usd,try&include_24hr_change=true",
      { cache: 'no-store' }
    );

    if (res.ok) {
      const data = await res.json();
      if (data.ethereum && data.bitcoin) {
        const ethBase = data.ethereum?.usd || 0;
        const btcBase = data.bitcoin?.usd || 0;
        
        return NextResponse.json({
          ethereum: {
            usd: Math.round(ethBase * (1 + ethSettings.askAdjust / 100) * 100) / 100,
            usd_base: ethBase,
            usd_bid: Math.round(ethBase * (1 + ethSettings.bidAdjust / 100) * 100) / 100,
            usd_24h_change: Math.round((data.ethereum?.usd_24h_change || 0) * 100) / 100,
          },
          bitcoin: {
            usd: Math.round(btcBase * (1 + btcSettings.askAdjust / 100) * 100) / 100,
            usd_base: btcBase,
            usd_bid: Math.round(btcBase * (1 + btcSettings.bidAdjust / 100) * 100) / 100,
            usd_24h_change: Math.round((data.bitcoin?.usd_24h_change || 0) * 100) / 100,
          },
          tether: { try: data.tether?.try || 34.5 },
          settings: { ETH: ethSettings, BTC: btcSettings },
          source: "coingecko",
          timestamp: Date.now(),
        });
      }
    }
  } catch (e) {}

  // 3. Fallback
  return NextResponse.json({
    ethereum: { usd: 3500, usd_base: 3500, usd_bid: 3500, usd_24h_change: 0 },
    bitcoin: { usd: 95000, usd_base: 95000, usd_bid: 95000, usd_24h_change: 0 },
    tether: { try: 34.5 },
    settings: { ETH: ethSettings, BTC: btcSettings },
    source: "fallback",
    timestamp: Date.now(),
  });
}
