// src/lib/auxr-taint.ts
//
// Follows the AUXR taken in the October incidents as it moves.
//
// The first version of this watch held two hardcoded addresses, and within
// hours it was already out of date: 10 AUXR left 0x52Ef3BB0… for a fresh
// wallet, and the watch kept staring at the address the money had left. A
// fixed list cannot follow a chain of transfers, so the list has to grow by
// itself — anything that receives tainted AUXR becomes tainted.
//
// What this is for: nothing in the contract can claw these tokens back (no
// blacklist, no seize, and burnFrom needs the holder's allowance), so the only
// decision available is pause(), which stops every holder and the LBANK market
// along with the thief. That is worth doing when the tokens reach somewhere
// they can be sold, and not worth doing while they are shuffled between the
// thief's own wallets. Telling those two apart is this module's whole job, so
// it reports WHERE the money went and whether the destination is a contract —
// a DEX router or pool is the case where pause() stops being theoretical.
//
// Reading the destination needs logs, and public RPCs ration getLogs hard.
// Hence a watermark: each run scans only the blocks since the last one, which
// at a five-minute cadence is a couple of hundred blocks on Base.

import { getRedis } from "@/lib/redis";
import { AUXR_CONTRACT_ADDRESS, publicClient, weiToAuxr } from "@/lib/auxr-onchain";
import type { Address } from "viem";

const TAINT_SET = "auxr:taint:addresses";
const TAINT_META = "auxr:taint:meta";
const WATERMARK = "auxr:taint:lastBlock";
/** Addresses we have already reported gas on. Not a TTL dedupe: gas sitting
 *  on an address is a standing condition, and re-reporting it every half hour
 *  teaches the reader to ignore the alert that matters. */
const GAS_NOTIFIED = "auxr:taint:gasNotified";

// Free RPCs each refuse a different getLogs range, and the one configured in
// BASE_RPC_URL refused ours silently for six days — the scan threw, the error
// was swallowed upstream, the watermark never advanced and nothing said so.
// So: several endpoints, a range each will actually accept, and a watermark
// that moves after every successful chunk rather than only at the end.
const RPC_ENDPOINTS: { url: string; maxRange: bigint }[] = [
  ...(process.env.BASE_RPC_URL ? [{ url: process.env.BASE_RPC_URL, maxRange: 9_000n }] : []),
  { url: "https://base.drpc.org", maxRange: 9_000n },
  { url: "https://base-mainnet.public.blastapi.io", maxRange: 1_000n },
  { url: "https://mainnet.base.org", maxRange: 1_000n },
  { url: "https://1rpc.io/base", maxRange: 45n },
];

/** Work ceiling for one run. The route allows 30s; this leaves room for the
 *  rest of the checks and lets a backlog clear over several runs instead of
 *  timing out on every one of them. */
const MAX_BLOCKS_PER_RUN = 60_000n;

/** Lag past which the scan is considered broken rather than busy. Base makes
 *  ~43,200 blocks a day, so this is roughly half a day behind. */
export const STALE_BLOCKS = 20_000n;

/** Where it started. Seeded on first run and never removed, so the origin of
 *  the trail stays legible after the money has moved on. */
const SEED: { address: string; label: string }[] = [
  {
    address: "0xd3f276f6932839a32cb0999673af168fde4f5643",
    label: "LBANK deposit (10-11 Oct theft)",
  },
  {
    address: "0x52Ef3BB09c75F507b683ED3cFA912bfF7ec6248f",
    label: "first destination (19-20 Oct theft)",
  },
  {
    // The scan starts at the head on first run, so the transfer that proved
    // this watch was needed happened before the watch could see it. Seeded by
    // hand rather than backfilled: the history is known, and spending the
    // getLogs budget to rediscover it would buy nothing.
    address: "0x9E06B94250aD054d7690B124B6f6173EedF90a1A",
    label: "10 AUXR test transfer from 0x52Ef3BB0, 23:54 on 19 Oct",
  },
];

