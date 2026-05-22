// ============================================================================
// AUXR RESERVE TRACKER
// ----------------------------------------------------------------------------
// Maintains the off-chain ledger of metals reserved to back outstanding AUXR
// supply. Every mint adds basket grams; every burn releases them. The
// backing ratio reads supply × gramsPerUnit against reserves to detect
// drift — anything below 100% is a treasury operations alarm.
//
// Phase 1A: reserves live in Redis. There is no on-chain AUXR contract yet
// (off-chain accounting like AUXM). The vault custody side (Singapore /
// LBMA inventory we already have for AUXG/AUXS/AUXPT/AUXPD) is the source
// of truth for physical bullion availability — this module just tracks
// "earmarked for AUXR" vs "free."
//
// Integration with treasury-exposure.ts:
//   - When AUXR mints, we call recordExposureChange({ type: 'mint' }) on
//     each component metal so the global treasury ledger reflects the
//     synthetic supply. The basket grams are EXTRA mint on top of any
//     direct AUXG/AUXS/AUXPT/AUXPD held by users.
//   - When AUXR burns, we call recordExposureChange({ type: 'burn' }).
//
// Redis schema:
//   auxr:supply                hash  { units, lastUpdated }
//   auxr:reserves:{metal}      hash  { grams, lastUpdated }  (one per metal)
//   auxr:reserves:audit:log    list  JSON ReserveEvent[] (capped 10K)
// ============================================================================

import { redis, getRedis } from "@/lib/redis";
import { AUXR_GRAMS_PER_UNIT, getAuxrPricing } from "@/lib/auxr-pricing";
import {
  recordExposureChange,
  type MetalSymbol,
} from "@/lib/treasury-exposure";

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * Reserved address that represents the Auxite operations treasury — the
 * "house" account that holds AUXR backed by inventory we've already
 * procured. Used for:
 *   - Initial Phase 1A seed (pre-launch reserve booking)
 *   - Future market-maker balance (Phase 2)
 *   - Buffer for instant fulfillment when user buys faster than we
 *     can procure
 *
 * Off-chain only. Hex-shaped (valid 40-char address) for compatibility
 * with the wallet-address validators, but never holds real on-chain
 * tokens.
 */
export const AUXR_TREASURY_ADDRESS =
  "0x0000000000000000000000000000000000a11a11";

export type AuxrBasketMetal = "gold" | "silver" | "platinum" | "palladium";

export type ReserveAction = "mint" | "burn" | "manual_adjust";

export interface ReserveEvent {
  action: ReserveAction;
  unitsAUXR: number;
  deltas: {
    gold: number;
    silver: number;
    platinum: number;
    palladium: number;
  };
  refId?: string;
  walletAddress?: string;
  reason?: string;
  timestamp: number;
}

export interface ReserveSnapshot {
  /** Currently outstanding AUXR units. */
  supplyUnits: number;
  /** Grams reserved per metal. */
  reservesGrams: {
    gold: number;
    silver: number;
    platinum: number;
    palladium: number;
  };
  /** Grams required to fully back current supply. */
  requiredGrams: {
    gold: number;
    silver: number;
    platinum: number;
    palladium: number;
  };
  /** ratio = reserves / required. 1.0 = fully backed, >1 = surplus, <1 = under. */
  backingRatio: {
    gold: number;
    silver: number;
    platinum: number;
    palladium: number;
    /** min across all four — the weakest leg. */
    weakest: number;
  };
  /** USD value of reserves at current spot prices. */
  reservesUSD: number;
  /** USD market cap of outstanding supply at NAV. */
  marketCapUSD: number;
  lastUpdated: number;
}

// ── Internal key helpers ─────────────────────────────────────────────────────

const SUPPLY_KEY = "auxr:supply";
const RESERVES_KEY = (m: AuxrBasketMetal) => `auxr:reserves:${m}`;
const AUDIT_LOG_KEY = "auxr:reserves:audit:log";

