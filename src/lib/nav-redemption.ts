// ============================================================================
// NAV REDEMPTION — Class A peg engine (metal token → stablecoin at NAV)
// ----------------------------------------------------------------------------
// The core of the Class A liquidity guarantee: a holder can always burn a metal
// token and receive USDC/USDT at net asset value, with the Auxite treasury as
// the standing counterparty. Because redemption is ALWAYS available at NAV minus
// a small fee, the secondary-market price cannot drift far below NAV — any
// discount is an arbitrage against the treasury. This is what replaces a deep
// order book for an illiquid asset (the PAXG/ETF redemption mechanism).
//
// This module is the PURE quote logic: given a metal amount and a (fresh) NAV,
// it computes the stablecoin payout, fee, effective rate, and a circuit-breaker
// flag if the NAV feed is stale. The route layer wires it to live prices,
// balances, KYC, and order persistence. Fund movement is a separate, explicitly
// authorized settlement step — quoting/ordering never moves money.
// ============================================================================

export type MetalSymbol = "AUXG" | "AUXS" | "AUXPT" | "AUXPD";
export type Stablecoin = "USDC" | "USDT";

/**
 * Redemption fee per metal = the lower edge of the NAV band. Tighter than the
 * physical-redemption fee schedule (no logistics/shipping), because this is the
 * on-chain liquidity path. Wider for the thinner PGMs.
 */
export const NAV_REDEMPTION_FEE_BPS: Record<MetalSymbol, number> = {
  AUXG: 50, // 0.50%
  AUXS: 75, // 0.75%
  AUXPT: 100, // 1.00%
  AUXPD: 100, // 1.00%
};

/** Minimum redeemable amount in grams (low — no physical logistics involved). */
export const NAV_MIN_GRAMS: Record<MetalSymbol, number> = {
  AUXG: 1,
  AUXS: 50,
  AUXPT: 1,
  AUXPD: 1,
};

/**
 * Maximum NAV age before the peg engine halts. A stale price feed must not be
 * used to price a redemption — better to pause than to settle on a bad NAV.
 * This is the Class A oracle circuit-breaker at the redemption boundary.
 */
export const NAV_MAX_AGE_SECONDS = 300; // 5 minutes

export const METAL_SYMBOLS: MetalSymbol[] = ["AUXG", "AUXS", "AUXPT", "AUXPD"];

export interface NavRedemptionInput {
  metal: MetalSymbol;
  /** Amount of metal to redeem, in grams. */
  grams: number;
  /** Live NAV, USD per gram, for this metal. */
  navPerGram: number;
  /** Age of the NAV reading in seconds (from the price-cache timestamp). */
  navAgeSeconds: number;
  /** Stablecoin to receive. USDC/USDT are treated 1:1 with USD. */
  stablecoin: Stablecoin;
}

export interface NavRedemptionQuote {
  ok: boolean;
  /** Present when ok === false. */
  reason?: string;
  metal: MetalSymbol;
  grams: number;
  stablecoin: Stablecoin;
  navPerGram: number;
  /** grams × navPerGram, before fee. */
  grossUsd: number;
  feeBps: number;
  feeUsd: number;
  /** grossUsd − feeUsd. USDC/USDT 1:1, so this is also the stablecoin out. */
  netUsd: number;
  /** Stablecoin units paid out. */
  stablecoinOut: number;
  /** Effective USD/gram the holder realizes (netUsd / grams). */
  effectiveRatePerGram: number;
  /** True when the NAV feed is too old to price safely (peg engine halted). */
  circuitBreaker: boolean;
  minGrams: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Pure NAV-redemption quote. Validates amount, minimum, and NAV freshness, then
 * computes gross/fee/net. Never throws — returns `ok: false` with a reason.
 */
export function quoteNavRedemption(input: NavRedemptionInput): NavRedemptionQuote {
  const { metal, grams, navPerGram, navAgeSeconds, stablecoin } = input;
  const feeBps = NAV_REDEMPTION_FEE_BPS[metal];
  const minGrams = NAV_MIN_GRAMS[metal];

  const base: NavRedemptionQuote = {
    ok: false,
    metal,
    grams,
    stablecoin,
    navPerGram,
    grossUsd: 0,
    feeBps,
    feeUsd: 0,
    netUsd: 0,
    stablecoinOut: 0,
    effectiveRatePerGram: 0,
    circuitBreaker: false,
    minGrams,
  };

  if (!(grams > 0)) {
    return { ...base, reason: "invalid_amount" };
  }
  if (grams < minGrams) {
    return { ...base, reason: "below_minimum" };
  }
  if (!(navPerGram > 0)) {
    return { ...base, reason: "invalid_nav" };
  }
  // Circuit breaker: stale NAV halts the peg engine.
  if (navAgeSeconds > NAV_MAX_AGE_SECONDS) {
    return { ...base, circuitBreaker: true, reason: "nav_stale" };
  }

  const grossUsd = grams * navPerGram;
  const feeUsd = (grossUsd * feeBps) / 10000;
  const netUsd = grossUsd - feeUsd;

  return {
    ...base,
    ok: true,
    grossUsd: round2(grossUsd),
    feeUsd: round2(feeUsd),
    netUsd: round2(netUsd),
    stablecoinOut: round2(netUsd), // USDC/USDT 1:1
    effectiveRatePerGram: round2(netUsd / grams),
  };
}
