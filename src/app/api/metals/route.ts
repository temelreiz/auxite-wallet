import { NextResponse } from "next/server";
import { METALS } from "@/lib/metals";

const API_BASE = "https://api.auxite.io/api/prices";
const GOLDAPI_BASE = "https://www.goldapi.io/api";
const GOLDAPI_KEY = process.env.GOLDAPI_KEY || process.env.NEXT_PUBLIC_GOLDAPI_KEY || "";

const METAL_SYMBOLS: Record<string, string> = {
  AUXG: "XAU",
  AUXS: "XAG",
  AUXPT: "XPT",
  AUXPD: "XPD",
};

// Cache for GoldAPI responses (to avoid rate limits)
let changeCache: Record<string, { change: number; timestamp: number }> = {};
const CACHE_TTL = 60000; // 1 minute

async function getGoldAPIChange(symbol: string): Promise<number> {
  const cacheKey = symbol;
  const now = Date.now();
  
  // Return cached value if fresh
  if (changeCache[cacheKey] && now - changeCache[cacheKey].timestamp < CACHE_TTL) {
    return changeCache[cacheKey].change;
  }
  
  try {
    const res = await fetch(`${GOLDAPI_BASE}/${symbol}/USD`, {
      headers: {
        "x-access-token": GOLDAPI_KEY,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    
    if (res.ok) {
      const data = await res.json();
      const change = data.chp || 0; // chp = change percent
      changeCache[cacheKey] = { change, timestamp: now };
      return change;
    }
  } catch (err) {
    console.error(`GoldAPI error for ${symbol}:`, err);
  }
  
  return changeCache[cacheKey]?.change || 0;
}

export async function GET() {
  try {
    // Auxite fiyat API'sinden fiyatları çekiyoruz
    const res = await fetch(`${API_BASE}?chain=84532`, {
      cache: "no-cache",
    });

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: "api_fetch_error" });
    }

    const json = await res.json();

    // Get 24h changes from GoldAPI (parallel requests)
    const changePromises = Object.entries(METAL_SYMBOLS).map(async ([auxSymbol, goldSymbol]) => {
      const change = await getGoldAPIChange(goldSymbol);
      return [auxSymbol, change] as [string, number];
    });
    
    const changeResults = await Promise.all(changePromises);
    const changes: Record<string, number> = Object.fromEntries(changeResults);

    // UI'ın istediği format:
    const metals = METALS.map((m) => {
      const priceObj = json.data.find((p: any) => p.symbol === m.id);
      return {
        id: m.id,
        symbol: m.symbol,
        name: m.name,
        priceOz: priceObj?.price ?? null,
        ts: priceObj?.ts ?? null,
      };
    });

    return NextResponse.json({
      ok: true,
      data: metals,
      changes: changes,
      updatedAt: json.updatedAt,
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: err.message || "unknown_error",
    });
  }
}
