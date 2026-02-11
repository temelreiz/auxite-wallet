// src/app/api/user/settings/route.ts
// Kullanıcı ayarları — deposit auto-convert tercihi vs.

import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

export const dynamic = "force-dynamic";

/**
 * GET /api/user/settings?address=0x...
 * Kullanıcı ayarlarını getir
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json({ error: "Missing address" }, { status: 400 });
    }

    const redis = getRedis();
    const key = `user:${address.toLowerCase()}:settings`;
    const settings = await redis.hgetall(key);

    return NextResponse.json({
      success: true,
      settings: {
        autoConvertToAuxm: settings?.autoConvertToAuxm !== "false", // default: true
      },
    });
  } catch (error: any) {
    console.error("Get user settings error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/user/settings
 * Kullanıcı ayarlarını güncelle
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, autoConvertToAuxm } = body;

    if (!address) {
      return NextResponse.json({ error: "Missing address" }, { status: 400 });
    }

    const redis = getRedis();
    const key = `user:${address.toLowerCase()}:settings`;

    const updates: Record<string, string> = {};

    if (typeof autoConvertToAuxm === "boolean") {
      updates.autoConvertToAuxm = autoConvertToAuxm.toString();
    }

    if (Object.keys(updates).length > 0) {
      await redis.hset(key, updates);
    }

    return NextResponse.json({
      success: true,
      settings: {
        autoConvertToAuxm: updates.autoConvertToAuxm !== "false",
      },
    });
  } catch (error: any) {
    console.error("Update user settings error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
