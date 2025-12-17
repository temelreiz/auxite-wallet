import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

const TREND_KEY_PREFIX = "trend:";
const TREND_EXPIRY = 60 * 60 * 24; // 24 saat

// GET: Trend verilerini döndür
export async function GET() {
  try {
    const symbols = ["AUXG", "AUXS", "AUXPT", "AUXPD"];
    
    const trends = await Promise.all(
      symbols.map(async (symbol) => {
        const buyKey = `${TREND_KEY_PREFIX}${symbol}:buy`;
        const sellKey = `${TREND_KEY_PREFIX}${symbol}:sell`;
        
        const [buyCount, sellCount] = await Promise.all([
          redis.get<number>(buyKey),
          redis.get<number>(sellKey),
        ]);
        
        const buy = buyCount || 0;
        const sell = sellCount || 0;
        const total = buy + sell;
        
        // Eğer hiç işlem yoksa, simüle edilmiş veri
        if (total === 0) {
          const fakeBuy = Math.floor(40 + Math.random() * 30);
          return {
            symbol,
            buyVolume: fakeBuy,
            sellVolume: 100 - fakeBuy,
            trend: fakeBuy > 50 ? "buy" : "sell",
            totalTrades: 0,
          };
        }
        
        const buyVolume = Math.round((buy / total) * 100);
        const sellVolume = 100 - buyVolume;
        
        return {
          symbol,
          buyVolume,
          sellVolume,
          trend: buyVolume > sellVolume ? "buy" : buyVolume < sellVolume ? "sell" : "neutral",
          totalTrades: total,
        };
      })
    );

    // En aktif 2 metali seç (toplam işlem sayısına göre)
    const sortedTrends = trends
      .sort((a, b) => b.totalTrades - a.totalTrades)
      .slice(0, 2)
      .map(({ totalTrades, ...rest }) => rest); // totalTrades'i response'dan çıkar

    return NextResponse.json({ ok: true, trends: sortedTrends });
  } catch (error) {
    console.error("Trends GET error:", error);
    // Hata durumunda default veri dön
    return NextResponse.json({
      ok: true,
      trends: [
        { symbol: "AUXG", buyVolume: 62, sellVolume: 38, trend: "buy" },
        { symbol: "AUXS", buyVolume: 45, sellVolume: 55, trend: "sell" },
      ],
    });
  }
}

// POST: İşlem kaydı ekle
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { symbol, action } = body;

    if (!symbol || !action) {
      return NextResponse.json({ ok: false, error: "Missing symbol or action" }, { status: 400 });
    }

    if (!["buy", "sell"].includes(action)) {
      return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
    }

    const validSymbols = ["AUXG", "AUXS", "AUXPT", "AUXPD"];
    if (!validSymbols.includes(symbol)) {
      return NextResponse.json({ ok: false, error: "Invalid symbol" }, { status: 400 });
    }

    const key = `${TREND_KEY_PREFIX}${symbol}:${action}`;
    
    // Increment ve expiry ayarla
    await redis.incr(key);
    await redis.expire(key, TREND_EXPIRY);

    return NextResponse.json({ ok: true, message: "Trend updated" });
  } catch (error) {
    console.error("Trends POST error:", error);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
