// src/app/api/cron/health-monitor/route.ts
// Automated health monitor - runs every 15 minutes via Vercel Cron
// Logs alerts to Redis and sends push notification to admin on failure

import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import { sendTelegramMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const CRON_SECRET = process.env.CRON_SECRET;

interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  checks: Record<string, { status: string; error?: string; [key: string]: unknown }>;
  errors: string[];
}

// ============================================
// QUICK HEALTH CHECKS (optimized for cron)
// ============================================

async function quickCheckRedis(): Promise<{ ok: boolean; error?: string }> {
  try {
    const redis = getRedis();
    await redis.set("health:cron:ping", Date.now().toString(), { ex: 300 });
    const val = await redis.get("health:cron:ping");
    return { ok: !!val };
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : "Redis error" };
  }
}

async function quickCheckPrices(baseUrl: string): Promise<{ ok: boolean; source?: string; error?: string }> {
  try {
    const res = await fetch(`${baseUrl}/api/prices`, {
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    const source = data.source || "unknown";
    return { ok: source !== "fallback", source, ...(source === "fallback" && { error: "Fallback prices" }) };
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : "Network error" };
  }
}

async function quickCheckCrypto(baseUrl: string): Promise<{ ok: boolean; source?: string; error?: string }> {
  try {
    const res = await fetch(`${baseUrl}/api/crypto`, {
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    const isFallback = data.source === "fallback";
    return { ok: !isFallback, source: data.source, ...(isFallback && { error: "Fallback prices" }) };
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : "Network error" };
  }
}

async function quickCheckScanner(): Promise<{ ok: boolean; ageMinutes?: number; error?: string }> {
  try {
    const redis = getRedis();
    const status = await redis.hgetall("scanner:status");
    if (!status || !status.lastRun) return { ok: false, error: "No scanner data" };

    const ageMs = Date.now() - new Date(status.lastRun as string).getTime();
    const ageMinutes = Math.round(ageMs / 60000);
    const stale = ageMs > 3600000; // 1 hour

    return { ok: !stale, ageMinutes, ...(stale && { error: `Scanner stale (${ageMinutes} min)` }) };
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : "Redis error" };
  }
}

async function quickCheckHtx(): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("https://api.huobi.pro/market/tickers", {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { ok: data.status === "ok" };
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : "Network error" };
  }
}

// ============================================
// ALERT MANAGEMENT
// ============================================

async function storeAlert(
  redis: ReturnType<typeof getRedis>,
  alert: Record<string, unknown>
): Promise<void> {
  const alertKey = `health:alerts:${Date.now()}`;
  await redis.set(alertKey, JSON.stringify(alert), { ex: 86400 * 7 }); // 7 days TTL

  // Also store in a list for easy retrieval
  await redis.lpush("health:monitor:alerts", JSON.stringify(alert));
  await redis.ltrim("health:monitor:alerts", 0, 99); // Keep last 100
}

async function sendAdminAlert(failures: string[]): Promise<void> {
  const message = [
    "⚠️ AUXITE HEALTH ALERT",
    "",
    `Time: ${new Date().toISOString()}`,
    `Failures (${failures.length}):`,
    ...failures.map((f) => `  - ${f}`),
    "",
    "Check: /api/health",
  ].join("\n");

  try {
    await sendTelegramMessage(message);
  } catch {
    console.error("Failed to send Telegram alert");
  }

  // Also try push notification to admin addresses
  try {
    const adminAddresses = (process.env.ADMIN_ADDRESSES || "")
      .toLowerCase()
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);

    if (adminAddresses.length > 0) {
      // Dynamic import to avoid circular deps
      const { sendPushToUser } = await import("@/lib/expo-push");
      for (const addr of adminAddresses) {
        await sendPushToUser(
          addr,
          "Health Alert",
          `${failures.length} check(s) failed: ${failures.slice(0, 2).join(", ")}`,
          { type: "health_alert", failures },
          { priority: "high", channelId: "alerts" }
        );
      }
    }
  } catch {
    console.error("Failed to send push notification alert");
  }
}

// ============================================
// MAIN HANDLER
// ============================================

export async function GET(request: NextRequest) {
  // Auth: Vercel Cron secret or internal API key
  const authHeader = request.headers.get("authorization");
  const apiKey = request.headers.get("x-api-key");

  if (
    authHeader !== `Bearer ${CRON_SECRET}` &&
    apiKey !== process.env.INTERNAL_API_KEY &&
    process.env.NODE_ENV === "production"
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    // Run all checks in parallel
    const [redisCheck, pricesCheck, cryptoCheck, scannerCheck, htxCheck] =
      await Promise.all([
        quickCheckRedis(),
        quickCheckPrices(baseUrl),
        quickCheckCrypto(baseUrl),
        quickCheckScanner(),
        quickCheckHtx(),
      ]);

    const checks = {
      redis: redisCheck,
      metalPrices: pricesCheck,
      cryptoPrices: cryptoCheck,
      depositScanner: scannerCheck,
      htx: htxCheck,
    };

    // Collect failures
    const failures: string[] = [];
    for (const [name, check] of Object.entries(checks)) {
      if (!check.ok) {
        failures.push(`${name}: ${check.error || "failed"}`);
      }
    }

    const allOk = failures.length === 0;

    // Store result in Redis
    const redis = getRedis();
    await redis.hset("health:monitor:last", {
      timestamp: new Date().toISOString(),
      status: allOk ? "healthy" : "degraded",
      failureCount: failures.length,
      failures: JSON.stringify(failures),
      latencyMs: Date.now() - startTime,
    });

    // If any failures, store alert and notify
    if (failures.length > 0) {
      const alert = {
        timestamp: new Date().toISOString(),
        status: "degraded",
        failures,
        checks,
      };

      await storeAlert(redis, alert);
      await sendAdminAlert(failures);
    }

    return NextResponse.json({
      success: true,
      status: allOk ? "healthy" : "degraded",
      checks,
      failures,
      latencyMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Monitor failed";
    console.error("Health monitor error:", message);

    // Try to log the error
    try {
      const redis = getRedis();
      await storeAlert(redis, {
        timestamp: new Date().toISOString(),
        status: "unhealthy",
        failures: [`monitor_crash: ${message}`],
      });
    } catch { /* can't even reach Redis */ }

    return NextResponse.json(
      {
        success: false,
        error: message,
        latencyMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
