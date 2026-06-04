// ============================================================================
// RWA on-chain mint sync
// ----------------------------------------------------------------------------
// Daily reconciliation between our off-chain Redis ledger and the metal
// token contracts on Base. Goal: rwa.xyz's view of Total Supply / Holders
// reflects real AUM, not just the tiny on-chain footprint.
//
// What it does:
//   1. For each metal (AUXG/AUXS/AUXPT/AUXPD):
//        - Read `rwa:onchain:synced:{metal}` (last-synced gram total)
//        - Sum every user's off-chain balance + allocations (current claim)
//        - delta = current - lastSynced
//        - If delta > 0  → mint(treasury, delta) on Base
//          If delta < 0  → log only (we don't burn from treasury in v0)
//          If delta == 0 → nothing to do
//        - On success, write current as the new synced value
//
// Dry-run mode: if RWA_MINT_SYNC_DRYRUN=true (or no minter key configured),
// every "would mint" is logged but no transaction is sent. Lets us validate
// the deltas for a few days before flipping the live switch.
//
// Required env vars (production):
//   RWA_MINT_SYNC_TREASURY      0x… address that receives the mints. The
//                               same wallet across all 4 metals is fine.
//   RWA_MINT_SYNC_PRIVATE_KEY   0x…  Holds MINTER_ROLE on every metal
//                                    contract listed in ASSETS below. In
//                                    production this should be replaced with
//                                    a KMS-backed signer.
//   BASE_RPC_URL                Mainnet Base RPC. e.g.
//                               https://mainnet.base.org or your Alchemy URL
//   NEXT_PUBLIC_AUXG_ADDRESS    Already set in .env.local; we reuse it.
//   NEXT_PUBLIC_AUXS_ADDRESS    "
//   NEXT_PUBLIC_AUXPT_ADDRESS   "
//   NEXT_PUBLIC_AUXPD_ADDRESS   "
//
// Decimals: every Auxite metal token uses 3 decimals (1g = 1000 raw units).
// Verified against on-chain `decimals()` calls; do NOT change without
// double-checking.

import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const TOKEN_DECIMALS = 3;

interface AssetConfig {
  id: "AUXG" | "AUXS" | "AUXPT" | "AUXPD";
  /** Lowercase balance field on user:{addr}:balance hash. */
  balanceField: "auxg" | "auxs" | "auxpt" | "auxpd";
  /** Lowercase metal key used by allocation:user:* JSON entries. */
  metalKey: string;
  /** On-chain contract address on Base mainnet. */
  contractAddress: string;
}

// Production contract addresses on Base mainnet — these are the ones
// rwa.xyz indexes for Total Supply / Holders. They intentionally differ
// from NEXT_PUBLIC_AUX*_ADDRESS in .env.local, which point at older or
// staging contracts. Don't replace these with the env vars unless you've
// confirmed rwa.xyz is tracking the new address (their indexer is slow
// to retarget). Same fallback set used by blockchain-service.ts.
const ASSETS: AssetConfig[] = [
  { id: "AUXG",  balanceField: "auxg",  metalKey: "AUXG",  contractAddress: "0x390164702040b509a3d752243f92c2ac0318989d" },
  { id: "AUXS",  balanceField: "auxs",  metalKey: "AUXS",  contractAddress: "0x82f6eb8ba5c84c8fd395b25a7a40ade08f0868aa" },
  { id: "AUXPT", balanceField: "auxpt", metalKey: "AUXPT", contractAddress: "0x119de594170b68561b1761ae1246c5154f94705d" },
  { id: "AUXPD", balanceField: "auxpd", metalKey: "AUXPD", contractAddress: "0xe051b2603617277ab50c509f5a38c16056c1c908" },
];

export interface AssetDelta {
  id: string;
  contractAddress: string;
  currentClaimsGrams: number;
  lastSyncedGrams: number;
  deltaGrams: number;
  /** Will we attempt an on-chain mint this run? */
  willMint: boolean;
  /** Reason a mint was skipped, if any. */
  skipReason?: string;
}

