// src/lib/borrow-service.ts
// ════════════════════════════════════════════════════════════════════════════
// AUXITE BORROW — lending engine (v1, treasury-funded pilot)
// Borrow USDC against vaulted metal (AUXG/AUXS/AUXPT/AUXPD) or AUXR, WITHOUT
// selling. Over-collateralized; margin call, then liquidation, run from
// /api/cron/borrow-monitor.
//   loan:<id>                      = hash (the loan)
//   borrow:user:<address>:loans    = set of the user's OPEN loan ids
//   borrow:pool (hash) .outstanding = principal currently lent (vs POOL_CAP)
//   borrow:config (hash) .paused    = "true" stops new loans (repay still works)
//
// Collateral:
//   • Metals are locked through the allocation encumbrance (lockCollateral), the
//     same guard every metal-out flow checks — locked grams can't be sold,
//     withdrawn, converted, transferred or staked.
//   • AUXR has no allocations, so its collateral is MOVED out of the in-app
//     `auxr` balance into the loan and back on repayment. Units held by a loan
//     are simply not spendable; no AUXR-out path needs to know about loans.
//     On-chain AUXR can't be pledged (the app can't lock it).
//
// Every state change runs under the per-user balance lock (the one trade,
// transfer, withdraw and redeem take), and the pool cap and the AUXR / USDC
// debits are check-and-set in one Lua script, so concurrent requests can't
// over-lock collateral, exceed the pool or repay with the same USDC twice.
// ════════════════════════════════════════════════════════════════════════════
import { getRedis } from "@/lib/redis";
import { getMetalSpotPrices } from "@/lib/price-cache";
import { getAuxrPricing } from "@/lib/auxr-pricing";
import { lockCollateral, releaseCollateral, reduceAllocations } from "@/lib/allocation-service";
import { acquireBalanceLock, releaseBalanceLock } from "@/lib/balance-lock";
import { recordBurn } from "@/lib/auxr-reserve";

// ── v1 parameters ───────────────────────────────────────────────────────────
export const BORROW_PARAMS: Record<string, { maxLtv: number; liqLtv: number }> = {
  AUXG: { maxLtv: 0.50, liqLtv: 0.70 },
  AUXS: { maxLtv: 0.45, liqLtv: 0.65 },
  AUXPT: { maxLtv: 0.45, liqLtv: 0.65 },
  AUXPD: { maxLtv: 0.40, liqLtv: 0.60 },
  // A basket is steadier than one metal, but AUXR trades thinly on exchanges,
  // so it lends less than gold (decision 2026-11-03).
  AUXR: { maxLtv: 0.40, liqLtv: 0.60 },
};
export const BORROW_ASSETS = Object.keys(BORROW_PARAMS);
export const APR_BY_TERM: Record<number, number> = { 3: 0.09, 6: 0.10, 12: 0.11 };
export const EXTENSION_APR = 0.09;     // one-time 3-month extension at 3mo APR
export const EXTENSION_MONTHS = 3;
export const ORIGINATION_FEE = 0.01;   // 1% at drawdown
export const LIQUIDATION_FEE = 0.02;   // 2% on liquidation
export const POOL_CAP_USDC = 20000;    // v1 pilot pool (treasury)
export const MIN_LOAN_USDC = 100;
export const VALID_TERMS = [3, 6, 12];
/** Collateral is never valued (for a loan or a liquidation) on a price older than this. */
export const PRICE_MAX_AGE_MS = 30 * 60 * 1000;
/** After a margin call the borrower has this long to repay before liquidation. */
export const MARGIN_CALL_GRACE_MS = 24 * 60 * 60 * 1000;

export const unitOf = (asset: string) => (asset === "AUXR" ? "AUXR" : "g");

export type LoanStatus = "active" | "repaid" | "liquidated";
export interface Loan {
  id: string;
  address: string;
  metal: string;            // collateral asset (AUXG/AUXS/AUXPT/AUXPD/AUXR)
  collateralGrams: number;  // collateral amount — grams for metals, units for AUXR
  principalUSDC: number;
  apr: number;
  termMonths: number;
  originationFeeUSDC: number;
  startDate: string;
  maturityDate: string;
  status: LoanStatus;
  extended: boolean;
  repaidUSDC: number;       // total repaid (interest + principal)
  interestPaidUSDC: number;
  principalPaidUSDC: number;
  liquidationPrice: number; // USD per gram (per unit for AUXR) where LTV hits liqLtv
  marginCallAt?: string;
}

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const r6 = (n: number) => Math.round((Number(n) || 0) * 1e6) / 1e6;
const DAY_MS = 86_400_000;
const redis = () => getRedis();
const balanceKey = (a: string) => `user:${a}:balance`;

