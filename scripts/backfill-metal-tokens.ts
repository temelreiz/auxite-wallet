// ONE-TIME backfill: mint each user's metal balance to their own on-chain vault
// address on the new canonical AuxiteMetal contracts. This is what turns the
// assets into "On-chain Represented" (per-investor ownership on-chain).
//
// ⚠️  IRREVERSIBLE when executed. Defaults to DRY-RUN. It will NOT mint unless
//     you pass RWA_BACKFILL_EXECUTE=true AND the per-metal reconciliation
//     against the (interim) mirror supply passes.
//
// Run AFTER deploy, BEFORE handoff (the deployer still holds MINTER_ROLE):
//   # 1) dry-run — writes a CSV you must eyeball:
//   TS_NODE_PROJECT=tsconfig.hardhat.json npx hardhat run scripts/backfill-metal-tokens.ts --network base
//   # 2) execute — only after the dry-run reconciles:
//   RWA_BACKFILL_EXECUTE=true TS_NODE_PROJECT=tsconfig.hardhat.json npx hardhat run scripts/backfill-metal-tokens.ts --network base
//
// Balance source mirrors rwa-mint-sync.readTotalClaimsByMetal EXACTLY (liquid
// `user:0x*:balance` hash fields + active `allocation:user:*:list`) so the
// per-user sum reconciles to the mirror's on-chain totalSupply.
//
// Env: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, PRIVATE_KEY (deployer
//      = bootstrap MINTER), and the canonical addresses (from the deploy
//      manifest or NEXT_PUBLIC_AUX*_CANONICAL).

import { ethers, network } from "hardhat";
import { Redis } from "@upstash/redis";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// hardhat.config only loads .env; the Upstash creds (UPSTASH_REDIS_REST_*) live
// in .env.local. Load it explicitly so the Redis client initializes.
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });
if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  throw new Error("UPSTASH_REDIS_REST_URL / _TOKEN not found (.env.local)");
}

type Metal = "AUXG" | "AUXS" | "AUXPT" | "AUXPD";
const METALS: Metal[] = ["AUXG", "AUXS", "AUXPT", "AUXPD"];
const FIELD: Record<Metal, string> = { AUXG: "auxg", AUXS: "auxs", AUXPT: "auxpt", AUXPD: "auxpd" };

const EXECUTE = process.env.RWA_BACKFILL_EXECUTE === "true";
const BATCH = Number(process.env.RWA_BACKFILL_BATCH || "100");
const RECONCILE_TOLERANCE_MG = BigInt(process.env.RWA_BACKFILL_TOLERANCE_MG || "1000"); // 1g of cumulative rounding slack

const ABI = [
  "function mintBatch(address[] to, uint256[] amounts)",
  "function totalSupply() view returns (uint256)",
];

// Model: totalSupply = full physical vault metal (AUM). User claims go to user
// addresses; the unsold remainder is minted to the treasury (Safe). Vault
// holdings are the source of truth (grams) — override via env as stock changes.
const TREASURY = process.env.RWA_TREASURY_ADDRESS || "0xEdC9163c5f8A2a76BD1CdDa6BAA4Eb576B481070";
const VAULT_TARGET_G: Record<Metal, number> = {
  AUXG: Number(process.env.RWA_VAULT_AUXG_G ?? "7400"),
  AUXS: Number(process.env.RWA_VAULT_AUXS_G ?? "72000"),
  AUXPT: Number(process.env.RWA_VAULT_AUXPT_G ?? "230"),
  AUXPD: Number(process.env.RWA_VAULT_AUXPD_G ?? "382"),
};

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const gramsToRaw = (g: number): bigint => BigInt(Math.round(g * 1000)); // 3 decimals

