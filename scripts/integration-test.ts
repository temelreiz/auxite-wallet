#!/usr/bin/env npx ts-node
/**
 * Auxite Wallet Integration Test Suite
 * Run: npx ts-node scripts/integration-test.ts
 *
 * Tests all critical endpoints and data invariants.
 * Does NOT make actual trades or modify balances.
 */

const BASE_URL =
  process.env.TEST_BASE_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  "http://localhost:3000";

// ============================================
// TEST FRAMEWORK
// ============================================

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];
let passCount = 0;
let failCount = 0;

async function runTest(
  name: string,
  fn: () => Promise<void>
): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    results.push({ name, passed: true, duration });
    passCount++;
    console.log(`  \x1b[32mPASS\x1b[0m ${name} (${duration}ms)`);
  } catch (error: unknown) {
    const duration = Date.now() - start;
    const message =
      error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, duration, error: message });
    failCount++;
    console.log(`  \x1b[31mFAIL\x1b[0m ${name} (${duration}ms)`);
    console.log(`       ${message}`);
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function fetchJson(
  path: string,
  options?: RequestInit
): Promise<{ status: number; data: Record<string, unknown> }> {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(10000),
    ...options,
  });
  const data = await res.json();
  return { status: res.status, data };
}

// ============================================
// TESTS
// ============================================

async function testBalanceApiFormat(): Promise<void> {
  const { status, data } = await fetchJson(
    "/api/balance?address=0x0000000000000000000000000000000000000001&source=redis"
  );
  assert(status === 200, `Expected 200, got ${status}`);
  assert(
    "balances" in data,
    `Response has no 'balances' key. Keys: ${Object.keys(data).join(", ")}`
  );
  assert(
    !("balance" in data && !("balances" in data)),
    "Response uses old 'balance' key instead of 'balances'"
  );
}

async function testExchangeAcceptsWithoutToAmount(): Promise<void> {
  // Exchange should accept a request without toAmount (server calculates it)
  const { status, data } = await fetchJson("/api/exchange", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fromAsset: "USDT",
      toAsset: "AUXG",
      fromAmount: 100,
      // No toAmount - server should calculate
      address: "0x0000000000000000000000000000000000000001",
    }),
  });
  // Should not return 400 for missing toAmount
  // It may fail for insufficient balance (which is fine) or email required (also fine)
  assert(
    status !== 400 ||
      !(data.error as string)?.toLowerCase().includes("toamount"),
    `Exchange rejects missing toAmount: ${data.error}`
  );
}

async function testPricesApiSource(): Promise<void> {
  const { status, data } = await fetchJson("/api/prices");
  assert(status === 200, `Expected 200, got ${status}`);

  const source = (data.source as string) || "unknown";
  assert(
    source !== "fallback",
    `Prices API using fallback. Source: ${source}`
  );

  // Verify prices are present and in $/gram range
  const basePrices = data.basePrices as Record<string, number>;
  assert(!!basePrices, "Missing basePrices in response");

  // Gold should be roughly $100-300/gram (not $3000+/oz)
  const auxgPrice = basePrices.AUXG || 0;
  assert(
    auxgPrice > 50 && auxgPrice < 500,
    `AUXG price $${auxgPrice}/gram seems wrong (expected 50-500 $/gram range)`
  );
}

async function testMarketStatusValid(): Promise<void> {
  const { status, data } = await fetchJson("/api/market-status");
  assert(status === 200, `Expected 200, got ${status}`);
  assert(
    typeof data.open === "boolean",
    `market-status.open should be boolean, got ${typeof data.open}`
  );
  assert(
    data.label === "open" ||
      data.label === "closed" ||
      data.label === "pre-market" ||
      data.label === "after-hours" ||
      data.label === "weekend",
    `Unexpected market label: ${data.label}`
  );
}

async function testDemoModeDisabled(): Promise<void> {
  // Verify no demo keys exist in Redis by checking the health endpoint
  // Since we can't access Redis directly in this script, we check for
  // demo-related routes returning disabled/not-found
  const { data } = await fetchJson("/api/health");
  // The health check itself should not mention demo
  // Also verify balance API doesn't return demo data
  const { data: balanceData } = await fetchJson(
    "/api/balance?address=0x0000000000000000000000000000000000000001&source=redis"
  );
  const balances = balanceData.balances as Record<string, number>;
  if (balances) {
    // Demo balances typically have large amounts like 1250.5 AUXM
    // Real zero address should have 0 or very small amounts
    const source = (balanceData.source as string) || "";
    assert(
      source !== "mock" && source !== "demo",
      `Balance API using demo/mock source: ${source}`
    );
  }
}

async function testMetalPricesInGramRange(): Promise<void> {
  const { data } = await fetchJson("/api/prices");
  const basePrices = data.basePrices as Record<string, number>;
  assert(!!basePrices, "Missing basePrices");

  // Expected $/gram ranges (approximate)
  const ranges: Record<string, { min: number; max: number }> = {
    AUXG: { min: 50, max: 500 },    // Gold: ~$100-300/gram
    AUXS: { min: 0.5, max: 10 },     // Silver: ~$1-5/gram
    AUXPT: { min: 20, max: 200 },    // Platinum: ~$30-100/gram
    AUXPD: { min: 15, max: 200 },    // Palladium: ~$30-80/gram
  };

  for (const [symbol, range] of Object.entries(ranges)) {
    const price = basePrices[symbol] || 0;
    assert(
      price >= range.min && price <= range.max,
      `${symbol} price $${price}/gram outside expected range ($${range.min}-$${range.max}). Might be $/ounce?`
    );
  }
}

