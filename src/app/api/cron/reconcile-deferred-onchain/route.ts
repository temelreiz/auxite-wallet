// src/app/api/cron/reconcile-deferred-onchain/route.ts
// Reconcile deferred on-chain sells when hot wallet has enough gas.
//
// When the trade route receives a sell with executeOnChain:false, it queues
// the metal burn into redis list "pending:onchain:sells". This cron drains
// that queue once the hot wallet has gas, executing each burn one at a time.
//
// Triggered by Vercel cron every 10 minutes. Safe to retry — uses BLPOP-like
// pop semantics with re-enqueue on failure.

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { sellMetalToken } from "@/lib/v6-token-service";
import { ethers } from "ethers";

const redis = Redis.fromEnv();
const SECRET = process.env.CRON_SECRET || "";

// Minimum ETH balance required to safely execute a sell tx (~3x typical gas)
const MIN_ETH_BALANCE = ethers.parseEther("0.002");
// Max ops to process per run (avoid timeout / runaway)
const MAX_OPS_PER_RUN = 20;

interface DeferredSell {
  kind: "metal_sell";
  address: string;
  fromToken: string;
  fromAmount: number;
  toAmount: number;
  queuedAt: number;
  retries?: number;
}

async function getHotWalletEthBalance(): Promise<bigint> {
  const addr = process.env.HOT_WALLET_ETH_ADDRESS;
  if (!addr) return 0n;
  const rpcUrl = process.env.BASE_RPC_URL || "https://mainnet.base.org";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  return await provider.getBalance(addr);
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get("Authorization");
  if (SECRET && auth !== `Bearer ${SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Pre-flight: hot wallet has gas?
  const balance = await getHotWalletEthBalance();
  if (balance < MIN_ETH_BALANCE) {
    return NextResponse.json({
      success: true,
      processed: 0,
      skipped_reason: "hot_wallet_low_balance",
      balanceWei: balance.toString(),
      minRequiredWei: MIN_ETH_BALANCE.toString(),
    });
  }

  const queueLen = await redis.llen("pending:onchain:sells");
  if (queueLen === 0) {
    return NextResponse.json({ success: true, processed: 0, queueLength: 0 });
  }

  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  const failures: { address: string; reason: string }[] = [];

  for (let i = 0; i < Math.min(queueLen, MAX_OPS_PER_RUN); i++) {
    // Pop oldest item (rpush + lpop = FIFO; we used lpush so pop with rpop)
    const raw = await redis.rpop("pending:onchain:sells");
    if (!raw) break;

    let op: DeferredSell;
    try {
      op = typeof raw === "string" ? JSON.parse(raw) : (raw as any);
    } catch (e) {
      failed++;
      failures.push({ address: "unknown", reason: "malformed queue item" });
      continue;
    }

    processed++;

    // Re-check balance — burn loop could exhaust gas
    const liveBalance = await getHotWalletEthBalance();
    if (liveBalance < MIN_ETH_BALANCE) {
      // Re-queue and bail — wait for next run
      await redis.lpush("pending:onchain:sells", JSON.stringify(op));
      return NextResponse.json({
        success: true,
        processed: processed - 1,
        succeeded,
        failed,
        bailed_reason: "gas_exhausted_mid_run",
        queueLength: await redis.llen("pending:onchain:sells"),
      });
    }

    try {
      const result = await sellMetalToken(op.fromToken, op.fromAmount, op.address);
      if (result.success) {
        succeeded++;
        // Audit log
        await redis.lpush("audit:reconciled-sells", JSON.stringify({
          ...op,
          reconciledAt: Date.now(),
          txHash: result.txHash,
        }));
        await redis.ltrim("audit:reconciled-sells", 0, 999);
      } else {
        failed++;
        const retries = (op.retries || 0) + 1;
        failures.push({ address: op.address, reason: result.error || "sellMetalToken returned !success" });
        // Re-queue up to 3 times, then move to dead-letter
        if (retries < 3) {
          await redis.lpush("pending:onchain:sells", JSON.stringify({ ...op, retries }));
        } else {
          await redis.lpush("dead-letter:onchain:sells", JSON.stringify({
            ...op,
            failedAt: Date.now(),
            lastError: result.error,
          }));
        }
      }
    } catch (e: any) {
      failed++;
      const retries = (op.retries || 0) + 1;
      failures.push({ address: op.address, reason: e?.message || String(e) });
      if (retries < 3) {
        await redis.lpush("pending:onchain:sells", JSON.stringify({ ...op, retries }));
      } else {
        await redis.lpush("dead-letter:onchain:sells", JSON.stringify({
          ...op,
          failedAt: Date.now(),
          lastError: e?.message,
        }));
      }
    }
  }

  await redis.lpush("cron:reconcile-deferred:log", JSON.stringify({
    timestamp: Date.now(),
    processed, succeeded, failed,
  }));
  await redis.ltrim("cron:reconcile-deferred:log", 0, 49);

  return NextResponse.json({
    success: true,
    processed,
    succeeded,
    failed,
    failures: failures.slice(0, 10),
    queueLength: await redis.llen("pending:onchain:sells"),
  });
}
