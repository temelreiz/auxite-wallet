// src/app/api/staking/route.ts
// Metal Staking API - AUXG, AUXS, AUXPT, AUXPD staking
// Kullanıcılar metallerini stake edip faiz kazanabilir

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Staking yapılabilir metaller
const STAKEABLE_METALS = ["auxg", "auxs", "auxpt", "auxpd"];

// Staking süreleri ve APY oranları (yıllık)
const STAKING_TIERS: Record<number, { apy: number; label: string }> = {
  30: { apy: 3, label: "1 Ay" },
  90: { apy: 5, label: "3 Ay" },
  180: { apy: 8, label: "6 Ay" },
  365: { apy: 12, label: "1 Yıl" },
};

// Minimum stake miktarları (gram)
const MIN_STAKE: Record<string, number> = {
  auxg: 0.1,    // 0.1g altın
  auxs: 10,     // 10g gümüş
  auxpt: 0.5,   // 0.5g platin
  auxpd: 0.5,   // 0.5g paladyum
};

interface StakePosition {
  id: string;
  metal: string;
  amount: number;
  duration: number; // gün
  apy: number;
  startDate: number;
  endDate: number;
  expectedReward: number;
  status: "active" | "completed" | "withdrawn";
  withdrawnAt?: number;
  actualReward?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// GET - Kullanıcının stake pozisyonlarını getir
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();
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
      
