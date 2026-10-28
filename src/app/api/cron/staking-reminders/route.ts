// app/api/cron/staking-reminders/route.ts
// Staking Maturity & Reminder Cron - Günlük çalışır
// 1. Vadesi dolan stake pozisyonlarını otomatik tamamlar
// 2. Yaklaşan vadeler için hatırlatma gönderir

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { recordExposureChange, METALS, type MetalSymbol } from "@/lib/treasury-exposure";
import { settleStake } from "@/lib/staking/ledger";
import { getAccruedReward } from "@/lib/yield-accounting";

const redis = Redis.fromEnv();

// Uyarı gönderilecek gün sayıları
const REMINDER_DAYS = [7, 3, 1];

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
  poolId?: string;
}

export async function GET(request: NextRequest) {
  // Cron secret kontrolü
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = Date.now();
    const results = {
      usersChecked: 0,
      positionsChecked: 0,
      matured: 0,
      reminders: 0,
      errors: [] as string[],
    };

    // Tüm kullanıcı staking key'lerini bul
    // Staking API: user:{address}:staking (list)
    const stakingKeys = await redis.keys("user:*:staking");

    for (const stakingKey of stakingKeys) {
      try {
        // Extract wallet address from key: user:{address}:staking
        const address = stakingKey.replace("user:", "").replace(":staking", "");
        results.usersChecked++;

        const positions = await redis.lrange(stakingKey, 0, -1);

        for (let i = 0; i < positions.length; i++) {
          const pos: StakePosition = typeof positions[i] === "string"
            ? JSON.parse(positions[i] as string)
            : positions[i] as unknown as StakePosition;

          if (pos.status !== "active") continue;
          results.positionsChecked++;

          const daysRemaining = Math.ceil((pos.endDate - now) / (1000 * 60 * 60 * 24));

          // ─── MATURITY: Vadesi dolmuş pozisyonları tamamla ───
          if (pos.endDate <= now) {
            try {
              // Prefer the accrual ledger when it has booked real income for
              // this position; otherwise the promised expectedReward.
              let rewardOverride: number | undefined;
              try {
                const accrued = await getAccruedReward(pos.id);
                if (accrued > 0) rewardOverride = accrued;
              } catch { /* best-effort */ }

              // settleStake flips the position and pays it in one atomic step
              // under the user's balance lock. It used to be paid here and
              // marked "completed", while a user withdraw only refused
              // "withdrawn" — so a matured position could be paid twice.
              const settled = await settleStake({ address, positionId: pos.id, onlyIfMatured: true, rewardOverride });
              if (!settled.ok) {
                // 409 = the user or another run got there first; try again next run.
                if (settled.status !== 409) results.errors.push(`maturity:${pos.id}: ${settled.error}`);
                continue;
              }
              const reward = settled.reward;
              const totalReturn = settled.principal + reward;

              // Treasury exposure ledger (metals only) — best-effort.
              if ((METALS as string[]).includes(pos.metal.toUpperCase())) {
                try {
                  await recordExposureChange({
                    metal: pos.metal.toUpperCase() as MetalSymbol,
                    type: "unstake",
                    amount: pos.amount,
                    rewardGrams: reward,
                    refId: pos.id,
                    walletAddress: address,
                    reason: `maturity:reward=${reward.toFixed(6)}`,
                  });
                } catch (expErr: any) {
                  console.warn(`[treasury] exposure record failed (non-fatal):`, expErr?.message);
                }
              }

              results.matured++;

              // Push notification
              const notifKey = `notifications:${address}`;
              await redis.lpush(notifKey, JSON.stringify({
                id: `NOTIF_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                type: "staking",
                title: "🎉 Stake Tamamlandı!",
                message: `${pos.amount}g ${pos.metal.toUpperCase()} stake'iniz tamamlandı. ${reward.toFixed(4)}g ödül kazandınız!`,
                data: {
                  stakeId: pos.id,
                  amount: pos.amount,
                  metal: pos.metal,
                  rewards: reward,
                  totalReturn,
                },
                createdAt: Date.now(),
                read: false,
              }));

              // Email notification
              try {
                await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/notifications/email`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    walletAddress: address,
                    type: "staking_ended",
                    data: {
                      asset: pos.metal.toUpperCase(),
                      amount: pos.amount,
                      rewards: reward,
                      totalReturn,
                    },
                  }),
                });
              } catch (_) {}

              console.log(`✅ Auto-matured: ${pos.amount}g ${pos.metal.toUpperCase()} + ${reward.toFixed(6)}g reward for ${address}`);

            } catch (err: any) {
              results.errors.push(`maturity:${pos.id}: ${err.message}`);
            }
            continue;
          }

          // ─── REMINDERS: Yaklaşan vadeler için hatırlatma ───
          if (REMINDER_DAYS.includes(daysRemaining)) {
            const reminderKey = `stake-reminder:${pos.id}:${daysRemaining}`;
            const alreadySent = await redis.get(reminderKey);
            if (alreadySent) continue;

            // Push notification
            const notifKey = `notifications:${address}`;
            await redis.lpush(notifKey, JSON.stringify({
              id: `NOTIF_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              type: "staking",
              title: daysRemaining === 1
                ? "⏰ Stake Yarın Sona Eriyor!"
                : `⏰ Stake ${daysRemaining} Gün Sonra Sona Eriyor`,
              message: `${pos.amount}g ${pos.metal.toUpperCase()} stake'iniz ${daysRemaining} gün sonra sona erecek. Tahmini ödül: ${pos.expectedReward.toFixed(4)}g`,
              data: {
                stakeId: pos.id,
                daysRemaining,
                amount: pos.amount,
                metal: pos.metal,
                rewards: pos.expectedReward,
              },
              createdAt: Date.now(),
              read: false,
            }));

            await redis.set(reminderKey, "sent", { ex: 604800 });
            results.reminders++;

            // Email notification
            try {
              await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/notifications/email`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  walletAddress: address,
                  type: "staking_ending",
                  data: {
                    asset: pos.metal.toUpperCase(),
                    amount: pos.amount,
                    daysRemaining,
                    endDate: new Date(pos.endDate).toISOString(),
                    rewards: pos.expectedReward,
                  },
                }),
              });
            } catch (_) {}
          }
        }
      } catch (error: any) {
        results.errors.push(`${stakingKey}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error: any) {
    console.error("Staking cron error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Manuel trigger
export async function POST(request: NextRequest) {
  return GET(request);
}
