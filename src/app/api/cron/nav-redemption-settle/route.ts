// ============================================================================
// /api/cron/nav-redemption-settle — settle queued NAV-redemption orders.
//
// Drains redeem:nav:queue (created by /api/redeem/nav). For each pending order:
//   1. debit the user's custodial metal balance by the redeemed grams, then
//   2. pay the stablecoin (USDC/USDT) at NAV to payoutAddress.
// If the payout fails, the metal debit is refunded so the user never loses
// value. This is the ONLY step that moves funds; it runs under the authorized
// treasury payout path (processWithdraw / hot wallet).
//
// Scope: custodial balances. On-chain self-custody holders deposit back to
// Auxite first (same model as AUXR), then redeem — this worker does not burn
// self-custodied tokens.
//
// Auth:  CRON_SECRET (Bearer).
// Safety: dry-run by default. Set NAV_SETTLE_EXECUTE=true to move funds.
//         Idempotent: only `pending_settlement` orders are processed; an order
//         is locked to `settling` before payout.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { getUserBalance, incrementBalance } from "@/lib/redis";
import { processWithdraw } from "@/lib/blockchain-service";
import { checkTradingAllowed } from "@/lib/trading-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const QUEUE_KEY = "redeem:nav:queue";
const orderKey = (id: string) => `redeem:nav:order:${id}`;
const MAX_BATCH = 25;

interface NavOrder {
  orderId: string;
  status: string;
  address: string;
  payoutAddress: string;
  metal: string; // AUXG...
  grams: number;
  stablecoin: string; // USDC | USDT
  quote: { stablecoinOut: number };
}

async function loadOrder(id: string): Promise<NavOrder | null> {
  const raw = await redis.get(orderKey(id));
  if (!raw) return null;
  return typeof raw === "string" ? JSON.parse(raw) : (raw as NavOrder);
}

async function saveOrder(o: NavOrder & Record<string, unknown>): Promise<void> {
  await redis.set(orderKey(o.orderId), JSON.stringify(o));
}

async function handle(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  }

  const execute = process.env.NAV_SETTLE_EXECUTE === "true";

  // Kill switch — same guard as metal trading.
  const trading = await checkTradingAllowed("metalTrading");
  if (!trading.allowed) {
    return NextResponse.json({ success: false, error: "trading_disabled", message: trading.message }, { status: 403 });
  }

  const ids = ((await redis.lrange(QUEUE_KEY, 0, MAX_BATCH - 1)) as string[]) || [];
  const results: any[] = [];

  for (const id of ids) {
    const order = await loadOrder(id);
    if (!order) {
      await redis.lrem(QUEUE_KEY, 0, id); // orphan id, drop it
      results.push({ id, action: "dropped_missing" });
      continue;
    }
    if (order.status !== "pending_settlement") {
      await redis.lrem(QUEUE_KEY, 0, id); // already handled
      results.push({ id, action: "skipped", status: order.status });
      continue;
    }

    const metalLower = order.metal.toLowerCase();
    const stableOut = order.quote.stablecoinOut;

    // Balance check (fail closed).
    const bal = await getUserBalance(order.address);
    const have = parseFloat(String((bal as any)[metalLower] || 0));
    if (have < order.grams) {
      await saveOrder({ ...order, status: "failed", failReason: "insufficient_balance" });
      await redis.lrem(QUEUE_KEY, 0, id);
      results.push({ id, action: "failed", reason: "insufficient_balance" });
      continue;
    }

    if (!execute) {
      results.push({
        id,
        action: "dry-run",
        burn: { metal: order.metal, grams: order.grams },
        pay: { coin: order.stablecoin, amount: stableOut, to: order.payoutAddress },
      });
      continue;
    }

    // Lock to prevent double-processing if a second run overlaps.
    await saveOrder({ ...order, status: "settling", settleStartedAt: Date.now() });

    // 1. Debit the metal.
    const debited = await incrementBalance(order.address, { [metalLower]: -order.grams } as any);
    if (!debited) {
      await saveOrder({ ...order, status: "failed", failReason: "debit_failed" });
      await redis.lrem(QUEUE_KEY, 0, id);
      results.push({ id, action: "failed", reason: "debit_failed" });
      continue;
    }

    // 2. Pay the stablecoin (Base USDC/USDT) via the treasury payout path.
    try {
      const payout = await processWithdraw(order.stablecoin, order.payoutAddress, stableOut, undefined, "base");
      if (!payout.success) throw new Error(payout.error || "payout_failed");

      await saveOrder({
        ...order,
        status: "settled",
        txHash: (payout as any).txHash,
        settledAt: Date.now(),
      });
      await redis.lrem(QUEUE_KEY, 0, id);
      results.push({ id, action: "settled", txHash: (payout as any).txHash });
    } catch (e: any) {
      // Refund the metal so the user never loses value on a failed payout.
      await incrementBalance(order.address, { [metalLower]: order.grams } as any);
      await saveOrder({ ...order, status: "failed", failReason: e?.message || "payout_failed" });
      await redis.lrem(QUEUE_KEY, 0, id);
      results.push({ id, action: "failed", reason: e?.message || "payout_failed" });
    }
  }

  return NextResponse.json({
    success: true,
    mode: execute ? "executed" : "dry-run",
    processed: results.length,
    results,
  });
}

export async function GET(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}
