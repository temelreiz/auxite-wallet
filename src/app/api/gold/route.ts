import { NextRequest, NextResponse } from "next/server";

const API_BASE = "https://api.auxite.io/api/prices";

// Cache for stable values (stored in memory during server runtime)
let cachedData: {
  changes: Record<string, number>;
  directions: Record<string, "up" | "down" | "neutral">;
  lastCalculation: number;
} | null = null;

const CACHE_DURATION = 3600000; // 1 hour - recalculate changes/directions only every hour

// Deterministic but varied changes based on symbol
function calculateStableChange(symbol: string, currentPrice: number): { change: number; direction: "up" | "down" | "neutral" } {
  // Use symbol as seed for deterministic but varied values
  const seed = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Create pseudo-random but stable value using sine
  const pseudoRandom = Math.sin(seed + Date.now() / CACHE_DURATION) * 10000;
  const normalizedRandom = (pseudoRandom - Math.floor(pseudoRandom)) - 0.5; // -0.5 to 0.5
  
  // Generate change between -2% and +2%
  const change = Math.round(normalizedRandom * 4 * 100) / 100;
  
  // Determine direction
  let direction: "up" | "down" | "neutral";
  if (change > 0.3) direction = "up";
  else if (change < -0.3) direction = "down";
  else direction = "neutral";
  
  return { change, direction };
}

export async function GET(request: NextRequest) {
  try {
    const res = await fetch(`${API_BASE}?chain=84532`, {
      cache: "no-cache",
    });

    if (!res.ok) {
      throw new Error("API fetch error");
    }

    const json = await res.json();

    // Transform to the format hook expects
    const prices: Record<string, number> = {};
    const bidPrices: Record<string, number> = {};
    const directions: Record<string, "up" | "down" | "neutral"> = {};
    const changes: Record<string, number> = {};

    const spread = 0.0038; // 0.38% spread
    const now = Date.now();

    // Check if we need to recalculate cached values
    if (!cachedData || (now - cachedData.lastCalculation > CACHE_DURATION)) {
      cachedData = {
        changes: {},
        directions: {},
        lastCalculation: now,
      };

      // Calculate stable changes for each symbol
      for (const item of json.data || []) {
        const symbol = item.symbol;
        const pricePerGram = item.price / 31.1035;
        const { change, direction } = calculateStableChange(symbol, pricePerGram);
        
        cachedData.changes[symbol] = change;
        cachedData.directions[symbol] = direction;
      }
    }

    // Build response using cached changes/directions
    for (const item of json.data || []) {
      const symbol = item.symbol; // AUXG, AUXS, etc.
      const pricePerGram = item.price / 31.1035; // Convert oz to gram

      prices[symbol] = Math.round(pricePerGram * 100) / 100;
      bidPrices[symbol] = Math.round(pricePerGram * (1 - spread) * 100) / 100;
      
      // Use cached values
      directions[symbol] = cachedData.directions[symbol] || "neutral";
      changes[symbol] = cachedData.changes[symbol] || 0;
    }

    return NextResponse.json({
      prices,
      bidPrices,
      directions,
      changes,
      timestamp: now,
      source: "auxite",
    });
  } catch (error) {
    console.error("Price API error:", error);
    
    // Return fallback with stable values
    return NextResponse.json({
      prices: {
        AUXG: 132.50,
        AUXS: 1.65,
        AUXPT: 49.80,
        AUXPD: 45.00,
      },
      bidPrices: {
        AUXG: 132.00,
        AUXS: 1.64,
        AUXPT: 49.60,
        AUXPD: 44.80,
      },
      directions: {
        AUXG: "up",
        AUXS: "down",
        AUXPT: "up",
        AUXPD: "down",
      },
      changes: {
        AUXG: 1.05,
        AUXS: -0.75,
        AUXPT: 0.82,
        AUXPD: -0.45,
      },
      timestamp: Date.now(),
      source: "fallback",
    });
  }
}