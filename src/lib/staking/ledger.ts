// src/lib/staking/ledger.ts
// The one place a stake is opened or settled.
//
// Before this, three stores disagreed (on-chain StakingV2, Redis `stakes:*`,
// Redis `user:*:staking`) and each had its own hole: /api/stakes took the APY
// from the request body and never locked the metal, /api/staking debited a
// balance that the balance view subtracted a second time, and the maturity
// cron marked positions "completed" while a user withdraw only refused
// "withdrawn" — so a matured position could be paid twice.
//
// Rules here:
//   • The rate comes from STAKING_PRODUCTS, never from the caller.
//   • Opening and settling hold the same per-user balance lock as
//     trade / transfer / withdraw / redeem, so they serialise with them.
//   • Metals are locked with the allocation-service "yielding" encumbrance,
//     which every metal-out flow already checks via assertAvailable — staked
//     grams can no longer be sold, sent or withdrawn. AUXR has no allocation
//     records, so its stake is debited from the in-app `auxr` balance.
//   • Settling is a compare-and-set in one Lua script: the position must still
//     read "active" at the moment it is flipped and paid, so a position can be
//     paid once, whoever (user or cron) gets there first.
//   • Rewards are promised by Auxite. No lease or hedge income funds them yet
//     (see yield-accounting.ts); `platform:staked:*` and `platform:yield:*`
//     are the liability counters, and per-asset caps bound them.

import { getRedis } from "@/lib/redis";
import { acquireBalanceLock, releaseBalanceLock } from "@/lib/balance-lock";
import { addYielding, releaseYielding } from "@/lib/allocation-service";

export type StakeAsset = "auxg" | "auxs" | "auxpt" | "auxpd" | "auxr";
export type Tier = 3 | 6 | 12;

interface Product {
  unit: "g" | "AUXR";
  min: number;
  apy: Record<Tier, number>;   // % per year, by lock tier in months
  /** Locked through the allocation encumbrance (metals) or debited (AUXR). */
  lockModel: "encumbrance" | "debit";
  /** Default ceiling on the total ACTIVE amount platform-wide; null = none.
   *  Overridable at runtime with `staking:config` field `cap:<asset>`. */
  defaultCap: number | null;
}

export const STAKING_PRODUCTS: Record<StakeAsset, Product> = {
  auxg:  { unit: "g", min: 1,   lockModel: "encumbrance", defaultCap: null, apy: { 3: 1.53, 6: 2.03, 12: 2.53 } },
  auxs:  { unit: "g", min: 5,   lockModel: "encumbrance", defaultCap: null, apy: { 3: 1.23, 6: 1.73, 12: 2.23 } },
  auxpt: { unit: "g", min: 0.5, lockModel: "encumbrance", defaultCap: null, apy: { 3: 2.03, 6: 2.53, 12: 3.03 } },
  auxpd: { unit: "g", min: 0.5, lockModel: "encumbrance", defaultCap: null, apy: { 3: 1.83, 6: 2.33, 12: 2.83 } },
  // AUXR has no lease market behind it, so every unit of reward is paid by
  // Auxite. The cap keeps that liability bounded (~250 AUXR ≈ $21k at NAV 85)
  // until there is real income to fund it.
  auxr:  { unit: "AUXR", min: 0.1, lockModel: "debit", defaultCap: 250, apy: { 3: 2.0, 6: 2.5, 12: 3.0 } },
};

/** Lock length in days for each tier — same calendar the app has always used. */
export const TIER_DAYS: Record<Tier, number> = { 3: 91, 6: 181, 12: 366 };

/** Accepts months (3/6/12) or the legacy day counts (30/90/91/180/181/365/366). */
export function toTier(duration: number): Tier | null {
  const d = Number(duration);
  if (d === 3 || d === 6 || d === 12) return d;
  if ([30, 90, 91].includes(d)) return 3;
  if ([180, 181].includes(d)) return 6;
  if ([365, 366].includes(d)) return 12;
  return null;
}