export class StalePriceError extends Error {
  constructor(public readonly asset: string, public readonly ageMs: number) {
    super(`${asset} price is ${Math.round(ageMs / 60000)} min old — borrowing is paused until prices refresh`);
    this.name = "StalePriceError";
  }
}

/** Collateral value per gram (per unit for AUXR) at market spot / NAV, with
 *  its timestamp. Risk is carried by the LTVs, not by a second haircut. */
export async function collateralPrice(asset: string): Promise<{ price: number; timestamp: number }> {
  const a = asset.toUpperCase();
  if (a === "AUXR") {
    const p = await getAuxrPricing();
    return { price: p.navUSD, timestamp: p.timestamp };
  }
  const s = await getMetalSpotPrices();
  const key = ({ AUXG: "gold", AUXS: "silver", AUXPT: "platinum", AUXPD: "palladium" } as const)[a as "AUXG"];
  if (!key) throw new Error(`Unsupported collateral ${a}`);
  return { price: Number((s as any)[key]), timestamp: Number(s.timestamp) || 0 };
}

/** Price, refusing one too old to lend or liquidate against. */
export async function freshPrice(asset: string): Promise<number> {
  const { price, timestamp } = await collateralPrice(asset);
  const age = Date.now() - timestamp;
  if (!(timestamp > 0) || age > PRICE_MAX_AGE_MS || !(price > 0)) throw new StalePriceError(asset, timestamp > 0 ? age : Infinity);
  return price;
}

/** Back-compat name. */
export const navPerGram = freshPrice;

export async function isBorrowPaused(): Promise<boolean> {
  return String(await redis().hget("borrow:config", "paused")) === "true";
}

/** Quote: given collateral + term, what can the customer borrow and on what terms. */
export async function quoteLoan(
  metal: string,
  collateralGrams: number,
  termMonths: number,
): Promise<{
  ok: boolean; error?: string;
  metal: string; collateralGrams: number; navPerGram: number; collateralValue: number;
  maxLtv: number; maxBorrow: number; apr: number; termMonths: number;
  liqLtv: number; liquidationPrice: number; unit: string;
}> {
  const m = metal.toUpperCase();
  const params = BORROW_PARAMS[m];
  if (!params) return { ok: false, error: `Unsupported collateral ${m}` } as any;
  if (!VALID_TERMS.includes(termMonths)) return { ok: false, error: `Term must be 3, 6 or 12 months` } as any;
  let nav: number;
  try {
    nav = await freshPrice(m);
  } catch (e: any) {
    return { ok: false, error: e?.message || "Price unavailable" } as any;
  }
  const collateralValue = r2(collateralGrams * nav);
  const maxBorrow = r2(collateralValue * params.maxLtv);
  return {
    ok: true, metal: m, collateralGrams: r6(collateralGrams), navPerGram: nav,
    collateralValue, maxLtv: params.maxLtv, maxBorrow, apr: APR_BY_TERM[termMonths], termMonths,
    liqLtv: params.liqLtv, liquidationPrice: 0, unit: unitOf(m),
  };
}

/** Current pool utilisation. */
export async function getPool(): Promise<{ outstanding: number; cap: number; available: number }> {
  const outstanding = parseFloat((await redis().hget("borrow:pool", "outstanding")) as string || "0") || 0;
  return { outstanding: r2(outstanding), cap: POOL_CAP_USDC, available: r2(Math.max(0, POOL_CAP_USDC - outstanding)) };
}

/** Simple interest on the outstanding principal, accrued from start to `asOf`. */
export function accruedInterest(loan: Loan, asOfMs = Date.now()): number {
  const start = new Date(loan.startDate).getTime();
  const days = Math.max(0, (asOfMs - start) / DAY_MS);
  return r2((loan.principalUSDC * loan.apr * days) / 365);
}

