// /api/admin/auth/route.ts
// 🔒 SECURITY: Admin authentication with rate limiting, IP logging, Telegram alerts
import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { Redis } from "@upstash/redis";
import { sendTelegramMessage } from "@/lib/telegram";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const SESSION_TTL = 60 * 60 * 4; // 🔒 4 saat (24'ten düşürüldü)

// 🔒 Rate limiting: Max 5 failed attempts per IP per 15 minutes
const MAX_FAILED_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 15 * 60; // 15 dakika

function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number }> {
  const key = `admin:ratelimit:${ip}`;
  try {
    const attempts = parseInt(await redis.get(key) as string || "0");
    if (attempts >= MAX_FAILED_ATTEMPTS) {
      return { allowed: false, remaining: 0 };
    }
    return { allowed: true, remaining: MAX_FAILED_ATTEMPTS - attempts };
  } catch {
    return { allowed: true, remaining: MAX_FAILED_ATTEMPTS };
  }
}

async function recordFailedAttempt(ip: string): Promise<void> {
  const key = `admin:ratelimit:${ip}`;
  try {
    const current = parseInt(await redis.get(key) as string || "0");
    await redis.set(key, (current + 1).toString(), { ex: RATE_LIMIT_WINDOW });

    // If too many attempts, send Telegram alert
    if (current + 1 >= MAX_FAILED_ATTEMPTS) {
      sendTelegramMessage(
        `🚨 <b>BRUTE FORCE ALGILANDI</b> 🚨\n\n` +
        `<b>IP:</b> <code>${ip}</code>\n` +
        `<b>Başarısız Deneme:</b> ${current + 1}\n` +
        `<b>Zaman:</b> ${new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}\n\n` +
        `⚠️ Bu IP 15 dakika engellendi!`
      ).catch(() => {});
    }
  } catch {
    // Fail silently - don't block auth if rate limit storage fails
  }
}

// POST - Login
export async function POST(request: NextRequest) {
  const ip = getClientIP(request);

  try {
    // 🔒 Rate limiting check
    const rateLimit = await checkRateLimit(ip);
    if (!rateLimit.allowed) {
      console.warn(`🚨 RATE LIMITED: Admin login blocked for IP ${ip}`);
      return NextResponse.json({
        success: false,
        error: "Too many failed attempts. Please try again later.",
      }, { status: 429 });
    }

    const { password } = await request.json();

    if (!ADMIN_PASSWORD) {
      return NextResponse.json({
        success: false,
        error: "Admin not configured"
      }, { status: 500 });
    }

    if (password !== ADMIN_PASSWORD) {
      // 🔒 Record failed attempt + audit
      await recordFailedAttempt(ip);

      await redis.lpush("admin:audit:failed_auth", JSON.stringify({
        endpoint: "/api/admin/auth",
        type: "login_failed",
        ip,
        userAgent: request.headers.get("user-agent") || "unknown",
        timestamp: Date.now(),
      }));
      await redis.ltrim("admin:audit:failed_auth", 0, 499);

      console.warn(`🚨 Failed admin login from IP: ${ip}`);

      return NextResponse.json({
        success: false,
        error: "Invalid password"
      }, { status: 401 });
    }

    // Session token oluştur
    const token = generateSessionToken();

    // Redis'e kaydet (Upstash — requireAdmin ile aynı store)
    const sessionData = JSON.stringify({
      address: "admin",
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_TTL * 1000,
      ip,
      userAgent: request.headers.get("user-agent") || "unknown",
    });
    await redis.set(`admin:session:${token}`, sessionData, { ex: SESSION_TTL });
    // Backward compat: also write to KV if available
    try { await kv.set(`admin:session:${token}`, { createdAt: Date.now(), ip, userAgent: request.headers.get("user-agent") || "unknown" }, { ex: SESSION_TTL }); } catch {};

    // 🔒 Audit: Log successful login
    await redis.lpush("admin:audit:logins", JSON.stringify({
      type: "login_success",
      ip,
      userAgent: request.headers.get("user-agent") || "unknown",
      timestamp: Date.now(),
      date: new Date().toISOString(),
    }));
    await redis.ltrim("admin:audit:logins", 0, 499);

    // 🔒 Telegram alert for admin login
    sendTelegramMessage(
      `🔑 <b>ADMIN GİRİŞİ</b>\n\n` +
      `<b>IP:</b> <code>${ip}</code>\n` +
      `<b>Zaman:</b> ${new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}\n\n` +
      `Siz giriş yapmadıysanız şifreyi hemen değiştirin!`
    ).catch(() => {});

    // Clear rate limit on successful login
    await redis.del(`admin:ratelimit:${ip}`).catch(() => {});

    return NextResponse.json({
      success: true,
      token
    });
  } catch (error) {
    console.error("Admin auth error:", error);
    return NextResponse.json({
      success: false,
      error: "Auth failed"
    }, { status: 500 });
  }
}

// GET - Verify session
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({
        valid: false
      }, { status: 401 });
    }

    // Check Upstash Redis first (primary), then KV fallback
    let session = await redis.get(`admin:session:${token}`);
    if (!session) {
      session = await kv.get(`admin:session:${token}`);
    }

    if (!session) {
      return NextResponse.json({
        valid: false
      }, { status: 401 });
    }

    return NextResponse.json({
      valid: true
    });
  } catch (error) {
    return NextResponse.json({
      valid: false
    }, { status: 500 });
  }
}

// DELETE - Logout
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (token) {
      await redis.del(`admin:session:${token}`);
      try { await kv.del(`admin:session:${token}`); } catch {};

      // 🔒 Audit: Log logout
      const ip = getClientIP(request);
      await redis.lpush("admin:audit:logins", JSON.stringify({
        type: "logout",
        ip,
        timestamp: Date.now(),
      })).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
