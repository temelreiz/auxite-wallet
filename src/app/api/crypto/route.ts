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
        const ethPrice = parseFloat(data.result?.XETHZUSD?.c?.[0] || data.result?.ETHUSD?.c?.[0] || "0");
        const btcPrice = parseFloat(data.result?.XXBTZUSD?.c?.[0] || data.result?.XBTUSD?.c?.[0] || "0");
        
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
            ethereum: { usd: ethPrice, usd_24h_change: 0 },
            bitcoin: { usd: btcPrice, usd_24h_change: 0 },
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
            usd_24h_change: data.ethereum?.usd_24h_change || 0,
          },
          bitcoin: {
            usd: data.bitcoin?.usd || 0,
            usd_24h_change: data.bitcoin?.usd_24h_change || 0,
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