/** Total owed now = principal + accrued interest − already repaid. */
export function amountOwed(loan: Loan, asOfMs = Date.now()): number {
  return r2(loan.principalUSDC + accruedInterest(loan, asOfMs) - (loan.repaidUSDC || 0));
}

/** Loan-to-value now, at the given collateral price. */
export function currentLtv(loan: Loan, price: number, asOfMs = Date.now()): number {
  const value = loan.collateralGrams * price;
  return value > 0 ? amountOwed(loan, asOfMs) / value : Infinity;
}

// Reserve `amt` against the pool cap — check and increment in one step.
const POOL_RESERVE = `
local amt = tonumber(ARGV[1])
local cap = tonumber(ARGV[2])
local out = tonumber(redis.call('HGET', KEYS[1], 'outstanding') or '0')
if out + amt > cap + 1e-6 then return {0, tostring(out)} end
redis.call('HINCRBYFLOAT', KEYS[1], 'outstanding', amt)
return {1, '0'}
`;

// Take `amt` of `field` from a balance hash if (and only if) it is there.
const BALANCE_DEBIT = `
local amt = tonumber(ARGV[2])
local bal = tonumber(redis.call('HGET', KEYS[1], ARGV[1]) or '0')
if bal + 1e-9 < amt then return {0, tostring(bal)} end
redis.call('HINCRBYFLOAT', KEYS[1], ARGV[1], -amt)
return {1, tostring(bal - amt)}
`;

async function debitBalance(address: string, field: string, amount: number): Promise<{ ok: boolean; available: number }> {
  const res = (await redis().eval(BALANCE_DEBIT, [balanceKey(address)], [field, String(amount)])) as [number, string];
  return { ok: Number(res[0]) === 1, available: Number(res[1]) };
}

const busy = { ok: false as const, error: "Another operation is in progress on your account. Please retry in a few seconds." };

/** CREATE a loan: reserve pool, lock collateral, write ledger. The route must
 *  have done KYC + 2FA + T&C, and credits the USDC after this returns ok. */
export async function createLoan(params: {
  address: string; metal: string; collateralGrams: number; principalUSDC: number; termMonths: number;
}): Promise<{ ok: boolean; error?: string; loan?: Loan; originationFeeUSDC?: number; netDisbursedUSDC?: number }> {
  const address = (params.address || "").toLowerCase();
  const m = (params.metal || "").toUpperCase();
  const collateral = r6(params.collateralGrams);
  const principalUSDC = r2(params.principalUSDC);
  const termMonths = Number(params.termMonths);
  const unit = unitOf(m);

  const cfg = BORROW_PARAMS[m];
  if (!cfg) return { ok: false, error: `Unsupported collateral ${m}` };
  if (!VALID_TERMS.includes(termMonths)) return { ok: false, error: "Term must be 3, 6 or 12 months" };
  if (!(principalUSDC >= MIN_LOAN_USDC)) return { ok: false, error: `Minimum loan ${MIN_LOAN_USDC} USDC` };
  if (!(collateral > 0)) return { ok: false, error: "Collateral must be > 0" };
  if (await isBorrowPaused()) return { ok: false, error: "Borrowing is temporarily paused" };

  let nav: number;
  try {
    nav = await freshPrice(m);
  } catch (e: any) {
    return { ok: false, error: e?.message || "Price unavailable" };
  }
  const collateralValue = collateral * nav;
  const maxBorrow = collateralValue * cfg.maxLtv;
  if (principalUSDC > maxBorrow + 1e-6) {
    return { ok: false, error: `Exceeds max LTV ${(cfg.maxLtv * 100).toFixed(0)}%: max ${r2(maxBorrow)} USDC for ${collateral} ${unit} ${m}` };
  }

  const lock = await acquireBalanceLock(address, "borrow");
  if (!lock) return busy;
  let poolReserved = false;
  try {
    const pool = (await redis().eval(POOL_RESERVE, ["borrow:pool"], [String(principalUSDC), String(POOL_CAP_USDC)])) as [number, string];
    if (Number(pool[0]) !== 1) {
      return { ok: false, error: `Pool capacity reached: ${r2(Math.max(0, POOL_CAP_USDC - Number(pool[1])))} USDC available` };
    }
    poolReserved = true;

    const id = `LOAN_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    if (m === "AUXR") {
      const d = await debitBalance(address, "auxr", collateral);
      if (!d.ok) return { ok: false, error: `Insufficient in-app AUXR: ${r6(d.available)} available (on-chain AUXR can't be pledged)` };
    } else {
      const l = await lockCollateral(address, m, collateral, id);
      if (!l.ok) return { ok: false, error: l.error || "Could not lock collateral" };
    }

    const apr = APR_BY_TERM[termMonths];
    const originationFeeUSDC = r2(principalUSDC * ORIGINATION_FEE);
    const now = new Date();
    const maturity = new Date(now.getTime());
    maturity.setMonth(maturity.getMonth() + termMonths);
    const liquidationPrice = r6(principalUSDC / (collateral * cfg.liqLtv));

    const loan: Loan = {
      id, address, metal: m, collateralGrams: collateral, principalUSDC, apr, termMonths,
      originationFeeUSDC, startDate: now.toISOString(), maturityDate: maturity.toISOString(),
      status: "active", extended: false, repaidUSDC: 0, interestPaidUSDC: 0, principalPaidUSDC: 0,
      liquidationPrice,
    };
    await redis().hset(`loan:${id}`, loan as any);
    await redis().sadd(`borrow:user:${address}:loans`, id);
    poolReserved = false; // the loan owns it now

    console.log(`💵 Loan ${id}: ${principalUSDC} USDC vs ${collateral}${unit} ${m} (LTV ${(principalUSDC / collateralValue * 100).toFixed(1)}%, liq @ ${liquidationPrice}/${unit})`);
    return { ok: true, loan, originationFeeUSDC, netDisbursedUSDC: r2(principalUSDC - originationFeeUSDC) };
  } finally {
    if (poolReserved) await redis().hincrbyfloat("borrow:pool", "outstanding", -principalUSDC).catch(() => {});
    await releaseBalanceLock(lock);
  }
}

