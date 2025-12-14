// src/app/api/admin/stats/route.ts
// Admin System Stats API

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET(request: NextRequest) {
  try {
    // Auth check (JWT token in header)
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get stats from Redis
    const [
      totalUsers,
      activeUsers24h,
      totalTrades,
      totalWithdraws,
      pendingKYC,
    ] = await Promise.all([
      redis.scard("users:all").catch(() => 0),
      redis.scard("users:active:24h").catch(() => 0),
      redis.get("stats:total_trades").catch(() => 0),
      redis.get("stats:total_withdraws").catch(() => 0),
      redis.scard("kyc:pending").catch(() => 0),
    ]);

    // Test Redis connection
    let redisConnected = false;
    try {
      await redis.ping();
      redisConnected = true;
    } catch (e) {
      redisConnected = false;
    }

    // Check blockchain enabled
    const blockchainEnabled = process.env.ENABLE_BLOCKCHAIN_TRADES === "true";

    return NextResponse.json({
      totalUsers: Number(totalUsers) || 0,
      activeUsers24h: Number(activeUsers24h) || 0,
      totalTrades: Number(totalTrades) || 0,
      totalWithdraws: Number(totalWithdraws) || 0,
      pendingKYC: Number(pendingKYC) || 0,
      redisConnected,
      blockchainEnabled,
      timestamp: Date.now(),
    });

  } catch (error: any) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
