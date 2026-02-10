import { NextRequest, NextResponse } from "next/server";
import {
  computeAllYields,
  getYieldSnapshot,
  transformSnapshotToLegacyFormat,
  recordYieldHistory,
} from "@/lib/leasing/yield-builder";
import { smoothAllYields } from "@/lib/leasing/yield-smoother";

// NY Fed API for SOFR (no key required)
const NY_FED_RATES_URL = "https://markets.newyorkfed.org/api/rates/secured/sofr/last/1.json";

// Free gold price API
const GOLD_PRICE_API = "https://api.metals.live/v1/spot";

interface LeaseRates {
  gold: { "3m": number; "6m": number; "12m": number; "3m_low"?: number; "3m_high"?: number; "6m_low"?: number; "6m_high"?: number; "12m_low"?: number; "12m_high"?: number; "3m_range"?: boolean; "6m_range"?: boolean; "12m_range"?: boolean };
  silver: { "3m": number; "6m": number; "12m": number; "3m_low"?: number; "3m_high"?: number; "6m_low"?: number; "6m_high"?: number; "12m_low"?: number; "12m_high"?: number; "3m_range"?: boolean; "6m_range"?: boolean; "12m_range"?: boolean };
  platinum: { "3m": number; "6m": number; "12m": number; "3m_low"?: number; "3m_high"?: number; "6m_low"?: number; "6m_high"?: number; "12m_low"?: number; "12m_high"?: number; "3m_range"?: boolean; "6m_range"?: boolean; "12m_range"?: boolean };
  palladium: { "3m": number; "6m": number; "12m": number; "3m_low"?: number; "3m_high"?: number; "6m_low"?: number; "6m_high"?: number; "12m_low"?: number; "12m_high"?: number; "3m_range"?: boolean; "6m_range"?: boolean; "12m_range"?: boolean };
  lastUpdated: string;
  sofr: number;
  gofo?: number;
  source: string;
  [key: string]: any;
}

// Fallback rates if all systems fail
const FALLBACK_RATES: LeaseRates = {
  gold: { "3m": 1.53, "6m": 2.03, "12m": 2.53 },
  silver: { "3m": 1.23, "6m": 1.73, "12m": 2.23 },
  platinum: { "3m": 2.03, "6m": 2.53, "12m": 3.03 },
  palladium: { "3m": 1.83, "6m": 2.33, "12m": 2.83 },
  lastUpdated: new Date().toISOString(),
  sofr: 4.33,
  gofo: 1.5,
  source: "fallback",
};

async function fetchSOFR(): Promise<number> {
  try {
    const response = await fetch(NY_FED_RATES_URL, {
      next: { revalidate: 3600 }
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
    return gold?.price || 2650;
  } catch {
    return 2650;
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

// Legacy SOFR-GOFO calculation (used as additional fallback)
function calculateLegacyRates(sofr: number, goldSpot: number): LeaseRates {
  const estimatedFutures6m = goldSpot * 1.012;
  const gofo = ((estimatedFutures6m - goldSpot) / goldSpot) * (365 / 180) * 100;
  const baseRate = Math.max(0.5, sofr - gofo);

  return {
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
}

// GET - Fetch current rates (yield builder → smoothed → legacy format)
export async function GET() {
  try {
    const sofr = await fetchSOFR();

    // Try yield builder first (counterparty quotes → blended rates)
    let snapshot = await getYieldSnapshot();

    if (snapshot) {
      // Use cached yield snapshot
      const legacyRates = transformSnapshotToLegacyFormat(snapshot);
      legacyRates.sofr = round(sofr);

      return NextResponse.json({
        success: true,
        rates: legacyRates,
        engine: 'yield_builder',
        source: snapshot.source,
        debug: { sofr, computedAt: snapshot.computedAt },
      });
    }

    // Try computing fresh yields
    try {
      snapshot = await computeAllYields();

      // Apply smoothing
      const smoothed = await smoothAllYields(snapshot.metals);

      // Record history for each metal
      for (const [, tenors] of Object.entries(snapshot.metals)) {
        for (const [, computed] of Object.entries(tenors)) {
          await recordYieldHistory(computed);
        }
      }

      const legacyRates = transformSnapshotToLegacyFormat(snapshot);
      legacyRates.sofr = round(sofr);

      return NextResponse.json({
        success: true,
        rates: legacyRates,
        engine: 'yield_builder',
        source: snapshot.source,
        debug: {
          sofr,
          computedAt: snapshot.computedAt,
          smoothingApplied: true,
        },
      });
    } catch (yieldError) {
      console.warn('Yield builder failed, falling back to SOFR-GOFO calculation:', yieldError);
    }

    // Fallback: Legacy SOFR-GOFO calculation
    const goldSpot = await fetchGoldSpot();
    const rates = calculateLegacyRates(sofr, goldSpot);

    return NextResponse.json({
      success: true,
      rates,
      engine: 'legacy_sofr_gofo',
      debug: { sofr, goldSpot },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      rates: FALLBACK_RATES,
      engine: 'fallback',
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// POST - Compute and store rates (called by cron)
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Compute fresh yields from counterparty quotes
    const snapshot = await computeAllYields();

    // Apply smoothing
    const smoothed = await smoothAllYields(snapshot.metals);

    // Record history
    for (const [, tenors] of Object.entries(snapshot.metals)) {
      for (const [, computed] of Object.entries(tenors)) {
        await recordYieldHistory(computed);
      }
    }

    // Also fetch SOFR for reference
    const sofr = await fetchSOFR();

    const legacyRates = transformSnapshotToLegacyFormat(snapshot);
    legacyRates.sofr = round(sofr);

    console.log("✅ Lease rates computed via yield builder:", JSON.stringify({
      source: snapshot.source,
      computedAt: new Date(snapshot.computedAt).toISOString(),
    }));

    return NextResponse.json({
      success: true,
      message: "Rates computed and stored via yield builder",
      rates: legacyRates,
      engine: 'yield_builder',
      source: snapshot.source,
    });
  } catch (error) {
    console.error("❌ Yield builder rate update failed:", error);

    // Fallback to legacy
    try {
      const [sofr, goldSpot] = await Promise.all([fetchSOFR(), fetchGoldSpot()]);
      const rates = calculateLegacyRates(sofr, goldSpot);

      return NextResponse.json({
        success: true,
        message: "Rates computed via legacy SOFR-GOFO (yield builder unavailable)",
        rates,
        engine: 'legacy_sofr_gofo',
      });
    } catch (fallbackError) {
      return NextResponse.json({
        success: false,
        error: fallbackError instanceof Error ? fallbackError.message : "Unknown error",
      }, { status: 500 });
    }
  }
}