export async function loadLoan(loanId: string): Promise<Loan | null> {
  const raw = (await redis().hgetall(`loan:${loanId}`)) as Record<string, unknown> | null;
  if (!raw || !Object.keys(raw).length) return null;
  const n = (k: string) => parseFloat(String(raw[k] ?? "0")) || 0;
  return {
    id: String(raw.id), address: String(raw.address), metal: String(raw.metal),
    collateralGrams: n("collateralGrams"),
    principalUSDC: n("principalUSDC"),
    apr: n("apr"),
    termMonths: parseInt(String(raw.termMonths)) || 0,
    originationFeeUSDC: n("originationFeeUSDC"),
    startDate: String(raw.startDate), maturityDate: String(raw.maturityDate),
    status: (raw.status as LoanStatus) || "active",
    extended: String(raw.extended) === "true",
    repaidUSDC: n("repaidUSDC"),
    // Loans opened before these fields existed had no repayments (checked
    // 2026-11-03), so 0 is exact for them.
    interestPaidUSDC: n("interestPaidUSDC"),
    principalPaidUSDC: n("principalPaidUSDC"),
    liquidationPrice: n("liquidationPrice"),
    marginCallAt: raw.marginCallAt ? String(raw.marginCallAt) : undefined,
  };
}

/** List a user's loans with live owed/interest figures. */
export async function getUserLoans(address: string): Promise<Array<Loan & { accruedInterest: number; owed: number; unit: string }>> {
  const ids = (await redis().smembers(`borrow:user:${(address || "").toLowerCase()}:loans`)) as string[];
  const out: Array<Loan & { accruedInterest: number; owed: number; unit: string }> = [];
  for (const id of ids || []) {
    const loan = await loadLoan(id);
    if (!loan) continue;
    out.push({ ...loan, accruedInterest: accruedInterest(loan), owed: amountOwed(loan), unit: unitOf(loan.metal) });
  }
  return out.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
}

/** Give collateral back to its owner (whole, or `amount` of it). */
async function returnCollateral(loan: Loan, amount: number): Promise<void> {
  if (loan.metal === "AUXR") {
    if (amount > 0) await redis().hincrbyfloat(balanceKey(loan.address), "auxr", amount);
  } else {
    await releaseCollateral(loan.address, loan.metal, loan.collateralGrams, loan.id);
  }
}

