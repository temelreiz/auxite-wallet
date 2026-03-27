// src/app/api/admin/health/route.ts
// Admin health dashboard - protected, with extra details

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getRedis } from "@/lib/redis";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

type CheckStatus = "ok" | "warn" | "fail";

interface CheckResult {
  status: CheckStatus;
  latency?: number;
  error?: string;
  [key: string]: unknown;
}

// ============================================
// ADMIN-SPECIFIC CHECKS
// ============================================

async function getUserCount(): Promise<{ total: number; withBalance: number }> {
  try {
    const redis = getRedis();
    const authUserKeys = await redis.keys("auth:user:*");
    const balanceUserKeys = await redis.keys("user:0x*:balance");

    const addressSet = new Set<string>();
    for (const key of authUserKeys) {
      try {
        const userData = await redis.hgetall(key);
        const addr = ((userData?.walletAddress as string) || "").toLowerCase().trim();
        if (addr) addressSet.add(addr);
      } catch { /* skip */ }
    }
    for (const key of balanceUserKeys) {
      const addr = key.split(":")[1];
      if (addr) addressSet.add(addr);
    }

    return { total: addressSet.size, withBalance: balanceUserKeys.length };
  } catch {
    return { total: 0, withBalance: 0 };
  }
}

async function getDemoUserCount(): Promise<number> {
  try {
    const redis = getRedis();
    const demoKeys = await redis.keys("demo:*");
    return demoKeys.length;
  } catch {
    return 0;
  }
}

async function getPushTokenCount(): Promise<number> {
  try {
    const redis = getRedis();
    const pushKeys = await redis.keys("push:mobile:*");
    return pushKeys.length;
  } catch {
    return 0;
  }
}

async function getRecentErrorCount(): Promise<{ count: number; recent: string[] }> {
  try {
    const redis = getRedis();
    // Check health alerts from last 24h
    const alertKeys = await redis.keys("health:alerts:*");
    // Also check admin audit for errors
    const errorLogs = await redis.lrange("admin:audit:errors", 0, 9);
    const recent = (errorLogs || []).map((e) =>
      typeof e === "string" ? e : JSON.stringify(e)
    ).slice(0, 5);

    return { count: alertKeys.length, recent };
  } catch {
    return { count: 0, recent: [] };
  }
}

async function getScannerDetails(): Promise<CheckResult> {
  try {
    const redis = getRedis();
    const status = await redis.hgetall("scanner:status");
    const recentDeposits = await redis.lrange("scanner:deposits:recent", 0, 4);

    if (!status || Object.keys(status).length === 0) {
      return { status: "warn", error: "No scanner data" };
    }

    const lastRun = status.lastRun as string;
    const ageMs = lastRun ? Date.now() - new Date(lastRun).getTime() : Infinity;

    return {
      status: ageMs > 3600000 ? "warn" : "ok",
      lastRun,
      lastResult: status.lastResult,
      depositCount: status.depositCount,
      orphanCount: status.orphanCount,
      errorCount: status.errorCount,
      ageMinutes: Math.round(ageMs / 60000),
      recentDeposits: (recentDeposits || []).slice(0, 3).map((d) => {
        try {
          return typeof d === "string" ? JSON.parse(d) : d;
        } catch {
          return d;
        }
      }),
    };
  } catch (error: unknown) {
    return {
      status: "fail",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function getHealthAlertHistory(): Promise<{ count: number; recent: unknown[] }> {
  try {
    const redis = getRedis();
    const alerts = await redis.lrange("health:monitor:alerts", 0, 9);
    const count = await redis.llen("health:monitor:alerts");

    return {
      count: count || 0,
      recent: (alerts || []).map((a) => {
        try {
          return typeof a === "string" ? JSON.parse(a) : a;
        } catch {
          return a;
        }
      }),
    };
  } catch {
    return { count: 0, recent: [] };
  }
}

// ============================================
// MAIN HANDLER
// ============================================

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  const startTime = Date.now();

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Fetch the public health check
    let publicHealth: Record<string, unknown> = {};
    try {
      const healthRes = await fetch(`${baseUrl}/api/health`, {
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      });
      publicHealth = await healthRes.json();
    } catch (error: unknown) {
      publicHealth = { error: error instanceof Error ? error.message : "Failed to fetch" };
    }

    // Run admin-specific checks in parallel
    const [
      userCount,
      demoUsers,
      pushTokenCount,
      recentErrors,
      scannerDetails,
      alertHistory,
    ] = await Promise.all([
      getUserCount(),
      getDemoUserCount(),
      getPushTokenCount(),
      getRecentErrorCount(),
      getScannerDetails(),
      getHealthAlertHistory(),
    ]);

    // Environment check
    const envStatus: Record<string, boolean> = {
      UPSTASH_REDIS_REST_URL: !!process.env.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: !!process.env.UPSTASH_REDIS_REST_TOKEN,
      GOLDAPI_KEY: !!process.env.GOLDAPI_KEY,
      KUVEYTTURK_CLIENT_ID: !!process.env.KUVEYTTURK_CLIENT_ID,
      CRON_SECRET: !!process.env.CRON_SECRET,
      HOT_WALLET_ETH_ADDRESS: !!process.env.HOT_WALLET_ETH_ADDRESS,
      HOT_WALLET_BTC_ADDRESS: !!process.env.HOT_WALLET_BTC_ADDRESS,
      TELEGRAM_BOT_TOKEN: !!process.env.TELEGRAM_BOT_TOKEN,
      INTERNAL_API_KEY: !!process.env.INTERNAL_API_KEY,
    };

    const missingEnv = Object.entries(envStatus)
      .filter(([, v]) => !v)
      .map(([k]) => k);

    return NextResponse.json({
      // Public health data
      ...publicHealth,

      // Admin-only extras
      admin: {
        users: {
          total: userCount.total,
          withBalance: userCount.withBalance,
        },
        demoUsers,
        pushTokenCount,
        recentErrors,
        scannerDetails,
        alertHistory,
        environment: {
          configured: envStatus,
          missing: missingEnv,
        },
      },

      latencyMs: Date.now() - startTime,
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Admin health check failed",
        latencyMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
