// src/app/api/security/2fa/enable/route.ts
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
  try {
    // Secret'i OTPAuth.Secret olarak oluştur (base32 decode garantisi)
    const secretObj = OTPAuth.Secret.fromBase32(secret);

    const totp = new OTPAuth.TOTP({
      issuer: "Auxite",
      label: "user",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: secretObj,
    });

    // Window 2 = ±60 saniye tolerans (QR scan + kod girişi arasındaki gecikme)
    const delta = totp.validate({ token: code, window: 2 });

    console.log("2FA Enable - TOTP validation:", {
      secretLength: secret.length,
      secretFirst4: secret.substring(0, 4),
      code,
      delta,
      currentCode: totp.generate(),
      serverTime: new Date().toISOString(),
    });

    return delta !== null;
  } catch (error) {
    console.error("2FA Enable - verifyCode error:", error);
    return false;
  }
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

    const key = get2FAKey(address);
    const normalizedAddress = address.toLowerCase();

    // Get temp secret from setup
    const data = await redis.hgetall(key);
    const tempSecret = data?.tempSecret as string;
    const tempBackupCodes = data?.tempBackupCodes as string;

    if (!tempSecret) {
      return NextResponse.json({ 
        error: "Önce kurulum başlatın" 
      }, { status: 400 });
    }

    // Verify the code
    if (!verifyCode(tempSecret, code)) {
      return NextResponse.json({ 
        error: "Geçersiz doğrulama kodu" 
      }, { status: 400 });
    }

    // Parse and hash backup codes for storage
    let backupCodes: string[] = [];
    let hashedBackupCodes: string[] = [];
    
    if (tempBackupCodes) {
      try {
        backupCodes = JSON.parse(tempBackupCodes);
        hashedBackupCodes = backupCodes.map(hashCode);
      } catch {
        // Generate new if parse fails
        backupCodes = [];
        for (let i = 0; i < 10; i++) {
          backupCodes.push(crypto.randomBytes(4).toString("hex").toUpperCase());
        }
        hashedBackupCodes = backupCodes.map(hashCode);
      }
    }

    // Enable 2FA - store hashed backup codes
    await redis.hset(key, {
      secret: tempSecret,
      enabled: "true",
      enabledAt: Date.now().toString(),
      backupCodes: JSON.stringify(hashedBackupCodes), // Store hashed versions
      hashedBackupCodes: JSON.stringify(hashedBackupCodes), // Also store here for compatibility
      backupCodesRemaining: hashedBackupCodes.length.toString(),
    });

    // Clean up temp data
    await redis.hdel(key, "tempSecret", "tempBackupCodes", "setupStarted");

    // Audit log
    await redis.lpush(`user:${normalizedAddress}:security_logs`, JSON.stringify({
      action: "2fa_enabled",
      ip,
      timestamp: Date.now(),
    }));

    return NextResponse.json({
      success: true,
      backupCodes, // Return plain text codes - shown only once!
      message: "2FA başarıyla aktifleştirildi. Backup kodlarını güvenli bir yere kaydedin!",
    });

  } catch (error) {
    console.error("2FA enable error:", error);
    return NextResponse.json({ error: "Enable failed" }, { status: 500 });
  }
}
