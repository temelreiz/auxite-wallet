/**
 * Welcome Gold API — "Start With Gold" Campaign
 *
 * POST: Grant 5 AUXG welcome bonus after first demo trade
 * Called by mobile app when user completes their first demo action.
 *
 * Flow: Demo trade → call this endpoint → 5 AUXG credited as bonus
 * Bonus is platform-use only (non-withdrawable, non-transferable)
 */

import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import {
  grantBonus,
  checkIpVelocity,
  getWelcomeGoldAmount,
  BONUS_CONFIG,
} from "@/lib/metal-bonus-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, walletAddress, deviceId, email } = body;

    if (!userId && !walletAddress && !email) {
      return NextResponse.json(
        { error: "userId, walletAddress, or email required" },
        { status: 400 }
      );
    }

    // Resolve userId from walletAddress or email
    let resolvedUserId = userId;
    if (!resolvedUserId && walletAddress) {
      resolvedUserId = await redis.get(`user:address:${walletAddress.toLowerCase()}`);
    }
    if (!resolvedUserId && email) {
      resolvedUserId = email.toLowerCase();
    }
    if (!resolvedUserId) {
      // For demo-only users (no account yet), use email or device as identifier
      resolvedUserId = `demo:${deviceId || Date.now()}`;
    }

    // Check if already granted
    const status = await redis.get(`user:${resolvedUserId}:welcomeGold:status`);
    if (status === "unlocked" || status === "activated") {
      return NextResponse.json({
        success: false,
        error: "Welcome Gold already granted",
        status,
      });
    }

    // Abuse prevention: device limit
    if (deviceId) {
      const deviceUser = await redis.get(`welcomeGold:device:${deviceId}`);
      if (deviceUser && deviceUser !== resolvedUserId) {
        return NextResponse.json({
          success: false,
          error: "Device already used for Welcome Gold",
        });
      }
    }

    // Abuse prevention: IP velocity
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (ip !== "unknown") {
      const ipCheck = await checkIpVelocity(resolvedUserId, ip);
      if (!ipCheck.allowed) {
        return NextResponse.json({
          success: false,
          error: ipCheck.reason,
        });
      }
    }

    // Get gold price for cost calculation
    let goldPricePerGram = 145; // fallback
    try {
      const priceData = await redis.get("metal:prices:cache");
      if (priceData) {
        const prices = typeof priceData === "string" ? JSON.parse(priceData) : priceData;
        if (prices.gold && prices.gold > 0) goldPricePerGram = prices.gold;
      }
    } catch {}

    const { bonusGrams, bonusValueUsd } = getWelcomeGoldAmount(goldPricePerGram);

    // Grant the bonus
    const result = await grantBonus(
      resolvedUserId,
      "welcome",
      "AUXG",
      bonusGrams,
      bonusValueUsd
    );

    if (!result.granted) {
      return NextResponse.json({
        success: false,
        error: result.reason,
      });
    }

    // Record device
    if (deviceId) {
      await redis.set(`welcomeGold:device:${deviceId}`, resolvedUserId, { ex: 86400 * 365 });
    }

    // Update status
    await redis.set(`user:${resolvedUserId}:welcomeGold:status`, "unlocked");
    await redis.set(`user:${resolvedUserId}:welcomeGold:unlockedAt`, new Date().toISOString());
    await redis.set(`user:${resolvedUserId}:welcomeGold:amount`, bonusGrams.toString());

    // Store email for re-engagement if provided
    if (email) {
      await redis.set(`user:${resolvedUserId}:welcomeGold:email`, email.toLowerCase());
    }

    console.log(`🏆 Welcome Gold granted: ${result.grantedGrams.toFixed(3)}g AUXG to ${resolvedUserId}`);

    return NextResponse.json({
      success: true,
      amount: result.grantedGrams,
      asset: "AUXG",
      status: "unlocked",
      valueUsd: bonusValueUsd,
    });
  } catch (err: any) {
    console.error("[welcome-gold] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
