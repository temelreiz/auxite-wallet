// ════════════════════════════════════════════════════════════════════════════
// STRIPE — Card-based metal purchase
// ════════════════════════════════════════════════════════════════════════════
//
// Stripe entity: Aurum Ledger Limited (HK), Payments product only.
//
// IMPORTANT — ToS COMPLIANCE:
//   This integration sells PRECIOUS METALS (AUXG/AUXS/AUXPT/AUXPD) directly.
//   The user-facing UI must say "Buy Gold/Silver/Platinum/Palladium with Card".
//   AUXM is NOT exposed in the card flow.
//   Statement descriptor: "AURUM LEDGER METALS".
//   Charge metadata: type=metal_purchase, metal=AUXG, grams=...
//
//   Do NOT add "AUXM", "crypto", "investment", "settlement" to user-facing
//   strings or Stripe metadata for card charges. Stripe risk team will flag.
// ════════════════════════════════════════════════════════════════════════════

import Stripe from "stripe";
import { getTokenPrices } from "./v6-token-service";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("[stripe] STRIPE_SECRET_KEY not set — Stripe endpoints will fail.");
}

// No explicit apiVersion: Stripe SDK 22.x uses its built-in default and
// types-checks against that exact version. Pinning manually with a stale
// LatestApiVersion symbol breaks the build across SDK upgrades.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "noop", {
  typescript: true,
});

// ── Constants ──────────────────────────────────────────────────────────────
export const SUPPORTED_METALS = ["AUXG", "AUXS", "AUXPT", "AUXPD"] as const;
export type SupportedMetal = typeof SUPPORTED_METALS[number];

export const SUPPORTED_CURRENCIES = ["usd"] as const; // EUR/TRY in next phase
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

// Min/max charge amounts in USD — Stripe min is $0.50, but we set higher
// floor so card processing fee doesn't dominate the purchase.
export const MIN_CHARGE_USD = 30;
export const MAX_CHARGE_USD = 10000;

// Per-address overrides of the buffer-inclusive charge ceiling. Founder / ops
// wallets transact above the default retail cap; keyed by lowercased address.
// Everyone else falls back to MAX_CHARGE_USD.
export const MAX_CHARGE_OVERRIDES: Record<string, number> = {
  "0x8d23e12cac0f1d2a8c609b973f394396a4da5011": 21000, // founder wallet
};

export function maxChargeForAddress(userAddress?: string): number {
  if (!userAddress) return MAX_CHARGE_USD;
  return MAX_CHARGE_OVERRIDES[userAddress.toLowerCase()] ?? MAX_CHARGE_USD;
}

// Card processing buffer added on top of metal spread. Covers Stripe HK
// fees (~2-3% domestic, 3.4%+ international) + ~2% net margin for us.
// Was 3% — left us net ~1% after Stripe fee. Bumped to 5% so the card
// surcharge is genuinely passed to the buyer instead of eaten by Stripe.
export const CARD_PROCESSING_BUFFER = 0.05; // 5%

// Pretty metal names for descriptors / statement
export const METAL_NAME: Record<SupportedMetal, string> = {
  AUXG: "Gold",
  AUXS: "Silver",
  AUXPT: "Platinum",
  AUXPD: "Palladium",
};

// ── Pricing ────────────────────────────────────────────────────────────────

/**
 * Compute total USD charge for a card-based metal purchase.
 * Returns the charge in cents (Stripe wants integer cents).
 *
 * Model:
 *   basePrice   — spot from oracle (per gram USD)
 *   askPrice    — basePrice * (1 + metalSpread) — the existing buy price
 *   cardPrice   — askPrice * (1 + CARD_PROCESSING_BUFFER) — card surcharge
 *   totalUSD    — grams × cardPrice
 */
export async function quoteMetalChargeUSD(
  metal: SupportedMetal,
  grams: number,
  maxChargeUSD: number = MAX_CHARGE_USD
): Promise<{
  amountUSD: number;
  amountCents: number;
  pricePerGramUSD: number;
  baseAskPerGram: number;
  metalSpreadPct: number;
  cardBufferPct: number;
}> {
  if (!SUPPORTED_METALS.includes(metal)) {
    throw new Error(`Unsupported metal: ${metal}`);
  }
  if (!Number.isFinite(grams) || grams <= 0) {
    throw new Error("grams must be a positive number");
  }

  const prices = await getTokenPrices(metal);
  const baseAskPerGram = prices.askPerGram; // already includes metal spread
  const cardPricePerGram = baseAskPerGram * (1 + CARD_PROCESSING_BUFFER);
  const amountUSD = +(grams * cardPricePerGram).toFixed(2);

  if (amountUSD < MIN_CHARGE_USD) {
    throw new Error(`Minimum purchase is $${MIN_CHARGE_USD}. Quote: $${amountUSD}`);
  }
  if (amountUSD > maxChargeUSD) {
    throw new Error(`Maximum purchase is $${maxChargeUSD}. Quote: $${amountUSD}`);
  }

  return {
    amountUSD,
    amountCents: Math.round(amountUSD * 100),
    pricePerGramUSD: cardPricePerGram,
    baseAskPerGram,
    metalSpreadPct: prices.spreadPercent.buy,
    cardBufferPct: CARD_PROCESSING_BUFFER * 100,
  };
}

/**
 * Inverse: quote how many grams a USD amount buys (for "Buy $50 of gold").
 */
export async function quoteMetalGramsForUSD(
  metal: SupportedMetal,
  amountUSD: number,
  maxChargeUSD: number = MAX_CHARGE_USD
): Promise<{ grams: number; pricePerGramUSD: number; amountUSD: number }> {
  if (!SUPPORTED_METALS.includes(metal)) {
    throw new Error(`Unsupported metal: ${metal}`);
  }
  if (!Number.isFinite(amountUSD) || amountUSD < MIN_CHARGE_USD) {
    throw new Error(`Minimum purchase is $${MIN_CHARGE_USD}`);
  }
  if (amountUSD > maxChargeUSD) {
    throw new Error(`Maximum purchase is $${maxChargeUSD}`);
  }

  const prices = await getTokenPrices(metal);
  const cardPricePerGram = prices.askPerGram * (1 + CARD_PROCESSING_BUFFER);
  const grams = +(amountUSD / cardPricePerGram).toFixed(6);

  return { grams, pricePerGramUSD: cardPricePerGram, amountUSD };
}
