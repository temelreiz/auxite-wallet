/**
 * Mobile Push Token Registration API
 * Stores Expo Push Tokens for mobile push notifications via FCM/APNs
 *
 * POST   - Register/update push token
 * DELETE - Remove push token (logout/unsubscribe)
 * GET    - Get registered tokens for user
 */

import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";

// Redis key pattern: push:mobile:{walletAddress}
// Stores array of { token, platform, deviceName, createdAt, updatedAt }

interface MobilePushToken {
  token: string;
  platform: "ios" | "android";
  deviceName: string;
  createdAt: string;
  updatedAt: string;
}

// ─── POST - Register push token ────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    // Auth: wallet address from header or Bearer token
    const walletAddress = request.headers.get("x-wallet-address");
    const authHeader = request.headers.get("authorization");

    let userId = walletAddress?.toLowerCase();

    // If Bearer token provided, resolve to wallet address
    if (!userId && authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      // Look up user by auth token
      const tokenUser = (await redis.get(`auth:token:${token}`)) as
        | string
        | null;
      if (tokenUser) {
        userId =
          typeof tokenUser === "string"
            ? JSON.parse(tokenUser).address?.toLowerCase()
            : undefined;
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { token, platform, deviceName } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Push token is required" },
        { status: 400 }
      );
    }

    if (!platform || !["ios", "android"].includes(platform)) {
      return NextResponse.json(
        { error: "Valid platform (ios/android) is required" },
        { status: 400 }
      );
    }

    // Get existing tokens
    const key = `push:mobile:${userId}`;
    const existingData = (await redis.get(key)) as string | null;
    const tokens: MobilePushToken[] = existingData
      ? JSON.parse(existingData)
      : [];

    const now = new Date().toISOString();

    // Check if token already exists
    const existingIndex = tokens.findIndex((t) => t.token === token);

    if (existingIndex >= 0) {
      // Update existing token
      tokens[existingIndex] = {
        ...tokens[existingIndex],
        platform,
        deviceName: deviceName || tokens[existingIndex].deviceName,
        updatedAt: now,
      };
    } else {
      // Add new token (max 5 devices per user)
      if (tokens.length >= 5) {
        // Remove oldest token
        tokens.sort(
          (a, b) =>
            new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        );
        tokens.shift();
      }

      tokens.push({
        token,
        platform,
        deviceName: deviceName || "Unknown Device",
        createdAt: now,
        updatedAt: now,
      });
    }

    await redis.set(key, JSON.stringify(tokens));

    // Also add to global token index for broadcast notifications
    await redis.sadd("push:mobile:all_users", userId);

    return NextResponse.json({
      success: true,
      message: "Push token registered",
      deviceCount: tokens.length,
    });
  } catch (error: any) {
    console.error("Push token POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── DELETE - Remove push token ────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const walletAddress = request.headers.get("x-wallet-address");
    const authHeader = request.headers.get("authorization");

    let userId = walletAddress?.toLowerCase();

    if (!userId && authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const tokenUser = (await redis.get(`auth:token:${token}`)) as
        | string
        | null;
      if (tokenUser) {
        userId =
          typeof tokenUser === "string"
            ? JSON.parse(tokenUser).address?.toLowerCase()
            : undefined;
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tokenToRemove = searchParams.get("token");

    const key = `push:mobile:${userId}`;

    if (tokenToRemove) {
      // Remove specific token
      const existingData = (await redis.get(key)) as string | null;
      const tokens: MobilePushToken[] = existingData
        ? JSON.parse(existingData)
        : [];
      const filtered = tokens.filter((t) => t.token !== tokenToRemove);
      await redis.set(key, JSON.stringify(filtered));

      // If no tokens left, remove from global index
      if (filtered.length === 0) {
        await redis.srem("push:mobile:all_users", userId);
      }

      return NextResponse.json({
        success: true,
        message: "Push token removed",
        deviceCount: filtered.length,
      });
    } else {
      // Remove all tokens for user
      await redis.del(key);
      await redis.srem("push:mobile:all_users", userId);

      return NextResponse.json({
        success: true,
        message: "All push tokens removed",
        deviceCount: 0,
      });
    }
  } catch (error: any) {
    console.error("Push token DELETE error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── GET - Get registered tokens for user ──────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get("x-wallet-address");
    const authHeader = request.headers.get("authorization");

    let userId = walletAddress?.toLowerCase();

    if (!userId && authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const tokenUser = (await redis.get(`auth:token:${token}`)) as
        | string
        | null;
      if (tokenUser) {
        userId =
          typeof tokenUser === "string"
            ? JSON.parse(tokenUser).address?.toLowerCase()
            : undefined;
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const key = `push:mobile:${userId}`;
    const existingData = (await redis.get(key)) as string | null;
    const tokens: MobilePushToken[] = existingData
      ? JSON.parse(existingData)
      : [];

    return NextResponse.json({
      success: true,
      tokens: tokens.map((t) => ({
        platform: t.platform,
        deviceName: t.deviceName,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        // Don't expose full token for security
        tokenPreview: t.token.slice(0, 20) + "...",
      })),
      deviceCount: tokens.length,
    });
  } catch (error: any) {
    console.error("Push token GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