/** Early exit returns the principal and half the reward accrued so far. */
export const EARLY_EXIT_REWARD_SHARE = 0.5;

export interface StakePosition {
  id: string;
  metal: string;            // asset key, lower case (kept as `metal` for older readers)
  amount: number;
  duration: number;         // days
  durationMonths: Tier;
  apy: number;
  startDate: number;
  endDate: number;
  expectedReward: number;
  status: "active" | "completed" | "withdrawn";
  lockModel?: "encumbrance" | "debit";   // absent on positions opened before this ledger = "debit"
  agreementNo?: string;
  withdrawnAt?: number;
  actualReward?: number;
  poolId?: string;
}

const CONFIG_KEY = "staking:config";
const stakingKey = (a: string) => `user:${a}:staking`;
const balanceKey = (a: string) => `user:${a}:balance`;
const txKey = (a: string) => `user:${a}:transactions`;
const stakedKey = (asset: string) => `platform:staked:${asset}`;
const paidKey = (asset: string) => `platform:yield:paid:${asset}`;

export interface StakingConfig {
  paused: boolean;
  caps: Record<StakeAsset, number | null>;
}

export async function getStakingConfig(): Promise<StakingConfig> {
  const raw = ((await getRedis().hgetall(CONFIG_KEY)) || {}) as Record<string, unknown>;
  const caps = {} as Record<StakeAsset, number | null>;
  for (const a of Object.keys(STAKING_PRODUCTS) as StakeAsset[]) {
    const v = raw[`cap:${a}`];
    caps[a] = v === undefined || v === null || v === "" ? STAKING_PRODUCTS[a].defaultCap
      : String(v) === "none" ? null : Number(v);
  }
  return { paused: String(raw.paused) === "true", caps };
}

// Reserve `amount` against the platform cap and, for debit-model assets, take
// it from the user's balance — both or neither.
const OPEN_SCRIPT = `
local amt = tonumber(ARGV[2])
local cap = tonumber(ARGV[3])
local active = tonumber(redis.call('HGET', KEYS[2], 'active') or '0')
if cap >= 0 and active + amt > cap + 1e-9 then return {-1, tostring(active)} end
if ARGV[4] == 'debit' then
  local bal = tonumber(redis.call('HGET', KEYS[1], ARGV[1]) or '0')
  if bal + 1e-9 < amt then return {0, tostring(bal)} end
  redis.call('HINCRBYFLOAT', KEYS[1], ARGV[1], -amt)
end
redis.call('HINCRBYFLOAT', KEYS[2], 'active', amt)
redis.call('HINCRBYFLOAT', KEYS[2], 'total', amt)
redis.call('LPUSH', KEYS[3], ARGV[5])
redis.call('LPUSH', KEYS[4], ARGV[6])
return {1, '0'}
`;

// Flip one position from active to its settled form and pay it, atomically.
// The element is found by its id and must still contain "status":"active";
// a second caller finds nothing to flip and pays nothing.
const SETTLE_SCRIPT = `
local n = redis.call('LLEN', KEYS[1])
for i = 0, n - 1 do
  local el = redis.call('LINDEX', KEYS[1], i)
  if string.find(el, ARGV[1], 1, true) then
    if not string.find(el, '"status":"active"', 1, true) then return 0 end
    redis.call('LSET', KEYS[1], i, ARGV[2])
    local credit = tonumber(ARGV[4])
    if credit > 0 then redis.call('HINCRBYFLOAT', KEYS[2], ARGV[3], credit) end
    local reward = tonumber(ARGV[5])
    if reward > 0 then
      redis.call('HINCRBYFLOAT', KEYS[4], 'total', reward)
      redis.call('HINCRBYFLOAT', KEYS[4], 'count', 1)
    end
    redis.call('HINCRBYFLOAT', KEYS[3], 'active', -tonumber(ARGV[6]))
    redis.call('LPUSH', KEYS[5], ARGV[7])
    return 1
  end
end
return 0
`;

