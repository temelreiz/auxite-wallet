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

function verifyTOTP(secret: string, code: string): boolean {
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

    // Window 2 = ±60 saniye tolerans (zaman senkronizasyon sorunları için)
    const delta = totp.validate({ token: code, window: 2 });

    console.log("TOTP validation:", {
      secretLength: secret.length,
      code,
      delta,
      currentCode: totp.generate(),
      serverTime: new Date().toISOString()
    });

    return delta !== null;
  } catch (error) {
    console.error("TOTP verify error:", error);
    return false;
  }
}

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const address = request.headers.get("x-wallet-address");
    const body = await request.json();
    const { code, isBackupCode } = body;

    console.log("2FA verify request:", { address, codeLength: code?.length, isBackupCode });

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    if (!code) {
      return NextResponse.json({ error: "Code required" }, { status: 400 });
    }

    const key = get2FAKey(address);
    const data = await redis.hgetall(key);

    console.log("2FA Redis data:", { 
      key, 
      hasData: !!data, 
      enabled: data?.enabled,
      hasSecret: !!data?.secret,
      secretLength: (data?.secret as string)?.length
    });

    if (!data || Object.keys(data).length === 0) {
      return NextResponse.json({ error: "2FA aktif değil", valid: false }, { status: 400 });
    }

    // String "true" kontrolü - ÖNEMLİ!
    const isEnabled = data.enabled === true || data.enabled === "true";
    
    if (!isEnabled || !data.secret) {
      return NextResponse.json({ error: "2FA aktif değil", valid: false }, { status: 400 });
    }

    const secret = data.secret as string;

    // Backup code kontrolü
    if (isBackupCode) {
      const hashedInput = hashCode(code.toUpperCase());
      
      let backupCodes: string[] = [];
      if (data.backupCodes) {
        try {
          backupCodes = typeof data.backupCodes === 'string' 
            ? JSON.parse(data.backupCodes) 
            : data.backupCodes as string[];
        } catch {
          backupCodes = [];
        }
      }

      const codeIndex = backupCodes.indexOf(hashedInput);
      
      if (codeIndex === -1) {
        return NextResponse.json({ error: "Geçersiz backup kodu", valid: false }, { status: 400 });
      }

      // Kullanılan kodu sil
      backupCodes.splice(codeIndex, 1);
      await redis.hset(key, { 
        backupCodes: JSON.stringify(backupCodes),
        backupCodesRemaining: backupCodes.length 
      });

      return NextResponse.json({
        valid: true,
        success: true,
        message: `Backup kodu kullanıldı. Kalan: ${backupCodes.length}`,
      });
    }

    // TOTP kod kontrolü
    if (!verifyTOTP(secret, code)) {
      return NextResponse.json({ error: "Geçersiz doğrulama kodu", valid: false }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      success: true,
    });

  } catch (error) {
    console.error("2FA verify error:", error);
    return NextResponse.json({ error: "Doğrulama başarısız", valid: false }, { status: 500 });
  }
}
