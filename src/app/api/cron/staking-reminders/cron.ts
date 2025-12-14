// app/api/cron/staking-reminders/route.ts
// Staking Reminder Cron - Stake sona erme uyarıları (günlük çalışır)

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

// Uyarı gönderilecek gün sayıları
const REMINDER_DAYS = [7, 3, 1];

export async function GET(request: NextRequest) {
  // Cron secret kontrolü
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = Date.now();
    const results = {
      checked: 0,
      reminders: 0,
      notifications: 0,
      emails: 0,
      errors: [] as string[],
    };

    // Tüm aktif stake'leri bul
    const stakeKeys = await redis.keys("stake:*");

    for (const key of stakeKeys) {
      try {
        const stake = await redis.get(key) as {
          id: string;
          walletAddress: string;
          metal: string;
          amount: number;
          duration: number;
          startDate: string;
          endDate: string;
          status: string;
          rewards: number;
        } | null;

        if (!stake || stake.status !== "active") continue;

        results.checked++;

        const endDate = new Date(stake.endDate).getTime();
        const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

        // Uyarı gönderilmeli mi?
        if (!REMINDER_DAYS.includes(daysRemaining)) continue;

        // Bu stake için bu gün uyarı gönderilmiş mi?
        const reminderKey = `stake-reminder:${stake.id}:${daysRemaining}`;
        const alreadySent = await redis.get(reminderKey);
        if (alreadySent) continue;

        results.reminders++;

        // Push notification gönder
        const notifKey = `notifications:${stake.walletAddress.toLowerCase()}`;
        await redis.lpush(notifKey, JSON.stringify({
          id: `NOTIF_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          type: "staking",
          title: daysRemaining === 1 ? "⏰ Stake Yarın Sona Eriyor!" : `⏰ Stake ${daysRemaining} Gün Sonra Sona Eriyor`,
          message: `${stake.amount} ${stake.metal} stake'iniz ${daysRemaining} gün sonra sona erecek. Tahmini ödül: ${stake.rewards.toFixed(4)} ${stake.metal}`,
          data: {
            stakeId: stake.id,
            daysRemaining,
            amount: stake.amount,
            metal: stake.metal,
            rewards: stake.rewards,
            endDate: stake.endDate,
          },
          createdAt: Date.now(),
          read: false,
        }));
        results.notifications++;

        // Email notification gönder
        try {
          const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/notifications/email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              walletAddress: stake.walletAddress,
              type: "staking_ending",
              data: {
                asset: stake.metal,
                amount: stake.amount,
                daysRemaining,
                endDate: new Date(stake.endDate),
                rewards: stake.rewards,
              },
            }),
          });

          if (emailResponse.ok) {
            results.emails++;
          }
        } catch (emailError) {
          console.error("Email send error:", emailError);
        }

        // Bu uyarının gönderildiğini işaretle (7 gün sakla)
        await redis.set(reminderKey, "sent", { ex: 604800 });

      } catch (error: any) {
        results.errors.push(`${key}: ${error.message}`);
      }
    }

    // Stake süresi dolan işlemleri kontrol et
    const expiredStakes = await checkExpiredStakes();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
      expiredStakes,
    });
  } catch (error: any) {
    console.error("Staking reminders cron error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Süresi dolan stake'leri kontrol et ve bildirim gönder
async function checkExpiredStakes() {
  const now = Date.now();
  const results = {
    expired: 0,
    processed: 0,
    errors: [] as string[],
  };

  try {
    const stakeKeys = await redis.keys("stake:*");

    for (const key of stakeKeys) {
      try {
        const stake = await redis.get(key) as {
          id: string;
          walletAddress: string;
          metal: string;
          amount: number;
          duration: number;
          startDate: string;
          endDate: string;
          status: string;
          rewards: number;
          apy: number;
        } | null;

        if (!stake || stake.status !== "active") continue;

        const endDate = new Date(stake.endDate).getTime();
        if (endDate > now) continue;

        results.expired++;

        // Stake'i completed olarak işaretle
        stake.status = "completed";
        await redis.set(key, JSON.stringify(stake));

        // Bakiyeyi güncelle (ana para + ödüller)
        const balanceKey = `balance:${stake.walletAddress.toLowerCase()}`;
        const currentBalance = await redis.hgetall(balanceKey) as Record<string, number>;
        const metalKey = stake.metal.toLowerCase();
        const newBalance = (currentBalance?.[metalKey] || 0) + stake.amount + stake.rewards;
        await redis.hset(balanceKey, { [metalKey]: newBalance });

        // Push notification
        const notifKey = `notifications:${stake.walletAddress.toLowerCase()}`;
        await redis.lpush(notifKey, JSON.stringify({
          id: `NOTIF_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          type: "staking",
          title: "🎉 Stake Tamamlandı!",
          message: `${stake.amount} ${stake.metal} stake'iniz tamamlandı. ${stake.rewards.toFixed(4)} ${stake.metal} ödül kazandınız!`,
          data: {
            stakeId: stake.id,
            amount: stake.amount,
            metal: stake.metal,
            rewards: stake.rewards,
            totalReturn: stake.amount + stake.rewards,
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
              walletAddress: stake.walletAddress,
              type: "staking_ended",
              data: {
                asset: stake.metal,
                amount: stake.amount,
                rewards: stake.rewards,
                totalReturn: stake.amount + stake.rewards,
              },
            }),
          });
        } catch (emailError) {
          console.error("Email send error:", emailError);
        }

        results.processed++;

      } catch (error: any) {
        results.errors.push(`${key}: ${error.message}`);
      }
    }
  } catch (error: any) {
    results.errors.push(error.message);
  }

  return results;
}

// POST - Manuel trigger için
export async function POST(request: NextRequest) {
  return GET(request);
}
