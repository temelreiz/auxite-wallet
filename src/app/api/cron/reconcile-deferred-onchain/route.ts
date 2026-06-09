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
import { sellMetalToken, buyMetalToken } from "@/lib/v6-token-service";
import { processWithdraw } from "@/lib/blockchain-service";
import { ethers } from "ethers";

const redis = Redis.fromEnv();
const SECRET = process.env.CRON_SECRET || "";

// Minimum ETH balance required to safely execute a sell tx.
// Single tx ~0.00068 ETH on Base; we keep 7x buffer to survive gas spikes
// and multi-op batches without mid-run exhaustion.
const MIN_ETH_BALANCE = ethers.parseEther("0.005");
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

  // ─────────────────────────────────────────────────────────────────
  // Drain pending on-chain BUYS (mints) from deferred conversions.
  // Each item: { kind:"metal_buy", address, toToken, toAmount, queuedAt, retries? }
  // ─────────────────────────────────────────────────────────────────
  const buyQueueLen = await redis.llen("pending:onchain:buys");
  let bProcessed = 0, bSucceeded = 0, bFailed = 0;
  const bFailures: { address?: string; reason: string }[] = [];

  for (let i = 0; i < Math.min(buyQueueLen, MAX_OPS_PER_RUN); i++) {
    const raw = await redis.rpop("pending:onchain:buys");
    if (!raw) break;

    let op: any;
    try {
      op = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      bFailed++;
      bFailures.push({ reason: "malformed queue item" });
      continue;
    }
    bProcessed++;

    // Re-check balance — mint loop could exhaust gas
    const liveBalance = await getHotWalletEthBalance();
    if (liveBalance < MIN_ETH_BALANCE) {
      await redis.lpush("pending:onchain:buys", JSON.stringify(op));
      break; // bail; next run picks up
    }

    try {
      const result = await buyMetalToken(op.toToken, op.toAmount, op.address);
      if (result.success) {
        bSucceeded++;
        await redis.lpush("audit:reconciled-buys", JSON.stringify({
          ...op, reconciledAt: Date.now(), txHash: result.txHash,
        }));
        await redis.ltrim("audit:reconciled-buys", 0, 999);
      } else {
        bFailed++;
        const retries = (op.retries || 0) + 1;
        bFailures.push({ address: op.address, reason: result.error || "buyMetalToken returned !success" });
        if (retries < 3) {
          await redis.lpush("pending:onchain:buys", JSON.stringify({ ...op, retries }));
        } else {
          await redis.lpush("dead-letter:onchain:buys", JSON.stringify({
            ...op, failedAt: Date.now(), lastError: result.error,
          }));
        }
      }
    } catch (e: any) {
      bFailed++;
      const retries = (op.retries || 0) + 1;
      bFailures.push({ address: op.address, reason: e?.message || String(e) });
      if (retries < 3) {
        await redis.lpush("pending:onchain:buys", JSON.stringify({ ...op, retries }));
      } else {
        await redis.lpush("dead-letter:onchain:buys", JSON.stringify({
          ...op, failedAt: Date.now(), lastError: e?.message,
        }));
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Also drain pending AUXM redemption withdrawals.
  // Each item: { txId, address, payoutAsset, payoutAmount, withdrawAddress, retries? }
  // ─────────────────────────────────────────────────────────────────
  const wQueueLen = await redis.llen("pending:onchain:withdraws");
  let wProcessed = 0, wSucceeded = 0, wFailed = 0;
  const wFailures: { txId?: string; reason: string }[] = [];

  for (let i = 0; i < Math.min(wQueueLen, MAX_OPS_PER_RUN); i++) {
    const raw = await redis.rpop("pending:onchain:withdraws");
    if (!raw) break;

    let op: any;
    try {
      op = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      wFailed++;
      wFailures.push({ reason: "malformed queue item" });
      continue;
    }
    wProcessed++;

    try {
      const result = await processWithdraw(op.payoutAsset, op.withdrawAddress, op.payoutAmount);
      if (result.success) {
        wSucceeded++;
        await redis.lpush("audit:reconciled-withdraws", JSON.stringify({
          ...op,
          reconciledAt: Date.now(),
          txHash: result.txHash,
        }));
        await redis.ltrim("audit:reconciled-withdraws", 0, 999);

        // Update user transaction record from "processing"/"queued" to "completed"
        if (op.address && op.txId) {
          try {
            const txKey = `user:${op.address}:transactions`;
            const txs = await redis.lrange(txKey, 0, 100);
            const updated = txs.map((t: any) => {
              const p = typeof t === "string" ? JSON.parse(t) : t;
              if (p.id === op.txId) {
                return JSON.stringify({ ...p, status: "completed", txHash: result.txHash, completedAt: Date.now() });
              }
              return typeof t === "string" ? t : JSON.stringify(t);
            });
            await redis.del(txKey);
            if (updated.length) await redis.rpush(txKey, ...updated.reverse());
          } catch (e) {
            console.warn("[reconcile] failed to update user tx record:", e);
          }
        }
      } else {
        wFailed++;
        const retries = (op.retries || 0) + 1;
        wFailures.push({ txId: op.txId, reason: result.error || "processWithdraw returned !success" });
        if (retries < 5) {
          await redis.lpush("pending:onchain:withdraws", JSON.stringify({ ...op, retries }));
        } else {
          await redis.lpush("dead-letter:onchain:withdraws", JSON.stringify({
            ...op, failedAt: Date.now(), lastError: result.error,
          }));
        }
      }
    } catch (e: any) {
      wFailed++;
      const retries = (op.retries || 0) + 1;
      wFailures.push({ txId: op.txId, reason: e?.message || String(e) });
      if (retries < 5) {
        await redis.lpush("pending:onchain:withdraws", JSON.stringify({ ...op, retries }));
      } else {
        await redis.lpush("dead-letter:onchain:withdraws", JSON.stringify({
          ...op, failedAt: Date.now(), lastError: e?.message,
        }));
      }
    }
  }

  await redis.lpush("cron:reconcile-deferred:log", JSON.stringify({
    timestamp: Date.now(),
    sells: { processed, succeeded, failed },
    buys: { processed: bProcessed, succeeded: bSucceeded, failed: bFailed },
    withdraws: { processed: wProcessed, succeeded: wSucceeded, failed: wFailed },
  }));
  await redis.ltrim("cron:reconcile-deferred:log", 0, 49);

  return NextResponse.json({
    success: true,
    sells: {
      processed, succeeded, failed,
      failures: failures.slice(0, 10),
      queueLength: await redis.llen("pending:onchain:sells"),
    },
    buys: {
      processed: bProcessed, succeeded: bSucceeded, failed: bFailed,
      failures: bFailures.slice(0, 10),
      queueLength: await redis.llen("pending:onchain:buys"),
    },
    withdraws: {
      processed: wProcessed, succeeded: wSucceeded, failed: wFailed,
      failures: wFailures.slice(0, 10),
      queueLength: await redis.llen("pending:onchain:withdraws"),
    },
  });
}