export interface MintResult {
  id: string;
  delta: number;
  txHash?: string;
  ok: boolean;
  error?: string;
}

export interface SyncResult {
  dryRun: boolean;
  date: string;
  deltas: AssetDelta[];
  mints: MintResult[];
}

// ── Step 1: read total off-chain claims ───────────────────────────────────────

/**
 * Walks every user:{address}:balance hash plus their allocations and returns
 * a per-metal total in grams. Allocation entries are treated as additive on
 * top of liquid balance: a user with 5g balance + 100g allocation has 105g
 * of total claim against us.
 */
export async function readTotalClaimsByMetal(): Promise<Record<string, number>> {
  const totals: Record<string, number> = { auxg: 0, auxs: 0, auxpt: 0, auxpd: 0 };

  // SCAN balance hashes — cap iterations at ~50k users to avoid runaway.
  let cursor: string | number = 0;
  let walls = 0;
  const SCAN_BATCH = 500;
  do {
    const res = await redis.scan(cursor, { match: "user:0x*:balance", count: SCAN_BATCH });
    cursor = res[0];
    for (const key of res[1]) {
      walls++;
      try {
        const bal = await redis.hgetall(key);
        for (const f of ["auxg", "auxs", "auxpt", "auxpd"] as const) {
          const v = parseFloat((bal as any)?.[f] as string || "0");
          if (Number.isFinite(v) && v > 0) totals[f] += v;
        }
      } catch { /* skip bad row */ }
    }
    if (walls > 50_000) break; // hard backstop
  } while (cursor !== 0 && cursor !== "0");

  // Add allocations on top of liquid balance.
  // allocation:user:{uid}:list = JSON array of { metal, grams, status }.
  cursor = 0;
  do {
    const res = await redis.scan(cursor, { match: "allocation:user:*:list", count: SCAN_BATCH });
    cursor = res[0];
    for (const key of res[1]) {
      try {
        const raw = await redis.get(key);
        const allocs = typeof raw === "string" ? JSON.parse(raw) : Array.isArray(raw) ? raw : [];
        for (const a of (allocs as any[])) {
          if (a?.status !== "active") continue;
          const metal = String(a.metal || "").toLowerCase();
          const grams = parseFloat(a.grams || a.allocatedGrams || "0");
          if (totals[metal] !== undefined && Number.isFinite(grams) && grams > 0) {
            totals[metal] += grams;
          }
        }
      } catch { /* skip */ }
    }
  } while (cursor !== 0 && cursor !== "0");

  return totals;
}

// ── Step 2: compute per-asset delta ───────────────────────────────────────────

function syncedKey(metalId: string): string {
  return `rwa:onchain:synced:${metalId.toLowerCase()}`;
}

/**
 * Returns each metal's (currentClaims, lastSynced, delta) trio. Does NOT mint
 * yet — used both by the dry-run preview and the live runner.
 */
export async function computeDeltas(): Promise<AssetDelta[]> {
  const totals = await readTotalClaimsByMetal();
  const out: AssetDelta[] = [];

  for (const asset of ASSETS) {
    const current = totals[asset.balanceField] || 0;
    const prevRaw = await redis.get(syncedKey(asset.id));
    const previous = parseFloat(prevRaw as string || "0") || 0;
    const delta = +(current - previous).toFixed(TOKEN_DECIMALS);

    out.push({
      id: asset.id,
      contractAddress: asset.contractAddress,
      currentClaimsGrams: current,
      lastSyncedGrams: previous,
      deltaGrams: delta,
      willMint: delta > 0 && asset.contractAddress !== "",
      skipReason:
        !asset.contractAddress
          ? "no contract address in env"
          : delta < 0
          ? "negative delta (off-chain shrunk) — no burn in v0"
          : delta === 0
          ? "no change"
          : undefined,
    });
  }
  return out;
}

// ── Step 3: send the on-chain mint ────────────────────────────────────────────