/** REPAY (full or partial) in USDC, debited from the user's balance here.
 *  Applied to interest first, then principal; the pool shrinks only by the
 *  principal part. Full repayment returns the collateral. */
export async function repayLoan(
  address: string, loanId: string, repayUSDC: number,
): Promise<{ ok: boolean; error?: string; status?: number; paid?: number; closed?: boolean; remainingOwed?: number; releasedGrams?: number; metal?: string }> {
  const addr = (address || "").toLowerCase();
  const lock = await acquireBalanceLock(addr, "borrow-repay");
  if (!lock) return { ...busy, status: 409 };
  try {
    const loan = await loadLoan(loanId);
    if (!loan || loan.address.toLowerCase() !== addr) return { ok: false, error: "Loan not found for this user", status: 404 };
    if (loan.status !== "active") return { ok: false, error: `Loan already ${loan.status}`, status: 400 };

    const owed = amountOwed(loan);
    const pay = r2(Math.min(Number(repayUSDC) || 0, owed));
    if (!(pay > 0)) return { ok: false, error: "Nothing to repay", status: 400 };

    const d = await debitBalance(addr, "usdc", pay);
    if (!d.ok) return { ok: false, error: `Insufficient USDC: need ${pay}, have ${r2(d.available)}. Top up to repay.`, status: 400 };

    const interestDue = r2(Math.max(0, accruedInterest(loan) - loan.interestPaidUSDC));
    const toInterest = Math.min(pay, interestDue);
    const toPrincipal = r2(pay - toInterest);
    const interestPaid = r2(loan.interestPaidUSDC + toInterest);
    const principalPaid = r2(loan.principalPaidUSDC + toPrincipal);
    const repaid = r2(loan.repaidUSDC + pay);
    const remainingOwed = r2(owed - pay);

    if (remainingOwed <= 0.01) {
      // Whatever principal is still on the pool's books comes off with the loan.
      await redis().hincrbyfloat("borrow:pool", "outstanding", -r2(loan.principalUSDC - loan.principalPaidUSDC));
      await returnCollateral(loan, loan.collateralGrams);
      await redis().hset(`loan:${loanId}`, {
        status: "repaid", repaidUSDC: repaid, interestPaidUSDC: interestPaid, principalPaidUSDC: principalPaid,
        closedAt: new Date().toISOString(),
      });
      await redis().hdel(`loan:${loanId}`, "marginCallAt");
      await redis().srem(`borrow:user:${addr}:loans`, loanId);
      console.log(`✅ Loan ${loanId} REPAID — returned ${loan.collateralGrams}${unitOf(loan.metal)} ${loan.metal}`);
      return { ok: true, paid: pay, closed: true, remainingOwed: 0, releasedGrams: loan.collateralGrams, metal: loan.metal };
    }

    if (toPrincipal > 0) await redis().hincrbyfloat("borrow:pool", "outstanding", -toPrincipal);
    await redis().hset(`loan:${loanId}`, { repaidUSDC: repaid, interestPaidUSDC: interestPaid, principalPaidUSDC: principalPaid });
    console.log(`📥 Loan ${loanId} partial repay ${pay} USDC — ${remainingOwed} USDC remaining`);
    return { ok: true, paid: pay, closed: false, remainingOwed, releasedGrams: 0, metal: loan.metal };
  } finally {
    await releaseBalanceLock(lock);
  }
}

/** LIQUIDATE: LTV past liqLtv, or maturity passed unpaid — run by the monitor
 *  after the margin-call grace period. Takes just enough collateral at the
 *  current price to cover owed + fee and returns the rest to the borrower. */