type Fail = { ok: false; status: number; error: string; [k: string]: unknown };

export async function openStake(input: {
  address: string;
  asset: string;
  amount: number;
  duration: number;          // months or legacy days
  agreementNo?: string;
}): Promise<{ ok: true; position: StakePosition } | Fail> {
  const address = input.address.toLowerCase();
  const asset = String(input.asset || "").toLowerCase() as StakeAsset;
  const product = STAKING_PRODUCTS[asset];
  if (!product) return { ok: false, status: 400, error: `Staking is not available for ${input.asset}` };

  const tier = toTier(input.duration);
  if (!tier) return { ok: false, status: 400, error: "Invalid duration. Valid options: 3, 6 or 12 months" };

  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, status: 400, error: "Invalid amount" };
  if (amount < product.min) {
    return { ok: false, status: 400, error: `Minimum stake for ${asset.toUpperCase()} is ${product.min} ${product.unit}` };
  }

  const config = await getStakingConfig();
  if (config.paused) return { ok: false, status: 503, error: "Staking is temporarily paused" };

  const lock = await acquireBalanceLock(address, "stake");
  if (!lock) {
    return { ok: false, status: 409, error: "Another operation is in progress on your account. Please retry in a few seconds." };
  }
  let yieldingAdded = false;
  try {
    if (product.lockModel === "encumbrance") {
      const y = await addYielding(address, asset, amount);
      if (!y.ok) return { ok: false, status: 400, error: y.error || "Insufficient available balance" };
      yieldingAdded = true;
    }

    const now = Date.now();
    const days = TIER_DAYS[tier];
    const apy = product.apy[tier];
    const position: StakePosition = {
      id: `stake_${now}_${Math.random().toString(36).slice(2, 11)}`,
      metal: asset,
      amount,
      duration: days,
      durationMonths: tier,
      apy,
      startDate: now,
      endDate: now + days * 86_400_000,
      expectedReward: (amount * apy / 100) * (days / 365),
      status: "active",
      lockModel: product.lockModel,
      ...(input.agreementNo ? { agreementNo: input.agreementNo } : {}),
    };
    const tx = {
      id: position.id, type: "stake", metal: asset.toUpperCase(), amount: amount.toString(),
      duration: days, apy, expectedReward: position.expectedReward.toFixed(6),
      status: "active", timestamp: now, endDate: position.endDate,
    };

    const cap = config.caps[asset];
    const res = (await getRedis().eval(
      OPEN_SCRIPT,
      [balanceKey(address), stakedKey(asset), stakingKey(address), txKey(address)],
      [asset, String(amount), String(cap ?? -1), product.lockModel, JSON.stringify(position), JSON.stringify(tx)],
    )) as [number, string];

    if (Number(res[0]) === 1) {
      yieldingAdded = false;   // kept: the position now owns it
      return { ok: true, position };
    }
    if (Number(res[0]) === -1) {
      return { ok: false, status: 400, error: `${asset.toUpperCase()} staking is at capacity`, capacity: cap, active: Number(res[1]) };
    }
    return { ok: false, status: 400, error: `Insufficient ${asset.toUpperCase()} balance`, available: Number(res[1]), required: amount };
  } finally {
    if (yieldingAdded) await releaseYielding(address, asset, amount).catch(() => {});
    await releaseBalanceLock(lock);
  }
}

export async function readPositions(address: string): Promise<StakePosition[]> {
  const raw = await getRedis().lrange(stakingKey(address.toLowerCase()), 0, -1);
  return raw
    .map((p: unknown) => {
      try { return (typeof p === "string" ? JSON.parse(p) : p) as StakePosition; } catch { return null; }
    })
    .filter((p): p is StakePosition => !!p && !!p.id);
}

