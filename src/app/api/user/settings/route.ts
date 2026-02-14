// src/app/api/user/settings/route.ts
// Kullanıcı ayarları — deposit auto-convert tercihi vs.

import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import { getPhoneTiering } from "@/lib/phone-tiering";

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

    let whitelistedAddresses: any[] = [];
    try {
      if (settings?.whitelistedAddresses) {
        whitelistedAddresses = typeof settings.whitelistedAddresses === "string"
          ? JSON.parse(settings.whitelistedAddresses)
          : settings.whitelistedAddresses;
      }
    } catch {}

    // Phone tiering data
    let phoneTiering = { tier: 0, phoneVerified: false, communicationPreference: 'email' };
    try {
      const pt = await getPhoneTiering(address);
      phoneTiering = {
        tier: pt.tier,
        phoneVerified: pt.phoneVerified,
        communicationPreference: pt.communicationPreference,
      };
    } catch (_) {}

    return NextResponse.json({
      success: true,
      settings: {
        autoConvertToAuxm: settings?.autoConvertToAuxm !== "false", // default: true
        whitelistedAddresses,
        phoneTier: phoneTiering.tier,
        phoneVerified: phoneTiering.phoneVerified,
        communicationPreference: phoneTiering.communicationPreference,
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
    const { address, autoConvertToAuxm, whitelistedAddresses } = body;

    if (!address) {
      return NextResponse.json({ error: "Missing address" }, { status: 400 });
    }

    const redis = getRedis();
    const key = `user:${address.toLowerCase()}:settings`;

    const updates: Record<string, string> = {};

    if (typeof autoConvertToAuxm === "boolean") {
      updates.autoConvertToAuxm = autoConvertToAuxm.toString();
    }

    if (Array.isArray(whitelistedAddresses)) {
      updates.whitelistedAddresses = JSON.stringify(whitelistedAddresses);
    }

    if (Object.keys(updates).length > 0) {
      await redis.hset(key, updates);
    }

    // Read back current state
    const current = await redis.hgetall(key);
    let currentAddresses: any[] = [];
    try {
      if (current?.whitelistedAddresses) {
        currentAddresses = typeof current.whitelistedAddresses === "string"
          ? JSON.parse(current.whitelistedAddresses)
          : current.whitelistedAddresses;
      }
    } catch {}

    return NextResponse.json({
      success: true,
      settings: {
        autoConvertToAuxm: current?.autoConvertToAuxm !== "false",
        whitelistedAddresses: currentAddresses,
      },
    });
  } catch (error: any) {
    console.error("Update user settings error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
