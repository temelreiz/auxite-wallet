// ============================================================================
// AUXR BRIDGE — off-chain ↔ on-chain orchestrator
// ----------------------------------------------------------------------------
// Two flows:
//
//   WITHDRAW (off-chain → on-chain)
//     User has AUXR on the Auxite off-chain ledger and wants to move it to
//     their own wallet on Base (self-custody or CEX deposit).
//
//     Sequence:
//       1. Validate request (balance, paused, KYC, etc. — done by API layer)
//       2. Reserve a state entry keyed by `refId` (idempotency)
//       3. Debit the user's off-chain balance
//       4. Call recordBurn() in the AUXR reserve ledger
//       5. Mint on-chain to the destination wallet
//       6. Mark state `completed`
//
//     Failure recovery:
//       - Crash between steps 3-4 and step 5 → state is `off_chain_debited`,
//         on-chain still owes a mint. A retry with same refId can resume.
//       - If mint reverts (e.g. paused, role revoked), we leave state as
//         `failed_on_chain` and emit a SEV-1 op alert. Manual refund or
//         retry from ops dashboard.
//
//   DEPOSIT (on-chain → off-chain)
//     User sends AUXR from any wallet to AUXR_DEPOSIT_ADDRESS on Base. The
//     scanner picks up the Transfer event and calls
//     acknowledgeDepositFromChain():
//
//     Sequence:
//       1. Idempotency check on (txHash, logIndex)
//       2. Map `from` to a known Auxite user (or fall back to "unattributed")
//       3. Credit the user's off-chain auxr balance
//       4. Call recordMint() (offchain side) so reserves stay backed —
//          the on-chain burn that follows is the SUPPLY-reducer, not a
//          reserve change.
//       5. Burn the tokens from the deposit address (burnWithRef)
//       6. Mark state `completed`
//
// Idempotency:
//   - Withdraw: keyed by user-supplied refId (caller MUST be deterministic)
//   - Deposit:  keyed by `${txHash}:${logIndex}` (chain-derived, unique)
//
// Redis schema:
//   auxr:bridge:withdraw:{refId}            hash  { state, ... }
//   auxr:bridge:deposit:{txHash}:{logIndex} hash  { state, ... }
//   auxr:bridge:scanner:lastBlock           string bigint of last scanned block
//   auxr:bridge:alerts:log                  list  recent SEV alerts (op review)
// ============================================================================

import type { Address, Hash } from "viem";
import { redis } from "@/lib/redis";
import { incrementBalance, getUserBalance } from "@/lib/redis";
import { recordBurn, recordMint } from "@/lib/auxr-reserve";
import {
  auxrToWei,
  weiToAuxr,
  mintOnChain,
  burnFromDeposit,
  isPaused,
  AUXR_CONTRACT_ADDRESS,
  AUXR_DEPOSIT_ADDRESS,
} from "@/lib/auxr-onchain";

// ── Types ────────────────────────────────────────────────────────────────────

export type WithdrawState =
  | "pending"
  | "off_chain_debited"
  | "on_chain_minted"
  | "completed"
  | "failed_off_chain"
  | "failed_on_chain";

export type DepositState =
  | "seen"
  | "credited"
  | "burned"
  | "completed"
  | "skipped_unattributed";

