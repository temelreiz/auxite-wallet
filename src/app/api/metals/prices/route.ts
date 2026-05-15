// src/app/api/metals/prices/route.ts
// Public endpoint — returns current + previous-close metal prices in USD/gram.
// Used by mobile Lite Home for "Today's Prices" + 24h portfolio change.
//
// System standard is USD/gram (price-cache.ts enforces gold < $500/g).
// We defensively normalize oz→gram if any source is stale (matches the
// existing inline guards in store-daily-close and daily-price-alert crons).

import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const TROY_OUNCE_TO_GRAMS = 31.1034768;

function normalize(p: any) {
  if (!p) return null;
  if (p.gold > 500) {
    return {
      gold: p.gold / TROY_OUNCE_TO_GRAMS,
      silver: p.silver / TROY_OUNCE_TO_GRAMS,
      platinum: p.platinum / TROY_OUNCE_TO_GRAMS,
      palladium: p.palladium / TROY_OUNCE_TO_GRAMS,
      timestamp: p.timestamp,
      date: p.date,
    };
  }
  return p;
}

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [currentRaw, closeRaw, staleRaw] = await Promise.all([
      redis.get("metal:prices:cache"),
      redis.get("prices:daily:close:latest"),
      redis.get("metal:prices:stale"),
    ]);

    const current =
      currentRaw
        ? typeof currentRaw === "string"
          ? JSON.parse(currentRaw)
          : currentRaw
        : staleRaw
        ? typeof staleRaw === "string"
          ? JSON.parse(staleRaw)
          : staleRaw
        : null;

    const previousClose =
      closeRaw
        ? typeof closeRaw === "string"
          ? JSON.parse(closeRaw)
          : closeRaw
        : null;

    return NextResponse.json(
      {
        success: true,
        current: normalize(current),
        previousClose: normalize(previousClose),
        unit: "gram",
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || "Failed to load prices" },
      { status: 500 }
    );
  }
}
