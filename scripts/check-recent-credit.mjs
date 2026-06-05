// scripts/check-recent-credit.mjs — READ-ONLY. Show the most recent credited
// deposits (deposit:assigned:*) and the affected account's balance, to locate
// where a just-arrived deposit landed.
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
  const out = []; let cursor = "0";
  do {
    const [next, batch] = await redis.scan(cursor, { match: pattern, count: 500 });
    cursor = next; out.push(...batch);
  } while (cursor !== "0");
  return out;
}

async function main() {
  const keys = await scanKeys("deposit:assigned:*");
  const entries = [];
  for (const k of keys) {
    const v = parse(await redis.get(k));
    if (v && typeof v === "object") entries.push(v);
  }
  entries.sort((a, b) => new Date(b.assignedAt || 0) - new Date(a.assignedAt || 0));
  console.log(`\nMost recent credited deposits (of ${entries.length}):\n${"━".repeat(72)}`);
  for (const e of entries.slice(0, 5)) {
    console.log(`${e.assignedAt}  ${e.coin} ${e.amount}  ~$${Number(e.amountUsd||0).toFixed(2)}  source=${e.source}  autoConverted=${e.autoConverted}`);
    console.log(`   → account ${e.walletAddress}`);
    console.log(`   tx ${e.txHash}`);
  }
  // Balance of the most recent account
  const top = entries[0];
  if (top?.walletAddress) {
    const bal = await redis.hgetall(`user:${top.walletAddress.toLowerCase()}:balance`);
    console.log(`\nBalance of ${top.walletAddress}:`);
    console.log(`   auxm=${bal?.auxm}  totalAuxm=${bal?.totalAuxm}  usdc=${bal?.usdc}  usdt=${bal?.usdt}  eth=${bal?.eth}`);
    const settings = await redis.hgetall(`user:${top.walletAddress.toLowerCase()}:settings`);
    console.log(`   autoConvertToAuxm setting = ${settings?.autoConvertToAuxm ?? "(unset → defaults ON)"}`);
  }
  console.log("━".repeat(72));
}
main().catch((e) => { console.error(e); process.exit(1); });
