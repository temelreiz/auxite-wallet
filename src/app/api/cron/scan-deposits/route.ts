// src/app/api/cron/scan-deposits/route.ts
// Direct Deposit Scanner — Vercel Cron (her dakika)
// Kendi hot wallet adreslerine gelen crypto'ları otomatik algılar ve krediler

import { NextRequest, NextResponse } from "next/server";
import { scanAllChains, type DepositResult } from "@/lib/deposit-scanner";
import { getRedis, incrementBalance, addTransaction } from "@/lib/redis";
import { calculateAuxmBonus } from "@/lib/auxm-bonus-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel max 60s for cron

const CRON_SECRET = process.env.CRON_SECRET;

// Crypto fiyatlarını al
async function getCryptoPrices(): Promise<Record<string, number>> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://vault.auxite.io";
    const res = await fetch(`${baseUrl}/api/crypto`, { next: { revalidate: 0 } });
    const data = await res.json();

    return {
      ETH: data.ethereum?.usd || 3500,
      BTC: data.bitcoin?.usd || 95000,
      XRP: data.ripple?.usd || 2.2,
      SOL: data.solana?.usd || 200,
      USDT: 1,
      USDC: 1,
    };
  } catch {
    // Fallback fiyatlar
    return { ETH: 3500, BTC: 95000, XRP: 2.2, SOL: 200, USDT: 1, USDC: 1 };
  }
}

// Kullanıcının auto-convert tercihini al
async function getUserAutoConvert(redis: ReturnType<typeof getRedis>, address: string): Promise<boolean> {
  try {
    const settings = await redis.hgetall(`user:${address.toLowerCase()}:settings`);
    if (!settings || Object.keys(settings).length === 0) return true; // Default: auto-convert
    return String(settings.autoConvertToAuxm) !== "false";
  } catch {
    return true;
  }
}

// Kullanıcıyı from address ile bul
async function findUserByAddress(redis: ReturnType<typeof getRedis>, fromAddress: string): Promise<string | null> {
  try {
    // 1. Direkt adres eşleştirme
    const userId = await redis.get(`user:address:${fromAddress.toLowerCase()}`);
    if (userId) return String(userId);

    // 2. Wallet address ile ara
    const walletUser = await redis.get(`wallet:${fromAddress.toLowerCase()}`);
    if (walletUser) return String(walletUser);

    return null;
  } catch {
    return null;
  }
}

// Tek bir deposit'i işle
async function processDeposit(
  redis: ReturnType<typeof getRedis>,
  deposit: DepositResult,
  prices: Record<string, number>
): Promise<{ status: "credited" | "orphan" | "duplicate"; auxmAmount?: number; bonusAmount?: number }> {
  // 1. Duplicate check
  const txKey = `deposit:tx:${deposit.txHash}`;
  const existing = await redis.get(txKey);
  if (existing) {
    return { status: "duplicate" };
  }

  // 2. Kullanıcıyı bul
  const userId = await findUserByAddress(redis, deposit.fromAddress);

  if (!userId) {
    // Orphan deposit — kullanıcı eşleşmedi
    await redis.lpush(
      "deposits:orphan",
      JSON.stringify({
        ...deposit,
        receivedAt: new Date().toISOString(),
        source: "direct-scanner",
      })
    );
    await redis.set(txKey, "orphan", { ex: 86400 * 30 });
    return { status: "orphan" };
  }

  // 3. Fiyat hesapla
  const price = prices[deposit.coin] || 1;
  const amountUsd = deposit.amount * price;

  // 4. Kullanıcı tercihi: AUXM'e çevir mi, crypto olarak tut mu?
  const autoConvert = await getUserAutoConvert(redis, userId);

  let auxmAmount = 0;
  let bonusAmount = 0;

  if (autoConvert) {
    // AUXM'e çevir + bonus
    const bonus = calculateAuxmBonus(amountUsd);
    auxmAmount = bonus.auxmAmount;
    bonusAmount = bonus.bonusAmount;

    await incrementBalance(userId, {
      auxm: auxmAmount,
      bonusAuxm: bonusAmount > 0 ? bonusAmount : undefined,
    } as any);

    // Transaction kaydet
    await addTransaction(userId, {
      type: "deposit",
      token: deposit.coin,
      amount: deposit.amount,
      metadata: {
        source: "direct-scanner",
        chain: deposit.chain,
        txHash: deposit.txHash,
        fromAddress: deposit.fromAddress,
        amountUsd,
        auxmReceived: auxmAmount,
        bonusReceived: bonusAmount,
        autoConverted: true,
      },
      status: "completed",
    });
  } else {
    // Crypto olarak tut
    const coinKey = deposit.coin.toLowerCase();
    await incrementBalance(userId, {
      [coinKey]: deposit.amount,
    } as any);

    await addTransaction(userId, {
      type: "deposit",
      token: deposit.coin,
      amount: deposit.amount,
      metadata: {
        source: "direct-scanner",
        chain: deposit.chain,
        txHash: deposit.txHash,
        fromAddress: deposit.fromAddress,
        amountUsd,
        autoConverted: false,
      },
      status: "completed",
    });
  }

  // 5. TX'i işlenmiş olarak işaretle
  await redis.set(
    txKey,
    JSON.stringify({
      ...deposit,
      userId,
      amountUsd,
      auxmAmount,
      bonusAmount,
      autoConverted: autoConvert,
      processedAt: new Date().toISOString(),
    }),
    { ex: 86400 * 365 }
  );

  return { status: "credited", auxmAmount, bonusAmount };
}

