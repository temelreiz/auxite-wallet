// src/lib/admin-auth.ts
// Güçlü admin authentication sistemi

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import * as crypto from "crypto";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Admin session süresi (4 saat)
const SESSION_TTL = 4 * 60 * 60;

// Admin addresses - ENV'den alınır
const ADMIN_ADDRESSES = (process.env.ADMIN_ADDRESSES || "")
  .toLowerCase()
  .split(",")
  .map((a) => a.trim())
  .filter(Boolean);

interface AdminSession {
  address: string;
  createdAt: number;
  expiresAt: number;
  ip: string;
  userAgent: string;
}

/**
 * Generate secure session token
 */
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Get client IP
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

/**
 * Check if address is admin
 */
export function isAdminAddress(address: string): boolean {
  if (!address) return false;
  return ADMIN_ADDRESSES.includes(address.toLowerCase());
}

/**
 * Create admin session
 */
export async function createAdminSession(
  address: string,
  request: NextRequest
): Promise<string | null> {
  if (!isAdminAddress(address)) {
    return null;
  }

  const token = generateSessionToken();
  const now = Date.now();
  
  const session: AdminSession = {
    address: address.toLowerCase(),
    createdAt: now,
    expiresAt: now + SESSION_TTL * 1000,
    ip: getClientIP(request),
    userAgent: request.headers.get("user-agent") || "unknown",
  };

  await redis.set(`admin:session:${token}`, JSON.stringify(session), {
    ex: SESSION_TTL,
  });

  // Log admin login
  await redis.lpush(
    "admin:audit:logins",
    JSON.stringify({
      address: session.address,
      ip: session.ip,
      timestamp: now,
      action: "login",
    })
  );

  return token;
}

/**
 * Validate admin session
 */
export async function validateAdminSession(
  token: string,
  request: NextRequest
): Promise<{ valid: boolean; address?: string; error?: string }> {
  if (!token) {
    return { valid: false, error: "No token provided" };
  }

  const sessionData = await redis.get(`admin:session:${token}`);
  
  if (!sessionData) {
    return { valid: false, error: "Invalid or expired session" };
  }

  const session: AdminSession =
    typeof sessionData === "string" ? JSON.parse(sessionData) : sessionData;

  // Check expiry
  if (session.expiresAt < Date.now()) {
    await redis.del(`admin:session:${token}`);
    return { valid: false, error: "Session expired" };
  }

  // Optional: Check IP consistency (can be disabled for mobile users)
  const currentIP = getClientIP(request);
  if (process.env.ADMIN_STRICT_IP === "true" && session.ip !== currentIP) {
    return { valid: false, error: "IP mismatch" };
  }

  return { valid: true, address: session.address };
}

/**
 * Invalidate admin session (logout)
 */
export async function invalidateAdminSession(token: string): Promise<void> {
  await redis.del(`admin:session:${token}`);
}

/**
 * Admin auth middleware wrapper
 */
export async function withAdminAuth(
  request: NextRequest,
  handler: (address: string) => Promise<NextResponse>
): Promise<NextResponse> {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  // Legacy support: ADMIN_SECRET for backwards compatibility
  const adminSecret = process.env.ADMIN_SECRET;
  if (adminSecret && token === adminSecret) {
    // Log legacy auth usage
    console.warn("Legacy ADMIN_SECRET auth used - consider migrating to session auth");
    return handler("legacy-admin");
  }

  const validation = await validateAdminSession(token || "", request);

  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error || "Unauthorized" },
      { status: 401 }
    );
  }

  // Log admin action
  await logAdminAction(validation.address!, request);

  return handler(validation.address!);
}

/**
 * Log admin endpoint access for audit trail
 */
async function logAdminAction(address: string, request: NextRequest): Promise<void> {
  try {
    const ip = getClientIP(request);
    const url = new URL(request.url);
    const entry = JSON.stringify({
      address,
      ip,
      method: request.method,
      path: url.pathname,
      timestamp: Date.now(),
      userAgent: request.headers.get("user-agent") || "unknown",
    });
    await redis.lpush("admin:audit:actions", entry);
    await redis.ltrim("admin:audit:actions", 0, 999); // Keep last 1000 actions
  } catch {
    // Don't block admin actions if logging fails
  }
}

/**
 * Quick check for admin endpoints
 */
export async function requireAdmin(
  request: NextRequest
): Promise<{ authorized: boolean; address?: string; response?: NextResponse }> {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token || token === "null" || token === "undefined") {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  // Legacy ADMIN_SECRET support
  const adminSecret = process.env.ADMIN_SECRET;
  if (adminSecret && token === adminSecret) {
    return { authorized: true, address: "legacy-admin" };
  }

  const validation = await validateAdminSession(token, request);

  if (!validation.valid) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: validation.error || "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  return { authorized: true, address: validation.address };
}
