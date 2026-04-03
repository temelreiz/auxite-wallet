/**
 * Welcome Gold Status API
 * GET: Check welcome gold status for a user
 */

import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const walletAddress = req.nextUrl.searchParams.get("address");

  let resolvedUserId = userId;
  if (!resolvedUserId && walletAddress) {
    resolvedUserId = (await redis.get(`user:address:${walletAddress.toLowerCase()}`)) as string;
  }

  if (!resolvedUserId) {
    return NextResponse.json({
      status: "none",
      amount: 5,
      asset: "AUXG",
    });
  }

  const status = (await redis.get(`user:${resolvedUserId}:welcomeGold:status`) as string) || "pending";
  const amount = parseFloat((await redis.get(`user:${resolvedUserId}:welcomeGold:amount`) as string) || "5");
  const unlockedAt = await redis.get(`user:${resolvedUserId}:welcomeGold:unlockedAt`);

  return NextResponse.json({
    status,
    amount,
    asset: "AUXG",
    unlockedAt: unlockedAt || null,
  });
}
