// src/app/api/security/2fa/route.ts
// Backward compatible main route + query param support

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

// ═══════════════════════════════════════════════════════════════════════════
// GET - 2FA Status (supports both query param and header)
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address") || request.headers.get("x-wallet-address");

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
    
    if (data.backupCodesRemaining) {
      backupCodesRemaining = parseInt(data.backupCodesRemaining as string);
    } else if (data.hashedBackupCodes) {
      try {
        const codes = JSON.parse(data.hashedBackupCodes as string);
        backupCodesRemaining = Array.isArray(codes) ? codes.length : 0;
      } catch {}
    } else if (data.backupCodes) {
      try {
        const codes = JSON.parse(data.backupCodes as string);
        backupCodesRemaining = Array.isArray(codes) ? codes.length : 0;
      } catch {}
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

// ═══════════════════════════════════════════════════════════════════════════
// POST - Legacy action-based endpoint (for backward compatibility)
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
    // ACTION: verify - Quick verify for withdraw/sensitive operations
    // ─────────────────────────────────────────────────────────────────────
    if (action === "verify") {
      if (!code) {
        return NextResponse.json({ error: "Doğrulama kodu gerekli" }, { status: 400 });
      }

      const data = await redis.hgetall(key);
      
      if (!data || data.enabled !== "true" || !data.secret) {
        return NextResponse.json({ 
          error: "2FA aktif değil",
          enabled: false,
        }, { status: 400 });
      }

      const secret = data.secret as string;
      
      // Try TOTP code
      if (verifyCode(secret, code)) {
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

      // Try backup code
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
        // Remove used backup code
        backupCodes.splice(codeIndex, 1);
        await redis.hset(key, { 
          backupCodes: JSON.stringify(backupCodes),
          hashedBackupCodes: JSON.stringify(backupCodes),
          backupCodesRemaining: backupCodes.length.toString(),
        });

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

      // Failed
      await redis.lpush(`user:${normalizedAddress}:security_logs`, JSON.stringify({
        action: "2fa_failed",
        ip,
        timestamp: Date.now(),
      }));

      return NextResponse.json({ 
        error: "Geçersiz doğrulama kodu" 
      }, { status: 400 });
    }

    return NextResponse.json({ error: "Geçersiz action. Use dedicated endpoints: /status, /setup, /enable, /verify, /disable" }, { status: 400 });

  } catch (error) {
    console.error("2FA error:", error);
    return NextResponse.json({ error: "İşlem başarısız" }, { status: 500 });
  }
}
