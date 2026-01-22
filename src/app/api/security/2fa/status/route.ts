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
    
    // Hash olarak oku
    const data = await redis.hgetall(key);
    
    if (!data || Object.keys(data).length === 0) {
      return NextResponse.json({
        enabled: false,
        setupRequired: true,
        backupCodesRemaining: 0,
      });
    }

    // Redis'ten gelen "true" string'ini boolean'a çevir
    const isEnabled = data.enabled === true || data.enabled === "true";
    const hasSecret = !!data.secret;
    
    // Backup codes sayısını hesapla
    let backupCodesRemaining = 0;
    if (data.backupCodesRemaining) {
      backupCodesRemaining = typeof data.backupCodesRemaining === 'string' 
        ? parseInt(data.backupCodesRemaining, 10) 
        : data.backupCodesRemaining;
    } else if (data.backupCodes) {
      try {
        const codes = typeof data.backupCodes === 'string' 
          ? JSON.parse(data.backupCodes) 
          : data.backupCodes;
        backupCodesRemaining = Array.isArray(codes) ? codes.length : 0;
      } catch {
        backupCodesRemaining = 0;
      }
    }

    return NextResponse.json({
      enabled: isEnabled && hasSecret,
      setupRequired: !hasSecret,
      backupCodesRemaining,
      enabledAt: data.enabledAt ? Number(data.enabledAt) : undefined,
    });

  } catch (error) {
    console.error("2FA status error:", error);
    return NextResponse.json({ error: "Status check failed" }, { status: 500 });
  }
}
