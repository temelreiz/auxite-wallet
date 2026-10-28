// /api/admin/staking — staking kill switch, caps, and the liability it carries.
//
// GET  → products, config (paused, caps), and per-asset active stake and
//        rewards paid so far (the `platform:staked:*` / `platform:yield:paid:*`
//        counters the ledger keeps).
// POST → { paused?: boolean, caps?: { auxr?: number | "none", ... } }
//        Pausing stops new stakes only; open positions keep running and settle.

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getRedis } from "@/lib/redis";
import { STAKING_PRODUCTS, getStakingConfig, type StakeAsset } from "@/lib/staking/ledger";

const CONFIG_KEY = "staking:config";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  const redis = getRedis();
  const assets = Object.keys(STAKING_PRODUCTS) as StakeAsset[];
  const config = await getStakingConfig();
  const book: Record<string, { active: number; totalStaked: number; rewardsPaid: number; payouts: number }> = {};
  for (const a of assets) {
    const [staked, paid] = await Promise.all([
      redis.hgetall(`platform:staked:${a}`) as Promise<Record<string, unknown> | null>,
      redis.hgetall(`platform:yield:paid:${a}`) as Promise<Record<string, unknown> | null>,
    ]);
    book[a] = {
      active: Number(staked?.active || 0),
      totalStaked: Number(staked?.total || 0),
      rewardsPaid: Number(paid?.total || 0),
      payouts: Number(paid?.count || 0),
    };
  }
  return NextResponse.json({ success: true, products: STAKING_PRODUCTS, config, book });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  const body = await request.json().catch(() => ({}));
  const update: Record<string, string> = {};

  if (typeof body.paused === "boolean") update.paused = String(body.paused);
  if (body.caps && typeof body.caps === "object") {
    for (const [asset, cap] of Object.entries(body.caps)) {
      if (!(asset in STAKING_PRODUCTS)) {
        return NextResponse.json({ error: `Unknown asset ${asset}` }, { status: 400 });
      }
      if (cap === "none" || cap === null) update[`cap:${asset}`] = "none";
      else if (Number.isFinite(Number(cap)) && Number(cap) >= 0) update[`cap:${asset}`] = String(Number(cap));
      else return NextResponse.json({ error: `Invalid cap for ${asset}` }, { status: 400 });
    }
  }
  if (!Object.keys(update).length) {
    return NextResponse.json({ error: "Nothing to update (paused, caps)" }, { status: 400 });
  }

  await getRedis().hset(CONFIG_KEY, update);
  console.log(`[admin] staking config updated by ${auth.address}:`, update);
  return NextResponse.json({ success: true, config: await getStakingConfig() });
}