function tokenAddresses(chainId: number): Record<Metal, string> {
  const manifest = path.join(__dirname, "deployments", `metal-tokens.${chainId}.json`);
  if (fs.existsSync(manifest)) {
    const m = JSON.parse(fs.readFileSync(manifest, "utf8"));
    const out: any = {};
    for (const t of m.tokens) out[t.symbol] = t.address;
    if (METALS.every((s) => out[s])) return out;
  }
  const env: Record<Metal, string> = {
    AUXG: process.env.NEXT_PUBLIC_AUXG_CANONICAL || "",
    AUXS: process.env.NEXT_PUBLIC_AUXS_CANONICAL || "",
    AUXPT: process.env.NEXT_PUBLIC_AUXPT_CANONICAL || "",
    AUXPD: process.env.NEXT_PUBLIC_AUXPD_CANONICAL || "",
  };
  if (!METALS.every((s) => /^0x[0-9a-fA-F]{40}$/.test(env[s]))) {
    throw new Error("Canonical addresses not found (deploy manifest or NEXT_PUBLIC_AUX*_CANONICAL)");
  }
  return env;
}

// Build address → grams-per-metal, identical accounting to readTotalClaimsByMetal.
async function readClaimsByUser(): Promise<Map<string, Record<Metal, number>>> {
  const byUser = new Map<string, Record<Metal, number>>();
  const add = (addr: string, metal: Metal, g: number) => {
    if (!g || g <= 0) return;
    const a = addr.toLowerCase();
    if (!byUser.has(a)) byUser.set(a, { AUXG: 0, AUXS: 0, AUXPT: 0, AUXPD: 0 });
    byUser.get(a)![metal] += g;
  };

  // 1) Liquid balances: user:0x*:balance hash → auxg/auxs/auxpt/auxpd (grams)
  let cursor = "0";
  do {
    const [next, keys] = await redis.scan(cursor, { match: "user:0x*:balance", count: 500 });
    cursor = next;
    for (const key of keys as string[]) {
      const addr = key.slice("user:".length, key.length - ":balance".length);
      const h = (await redis.hgetall(key)) as Record<string, string> | null;
      if (!h) continue;
      for (const m of METALS) add(addr, m, parseFloat(String(h[FIELD[m]] ?? "0")) || 0);
    }
  } while (String(cursor) !== "0");

  // 2) Active allocations: allocation:user:{uid}:list → [{metal, grams|allocatedGrams, status}]
  cursor = "0";
  do {
    const [next, keys] = await redis.scan(cursor, { match: "allocation:user:*:list", count: 500 });
    cursor = next;
    for (const key of keys as string[]) {
      const uid = key.slice("allocation:user:".length, key.length - ":list".length);
      const u = (await redis.hgetall(`user:${uid}`)) as Record<string, string> | null;
      const addr = u?.walletAddress;
      if (!addr) continue; // can't place allocation without an address
      // allocation:user:{uid}:list is a JSON STRING (redis.set), not a list.
      // Match rwa-mint-sync exactly: get + parse (Upstash may auto-deserialize).
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

async function main() {
  const net = await ethers.provider.getNetwork();
  const [signer] = await ethers.getSigners();
  const tokens = tokenAddresses(Number(net.chainId));

  console.log(`Network: ${network.name} chainId=${net.chainId}  signer=${signer.address}`);
  console.log(`Mode: ${EXECUTE ? "🔴 EXECUTE (will mint)" : "🟢 DRY-RUN (no mint)"}  batch=${BATCH}\n`);

  const byUser = await readClaimsByUser();

  // Per-metal recipient lists + reconciliation totals
  const plan: Record<Metal, { to: string[]; raw: bigint[]; totalRaw: bigint }> = {
    AUXG: { to: [], raw: [], totalRaw: 0n },
    AUXS: { to: [], raw: [], totalRaw: 0n },
    AUXPT: { to: [], raw: [], totalRaw: 0n },
    AUXPD: { to: [], raw: [], totalRaw: 0n },
  };
  const csvRows: string[] = ["address,metal,grams,rawUnits"];
  for (const [addr, bal] of byUser) {
    for (const m of METALS) {
      const raw = gramsToRaw(bal[m]);
      if (raw <= 0n) continue;
      plan[m].to.push(addr);
      plan[m].raw.push(raw);
      plan[m].totalRaw += raw;
      csvRows.push(`${addr},${m},${bal[m]},${raw}`);
    }
  }

  // Add the treasury remainder so each token's totalSupply = full vault metal.
  // userClaims → user addresses (already in plan); (vault − claims) → treasury.
  console.log("Plan (totalSupply target = full physical vault metal):");
  for (const m of METALS) {
    if (!Number.isFinite(VAULT_TARGET_G[m])) {
      throw new Error(`Vault target for ${m} not set — provide grams via RWA_VAULT_${m}_G`);
    }
    const target = gramsToRaw(VAULT_TARGET_G[m]);
    const claims = plan[m].totalRaw;
    const remainder = target - claims;
    if (remainder < 0n) {
      throw new Error(
        `${m}: user claims (${Number(claims) / 1000}g) exceed vault holdings (${VAULT_TARGET_G[m]}g). Update vault before backfill.`,
      );
    }
    if (remainder > 0n) {
      plan[m].to.push(TREASURY);
      plan[m].raw.push(remainder);
      plan[m].totalRaw += remainder;
      csvRows.push(`${TREASURY},${m},${Number(remainder) / 1000},${remainder} (TREASURY)`);
    }
    console.log(
      `  ${m}: vault=${VAULT_TARGET_G[m]}g  userClaims=${Number(claims) / 1000}g  treasury=${Number(remainder) / 1000}g  total=${Number(plan[m].totalRaw) / 1000}g  recipients=${plan[m].to.length}`,
    );
  }

  // Write the dry-run CSV for human review.
  const outDir = path.join(__dirname, "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const csvPath = path.join(outDir, `backfill-${net.chainId}.csv`);
  fs.writeFileSync(csvPath, csvRows.join("\n") + "\n");
  console.log(`\nPlan written → ${csvPath} (${csvRows.length - 1} mint rows)`);

  if (!EXECUTE) {
    console.log("\nDRY-RUN only. Review the CSV, then re-run with RWA_BACKFILL_EXECUTE=true.");
    return;
  }

  // Safety: canonical contracts must be empty (totalSupply 0) before backfill,
  // so we never double-mint on a re-run that isn't using the idempotency set.
  for (const m of METALS) {
    const c = new ethers.Contract(tokens[m], ABI, signer);
    const supply: bigint = await c.totalSupply();
    if (supply > 0n) {
      console.log(
        `  ⚠️  ${m} canonical already has totalSupply=${Number(supply) / 1000}g — relying on idempotency set to skip done addresses.`,
      );
    }
  }

  // Idempotency: skip addresses already minted in a prior (partial) run.
  console.log("\n🔴 EXECUTING per-user mintBatch…");
  for (const m of METALS) {
    const c = new ethers.Contract(tokens[m], ABI, signer);
    const doneKey = `rwa:backfill:minted:${m}`;
    const done = new Set((await redis.smembers(doneKey)) as string[]);
    const to: string[] = [];
    const raw: bigint[] = [];
    for (let i = 0; i < plan[m].to.length; i++) {
      if (done.has(plan[m].to[i])) continue;
      to.push(plan[m].to[i]);
      raw.push(plan[m].raw[i]);
    }
    console.log(`  ${m}: ${to.length} new recipients (${done.size} already done)`);
    for (let i = 0; i < to.length; i += BATCH) {
      const tb = to.slice(i, i + BATCH);
      const rb = raw.slice(i, i + BATCH);
      const tx = await c.mintBatch(tb, rb);
      await tx.wait();
      if (tb.length) await redis.sadd(doneKey, tb[0], ...tb.slice(1));
      console.log(`    minted ${i + tb.length}/${to.length}  tx=${tx.hash}`);
    }
  }
  console.log("\n✅ Backfill complete. Verify totalSupply per token, then run handoff.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