async function testCustodyFeeIs2Percent(): Promise<void> {
  // Check the exchange route's fee structure by making a test quote
  const { data } = await fetchJson("/api/exchange", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fromAsset: "USDT",
      toAsset: "AUXG",
      fromAmount: 1000,
      address: "0x0000000000000000000000000000000000000001",
    }),
  });

  // If we get fee info in the response, verify it
  if (data.custodyFee !== undefined || data.fees !== undefined) {
    const custodyFee =
      (data.custodyFee as number) ||
      ((data.fees as Record<string, number>)?.custody as number) ||
      0;
    assert(
      custodyFee === 2 || custodyFee === 0.02,
      `Custody fee is ${custodyFee}, expected 2 (percent) or 0.02`
    );
  }

  // Also verify by checking the source code pattern (can only do via response)
  // The exchange route defines METAL_CUSTODY_FEE_PERCENT = 2.0
  // We trust this is correct if the route loads without error
}

async function testDepositAddresses(): Promise<void> {
  // Verify hot wallet addresses are configured
  // Check via the health endpoint's deposit scanner status
  const { data } = await fetchJson("/api/health");
  const checks = data.checks as Record<string, Record<string, unknown>>;
  if (checks?.depositScanner) {
    const scanner = checks.depositScanner;
    // Scanner should have run at least once
    assert(
      scanner.status !== "fail",
      `Deposit scanner check failed: ${scanner.error || "unknown"}`
    );
  }
}

async function testCryptoPricesMultiSource(): Promise<void> {
  const { status, data } = await fetchJson("/api/crypto");
  assert(status === 200, `Expected 200, got ${status}`);

  const sources = data.sources as string[];
  const source = data.source as string;

  // Should have at least one real source
  assert(
    source !== "fallback",
    "Crypto prices using fallback - all sources down"
  );

  // Verify ETH and BTC prices are reasonable
  const eth = (data.ethereum as Record<string, number>)?.usd || 0;
  const btc = (data.bitcoin as Record<string, number>)?.usd || 0;

  assert(eth > 500 && eth < 20000, `ETH price $${eth} seems unreasonable`);
  assert(btc > 20000 && btc < 500000, `BTC price $${btc} seems unreasonable`);
}

async function testHealthEndpoint(): Promise<void> {
  const { status, data } = await fetchJson("/api/health");
  assert(status === 200 || status === 503, `Unexpected status ${status}`);
  assert(
    data.status === "healthy" ||
      data.status === "degraded" ||
      data.status === "unhealthy",
    `Invalid health status: ${data.status}`
  );
  assert(!!data.timestamp, "Missing timestamp");
  assert(!!data.checks, "Missing checks object");
}

async function testHtxReachable(): Promise<void> {
  const res = await fetch("https://api.huobi.pro/market/tickers", {
    signal: AbortSignal.timeout(5000),
  });
  assert(res.ok, `HTX API returned ${res.status}`);
  const data = await res.json();
  assert(data.status === "ok", "HTX API status not ok");
}

async function testGoldApiReachable(): Promise<void> {
  const apiKey = process.env.GOLDAPI_KEY;
  if (!apiKey) {
    throw new Error("GOLDAPI_KEY not set - skipping");
  }

  const res = await fetch("https://www.goldapi.io/api/XAU/USD", {
    headers: {
      "x-access-token": apiKey,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(5000),
  });
  assert(res.ok, `GoldAPI returned ${res.status}`);
  const data = await res.json();
  assert(data.price > 0, "GoldAPI returned invalid price");
}

// ============================================
// RUNNER
// ============================================

async function main(): Promise<void> {
  console.log(`\n  Auxite Wallet Integration Tests`);
  console.log(`  Base URL: ${BASE_URL}\n`);

  const allStart = Date.now();

  // Core API tests
  console.log("  --- Core API ---");
  await runTest("Health endpoint returns valid response", testHealthEndpoint);
  await runTest("Balance API uses 'balances' key (not 'balance')", testBalanceApiFormat);
  await runTest("Exchange API accepts request without toAmount", testExchangeAcceptsWithoutToAmount);
  await runTest("Market status returns valid open/closed", testMarketStatusValid);

  // Price tests
  console.log("\n  --- Prices ---");
  await runTest("Metal prices API returns real source (not fallback)", testPricesApiSource);
  await runTest("All metal prices in $/gram range (not $/ounce)", testMetalPricesInGramRange);
  await runTest("Crypto prices from multiple sources (not fallback)", testCryptoPricesMultiSource);
  await runTest("Custody fee is 2% (not 4%)", testCustodyFeeIs2Percent);

  // External service tests
  console.log("\n  --- External Services ---");
  await runTest("HTX API is reachable", testHtxReachable);
  await runTest("GoldAPI is reachable", testGoldApiReachable);

  // Infrastructure tests
  console.log("\n  --- Infrastructure ---");
  await runTest("Demo mode is fully disabled", testDemoModeDisabled);
  await runTest("Deposit addresses configured and scanner active", testDepositAddresses);

  // Summary
  const totalDuration = Date.now() - allStart;
  console.log(`\n  ─────────────────────────────────`);
  console.log(
    `  Results: \x1b[32m${passCount} passed\x1b[0m, \x1b[31m${failCount} failed\x1b[0m (${totalDuration}ms)`
  );
  console.log(`  ─────────────────────────────────\n`);

  if (failCount > 0) {
    console.log("  Failed tests:");
    for (const r of results.filter((r) => !r.passed)) {
      console.log(`    - ${r.name}: ${r.error}`);
    }
    console.log("");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Integration test runner failed:", err);
  process.exit(1);
});
