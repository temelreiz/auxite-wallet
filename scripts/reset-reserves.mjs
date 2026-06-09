// One-time reserve correction: replace demo/seed reserve bars with the REAL
// physical vault holdings so the trust page (/api/reserves → vault.auxite.io/
// trust/reserves, the canonical contracts' reserveInfoURI) matches the canonical
// on-chain supply and the actual metal at the custodians.
//
// Why: the existing reserve:bar records showed inflated demo data (e.g. AUXG
// 98.3kg spread evenly across IST/LN/DB/ZH) — not the real holdings.
//
// SAFETY: backs up EVERY reserve:* key to a JSON file first, hard dry-run by
// default. Nothing is written unless RESET_RESERVES_EXECUTE=true.
//
//   node scripts/reset-reserves.mjs                       # dry-run + backup
//   RESET_RESERVES_EXECUTE=true node scripts/reset-reserves.mjs   # apply
//
// Edit TARGET below with real bar-level detail (serials/weights) from the
// Silver Bullion / Istanbul statements before applying if you have it; the
// defaults are consolidated per-vault holdings that sum to the real totals.

import "dotenv/config";
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

const EXECUTE = process.env.RESET_RESERVES_EXECUTE === "true";

// Real physical holdings. One consolidated record per (metal, vault); replace
// with real serial-level bars when available.
const TARGET = {
  AUXG: [{ vault: "IST", grams: 7400, purity: "999.9", supplier: "Istanbul Vault" }],
  AUXS: [{ vault: "IST", grams: 72000, purity: "999", supplier: "Istanbul Vault" }],
  AUXPT: [{ vault: "SG", grams: 230, purity: "999.5", supplier: "Silver Bullion (SG)" }],
  AUXPD: [{ vault: "SG", grams: 382, purity: "999.5", supplier: "Silver Bullion (SG)" }],
};
const METALS = ["AUXG", "AUXS", "AUXPT", "AUXPD"];

async function scanKeys(match) {
  let cursor = "0";
  const out = [];
  do {
    const [next, keys] = await redis.scan(cursor, { match, count: 500 });
    cursor = next;
    out.push(...keys);
  } while (String(cursor) !== "0");
  return out;
}

async function main() {
  console.log(`Mode: ${EXECUTE ? "🔴 EXECUTE (will overwrite reserves)" : "🟢 DRY-RUN"}\n`);

  // ── Snapshot current state (per metal totals) + full backup ────────────────
  const barKeys = await scanKeys("reserve:bar:*");
  const indexKeys = await scanKeys("reserve:index:*");
  const backup = { takenAt: new Date().toISOString(), bars: {}, indexes: {} };
  const currentTotals = { AUXG: 0, AUXS: 0, AUXPT: 0, AUXPD: 0 };

  for (const k of barKeys) {
    const bar = await redis.hgetall(k);
    backup.bars[k] = bar;
    const m = bar?.metal;
    if (m && currentTotals[m] !== undefined) currentTotals[m] += parseFloat(bar.grams || "0") || 0;
  }
  for (const k of indexKeys) backup.indexes[k] = await redis.smembers(k);

  const outDir = path.join(__dirname, "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const backupPath = path.join(outDir, `reserve-backup-${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));

  console.log(`Backup → ${backupPath} (${barKeys.length} bars, ${indexKeys.length} index sets)\n`);
  console.log("Current vs target (grams):");
  for (const m of METALS) {
    const target = TARGET[m].reduce((s, b) => s + b.grams, 0);
    console.log(`  ${m}: current=${currentTotals[m]}  →  target=${target}`);
  }

  if (!EXECUTE) {
    console.log("\nDRY-RUN. Review the backup + targets, then re-run with RESET_RESERVES_EXECUTE=true.");
    return;
  }

  // ── Clear every reserve:* key, then write the real holdings ────────────────
  console.log("\n🔴 Clearing existing reserve records…");
  for (const k of barKeys) await redis.del(k);
  for (const k of indexKeys) await redis.del(k);

  console.log("Writing real holdings…");
  let added = 0;
  for (const m of METALS) {
    let seq = 0;
    for (const b of TARGET[m]) {
      seq++;
      const serialNumber = `${m}-${b.vault}-${String(seq).padStart(3, "0")}`;
      const bar = {
        serialNumber,
        metal: m,
        grams: String(b.grams),
        allocatedGrams: "0",
        vault: b.vault,
        purity: b.purity,
        status: "available",
        supplier: b.supplier || "",
        purchaseDate: new Date().toISOString(),
        certificateUrl: "",
        note: "consolidated holding — pending bar-level serialization",
        createdAt: new Date().toISOString(),
      };
      await redis.hset(`reserve:bar:${serialNumber}`, bar);
      await redis.sadd(`reserve:index:${m}`, serialNumber);
      await redis.sadd(`reserve:index:vault:${b.vault}`, serialNumber);
      await redis.sadd(`reserve:index:available`, serialNumber);
      added++;
      console.log(`  + ${serialNumber}: ${b.grams}g ${m} @ ${b.vault}`);
    }
  }

  // ── Re-link active user allocations to the new consolidated bars ───────────
  // Existing allocations referenced now-deleted demo bars; point them at the
  // new real bar for their metal and restore the bar's allocatedGrams so the
  // allocation → physical-bar link (and redemption) stays intact.
  const newBarFor = {};
  for (const m of METALS) newBarFor[m] = `${m}-${TARGET[m][0].vault}-001`;
  const allocatedByMetal = { AUXG: 0, AUXS: 0, AUXPT: 0, AUXPD: 0 };
  const allocKeys = await scanKeys("allocation:user:*:list");
  let relinked = 0;
  for (const key of allocKeys) {
    const raw = await redis.get(key);
    const allocs = typeof raw === "string" ? JSON.parse(raw) : Array.isArray(raw) ? raw : [];
    let changed = false;
    for (const a of allocs) {
      if (a?.status !== "active") continue;
      const m = String(a.metal || "").toUpperCase();
      if (!METALS.includes(m)) continue;
      a.serialNumber = newBarFor[m];
      allocatedByMetal[m] += parseFloat(a.grams ?? a.allocatedGrams ?? "0") || 0;
      changed = true;
      relinked++;
    }
    if (changed) await redis.set(key, JSON.stringify(allocs));
  }
  for (const m of METALS) {
    if (allocatedByMetal[m] > 0) {
      await redis.hset(`reserve:bar:${newBarFor[m]}`, { allocatedGrams: String(allocatedByMetal[m]) });
      console.log(`  ↳ ${m}: re-linked allocations, ${allocatedByMetal[m]}g allocated on ${newBarFor[m]}`);
    }
  }

  console.log(`\n✅ Reserves reset. ${added} holdings written, ${relinked} allocations re-linked. Backup at ${backupPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
