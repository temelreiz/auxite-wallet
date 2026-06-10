// ============================================================================
// RWA on-chain sync (canonical AuxiteMetal — per-investor + treasury)
// ----------------------------------------------------------------------------
// Keeps the canonical metal token contracts on Base in lockstep with our
// off-chain ledger using a FULL-STATE reconciler (not the old append-only
// "mint delta to treasury" model, which only ratcheted up and never burned).
//
// Invariant per metal:   totalSupply = vault metal = treasury + Σ user claims
//   - desired user balance[addr] = that user's off-chain claim (liquid + alloc)
//   - desired treasury balance    = vault metal − Σ claims (unsold reserve)
//
// Each run: read desired state, read on-chain balances, mint/burn the diffs.
//   user buys  → mint to user  + burn from treasury (ownership moves, total flat)
//   user redeem→ burn from user (vault shrinks, total down)
//   issuer buys→ raise RWA_VAULT_*_G → mint to treasury (total up)
//
// SAFETY: hard dry-run by default. Nothing is sent on-chain unless
// RWA_SYNC_EXECUTE=true. Review the logged plan first (same discipline as the
// one-time backfill in scripts/backfill-metal-tokens.ts).
//
// Required env (execute mode):
//   RWA_MINT_SYNC_PRIVATE_KEY  signer holding MINTER_ROLE on the canonical
//                              contracts (deployer pre-handoff, reconciler after)
//   BASE_RPC_URL               Base mainnet RPC
//   NEXT_PUBLIC_AUX*_CANONICAL canonical addresses (fallback: deployed consts)
//   RWA_VAULT_AUX*_G           total physical vault grams per metal (AUM)
//   RWA_TREASURY_ADDRESS       Safe holding unsold reserve (fallback: known Safe)
//
// Decimals: 3 (1g = 1000 raw units).
import { Redis } from "@upstash/redis";
import { getVaultTotals, isInitialized, seedHoldingsIfEmpty } from "./vault-inventory";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const TOKEN_DECIMALS = 3;

type Metal = "AUXG" | "AUXS" | "AUXPT" | "AUXPD";
const METALS: Metal[] = ["AUXG", "AUXS", "AUXPT", "AUXPD"];
const FIELD: Record<Metal, string> = { AUXG: "auxg", AUXS: "auxs", AUXPT: "auxpt", AUXPD: "auxpd" };

// Canonical AuxiteMetal addresses (Base mainnet, deployed 2026-06-09).
const CANONICAL_FALLBACK: Record<Metal, string> = {
  AUXG: "0xcef9d7593e8ba796ee05c54b8983b7749bb1218a",
  AUXS: "0xb0ac63aed12b5a0ee710618d99444bf126068c1a",
  AUXPT: "0x39f314fb20668997a2addab1ea9236e0072d5e2d",
  AUXPD: "0x6e4837fcf158d15abfdf90b3954d041d452be832",
};
function tokenAddr(m: Metal): string {
  return (process.env[`NEXT_PUBLIC_${m}_CANONICAL`] || CANONICAL_FALLBACK[m]).toLowerCase();
}

const TREASURY = (
  process.env.RWA_TREASURY_ADDRESS || "0xEdC9163c5f8A2a76BD1CdDa6BAA4Eb576B481070"
).toLowerCase();

// Total physical vault metal per metal (grams) = canonical totalSupply target.
// Source of truth is the Redis hash `config:vault:targets` (editable from the
// admin Vault page, no redeploy). Falls back to env, then these defaults.
const VAULT_DEFAULTS: Record<Metal, number> = {
  AUXG: Number(process.env.RWA_VAULT_AUXG_G ?? "20230"),
  AUXS: Number(process.env.RWA_VAULT_AUXS_G ?? "120000"),
  AUXPT: Number(process.env.RWA_VAULT_AUXPT_G ?? "230"),
  AUXPD: Number(process.env.RWA_VAULT_AUXPD_G ?? "382"),
};
const VAULT_TARGETS_KEY = "config:vault:targets";

// Legacy per-metal targets (config:vault:targets) — kept as the fallback when
// per-vault holdings haven't been seeded yet.
async function getLegacyTargets(): Promise<Record<Metal, number>> {
  const out: Record<Metal, number> = { ...VAULT_DEFAULTS };
  try {
    const cfg = (await redis.hgetall(VAULT_TARGETS_KEY)) as Record<string, unknown> | null;
    if (cfg) for (const m of METALS) {
      const v = parseFloat(String(cfg[m]));
      if (Number.isFinite(v) && v >= 0) out[m] = v;
    }
  } catch (e) {
    console.error("[vault] getLegacyTargets failed, using defaults:", e);
  }
  return out;
}

// Current vault targets = Σ per-vault held (admin enters grams per vault). Falls
// back to the legacy per-metal targets until per-vault holdings are seeded. The
// per-vault holdings are seeded once from the legacy targets so the reconciler
// stays a no-op on first run (founder then redistributes across vaults).
export async function getVaultTargets(): Promise<Record<Metal, number>> {
  try {
    const legacy = await getLegacyTargets();
    if (!(await isInitialized())) {
      await seedHoldingsIfEmpty(legacy);
      return legacy;
    }
    return await getVaultTotals();
  } catch (e) {
    console.error("[vault] getVaultTargets failed, using legacy:", e);
    return getLegacyTargets();
  }
}

