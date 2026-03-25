// src/app/api/cron/store-daily-close/route.ts
// Stores daily closing metal prices at market close (weekdays 21:00 UTC)
// Used by daily-price-alert cron to calculate day-over-day % change

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

interface ClosingPrices {
  gold: number;
  silver: number;
  platinum: number;
  palladium: number;
  timestamp: number;
  date: string;
}

export async function GET(request: NextRequest) {
  // Cron secret check
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Read current metal prices from Redis cache
    const cached = await redis.get("metal:prices:cache");
    const stale = await redis.get("metal:prices:stale");

    const priceData = cached || stale;

    if (!priceData) {
      return NextResponse.json(
        { success: false, error: "No price data available in cache" },
        { status: 500 }
      );
    }

    const prices =
      typeof priceData === "string" ? JSON.parse(priceData) : priceData;

    // Format today's date as YYYY-MM-DD
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0]; // e.g. "2026-03-25"

    const closingPrices: ClosingPrices = {
      gold: prices.gold,
      silver: prices.silver,
      platinum: prices.platinum,
      palladium: prices.palladium,
      timestamp: Date.now(),
      date: dateStr,
    };

    const serialized = JSON.stringify(closingPrices);

    // Store with date key (keeps history)
    await redis.set(`prices:daily:close:${dateStr}`, serialized);

    // Also update the "latest" key (used by daily-price-alert)
    await redis.set("prices:daily:close:latest", serialized);

    console.log(
      `[StoreDailyClose] Stored closing prices for ${dateStr}: Gold=$${prices.gold.toFixed(2)}/g, Silver=$${prices.silver.toFixed(2)}/g, Platinum=$${prices.platinum.toFixed(2)}/g, Palladium=$${prices.palladium.toFixed(2)}/g`
    );

    return NextResponse.json({
      success: true,
      date: dateStr,
      prices: {
        gold: prices.gold,
        silver: prices.silver,
        platinum: prices.platinum,
        palladium: prices.palladium,
      },
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error("[StoreDailyClose] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Manual trigger
export async function POST(request: NextRequest) {
  return GET(request);
}
