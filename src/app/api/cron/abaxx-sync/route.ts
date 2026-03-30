import { NextRequest, NextResponse } from "next/server";
import { syncAbaxxPrices } from "@/lib/abaxx-client";
import { computeAbaxxYields } from "@/lib/abaxx-yield";
import { Redis } from "@upstash/redis";

export const maxDuration = 30;

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// GET /api/cron/abaxx-sync — Fetch Abaxx futures prices and compute implied yields
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Step 1: Fetch latest futures prices from Abaxx WebSocket
    const prices = await syncAbaxxPrices();

    if (prices.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No prices received from Abaxx",
        timestamp: new Date().toISOString(),
      });
    }

    // Step 2: Compute implied yields from futures curve
    const yields = await computeAbaxxYields();

    // Step 3: Cache computed yields
    if (yields) {
      await redis.set("abaxx:yields:latest", JSON.stringify(yields), { ex: 600 });
    }

    // Summary for logging
    const activePrices = prices.filter((p) => p.midPrice && p.midPrice > 0);

    return NextResponse.json({
      success: true,
      futures: {
        total: prices.length,
        active: activePrices.length,
        symbols: activePrices.map((p) => ({
          symbol: p.symbol,
          mid: p.midPrice,
          bid: p.bidPrice,
          ask: p.askPrice,
          daysToExpiry: p.daysToExpiry,
        })),
      },
      yields: yields
        ? {
            gold3m: yields.gold["3m"]?.rate,
            gold6m: yields.gold["6m"]?.rate,
            gold12m: yields.gold["12m"]?.rate,
            spotPerOz: yields.spotPricePerOz,
          }
        : null,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[abaxx-sync] Error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
