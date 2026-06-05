// ============================================================================
// /api/cron/scan-auxr-deposits  — Vercel Cron (every minute)
// ----------------------------------------------------------------------------
// Watches AUXR ERC-20 Transfer events to the Auxite deposit address on Base.
// Each new transfer triggers `acknowledgeDepositFromChain()` which credits
// the depositing user's off-chain balance and burns the on-chain supply.
//
// State:
//   auxr:bridge:scanner:lastBlock   string  Highest block we've processed.
//                                            Next run starts from lastBlock+1.
//
// Safety:
//   - REORG_DEPTH confirmations of head before we treat a block as final.
//   - MAX_BLOCKS_PER_RUN cap so a single cron call can't make a massive
//     RPC request after a backfill gap (we just catch up the next minute).
//   - CRON_SECRET auth — required header to prevent public triggering.
//
// vercel.json wiring:
//   { "path": "/api/cron/scan-auxr-deposits", "schedule": "* * * * *" }
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import {
  fetchDepositsInRange,
  latestBlockNumber,
  AUXR_CONTRACT_ADDRESS,
  AUXR_DEPOSIT_ADDRESS,
} from "@/lib/auxr-onchain";
import { acknowledgeDepositFromChain } from "@/lib/auxr-bridge";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;
const SCANNER_KEY = "auxr:bridge:scanner:lastBlock";

/** Blocks behind chain head before we accept finality. Base is ~2s blocks. */
const REORG_DEPTH = 5n;

/** Max blocks scanned in a single cron tick. ~30 min @ Base block time. */
const MAX_BLOCKS_PER_RUN = 1000n;

/**
 * Initial starting block if the scanner has never run. Set this to the
 * deployment block of the AUXR contract once known; until then we start
 * from "current head − MAX_BLOCKS_PER_RUN" so the first run isn't a
 * full-chain crawl.
 */
const FALLBACK_START_OFFSET = 100n;

async function getLastScannedBlock(headBlock: bigint): Promise<bigint> {
  const raw = await redis.get(SCANNER_KEY);
  if (raw) return BigInt(String(raw));
  // First run: start near current head; backfill is opt-in via manual reset
  const start = headBlock > FALLBACK_START_OFFSET ? headBlock - FALLBACK_START_OFFSET : 0n;
  await redis.set(SCANNER_KEY, start.toString());
  return start;
}

async function setLastScannedBlock(block: bigint): Promise<void> {
  await redis.set(SCANNER_KEY, block.toString());
}

function authorized(request: NextRequest): boolean {
  if (!CRON_SECRET) return true; // Local/dev: skip auth
  const header = request.headers.get("authorization") || "";
  const expected = `Bearer ${CRON_SECRET}`;
  return header === expected;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  }

  if (
    AUXR_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000" ||
    AUXR_DEPOSIT_ADDRESS === "0x0000000000000000000000000000000000000000"
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "not_configured",
        details: "AUXR_CONTRACT_ADDRESS or AUXR_DEPOSIT_ADDRESS not set",
      },
      { status: 503 }
    );
  }

  let head: bigint;
  try {
    head = await latestBlockNumber();
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: "rpc_unavailable", details: String(e?.message || e) },
      { status: 503 }
    );
  }

  const safeHead = head > REORG_DEPTH ? head - REORG_DEPTH : 0n;
  const last = await getLastScannedBlock(head);

  if (safeHead <= last) {
    return NextResponse.json({
      success: true,
      scanned: 0,
      processed: 0,
      lastScanned: last.toString(),
      head: head.toString(),
      reason: "no new blocks",
    });
  }

  const fromBlock = last + 1n;
  const toBlockUncapped = safeHead;
  const toBlock =
    toBlockUncapped - fromBlock > MAX_BLOCKS_PER_RUN
      ? fromBlock + MAX_BLOCKS_PER_RUN
      : toBlockUncapped;

  let logs;
  try {
    logs = await fetchDepositsInRange({ fromBlock, toBlock });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: "logs_fetch_failed", details: String(e?.message || e) },
      { status: 503 }
    );
  }

  let processed = 0;
  const errors: Array<{ txHash: string; logIndex: number; error: string }> = [];

  for (const log of logs) {
    try {
      await acknowledgeDepositFromChain({
        txHash: log.txHash,
        logIndex: log.logIndex,
        fromAddress: log.from,
        amountWei: log.value,
      });
      processed++;
    } catch (e: any) {
      errors.push({
        txHash: log.txHash,
        logIndex: log.logIndex,
        error: String(e?.message || e),
      });
    }
  }

  // Advance the watermark even if some events failed — they're recorded with
  // refIds in the bridge state so a manual retry can pick them up. Blocking
  // here would freeze all subsequent deposits behind a single failure.
  await setLastScannedBlock(toBlock);

  return NextResponse.json({
    success: true,
    scanned: Number(toBlock - fromBlock + 1n),
    processed,
    eventCount: logs.length,
    errorCount: errors.length,
    errors: errors.slice(0, 20),
    lastScanned: toBlock.toString(),
    head: head.toString(),
  });
}
