// src/lib/borrow-service.ts
// ════════════════════════════════════════════════════════════════════════════
// AUXITE BORROW — lending engine (v1, treasury-funded pilot)
// Borrow USDC against vaulted metal (AUXG/AUXS/AUXPT/AUXPD) WITHOUT selling.
// Over-collateralized, in-house NAV liquidation. Reuses the encumbrance/lock-guard
// layer: collateral is locked via lockCollateral() so it can't be sold/withdrawn/
// converted/transferred/staked through any metal-out flow. Internal Redis ledger.
//   loan:<id>                      = hash (the loan)
//   borrow:user:<address>:loans    = set of loan ids
//   borrow:pool (hash) .outstanding = total principal currently lent (vs POOL_CAP)
// USDC disbursement/repayment to the user's wallet balance is done by the API
// route; this service owns the loan ledger + collateral lock + pool accounting.
// ════════════════════════════════════════════════════════════════════════════
import { redis } from "@/lib/redis";
import { getMetalPrice } from "@/lib/price-cache";
import { lockCollateral, releaseCollateral, getMetalTotals } from "@/lib/allocation-service";
import { reduceAllocations } from "@/lib/allocation-service";

// ── v1 LOCKED parameters ────────────────────────────────────────────────────
export const BORROW_PARAMS: Record<string, { maxLtv: number; liqLtv: number }> = {
  AUXG: { maxLtv: 0.50, liqLtv: 0.70 },
  AUXS: { maxLtv: 0.45, liqLtv: 0.65 },
  AUXPT: { maxLtv: 0.45, liqLtv: 0.65 },
  AUXPD: { maxLtv: 0.40, liqLtv: 0.60 },
};
export const APR_BY_TERM: Record<number, number> = { 3: 0.09, 6: 0.10, 12: 0.11 };
export const EXTENSION_APR = 0.09;     // one-time 3-month extension at 3mo APR
export const EXTENSION_MONTHS = 3;
export const ORIGINATION_FEE = 0.01;   // 1% at drawdown
export const LIQUIDATION_FEE = 0.02;   // 2% on liquidation
export const POOL_CAP_USDC = 20000;    // v1 pilot pool (treasury)
export const MIN_LOAN_USDC = 100;
export const VALID_TERMS = [3, 6, 12];

export type LoanStatus = "active" | "repaid" | "liquidated";
export interface Loan {
  id: string;
  address: string;
  metal: string;
  collateralGrams: number;
  principalUSDC: number;
  apr: number;
  termMonths: number;
  originationFeeUSDC: number;
  startDate: string;
  maturityDate: string;
  status: LoanStatus;
  extended: boolean;
  repaidUSDC: number;
  liquidationPrice: number; // USD/gram where LTV hits liqLtv
}

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const r6 = (n: number) => Math.round((Number(n) || 0) * 1e6) / 1e6;
const DAY_MS = 86_400_000;

/** Collateral NAV = the metal's spot/market price per gram — the SAME valuation
 *  the app displays for holdings (getMetalPrice = spot), not the buyback bid.
 *  Risk is controlled by the conservative LTV (borrow) + liq LTV (liquidation
 *  threshold), so we don't double-haircut by also using the bid price. */
export async function navPerGram(metal: string): Promise<number> {
  return getMetalPrice(metal.toUpperCase());
}

/** Quote: given collateral grams + term, what can the customer borrow + at what
 *  terms. Pure preview (no state change). Returns the full loan economics. */
export async function quoteLoan(
  metal: string,
  collateralGrams: number,
  termMonths: number,
): Promise<{
  ok: boolean; error?: string;
  metal: string; collateralGrams: number; navPerGram: number; collateralValue: number;
  maxLtv: number; maxBorrow: number; apr: number; termMonths: number;
  liqLtv: number; liquidationPrice: number;
}> {
  const m = metal.toUpperCase();
  const params = BORROW_PARAMS[m];
  if (!params) return { ok: false, error: `Unsupported metal ${m}` } as any;
  if (!VALID_TERMS.includes(termMonths)) return { ok: false, error: `Term must be 3, 6 or 12 months` } as any;
  const nav = await navPerGram(m);
  const collateralValue = r2(collateralGrams * nav);
  const maxBorrow = r2(collateralValue * params.maxLtv);
  const apr = APR_BY_TERM[termMonths];
  // Liquidation price: per-gram price where loan/collateralValue == liqLtv.
  // We compute it at create time from the actual principal.
  return {
    ok: true, metal: m, collateralGrams: r6(collateralGrams), navPerGram: nav,
    collateralValue, maxLtv: params.maxLtv, maxBorrow, apr, termMonths,
    liqLtv: params.liqLtv, liquidationPrice: 0,
  };
}

