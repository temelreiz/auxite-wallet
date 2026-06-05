// scripts/match-orphans.mjs — READ-ONLY. For each pending/orphan deposit, try
// to identify the owner from the sender address (user DB), and label known
// exchange / internal hot-wallet senders.
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

const KNOWN = {
  "0x3304e22ddaa22bcdc5fca2269b418046ae7b566a": "Binance (exchange omnibus)",
  "0x2a6007a15a7b04feadd64f0d002a10a6867587f6": "Auxite fallback hot wallet (internal)",
  "0xae4d3eb67558423f74e8d80f56fbdfc1f91f3213": "Auxite main hot wallet (internal)",
};

async function ownerFor(from) {
  const f = String(from).toLowerCase();
  const byAddr = await redis.get(`user:address:${f}`);
  if (byAddr) return { type: "USER (user:address)", id: String(byAddr) };
  const byWallet = await redis.get(`wallet:${from}`);
  if (byWallet) return { type: "USER (wallet:)", id: String(byWallet) };
  if (KNOWN[f]) return { type: "KNOWN-SENDER", id: KNOWN[f] };
  return { type: "UNKNOWN", id: null };
}

async function main() {
  const raw = await redis.lrange("deposits:pending", 0, 499);
  const pending = raw.map(parse).filter(Boolean);
  console.log(`\n${pending.length} pending deposit(s):\n${"━".repeat(72)}`);
  for (const d of pending) {
    // skip ones already credited (defensive)
    const credited = (await redis.get(`deposit:tx:${d.txHash}`)) === "credited";
    const owner = await ownerFor(d.fromAddress);
    console.log(
      `${new Date(Number(d.timestamp)).toISOString().slice(0, 10)}  ${String(d.coin).padEnd(4)} ${String(d.amount).padEnd(12)} ~$${Number(d.amountUsd || 0).toFixed(2).padStart(8)}`
    );
    console.log(`   from ${d.fromAddress}`);
    console.log(`   owner: ${owner.type}${owner.id ? " → " + owner.id : ""}${credited ? "   [ALREADY CREDITED]" : ""}`);
    console.log(`   tx ${d.txHash}`);
  }
  console.log("━".repeat(72));
}
main().catch((e) => { console.error(e); process.exit(1); });