export interface WithdrawRecord {
  refId: string;
  state: WithdrawState;
  walletAddressOffChain: string;
  destinationOnChain: Address;
  unitsAUXR: number;
  amountWei: string;
  mintTxHash?: Hash;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export interface DepositRecord {
  txHash: Hash;
  logIndex: number;
  state: DepositState;
  fromAddress: Address;
  attributedUserAddress?: string;
  unitsAUXR: number;
  amountWei: string;
  burnTxHash?: Hash;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

// ── Key helpers ──────────────────────────────────────────────────────────────

const KW = (refId: string) => `auxr:bridge:withdraw:${refId}`;
const KD = (txHash: string, logIndex: number) =>
  `auxr:bridge:deposit:${txHash}:${logIndex}`;
const KA = "auxr:bridge:alerts:log";

async function alert(severity: "WARN" | "ERROR" | "SEV1", message: string, ctx?: unknown) {
  const line = JSON.stringify({
    severity,
    message,
    ctx,
    timestamp: Date.now(),
  });
  console.error(`[auxr-bridge:${severity}]`, message, ctx ?? "");
  try {
    await redis.lpush(KA, line);
    await redis.ltrim(KA, 0, 999);
  } catch (e) {
    // alerts log failure is itself ignorable; main flow already errored
  }
}

// ── Withdraw (off-chain → on-chain) ──────────────────────────────────────────

/**
 * Move AUXR from the off-chain ledger onto Base. Caller (the API route)
 * is responsible for KYC, rate limit, and ensuring `refId` is stable
 * across retries.
 */
export async function withdrawToChain(params: {
  refId: string;
  walletAddressOffChain: string;
  destinationOnChain: Address;
  unitsAUXR: number;
  reason?: string;
}): Promise<WithdrawRecord> {
  const { refId, walletAddressOffChain, destinationOnChain, unitsAUXR } = params;

  if (!Number.isFinite(unitsAUXR) || unitsAUXR <= 0) {
    throw new Error(`auxr-bridge: invalid units ${unitsAUXR}`);
  }
  if (!destinationOnChain || destinationOnChain === "0x0000000000000000000000000000000000000000") {
    throw new Error("auxr-bridge: destination address required");
  }
  if (AUXR_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
    throw new Error("auxr-bridge: AUXR_CONTRACT_ADDRESS not configured");
  }

  // Idempotency check — if we've already completed this refId, return it.
  const existing = await readWithdraw(refId);
  if (existing && existing.state === "completed") return existing;

  if (await isPaused()) {
    throw new Error("auxr-bridge: AUXR contract is paused");
  }

  const now = Date.now();
  const amountWei = auxrToWei(unitsAUXR);

  let record: WithdrawRecord = existing || {
    refId,
    state: "pending",
    walletAddressOffChain: walletAddressOffChain.toLowerCase(),
    destinationOnChain,
    unitsAUXR,
    amountWei: amountWei.toString(),
    createdAt: now,
    updatedAt: now,
  };

  // Step 1: debit off-chain balance + record reserve burn (atomic-ish via
  // the same Redis call). Skip if a previous attempt already debited.
  if (record.state === "pending") {
    try {
      const balance = await getUserBalance(walletAddressOffChain);
      if (balance.auxr < unitsAUXR - 1e-9) {
        record.state = "failed_off_chain";
        record.error = `insufficient off-chain balance: have ${balance.auxr}, need ${unitsAUXR}`;
        record.updatedAt = Date.now();
        await writeWithdraw(record);
        throw new Error(record.error);
      }

      await incrementBalance(walletAddressOffChain, { auxr: -unitsAUXR });
      await recordBurn({
        unitsAUXR,
        refId: `bridge-withdraw:${refId}`,
        walletAddress: walletAddressOffChain,
        reason: params.reason || `withdraw to ${destinationOnChain}`,
      });

      record.state = "off_chain_debited";
      record.updatedAt = Date.now();
      await writeWithdraw(record);
    } catch (e: any) {
      if (record.state === "pending") {
        record.state = "failed_off_chain";
        record.error = String(e?.message || e);
        record.updatedAt = Date.now();
        await writeWithdraw(record);
      }
      throw e;
    }
  }

  // Step 2: mint on-chain. If this fails after off-chain debit, leave the
  // record in `failed_on_chain` so ops can either retry or refund the user.
  if (record.state === "off_chain_debited") {
    try {
      const txHash = await mintOnChain({
        to: destinationOnChain,
        amount: amountWei,
        refId,
      });
      record.state = "on_chain_minted";
      record.mintTxHash = txHash;
      record.updatedAt = Date.now();
      await writeWithdraw(record);
    } catch (e: any) {
      record.state = "failed_on_chain";
      record.error = String(e?.message || e);
      record.updatedAt = Date.now();
      await writeWithdraw(record);
      await alert(
        "SEV1",
        `Withdraw stuck: off-chain debited but on-chain mint failed`,
        { refId, walletAddressOffChain, destinationOnChain, unitsAUXR, error: record.error }
      );
      throw e;
    }
  }

  // Step 3: mark final
  if (record.state === "on_chain_minted") {
    record.state = "completed";
    record.updatedAt = Date.now();
    await writeWithdraw(record);
  }

  return record;
}

async function writeWithdraw(r: WithdrawRecord) {
  await redis.hset(KW(r.refId), { ...r });
}
async function readWithdraw(refId: string): Promise<WithdrawRecord | null> {
  const data = await redis.hgetall(KW(refId));
  if (!data || Object.keys(data).length === 0) return null;
  return {
    refId: String(data.refId),
    state: data.state as WithdrawState,
    walletAddressOffChain: String(data.walletAddressOffChain),
    destinationOnChain: String(data.destinationOnChain) as Address,
    unitsAUXR: parseFloat(String(data.unitsAUXR)),
    amountWei: String(data.amountWei),
    mintTxHash: data.mintTxHash ? (String(data.mintTxHash) as Hash) : undefined,
    error: data.error ? String(data.error) : undefined,
    createdAt: parseInt(String(data.createdAt)),
    updatedAt: parseInt(String(data.updatedAt)),
  };
}

// ── Deposit (on-chain → off-chain) ───────────────────────────────────────────

/**
 * Process a single Transfer-to-deposit-address event detected by the
 * scanner. Idempotent on (txHash, logIndex).
 */
export async function acknowledgeDepositFromChain(params: {
  txHash: Hash;
  logIndex: number;
  fromAddress: Address;
  amountWei: bigint;
}): Promise<DepositRecord> {
  const { txHash, logIndex, fromAddress, amountWei } = params;

  // Idempotency check — if we've already completed this Transfer, return it.
  const existing = await readDeposit(txHash, logIndex);
  if (existing && existing.state === "completed") return existing;
  if (existing && existing.state === "skipped_unattributed") return existing;

  const unitsAUXR = weiToAuxr(amountWei);
  const now = Date.now();

  let record: DepositRecord = existing || {
    txHash,
    logIndex,
    state: "seen",
    fromAddress,
    unitsAUXR,
    amountWei: amountWei.toString(),
    createdAt: now,
    updatedAt: now,
  };

  // Attribution: try to find the Auxite user that owns the depositing wallet.
  // Off-chain users are keyed by their PRIMARY wallet address — for now we
  // attribute deposits to whoever's wallet matches `fromAddress`. Future:
  // also accept memo-based attribution.
  if (record.state === "seen") {
    const attributed = await findUserByWallet(fromAddress);
    if (!attributed) {
      record.state = "skipped_unattributed";
      record.updatedAt = Date.now();
      await writeDeposit(record);
      await alert(
        "WARN",
        `AUXR deposit from unknown wallet (${fromAddress}) — held for manual review`,
        { txHash, amountWei: amountWei.toString() }
      );
      return record;
    }
    record.attributedUserAddress = attributed.toLowerCase();
  }

  // Step 1: credit off-chain balance + record reserve mint (so backing
  // invariant tracks the user's claim).
  if (record.state === "seen" && record.attributedUserAddress) {
    try {
      await incrementBalance(record.attributedUserAddress, { auxr: unitsAUXR });
      await recordMint({
        unitsAUXR,
        refId: `bridge-deposit:${txHash}:${logIndex}`,
        walletAddress: record.attributedUserAddress,
        reason: `on-chain deposit ${txHash} from ${fromAddress}`,
      });
      record.state = "credited";
      record.updatedAt = Date.now();
      await writeDeposit(record);
    } catch (e: any) {
      record.error = `credit failed: ${String(e?.message || e)}`;
      record.updatedAt = Date.now();
      await writeDeposit(record);
      await alert("ERROR", "Deposit credit failed", { record });
      throw e;
    }
  }

  // Step 2: burn the deposited tokens so on-chain totalSupply matches the
  // released off-chain supply. If burn fails, the user is still credited
  // (record.state=credited) — supply will be over-stated until ops retries.
  if (record.state === "credited") {
    try {
      const burnTx = await burnFromDeposit({
        amount: amountWei,
        refId: `deposit:${txHash}:${logIndex}`,
      });
      record.state = "burned";
      record.burnTxHash = burnTx;
      record.updatedAt = Date.now();
      await writeDeposit(record);
    } catch (e: any) {
      record.error = `burn failed: ${String(e?.message || e)}`;
      record.updatedAt = Date.now();
      await writeDeposit(record);
      await alert(
        "ERROR",
        `Deposit credited but burn failed — on-chain supply over-stated`,
        { record }
      );
      // Don't rethrow — user is credited, supply is fixable in next sweep.
    }
  }

  if (record.state === "burned") {
    record.state = "completed";
    record.updatedAt = Date.now();
    await writeDeposit(record);
  }

  return record;
}

async function writeDeposit(r: DepositRecord) {
  await redis.hset(KD(r.txHash, r.logIndex), { ...r });
}
async function readDeposit(
  txHash: Hash,
  logIndex: number
): Promise<DepositRecord | null> {
  const data = await redis.hgetall(KD(txHash, logIndex));
  if (!data || Object.keys(data).length === 0) return null;
  return {
    txHash: String(data.txHash) as Hash,
    logIndex: parseInt(String(data.logIndex)),
    state: data.state as DepositState,
    fromAddress: String(data.fromAddress) as Address,
    attributedUserAddress: data.attributedUserAddress
      ? String(data.attributedUserAddress)
      : undefined,
    unitsAUXR: parseFloat(String(data.unitsAUXR)),
    amountWei: String(data.amountWei),
    burnTxHash: data.burnTxHash ? (String(data.burnTxHash) as Hash) : undefined,
    error: data.error ? String(data.error) : undefined,
    createdAt: parseInt(String(data.createdAt)),
    updatedAt: parseInt(String(data.updatedAt)),
  };
}

/**
 * Resolve an EVM address to an Auxite user identifier (the lowercased
 * primary wallet address). Mirrors how the rest of the codebase identifies
 * users; returns null when no matching account exists.
 */
async function findUserByWallet(addr: Address): Promise<string | null> {
  const lower = addr.toLowerCase();

  // Direct wallet-keyed records: try the user:{addr}:meta hash first.
  const meta = await redis.hgetall(`user:${lower}:meta`);
  if (meta && Object.keys(meta).length > 0) return lower;

  // Address-index keyed lookups used elsewhere in the codebase
  const idA = await redis.get(`user:address:${lower}`);
  if (idA) {
    const u = await redis.hgetall(`user:${idA}`);
    if (u && (u.walletAddress || u.address)) {
      return String(u.walletAddress || u.address).toLowerCase();
    }
    return String(idA).toLowerCase();
  }

  const direct = await redis.hgetall(`auth:user:${lower}`);
  if (direct && Object.keys(direct).length > 0) return lower;

  return null;
}

// ── Read helpers for ops dashboard ───────────────────────────────────────────

export async function getWithdrawRecord(refId: string): Promise<WithdrawRecord | null> {
  return readWithdraw(refId);
}

export async function getDepositRecord(
  txHash: Hash,
  logIndex: number
): Promise<DepositRecord | null> {
  return readDeposit(txHash, logIndex);
}

export async function getRecentBridgeAlerts(limit = 100) {
  const raw = await redis.lrange(KA, 0, Math.max(0, Math.min(limit, 1000) - 1));
  return raw
    .map((s) => {
      try {
        return typeof s === "string" ? JSON.parse(s) : s;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

// ── Constants re-export for convenience ──────────────────────────────────────

export { AUXR_CONTRACT_ADDRESS, AUXR_DEPOSIT_ADDRESS };