// Map basket metal → treasury MetalSymbol. AUXR's pool of reserved metal
// shows up in the treasury exposure ledger as additional `total` supply
// (it's circulating, just not as a directly-held metal token).
const TREASURY_SYMBOL: Record<AuxrBasketMetal, MetalSymbol> = {
  gold: "AUXG",
  silver: "AUXS",
  platinum: "AUXPT",
  palladium: "AUXPD",
};

// ── Read API ─────────────────────────────────────────────────────────────────

/** Current outstanding AUXR units (off-chain ledger). */
export async function getAuxrSupply(): Promise<number> {
  const raw = await redis.hget(SUPPLY_KEY, "units");
  return parseFloat(String(raw || 0)) || 0;
}

/** Current grams reserved for one component metal. */
export async function getReserveGrams(metal: AuxrBasketMetal): Promise<number> {
  const raw = await redis.hget(RESERVES_KEY(metal), "grams");
  return parseFloat(String(raw || 0)) || 0;
}

/**
 * Full snapshot: supply, reserves, required, backing ratios, USD valuations.
 * This is the data the Proof-of-Reserves dashboard and admin treasury page
 * read from.
 */
export async function getReserveSnapshot(): Promise<ReserveSnapshot> {
  const [supplyUnits, gold, silver, platinum, palladium, pricing] = await Promise.all([
    getAuxrSupply(),
    getReserveGrams("gold"),
    getReserveGrams("silver"),
    getReserveGrams("platinum"),
    getReserveGrams("palladium"),
    getAuxrPricing(),
  ]);

  const required = {
    gold: supplyUnits * AUXR_GRAMS_PER_UNIT.gold,
    silver: supplyUnits * AUXR_GRAMS_PER_UNIT.silver,
    platinum: supplyUnits * AUXR_GRAMS_PER_UNIT.platinum,
    palladium: supplyUnits * AUXR_GRAMS_PER_UNIT.palladium,
  };

  // Backing ratio. Treat zero supply as fully-backed (no liability).
  const ratio = (r: number, q: number) => (q <= 0 ? 1 : r / q);
  const backing = {
    gold: ratio(gold, required.gold),
    silver: ratio(silver, required.silver),
    platinum: ratio(platinum, required.platinum),
    palladium: ratio(palladium, required.palladium),
  };
  const weakest = Math.min(backing.gold, backing.silver, backing.platinum, backing.palladium);

  const reservesUSD =
    gold * pricing.components.gold.spotUSDPerGram +
    silver * pricing.components.silver.spotUSDPerGram +
    platinum * pricing.components.platinum.spotUSDPerGram +
    palladium * pricing.components.palladium.spotUSDPerGram;

  const marketCapUSD = supplyUnits * pricing.navUSD;

  return {
    supplyUnits,
    reservesGrams: { gold, silver, platinum, palladium },
    requiredGrams: required,
    backingRatio: { ...backing, weakest },
    reservesUSD,
    marketCapUSD,
    lastUpdated: Date.now(),
  };
}

// ── Write API (mint / burn) ──────────────────────────────────────────────────

/**
 * Record an AUXR mint: increase supply, increase reserves by basket grams,
 * propagate to the treasury exposure ledger so the global view stays
 * consistent.
 *
 * Caller (the /api/auxr/buy endpoint) must already have:
 *   - debited the user's USD balance
 *   - credited the user's AUXR balance
 *
 * Idempotency is the caller's responsibility — pass a stable `refId` so
 * reconciliation can detect double-mints.
 */
