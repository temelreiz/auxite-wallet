// src/app/api/admin/2fa/route.ts
// Admin 2FA Setup & Management (audit logger disabled)

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
  return crypto.randomBytes(20).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 32);
}

function createTOTP(secret: string, label: string = "Auxite Admin"): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: "Auxite",
    label,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
}

function verifyCode(secret: string, code: string): boolean {
  const totp = createTOTP(secret);
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

// ═══════════════════════════════════════════════════════════════════════════
// GET - 2FA Status
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const admin2FA = await redis.hgetall("admin:2fa");

    return NextResponse.json({
      enabled: admin2FA?.enabled === "true",
      setupRequired: !admin2FA?.secret,
    });

  } catch (error) {
    console.error("Admin 2FA status error:", error);
    return NextResponse.json({ error: "Status check failed" }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST - Enable 2FA / Generate Setup
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";

  try {
    const body = await request.json();
    const { action, code, password } = body;

    // Password verification for all actions
    if (password !== process.env.ADMIN_PASSWORD) {
      console.log("2FA: Wrong password attempt from", ip);
      return NextResponse.json({ error: "Geçersiz şifre" }, { status: 401 });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SETUP - Generate new secret
    // ─────────────────────────────────────────────────────────────────────────
    if (action === "setup") {
      // Check if already enabled
      const existing = await redis.hget("admin:2fa", "enabled");
      if (existing === "true") {
        return NextResponse.json(
          { error: "2FA zaten etkin. Önce devre dışı bırakın." },
          { status: 400 }
        );
      }

      // Generate new secret
      const secret = generateSecret();
      const totp = createTOTP(secret, "Auxite Admin Panel");
      const otpauthUrl = totp.toString();

      // Store pending setup
      await redis.hset("admin:2fa:pending", {
        secret,
        createdAt: Date.now().toString(),
      });
      await redis.expire("admin:2fa:pending", 600); // 10 minutes

      return NextResponse.json({
        success: true,
        secret,
        otpauthUrl,
        qrData: otpauthUrl,
        message: "Authenticator uygulamasına ekleyin ve kodu doğrulayın",
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // VERIFY - Complete setup
    // ─────────────────────────────────────────────────────────────────────────
    if (action === "verify") {
      if (!code || code.length !== 6) {
        return NextResponse.json({ error: "6 haneli kod gerekli" }, { status: 400 });
      }

      // Get pending setup
      const pending = await redis.hgetall("admin:2fa:pending");
      if (!pending || !pending.secret) {
        return NextResponse.json(
          { error: "Önce kurulum başlatın" },
          { status: 400 }
        );
      }

      const secret = pending.secret as string;

      // Verify code
      if (!verifyCode(secret, code)) {
        return NextResponse.json({ error: "Geçersiz kod" }, { status: 401 });
      }

      // Generate backup codes
      const backupCodes = generateBackupCodes();
      const hashedBackupCodes = backupCodes.map((c) =>
        crypto.createHash("sha256").update(c).digest("hex")
      );

      // Save to Redis
      await redis.hset("admin:2fa", {
        enabled: "true",
        secret,
        backupCodes: JSON.stringify(hashedBackupCodes),
        enabledAt: Date.now().toString(),
      });

      // Clean up pending
      await redis.del("admin:2fa:pending");

      console.log("2FA enabled for admin from", ip);

      return NextResponse.json({
        success: true,
        message: "2FA başarıyla etkinleştirildi",
        backupCodes,
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DISABLE - Turn off 2FA
    // ─────────────────────────────────────────────────────────────────────────
    if (action === "disable") {
      if (!code || code.length !== 6) {
        return NextResponse.json({ error: "6 haneli kod gerekli" }, { status: 400 });
      }

      // Get current secret
      const admin2FA = await redis.hgetall("admin:2fa");
      if (!admin2FA || admin2FA.enabled !== "true") {
        return NextResponse.json({ error: "2FA etkin değil" }, { status: 400 });
      }

      const secret = admin2FA.secret as string;

      // Verify code
      if (!verifyCode(secret, code)) {
        // Check backup codes
        const backupCodes = JSON.parse(admin2FA.backupCodes as string || "[]");
        const hashedCode = crypto.createHash("sha256").update(code.toUpperCase()).digest("hex");
        
        if (!backupCodes.includes(hashedCode)) {
          return NextResponse.json({ error: "Geçersiz kod" }, { status: 401 });
        }

        // Remove used backup code
        const newBackupCodes = backupCodes.filter((c: string) => c !== hashedCode);
        await redis.hset("admin:2fa", { backupCodes: JSON.stringify(newBackupCodes) });
      }

      // Disable 2FA
      await redis.hset("admin:2fa", {
        enabled: "false",
        disabledAt: Date.now().toString(),
      });

      console.log("2FA disabled for admin from", ip);

      return NextResponse.json({
        success: true,
        message: "2FA devre dışı bırakıldı",
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // REGENERATE BACKUP CODES
    // ─────────────────────────────────────────────────────────────────────────
    if (action === "regenerate_backup") {
      if (!code || code.length !== 6) {
        return NextResponse.json({ error: "6 haneli kod gerekli" }, { status: 400 });
      }

      const admin2FA = await redis.hgetall("admin:2fa");
      if (!admin2FA || admin2FA.enabled !== "true") {
        return NextResponse.json({ error: "2FA etkin değil" }, { status: 400 });
      }

      const secret = admin2FA.secret as string;

      // Verify code
      if (!verifyCode(secret, code)) {
        return NextResponse.json({ error: "Geçersiz kod" }, { status: 401 });
      }

      // Generate new backup codes
      const backupCodes = generateBackupCodes();
      const hashedBackupCodes = backupCodes.map((c) =>
        crypto.createHash("sha256").update(c).digest("hex")
      );

      await redis.hset("admin:2fa", { backupCodes: JSON.stringify(hashedBackupCodes) });

      return NextResponse.json({
        success: true,
        backupCodes,
        message: "Yeni yedek kodlar oluşturuldu",
      });
    }

    return NextResponse.json({ error: "Geçersiz action" }, { status: 400 });

  } catch (error: any) {
    console.error("Admin 2FA error:", error);
    return NextResponse.json({ error: "İşlem başarısız" }, { status: 500 });
  }
}