export async function liquidateLoan(
  loanId: string, reason: "ltv" | "maturity",
): Promise<{ ok: boolean; error?: string; soldGrams: number; returnedGrams: number; coveredUSDC: number }> {
  const loan = await loadLoan(loanId);
  const none = { soldGrams: 0, returnedGrams: 0, coveredUSDC: 0 };
  if (!loan) return { ok: false, error: "Loan not found", ...none };
  const lock = await acquireBalanceLock(loan.address, "borrow-liquidate");
  if (!lock) return { ...busy, ...none };
  try {
    const fresh = await loadLoan(loanId); // re-read under the lock
    if (!fresh || fresh.status !== "active") return { ok: false, error: `Loan already ${fresh?.status}`, ...none };

    const nav = await freshPrice(fresh.metal);
    const owed = amountOwed(fresh);
    const toCover = r2(owed * (1 + LIQUIDATION_FEE));
    let sold = r6(Math.min(fresh.collateralGrams, toCover / nav));
    // Metal allocations are whole bars of whole grams; AUXR is divisible.
    if (fresh.metal !== "AUXR") sold = Math.min(fresh.collateralGrams, Math.ceil(sold));
    const returned = r6(fresh.collateralGrams - sold);

    if (fresh.metal === "AUXR") {
      // The units were already out of the user's balance. The sold part is
      // retired (burned) — that liability is gone — and the rest goes back.
      if (sold > 0) {
        await recordBurn({ unitsAUXR: sold, refId: loanId, walletAddress: fresh.address, reason: `borrow liquidation (${reason})` })
          .catch((e) => console.error(`[borrow] reserve burn failed for ${loanId}:`, e));
      }
      await returnCollateral(fresh, returned);
    } else {
      await releaseCollateral(fresh.address, fresh.metal, fresh.collateralGrams, fresh.id);
      if (sold > 0) await reduceAllocations(fresh.address, fresh.metal, sold);
    }

    await redis().hincrbyfloat("borrow:pool", "outstanding", -r2(fresh.principalUSDC - fresh.principalPaidUSDC));
    await redis().hset(`loan:${loanId}`, {
      status: "liquidated", liquidatedAt: new Date().toISOString(), liquidationReason: reason,
      soldGrams: sold.toString(), returnedGrams: returned.toString(), liquidationNav: nav.toString(),
    });
    await redis().srem(`borrow:user:${fresh.address}:loans`, loanId);

    console.log(`⚖️ Loan ${loanId} LIQUIDATED (${reason}) — sold ${sold}${unitOf(fresh.metal)} ${fresh.metal} @ ${nav}, returned ${returned}`);
    return { ok: true, soldGrams: sold, returnedGrams: returned, coveredUSDC: r2(sold * nav) };
  } finally {
    await releaseBalanceLock(lock);
  }
}

/** EXTEND a loan once, +3 months at 3mo APR. LTV must be healthy (≤ maxLtv). */
export async function extendLoan(loanId: string): Promise<{ ok: boolean; error?: string; newMaturity?: string }> {
  const loan = await loadLoan(loanId);
  if (!loan) return { ok: false, error: "Loan not found" };
  if (loan.status !== "active") return { ok: false, error: `Loan ${loan.status}` };
  if (loan.extended) return { ok: false, error: "Already extended once (max one 3-month extension)" };
  const cfg = BORROW_PARAMS[loan.metal];
  const nav = await freshPrice(loan.metal);
  const ltv = currentLtv(loan, nav);
  if (ltv > cfg.maxLtv + 1e-6) {
    return { ok: false, error: `LTV too high to extend (${(ltv * 100).toFixed(1)}% > ${(cfg.maxLtv * 100).toFixed(0)}%) — top up or partial-repay first` };
  }
  const newMaturity = new Date(loan.maturityDate);
  newMaturity.setMonth(newMaturity.getMonth() + EXTENSION_MONTHS);
  await redis().hset(`loan:${loanId}`, { extended: "true", maturityDate: newMaturity.toISOString(), apr: EXTENSION_APR.toString(), extendedAt: new Date().toISOString() });
  console.log(`🔁 Loan ${loanId} extended +${EXTENSION_MONTHS}mo @ ${EXTENSION_APR * 100}% → ${newMaturity.toISOString()}`);
  return { ok: true, newMaturity: newMaturity.toISOString() };
}

/** Every loan still open, for the monitor. */
export async function listActiveLoans(): Promise<Loan[]> {
  const r = redis();
  const out: Loan[] = [];
  let cursor: string | number = 0;
  do {
    const [next, keys] = (await r.scan(cursor, { match: "loan:LOAN_*", count: 500 })) as [string, string[]];
    cursor = next;
    for (const k of keys) {
      const loan = await loadLoan(k.slice("loan:".length));
      if (loan && loan.status === "active") out.push(loan);
    }
  } while (String(cursor) !== "0");
  return out;
}
