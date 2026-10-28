// src/app/api/staking/route.ts
// Staking API - AUXG, AUXS, AUXPT, AUXPD and AUXR
// Integrated with Leasing Engine: pools + encumbrance

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { withdrawFromPool, getUserPools } from "@/lib/leasing/pool-manager";
import { getUserEncumbrance } from "@/lib/leasing/encumbrance-ledger";
import { openStake, settleStake, STAKING_PRODUCTS } from "@/lib/staking/ledger";
import { requireUser, requireUserOrInternal } from "@/lib/security/require-user";
import { assertAccountActive } from "@/lib/security/account-guard";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Legacy STAKING_TIERS for backward compat (GET response uses this for generic display)
const STAKING_TIERS: Record<number, { apy: number; label: string }> = {
  30:  { apy: 1.53, label: "1 Ay" },
  90:  { apy: 1.53, label: "3 Ay" },
  91:  { apy: 1.53, label: "3 Ay" },
  180: { apy: 2.03, label: "6 Ay" },
  181: { apy: 2.03, label: "6 Ay" },
  365: { apy: 2.53, label: "1 Yıl" },
  366: { apy: 2.53, label: "1 Yıl" },
};

// Minimum stake amounts (grams; AUXR in tokens) — from the ledger's products.
const MIN_STAKE: Record<string, number> = Object.fromEntries(
  Object.entries(STAKING_PRODUCTS).map(([k, v]) => [k, v.min]),
);

interface StakePosition {
  id: string;
  metal: string;
  amount: number;
  duration: number;
  apy: number;
  startDate: number;
  endDate: number;
  expectedReward: number;
  status: "active" | "completed" | "withdrawn";
  withdrawnAt?: number;
  actualReward?: number;
  // Leasing engine integration
  poolId?: string;
  leaseId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// GET - Kullanıcının stake pozisyonlarını getir
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  // Positions are read for the caller, never for an address they name: the
  // ?address= parameter let anyone enumerate anyone's staking book.
  const auth = requireUser(request);
  if (!auth.ok) return auth.response;

  try {
    const normalizedAddress = auth.user.address;
    const stakingKey = `user:${normalizedAddress}:staking`;

    // Tüm stake pozisyonlarını al
    const positions = await redis.lrange(stakingKey, 0, -1);

    const parsedPositions: StakePosition[] = positions.map((pos: any) => {
      try {
        return typeof pos === 'string' ? JSON.parse(pos) : pos;
      } catch {
        return null;
      }
    }).filter(Boolean);

    // Aktif ve tamamlanmış pozisyonları ayır
    const now = Date.now();
    const activePositions = parsedPositions.filter(p => p.status === "active" && p.endDate > now);
    const completedPositions = parsedPositions.filter(p => p.status === "completed" || (p.status === "active" && p.endDate <= now));
    const withdrawnPositions = parsedPositions.filter(p => p.status === "withdrawn");

    // Toplam stake edilen miktar (metal bazında)
    const totalStaked: Record<string, number> = {};
    const pendingRewards: Record<string, number> = {};

    for (const pos of activePositions) {
      totalStaked[pos.metal] = (totalStaked[pos.metal] || 0) + pos.amount;

      const elapsed = now - pos.startDate;
      const totalDuration = pos.endDate - pos.startDate;
      const progress = Math.min(elapsed / totalDuration, 1);
      const earnedSoFar = pos.expectedReward * progress;
      pendingRewards[pos.metal] = (pendingRewards[pos.metal] || 0) + earnedSoFar;
    }

    // Get encumbrance data for user
    let encumbrance = null;
    try {
      encumbrance = await getUserEncumbrance(normalizedAddress);
    } catch (_) {}

    // Get user's pool memberships
    let pools = null;
    try {
      pools = await getUserPools(normalizedAddress);
    } catch (_) {}

    return NextResponse.json({
      success: true,
      positions: parsedPositions,
      summary: {
        active: activePositions.length,
        completed: completedPositions.length,
        withdrawn: withdrawnPositions.length,
        totalStaked,
        pendingRewards,
      },
      encumbrance,
      pools,
      stakingTiers: STAKING_TIERS,
      minStake: MIN_STAKE,
    });
  } catch (error: any) {
    console.error("Get staking positions error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST - Yeni stake pozisyonu oluştur veya withdraw yap
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, address, metal, amount, duration, positionId } = body;

    // Identity came from `address` in the body, so a caller could stake, and
    // more importantly unstake, on any account. The recurring-buy and
    // recurring-stake jobs have no login token, so they authenticate with the
    // internal key and may still name an address.
    const auth = requireUserOrInternal(request, address);
    if (!auth.ok) return auth.response;
    const normalizedAddress = auth.user.address;

    const gate = await assertAccountActive(normalizedAddress);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error, code: gate.code }, { status: 403 });
    }

    // Both actions go through the staking ledger: server-side rate, the
    // shared balance lock, the yielding encumbrance for metals, and an atomic
    // settle that can pay a position only once.
    if (action === "create" || !action) {
      if (!metal || !amount || !duration) {
        return NextResponse.json({ error: "Metal, amount, and duration required" }, { status: 400 });
      }
      const res = await openStake({ address: normalizedAddress, asset: metal, amount: Number(amount), duration: Number(duration) });
      if (!res.ok) {
        const { ok: _ok, status, ...rest } = res;
        return NextResponse.json(rest, { status });
      }
      const p = res.position;
      console.log(`✅ Stake created: ${p.amount} ${p.metal.toUpperCase()} for ${p.duration} days @ ${p.apy}% APY`);
      return NextResponse.json({
        success: true,
        position: p,
        message: `${p.amount} ${p.metal.toUpperCase()} staked for ${p.durationMonths} months at ${p.apy}% APY`,
      });
    }

    if (action === "withdraw") {
      if (!positionId) {
        return NextResponse.json({ error: "Position ID required" }, { status: 400 });
      }
      const res = await settleStake({ address: normalizedAddress, positionId });
      if (!res.ok) {
        const { ok: _ok, status, ...rest } = res;
        return NextResponse.json(rest, { status });
      }
      if (res.position.poolId) {
        try {
          await withdrawFromPool(res.position.poolId, normalizedAddress);
        } catch (e) {
          console.warn("Pool withdrawal failed (non-blocking):", e);
        }
      }
      const unit = res.position.metal.toUpperCase();
      const total = res.principal + res.reward;
      return NextResponse.json({
        success: true,
        withdrawal: {
          principal: res.principal,
          reward: res.reward,
          total,
          isEarly: res.isEarly,
          penalty: res.isEarly ? "50% reward penalty" : null,
        },
        message: res.isEarly
          ? `Early withdrawal: ${total.toFixed(6)} ${unit} (50% reward penalty applied)`
          : `Stake matured! Received ${total.toFixed(6)} ${unit}`,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Staking action error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
