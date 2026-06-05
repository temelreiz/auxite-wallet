// ============================================================================
// AUXR ON-CHAIN CALLER
// ----------------------------------------------------------------------------
// Thin viem wrapper around the deployed AUXR ERC-20 contract. Used by the
// bridge layer (`auxr-bridge.ts`) to mirror off-chain mint/burn events onto
// Base, and by the deposit scanner to read on-chain Transfer events.
//
// Network selection: AUXR_CHAIN env var picks `base` (mainnet) or
// `baseSepolia` (testnet). Each network has its own contract address loaded
// from env so the same code runs in both environments.
//
// Required env vars (production):
//   AUXR_CHAIN                "base" | "baseSepolia"   (default: baseSepolia)
//   AUXR_CONTRACT_ADDRESS     0x...                     The deployed AUXR
//   AUXR_DEPOSIT_ADDRESS      0x...                     Where users send AUXR
//                                                       to deposit back to
//                                                       Auxite. Must have a
//                                                       known private key
//                                                       loaded as
//                                                       AUXR_DEPOSIT_PK so
//                                                       deposits can be burned.
//   AUXR_MINTER_PRIVATE_KEY   0x...                     Holds MINTER_ROLE on
//                                                       the contract. Used to
//                                                       mint when users
//                                                       withdraw to chain.
//                                                       In production this
//                                                       should be replaced by
//                                                       a KMS-backed signer.
//   AUXR_DEPOSIT_PRIVATE_KEY  0x...                     Used by the deposit
//                                                       scanner to call
//                                                       burnWithRef() on
//                                                       received tokens.
//                                                       (Same KMS rotation
//                                                       applies.)
//   BASE_RPC_URL / BASE_SEPOLIA_RPC                     RPC endpoints
// ============================================================================

import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  formatUnits,
  keccak256,
  toBytes,
  type Address,
  type Hash,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";

// ── ABI (minimal — only the surface we actually call) ────────────────────────

export const AUXR_ABI = [
  // Reads
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "paused",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "hasRole",
    stateMutability: "view",
    inputs: [
      { name: "role", type: "bytes32" },
      { name: "account", type: "address" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "MINTER_ROLE",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bytes32" }],
  },
  // Writes
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "refId", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "burnWithRef",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "refId", type: "bytes32" },
    ],
    outputs: [],
  },
  // Events
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "AuxrMinted",
    inputs: [
      { name: "to", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "refId", type: "bytes32", indexed: true },
    ],
  },
  {
    type: "event",
    name: "AuxrBurned",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "refId", type: "bytes32", indexed: true },
    ],
  },
] as const;

// ── Network / Config ─────────────────────────────────────────────────────────

const CHAIN_KEY = (process.env.AUXR_CHAIN || "baseSepolia") as
  | "base"
  | "baseSepolia";

export const AUXR_CHAIN = CHAIN_KEY === "base" ? base : baseSepolia;

