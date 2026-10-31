// ============================================================================
// AUXR BACKING REPORT — what we owe vs what we can show we hold.
// ----------------------------------------------------------------------------
// The reserve ledger in auxr-reserve.ts adds basket grams on every mint, so its
// "backing ratio" is 100% by construction and says nothing about real holdings.
// This module replaces it for anything public:
//
//   Liability (owed) = AUXR on the off-chain ledger (auxr:supply)
//                    + AUXR on Base (totalSupply minus keyless addresses)
//   The two do not overlap: an on-chain withdrawal burns the off-chain units
//   before minting, a deposit credits off-chain and then burns on-chain.
//
//   Holdings (held)  = the latest holdings statement entered by an admin from
//                      bank / broker statements. Issuer-reported, not audited.
//
// No statement, or a statement older than AUXR_BACKING_STATEMENT_MAX_AGE_DAYS,
// means the endpoint does NOT claim full backing. When a bank API arrives it
// writes the same statement record, and nothing downstream changes.
//
// Redis schema:
//   auxr:backing:statement      string  JSON BackingStatement (current)
//   auxr:backing:statement:log  list    JSON BackingStatement[] (capped 500)
// ============================================================================

import type { Address } from "viem";
import { redis } from "@/lib/redis";
import { getAuxrSupply, type AuxrBasketMetal } from "@/lib/auxr-reserve";
import { AUXR_GRAMS_PER_UNIT, getAuxrPricing } from "@/lib/auxr-pricing";
import { getOnChainBalance, getOnChainTotalSupply, weiToAuxr } from "@/lib/auxr-onchain";

export const BASKET_METALS: AuxrBasketMetal[] = ["gold", "silver", "platinum", "palladium"];

// Addresses with no private key (tokens can never move). Treated as burned and
// removed from the liability. 0x8d23… is a SHA256-derived address from the web
// wallet's local mode; the 23,100 AUXR there were re-minted on 2026-09-30.
export const AUXR_UNRECOVERABLE_ADDRESSES = ["0x8d23E12cAc0f1D2a8c609b973f394396A4Da5011"];

const STATEMENT_KEY = "auxr:backing:statement";
const STATEMENT_LOG_KEY = "auxr:backing:statement:log";

export const STATEMENT_MAX_AGE_DAYS = Number(process.env.AUXR_BACKING_STATEMENT_MAX_AGE_DAYS || 35);
const FULLY_BACKED_THRESHOLD = 0.9999;
const DAY_MS = 24 * 60 * 60 * 1000;

type Grams = Record<AuxrBasketMetal, number>;

export interface BackingStatement {
  /** Grams of each metal (or metal-equivalent hedge position) held for AUXR. */
  grams: Grams;
  /** Date the balances are as of (unix ms), taken from the source statement. */
  asOf: number;
  /** Internal reference, e.g. statement or document number. Never published. */
  reference: string;
  /** Free-text note for ops. Never published. */
  note?: string;
  enteredBy: string;
  enteredAt: number;
}

export interface AuxrLiability {
  offChainUnits: number;
  onChainUnits: number;
  unrecoverableUnits: number;
  totalUnits: number;
}

export type BackingStatus = "no_statement" | "stale" | "under_backed" | "backed";

export interface BackingReport {
  status: BackingStatus;
  fullyBacked: boolean;
  liability: AuxrLiability;
  requiredGrams: Grams;
  heldGrams: Grams;
  /** held / required per metal; null with no statement. */
  ratio: (Grams & { weakest: number }) | null;
  surplusGrams: Grams;
  heldUSD: number;
  liabilityUSD: number;
  statementAsOf: number | null;
  statementAgeDays: number | null;
  timestamp: number;
}

const zeroGrams = (): Grams => ({ gold: 0, silver: 0, platinum: 0, palladium: 0 });

// ── Liability ────────────────────────────────────────────────────────────────

export async function getAuxrLiability(): Promise<AuxrLiability> {
  const [offChainUnits, totalWei, keyless] = await Promise.all([
    getAuxrSupply(),
    getOnChainTotalSupply(),
    Promise.all(AUXR_UNRECOVERABLE_ADDRESSES.map((a) => getOnChainBalance(a as Address))),
  ]);
  const unrecoverableUnits = keyless.reduce((sum: number, w: bigint) => sum + weiToAuxr(w), 0);
  const onChainUnits = weiToAuxr(totalWei) - unrecoverableUnits;
  return {
    offChainUnits,
    onChainUnits,
    unrecoverableUnits,
    totalUnits: offChainUnits + onChainUnits,
  };
}

