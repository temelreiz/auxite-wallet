// src/app/api/security/2fa/disable/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import * as OTPAuth from "otpauth";
import * as crypto from "crypto";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

function get2FAKey(address: string): string {
  return `user:2fa:${address.toLowerCase()}`;
}

function verifyCode(secret: string, code: string): boolean {
  const totp = new OTPAuth.TOTP({
    issuer: "Auxite",
    label: "user",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: secret,
  });
  const delta = totp.validate({ token: code, window: 1 });
  return delta !== null;
}

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

  try {
    const address = request.headers.get("x-wallet-address");
    const body = await request.json();
    const { code } = body;

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    if (!code) {
      return NextResponse.json({ error: "Doğrulama kodu gerekli" }, { status: 400 });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // RATE LIMITING - Brute force koruması (2FA devre dışı bırakma kritik işlem)
    // ═══════════════════════════════════════════════════════════════════════════
    const rateLimitKey = `ratelimit:2fa_disable:${address.toLowerCase()}`;
    const rateLimitWindow = 3600; // 1 saat
    const rateLimitMax = 5; // Saatte max 5 deneme
    const now = Math.floor(Date.now() / 1000);

    await redis.zremrangebyscore(rateLimitKey, 0, now - rateLimitWindow);
    const requestCount = await redis.zcard(rateLimitKey);

    if (requestCount >= rateLimitMax) {
      // Şüpheli aktivite - audit log
      await redis.lpush(`user:${address.toLowerCase()}:security_logs`, JSON.stringify({
        action: "2fa_disable_blocked",
        reason: "rate_limit_exceeded",
        ip,
        timestamp: Date.now(),
      }));

      return NextResponse.json({
        error: "Çok fazla deneme. Lütfen 1 saat sonra tekrar deneyin.",
        code: "RATE_LIMIT_EXCEEDED",
      }, { status: 429 });
    }

    await redis.zadd(rateLimitKey, { score: now, member: `${now}-${Math.random()}` });
    await redis.expire(rateLimitKey, rateLimitWindow * 2);

    const key = get2FAKey(address);
    const normalizedAddress = address.toLowerCase();

    // Get 2FA data
    const data = await redis.hgetall(key);
    
    if (!data || data.enabled !== "true" || !data.secret) {
      return NextResponse.json({ 
        error: "2FA zaten devre dışı" 
      }, { status: 400 });
    }

    const secret = data.secret as string;
    let verified = false;

    // Try TOTP code
    if (verifyCode(secret, code)) {
      verified = true;
    }

    // Try backup code if TOTP failed
    if (!verified) {
      let backupCodes: string[] = [];
      
      if (data.hashedBackupCodes) {
        try {
          backupCodes = JSON.parse(data.hashedBackupCodes as string);
        } catch {}
      }
      
      if (backupCodes.length === 0 && data.backupCodes) {
        try {
          backupCodes = JSON.parse(data.backupCodes as string);
        } catch {}
      }

      const hashedInput = hashCode(code.toUpperCase());
      if (backupCodes.includes(hashedInput)) {
        verified = true;
      }
    }

    if (!verified) {
      return NextResponse.json({ 
        error: "Geçersiz doğrulama kodu" 
      }, { status: 400 });
    }

    // Disable 2FA - delete all data
    await redis.del(key);

    // Audit log
    await redis.lpush(`user:${normalizedAddress}:security_logs`, JSON.stringify({
      action: "2fa_disabled",
      ip,
      timestamp: Date.now(),
    }));

    return NextResponse.json({
      success: true,
      message: "2FA başarıyla devre dışı bırakıldı",
    });

  } catch (error) {
    console.error("2FA disable error:", error);
    return NextResponse.json({ error: "İşlem başarısız" }, { status: 500 });
  }
}
