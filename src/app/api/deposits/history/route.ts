// app/api/deposits/history/route.ts
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

/**
 * GET /api/deposits/history?userId=xxx&limit=20
 * Kullanıcının deposit geçmişini getirir
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

    // Adres ile userId bul
    let resolvedUserId = userId;
    if (!resolvedUserId && address) {
      resolvedUserId = (await redis.get(
        `user:address:${address.toLowerCase()}`
      )) as string;
    }

    if (!resolvedUserId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Deposit geçmişini çek
    const depositsRaw = await redis.lrange(
      `user:${resolvedUserId}:deposits`,
      0,
      limit - 1
    );

    const deposits = depositsRaw.map((d) => {
      if (typeof d === "string") {
        return JSON.parse(d);
      }
      return d;
    });

    // Toplam deposit miktarı
    let totalAuxm = 0;
    deposits.forEach((d: any) => {
      totalAuxm += d.auxmAmount || 0;
    });

    return NextResponse.json({
      userId: resolvedUserId,
      deposits,
      count: deposits.length,
      totalAuxmDeposited: totalAuxm,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Deposit history error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
