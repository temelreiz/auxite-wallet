// src/lib/auxr-role-watch.ts
//
// Watches who is allowed to mint AUXR.
//
// After the hot wallet's role is revoked, exactly one address holds
// MINTER_ROLE: the admin Safe. That is a state, not a guarantee. AUXR uses
// plain OpenZeppelin AccessControl, so DEFAULT_ADMIN_ROLE can grant minting to
// any address at any time, and the contract has no notion of "one minter
// only". Making that structural would mean either renouncing the admin role —
// after which a lost Safe means AUXR can never be minted again — or deploying
// a token whose minter is immutable, which means migrating the token. Both
// cost more than the problem.
//
// So it is watched instead. AUXR is not AccessControlEnumerable, so the set of
// role holders cannot be read from the chain; it can only be reconstructed
// from RoleGranted and RoleRevoked events. This scans those events and says
// something whenever anyone other than the Safe is given the ability to mint.
//
// The point is not that a grant is necessarily wrong — key rotation is a real
// thing. The point is that it should never happen without someone noticing,
// because "the web app cannot mint" is the control the rest of the design
// rests on, and one grantRole puts it back.

import { getRedis } from "@/lib/redis";
import { AUXR_CONTRACT_ADDRESS, publicClient } from "@/lib/auxr-onchain";
import type { Address } from "viem";

const WATERMARK = "auxr:rolewatch:lastBlock";
const MAX_BLOCKS_PER_RUN = 3_000n;

/** keccak256("MINTER_ROLE"). */
const MINTER_ROLE = "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6";

/** The only address that should hold it. Lowercased for comparison. */
export const EXPECTED_MINTER = "0xedc9163c5f8a2a76bd1cdda6baa4eb576b481070";

const ROLE_EVENTS = [
  {
    type: "event",
    name: "RoleGranted",
    inputs: [
      { name: "role", type: "bytes32", indexed: true },
      { name: "account", type: "address", indexed: true },
      { name: "sender", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "RoleRevoked",
    inputs: [
      { name: "role", type: "bytes32", indexed: true },
      { name: "account", type: "address", indexed: true },
      { name: "sender", type: "address", indexed: true },
    ],
  },
] as const;

export interface RoleChange {
  kind: "granted" | "revoked";
  account: string;
  sender: string;
  txHash: string;
  blockNumber: number;
  /** A grant to anything other than the Safe. The case worth waking up for. */
  unexpected: boolean;
}

/**
 * Scans the blocks since the last run for MINTER_ROLE grants and revocations.
 *
 * Starts at the head on first run. The current holders are known and written
 * down; what this exists to catch is the next change, and backfilling history
 * would spend the getLogs budget restating it.
 */
export async function scanRoleChanges(): Promise<{
  changes: RoleChange[];
  scannedFrom: number;
  scannedTo: number;
}> {
  const redis = getRedis();
  const client = publicClient();

  const head = await client.getBlockNumber();
  const storedRaw = await redis.get(WATERMARK);
  const stored = storedRaw != null ? BigInt(String(storedRaw)) : null;

  if (stored == null) {
    await redis.set(WATERMARK, head.toString());
    return { changes: [], scannedFrom: Number(head), scannedTo: Number(head) };
  }

  const fromBlock = stored + 1n;
  if (fromBlock > head) {
    return { changes: [], scannedFrom: Number(fromBlock), scannedTo: Number(head) };
  }
  const toBlock = head - fromBlock > MAX_BLOCKS_PER_RUN ? fromBlock + MAX_BLOCKS_PER_RUN : head;

  const changes: RoleChange[] = [];

  for (const event of ROLE_EVENTS) {
    const logs = await client.getLogs({
      address: AUXR_CONTRACT_ADDRESS,
      fromBlock,
      toBlock,
      event,
      // Filtered on the indexed role, so only minting is reported. A grant of
      // PAUSER_ROLE is a different conversation and does not belong in an
      // alert about who can create tokens.
      args: { role: MINTER_ROLE as `0x${string}` },
    });

    for (const log of logs as any[]) {
      const account = String(log.args.account).toLowerCase();
      changes.push({
        kind: event.name === "RoleGranted" ? "granted" : "revoked",
        account,
        sender: String(log.args.sender).toLowerCase(),
        txHash: String(log.transactionHash),
        blockNumber: Number(log.blockNumber),
        unexpected: event.name === "RoleGranted" && account !== EXPECTED_MINTER,
      });
    }
  }

  await redis.set(WATERMARK, toBlock.toString());
  changes.sort((a, b) => a.blockNumber - b.blockNumber);

  return { changes, scannedFrom: Number(fromBlock), scannedTo: Number(toBlock) };
}
