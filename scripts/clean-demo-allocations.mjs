// Cleanup: the demo seed left ~1327 orphan allocations under uids that have no
// walletAddress (e.g. KFQ26JNFR9 with 1312). The reserve reset re-linked ALL
// active allocations, polluting bar allocatedGrams. This deletes the demo
// (walletAddress-less) allocation lists and recomputes allocatedGrams on the
// real bars from genuine (registered-user) allocations only.
//
// SAFETY: backs up every allocation list first, hard dry-run by default.
//   node scripts/clean-demo-allocations.mjs                          # dry-run
//   CLEAN_ALLOC_EXECUTE=true node scripts/clean-demo-allocations.mjs # apply

import { config as dotenvConfig } from "dotenv";
import { Redis } from "@upstash/redis";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

dotenvConfig({ path: ".env.local" });
dotenvConfig({ path: ".env" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const EXECUTE = process.env.CLEAN_ALLOC_EXECUTE === "true";
const METALS = ["AUXG", "AUXS", "AUXPT", "AUXPD"];
const BAR = { AUXG: "AUXG-IST-001", AUXS: "AUXS-IST-001", AUXPT: "AUXPT-SG-001", AUXPD: "AUXPD-SG-001" };

async function scanKeys(match) {
  let cursor = "0";
  const out = [];
  do {
    const [n, keys] = await redis.scan(cursor, { match, count: 500 });
    cursor = n;
    out.push(...keys);
  } while (String(cursor) !== "0");
  return out;
}

async function main() {
  console.log(`Mode: ${EXECUTE ? "🔴 EXECUTE" : "🟢 DRY-RUN"}\n`);

  const keys = await scanKeys("allocation:user:*:list");
  const backup = { takenAt: new Date().toISOString(), lists: {} };
  const realAllocated = { AUXG: 0, AUXS: 0, AUXPT: 0, AUXPD: 0 };
  const toDelete = [];
  let realLists = 0;

  for (const key of keys) {
    const uid = key.slice("allocation:user:".length, key.length - ":list".length);
    const u = await redis.hgetall(`user:${uid}`);
    const addr = (u?.walletAddress || "").toLowerCase();
    const raw = await redis.get(key);
    backup.lists[key] = raw;
    const allocs = typeof raw === "string" ? JSON.parse(raw) : Array.isArray(raw) ? raw : [];

    if (!addr) {
      toDelete.push(key); // demo / orphan — no registered wallet
      continue;
    }
    realLists++;
    for (const a of allocs) {
      if (a?.status !== "active") continue;
      const m = String(a.metal || "").toUpperCase();
      if (!METALS.includes(m)) continue;
      realAllocated[m] += parseFloat(a.grams ?? a.allocatedGrams ?? "0") || 0;
    }
  }

  const outDir = path.join(__dirname, "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const backupPath = path.join(outDir, `alloc-backup-${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));

  console.log(`Backup → ${backupPath} (${keys.length} lists)`);
  console.log(`Demo lists to delete: ${toDelete.length}  |  real lists kept: ${realLists}`);
  console.log("Real allocatedGrams (registered users only):");
  for (const m of METALS) console.log(`  ${m}: ${realAllocated[m]}g  → bar ${BAR[m]}`);

  if (!EXECUTE) {
    console.log("\nDRY-RUN. Re-run with CLEAN_ALLOC_EXECUTE=true to apply.");
    return;
  }

  console.log("\n🔴 Deleting demo allocation lists…");
  for (const k of toDelete) await redis.del(k);
  console.log(`Deleted ${toDelete.length}. Fixing bar allocatedGrams…`);
  for (const m of METALS) {
    await redis.hset(`reserve:bar:${BAR[m]}`, { allocatedGrams: String(realAllocated[m]) });
    console.log(`  ${BAR[m]}: allocatedGrams = ${realAllocated[m]}g`);
  }
  console.log(`\n✅ Cleaned. Backup at ${backupPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
