// app/api/cron/staking-reminders/route.ts
// Staking Maturity & Reminder Cron - Günlük çalışır
// 1. Vadesi dolan stake pozisyonlarını otomatik tamamlar
// 2. Yaklaşan vadeler için hatırlatma gönderir

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

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
        let updated = false;

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
              const reward = pos.expectedReward;
              const totalReturn = pos.amount + reward;

              // Bakiyeye geri ekle (principal + full reward)
              const balanceKey = `user:${address}:balance`;
              const multi = redis.multi();
              multi.hincrbyfloat(balanceKey, pos.metal, totalReturn);

              // Platform yield tracking
              if (reward > 0) {
                multi.hincrbyfloat(`platform:yield:paid:${pos.metal}`, "total", reward);
                multi.hincrbyfloat(`platform:yield:paid:${pos.metal}`, "count", 1);
              }

              // Platform staked tracking
              multi.hincrbyfloat(`platform:staked:${pos.metal}`, "active", -pos.amount);

              // Transaction kaydı
              const txKey = `user:${address}:transactions`;
              multi.lpush(txKey, JSON.stringify({
                id: `maturity_${now}_${Math.random().toString(36).substr(2, 9)}`,
                type: "unstake",
                metal: pos.metal.toUpperCase(),
                amount: pos.amount.toString(),
                reward: reward.toFixed(6),
                totalReturn: totalReturn.toFixed(6),
                isEarly: false,
                status: "completed",
                timestamp: now,
                originalPositionId: pos.id,
                auto: true,
              }));

              await multi.exec();

              // Pozisyonu güncelle
              pos.status = "completed";
              pos.actualReward = reward;
              pos.withdrawnAt = now;
              await redis.lset(stakingKey, i, JSON.stringify(pos));
              updated = true;

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
