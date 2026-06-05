// scripts/audit-deposits.mjs — READ-ONLY. Full picture of the deposit pipeline:
// how many orphans, how much $, since when, how many ever credited.
import { Redis } from "@upstash/redis";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env.local") });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const parse = (v) => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; } };

async function scanKeys(pattern) {
  const out = [];
  let cursor = "0";
  do {
    const [next, batch] = await redis.scan(cursor, { match: pattern, count: 500 });
    cursor = next;
    out.push(...batch);
  } while (cursor !== "0");
  return out;
}

async function main() {
  console.log(`\n${"━".repeat(72)}\nDEPOSIT PIPELINE AUDIT\n${"━".repeat(72)}`);

  // 1. Pending / orphan queue
  const pendingRaw = await redis.lrange("deposits:pending", 0, 499);
  const pending = pendingRaw.map(parse).filter(Boolean);
  let pendUsd = 0;
  const byCoin = {};
  const byFrom = {};
  let minT = Infinity, maxT = -Infinity;
  for (const d of pending) {
    const usd = Number(d.amountUsd || 0); pendUsd += usd;
    byCoin[d.coin] = (byCoin[d.coin] || 0) + usd;
    byFrom[d.fromAddress] = (byFrom[d.fromAddress] || 0) + 1;
    const t = Number(d.timestamp || 0);
    if (t) { minT = Math.min(minT, t); maxT = Math.max(maxT, t); }
  }
  console.log(`\n[PENDING / ORPHAN QUEUE]`);
  console.log(`  entries           : ${pending.length}`);
  console.log(`  total value       : ~$${pendUsd.toFixed(2)}`);
  console.log(`  by coin ($)       :`, Object.fromEntries(Object.entries(byCoin).map(([k,v])=>[k,+v.toFixed(2)])));
  console.log(`  unique senders    : ${Object.keys(byFrom).length}`);
  if (minT !== Infinity) {
    console.log(`  oldest            : ${new Date(minT).toISOString()}`);
    console.log(`  newest            : ${new Date(maxT).toISOString()}`);
  }
  console.log(`  per-entry:`);
  for (const d of pending) {
    console.log(`    ${new Date(Number(d.timestamp)).toISOString().slice(0,10)}  ${String(d.coin).padEnd(4)} ${String(d.amount).padEnd(12)} ~$${Number(d.amountUsd||0).toFixed(2).padStart(9)}  from ${String(d.fromAddress).slice(0,12)}…  status=${d.status}`);
  }

  // 2. How many deposits were ever processed (deposit:tx:* markers)
  const txKeys = await scanKeys("deposit:tx:*");
  let credited = 0, stillPending = 0, other = 0;
  // batch-get values
  for (let i = 0; i < txKeys.length; i += 50) {
    const slice = txKeys.slice(i, i + 50);
    const vals = await Promise.all(slice.map((k) => redis.get(k)));
    for (const v of vals) {
      const pv = parse(v);
      if (v === "credited" || pv === "credited") credited++;
      else if (v === "pending" || pv === "pending") stillPending++;
      else other++; // JSON object => auto-scanner credited (object payload)
    }
  }
  console.log(`\n[deposit:tx markers]  total=${txKeys.length}`);
  console.log(`  "credited" (manual/admin) : ${credited}`);
  console.log(`  "pending"  (orphan, never credited): ${stillPending}`);
  console.log(`  object payload (auto-scanner credited): ${other}`);

  // 3. Manually assigned
  const assignedKeys = await scanKeys("deposit:assigned:*");
  console.log(`\n[deposit:assigned:*]  ${assignedKeys.length} manual assignments total`);

  // 4. Auto-scanner recent credited log
  const recent = (await redis.lrange("scanner:deposits:recent", 0, 99)).map(parse).filter(Boolean);
  console.log(`\n[scanner:deposits:recent]  ${recent.length} entries (auto-credited log)`);

  // 5. Daily stats
  const statKeys = await scanKeys("scanner:deposits:stats:*");
  console.log(`\n[scanner daily stats]  ${statKeys.length} day(s) recorded`);
  for (const k of statKeys.sort()) {
    const s = await redis.hgetall(k);
    console.log(`  ${k.split(":").pop()} =>`, s);
  }

  console.log(`${"━".repeat(72)}\n`);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
