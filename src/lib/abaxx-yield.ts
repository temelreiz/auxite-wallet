// ============================================
// ABAXX FUTURES-IMPLIED YIELD CALCULATOR
// Calculates implied yield from futures-spot spread
// Formula: yield = ((futures - spot) / spot) × (365 / daysToExpiry) × 100
// ============================================

import { getAllCachedFutures, type AbaxxFuturesData } from "./abaxx-client";
import { getMetalPrices } from "./price-cache";

// Troy ounce to grams conversion
const TROY_OUNCE_TO_GRAMS = 31.1035;

export interface ImpliedYield {
  tenor: "3m" | "6m" | "12m";
  rate: number; // Annualized yield %
  futuresSymbol: string;
  futuresPrice: number; // $/oz (Abaxx quotes per oz)
  spotPrice: number; // $/oz
  daysToExpiry: number;
  spread: number; // futures - spot in $
  source: "abaxx_futures";
}

export interface AbaxxYieldSnapshot {
  gold: {
    "3m": ImpliedYield | null;
    "6m": ImpliedYield | null;
    "12m": ImpliedYield | null;
  };
  spotPricePerOz: number;
  spotPricePerGram: number;
  computedAt: string;
  source: "abaxx_futures";
}

// Tenor target days for matching contracts
const TENOR_TARGETS: Record<string, number> = {
  "3m": 90,
  "6m": 180,
  "12m": 365,
};

// Maximum days difference to consider a contract valid for a tenor
const MAX_DAYS_DIFF = 60;

/**
 * Find the best matching contract for a given tenor
 */
function findBestContract(
  contracts: AbaxxFuturesData[],
  targetDays: number
): AbaxxFuturesData | null {
  // Filter to contracts with valid mid price
  const valid = contracts.filter(
    (c) => c.midPrice && c.midPrice > 0 && c.status === "Trading"
  );

  if (valid.length === 0) return null;

  // Sort by how close daysToExpiry is to target
  valid.sort(
    (a, b) =>
      Math.abs(a.daysToExpiry - targetDays) -
      Math.abs(b.daysToExpiry - targetDays)
  );

  const best = valid[0];

  // Reject if too far from target
  if (Math.abs(best.daysToExpiry - targetDays) > MAX_DAYS_DIFF) {
    return null;
  }

  return best;
}

/**
 * Calculate annualized implied yield from futures-spot spread
 */
function calculateImpliedYield(
  spotPriceOz: number,
  futuresPrice: number,
  daysToExpiry: number
): number {
  if (spotPriceOz <= 0 || futuresPrice <= 0 || daysToExpiry <= 0) return 0;

  const spread = futuresPrice - spotPriceOz;
  const annualizedYield = (spread / spotPriceOz) * (365 / daysToExpiry) * 100;

  // Cap at reasonable range (-5% to 20%)
  return Math.max(-5, Math.min(20, annualizedYield));
}

/**
 * Interpolate or extrapolate yield for missing tenors
 */
function interpolateYield(
  yields: Map<string, ImpliedYield>,
  tenor: string,
  targetDays: number,
  spotPriceOz: number
): ImpliedYield | null {
  const available = Array.from(yields.entries())
    .filter(([, y]) => y !== null)
    .sort((a, b) => a[1].daysToExpiry - b[1].daysToExpiry);

  if (available.length === 0) return null;

  if (available.length === 1) {
    // Single point: use same rate (crude but better than nothing)
    const [, ref] = available[0];
    return {
      tenor: tenor as ImpliedYield["tenor"],
      rate: Math.round(ref.rate * 100) / 100,
      futuresSymbol: ref.futuresSymbol + " (extrapolated)",
      futuresPrice: ref.futuresPrice,
      spotPrice: spotPriceOz,
      daysToExpiry: targetDays,
      spread: ref.spread,
      source: "abaxx_futures",
    };
  }

  // Linear interpolation between two nearest points
  let lower = available[0];
  let upper = available[available.length - 1];

  for (let i = 0; i < available.length - 1; i++) {
    if (
      available[i][1].daysToExpiry <= targetDays &&
      available[i + 1][1].daysToExpiry >= targetDays
    ) {
      lower = available[i];
      upper = available[i + 1];
      break;
    }
  }

  const t =
    (targetDays - lower[1].daysToExpiry) /
    (upper[1].daysToExpiry - lower[1].daysToExpiry);
  const interpolatedRate = lower[1].rate + t * (upper[1].rate - lower[1].rate);

  return {
    tenor: tenor as ImpliedYield["tenor"],
    rate: Math.round(interpolatedRate * 100) / 100,
    futuresSymbol: `${lower[1].futuresSymbol}/${upper[1].futuresSymbol} (interpolated)`,
    futuresPrice: lower[1].futuresPrice + t * (upper[1].futuresPrice - lower[1].futuresPrice),
    spotPrice: spotPriceOz,
    daysToExpiry: targetDays,
    spread: 0,
    source: "abaxx_futures",
  };
}

/**
 * Compute implied yields from Abaxx futures curve
 * Returns 3M, 6M, 12M implied yields for gold
 */
export async function computeAbaxxYields(): Promise<AbaxxYieldSnapshot | null> {
  try {
    // Get cached Abaxx futures prices
    const futures = await getAllCachedFutures();
    if (futures.length === 0) {
      console.warn("[AbaxxYield] No cached futures data");
      return null;
    }

    // Get spot price ($/gram from price-cache)
    const metalPrices = await getMetalPrices();
    const spotPerGram = metalPrices.gold;
    const spotPerOz = spotPerGram * TROY_OUNCE_TO_GRAMS;

    // Calculate implied yield for each tenor
    const yieldMap = new Map<string, ImpliedYield>();

    for (const [tenor, targetDays] of Object.entries(TENOR_TARGETS)) {
      const contract = findBestContract(futures, targetDays);

      if (contract && contract.midPrice) {
        const rate = calculateImpliedYield(
          spotPerOz,
          contract.midPrice,
          contract.daysToExpiry
        );

        yieldMap.set(tenor, {
          tenor: tenor as ImpliedYield["tenor"],
          rate: Math.round(rate * 100) / 100,
          futuresSymbol: contract.symbol,
          futuresPrice: contract.midPrice,
          spotPrice: spotPerOz,
          daysToExpiry: contract.daysToExpiry,
          spread: contract.midPrice - spotPerOz,
          source: "abaxx_futures",
        });
      }
    }

    // Fill missing tenors via interpolation
    for (const [tenor, targetDays] of Object.entries(TENOR_TARGETS)) {
      if (!yieldMap.has(tenor)) {
        const interpolated = interpolateYield(yieldMap, tenor, targetDays, spotPerOz);
        if (interpolated) yieldMap.set(tenor, interpolated);
      }
    }

    return {
      gold: {
        "3m": yieldMap.get("3m") || null,
        "6m": yieldMap.get("6m") || null,
        "12m": yieldMap.get("12m") || null,
      },
      spotPricePerOz: Math.round(spotPerOz * 100) / 100,
      spotPricePerGram: Math.round(spotPerGram * 100) / 100,
      computedAt: new Date().toISOString(),
      source: "abaxx_futures",
    };
  } catch (err: any) {
    console.error("[AbaxxYield] Error:", err.message);
    return null;
  }
}
