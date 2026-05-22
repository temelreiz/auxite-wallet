// ============================================================================
// AUXR PRICING ENGINE
// ----------------------------------------------------------------------------
// AUXR is a fixed-composition basket token: 1 AUXR represents a constant
// number of grams of Au, Ag, Pt, Pd. NAV floats with metal spot prices.
//
// Phase 1A: off-chain ledger (Redis), no on-chain contract yet. Same pattern
// as AUXM works today. Mint/burn is accounting only — physical metals are
// reserved against the basket via treasury-exposure.ts.
//
// Composition rationale (USD-value weights at launch reference prices):
//   Gold       55% — store-of-value anchor
//   Silver     30% — liquidity + industrial demand exposure
//   Platinum   10% — auto-catalyst beta
//   Palladium   5% — small cap, limited float — tail position
//
// Composition is IMMUTABLE in Phase 1A. Rebalances require a separate
// governance event (Phase 2) and would mint/burn additional grams pro-rata
// across all holders. Until then, weights drift naturally with prices —
// this is the value proposition of the basket (a single position tracking
// a managed metals exposure without rebalancing fees on the holder side).
//
// Reference NAV: $100/AUXR at launch. Chosen over $1 because gold-heavy
// basket would produce micro-gram quantities at $1 NAV that round-trip
// poorly. $100 is also the minimum purchase, so each "Buy" = 1 whole AUXR
// initially.
// ============================================================================

import { getMetalPrices } from "@/lib/price-cache";

// ── Constants ────────────────────────────────────────────────────────────────

/** USD-value weights at launch reference prices. Immutable in Phase 1A. */
export const AUXR_WEIGHTS = {
  gold: 0.55,
  silver: 0.30,
  platinum: 0.10,
  palladium: 0.05,
} as const;

/**
 * Launch reference prices ($/gram) used to derive the fixed basket
 * composition. These are NOT spot prices for trading — only the snapshot
 * that fixed how many grams of each metal are in 1 AUXR at launch.
 *
 * Set 2026-05-22 at session start. If we relaunch (post-coin migration
 * to on-chain), these would be re-snapshotted.
 */
export const AUXR_LAUNCH_PRICES = {
  gold: 145.00,
  silver: 2.26,
  platinum: 60.00,
  palladium: 45.00,
} as const;

/** Reference NAV that determines the basket composition. */
export const AUXR_REFERENCE_NAV_USD = 100.00;

/**
 * Fixed grams of each metal in 1 AUXR. Derived at module load from
 * weights × reference NAV / launch price. Locked forever in Phase 1A.
 */
export const AUXR_GRAMS_PER_UNIT = {
  gold: (AUXR_WEIGHTS.gold * AUXR_REFERENCE_NAV_USD) / AUXR_LAUNCH_PRICES.gold,
  silver: (AUXR_WEIGHTS.silver * AUXR_REFERENCE_NAV_USD) / AUXR_LAUNCH_PRICES.silver,
  platinum: (AUXR_WEIGHTS.platinum * AUXR_REFERENCE_NAV_USD) / AUXR_LAUNCH_PRICES.platinum,
  palladium: (AUXR_WEIGHTS.palladium * AUXR_REFERENCE_NAV_USD) / AUXR_LAUNCH_PRICES.palladium,
} as const;

/**
 * Bid/ask spread applied to NAV. 50bps each side ⇒ 1% round-trip — covers
 * inventory management, custody fees, and ops overhead. Comparable to
 * BlackRock GLD intra-day spread or LBMA dealer spread for retail tickets.
 *
 * Phase 2 may dynamic-spread by basket size, time of day, or volatility.
 */
export const AUXR_BUY_SPREAD = 0.0050;  // +50 bps
export const AUXR_SELL_SPREAD = 0.0050; // -50 bps

/**
 * Minimum purchase in USD. Lowered from $100 to $30 to widen the top of
 * the funnel — $100 was a meaningful barrier for first-time / emerging-market
 * buyers, and AUXR units are fractional anyway (no whole-unit constraint).
 * $30 still clears dust-position economics on the off-chain ledger.
 */
export const AUXR_MIN_PURCHASE_USD = 30;

// ── Types ────────────────────────────────────────────────────────────────────

export interface AuxrPricing {
  /** Net asset value: USD per 1 AUXR, derived from spot. */
  navUSD: number;
  /** Buy price for users (NAV + spread). */
  buyPriceUSD: number;
  /** Sell price for users (NAV − spread). */
  sellPriceUSD: number;
  /** Per-metal contribution to NAV. */
  components: {
    gold: { gramsPerUnit: number; spotUSDPerGram: number; valueUSD: number; weightPct: number };
    silver: { gramsPerUnit: number; spotUSDPerGram: number; valueUSD: number; weightPct: number };
    platinum: { gramsPerUnit: number; spotUSDPerGram: number; valueUSD: number; weightPct: number };
    palladium: { gramsPerUnit: number; spotUSDPerGram: number; valueUSD: number; weightPct: number };
  };
  /** Unix ms when the underlying spot prices were sampled. */
  timestamp: number;
}

// ── Pricing ──────────────────────────────────────────────────────────────────

/**
 * Compute current AUXR NAV from live spot prices.
 *
 * NAV = Σ (gramsPerUnit_i × spot_i)
 *
 * The buy/sell prices include the configured spread. Frontends should
 * always quote `buyPriceUSD` to the user (not navUSD) so the spread is
 * transparent in the UX.
 */
