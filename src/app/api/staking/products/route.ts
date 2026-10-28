// GET /api/staking/products — what can be staked, at what rate, right now.
//
// These are the ledger's own numbers (src/lib/staking/ledger.ts), the ones a
// stake is actually opened at. The staking screens used to show rates from
// /api/lease-rates while positions were opened at a different table, so the
// rate a user saw was not always the rate they got.

import { NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import { STAKING_PRODUCTS, TIER_DAYS, getStakingConfig, type StakeAsset } from "@/lib/staking/ledger";

export async function GET() {
  try {
    const config = await getStakingConfig();
    const redis = getRedis();
    const assets = await Promise.all(
      (Object.keys(STAKING_PRODUCTS) as StakeAsset[]).map(async (asset) => {
        const p = STAKING_PRODUCTS[asset];
        const cap = config.caps[asset];
        let remaining: number | null = null;
        if (cap != null) {
          const active = Number((await redis.hget(`platform:staked:${asset}`, "active")) || 0);
          remaining = Math.max(0, cap - active);
        }
        return {
          asset: asset.toUpperCase(),
          unit: p.unit,
          min: p.min,
          periods: ([3, 6, 12] as const).map((m) => ({ months: m, days: TIER_DAYS[m], apy: p.apy[m] })),
          capacityRemaining: remaining,
        };
      }),
    );
    return NextResponse.json(
      { success: true, paused: config.paused, assets },
      { headers: { "cache-control": "public, max-age=30" } },
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