export async function recordMint(params: {
  unitsAUXR: number;
  refId?: string;
  walletAddress?: string;
  reason?: string;
}): Promise<ReserveEvent> {
  const { unitsAUXR } = params;
  if (!Number.isFinite(unitsAUXR) || unitsAUXR <= 0) {
    throw new Error(`auxr-reserve: invalid mint units ${unitsAUXR}`);
  }

  const deltas = {
    gold: unitsAUXR * AUXR_GRAMS_PER_UNIT.gold,
    silver: unitsAUXR * AUXR_GRAMS_PER_UNIT.silver,
    platinum: unitsAUXR * AUXR_GRAMS_PER_UNIT.platinum,
    palladium: unitsAUXR * AUXR_GRAMS_PER_UNIT.palladium,
  };

  const now = Date.now();

  // Atomic supply + reserves bump. Use raw pipeline because the redis
  // wrapper proxy doesn't expose pipeline().hincrbyfloat() in a typed way.
  const pipe = getRedis().pipeline();
  pipe.hincrbyfloat(SUPPLY_KEY, "units", unitsAUXR);
  pipe.hset(SUPPLY_KEY, { lastUpdated: now });
  pipe.hincrbyfloat(RESERVES_KEY("gold"), "grams", deltas.gold);
  pipe.hset(RESERVES_KEY("gold"), { lastUpdated: now });
  pipe.hincrbyfloat(RESERVES_KEY("silver"), "grams", deltas.silver);
  pipe.hset(RESERVES_KEY("silver"), { lastUpdated: now });
  pipe.hincrbyfloat(RESERVES_KEY("platinum"), "grams", deltas.platinum);
  pipe.hset(RESERVES_KEY("platinum"), { lastUpdated: now });
  pipe.hincrbyfloat(RESERVES_KEY("palladium"), "grams", deltas.palladium);
  pipe.hset(RESERVES_KEY("palladium"), { lastUpdated: now });
  await pipe.exec();

  // Propagate to the treasury exposure ledger. AUXR-backing grams count as
  // additional `total` supply for each metal — Phase 2 hedge engine will
  // need to size positions against this combined exposure.
  await Promise.all(
    (Object.keys(deltas) as AuxrBasketMetal[]).map((m) =>
      recordExposureChange({
        metal: TREASURY_SYMBOL[m],
        type: "mint",
        amount: deltas[m],
        refId: params.refId ? `auxr-mint:${params.refId}:${m}` : undefined,
        walletAddress: params.walletAddress,
        reason: `AUXR mint: ${unitsAUXR.toFixed(6)} units`,
      }).catch((e) => {
        // Treasury propagation is best-effort — never break the user's
        // mint. Reconciler will catch any drift.
        console.warn(`[auxr-reserve] exposure propagation failed (${m}):`, e);
      })
    )
  );

  const event: ReserveEvent = {
    action: "mint",
    unitsAUXR,
    deltas,
    refId: params.refId,
    walletAddress: params.walletAddress?.toLowerCase(),
    reason: params.reason,
    timestamp: now,
  };

  await redis.lpush(AUDIT_LOG_KEY, JSON.stringify(event));
  await redis.ltrim(AUDIT_LOG_KEY, 0, 9999);

  return event;
}

/**
 * Record an AUXR burn: decrease supply, release basket grams, propagate
 * to the treasury exposure ledger. Same idempotency contract as mint.
 */
