// scripts/verify-tron.mjs — verify prod serves a per-user Tron USDT address,
// report the index for a TronLink cross-check, and clean up. Throwaway user.
//   node scripts/verify-tron.mjs run
//   node scripts/verify-tron.mjs cleanup
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
const TEST_WALLET = "0x00000000000000000000000000000000face0002";
const TEST_USERID = "test-tron-verify-userid";
const mode = process.argv[2];

async function call() {
  const r = await fetch(`${PROD}/api/deposit?address=${TEST_WALLET}`, { cache: "no-store" });
  return r.json();
}

async function main() {
  if (mode === "cleanup") {
    const j = await call().catch(() => null);
    const evm = j?.addresses?.ETH?.address?.toLowerCase();
    const btc = j?.addresses?.BTC?.address;
    const usdt = j?.addresses?.USDT?.address;
    await redis.del(`user:address:${TEST_WALLET}`);
    await redis.del(`deposit:hd:index:${TEST_WALLET}`);
    if (evm) { await redis.del(`deposit:hd:evm:${evm}`); await redis.zrem("deposit:watch:evm", evm); }
    if (btc) { await redis.del(`deposit:hd:btc:${btc}`); await redis.zrem("deposit:watch:btc", btc); }
    if (usdt && usdt.startsWith("T")) { await redis.del(`deposit:tron:${usdt}`); await redis.zrem("deposit:watch:tron", usdt); }
    console.log("cleaned up tron verify test keys");
    return;
  }

  await redis.set(`user:address:${TEST_WALLET}`, TEST_USERID);
  console.log("polling prod until USDT serves a Tron address...");
  let j, tries = 0;
  while (tries++ < 40) {
    j = await call();
    if (j?.addresses?.USDT?.network === "Tron (TRC20)" && String(j.addresses.USDT.address).startsWith("T")) break;
    await new Promise((r) => setTimeout(r, 5000));
  }
  const idx = await redis.get(`deposit:hd:index:${TEST_WALLET}`);
  console.log(`\nUSDT network: ${j?.addresses?.USDT?.network}`);
  console.log(`USDT address (Tron): ${j?.addresses?.USDT?.address}`);
  console.log(`USDC/ETH (Base):     ${j?.addresses?.USDC?.address}`);
  console.log(`derivation index:    ${idx}`);
  const ok = j?.addresses?.USDT?.network === "Tron (TRC20)" && String(j?.addresses?.USDT?.address).startsWith("T");
  console.log(`\nTRON SERVING: ${ok ? "✅ live (T-address served for USDT)" : "❌ not yet"}`);
  if (ok) {
    console.log(`\n>>> OPERATOR CROSS-CHECK (TronLink): import your seed, derive`);
    console.log(`    m/44'/195'/0'/0/${idx}  → must equal ${j.addresses.USDT.address}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
