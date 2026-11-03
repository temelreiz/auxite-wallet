// ============================================================================
// AUXR buy-reward campaign
// ----------------------------------------------------------------------------
// Users who net-buy AUXR in the Auxite app or web during the campaign window
// get AUXR_PER_STEP for every full STEP_USD of net buy, capped per user, from a
// fixed pool. Only in-platform trades count (we can verify them; exchange
// trades we cannot see).
//
//   net buy USD   = Σ buy USD − Σ sell proceeds USD inside [startAt, endAt)
//   net buy units = Σ AUXR bought − Σ AUXR sold inside the window
//
// Settlement (cron, at settleAt = endAt + hold period), per user with
// net buy ≥ STEP_USD:
//   - KYC approved, account active, not an AP, not a US/UK person
//   - AUXR held at settlement (balance + active AUXR stakes, which are debited
//     from the balance) ≥ net buy units
//   - reward = floor(netUSD / STEP_USD) × AUXR_PER_STEP, capped at MAX_PER_USER;
//     scaled down pro-rata if the total exceeds POOL_AUXR
// Credited like an admin grant: balance + recordMint + a history entry.
// ============================================================================

import { getRedis, redis, addTransaction } from "@/lib/redis";
import { recordMint } from "@/lib/auxr-reserve";
import { assertAccountActive } from "@/lib/security/account-guard";
import { getAp } from "@/lib/auxr-ap";
import { readPositions } from "@/lib/staking/ledger";

export const CAMPAIGN = {
  id: "nov26",
  startAt: Date.parse("2026-11-04T00:00:00Z"),
  // Announced as "4–18 November", so 18 Nov is the last full day.
  endAt: Date.parse("2026-11-19T00:00:00Z"),
  settleAt: Date.parse("2026-11-25T00:00:00Z"),
  STEP_USD: 100,
  AUXR_PER_STEP: 0.05,
  MAX_PER_USER: 0.5,
  POOL_AUXR: 50,
} as const;

// ISO 3166 alpha-3 (Sumsub) and alpha-2, for nationality or residence.
const EXCLUDED_COUNTRIES = new Set(["USA", "US", "GBR", "GB"]);

const usdKey = `auxr:reward:${CAMPAIGN.id}:usd`;
const unitsKey = `auxr:reward:${CAMPAIGN.id}:units`;
const settledKey = `auxr:reward:${CAMPAIGN.id}:settled`;
const paidKey = `auxr:reward:${CAMPAIGN.id}:paid`;

export function campaignActive(now = Date.now()): boolean {
  return now >= CAMPAIGN.startAt && now < CAMPAIGN.endAt;
}

/**
 * Record an in-platform AUXR trade toward the campaign. Best-effort and a
 * no-op outside the window. AP flows are not retail buying and do not count.
 */
export async function recordCampaignTrade(
  address: string,
  side: "buy" | "sell",
  usd: number,
  units: number,
  isAp: boolean,
  now = Date.now(),
): Promise<void> {
  if (isAp || !campaignActive(now) || !(usd > 0) || !(units > 0)) return;
  const addr = address.toLowerCase();
  const sign = side === "buy" ? 1 : -1;
  const pipe = getRedis().pipeline();
  pipe.hincrbyfloat(usdKey, addr, sign * usd);
  pipe.hincrbyfloat(unitsKey, addr, sign * units);
  await pipe.exec();
}

type Skip = { address: string; netUSD: number; reason: string };
type Award = { address: string; netUSD: number; netUnits: number; reward: number };

export interface SettlementReport {
  campaignId: string;
  candidates: number;
  awards: Award[];
  skipped: Skip[];
  totalBeforeScaling: number;
  scale: number;
  totalPaid: number;
  failed: { address: string; error: string }[];
}

