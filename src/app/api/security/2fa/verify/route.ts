// src/app/api/security/2fa/verify/route.ts
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

// Rate limiting
const RATE_LIMIT_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

  try {
    const address = request.headers.get("x-wallet-address");
    const body = await request.json();
    const { code, isBackupCode } = body;

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    if (!code) {
      return NextResponse.json({ error: "Doğrulama kodu gerekli" }, { status: 400 });
    }

    const key = get2FAKey(address);
    const normalizedAddress = address.toLowerCase();
    const rateLimitKey = `2fa:ratelimit:${normalizedAddress}`;

    // Check rate limit
    const attempts = await redis.get(rateLimitKey);
    if (attempts && parseInt(attempts as string) >= RATE_LIMIT_ATTEMPTS) {
      return NextResponse.json({ 
        error: "Çok fazla başarısız deneme. 15 dakika sonra tekrar deneyin.",
        locked: true,
      }, { status: 429 });
    }

    // Get 2FA data
    const data = await redis.hgetall(key);
    
    if (!data || data.enabled !== "true" || !data.secret) {
      return NextResponse.json({ 
        error: "2FA aktif değil" 
      }, { status: 400 });
    }

    const secret = data.secret as string;
    let verified = false;
    let usedBackupCode = false;

    // Try TOTP code first (unless explicitly backup code)
    if (!isBackupCode && verifyCode(secret, code)) {
      verified = true;
    }

    // Try backup code if TOTP failed or explicitly requested
    if (!verified) {
      // Get backup codes - check both possible keys
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
      const codeIndex = backupCodes.indexOf(hashedInput);

      if (codeIndex !== -1) {
        verified = true;
        usedBackupCode = true;

        // Remove used backup code
        backupCodes.splice(codeIndex, 1);
        await redis.hset(key, { 
          backupCodes: JSON.stringify(backupCodes),
          hashedBackupCodes: JSON.stringify(backupCodes),
          backupCodesRemaining: backupCodes.length.toString(),
        });
      }
    }

    if (verified) {
      // Clear rate limit on success
      await redis.del(rateLimitKey);

      // Audit log
      await redis.lpush(`user:${normalizedAddress}:security_logs`, JSON.stringify({
        action: "2fa_verified",
        method: usedBackupCode ? "backup_code" : "totp",
        ip,
        timestamp: Date.now(),
      }));

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const tokenKey = `2fa:token:${verificationToken}`;
      
      // Store token for 5 minutes
      await redis.setex(tokenKey, 300, JSON.stringify({
        address: normalizedAddress,
        verifiedAt: Date.now(),
        ip,
      }));

      const response: any = {
        success: true,
        verified: true,
        verificationToken,
      };

      if (usedBackupCode) {
        const remainingCodes = await redis.hget(key, "backupCodesRemaining");
        response.warning = `Backup kodu kullanıldı. Kalan: ${remainingCodes || 0}`;
        response.backupCodesRemaining = parseInt(remainingCodes as string || "0");
      }

      return NextResponse.json(response);
    }

    // Failed - increment rate limit
    const currentAttempts = parseInt(attempts as string || "0");
    await redis.setex(rateLimitKey, RATE_LIMIT_WINDOW / 1000, (currentAttempts + 1).toString());

    // Audit log
    await redis.lpush(`user:${normalizedAddress}:security_logs`, JSON.stringify({
      action: "2fa_failed",
      ip,
      timestamp: Date.now(),
    }));

    return NextResponse.json({ 
      error: "Geçersiz doğrulama kodu",
      remainingAttempts: RATE_LIMIT_ATTEMPTS - currentAttempts - 1,
    }, { status: 400 });

  } catch (error) {
    console.error("2FA verify error:", error);
    return NextResponse.json({ error: "Doğrulama başarısız" }, { status: 500 });
  }
}
