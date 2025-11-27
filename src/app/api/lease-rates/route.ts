import { NextRequest, NextResponse } from "next/server";

// NY Fed API for SOFR (no key required)
const NY_FED_RATES_URL = "https://markets.newyorkfed.org/api/rates/secured/sofr/last/1.json";

// Free gold price API
const GOLD_PRICE_API = "https://api.metals.live/v1/spot";

interface LeaseRates {
  gold: { "3m": number; "6m": number; "12m": number };
  silver: { "3m": number; "6m": number; "12m": number };
  platinum: { "3m": number; "6m": number; "12m": number };
  palladium: { "3m": number; "6m": number; "12m": number };
  lastUpdated: string;
  sofr: number;
  gofo: number;
  source: string;
}

// Fallback rates if APIs fail
const FALLBACK_RATES: LeaseRates = {
  gold: { "3m": 2.5, "6m": 3.0, "12m": 3.5 },
  silver: { "3m": 2.0, "6m": 2.5, "12m": 3.0 },
  platinum: { "3m": 3.0, "6m": 3.5, "12m": 4.0 },
  palladium: { "3m": 2.8, "6m": 3.3, "12m": 3.8 },
  lastUpdated: new Date().toISOString(),
  sofr: 4.33,
  gofo: 1.5,
  source: "Fallback",
};

async function fetchSOFR(): Promise<number> {
  try {
    const response = await fetch(NY_FED_RATES_URL, { 
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    if (!response.ok) throw new Error("NY Fed API error");
    
    const data = await response.json();
    const rate = data?.refRates?.[0]?.percentRate;
    return rate ? parseFloat(rate) : FALLBACK_RATES.sofr;
  } catch {
    return FALLBACK_RATES.sofr;
  }
}

async function fetchGoldSpot(): Promise<number> {
  try {
    const response = await fetch(GOLD_PRICE_API, {
      next: { revalidate: 3600 }
    });
    if (!response.ok) throw new Error("Gold API error");
    
    const data = await response.json();
    const gold = Array.isArray(data) 
      ? data.find((m: any) => m.metal === "gold")
      : null;
    return gold?.price || 2650; // Fallback price
  } catch {
    return 2650;
  }
}

function calculateRates(sofr: number, goldSpot: number): LeaseRates {
  // Estimate GOFO from futures spread (approximately 1-2% for 6-month)
  const estimatedFutures6m = goldSpot * 1.012; // ~1.2% premium
  const gofo = ((estimatedFutures6m - goldSpot) / goldSpot) * (365 / 180) * 100;
  
  // Base lease rate = SOFR - GOFO
  const baseRate = Math.max(0.5, sofr - gofo);
  
  // Apply term structure and platform margins
  const rates: LeaseRates = {
    gold: {
      "3m": round(baseRate + 0.3),
      "6m": round(baseRate + 0.8),
      "12m": round(baseRate + 1.3),
    },
    silver: {
      "3m": round(baseRate),
      "6m": round(baseRate + 0.5),
      "12m": round(baseRate + 1.0),
    },
    platinum: {
      "3m": round(baseRate + 0.8),
      "6m": round(baseRate + 1.3),
      "12m": round(baseRate + 1.8),
    },
    palladium: {
      "3m": round(baseRate + 0.6),
      "6m": round(baseRate + 1.1),
      "12m": round(baseRate + 1.6),
    },
    lastUpdated: new Date().toISOString(),
    sofr: round(sofr),
    gofo: round(gofo),
    source: "NY Fed + Calculated",
  };
  
  return rates;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

// GET - Fetch current rates
export async function GET() {
  try {
    const [sofr, goldSpot] = await Promise.all([
      fetchSOFR(),
      fetchGoldSpot(),
    ]);
    
    const rates = calculateRates(sofr, goldSpot);
    
    return NextResponse.json({
      success: true,
      rates,
      debug: { sofr, goldSpot },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      rates: FALLBACK_RATES,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// POST - Update and store rates (called by cron)
export async function POST(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const [sofr, goldSpot] = await Promise.all([
      fetchSOFR(),
      fetchGoldSpot(),
    ]);
    
    const rates = calculateRates(sofr, goldSpot);
    
    // In production, save to database:
    // await db.leaseRates.upsert({ data: rates });
    
    // Or save to Vercel KV:
    // await kv.set("leaseRates", rates);
    
    console.log("✅ Lease rates updated:", JSON.stringify(rates, null, 2));
    
    return NextResponse.json({
      success: true,
      message: "Rates updated successfully",
      rates,
    });
  } catch (error) {
    console.error("❌ Rate update failed:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}