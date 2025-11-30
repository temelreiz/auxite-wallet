// app/api/trade/route.ts
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

// Metal fiyatlarını çek
async function getMetalPrices() {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "https://wallet.auxite.io"}/api/prices`,
      { next: { revalidate: 10 } }
    );
    return await response.json();
  } catch (error) {
    console.error("Price fetch error:", error);
    return null;
  }
}

/**
 * POST /api/trade
 * AUXM ile metal alım/satım
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, action, metal, amount, walletAddress } = await request.json();

    // Validasyon
    if (!action || !metal || !amount) {
      return NextResponse.json(
        { error: "Missing required fields: action, metal, amount" },
        { status: 400 }
      );
    }

    if (!["buy", "sell"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Use: buy, sell" },
        { status: 400 }
      );
    }

    const validMetals = ["AUXG", "AUXS", "AUXPT", "AUXPD"];
    if (!validMetals.includes(metal)) {
      return NextResponse.json(
        { error: `Invalid metal. Valid: ${validMetals.join(", ")}` },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
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
    const prices = await getMetalPrices();
    if (!prices || !prices.prices) {
      return NextResponse.json(
        { error: "Could not fetch prices" },
        { status: 500 }
      );
    }

    const askPrice = prices.prices[metal] || 0; // Alış fiyatı (kullanıcı alır)
    const bidPrice = prices.bidPrices?.[metal] || askPrice; // Satış fiyatı (kullanıcı satar)

    if (askPrice === 0) {
      return NextResponse.json(
        { error: `Price not available for ${metal}` },
        { status: 500 }
      );
    }

    // Bakiyeleri al
    const auxmBalance =
      ((await redis.get(`user:${resolvedUserId}:balance:AUXM`)) as number) || 0;
    const metalBalance =
      ((await redis.get(`user:${resolvedUserId}:balance:${metal}`)) as number) || 0;

    let newAuxmBalance: number;
    let newMetalBalance: number;
    let auxmChange: number;
    let metalChange: number;
    let priceUsed: number;

    if (action === "buy") {
      // AUXM ile metal al
      priceUsed = askPrice;
      auxmChange = amount * askPrice; // Harcanan AUXM

      if (auxmBalance < auxmChange) {
        return NextResponse.json(
          {
            error: "Insufficient AUXM balance",
            required: auxmChange,
            available: auxmBalance,
          },
          { status: 400 }
        );
      }

      newAuxmBalance = auxmBalance - auxmChange;
      newMetalBalance = metalBalance + amount;
      metalChange = amount;
    } else {
      // Metal sat, AUXM al
      priceUsed = bidPrice;

      if (metalBalance < amount) {
        return NextResponse.json(
          {
            error: `Insufficient ${metal} balance`,
            required: amount,
            available: metalBalance,
          },
          { status: 400 }
        );
      }

      auxmChange = amount * bidPrice; // Kazanılan AUXM
      newAuxmBalance = auxmBalance + auxmChange;
      newMetalBalance = metalBalance - amount;
      metalChange = -amount;
    }

    // Bakiyeleri güncelle
    await redis.set(`user:${resolvedUserId}:balance:AUXM`, newAuxmBalance);
    await redis.set(`user:${resolvedUserId}:balance:${metal}`, newMetalBalance);

    // Trade kaydı
    const tradeRecord = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: resolvedUserId,
      action,
      metal,
      amount,
      price: priceUsed,
      auxmAmount: auxmChange,
      previousAuxmBalance: auxmBalance,
      newAuxmBalance,
      previousMetalBalance: metalBalance,
      newMetalBalance,
      timestamp: new Date().toISOString(),
    };

    await redis.lpush(`user:${resolvedUserId}:trades`, JSON.stringify(tradeRecord));
    await redis.lpush("trades:all", JSON.stringify(tradeRecord));

    console.log(
      `✅ Trade: ${action} ${amount}g ${metal} @ $${priceUsed} = ${auxmChange.toFixed(2)} AUXM`
    );

    return NextResponse.json({
      success: true,
      trade: tradeRecord,
      balances: {
        AUXM: newAuxmBalance,
        [metal]: newMetalBalance,
      },
    });
  } catch (error: any) {
    console.error("Trade error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/trade?userId=xxx
 * Trade geçmişini getir
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const address = searchParams.get("address");
    const limit = parseInt(searchParams.get("limit") || "20");

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

    const tradesRaw = await redis.lrange(
      `user:${resolvedUserId}:trades`,
      0,
      limit - 1
    );

    const trades = tradesRaw.map((t) => {
      if (typeof t === "string") {
        return JSON.parse(t);
      }
      return t;
    });

    return NextResponse.json({
      userId: resolvedUserId,
      trades,
      count: trades.length,
    });
  } catch (error: any) {
    console.error("Trade history error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
