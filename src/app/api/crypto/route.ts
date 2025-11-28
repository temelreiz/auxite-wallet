import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  // 1. Kraken API (ABD'de çalışır)
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
        
        const ethPrice = parseFloat(ethResult?.c?.[0] || "0");
        const btcPrice = parseFloat(btcResult?.c?.[0] || "0");
        
        // 24h değişim hesapla (open vs current)
        const ethOpen = parseFloat(ethResult?.o || "0");
        const btcOpen = parseFloat(btcResult?.o || "0");
        
        const ethChange = ethOpen > 0 ? ((ethPrice - ethOpen) / ethOpen) * 100 : 0;
        const btcChange = btcOpen > 0 ? ((btcPrice - btcOpen) / btcOpen) * 100 : 0;
        
        // TRY için ayrı istek
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

        if (ethPrice > 0 && btcPrice > 0) {
          return NextResponse.json({
            ethereum: { 
              usd: ethPrice, 
              usd_24h_change: Math.round(ethChange * 100) / 100 
            },
            bitcoin: { 
              usd: btcPrice, 
              usd_24h_change: Math.round(btcChange * 100) / 100 
            },
            tether: { try: tryRate },
            source: "kraken",
            timestamp: Date.now(),
          });
        }
      }
    }
  } catch (e) {}

  // 2. CoinGecko (backup)
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin,tether&vs_currencies=usd,try&include_24hr_change=true",
      { cache: 'no-store' }
    );

    if (res.ok) {
      const data = await res.json();
      if (data.ethereum && data.bitcoin) {
        return NextResponse.json({
          ethereum: {
            usd: data.ethereum?.usd || 0,
            usd_24h_change: Math.round((data.ethereum?.usd_24h_change || 0) * 100) / 100,
          },
          bitcoin: {
            usd: data.bitcoin?.usd || 0,
            usd_24h_change: Math.round((data.bitcoin?.usd_24h_change || 0) * 100) / 100,
          },
          tether: { try: data.tether?.try || 34.5 },
          source: "coingecko",
          timestamp: Date.now(),
        });
      }
    }
  } catch (e) {}

  // 3. Fallback
  return NextResponse.json({
    ethereum: { usd: 3500, usd_24h_change: 0 },
    bitcoin: { usd: 95000, usd_24h_change: 0 },
    tether: { try: 34.5 },
    source: "fallback",
    timestamp: Date.now(),
  });
}
