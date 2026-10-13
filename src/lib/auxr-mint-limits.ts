// src/lib/auxr-mint-limits.ts
//
// Hard limits on AUXR issuance.
//
// On 10-11 October 2026 an attacker minted 697 AUXR to an exchange in six
// calls over two and a half hours, and it was an exchange that told us, a day
// later. A notification would have shortened that, but a notification arriving
// at 00:20 does not stop a mint that is already on chain. What stops it is a
// limit that refuses the call.
//
// So: alerting is in `notifyAuxrMint`, and prevention is here. Three layers,
// each able to stop issuance on its own:
//
//   1. a kill switch an operator can set in one Redis write
//   2. a rolling 24h cap per account
//   3. a rolling 24h cap across the whole platform
//
// Counters are incremented BEFORE the mint and rolled back if it fails. The
// reverse order is what made the September balance incident possible: read,
// decide, then write leaves a window where parallel calls all pass the same
// check.

import { getRedis } from "@/lib/redis";

const num = (v: string | undefined, d: number) => {
  const n = parseFloat(String(v ?? ""));
  return Number.isFinite(n) && n > 0 ? n : d;
};

/** Per-account rolling 24h ceiling. */
export const DAILY_CAP_PER_ACCOUNT = num(process.env.AUXR_MINT_DAILY_CAP_ACCOUNT, 250);
/** Platform-wide rolling 24h ceiling. */
export const DAILY_CAP_GLOBAL = num(process.env.AUXR_MINT_DAILY_CAP_GLOBAL, 1000);
/** Above this, a single withdrawal is not executed automatically. */
export const MANUAL_REVIEW_THRESHOLD = num(process.env.AUXR_MINT_REVIEW_THRESHOLD, 100);

const HALT_KEY = "auxr:mint:halt";
const WINDOW = 24 * 60 * 60;

const acctKey = (a: string) => `auxr:mint:24h:acct:${a.toLowerCase()}`;
const globalKey = () => "auxr:mint:24h:global";

export type LimitVerdict =
  | { ok: true; accountUsed: number; globalUsed: number }
  | { ok: false; code: string; error: string; detail?: Record<string, number | string> };

/**
 * Reserves `units` against both ceilings. On refusal nothing is reserved.
 *
 * Call this before debiting the off-chain balance; call `release` if the mint
 * then fails, so a failed attempt does not consume someone's daily allowance.
 */
export async function reserveMintAllowance(
  address: string,
  units: number,
): Promise<LimitVerdict> {
  const redis = getRedis();

  if (await redis.get(HALT_KEY)) {
    return {
      ok: false,
      code: "mint_halted",
      error: "AUXR issuance is halted. Contact support.",
    };
  }

  if (units > MANUAL_REVIEW_THRESHOLD) {
    return {
      ok: false,
      code: "manual_review_required",
      error: `Withdrawals above ${MANUAL_REVIEW_THRESHOLD} AUXR are reviewed before release.`,
      detail: { threshold: MANUAL_REVIEW_THRESHOLD, requested: units },
    };
  }

  // Increment first, judge after: a check-then-write leaves concurrent calls
  // all passing the same check.
  const aKey = acctKey(address);
  const gKey = globalKey();
  const accountUsed = Number(await redis.incrbyfloat(aKey, units));
  const globalUsed = Number(await redis.incrbyfloat(gKey, units));
  // Only set the window on the first write, so the 24h is rolling from first
  // use rather than extended by every later one.
  if (accountUsed <= units + 1e-9) await redis.expire(aKey, WINDOW);
  if (globalUsed <= units + 1e-9) await redis.expire(gKey, WINDOW);

  if (accountUsed > DAILY_CAP_PER_ACCOUNT + 1e-9) {
    await redis.incrbyfloat(aKey, -units);
    await redis.incrbyfloat(gKey, -units);
    return {
      ok: false,
      code: "daily_cap_account",
      error: "Daily withdrawal limit reached for this account.",
      detail: { cap: DAILY_CAP_PER_ACCOUNT, used: accountUsed - units, requested: units },
    };
  }

  if (globalUsed > DAILY_CAP_GLOBAL + 1e-9) {
    await redis.incrbyfloat(aKey, -units);
    await redis.incrbyfloat(gKey, -units);
    return {
      ok: false,
      code: "daily_cap_global",
      error: "Platform withdrawal limit reached. Try again later.",
      detail: { cap: DAILY_CAP_GLOBAL, used: globalUsed - units, requested: units },
    };
  }

  return { ok: true, accountUsed, globalUsed };
}

/** Give back an allowance reserved for a mint that did not happen. */
export async function releaseMintAllowance(address: string, units: number): Promise<void> {
  try {
    const redis = getRedis();
    await redis.incrbyfloat(acctKey(address), -units);
    await redis.incrbyfloat(globalKey(), -units);
  } catch (e) {
    // Never let bookkeeping fail a request that already succeeded or failed.
    console.error("releaseMintAllowance failed:", e);
  }
}

/** Stop all AUXR issuance immediately. Survives restarts; clear with `resumeMinting`. */
export async function haltMinting(reason: string): Promise<void> {
  await getRedis().set(HALT_KEY, JSON.stringify({ reason, at: new Date().toISOString() }));
}

export async function resumeMinting(): Promise<void> {
  await getRedis().del(HALT_KEY);
}

export async function mintingStatus(): Promise<{
  halted: boolean;
  haltReason?: string;
  globalUsed24h: number;
  caps: { account: number; global: number; reviewThreshold: number };
}> {
  const redis = getRedis();
  const raw = await redis.get(HALT_KEY);
  let haltReason: string | undefined;
  if (raw) {
    try {
      haltReason = (typeof raw === "string" ? JSON.parse(raw) : (raw as any))?.reason;
    } catch {
      haltReason = String(raw);
    }
  }
  return {
    halted: !!raw,
    haltReason,
    globalUsed24h: parseFloat(String((await redis.get(globalKey())) ?? 0)) || 0,
    caps: {
      account: DAILY_CAP_PER_ACCOUNT,
      global: DAILY_CAP_GLOBAL,
      reviewThreshold: MANUAL_REVIEW_THRESHOLD,
    },
  };
}