/** Current pool utilisation. */
export async function getPool(): Promise<{ outstanding: number; cap: number; available: number }> {
  const outstanding = parseFloat((await redis.hget("borrow:pool", "outstanding")) as string || "0") || 0;
  return { outstanding: r2(outstanding), cap: POOL_CAP_USDC, available: r2(Math.max(0, POOL_CAP_USDC - outstanding)) };
}

/** Simple interest accrued on principal from start to `asOf` (default now). */
export function accruedInterest(loan: Loan, asOfMs = Date.now()): number {
  const start = new Date(loan.startDate).getTime();
  const days = Math.max(0, (asOfMs - start) / DAY_MS);
  return r2((loan.principalUSDC * loan.apr * days) / 365);
}

/** Total owed now = principal + accrued interest − already repaid. */
export function amountOwed(loan: Loan, asOfMs = Date.now()): number {
  return r2(loan.principalUSDC + accruedInterest(loan, asOfMs) - (loan.repaidUSDC || 0));
}

/** CREATE a loan: lock collateral, debit pool, write ledger. The route must have
 *  already done KYC + 2FA + T&C + (pilot) manual approval, and will credit the
 *  USDC to the user's balance after this returns ok. */
export async function createLoan(params: {
  address: string; metal: string; collateralGrams: number; principalUSDC: number; termMonths: number;
}): Promise<{ ok: boolean; error?: string; loan?: Loan; originationFeeUSDC?: number; netDisbursedUSDC?: number }> {
  const address = (params.address || "").toLowerCase();
  const m = (params.metal || "").toUpperCase();
  const collateralGrams = r6(params.collateralGrams);
  const principalUSDC = r2(params.principalUSDC);
  const termMonths = params.termMonths;

  const cfg = BORROW_PARAMS[m];
  if (!cfg) return { ok: false, error: `Unsupported metal ${m}` };
  if (!VALID_TERMS.includes(termMonths)) return { ok: false, error: "Term must be 3, 6 or 12 months" };
  if (principalUSDC < MIN_LOAN_USDC) return { ok: false, error: `Minimum loan ${MIN_LOAN_USDC} USDC` };
  if (collateralGrams <= 0) return { ok: false, error: "Collateral grams must be > 0" };

  // LTV check at current NAV.
  const nav = await navPerGram(m);
  const collateralValue = collateralGrams * nav;
  const maxBorrow = collateralValue * cfg.maxLtv;
  if (principalUSDC > maxBorrow + 1e-6) {
    return { ok: false, error: `Exceeds max LTV ${(cfg.maxLtv * 100).toFixed(0)}%: max ${r2(maxBorrow)} USDC for ${collateralGrams}g ${m}` };
  }

  // Pool capacity.
  const pool = await getPool();
  if (principalUSDC > pool.available + 1e-6) {
    return { ok: false, error: `Pool capacity reached: ${pool.available} USDC available` };
  }

  // Lock the collateral (this also re-checks availability vs other locks/yield).
  const id = `LOAN_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const lock = await lockCollateral(address, m, collateralGrams, id);
  if (!lock.ok) return { ok: false, error: lock.error || "Could not lock collateral" };

  const apr = APR_BY_TERM[termMonths];
  const originationFeeUSDC = r2(principalUSDC * ORIGINATION_FEE);
  const now = new Date();
  const maturity = new Date(now.getTime());
  maturity.setMonth(maturity.getMonth() + termMonths);
  // Liquidation price = per-gram where principal / (grams*price) == liqLtv.
  const liquidationPrice = r6(principalUSDC / (collateralGrams * cfg.liqLtv));

  const loan: Loan = {
    id, address, metal: m, collateralGrams, principalUSDC, apr, termMonths,
    originationFeeUSDC, startDate: now.toISOString(), maturityDate: maturity.toISOString(),
    status: "active", extended: false, repaidUSDC: 0, liquidationPrice,
  };

  await redis.hset(`loan:${id}`, loan as any);
  await redis.sadd(`borrow:user:${address}:loans`, id);
  await redis.hincrbyfloat("borrow:pool", "outstanding", principalUSDC);

  console.log(`💵 Loan ${id}: ${principalUSDC} USDC vs ${collateralGrams}g ${m} (LTV ${(principalUSDC / collateralValue * 100).toFixed(1)}%, liq @ ${liquidationPrice}/g)`);
  return { ok: true, loan, originationFeeUSDC, netDisbursedUSDC: r2(principalUSDC - originationFeeUSDC) };
}

async function loadLoan(loanId: string): Promise<Loan | null> {
  const raw = await redis.hgetall(`loan:${loanId}`);
  if (!raw || !Object.keys(raw).length) return null;
  return {
    id: raw.id as string, address: raw.address as string, metal: raw.metal as string,
    collateralGrams: parseFloat(raw.collateralGrams as string) || 0,
    principalUSDC: parseFloat(raw.principalUSDC as string) || 0,
    apr: parseFloat(raw.apr as string) || 0,
    termMonths: parseInt(raw.termMonths as string) || 0,
    originationFeeUSDC: parseFloat(raw.originationFeeUSDC as string) || 0,
    startDate: raw.startDate as string, maturityDate: raw.maturityDate as string,
    status: (raw.status as LoanStatus) || "active",
    extended: String(raw.extended) === "true",
    repaidUSDC: parseFloat(raw.repaidUSDC as string) || 0,
    liquidationPrice: parseFloat(raw.liquidationPrice as string) || 0,
  };
}

/** List a user's loans with live owed/interest figures. */
export async function getUserLoans(address: string): Promise<Array<Loan & { accruedInterest: number; owed: number }>> {
  const ids = (await redis.smembers(`borrow:user:${(address || "").toLowerCase()}:loans`)) as string[];
  const out: Array<Loan & { accruedInterest: number; owed: number }> = [];
  for (const id of ids || []) {
    const loan = await loadLoan(id);
    if (!loan) continue;
    out.push({ ...loan, accruedInterest: accruedInterest(loan), owed: amountOwed(loan) });
  }
  return out.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
}

/** REPAY (full or partial) in USDC. Cash-first; applied to interest then principal.
 *  On full repayment the collateral is released. Returns how the collateral moved.
 *  The route must have already debited the repay amount from the user's USDC. */
export async function repayLoan(
  loanId: string, repayUSDC: number,
): Promise<{ ok: boolean; error?: string; closed: boolean; remainingOwed: number; releasedGrams: number }> {
  const loan = await loadLoan(loanId);
  if (!loan) return { ok: false, error: "Loan not found", closed: false, remainingOwed: 0, releasedGrams: 0 };
  if (loan.status !== "active") return { ok: false, error: `Loan already ${loan.status}`, closed: false, remainingOwed: 0, releasedGrams: 0 };

  const owed = amountOwed(loan);
  const pay = r2(Math.min(repayUSDC, owed));
  const newRepaid = r2((loan.repaidUSDC || 0) + pay);
  const remainingOwed = r2(owed - pay);

  // Pool: reduce outstanding by the principal portion repaid (approx: pay capped at owed).
  await redis.hincrbyfloat("borrow:pool", "outstanding", -Math.min(pay, loan.principalUSDC));

  let closed = false, releasedGrams = 0;
  if (remainingOwed <= 0.01) {
    // Full repayment → release ALL collateral, mark repaid.
    await releaseCollateral(loan.address, loan.metal, loan.collateralGrams, loan.id);
    releasedGrams = loan.collateralGrams;
    await redis.hset(`loan:${loanId}`, { status: "repaid", repaidUSDC: newRepaid, closedAt: new Date().toISOString() });
    await redis.srem(`borrow:user:${loan.address}:loans`, loanId);
    closed = true;
    console.log(`✅ Loan ${loanId} REPAID — released ${releasedGrams}g ${loan.metal}`);
  } else {
    // Partial → reduce balance, collateral stays locked (no proportional release in v1).
    await redis.hset(`loan:${loanId}`, { repaidUSDC: newRepaid });
    console.log(`📥 Loan ${loanId} partial repay ${pay} USDC — ${remainingOwed} USDC remaining`);
  }
  return { ok: true, closed, remainingOwed, releasedGrams };
}

/** LIQUIDATE: trigger when LTV > liqLtv mid-term OR maturity reached unpaid.
 *  Sells just enough collateral at NAV to cover owed + liquidation fee, returns
 *  the remainder to the user (collateral released; sold grams de-allocated). */
export async function liquidateLoan(
  loanId: string, reason: "ltv" | "maturity",
): Promise<{ ok: boolean; error?: string; soldGrams: number; returnedGrams: number; coveredUSDC: number }> {
  const loan = await loadLoan(loanId);
  if (!loan) return { ok: false, error: "Loan not found", soldGrams: 0, returnedGrams: 0, coveredUSDC: 0 };
  if (loan.status !== "active") return { ok: false, error: `Loan already ${loan.status}`, soldGrams: 0, returnedGrams: 0, coveredUSDC: 0 };

  const nav = await navPerGram(loan.metal);
  const owed = amountOwed(loan);
  const toCover = r2(owed * (1 + LIQUIDATION_FEE)); // owed + liq fee
  let soldGrams = r6(Math.min(loan.collateralGrams, toCover / nav));
  // round up to whole gram (allocations are whole-gram) but cap at collateral
  soldGrams = Math.min(loan.collateralGrams, Math.ceil(soldGrams));
  const returnedGrams = r6(loan.collateralGrams - soldGrams);

  // Release the full lock, then de-allocate the SOLD grams (returnedGrams stay the user's).
  await releaseCollateral(loan.address, loan.metal, loan.collateralGrams, loan.id);
  if (soldGrams > 0) await reduceAllocations(loan.address, loan.metal, soldGrams);

  await redis.hincrbyfloat("borrow:pool", "outstanding", -loan.principalUSDC);
  await redis.hset(`loan:${loanId}`, {
    status: "liquidated", liquidatedAt: new Date().toISOString(), liquidationReason: reason,
    soldGrams: soldGrams.toString(), returnedGrams: returnedGrams.toString(),
  });
  await redis.srem(`borrow:user:${loan.address}:loans`, loanId);

  console.log(`⚖️ Loan ${loanId} LIQUIDATED (${reason}) — sold ${soldGrams}g ${loan.metal} @ ${nav}/g, returned ${returnedGrams}g`);
  return { ok: true, soldGrams, returnedGrams, coveredUSDC: r2(soldGrams * nav) };
}

/** EXTEND a loan once, +3 months at 3mo APR. LTV must be healthy (≤ maxLtv). */
export async function extendLoan(loanId: string): Promise<{ ok: boolean; error?: string; newMaturity?: string }> {
  const loan = await loadLoan(loanId);
  if (!loan) return { ok: false, error: "Loan not found" };
  if (loan.status !== "active") return { ok: false, error: `Loan ${loan.status}` };
  if (loan.extended) return { ok: false, error: "Already extended once (max one 3-month extension)" };
  const cfg = BORROW_PARAMS[loan.metal];
  const nav = await navPerGram(loan.metal);
  const ltv = amountOwed(loan) / (loan.collateralGrams * nav);
  if (ltv > cfg.maxLtv + 1e-6) {
    return { ok: false, error: `LTV too high to extend (${(ltv * 100).toFixed(1)}% > ${(cfg.maxLtv * 100).toFixed(0)}%) — top up or partial-repay first` };
  }
  const newMaturity = new Date(loan.maturityDate);
  newMaturity.setMonth(newMaturity.getMonth() + EXTENSION_MONTHS);
  await redis.hset(`loan:${loanId}`, { extended: "true", maturityDate: newMaturity.toISOString(), apr: EXTENSION_APR.toString(), extendedAt: new Date().toISOString() });
  console.log(`🔁 Loan ${loanId} extended +${EXTENSION_MONTHS}mo @ ${EXTENSION_APR * 100}% → ${newMaturity.toISOString()}`);
  return { ok: true, newMaturity: newMaturity.toISOString() };
}
