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

/** Blocks per run. A five-minute cron sees ~150 on Base; the cap covers a
 *  missed run or two without asking an RPC for a range it will refuse. */
const MAX_BLOCKS_PER_RUN = 3_000n;

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
export async function followTaint(): Promise<{
  movements: TaintMovement[];
  scannedFrom: number;
  scannedTo: number;
  watching: number;
}> {
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
    return { movements: [], scannedFrom: Number(head), scannedTo: Number(head), watching: watching.length };
  }

  const fromBlock = stored + 1n;
  if (fromBlock > head) {
    return { movements: [], scannedFrom: Number(fromBlock), scannedTo: Number(head), watching: watching.length };
  }
  const toBlock = head - fromBlock > MAX_BLOCKS_PER_RUN ? fromBlock + MAX_BLOCKS_PER_RUN : head;

  const logs = await client.getLogs({
    address: AUXR_CONTRACT_ADDRESS,
    fromBlock,
    toBlock,
    event: {
      type: "event",
      name: "Transfer",
      inputs: [
        { name: "from", type: "address", indexed: true },
        { name: "to", type: "address", indexed: true },
        { name: "value", type: "uint256", indexed: false },
      ],
    },
    // Indexed, so the node does the filtering — one query for the whole set
    // rather than one per address.
    args: { from: watching as Address[] },
  });

  const movements: TaintMovement[] = [];

  for (const log of logs as any[]) {
    const to = String(log.args.to).toLowerCase();
    const from = String(log.args.from).toLowerCase();

    // A burn is the one movement that is good news: those tokens are gone for
    // everybody, so it does not taint the zero address.
    if (to === "0x0000000000000000000000000000000000000000") continue;

    const newlyTainted = (await redis.sadd(TAINT_SET, to)) === 1;
    if (newlyTainted) {
      await redis.hset(TAINT_META, {
        [to]: `received from ${from.slice(0, 10)}… at block ${log.blockNumber}`,
      });
    }

    let toIsContract = false;
    try {
      const code = await client.getCode({ address: to as Address });
      toIsContract = !!code && code !== "0x";
    } catch {
      // Unknown is reported as not-a-contract rather than failing the scan; the
      // alert still names the destination, which is the part that matters.
    }

    movements.push({
      from,
      to,
      units: weiToAuxr(log.args.value as bigint),
      txHash: String(log.transactionHash),
      blockNumber: Number(log.blockNumber),
      toIsContract,
      newlyTainted,
    });
  }

  await redis.set(WATERMARK, toBlock.toString());

  return {
    movements,
    scannedFrom: Number(fromBlock),
    scannedTo: Number(toBlock),
    watching: watching.length,
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
