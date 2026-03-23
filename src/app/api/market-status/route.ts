// src/app/api/market-status/route.ts
// Market status endpoint — returns open/closed state, price type, and last known prices

import { NextResponse } from "next/server";
import { getMarketStatus, getPriceType } from "@/lib/market-hours";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const FALLBACK_PRICES: Record<string, number> = {
  auxg: 162.4,
  auxs: 2.86,
  auxpt: 73.3,
  auxpd: 58.5,
};

export async function GET() {
  try {
    const status = getMarketStatus();
    const priceType = getPriceType();

    let lastPrice: Record<string, number> = { ...FALLBACK_PRICES };

    try {
      // Cache and stale are already in $/gram (converted by price-cache.ts)
      const cached = await redis.get("metal:prices:cache");
      const source = cached || await redis.get("metal:prices:stale");
      if (source) {
        const data = typeof source === "string" ? JSON.parse(source) : source;
        if (data.gold) lastPrice.auxg = data.gold;
        if (data.silver) lastPrice.auxs = data.silver;
        if (data.platinum) lastPrice.auxpt = data.platinum;
        if (data.palladium) lastPrice.auxpd = data.palladium;
      }
    } catch (cacheError) {
      console.warn("Failed to fetch cached prices for market-status:", cacheError);
    }

    const roundedPrices: Record<string, number> = {
      auxg: Math.round(lastPrice.auxg * 100) / 100,
      auxs: Math.round(lastPrice.auxs * 1000) / 1000,
      auxpt: Math.round(lastPrice.auxpt * 100) / 100,
      auxpd: Math.round(lastPrice.auxpd * 100) / 100,
    };

    return NextResponse.json({
      success: true,
      open: status.open,
      label: status.label,
      lastPrice: roundedPrices,
      priceType,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Market status error:", message);

    const status = getMarketStatus();
    const priceType = getPriceType();

    return NextResponse.json({
      success: true,
      open: status.open,
      label: status.label,
      lastPrice: FALLBACK_PRICES,
      priceType,
      timestamp: new Date().toISOString(),
      stale: true,
    });
  }
}