export const AUXR_CONTRACT_ADDRESS = (process.env.AUXR_CONTRACT_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as Address;

export const AUXR_DEPOSIT_ADDRESS = (process.env.AUXR_DEPOSIT_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as Address;

const RPC_URL =
  CHAIN_KEY === "base"
    ? process.env.BASE_RPC_URL || "https://mainnet.base.org"
    : process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org";

const MINTER_PK = process.env.AUXR_MINTER_PRIVATE_KEY || "";
const DEPOSIT_PK = process.env.AUXR_DEPOSIT_PRIVATE_KEY || "";

// ── Clients (lazy) ───────────────────────────────────────────────────────────
//
// Note: viem's PublicClient/WalletClient generic types are intentionally not
// annotated here — viem infers a narrower client type when we omit the
// annotation, which avoids the strict authorizationList requirement that
// surfaces on the abstract PublicClient interface.

let _publicClient: ReturnType<typeof createPublicClient> | null = null;
let _minterClient: ReturnType<typeof createWalletClient> | null = null;
let _depositClient: ReturnType<typeof createWalletClient> | null = null;

export function publicClient() {
  if (!_publicClient) {
    _publicClient = createPublicClient({
      chain: AUXR_CHAIN,
      transport: http(RPC_URL),
    });
  }
  return _publicClient;
}

function minterClient() {
  if (!_minterClient) {
    if (!MINTER_PK || MINTER_PK.length < 64) {
      throw new Error("AUXR: AUXR_MINTER_PRIVATE_KEY not set");
    }
    const account = privateKeyToAccount(
      (MINTER_PK.startsWith("0x") ? MINTER_PK : `0x${MINTER_PK}`) as Hash
    );
    _minterClient = createWalletClient({
      account,
      chain: AUXR_CHAIN,
      transport: http(RPC_URL),
    });
  }
  return _minterClient;
}

function depositClient() {
  if (!_depositClient) {
    if (!DEPOSIT_PK || DEPOSIT_PK.length < 64) {
      throw new Error("AUXR: AUXR_DEPOSIT_PRIVATE_KEY not set");
    }
    const account = privateKeyToAccount(
      (DEPOSIT_PK.startsWith("0x") ? DEPOSIT_PK : `0x${DEPOSIT_PK}`) as Hash
    );
    _depositClient = createWalletClient({
      account,
      chain: AUXR_CHAIN,
      transport: http(RPC_URL),
    });
  }
  return _depositClient;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convert a human-readable AUXR amount (e.g. 1.5) to wei (18 decimals). */
export function auxrToWei(amount: number): bigint {
  return parseUnits(amount.toFixed(18), 18);
}

/** Convert wei back to a JS number. NOTE: precision loss above ~1e15 wei. */
export function weiToAuxr(wei: bigint): number {
  return Number(formatUnits(wei, 18));
}

/**
 * Hash an arbitrary off-chain reference id into bytes32 for event indexing.
 * Same string input always produces the same bytes32 — idempotency relies on
 * this stability.
 */
export function refIdToBytes32(refId: string): Hash {
  return keccak256(toBytes(refId));
}

// ── Read functions ───────────────────────────────────────────────────────────

export async function getOnChainBalance(address: Address): Promise<bigint> {
  return publicClient().readContract({
    address: AUXR_CONTRACT_ADDRESS,
    abi: AUXR_ABI,
    functionName: "balanceOf",
    args: [address],
  });
}

export async function getOnChainTotalSupply(): Promise<bigint> {
  return publicClient().readContract({
    address: AUXR_CONTRACT_ADDRESS,
    abi: AUXR_ABI,
    functionName: "totalSupply",
  });
}

export async function isPaused(): Promise<boolean> {
  return publicClient().readContract({
    address: AUXR_CONTRACT_ADDRESS,
    abi: AUXR_ABI,
    functionName: "paused",
  });
}

export async function isMinter(address: Address): Promise<boolean> {
  const minterRole = await publicClient().readContract({
    address: AUXR_CONTRACT_ADDRESS,
    abi: AUXR_ABI,
    functionName: "MINTER_ROLE",
  });
  return publicClient().readContract({
    address: AUXR_CONTRACT_ADDRESS,
    abi: AUXR_ABI,
    functionName: "hasRole",
    args: [minterRole, address],
  });
}

// ── Write functions ──────────────────────────────────────────────────────────

/**
 * Mint AUXR on-chain to `to`. Caller must hold MINTER_ROLE. The refId is
 * stored on the event so the off-chain ledger can reconcile this mint to
 * the off-chain burn that triggered it.
 *
 * Throws on revert. Returns the mined tx hash.
 */
export async function mintOnChain(params: {
  to: Address;
  amount: bigint;
  refId: string;
}): Promise<Hash> {
  const wallet = minterClient();
  const account = wallet.account!;
  const refBytes32 = refIdToBytes32(params.refId);

  const { request } = await publicClient().simulateContract({
    account,
    address: AUXR_CONTRACT_ADDRESS,
    abi: AUXR_ABI,
    functionName: "mint",
    args: [params.to, params.amount, refBytes32],
  });

  const hash = await wallet.writeContract(request);
  await publicClient().waitForTransactionReceipt({ hash, confirmations: 1 });
  return hash;
}

/**
 * Burn AUXR sitting in the deposit address (called from the deposit-scanner
 * after a user has sent AUXR back to Auxite to redeem off-chain). Caller
 * must use the deposit address's private key. The refId ties back to the
 * detected Transfer event so off-chain reconciliation is unambiguous.
 */
export async function burnFromDeposit(params: {
  amount: bigint;
  refId: string;
}): Promise<Hash> {
  const wallet = depositClient();
  const account = wallet.account!;
  const refBytes32 = refIdToBytes32(params.refId);

  const { request } = await publicClient().simulateContract({
    account,
    address: AUXR_CONTRACT_ADDRESS,
    abi: AUXR_ABI,
    functionName: "burnWithRef",
    args: [params.amount, refBytes32],
  });

  const hash = await wallet.writeContract(request);
  await publicClient().waitForTransactionReceipt({ hash, confirmations: 1 });
  return hash;
}

// ── Event scanning ───────────────────────────────────────────────────────────

export interface OnChainTransferEvent {
  from: Address;
  to: Address;
  value: bigint;
  txHash: Hash;
  blockNumber: bigint;
  logIndex: number;
}

/**
 * Fetch Transfer events to the deposit address within a block range.
 * Used by the deposit scanner cron. Caller passes in the range so it can
 * incrementally crawl forward and persist `lastScannedBlock`.
 */
export async function fetchDepositsInRange(params: {
  fromBlock: bigint;
  toBlock: bigint | "latest";
}): Promise<OnChainTransferEvent[]> {
  // viem builds the topic filter from `event` + indexed `args`, so we just
  // declare the event shape and let it derive the right log query.
  const logs = await publicClient().getLogs({
    address: AUXR_CONTRACT_ADDRESS,
    fromBlock: params.fromBlock,
    toBlock: params.toBlock,
    event: {
      type: "event",
      name: "Transfer",
      inputs: [
        { name: "from", type: "address", indexed: true },
        { name: "to", type: "address", indexed: true },
        { name: "value", type: "uint256", indexed: false },
      ],
    },
    args: { to: AUXR_DEPOSIT_ADDRESS },
  });

  return logs.map((log) => ({
    from: log.args.from!,
    to: log.args.to!,
    value: log.args.value!,
    txHash: log.transactionHash!,
    blockNumber: log.blockNumber!,
    logIndex: log.logIndex!,
  }));
}

/** Current Base head block — used to bound scanner range. */
export async function latestBlockNumber(): Promise<bigint> {
  return publicClient().getBlockNumber();
}
