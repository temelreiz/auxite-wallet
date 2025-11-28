import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const DEFAULT_SETTINGS = {
  AUXG: { askAdjust: 2, bidAdjust: -1 },
  AUXS: { askAdjust: 3, bidAdjust: -1.5 },
  AUXPT: { askAdjust: 2.5, bidAdjust: -1.25 },
  AUXPD: { askAdjust: 2.5, bidAdjust: -1.25 },
  ETH: { askAdjust: 1, bidAdjust: -0.5 },
  BTC: { askAdjust: 1, bidAdjust: -0.5 },
};

const SETTINGS_KEY = "auxite:price-settings";

// Lazy Redis client
async function getRedis() {
  const { Redis } = await import("@upstash/redis");
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

export async function GET() {
  try {
    const redis = await getRedis();
    const settings = await redis.get(SETTINGS_KEY);
    if (settings && typeof settings === "object") {
      return NextResponse.json({ ...DEFAULT_SETTINGS, ...settings });
    }
    return NextResponse.json(DEFAULT_SETTINGS);
  } catch (e) {
    console.error("Redis GET error:", e);
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}

export async function POST(request: NextRequest) {
  try {
    const settings = await request.json();
    
    const validSymbols = ["AUXG", "AUXS", "AUXPT", "AUXPD", "ETH", "BTC"];
    
    for (const symbol of validSymbols) {
      if (settings[symbol]) {
        if (typeof settings[symbol].askAdjust !== "number" || 
            typeof settings[symbol].bidAdjust !== "number") {
          return NextResponse.json(
            { error: `Invalid settings format for ${symbol}` },
            { status: 400 }
          );
        }
        
        if (settings[symbol].askAdjust < -50 || settings[symbol].askAdjust > 50 ||
            settings[symbol].bidAdjust < -50 || settings[symbol].bidAdjust > 50) {
          return NextResponse.json(
            { error: `Values for ${symbol} must be between -50 and 50` },
            { status: 400 }
          );
        }
      }
    }
    
    const redis = await getRedis();
    const mergedSettings = { ...DEFAULT_SETTINGS, ...settings };
    await redis.set(SETTINGS_KEY, mergedSettings);
    
    return NextResponse.json({ success: true, settings: mergedSettings });
  } catch (e: any) {
    console.error("Redis POST error:", e);
    return NextResponse.json(
      { error: e.message || "Failed to save settings" },
      { status: 500 }
    );
  }
}