/**
 * GET /api/cron/scan-deposits
 * Vercel Cron — her dakika çalışır
 */
export async function GET(request: NextRequest) {
  try {
    // Cron auth
    const authHeader = request.headers.get("authorization");
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const redis = getRedis();

    // Scanner aktif mi?
    const enabled = await redis.get("scanner:config:enabled");
    if (enabled === "false") {
      return NextResponse.json({
        success: true,
        message: "Scanner is paused",
        enabled: false,
      });
    }

    console.log("🔍 Deposit scanner starting...");

    // Tüm chain'leri tara
    const scanResult = await scanAllChains();

    if (scanResult.totalDeposits === 0) {
      // Durum güncelle — deposit yok
      await redis.hset("scanner:status", {
        lastRun: new Date().toISOString(),
        lastResult: "no_deposits",
        errorCount: scanResult.errors.length,
        errors: scanResult.errors.length > 0 ? JSON.stringify(scanResult.errors) : "",
      });

      return NextResponse.json({
        success: true,
        message: "No new deposits found",
        chains: scanResult.chains.map((c) => ({
          chain: c.chain,
          lastScanned: c.lastScanned,
          error: c.error,
        })),
      });
    }

    // Fiyatları al
    const prices = await getCryptoPrices();

    // Her deposit'i işle
    const results = {
      credited: 0,
      orphan: 0,
      duplicate: 0,
      totalAuxm: 0,
      totalBonus: 0,
    };

    for (const deposit of scanResult.allDeposits) {
      const result = await processDeposit(redis, deposit, prices);

      if (result.status === "credited") {
        results.credited++;
        results.totalAuxm += result.auxmAmount || 0;
        results.totalBonus += result.bonusAmount || 0;

        // Admin log'a ekle
        await redis.lpush(
          "scanner:deposits:recent",
          JSON.stringify({
            ...deposit,
            amountUsd: deposit.amount * (prices[deposit.coin] || 1),
            auxmCredited: result.auxmAmount,
            bonusCredited: result.bonusAmount,
            processedAt: new Date().toISOString(),
          })
        );
        // Son 100 deposit tut
        await redis.ltrim("scanner:deposits:recent", 0, 99);
      } else if (result.status === "orphan") {
        results.orphan++;
      } else {
        results.duplicate++;
      }
    }

    // Günlük istatistik
    const today = new Date().toISOString().split("T")[0];
    const statsKey = `scanner:deposits:stats:${today}`;
    await redis.hincrbyfloat(statsKey, "total", results.credited);
    await redis.hincrbyfloat(statsKey, "totalAuxm", results.totalAuxm);

    // Count per chain
    for (const chain of scanResult.chains) {
      if (chain.deposits.length > 0) {
        await redis.hincrbyfloat(statsKey, chain.chain, chain.deposits.length);
      }
    }

    // Scanner durumunu güncelle
    await redis.hset("scanner:status", {
      lastRun: new Date().toISOString(),
      lastResult: "deposits_found",
      depositCount: results.credited,
      orphanCount: results.orphan,
      duplicateCount: results.duplicate,
      totalAuxmCredited: results.totalAuxm,
      errorCount: scanResult.errors.length,
      errors: scanResult.errors.length > 0 ? JSON.stringify(scanResult.errors) : "",
    });

    console.log(`✅ Deposit scan complete: ${results.credited} credited, ${results.orphan} orphan, ${results.duplicate} duplicate`);

    return NextResponse.json({
      success: true,
      results,
      chains: scanResult.chains.map((c) => ({
        chain: c.chain,
        depositsFound: c.deposits.length,
        lastScanned: c.lastScanned,
        error: c.error,
      })),
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error("❌ Deposit scanner error:", error);
    return NextResponse.json(
      { error: error.message || "Scanner failed" },
      { status: 500 }
    );
  }
}

// POST endpoint — manual trigger
export async function POST(request: NextRequest) {
  return GET(request);
}
