// src/app/api/security/2fa/setup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import * as OTPAuth from "otpauth";
import * as crypto from "crypto";
import QRCode from "qrcode";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

function get2FAKey(address: string): string {
  return `user:2fa:${address.toLowerCase()}`;
}

function generateSecret(): OTPAuth.Secret {
  return new OTPAuth.Secret({ size: 20 });
}

function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    codes.push(crypto.randomBytes(4).toString("hex").toUpperCase());
  }
  return codes;
}

export async function POST(request: NextRequest) {
  try {
    const address = request.headers.get("x-wallet-address");

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    const key = get2FAKey(address);
    const normalizedAddress = address.toLowerCase();

    // Check if already enabled
    const existing = await redis.hget(key, "enabled");
    if (existing === "true") {
      return NextResponse.json({ 
        error: "2FA zaten aktif. Önce devre dışı bırakın." 
      }, { status: 400 });
    }

    // Generate new secret
    const secretObj = generateSecret();
    const secretBase32 = secretObj.base32;

    // Create TOTP for QR code — secret obje olarak verilmeli (encoding tutarlılığı)
    const totp = new OTPAuth.TOTP({
      issuer: "Auxite",
      label: `Auxite:${normalizedAddress.slice(0, 8)}`,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: secretObj,
    });

    const otpauthUrl = totp.toString();

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    // Generate backup codes (plain text - will be shown once)
    const backupCodes = generateBackupCodes();

    // Store temp secret as base32 string (not enabled yet)
    await redis.hset(key, {
      tempSecret: secretBase32,
      tempBackupCodes: JSON.stringify(backupCodes),
      setupStarted: Date.now().toString(),
    });

    console.log("2FA Setup:", {
      address: normalizedAddress.slice(0, 8),
      secretLength: secretBase32.length,
      secretFirst4: secretBase32.substring(0, 4),
      otpauthUrl: otpauthUrl.substring(0, 60) + "...",
      currentCode: totp.generate(),
      serverTime: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      secret: secretBase32,
      qrCodeDataUrl,
      qrCodeUrl: otpauthUrl,
      backupCodes, // Plain text - show to user once
      message: "QR kodu tarayın ve doğrulama kodunu girin",
    });

  } catch (error) {
    console.error("2FA setup error:", error);
    return NextResponse.json({ error: "Setup failed" }, { status: 500 });
  }
}