// Persist admin-set vault targets (grams). Only valid non-negative numbers.
export async function setVaultTargets(targets: Partial<Record<Metal, number>>): Promise<Record<Metal, number>> {
  const upd: Record<string, string> = {};
  for (const m of METALS) {
    const v = targets[m];
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) upd[m] = String(v);
  }
  if (Object.keys(upd).length) await redis.hset(VAULT_TARGETS_KEY, upd);
  return getVaultTargets();
}

// Set of on-chain holder addresses we've minted to (so we can burn users who
// dropped to zero). Seeded by the backfill (rwa:backfill:minted:{METAL}).
const holdersKey = (m: Metal) => `rwa:onchain:holders:${m}`;
const legacyBackfillKey = (m: Metal) => `rwa:backfill:minted:${m}`;

export interface ReconcileOp {
  metal: Metal;
  account: string;
  kind: "mint" | "burn";
  grams: number;
  isTreasury: boolean;
}
export interface SyncResult {
  dryRun: boolean;
  date: string;
  ops: ReconcileOp[];
  errors: { metal: Metal; account: string; error: string }[];
}

const gramsToRaw = (g: number): bigint => {
  const fixed = g.toFixed(TOKEN_DECIMALS);
  const [whole, frac = ""] = fixed.split(".");
  const padded = (frac + "0".repeat(TOKEN_DECIMALS)).slice(0, TOKEN_DECIMALS);
  return BigInt(whole + padded);
};
const rawToGrams = (r: bigint) => Number(r) / 1000;

// ── Desired per-user claims (liquid balance + active allocations), per metal ──
async function readClaimsByUser(): Promise<Map<string, Record<Metal, number>>> {
  const byUser = new Map<string, Record<Metal, number>>();
  const add = (addr: string, m: Metal, g: number) => {
    if (!g || g <= 0) return;
    const a = addr.toLowerCase();
    if (!byUser.has(a)) byUser.set(a, { AUXG: 0, AUXS: 0, AUXPT: 0, AUXPD: 0 });
    byUser.get(a)![m] += g;
  };

  let cursor: any = 0;
  do {
    const res: [any, string[]] = (await redis.scan(cursor, { match: "user:0x*:balance", count: 500 })) as any;
    cursor = res[0];
    for (const key of res[1]) {
      const addr = key.slice("user:".length, key.length - ":balance".length);
      const h = await redis.hgetall(key);
      if (!h) continue;
      for (const m of METALS) add(addr, m, parseFloat(String((h as any)[FIELD[m]] ?? "0")) || 0);
    }
  } while (String(cursor) !== "0");

  cursor = 0;
  do {
    const res: [any, string[]] = (await redis.scan(cursor, { match: "allocation:user:*:list", count: 500 })) as any;
    cursor = res[0];
    for (const key of res[1]) {
      const uid = key.slice("allocation:user:".length, key.length - ":list".length);
      const u = await redis.hgetall(`user:${uid}`);
      const addr = (u as any)?.walletAddress;
      if (!addr) continue;
      const raw = await redis.get(key);
      const allocs = typeof raw === "string" ? JSON.parse(raw) : Array.isArray(raw) ? raw : [];
      for (const a of allocs as any[]) {
        if (a?.status !== "active") continue;
        const metal = String(a.metal || "").toUpperCase() as Metal;
        if (!METALS.includes(metal)) continue;
        add(addr, metal, parseFloat(String(a.grams ?? a.allocatedGrams ?? "0")) || 0);
      }
    }
  } while (String(cursor) !== "0");

  return byUser;
}

