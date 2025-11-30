// app/api/withdraw/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Redis bağlantısı
async function getRedis() {
  const { Redis } = await import("@upstash/redis");
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

// Desteklenen çekim coinleri ve minimum miktarları
const WITHDRAW_COINS = {
  ETH: { minAmount: 0.001, fee: 0.0005, network: "Ethereum/Base" },
  BTC: { minAmount: 0.0001, fee: 0.00005, network: "Bitcoin" },
  USDT: { minAmount: 10, fee: 1, network: "Ethereum/Tron" },
  XRP: { minAmount: 10, fee: 0.1, network: "XRP Ledger" },
  SOL: { minAmount: 0.1, fee: 0.01, network: "Solana" },
};

// Coin fiyatları (gerçek implementasyonda API'den çekilmeli)
async function getCoinPrices(): Promise<{ [key: string]: number }> {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,ripple,solana,tether&vs_currencies=usd",
      { next: { revalidate: 60 } }
    );
    const data = await response.json();
    return {
      BTC: data.bitcoin?.usd || 95000,
      ETH: data.ethereum?.usd || 3400,
      XRP: data.ripple?.usd || 2.2,
      SOL: data.solana?.usd || 235,
      USDT: 1,
    };
  } catch (error) {
    return { BTC: 95000, ETH: 3400, XRP: 2.2, SOL: 235, USDT: 1 };
  }
}

/**
 * POST /api/withdraw
 * Çekim talebi oluştur
 */
export async function POST(request: NextRequest) {
  try {
    const {
      userId,
      walletAddress,
      coin,
      amount,
      toAddress,
      network,
    } = await request.json();

    // Validasyon
    if (!coin || !amount || !toAddress) {
      return NextResponse.json(
        { error: "Missing required fields: coin, amount, toAddress" },
        { status: 400 }
      );
    }

    if (!WITHDRAW_COINS[coin as keyof typeof WITHDRAW_COINS]) {
      return NextResponse.json(
        { error: `Unsupported coin: ${coin}. Supported: ${Object.keys(WITHDRAW_COINS).join(", ")}` },
        { status: 400 }
      );
    }

    const coinConfig = WITHDRAW_COINS[coin as keyof typeof WITHDRAW_COINS];

    if (amount < coinConfig.minAmount) {
      return NextResponse.json(
        { error: `Minimum withdrawal amount for ${coin}: ${coinConfig.minAmount}` },
        { status: 400 }
      );
    }

    const redis = await getRedis();

    // UserId bul
    let resolvedUserId = userId;
    if (!resolvedUserId && walletAddress) {
      resolvedUserId = (await redis.get(
        `user:address:${walletAddress.toLowerCase()}`
      )) as string;
    }

    if (!resolvedUserId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fiyatları al
    const prices = await getCoinPrices();
    const coinPrice = prices[coin];

    // Gereken AUXM miktarı (coin miktarı × fiyat + fee)
    const totalCoinAmount = amount + coinConfig.fee;
    const requiredAuxm = totalCoinAmount * coinPrice;

    // AUXM bakiyesini kontrol et
    const auxmBalance =
      ((await redis.get(`user:${resolvedUserId}:balance:AUXM`)) as number) || 0;

    if (auxmBalance < requiredAuxm) {
      return NextResponse.json(
        {
          error: "Insufficient AUXM balance",
          required: requiredAuxm,
          available: auxmBalance,
          breakdown: {
            coinAmount: amount,
            coinValue: amount * coinPrice,
            fee: coinConfig.fee,
            feeValue: coinConfig.fee * coinPrice,
            total: requiredAuxm,
          },
        },
        { status: 400 }
      );
    }

    // AUXM bakiyesini düş
    const newAuxmBalance = auxmBalance - requiredAuxm;
    await redis.set(`user:${resolvedUserId}:balance:AUXM`, newAuxmBalance);

    // Withdrawal kaydı oluştur
    const withdrawalId = `wd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const withdrawalRecord = {
      id: withdrawalId,
      userId: resolvedUserId,
      coin,
      amount,
      fee: coinConfig.fee,
      totalAmount: totalCoinAmount,
      auxmSpent: requiredAuxm,
      coinPrice,
      toAddress,
      network: network || coinConfig.network,
      status: "pending", // pending -> processing -> completed/failed
      createdAt: new Date().toISOString(),
      previousAuxmBalance: auxmBalance,
      newAuxmBalance,
    };

    // Kaydet
    await redis.hset(`withdrawal:${withdrawalId}`, withdrawalRecord);
    await redis.lpush(`user:${resolvedUserId}:withdrawals`, JSON.stringify(withdrawalRecord));
    await redis.lpush("withdrawals:pending", withdrawalId);

    console.log(`📤 Withdrawal request: ${amount} ${coin} → ${toAddress}`);
    console.log(`   AUXM spent: ${requiredAuxm.toFixed(2)}`);

    return NextResponse.json({
      success: true,
      message: "Withdrawal request created",
      withdrawal: {
        id: withdrawalId,
        coin,
        amount,
        fee: coinConfig.fee,
        toAddress,
        network: network || coinConfig.network,
        status: "pending",
        estimatedTime: "10-30 minutes",
      },
      balances: {
        AUXM: newAuxmBalance,
      },
    });
  } catch (error: any) {
    console.error("Withdrawal error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/withdraw?userId=xxx
 * Çekim geçmişi ve desteklenen coinler
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const address = searchParams.get("address");
    const info = searchParams.get("info"); // ?info=coins için sadece coin bilgisi

    // Sadece coin bilgisi isteniyor
    if (info === "coins") {
      const prices = await getCoinPrices();
      const coinsWithPrices = Object.entries(WITHDRAW_COINS).map(([coin, config]) => ({
        coin,
        ...config,
        price: prices[coin],
      }));
      return NextResponse.json({ coins: coinsWithPrices });
    }

    if (!userId && !address) {
      return NextResponse.json(
        { error: "userId or address required" },
        { status: 400 }
      );
    }

    const redis = await getRedis();

    let resolvedUserId = userId;
    if (!resolvedUserId && address) {
      resolvedUserId = (await redis.get(
        `user:address:${address.toLowerCase()}`
      )) as string;
    }

    if (!resolvedUserId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const withdrawalsRaw = await redis.lrange(
      `user:${resolvedUserId}:withdrawals`,
      0,
      19
    );

    const withdrawals = withdrawalsRaw.map((w) => {
      if (typeof w === "string") {
        return JSON.parse(w);
      }
      return w;
    });

    return NextResponse.json({
      userId: resolvedUserId,
      withdrawals,
      count: withdrawals.length,
      supportedCoins: WITHDRAW_COINS,
    });
  } catch (error: any) {
    console.error("Withdrawal history error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
