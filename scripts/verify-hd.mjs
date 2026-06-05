// scripts/verify-hd.mjs — verify HD is live in prod and report the address +
// derivation index so the operator can cross-check against their OWN seed
// backup. Uses a throwaway user; cleans up. Reads no seed (seed lives only in
// Vercel env, not here).
//   node scripts/verify-hd.mjs run
//   node scripts/verify-hd.mjs cleanup
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

const PROD = "https://vault.auxite.io";
const SHARED_BTC = "bc1qtxtgwacfvsnxv54ft3lf7yu6v03hadk5tkdvtx";
const TEST_WALLET = "0x00000000000000000000000000000000face0001";
const TEST_USERID = "test-hd-verify-userid";
const mode = process.argv[2];

async function call() {
  const r = await fetch(`${PROD}/api/deposit?address=${TEST_WALLET}`, { cache: "no-store" });
  return r.json();
}

async function main() {
  if (mode === "cleanup") {
    const idx = await redis.get(`deposit:hd:index:${TEST_WALLET}`);
    const j = await call().catch(() => null);
    const evm = j?.addresses?.ETH?.address?.toLowerCase();
    const btc = j?.addresses?.BTC?.address;
    await redis.del(`user:address:${TEST_WALLET}`);
    await redis.del(`deposit:hd:index:${TEST_WALLET}`);
    if (evm) { await redis.del(`deposit:hd:evm:${evm}`); await redis.zrem("deposit:watch:evm", evm); }
    if (btc && btc !== SHARED_BTC) { await redis.del(`deposit:hd:btc:${btc}`); await redis.zrem("deposit:watch:btc", btc); }
    console.log("cleaned up HD verify test keys");
    return;
  }

  // run
  await redis.set(`user:address:${TEST_WALLET}`, TEST_USERID);
  console.log("polling prod for HD activation (per-user BTC address)...");
  let j, tries = 0;
  while (tries++ < 40) {
    j = await call();
    if (j?.perUser && j?.addresses?.BTC?.address && j.addresses.BTC.address !== SHARED_BTC) break;
    await new Promise((r) => setTimeout(r, 5000));
  }
  const idx = await redis.get(`deposit:hd:index:${TEST_WALLET}`);
  console.log(`\nperUser:        ${j?.perUser}`);
  console.log(`EVM (ETH/USDT/USDC): ${j?.addresses?.ETH?.address}`);
  console.log(`BTC:            ${j?.addresses?.BTC?.address}`);
  console.log(`derivation index: ${idx}`);
  const hdActive = j?.perUser && j?.addresses?.BTC?.address !== SHARED_BTC;
  console.log(`\nHD ACTIVE: ${hdActive ? "✅ yes (per-user BTC address present)" : "❌ no — still shared/KMS; deploy may not have picked up the seed yet"}`);
  if (hdActive) {
    console.log(`\n>>> OPERATOR CROSS-CHECK: from your seed backup, derive`);
    console.log(`    EVM path  m/44'/60'/0'/0/${idx}  → must equal ${j.addresses.ETH.address}`);
    console.log(`    BTC path  m/84'/0'/0'/0/${idx}  → must equal ${j.addresses.BTC.address}`);
    console.log(`    If they match, the Vercel seed == your backup (funds recoverable).`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
