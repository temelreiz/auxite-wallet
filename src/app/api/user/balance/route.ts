// app/api/user/balance/route.ts
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

// Desteklenen varlıklar
const SUPPORTED_ASSETS = ["AUXM", "AUXG", "AUXS", "AUXPT", "AUXPD"];

/**
 * GET /api/user/balance?userId=xxx
 * Kullanıcının tüm bakiyelerini getirir
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const walletAddress = searchParams.get("address");

    if (!userId && !walletAddress) {
      return NextResponse.json(
        { error: "userId or address required" },
        { status: 400 }
      );
    }

    const redis = await getRedis();

    // Adres ile userId bul
    let resolvedUserId = userId;
    if (!resolvedUserId && walletAddress) {
      resolvedUserId = (await redis.get(
        `user:address:${walletAddress.toLowerCase()}`
      )) as string;
    }

    if (!resolvedUserId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Tüm bakiyeleri çek
    const balances: { [key: string]: number } = {};

    for (const asset of SUPPORTED_ASSETS) {
      const balance = (await redis.get(
        `user:${resolvedUserId}:balance:${asset}`
      )) as number;
      balances[asset] = balance || 0;
    }

    return NextResponse.json({
      userId: resolvedUserId,
      balances,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Balance fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/balance
 * Bakiye güncelleme (internal kullanım)
 */
export async function POST(request: NextRequest) {
  try {
    // API Key kontrolü (internal endpoints için)
    const apiKey = request.headers.get("X-API-Key");
    if (apiKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, asset, amount, operation } = await request.json();

    if (!userId || !asset || amount === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!SUPPORTED_ASSETS.includes(asset)) {
      return NextResponse.json(
        { error: `Unsupported asset: ${asset}` },
        { status: 400 }
      );
    }

    const redis = await getRedis();
    const balanceKey = `user:${userId}:balance:${asset}`;
    const currentBalance = ((await redis.get(balanceKey)) as number) || 0;

    let newBalance: number;

    switch (operation) {
      case "add":
        newBalance = currentBalance + amount;
        break;
      case "subtract":
        if (currentBalance < amount) {
          return NextResponse.json(
            { error: "Insufficient balance" },
            { status: 400 }
          );
        }
        newBalance = currentBalance - amount;
        break;
      case "set":
        newBalance = amount;
        break;
      default:
        return NextResponse.json(
          { error: "Invalid operation. Use: add, subtract, set" },
          { status: 400 }
        );
    }

    await redis.set(balanceKey, newBalance);

    // Transaction log
    await redis.lpush(
      `user:${userId}:transactions`,
      JSON.stringify({
        asset,
        operation,
        amount,
        previousBalance: currentBalance,
        newBalance,
        timestamp: new Date().toISOString(),
      })
    );

    return NextResponse.json({
      success: true,
      userId,
      asset,
      previousBalance: currentBalance,
      newBalance,
    });
  } catch (error: any) {
    console.error("Balance update error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