export async function recordBurn(params: {
  unitsAUXR: number;
  refId?: string;
  walletAddress?: string;
  reason?: string;
}): Promise<ReserveEvent> {
  const { unitsAUXR } = params;
  if (!Number.isFinite(unitsAUXR) || unitsAUXR <= 0) {
    throw new Error(`auxr-reserve: invalid burn units ${unitsAUXR}`);
  }

  // Defensive: don't allow burning more than outstanding supply (would
  // leave reserves stuck in a negative-supply state).
  const currentSupply = await getAuxrSupply();
  if (unitsAUXR > currentSupply + 1e-9) {
    throw new Error(
      `auxr-reserve: cannot burn ${unitsAUXR} units, supply is ${currentSupply}`
    );
  }

  const deltas = {
    gold: unitsAUXR * AUXR_GRAMS_PER_UNIT.gold,
    silver: unitsAUXR * AUXR_GRAMS_PER_UNIT.silver,
    platinum: unitsAUXR * AUXR_GRAMS_PER_UNIT.platinum,
    palladium: unitsAUXR * AUXR_GRAMS_PER_UNIT.palladium,
  };

  const now = Date.now();
  const pipe = getRedis().pipeline();
  pipe.hincrbyfloat(SUPPLY_KEY, "units", -unitsAUXR);
  pipe.hset(SUPPLY_KEY, { lastUpdated: now });
  pipe.hincrbyfloat(RESERVES_KEY("gold"), "grams", -deltas.gold);
  pipe.hset(RESERVES_KEY("gold"), { lastUpdated: now });
  pipe.hincrbyfloat(RESERVES_KEY("silver"), "grams", -deltas.silver);
  pipe.hset(RESERVES_KEY("silver"), { lastUpdated: now });
  pipe.hincrbyfloat(RESERVES_KEY("platinum"), "grams", -deltas.platinum);
  pipe.hset(RESERVES_KEY("platinum"), { lastUpdated: now });
  pipe.hincrbyfloat(RESERVES_KEY("palladium"), "grams", -deltas.palladium);
  pipe.hset(RESERVES_KEY("palladium"), { lastUpdated: now });
  await pipe.exec();

  await Promise.all(
    (Object.keys(deltas) as AuxrBasketMetal[]).map((m) =>
      recordExposureChange({
        metal: TREASURY_SYMBOL[m],
        type: "burn",
        amount: deltas[m],
        refId: params.refId ? `auxr-burn:${params.refId}:${m}` : undefined,
        walletAddress: params.walletAddress,
        reason: `AUXR burn: ${unitsAUXR.toFixed(6)} units`,
      }).catch((e) => {
        console.warn(`[auxr-reserve] exposure propagation failed (${m}):`, e);
      })
    )
  );

  const event: ReserveEvent = {
    action: "burn",
    unitsAUXR: -unitsAUXR,
    deltas: {
      gold: -deltas.gold,
      silver: -deltas.silver,
      platinum: -deltas.platinum,
      palladium: -deltas.palladium,
    },
    refId: params.refId,
    walletAddress: params.walletAddress?.toLowerCase(),
    reason: params.reason,
    timestamp: now,
  };

  await redis.lpush(AUDIT_LOG_KEY, JSON.stringify(event));
  await redis.ltrim(AUDIT_LOG_KEY, 0, 9999);

  return event;
}

/**
 * Admin-only: manually adjust reserves (e.g. after physical bullion
 * delivery or reconciliation). Does NOT touch supply. Used to top up
 * reserves when treasury procures additional metal ahead of demand.
 */
export async function recordManualAdjust(params: {
  metal: AuxrBasketMetal;
  deltaGrams: number;
  reason: string;
  operator?: string;
}): Promise<ReserveEvent> {
  const { metal, deltaGrams, reason } = params;
  if (!Number.isFinite(deltaGrams) || deltaGrams === 0) {
    throw new Error(`auxr-reserve: invalid adjust ${deltaGrams}`);
  }
  if (!reason || reason.trim().length === 0) {
    throw new Error("auxr-reserve: manual adjust requires a reason");
  }

  const now = Date.now();
  await redis.hincrbyfloat(RESERVES_KEY(metal), "grams", deltaGrams);
  await redis.hset(RESERVES_KEY(metal), { lastUpdated: now });

  const event: ReserveEvent = {
    action: "manual_adjust",
    unitsAUXR: 0,
    deltas: {
      gold: metal === "gold" ? deltaGrams : 0,
      silver: metal === "silver" ? deltaGrams : 0,
      platinum: metal === "platinum" ? deltaGrams : 0,
      palladium: metal === "palladium" ? deltaGrams : 0,
    },
    reason: `[${params.operator || "ops"}] ${reason}`,
    timestamp: now,
  };

  await redis.lpush(AUDIT_LOG_KEY, JSON.stringify(event));
  await redis.ltrim(AUDIT_LOG_KEY, 0, 9999);

  return event;
}

/** Recent reserve events for ops review. */
export async function getRecentReserveEvents(limit = 100): Promise<ReserveEvent[]> {
  const safeLimit = Math.min(Math.max(1, limit), 1000);
  const raw = await redis.lrange(AUDIT_LOG_KEY, 0, safeLimit - 1);
  return raw
    .map((s) => {
      try { return typeof s === "string" ? JSON.parse(s) : s; }
      catch { return null; }
    })
    .filter(Boolean);
}