async function kycRecord(addr: string): Promise<any | null> {
  const raw = await redis.get(`kyc:${addr}`);
  if (!raw) return null;
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

function excludedCountry(kyc: any): boolean {
  const p = kyc?.personalInfo || {};
  return [p.country, p.nationality, kyc?.address?.country]
    .filter(Boolean)
    .some((c: string) => EXCLUDED_COUNTRIES.has(String(c).toUpperCase()));
}

/**
 * Pay the campaign once. Returns null when it is not time yet or it was
 * already settled (the settled flag is claimed atomically before any credit).
 */
export async function settleCampaign(now = Date.now()): Promise<SettlementReport | null> {
  if (now < CAMPAIGN.settleAt) return null;
  const r = getRedis();
  if (!(await r.set(settledKey, String(now), { nx: true }))) return null;

  const usd = ((await r.hgetall(usdKey)) || {}) as Record<string, string | number>;
  const units = ((await r.hgetall(unitsKey)) || {}) as Record<string, string | number>;

  const awards: Award[] = [];
  const skipped: Skip[] = [];
  for (const [address, v] of Object.entries(usd)) {
    const netUSD = Number(v);
    const netUnits = Number(units[address] || 0);
    if (!(netUSD >= CAMPAIGN.STEP_USD)) continue;

    const kyc = await kycRecord(address);
    if (String(kyc?.status || "").toLowerCase() !== "approved") {
      skipped.push({ address, netUSD, reason: "kyc_not_approved" });
      continue;
    }
    if (excludedCountry(kyc)) {
      skipped.push({ address, netUSD, reason: "excluded_country" });
      continue;
    }
    if (!(await assertAccountActive(address)).ok) {
      skipped.push({ address, netUSD, reason: "account_inactive" });
      continue;
    }
    if (await getAp(address)) {
      skipped.push({ address, netUSD, reason: "ap_account" });
      continue;
    }
    const balance = Number((await r.hget(`user:${address}:balance`, "auxr")) || 0);
    const staked = (await readPositions(address))
      .filter((p) => p.status === "active" && p.metal === "auxr")
      .reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const held = balance + staked;
    if (held + 1e-9 < netUnits) {
      skipped.push({ address, netUSD, reason: `not_held (${held.toFixed(4)} < ${netUnits.toFixed(4)})` });
      continue;
    }

    const steps = Math.floor(netUSD / CAMPAIGN.STEP_USD);
    const reward = Math.min(steps * CAMPAIGN.AUXR_PER_STEP, CAMPAIGN.MAX_PER_USER);
    awards.push({ address, netUSD, netUnits, reward });
  }

  const totalBeforeScaling = awards.reduce((s, a) => s + a.reward, 0);
  const scale = totalBeforeScaling > CAMPAIGN.POOL_AUXR ? CAMPAIGN.POOL_AUXR / totalBeforeScaling : 1;

  const failed: { address: string; error: string }[] = [];
  let totalPaid = 0;
  for (const a of awards) {
    // Round down to 6 dp so scaling can never exceed the pool.
    const amount = Math.floor(a.reward * scale * 1e6) / 1e6;
    a.reward = amount;
    if (!(amount > 0)) continue;
    // Per-user flag: a crash mid-run never pays anyone twice. A failure after
    // the flag is set is reported (failed[]) for manual follow-up.
    if (!(await r.hsetnx(paidKey, a.address, String(amount)))) continue;
    try {
      const refId = `reward-${CAMPAIGN.id}-${a.address.slice(2, 10)}`;
      await r.hincrbyfloat(`user:${a.address}:balance`, "auxr", amount);
      await recordMint({
        unitsAUXR: amount,
        refId,
        walletAddress: a.address,
        reason: `[campaign ${CAMPAIGN.id}] buy reward for $${a.netUSD.toFixed(2)} net buy`,
      });
      await addTransaction(a.address, {
        type: "deposit",
        token: "AUXR",
        amount,
        status: "completed",
        metadata: { campaignReward: CAMPAIGN.id, netBuyUSD: a.netUSD, refId },
      });
      totalPaid += amount;
    } catch (e: any) {
      failed.push({ address: a.address, error: e?.message || String(e) });
    }
  }

  return {
    campaignId: CAMPAIGN.id,
    candidates: awards.length + skipped.length,
    awards,
    skipped,
    totalBeforeScaling,
    scale,
    totalPaid,
    failed,
  };
}

/** Running totals for the admin/status view and the ops report. */
export async function campaignStatus(): Promise<{ participants: number; qualifying: number; netUSD: number; estimatedReward: number }> {
  const usd = ((await getRedis().hgetall(usdKey)) || {}) as Record<string, string | number>;
  let participants = 0, qualifying = 0, netUSD = 0, estimatedReward = 0;
  for (const v of Object.values(usd)) {
    const n = Number(v);
    participants++;
    if (n > 0) netUSD += n;
    if (n >= CAMPAIGN.STEP_USD) {
      qualifying++;
      estimatedReward += Math.min(Math.floor(n / CAMPAIGN.STEP_USD) * CAMPAIGN.AUXR_PER_STEP, CAMPAIGN.MAX_PER_USER);
    }
  }
  return { participants, qualifying, netUSD, estimatedReward: Math.min(estimatedReward, CAMPAIGN.POOL_AUXR) };
}
