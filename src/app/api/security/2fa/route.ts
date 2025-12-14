// src/app/api/security/2fa/route.ts
// User 2FA Setup & Management

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import * as OTPAuth from "otpauth";
import * as crypto from "crypto";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ═══════════════════════════════════════════════════════════════════════════
// TOTP FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════


function generateSecret(): string {
  // OTPAuth kendi secret generator kullan
  const secret = new OTPAuth.Secret({ size: 20 });
  return secret.base32;
}

function createTOTP(secret: string, label: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: "Auxite",
    label,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: secret,
  });
}

function verifyCode(secret: string, code: string): boolean {
  const totp = createTOTP(secret, "user");
  const delta = totp.validate({ token: code, window: 1 });
  return delta !== null;
}

function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    codes.push(crypto.randomBytes(4).toString("hex").toUpperCase());
  }
  return codes;
}

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function get2FAKey(address: string): string {
  return `user:${address.toLowerCase()}:2fa`;
}

// ═══════════════════════════════════════════════════════════════════════════
// GET - 2FA Status
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    const key = get2FAKey(address);
    const user2FA = await redis.hgetall(key);

    return NextResponse.json({
      enabled: user2FA?.enabled === true || user2FA?.enabled === "true",
      setupRequired: !user2FA?.secret,
      backupCodesRemaining: user2FA?.backupCodes 
        ? Array.isArray(user2FA.backupCodes) ? user2FA.backupCodes.length : JSON.parse(user2FA.backupCodes as string).length 
        : 0,
    });

  } catch (error) {
    console.error("2FA status error:", error);
    return NextResponse.json({ error: "Status check failed" }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST - 2FA Actions (setup, verify, enable, disable)
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

  try {
    const body = await request.json();
    const { action, address, code } = body;

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    const key = get2FAKey(address);
    const normalizedAddress = address.toLowerCase();

    // ─────────────────────────────────────────────────────────────────────
    // ACTION: setup - Generate new secret and QR code
    // ─────────────────────────────────────────────────────────────────────
    if (action === "setup") {
      const existing = await redis.hget(key, "enabled");
      if (existing === "true") {
        return NextResponse.json({ 
          error: "2FA zaten aktif. Önce devre dışı bırakın." 
        }, { status: 400 });
      }

      const secret = generateSecret();
      const totp = createTOTP(secret, `Auxite:${normalizedAddress.slice(0, 8)}`);
      const qrCodeUrl = totp.toString();

      // Geçici olarak secret'ı kaydet (henüz aktif değil)
      await redis.hset(key, {
        tempSecret: secret,
        setupStarted: Date.now().toString(),
      });

      return NextResponse.json({
        success: true,
        secret,
        qrCodeUrl,
        message: "QR kodu tarayın ve doğrulama kodunu girin",
      });
    }

    // ─────────────────────────────────────────────────────────────────────
    // ACTION: enable - Verify code and enable 2FA
    // ─────────────────────────────────────────────────────────────────────
    if (action === "enable") {
      if (!code) {
        return NextResponse.json({ error: "Doğrulama kodu gerekli" }, { status: 400 });
      }

      const tempSecret = await redis.hget(key, "tempSecret");
      if (!tempSecret) {
        return NextResponse.json({ 
          error: "Önce kurulum başlatın" 
        }, { status: 400 });
      }

      // Kodu doğrula
      if (!verifyCode(tempSecret as string, code)) {
        return NextResponse.json({ 
          error: "Geçersiz doğrulama kodu" 
        }, { status: 400 });
      }

      // Backup kodları oluştur
      const backupCodes = generateBackupCodes();
      const hashedBackupCodes = backupCodes.map(hashCode);

      // 2FA'yı aktif et
      await redis.hset(key, {
        secret: tempSecret,
        enabled: "true",
        enabledAt: Date.now().toString(),
        backupCodes: JSON.stringify(hashedBackupCodes),
      });

      // Geçici secret'ı temizle
      await redis.hdel(key, "tempSecret", "setupStarted");

      // Audit log
      await redis.lpush(`user:${normalizedAddress}:security_logs`, JSON.stringify({
        action: "2fa_enabled",
        ip,
        timestamp: Date.now(),
      }));

      return NextResponse.json({
        success: true,
        backupCodes, // Sadece bir kez gösterilecek!
        message: "2FA başarıyla aktifleştirildi. Backup kodlarını güvenli bir yere kaydedin!",
      });
    }

    // ─────────────────────────────────────────────────────────────────────
    // ACTION: verify - Verify 2FA code (for login/withdraw)
    // ─────────────────────────────────────────────────────────────────────
    if (action === "verify") {
      if (!code) {
        return NextResponse.json({ error: "Doğrulama kodu gerekli" }, { status: 400 });
      }

      const user2FA = await redis.hgetall(key);
      
      if (user2FA?.enabled !== "true" || !user2FA?.secret) {
        return NextResponse.json({ 
          error: "2FA aktif değil" 
        }, { status: 400 });
      }

      // Önce TOTP kodu dene
      if (verifyCode(user2FA.secret as string, code)) {
        // Audit log
        await redis.lpush(`user:${normalizedAddress}:security_logs`, JSON.stringify({
          action: "2fa_verified",
          method: "totp",
          ip,
          timestamp: Date.now(),
        }));

        return NextResponse.json({
          success: true,
          verified: true,
        });
      }

      // Backup kodu dene
      const backupCodes = user2FA.backupCodes 
        ? JSON.parse(user2FA.backupCodes as string) 
        : [];
      const hashedInput = hashCode(code.toUpperCase());
      const codeIndex = backupCodes.indexOf(hashedInput);

      if (codeIndex !== -1) {
        // Kullanılan backup kodunu sil
        backupCodes.splice(codeIndex, 1);
        await redis.hset(key, { backupCodes: JSON.stringify(backupCodes) });

        // Audit log
        await redis.lpush(`user:${normalizedAddress}:security_logs`, JSON.stringify({
          action: "2fa_verified",
          method: "backup_code",
          remainingCodes: backupCodes.length,
          ip,
          timestamp: Date.now(),
        }));

        return NextResponse.json({
          success: true,
          verified: true,
          warning: `Backup kodu kullanıldı. Kalan: ${backupCodes.length}`,
        });
      }

      // Geçersiz kod
      await redis.lpush(`user:${normalizedAddress}:security_logs`, JSON.stringify({
        action: "2fa_failed",
        ip,
        timestamp: Date.now(),
      }));

      return NextResponse.json({ 
        error: "Geçersiz doğrulama kodu" 
      }, { status: 400 });
    }

    // ─────────────────────────────────────────────────────────────────────
    // ACTION: disable - Disable 2FA (requires valid code)
    // ─────────────────────────────────────────────────────────────────────
    if (action === "disable") {
      if (!code) {
        return NextResponse.json({ error: "Doğrulama kodu gerekli" }, { status: 400 });
      }

      const user2FA = await redis.hgetall(key);
      
      if (user2FA?.enabled !== "true" || !user2FA?.secret) {
        return NextResponse.json({ 
          error: "2FA zaten devre dışı" 
        }, { status: 400 });
      }

      // Kodu doğrula
      if (!verifyCode(user2FA.secret as string, code)) {
        // Backup kodu da dene
        const backupCodes = user2FA.backupCodes 
          ? JSON.parse(user2FA.backupCodes as string) 
          : [];
        const hashedInput = hashCode(code.toUpperCase());
        
        if (!backupCodes.includes(hashedInput)) {
          return NextResponse.json({ 
            error: "Geçersiz doğrulama kodu" 
          }, { status: 400 });
        }
      }

      // 2FA'yı devre dışı bırak
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
    }

    // ─────────────────────────────────────────────────────────────────────
    // ACTION: regenerate-backup - Generate new backup codes
    // ─────────────────────────────────────────────────────────────────────
    if (action === "regenerate-backup") {
      if (!code) {
        return NextResponse.json({ error: "Doğrulama kodu gerekli" }, { status: 400 });
      }

      const user2FA = await redis.hgetall(key);
      
      if (user2FA?.enabled !== "true" || !user2FA?.secret) {
        return NextResponse.json({ 
          error: "2FA aktif değil" 
        }, { status: 400 });
      }

      // Kodu doğrula
      if (!verifyCode(user2FA.secret as string, code)) {
        return NextResponse.json({ 
          error: "Geçersiz doğrulama kodu" 
        }, { status: 400 });
      }

      // Yeni backup kodları oluştur
      const backupCodes = generateBackupCodes();
      const hashedBackupCodes = backupCodes.map(hashCode);

      await redis.hset(key, { 
        backupCodes: JSON.stringify(hashedBackupCodes) 
      });

      // Audit log
      await redis.lpush(`user:${normalizedAddress}:security_logs`, JSON.stringify({
        action: "2fa_backup_regenerated",
        ip,
        timestamp: Date.now(),
      }));

      return NextResponse.json({
        success: true,
        backupCodes,
        message: "Yeni backup kodları oluşturuldu",
      });
    }

    return NextResponse.json({ error: "Geçersiz action" }, { status: 400 });

  } catch (error) {
    console.error("2FA error:", error);
    return NextResponse.json({ error: "İşlem başarısız" }, { status: 500 });
  }
}
