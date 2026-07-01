// src/lib/borrow-compliance.ts
// Compliance guards for Auxite Borrow, kept additive (does NOT touch the live
// withdraw path). Two guards:
//   1. verifyTwoFactor() — real TOTP + backup-code check, mirroring the store
//      and logic used by /api/withdraw (Redis hash `user:2fa:<address>`).
//   2. isUsPerson() — US-person geofence. Borrowing is not offered to US
//      persons (regulatory); block on an explicit US nationality/residence.
import { Redis } from "@upstash/redis";
import * as OTPAuth from "otpauth";
import * as crypto from "crypto";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ─────────────────────────────── 2FA ────────────────────────────────
function get2FAKey(address: string): string {
  return `user:2fa:${address.toLowerCase()}`;
}
function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

/** Verify a TOTP code (or single-use backup code) for `address`.
 *  Requires 2FA to be enabled — same bar as a crypto withdrawal. */
export async function verifyTwoFactor(
  address: string,
  code: string,
): Promise<{ valid: boolean; error?: string; enabled?: boolean }> {
  const key = get2FAKey(address);
  const data = await redis.hgetall(key);

  if (!data || Object.keys(data).length === 0) {
    return { valid: false, error: "2FA is not enabled. Enable 2FA before borrowing.", enabled: false };
  }
  const isEnabled = data.enabled === true || data.enabled === "true";
  if (!isEnabled || !data.secret) {
    return { valid: false, error: "2FA is not enabled. Enable 2FA before borrowing.", enabled: false };
  }
  if (!code) return { valid: false, error: "2FA code required", enabled: true };

  // TOTP
  try {
    const secretObj = OTPAuth.Secret.fromBase32(data.secret as string);
    const totp = new OTPAuth.TOTP({
      issuer: "Auxite", label: "user", algorithm: "SHA1", digits: 6, period: 30, secret: secretObj,
    });
    const delta = totp.validate({ token: code, window: 3 }); // ±90s tolerance
    if (delta !== null) return { valid: true, enabled: true };
  } catch (e) {
    console.error("TOTP verify error:", e);
  }

  // Backup codes (single-use)
  let backupCodes: string[] = [];
  if (data.hashedBackupCodes) { try { backupCodes = JSON.parse(data.hashedBackupCodes as string); } catch {} }
  if (backupCodes.length === 0 && data.backupCodes) { try { backupCodes = JSON.parse(data.backupCodes as string); } catch {} }
  const hashedInput = hashCode(code.toUpperCase());
  const idx = backupCodes.indexOf(hashedInput);
  if (idx !== -1) {
    backupCodes.splice(idx, 1);
    await redis.hset(key, {
      backupCodes: JSON.stringify(backupCodes),
      hashedBackupCodes: JSON.stringify(backupCodes),
      backupCodesRemaining: backupCodes.length.toString(),
    });
    return { valid: true, enabled: true };
  }

  return { valid: false, error: "Invalid 2FA code", enabled: true };
}

// ──────────────────────────── US geofence ────────────────────────────
const US_TOKENS = new Set([
  "US", "USA", "U.S.", "U.S.A.", "UNITED STATES", "UNITED STATES OF AMERICA", "AMERICA",
]);
function norm(s: any): string { return String(s || "").trim().toUpperCase(); }

/** True if the KYC record resolves this user to a US person (nationality or
 *  residence country). Missing/unknown country is NOT blocked here (KYC is
 *  still required to borrow); tighten to fail-closed later if needed. */
export async function isUsPerson(address: string): Promise<boolean> {
  try {
    const raw = await redis.get(`kyc:${address.toLowerCase()}`);
    if (!raw) return false;
    const kyc: any = typeof raw === "string" ? JSON.parse(raw) : raw;
    const nationality = norm(kyc?.personalInfo?.nationality);
    const country = norm(kyc?.address?.country);
    return US_TOKENS.has(nationality) || US_TOKENS.has(country);
  } catch {
    return false;
  }
}
