// app/api/deposits/notify/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// API Key doğrulama
const WATCHER_API_KEY = process.env.WATCHER_API_KEY || "your-secret-api-key";

// Redis bağlantısı
async function getRedis() {
  const { Redis } = await import("@upstash/redis");
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

// Deposit tipi
interface DepositNotification {
  coin: string;
  amount: number;
  auxmAmount: number;
  txHash: string;
  fromAddress: string;
  toAddress: string;
  confirmations: number;
  blockNumber: number;
  timestamp: string;
  network?: string;
}

/**
 * POST /api/deposits/notify
 * Watcher'dan gelen deposit bildirimlerini işler
 */
export async function POST(request: NextRequest) {
  try {
    // API Key kontrolü
    const apiKey =
      request.headers.get("X-API-Key") ||
      request.headers.get("Authorization")?.replace("Bearer ", "");

    if (apiKey !== WATCHER_API_KEY) {
      console.error("❌ Invalid API key");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Body parse
    const deposit: DepositNotification = await request.json();

    // Validasyon
    if (!deposit.txHash || !deposit.toAddress || !deposit.auxmAmount) {
      return NextResponse.json(
        { error: "Missing required fields: txHash, toAddress, auxmAmount" },
        { status: 400 }
      );
    }

    console.log("📥 Deposit received:", deposit);

    const redis = await getRedis();

    // 1. Duplicate kontrolü (aynı tx işlenmiş mi?)
    const txKey = `deposit:tx:${deposit.txHash}`;
    const existingTx = await redis.get(txKey);

    if (existingTx) {
      console.log("⏭️ Duplicate deposit, skipping:", deposit.txHash);
      return NextResponse.json({
        success: true,
        message: "Deposit already processed",
        duplicate: true,
      });
    }

    // 2. Kullanıcıyı bul (toAddress ile)
    const userKey = `user:address:${deposit.toAddress.toLowerCase()}`;
    const userId = await redis.get(userKey);

    if (!userId) {
      // Kullanıcı bulunamadı - orphan deposit olarak kaydet
      console.warn("⚠️ No user found for address:", deposit.toAddress);
      
      // Orphan deposits listesine ekle (sonra manuel eşleştirme için)
      await redis.lpush("deposits:orphan", JSON.stringify({
        ...deposit,
        receivedAt: new Date().toISOString(),
      }));

      // TX'i işlenmiş olarak işaretle (duplicate önleme)
      await redis.set(txKey, "orphan", { ex: 86400 * 30 }); // 30 gün

      return NextResponse.json({
        success: true,
        message: "Deposit received but no user found",
        orphan: true,
      });
    }

    // 3. Kullanıcı AUXM bakiyesini güncelle
    const balanceKey = `user:${userId}:balance:AUXM`;
    const currentBalance = (await redis.get(balanceKey)) as number || 0;
    const newBalance = currentBalance + deposit.auxmAmount;

    await redis.set(balanceKey, newBalance);

    // 4. Deposit'i kaydet
    const depositRecord = {
      ...deposit,
      userId,
      processedAt: new Date().toISOString(),
      status: "completed",
    };

    // Kullanıcının deposit geçmişine ekle
    await redis.lpush(`user:${userId}:deposits`, JSON.stringify(depositRecord));

    // Genel deposit listesine ekle
    await redis.lpush("deposits:all", JSON.stringify(depositRecord));

    // TX'i işlenmiş olarak işaretle
    await redis.set(txKey, JSON.stringify(depositRecord), { ex: 86400 * 365 }); // 1 yıl

    console.log(`✅ Deposit processed: ${deposit.auxmAmount} AUXM → User ${userId}`);
    console.log(`   New balance: ${newBalance} AUXM`);

    return NextResponse.json({
      success: true,
      message: "Deposit processed successfully",
      userId,
      previousBalance: currentBalance,
      depositAmount: deposit.auxmAmount,
      newBalance: newBalance,
    });
  } catch (error: any) {
    console.error("❌ Deposit notification error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/deposits/notify
 * Health check
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "Auxite Deposit Notification API",
    timestamp: new Date().toISOString(),
  });
}