// ── Orchestrate ───────────────────────────────────────────────────────────────
export async function runMintSync(opts: { dryRun?: boolean } = {}): Promise<SyncResult> {
  const execute = process.env.RWA_SYNC_EXECUTE === "true";
  const dryRun = opts.dryRun ?? !execute;
  const date = new Date().toISOString().slice(0, 10);
  const ops: ReconcileOp[] = [];
  const errors: SyncResult["errors"] = [];

  // Vault targets from Redis (admin-editable) ?? env/default.
  const vaultTargets = await getVaultTargets();

  for (const m of METALS) {
    if (!Number.isFinite(vaultTargets[m])) {
      errors.push({ metal: m, account: "-", error: `RWA_VAULT_${m}_G not set` });
      continue;
    }
  }

  const claims = await readClaimsByUser();

  // viem clients (lazy import). Public client always; wallet only when executing.
  const viem = await import("viem");
  const { base } = await import("viem/chains");
  const encodeFunctionData = viem.encodeFunctionData;
  const rpcUrl = process.env.BASE_RPC_URL?.trim() || "https://mainnet.base.org";
  const publicClient = viem.createPublicClient({ chain: base, transport: viem.http(rpcUrl) });
  let signer: any = null;
  if (!dryRun) {
    let pk = process.env.RWA_MINT_SYNC_PRIVATE_KEY?.trim().replace(/^["']|["']$/g, "");
    if (pk && !pk.startsWith("0x")) pk = `0x${pk}`;
    if (!process.env.BASE_RPC_URL || !pk || !/^0x[a-fA-F0-9]{64}$/.test(pk)) {
      throw new Error("RWA_SYNC_EXECUTE set but BASE_RPC_URL / RWA_MINT_SYNC_PRIVATE_KEY missing/malformed");
    }
    const { privateKeyToAccount } = await import("viem/accounts");
    const account = privateKeyToAccount(pk as `0x${string}`);
    signer = viem.createWalletClient({ account, chain: base, transport: viem.http(rpcUrl) });
  }

  const BAL_ABI = [{ name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] }] as const;
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  // Retry + throttle: public RPCs (mainnet.base.org) rate-limit sequential
  // reads with 429. Production should use a dedicated BASE_RPC_URL; this keeps
  // the reconciler robust either way.
  const readBal = async (addr: string, token: string): Promise<bigint> => {
    for (let i = 0; ; i++) {
      try {
        const v = (await publicClient.readContract({
          address: token as `0x${string}`,
          abi: BAL_ABI,
          functionName: "balanceOf",
          args: [addr as `0x${string}`],
        })) as bigint;
        await sleep(120);
        return v;
      } catch (e: any) {
        if (i >= 6) throw e;
        await sleep(600 * (i + 1));
      }
    }
  };

  // Explicit nonce management: viem defaults to the provider's nonce, which can
  // race across the burn/mint/mint txs of a single run on a busy/cached RPC and
  // produce "replacement transaction underpriced". Track the nonce locally,
  // seeded from pending, and advance it per accepted tx.
  let nextNonce: number | undefined;

  const applyDiff = async (m: Metal, account: string, current: bigint, target: bigint, isTreasury: boolean) => {
    if (current === target) return;
    const kind: "mint" | "burn" = target > current ? "mint" : "burn";
    const amount = kind === "mint" ? target - current : current - target;
    ops.push({ metal: m, account, kind, grams: rawToGrams(amount), isTreasury });
    if (dryRun) {
      console.log(`[rwa-sync] DRY-RUN ${kind} ${rawToGrams(amount)}g ${m} ${isTreasury ? "TREASURY" : account}`);
      return;
    }
    try {
      const fn = kind === "mint" ? "mint" : "burnFrom";
      const data = encodeFunctionData({
        abi: [{ name: fn, type: "function", stateMutability: "nonpayable", inputs: [{ name: "a", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] }],
        functionName: fn,
        args: [account as `0x${string}`, amount],
      });
      if (nextNonce === undefined) {
        nextNonce = await publicClient.getTransactionCount({ address: signer.account.address, blockTag: "pending" });
      }
      const hash = await signer.sendTransaction({ to: tokenAddr(m) as `0x${string}`, data, value: 0n, nonce: nextNonce });
      nextNonce++; // accepted into the mempool with this nonce
      const rcpt = await publicClient.waitForTransactionReceipt({ hash, timeout: 90_000 });
      if (rcpt.status !== "success") throw new Error(`reverted ${hash}`);
      console.log(`[rwa-sync] ✅ ${kind} ${rawToGrams(amount)}g ${m} ${isTreasury ? "TREASURY" : account} → ${hash}`);
    } catch (e: any) {
      errors.push({ metal: m, account, error: e?.message || String(e) });
      console.error(`[rwa-sync] ❌ ${m} ${kind} ${account}:`, e?.message);
    }
  };

  for (const m of METALS) {
    if (!Number.isFinite(vaultTargets[m])) continue;
    const token = tokenAddr(m);

    // Holder universe = past holders ∪ current claimants.
    const past = new Set<string>([
      ...((await redis.smembers(holdersKey(m))) as string[]),
      ...((await redis.smembers(legacyBackfillKey(m))) as string[]),
    ].map((a) => a.toLowerCase()));
    for (const [addr, bal] of claims) if (bal[m] > 0) past.add(addr);
    past.delete(TREASURY);

    let totalClaimRaw = 0n;
    for (const addr of past) {
      const targetRaw = gramsToRaw(claims.get(addr)?.[m] ?? 0);
      totalClaimRaw += targetRaw;
      const current = await readBal(addr, token);
      await applyDiff(m, addr, current, targetRaw, false);
      if (!dryRun && targetRaw > 0n) await redis.sadd(holdersKey(m), addr);
    }

    // Treasury holds the unsold remainder: vault − Σ claims.
    const vaultRaw = gramsToRaw(vaultTargets[m]);
    const treasuryTarget = vaultRaw - totalClaimRaw;
    if (treasuryTarget < 0n) {
      errors.push({ metal: m, account: TREASURY, error: `claims exceed vault (${vaultTargets[m]}g)` });
      continue;
    }
    const treasuryCurrent = await readBal(TREASURY, token);
    await applyDiff(m, TREASURY, treasuryCurrent, treasuryTarget, true);
  }

  if (ops.length === 0) console.log("[rwa-sync] in sync — no ops");
  return { dryRun, date, ops, errors };
}