function gramsToRawUnits(grams: number): bigint {
  // 3 decimals: 1g = 1000 raw. Use string arithmetic to avoid float drift
  // for values like 12.345g.
  const fixed = grams.toFixed(TOKEN_DECIMALS);
  const [whole, frac = ""] = fixed.split(".");
  const padded = (frac + "0".repeat(TOKEN_DECIMALS)).slice(0, TOKEN_DECIMALS);
  return BigInt(whole + padded);
}

/**
 * Sign + send a `mint(treasury, rawUnits)` call. Returns the tx hash on
 * success. Implementation is intentionally minimal: when we move to a
 * KMS-backed signer this is where the change lands.
 */
async function sendMint(
  asset: AssetConfig,
  rawUnits: bigint,
): Promise<{ txHash: string }> {
  const rpcUrl = process.env.BASE_RPC_URL;
  const privateKey = process.env.RWA_MINT_SYNC_PRIVATE_KEY;
  const treasury = process.env.RWA_MINT_SYNC_TREASURY;
  if (!rpcUrl) throw new Error("BASE_RPC_URL not set");
  if (!privateKey) throw new Error("RWA_MINT_SYNC_PRIVATE_KEY not set");
  if (!treasury) throw new Error("RWA_MINT_SYNC_TREASURY not set");

  // Lazy import so non-prod runs (and the cron's typecheck) don't pull
  // viem's full chain build.
  const { createWalletClient, createPublicClient, http, encodeFunctionData } = await import("viem");
  const { privateKeyToAccount } = await import("viem/accounts");
  const { base } = await import("viem/chains");

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const wallet = createWalletClient({ account, chain: base, transport: http(rpcUrl) });
  const publicClient = createPublicClient({ chain: base, transport: http(rpcUrl) });

  const data = encodeFunctionData({
    abi: [{ name: "mint", type: "function", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" }],
    functionName: "mint",
    args: [treasury as `0x${string}`, rawUnits],
  });

  const txHash = await wallet.sendTransaction({
    to: asset.contractAddress as `0x${string}`,
    data,
    value: 0n,
  });

  // Wait for receipt so a revert surfaces here, not silently three blocks later.
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 90_000 });
  if (receipt.status !== "success") {
    throw new Error(`mint reverted: ${txHash}`);
  }
  return { txHash };
}

// ── Step 4: orchestrate ───────────────────────────────────────────────────────

export async function runMintSync(opts: { dryRun?: boolean } = {}): Promise<SyncResult> {
  const dryRun =
    opts.dryRun ??
    (process.env.RWA_MINT_SYNC_DRYRUN === "true" ||
      !process.env.RWA_MINT_SYNC_PRIVATE_KEY ||
      !process.env.RWA_MINT_SYNC_TREASURY ||
      !process.env.BASE_RPC_URL);

  const date = new Date().toISOString().slice(0, 10);
  const deltas = await computeDeltas();
  const mints: MintResult[] = [];

  for (const d of deltas) {
    if (!d.willMint) {
      mints.push({ id: d.id, delta: d.deltaGrams, ok: true });
      continue;
    }
    if (dryRun) {
      console.log(`[rwa-mint-sync] DRY-RUN would mint ${d.deltaGrams}g ${d.id} to treasury (${d.contractAddress})`);
      mints.push({ id: d.id, delta: d.deltaGrams, ok: true });
      continue;
    }
    const asset = ASSETS.find((a) => a.id === d.id)!;
    try {
      const raw = gramsToRawUnits(d.deltaGrams);
      const { txHash } = await sendMint(asset, raw);
      // Persist NEW synced total so the next run computes a fresh delta.
      await redis.set(syncedKey(d.id), d.currentClaimsGrams.toString());
      mints.push({ id: d.id, delta: d.deltaGrams, ok: true, txHash });
      console.log(`[rwa-mint-sync] ✅ minted ${d.deltaGrams}g ${d.id} → tx ${txHash}`);
    } catch (e: any) {
      mints.push({ id: d.id, delta: d.deltaGrams, ok: false, error: e?.message || String(e) });
      console.error(`[rwa-mint-sync] ❌ ${d.id} mint failed:`, e?.message);
    }
  }

  return { dryRun, date, deltas, mints };
}
