// src/app/api/security/2fa/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

function get2FAKey(address: string): string {
  return `user:2fa:${address.toLowerCase()}`;
}

export async function GET(request: NextRequest) {
  try {
    const address = request.headers.get("x-wallet-address");

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    const key = get2FAKey(address);
    const data = await redis.hgetall(key);
    
    if (!data || Object.keys(data).length === 0) {
      return NextResponse.json({
        enabled: false,
        setupRequired: true,
        backupCodesRemaining: 0,
      });
    }

    // Parse backup codes to get count
    let backupCodesRemaining = 0;
    if (data.backupCodes) {
      try {
        const codes = JSON.parse(data.backupCodes as string);
        backupCodesRemaining = Array.isArray(codes) ? codes.length : 0;
      } catch {
        backupCodesRemaining = 0;
      }
    }

    return NextResponse.json({
      enabled: data.enabled === "true",
      setupRequired: !data.secret,
      backupCodesRemaining,
      enabledAt: data.enabledAt || null,
    });

  } catch (error) {
    console.error("2FA status error:", error);
    return NextResponse.json({ error: "Status check failed" }, { status: 500 });
  }
}