export interface TaintMovement {
  from: string;
  to: string;
  units: number;
  txHash: string;
  blockNumber: number;
  /** The destination runs code. A transfer into a contract is a swap, a bridge
   *  or a deposit — the cases where the tokens stop being inert. */
  toIsContract: boolean;
  /** First time we have seen this destination. */
  newlyTainted: boolean;
}

async function seedIfEmpty(): Promise<void> {
  const redis = getRedis();
  if ((await redis.scard(TAINT_SET)) > 0) return;
  for (const s of SEED) {
    await redis.sadd(TAINT_SET, s.address.toLowerCase());
    await redis.hset(TAINT_META, { [s.address.toLowerCase()]: s.label });
  }
}

export async function taintedAddresses(): Promise<string[]> {
  await seedIfEmpty();
  return ((await getRedis().smembers(TAINT_SET)) || []) as string[];
}

export async function taintLabel(address: string): Promise<string> {
  const v = await getRedis().hget(TAINT_META, address.toLowerCase());
  return typeof v === "string" ? v : "tainted";
}

/**
 * Scans the blocks since the last run for AUXR leaving any tainted address,
 * adds every destination to the set, and returns what moved.
 *
 * The watermark advances even when a scan finds nothing, and is clamped to the
 * head on first run so a fresh deployment does not try to read the whole chain.
 */
export interface TaintScanResult {
  movements: TaintMovement[];
  scannedFrom: number;
  scannedTo: number;
  watching: number;
  /** How far behind the chain head the scan still is. */
  lagBlocks: number;
  /** Set when every endpoint refused. The watchdog alerts on this rather than
   *  letting it pass as a quiet run, which is how six days went by. */
  error: string | null;
}

/** One getLogs call, tried across endpoints until one answers. */
async function getLogsAnywhere(
  fromBlock: bigint,
  toBlock: bigint,
  watching: string[],
): Promise<{ logs: any[]; url: string } | { error: string }> {
  const topic0 = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
  const pad = (a: string) => "0x" + a.slice(2).toLowerCase().padStart(64, "0");
  const errors: string[] = [];

  for (const { url } of RPC_ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_getLogs",
          params: [
            {
              address: AUXR_CONTRACT_ADDRESS,
              fromBlock: "0x" + fromBlock.toString(16),
              toBlock: "0x" + toBlock.toString(16),
              // Topic 1 as an array is an OR across senders, so the node does
              // the filtering and one call covers the whole set.
              topics: [topic0, watching.map(pad)],
            },
          ],
        }),
        signal: AbortSignal.timeout(8000),
      });
      const json = await res.json();
      if (json?.error) {
        errors.push(`${url}: ${json.error.message}`);
        continue;
      }
      return { logs: json.result || [], url };
    } catch (e: any) {
      errors.push(`${url}: ${String(e?.message || e).slice(0, 60)}`);
    }
  }
  return { error: errors.join(" | ") };
}

/**
 * Scans the blocks since the last run for AUXR leaving any tainted address,
 * adds every destination to the set, and returns what moved.
 *
 * Scans in chunks and saves the watermark after each one, so a run that is
 * cut short keeps the ground it gained. A backlog therefore clears over
 * several runs instead of failing whole every time.
 */