      // Bekleyen ödül hesapla (şu ana kadar kazanılan)
      const elapsed = now - pos.startDate;
      const totalDuration = pos.endDate - pos.startDate;
      const progress = Math.min(elapsed / totalDuration, 1);
      const earnedSoFar = pos.expectedReward * progress;
      pendingRewards[pos.metal] = (pendingRewards[pos.metal] || 0) + earnedSoFar;
    }

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

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();

    // ─────────────────────────────────────────────────────────────────────────
    // CREATE STAKE
    // ─────────────────────────────────────────────────────────────────────────
    if (action === "create" || !action) {
      if (!metal || !amount || !duration) {
        return NextResponse.json({ error: "Metal, amount, and duration required" }, { status: 400 });
      }

      const metalLower = metal.toLowerCase();

      // Validasyonlar
      if (!STAKEABLE_METALS.includes(metalLower)) {
        return NextResponse.json({ error: "Invalid metal for staking" }, { status: 400 });
      }

      if (!STAKING_TIERS[duration]) {
        return NextResponse.json({ 
          error: "Invalid duration. Valid options: 30, 90, 180, 365 days" 
        }, { status: 400 });
      }

      const minAmount = MIN_STAKE[metalLower] || 0.1;
      if (amount < minAmount) {
        return NextResponse.json({ 
          error: `Minimum stake for ${metal.toUpperCase()} is ${minAmount}g` 
        }, { status: 400 });
      }

      // Bakiye kontrolü - available balance (excluding already staked)
      const balanceKey = `user:${normalizedAddress}:balance`;
      const currentBalance = await redis.hget(balanceKey, metalLower);
      const totalBalance = parseFloat(currentBalance as string || "0");
      
      // Get already staked amount
      const stakingKey = `user:${normalizedAddress}:staking`;
      const existingPositions = await redis.lrange(stakingKey, 0, -1);
      let alreadyStaked = 0;
      const now = Date.now();
      
      for (const pos of existingPositions) {
        try {
          const position = typeof pos === 'string' ? JSON.parse(pos) : pos;
          if (position.status === 'active' && position.metal === metalLower && position.endDate > now) {
            alreadyStaked += position.amount || 0;
          }
        } catch (e) {}
      }
      
      const availableBalance = totalBalance - alreadyStaked;

      if (availableBalance < amount) {
        return NextResponse.json({ 
          error: `Insufficient ${metal.toUpperCase()} balance`,
          available: availableBalance,
          totalBalance,
          alreadyStaked,
          required: amount,
        }, { status: 400 });
      }

      // Stake pozisyonu oluştur
      const tier = STAKING_TIERS[duration];
      const endDate = now + (duration * 24 * 60 * 60 * 1000);
      const expectedReward = (amount * tier.apy / 100) * (duration / 365);

      const position: StakePosition = {
        id: `stake_${now}_${Math.random().toString(36).substr(2, 9)}`,
        metal: metalLower,
        amount,
        duration,
        apy: tier.apy,
        startDate: now,
        endDate,
        expectedReward,
        status: "active",
      };

      // Sadece stake pozisyonunu kaydet (bakiyeden düşme yok - balance route hesaplayacak)
      const multi = redis.multi();
      
      multi.lpush(stakingKey, JSON.stringify(position));

      // Transaction kaydı
      const txKey = `user:${normalizedAddress}:transactions`;
      const transaction = {
        id: position.id,
        type: "stake",
        metal: metalLower.toUpperCase(),
        amount: amount.toString(),
        duration,
        apy: tier.apy,
        expectedReward: expectedReward.toFixed(6),
        status: "active",
        timestamp: now,
        endDate,
      };
      multi.lpush(txKey, JSON.stringify(transaction));

      await multi.exec();

      console.log(`✅ Stake created: ${amount}g ${metal.toUpperCase()} for ${duration} days @ ${tier.apy}% APY`);

      return NextResponse.json({
        success: true,
        position,
        message: `${amount}g ${metal.toUpperCase()} staked for ${tier.label} at ${tier.apy}% APY`,
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // WITHDRAW (Early or Matured)
    // ─────────────────────────────────────────────────────────────────────────
    if (action === "withdraw") {
      if (!positionId) {
        return NextResponse.json({ error: "Position ID required" }, { status: 400 });
      }

      const stakingKey = `user:${normalizedAddress}:staking`;
      const positions = await redis.lrange(stakingKey, 0, -1);

      let targetIndex = -1;
      let targetPosition: StakePosition | null = null;

      for (let i = 0; i < positions.length; i++) {
        const pos = typeof positions[i] === 'string' ? JSON.parse(positions[i]) : positions[i];
        if (pos.id === positionId) {
          targetIndex = i;
          targetPosition = pos;
          break;
        }
      }

      if (!targetPosition || targetIndex === -1) {
        return NextResponse.json({ error: "Position not found" }, { status: 404 });
      }

      if (targetPosition.status === "withdrawn") {
        return NextResponse.json({ error: "Position already withdrawn" }, { status: 400 });
      }

      const now = Date.now();
      const isMatured = now >= targetPosition.endDate;
      
      // Ödül hesapla
      let actualReward = 0;
      if (isMatured) {
        // Tam ödül
        actualReward = targetPosition.expectedReward;
      } else {
        // Erken çekim - sadece geçen süre için ödül (ve %50 penalty)
        const elapsed = now - targetPosition.startDate;
        const totalDuration = targetPosition.endDate - targetPosition.startDate;
        const progress = elapsed / totalDuration;
        actualReward = targetPosition.expectedReward * progress * 0.5; // %50 penalty
      }

      // Pozisyonu güncelle
      targetPosition.status = "withdrawn";
      targetPosition.withdrawnAt = now;
      targetPosition.actualReward = actualReward;

      // Bakiyeyi geri yükle (anapara + ödül)
      const totalReturn = targetPosition.amount + actualReward;
      const balanceKey = `user:${normalizedAddress}:balance`;

      await redis.hincrbyfloat(balanceKey, targetPosition.metal, totalReturn);
      await redis.lset(stakingKey, targetIndex, JSON.stringify(targetPosition));

      // Transaction kaydı
      const txKey = `user:${normalizedAddress}:transactions`;
      const transaction = {
        id: `unstake_${now}_${Math.random().toString(36).substr(2, 9)}`,
        type: "unstake",
        metal: targetPosition.metal.toUpperCase(),
        amount: targetPosition.amount.toString(),
        reward: actualReward.toFixed(6),
        totalReturn: totalReturn.toFixed(6),
        isEarly: !isMatured,
        status: "completed",
        timestamp: now,
        originalPositionId: positionId,
      };
      await redis.lpush(txKey, JSON.stringify(transaction));

      console.log(`✅ Stake withdrawn: ${targetPosition.amount}g ${targetPosition.metal.toUpperCase()} + ${actualReward.toFixed(6)}g reward`);

      return NextResponse.json({
        success: true,
        withdrawal: {
          principal: targetPosition.amount,
          reward: actualReward,
          total: totalReturn,
          isEarly: !isMatured,
          penalty: !isMatured ? "50% reward penalty" : null,
        },
        message: isMatured 
          ? `Stake matured! Received ${totalReturn.toFixed(6)}g ${targetPosition.metal.toUpperCase()}`
          : `Early withdrawal: ${totalReturn.toFixed(6)}g ${targetPosition.metal.toUpperCase()} (50% reward penalty applied)`,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Staking action error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
