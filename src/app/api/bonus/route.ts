import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { getBonusStatus } from "@/lib/bonus-guard";
import { getBonusStatus as getFullBonusStatus } from "@/lib/metal-bonus-service";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const dynamic = "force-dynamic";

// GET /api/bonus?address=0x...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();
    const userId = await redis.get(`user:address:${normalizedAddress}`) as string;

    if (!userId) {
      return NextResponse.json({
        success: true,
        bonus: {
          hasBonus: false,
          unlocked: false,
          bonusBalances: {},
          unlockPercent: 0,
          unlockMethod: 'none',
          daysRemaining: 30,
          volumeProgress: 0,
          volumeRequired: 0,
          currentVolumeUsd: 0,
          welcomeClaimed: false,
          totalCostUsd: 0,
          maxCostUsd: 100,
        },
      });
    }

    const status = await getBonusStatus(userId);
    const fullStatus = await getFullBonusStatus(userId);

    return NextResponse.json({
      success: true,
      bonus: {
        ...status,
        welcomeClaimed: fullStatus.welcomeClaimed,
        totalCostUsd: fullStatus.totalCostUsd,
        maxCostUsd: fullStatus.maxCostUsd,
      },
    });
  } catch (error: any) {
    console.error("Bonus GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