export async function followTaint(): Promise<TaintScanResult> {
  const redis = getRedis();
  const client = publicClient();
  const watching = await taintedAddresses();

  const head = await client.getBlockNumber();
  const storedRaw = await redis.get(WATERMARK);
  const stored = storedRaw != null ? BigInt(String(storedRaw)) : null;

  // First run starts at the head: the history is already known and written up,
  // and backfilling it would spend the getLogs budget re-reporting it.
  if (stored == null) {
    await redis.set(WATERMARK, head.toString());
    return {
      movements: [], scannedFrom: Number(head), scannedTo: Number(head),
      watching: watching.length, lagBlocks: 0, error: null,
    };
  }

  const startBlock = stored + 1n;
  if (startBlock > head) {
    return {
      movements: [], scannedFrom: Number(startBlock), scannedTo: Number(head),
      watching: watching.length, lagBlocks: 0, error: null,
    };
  }

  const ceiling = head - startBlock > MAX_BLOCKS_PER_RUN ? startBlock + MAX_BLOCKS_PER_RUN : head;
  const movements: TaintMovement[] = [];
  let cursor = startBlock;
  let error: string | null = null;
  const chunk = RPC_ENDPOINTS[0]?.maxRange ?? 1_000n;

  while (cursor <= ceiling) {
    const to = cursor + chunk - 1n > ceiling ? ceiling : cursor + chunk - 1n;
    const result = await getLogsAnywhere(cursor, to, watching);

    if ("error" in result) {
      // Stop here and keep what we have. The watermark already reflects the
      // chunks that worked, so the next run resumes rather than restarts.
      error = result.error;
      break;
    }

    for (const log of result.logs) {
      const from = ("0x" + log.topics[1].slice(26)).toLowerCase();
      const to_ = ("0x" + log.topics[2].slice(26)).toLowerCase();

      // A burn is the one movement that is good news: those tokens are gone
      // for everybody, so it does not taint the zero address.
      if (to_ === "0x0000000000000000000000000000000000000000") continue;

      const newlyTainted = (await redis.sadd(TAINT_SET, to_)) === 1;
      if (newlyTainted) {
        await redis.hset(TAINT_META, {
          [to_]: `received from ${from.slice(0, 10)}… at block ${parseInt(log.blockNumber, 16)}`,
        });
      }

      let toIsContract = false;
      try {
        const code = await client.getCode({ address: to_ as Address });
        toIsContract = !!code && code !== "0x";
      } catch {
        // Unknown is reported as not-a-contract rather than failing the scan;
        // the alert still names the destination, which is the part that matters.
      }

      movements.push({
        from,
        to: to_,
        units: weiToAuxr(BigInt(log.data)),
        txHash: String(log.transactionHash),
        blockNumber: parseInt(log.blockNumber, 16),
        toIsContract,
        newlyTainted,
      });
    }

    await redis.set(WATERMARK, to.toString());
    cursor = to + 1n;
  }

  const reached = cursor - 1n;
  return {
    movements,
    scannedFrom: Number(startBlock),
    scannedTo: Number(reached),
    watching: watching.length,
    lagBlocks: Number(head - reached),
    error,
  };
}

/** Current AUXR and gas held across the whole tainted set. */
export async function taintHoldings(): Promise<{
  address: string;
  label: string;
  units: number;
  gasEth: number;
}[]> {
  const client = publicClient();
  const out: { address: string; label: string; units: number; gasEth: number }[] = [];

  for (const a of await taintedAddresses()) {
    try {
      const [wei, gas] = await Promise.all([
        client.readContract({
          address: AUXR_CONTRACT_ADDRESS,
          abi: [
            {
              type: "function",
              name: "balanceOf",
              stateMutability: "view",
              inputs: [{ name: "account", type: "address" }],
              outputs: [{ type: "uint256" }],
            },
          ] as const,
          functionName: "balanceOf",
          args: [a as Address],
        }) as Promise<bigint>,
        client.getBalance({ address: a as Address }),
      ]);
      out.push({
        address: a,
        label: await taintLabel(a),
        units: weiToAuxr(wei),
        gasEth: Number(gas) / 1e18,
      });
    } catch {
      // One unreadable address must not hide the rest.
    }
  }

  return out.sort((x, y) => y.units - x.units);
}

/**
 * Whether the gas on this address is news.
 *
 * True once, when gas first appears. Stays false while it sits there, and
 * becomes true again only if the address is drained to zero and refunded —
 * which is a second preparation to move, and worth saying so.
 */
export async function claimGasAlert(address: string, gasEth: number): Promise<boolean> {
  const redis = getRedis();
  const a = address.toLowerCase();

  if (gasEth <= 0) {
    await redis.srem(GAS_NOTIFIED, a);
    return false;
  }
  return (await redis.sadd(GAS_NOTIFIED, a)) === 1;
}
