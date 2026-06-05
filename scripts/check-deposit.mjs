// scripts/check-deposit.mjs — READ-ONLY diagnostic for a single deposit txHash.
// Usage: node scripts/check-deposit.mjs 0x<txHash>
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

const txHash = (process.argv[2] || "").trim();
if (!txHash) {
  console.error("Pass a txHash");
  process.exit(1);
}

function parse(v) {
  try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; }
}

async function main() {
  console.log(`\nDeposit diagnostic for ${txHash}\n${"━".repeat(72)}`);

  // 1. Has this tx been processed/credited?
  const txKey = await redis.get(`deposit:tx:${txHash}`);
  console.log(`deposit:tx:{hash}        => ${JSON.stringify(parse(txKey))}`);

  const assigned = await redis.get(`deposit:assigned:${txHash}`);
  console.log(`deposit:assigned:{hash}  => ${JSON.stringify(parse(assigned))}`);

  // 2. Is it in the pending queue?
  const pendingRaw = await redis.lrange("deposits:pending", 0, 499);
  const pending = pendingRaw.map(parse);
  const match = pending.filter((d) => d && String(d.txHash).toLowerCase() === txHash.toLowerCase());
  console.log(`\ndeposits:pending total   => ${pending.length}`);
  console.log(`  matching this tx       => ${match.length}`);
  for (const m of match) console.log("   ", JSON.stringify(m));

  // 3. Scanner state
  const status = await redis.hgetall("scanner:status");
  console.log(`\nscanner:status           =>`, status);
  const lastBlock = await redis.get("scanner:eth:lastBlock");
  console.log(`scanner:eth:lastBlock    => ${lastBlock}`);
  const enabled = await redis.get("scanner:config:enabled");
  console.log(`scanner:config:enabled   => ${enabled}`);
  const processedMember = await redis.sismember("scanner:eth:processed", txHash);
  console.log(`in scanner:eth:processed => ${processedMember}`);

  // 4. Recent credited deposits (last 100)
  const recentRaw = await redis.lrange("scanner:deposits:recent", 0, 99);
  const recent = recentRaw.map(parse);
  const recMatch = recent.filter((d) => d && String(d.txHash).toLowerCase() === txHash.toLowerCase());
  console.log(`\nscanner:deposits:recent  => ${recent.length} entries, matching: ${recMatch.length}`);
  for (const m of recMatch) console.log("   ", JSON.stringify(m));

  // 5. Latest 5 pending (any) for context
  console.log(`\nLatest 5 pending deposits:`);
  for (const d of pending.slice(0, 5)) {
    console.log(`   ${d?.coin} ${d?.amount} from ${String(d?.fromAddress).slice(0,12)}… status=${d?.status} tx=${String(d?.txHash).slice(0,14)}…`);
  }
  console.log(`${"━".repeat(72)}\n`);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