// ── Statement ────────────────────────────────────────────────────────────────

function parse<T>(raw: unknown): T | null {
  if (!raw) return null;
  if (typeof raw === "object") return raw as T;
  try { return JSON.parse(String(raw)) as T; } catch { return null; }
}

export async function getBackingStatement(): Promise<BackingStatement | null> {
  return parse<BackingStatement>(await redis.get(STATEMENT_KEY));
}

export async function getBackingStatementHistory(limit = 50): Promise<BackingStatement[]> {
  const raw = await redis.lrange(STATEMENT_LOG_KEY, 0, Math.min(Math.max(1, limit), 500) - 1);
  return raw.map((r) => parse<BackingStatement>(r)).filter((s): s is BackingStatement => !!s);
}

export async function saveBackingStatement(s: BackingStatement): Promise<void> {
  for (const m of BASKET_METALS) {
    if (!Number.isFinite(s.grams[m]) || s.grams[m] < 0) {
      throw new Error(`auxr-backing: invalid grams for ${m}`);
    }
  }
  if (!Number.isFinite(s.asOf) || s.asOf > Date.now() + DAY_MS) {
    throw new Error("auxr-backing: asOf must be a date that is not in the future");
  }
  const json = JSON.stringify(s);
  await redis.set(STATEMENT_KEY, json);
  await redis.lpush(STATEMENT_LOG_KEY, json);
  await redis.ltrim(STATEMENT_LOG_KEY, 0, 499);
}

// ── Report ───────────────────────────────────────────────────────────────────

/** Pure: combine liability, statement and spot prices into a report. */
export function computeBackingReport(params: {
  liability: AuxrLiability;
  statement: BackingStatement | null;
  spotUSDPerGram: Grams;
  navUSD: number;
  now: number;
}): BackingReport {
  const { liability, statement, spotUSDPerGram, navUSD, now } = params;

  const requiredGrams = zeroGrams();
  for (const m of BASKET_METALS) requiredGrams[m] = liability.totalUnits * AUXR_GRAMS_PER_UNIT[m];

  const heldGrams = statement ? { ...zeroGrams(), ...statement.grams } : zeroGrams();
  const surplusGrams = zeroGrams();
  for (const m of BASKET_METALS) surplusGrams[m] = heldGrams[m] - requiredGrams[m];

  const heldUSD = BASKET_METALS.reduce((sum, m) => sum + heldGrams[m] * spotUSDPerGram[m], 0);
  const liabilityUSD = liability.totalUnits * navUSD;

  let ratio: BackingReport["ratio"] = null;
  if (statement) {
    const r = (m: AuxrBasketMetal) => (requiredGrams[m] <= 0 ? 1 : heldGrams[m] / requiredGrams[m]);
    const per = { gold: r("gold"), silver: r("silver"), platinum: r("platinum"), palladium: r("palladium") };
    ratio = { ...per, weakest: Math.min(per.gold, per.silver, per.platinum, per.palladium) };
  }

  const statementAgeDays = statement ? (now - statement.asOf) / DAY_MS : null;
  let status: BackingStatus;
  if (!statement || !ratio) status = "no_statement";
  else if (statementAgeDays! > STATEMENT_MAX_AGE_DAYS) status = "stale";
  else if (ratio.weakest < FULLY_BACKED_THRESHOLD) status = "under_backed";
  else status = "backed";

  return {
    status,
    fullyBacked: status === "backed",
    liability,
    requiredGrams,
    heldGrams,
    ratio,
    surplusGrams,
    heldUSD,
    liabilityUSD,
    statementAsOf: statement?.asOf ?? null,
    statementAgeDays,
    timestamp: now,
  };
}

export async function getBackingReport(): Promise<BackingReport> {
  const [liability, statement, pricing] = await Promise.all([
    getAuxrLiability(),
    getBackingStatement(),
    getAuxrPricing(),
  ]);
  const spotUSDPerGram = zeroGrams();
  for (const m of BASKET_METALS) spotUSDPerGram[m] = pricing.components[m].spotUSDPerGram;
  return computeBackingReport({ liability, statement, spotUSDPerGram, navUSD: pricing.navUSD, now: Date.now() });
}
