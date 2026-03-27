// src/app/api/health/route.ts
// Public health check endpoint - no auth required
// Checks all critical services and returns status

import { NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

type CheckStatus = "ok" | "warn" | "fail";

interface CheckResult {
  status: CheckStatus;
  latency?: number;
  error?: string;
  [key: string]: unknown;
}

interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  checks: Record<string, CheckResult>;
  errors: string[];
  latencyMs: number;
}

// ============================================
// INDIVIDUAL CHECKS
// ============================================

async function checkRedis(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const redis = getRedis();
    const testKey = "health:ping";
    await redis.set(testKey, "pong", { ex: 60 });
    const val = await redis.get(testKey);
    const latency = Date.now() - start;

    if (val !== "pong") {
      return { status: "fail", latency, error: "Read/write mismatch" };
    }
    return { status: "ok", latency };
  } catch (error: unknown) {
    return {
      status: "fail",
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkMetalPrices(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/prices`, {
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    const latency = Date.now() - start;

    if (!res.ok) {
      return { status: "fail", latency, error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    const source = data.source || data.pricingEngine?.source || "unknown";
    const isFallback = source === "fallback";
    const auxgPrice = data.basePrices?.AUXG || data.prices?.AUXG || 0;

    return {
      status: isFallback ? "warn" : "ok",
      latency,
      source,
      auxg: auxgPrice,
      ...(isFallback && { error: "Using fallback prices" }),
    };
  } catch (error: unknown) {
    return {
      status: "fail",
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : "Timeout or network error",
    };
  }
}

async function checkCryptoPrices(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/crypto`, {
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    const latency = Date.now() - start;

    if (!res.ok) {
      return { status: "fail", latency, error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    const sources: string[] = data.sources || [];
    const isFallback = data.source === "fallback" || sources.includes("fallback");

    return {
      status: isFallback ? "warn" : "ok",
      latency,
      sources,
      eth: data.ethereum?.usd || 0,
      btc: data.bitcoin?.usd || 0,
      ...(isFallback && { error: "Using fallback prices" }),
    };
  } catch (error: unknown) {
    return {
      status: "fail",
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : "Timeout or network error",
    };
  }
}

async function checkMarketStatus(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/market-status`, {
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    const latency = Date.now() - start;

    if (!res.ok) {
      return { status: "fail", latency, error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    if (typeof data.open !== "boolean") {
      return { status: "warn", latency, error: "Missing 'open' field" };
    }

    return {
      status: "ok",
      latency,
      open: data.open,
      label: data.label,
      stale: data.stale || false,
    };
  } catch (error: unknown) {
    return {
      status: "fail",
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : "Timeout or network error",
    };
  }
}

async function checkDepositScanner(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const redis = getRedis();
    const scannerStatus = await redis.hgetall("scanner:status");
    const latency = Date.now() - start;

    if (!scannerStatus || Object.keys(scannerStatus).length === 0) {
      return { status: "warn", latency, error: "No scanner status found" };
    }

    const lastRun = scannerStatus.lastRun as string;
    if (!lastRun) {
      return { status: "warn", latency, error: "No lastRun timestamp" };
    }

    const lastRunDate = new Date(lastRun);
    const ageMs = Date.now() - lastRunDate.getTime();
    const staleThresholdMs = 60 * 60 * 1000; // 1 hour

    return {
      status: ageMs > staleThresholdMs ? "warn" : "ok",
      latency,
      lastScan: lastRun,
      lastResult: scannerStatus.lastResult,
      ageMinutes: Math.round(ageMs / 60000),
      ...(ageMs > staleThresholdMs && { error: "Scanner stale (> 1 hour)" }),
    };
  } catch (error: unknown) {
    return {
      status: "fail",
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkExchangeRoute(): Promise<CheckResult> {
  const start = Date.now();
  try {
    // Check prices API to verify exchange can calculate
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://vault.auxite.io";
    const res = await fetch(`${baseUrl}/api/prices`, {
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    const latency = Date.now() - start;

    if (!res.ok) {
      return { status: "warn", latency, error: `Prices API returned HTTP ${res.status}` };
    }

    const data = await res.json();
    const auxgPrice = data.basePrices?.AUXG || data.executionPrices?.AUXG;
    if (!auxgPrice || auxgPrice <= 0) {
      return { status: "fail", latency, error: "No AUXG price available" };
    }

    // Verify price is in gram range (not ounce)
    if (auxgPrice > 500) {
      return { status: "fail", latency, error: `AUXG price $${auxgPrice} appears to be in ounce, not gram` };
    }

    return {
      status: "ok",
      latency,
      canQuote: true,
      auxgExecPrice: data.executionPrices?.AUXG,
      source: data.source,
    };
  } catch (error: unknown) {
    return {
      status: "warn",
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkBalanceApiFormat(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    // Use a test address (0x0) - will return default balance
    const res = await fetch(
      `${baseUrl}/api/balance?address=0x0000000000000000000000000000000000000001&source=redis`,
      { signal: AbortSignal.timeout(5000), cache: "no-store" }
    );
    const latency = Date.now() - start;

    if (!res.ok) {
      return { status: "fail", latency, error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    const hasBalances = "balances" in data;
    const hasBalance = "balance" in data;

    return {
      status: hasBalances ? "ok" : "fail",
      latency,
      hasBalancesKey: hasBalances,
      hasBalanceKey: hasBalance,
      ...(!hasBalances && { error: "Response missing 'balances' key" }),
    };
  } catch (error: unknown) {
    return {
      status: "fail",
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkHtxApi(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const res = await fetch("https://api.huobi.pro/market/tickers", {
      signal: AbortSignal.timeout(5000),
    });
    const latency = Date.now() - start;

    if (!res.ok) {
      return { status: "fail", latency, error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    if (data.status !== "ok") {
      return { status: "fail", latency, error: "HTX API returned non-ok status" };
    }

    return { status: "ok", latency, tickerCount: data.data?.length || 0 };
  } catch (error: unknown) {
    return {
      status: "fail",
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : "Timeout or network error",
    };
  }
}

async function checkGoldApi(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const redis = getRedis();
    const cached = await redis.get("metal:prices:cache");
    const stale = await redis.get("metal:prices:stale");
    const source = cached || stale;
    const latency = Date.now() - start;

    if (!source) {
      return { status: "fail", latency, error: "No cached metal prices in Redis" };
    }

    const data = typeof source === "string" ? JSON.parse(source) : source;
    if (!data.gold || data.gold <= 0) {
      return { status: "fail", latency, error: "Invalid cached gold price" };
    }

    const ageMs = data.timestamp ? Date.now() - new Date(data.timestamp).getTime() : 0;
    const ageMin = Math.round(ageMs / 60000);
    const isFresh = ageMin < 30;

    return {
      status: isFresh ? "ok" : "warn",
      latency,
      goldPriceOz: data.gold,
      goldPriceGram: +(data.gold / 31.1035).toFixed(2),
      cacheAge: `${ageMin} minutes`,
      source: cached ? "cache" : "stale",
    };
  } catch (error: unknown) {
    return {
      status: "fail",
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================
// MAIN HANDLER
// ============================================

export async function GET() {
  const startTime = Date.now();

  try {
    // Run all checks in parallel for speed
    const [
      redis,
      metalPrices,
      cryptoPrices,
      marketStatus,
      depositScanner,
      exchangeRoute,
      balanceApiFormat,
      htxApi,
      goldApi,
    ] = await Promise.all([
      checkRedis(),
      checkMetalPrices(),
      checkCryptoPrices(),
      checkMarketStatus(),
      checkDepositScanner(),
      checkExchangeRoute(),
      checkBalanceApiFormat(),
      checkHtxApi(),
      checkGoldApi(),
    ]);

    const checks: Record<string, CheckResult> = {
      redis,
      metalPrices,
      cryptoPrices,
      marketStatus,
      depositScanner,
      exchangeRoute,
      balanceApiFormat,
      htxApi,
      goldApi,
    };

    // Collect errors
    const errors: string[] = [];
    let failCount = 0;
    let warnCount = 0;

    for (const [name, check] of Object.entries(checks)) {
      if (check.status === "fail") {
        failCount++;
        errors.push(`${name}: ${check.error || "failed"}`);
      } else if (check.status === "warn") {
        warnCount++;
      }
    }

    // Determine overall status
    // Critical services: redis, metalPrices, cryptoPrices
    const criticalFailed =
      redis.status === "fail" ||
      metalPrices.status === "fail" ||
      cryptoPrices.status === "fail";

    let status: "healthy" | "degraded" | "unhealthy";
    if (criticalFailed || failCount >= 3) {
      status = "unhealthy";
    } else if (failCount > 0 || warnCount > 0) {
      status = "degraded";
    } else {
      status = "healthy";
    }

    const response: HealthResponse = {
      status,
      timestamp: new Date().toISOString(),
      checks,
      errors,
      latencyMs: Date.now() - startTime,
    };

    return NextResponse.json(response, {
      status: status === "unhealthy" ? 503 : 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        checks: {},
        errors: [error instanceof Error ? error.message : "Health check failed"],
        latencyMs: Date.now() - startTime,
      },
      { status: 503 }
    );
  }
}