export async function getAuxrPricing(): Promise<AuxrPricing> {
  const spot = await getMetalPrices();

  const goldValue = AUXR_GRAMS_PER_UNIT.gold * spot.gold;
  const silverValue = AUXR_GRAMS_PER_UNIT.silver * spot.silver;
  const platinumValue = AUXR_GRAMS_PER_UNIT.platinum * spot.platinum;
  const palladiumValue = AUXR_GRAMS_PER_UNIT.palladium * spot.palladium;

  const navUSD = goldValue + silverValue + platinumValue + palladiumValue;
  const buyPriceUSD = navUSD * (1 + AUXR_BUY_SPREAD);
  const sellPriceUSD = navUSD * (1 - AUXR_SELL_SPREAD);

  return {
    navUSD,
    buyPriceUSD,
    sellPriceUSD,
    components: {
      gold: {
        gramsPerUnit: AUXR_GRAMS_PER_UNIT.gold,
        spotUSDPerGram: spot.gold,
        valueUSD: goldValue,
        weightPct: navUSD > 0 ? (goldValue / navUSD) * 100 : 0,
      },
      silver: {
        gramsPerUnit: AUXR_GRAMS_PER_UNIT.silver,
        spotUSDPerGram: spot.silver,
        valueUSD: silverValue,
        weightPct: navUSD > 0 ? (silverValue / navUSD) * 100 : 0,
      },
      platinum: {
        gramsPerUnit: AUXR_GRAMS_PER_UNIT.platinum,
        spotUSDPerGram: spot.platinum,
        valueUSD: platinumValue,
        weightPct: navUSD > 0 ? (platinumValue / navUSD) * 100 : 0,
      },
      palladium: {
        gramsPerUnit: AUXR_GRAMS_PER_UNIT.palladium,
        spotUSDPerGram: spot.palladium,
        valueUSD: palladiumValue,
        weightPct: navUSD > 0 ? (palladiumValue / navUSD) * 100 : 0,
      },
    },
    timestamp: spot.timestamp,
  };
}

/**
 * Convert a USD amount into AUXR units the user receives, given current
 * buy spread. Used by Buy endpoint.
 *
 *   usdAmount → unitsAUXR = usdAmount / buyPriceUSD
 *
 * Also returns the per-metal grams that get reserved for backing this
 * mint, so the reserve tracker can be updated atomically.
 */
export async function quoteBuy(usdAmount: number): Promise<{
  usdAmount: number;
  unitsAUXR: number;
  buyPriceUSD: number;
  navUSD: number;
  spreadUSD: number;
  metalsReservedGrams: {
    gold: number;
    silver: number;
    platinum: number;
    palladium: number;
  };
}> {
  if (!Number.isFinite(usdAmount) || usdAmount < AUXR_MIN_PURCHASE_USD) {
    throw new Error(`AUXR: minimum buy is $${AUXR_MIN_PURCHASE_USD}`);
  }

  const pricing = await getAuxrPricing();
  const unitsAUXR = usdAmount / pricing.buyPriceUSD;

  return {
    usdAmount,
    unitsAUXR,
    buyPriceUSD: pricing.buyPriceUSD,
    navUSD: pricing.navUSD,
    spreadUSD: (pricing.buyPriceUSD - pricing.navUSD) * unitsAUXR,
    metalsReservedGrams: {
      gold: unitsAUXR * AUXR_GRAMS_PER_UNIT.gold,
      silver: unitsAUXR * AUXR_GRAMS_PER_UNIT.silver,
      platinum: unitsAUXR * AUXR_GRAMS_PER_UNIT.platinum,
      palladium: unitsAUXR * AUXR_GRAMS_PER_UNIT.palladium,
    },
  };
}

/**
 * Convert a units-of-AUXR sell into USD proceeds the user receives, given
 * current sell spread. Used by Sell endpoint.
 */
export async function quoteSell(unitsAUXR: number): Promise<{
  unitsAUXR: number;
  proceedsUSD: number;
  sellPriceUSD: number;
  navUSD: number;
  spreadUSD: number;
  metalsReleasedGrams: {
    gold: number;
    silver: number;
    platinum: number;
    palladium: number;
  };
}> {
  if (!Number.isFinite(unitsAUXR) || unitsAUXR <= 0) {
    throw new Error(`AUXR: invalid units ${unitsAUXR}`);
  }

  const pricing = await getAuxrPricing();
  const proceedsUSD = unitsAUXR * pricing.sellPriceUSD;

  return {
    unitsAUXR,
    proceedsUSD,
    sellPriceUSD: pricing.sellPriceUSD,
    navUSD: pricing.navUSD,
    spreadUSD: (pricing.navUSD - pricing.sellPriceUSD) * unitsAUXR,
    metalsReleasedGrams: {
      gold: unitsAUXR * AUXR_GRAMS_PER_UNIT.gold,
      silver: unitsAUXR * AUXR_GRAMS_PER_UNIT.silver,
      platinum: unitsAUXR * AUXR_GRAMS_PER_UNIT.platinum,
      palladium: unitsAUXR * AUXR_GRAMS_PER_UNIT.palladium,
    },
  };
}

/** Compact summary for log lines and admin dashboards. */
export function describePricing(p: AuxrPricing): string {
  return [
    `NAV=$${p.navUSD.toFixed(4)}`,
    `bid=$${p.sellPriceUSD.toFixed(4)}`,
    `ask=$${p.buyPriceUSD.toFixed(4)}`,
    `Au=${p.components.gold.weightPct.toFixed(1)}%`,
    `Ag=${p.components.silver.weightPct.toFixed(1)}%`,
    `Pt=${p.components.platinum.weightPct.toFixed(1)}%`,
    `Pd=${p.components.palladium.weightPct.toFixed(1)}%`,
  ].join(" ");
}