/** Settle a position: at maturity it pays principal + full reward, before
 *  maturity it returns the principal plus EARLY_EXIT_REWARD_SHARE of the
 *  reward accrued so far. `onlyIfMatured` is the cron's mode. */
export async function settleStake(input: {
  address: string;
  positionId: string;
  onlyIfMatured?: boolean;
  /** Override the reward (e.g. from real income accrual). */
  rewardOverride?: number;
}): Promise<
  | { ok: true; position: StakePosition; principal: number; reward: number; isEarly: boolean }
  | Fail
> {
  const address = input.address.toLowerCase();
  const lock = await acquireBalanceLock(address, "unstake");
  if (!lock) {
    return { ok: false, status: 409, error: "Another operation is in progress on your account. Please retry in a few seconds." };
  }
  try {
    const pos = (await readPositions(address)).find((p) => p.id === input.positionId);
    if (!pos) return { ok: false, status: 404, error: "Position not found" };
    if (pos.status !== "active") return { ok: false, status: 400, error: `Position already ${pos.status}` };

    const now = Date.now();
    const matured = now >= pos.endDate;
    if (input.onlyIfMatured && !matured) return { ok: false, status: 400, error: "Not matured" };

    let reward: number;
    if (matured) {
      reward = input.rewardOverride != null && input.rewardOverride > 0 ? input.rewardOverride : pos.expectedReward;
    } else {
      const progress = Math.max(0, Math.min(1, (now - pos.startDate) / (pos.endDate - pos.startDate)));
      reward = pos.expectedReward * progress * EARLY_EXIT_REWARD_SHARE;
    }

    // Encumbrance-model principal never left the allocations — only the
    // reward is credited. Debit-model principal comes back with it.
    const model = pos.lockModel || "debit";
    const credit = model === "encumbrance" ? reward : pos.amount + reward;

    const settled: StakePosition = {
      ...pos,
      status: matured ? "completed" : "withdrawn",
      withdrawnAt: now,
      actualReward: reward,
    };
    const tx = {
      id: `unstake_${now}_${Math.random().toString(36).slice(2, 11)}`,
      type: "unstake", metal: pos.metal.toUpperCase(), amount: pos.amount.toString(),
      reward: reward.toFixed(6), totalReturn: (pos.amount + reward).toFixed(6),
      isEarly: !matured, status: "completed", timestamp: now, originalPositionId: pos.id,
      ...(input.onlyIfMatured ? { auto: true } : {}),
    };

    const flipped = Number(await getRedis().eval(
      SETTLE_SCRIPT,
      [stakingKey(address), balanceKey(address), stakedKey(pos.metal), paidKey(pos.metal), txKey(address)],
      [`"id":"${pos.id}"`, JSON.stringify(settled), pos.metal, String(credit), String(reward), String(pos.amount), JSON.stringify(tx)],
    ));
    if (flipped !== 1) return { ok: false, status: 409, error: "Position was settled by another request" };

    if (model === "encumbrance") {
      const r = await releaseYielding(address, pos.metal, pos.amount);
      if (!r.ok) console.error(`[staking] paid ${pos.id} but could not release yielding for ${address}`);
    }
    return { ok: true, position: settled, principal: pos.amount, reward, isEarly: !matured };
  } finally {
    await releaseBalanceLock(lock);
  }
}

/** Active amounts that the balance view must hide. Only encumbrance-model
 *  positions: debit-model ones were already taken out of the balance hash,
 *  and subtracting them again showed users less than they had. */
export async function encumberedStakeAmounts(address: string): Promise<Record<string, number>> {
  // Matured-but-unsettled positions still hold their grams until the maturity
  // job pays them, so they stay hidden too.
  const out: Record<string, number> = {};
  for (const p of await readPositions(address)) {
    if (p.status === "active" && p.lockModel === "encumbrance") {
      out[p.metal] = (out[p.metal] || 0) + (Number(p.amount) || 0);
    }
  }
  return out;
}
