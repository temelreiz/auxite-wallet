// scripts/test-kms-deposit.mjs — TEST ONLY. Validates the KMS per-user deposit
// path with a throwaway user, and proves CONTROL (decrypt key → address match).
// Cleans up after itself. Prints no secrets.
//   node scripts/test-kms-deposit.mjs setup
//   node scripts/test-kms-deposit.mjs verify
//   node scripts/test-kms-deposit.mjs cleanup
import { Redis } from "@upstash/redis";
import { KMSClient, DecryptCommand } from "@aws-sdk/client-kms";
import { ethers } from "ethers";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env.local") });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
const kms = new KMSClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const TEST_WALLET = "0x00000000000000000000000000000000deadbe01"; // fake account
const TEST_USERID = "test-kms-deposit-userid";
const mode = process.argv[2];

async function main() {
  if (mode === "setup") {
    await redis.set(`user:address:${TEST_WALLET}`, TEST_USERID);
    console.log(`setup: user:address:${TEST_WALLET} → ${TEST_USERID}`);
    return;
  }
  if (mode === "verify") {
    const wallet = await redis.hgetall(`user:${TEST_USERID}:wallet`);
    if (!wallet?.address) { console.log("❌ no KMS wallet created"); return; }
    console.log(`KMS wallet address: ${wallet.address}`);
    // Decrypt the stored key and confirm it derives the same address → we control it.
    const dec = await kms.send(new DecryptCommand({
      CiphertextBlob: Buffer.from(String(wallet.encryptedPrivateKey), "base64"),
    }));
    const pk = Buffer.from(dec.Plaintext).toString("utf-8");
    const derived = new ethers.Wallet(pk).address.toLowerCase();
    console.log(`decrypt → derived address: ${derived}`);
    console.log(`CONTROL PROOF: ${derived === String(wallet.address).toLowerCase() ? "✅ key decrypts and matches — we control this address" : "❌ MISMATCH"}`);
    // Watcher wiring
    const rev = await redis.get(`deposit:hd:evm:${String(wallet.address).toLowerCase()}`);
    console.log(`reverse map deposit:hd:evm → ${rev}  (expect ${TEST_WALLET})`);
    const score = await redis.zscore("deposit:watch:evm", String(wallet.address).toLowerCase());
    console.log(`armed in deposit:watch:evm: ${score ? "yes (score " + score + ")" : "no"}`);
    return;
  }
  if (mode === "cleanup") {
    const wallet = await redis.hgetall(`user:${TEST_USERID}:wallet`);
    const addr = wallet?.address ? String(wallet.address).toLowerCase() : null;
    await redis.del(`user:address:${TEST_WALLET}`);
    await redis.del(`user:${TEST_USERID}:wallet`);
    if (addr) {
      await redis.del(`wallet:address:${addr}`);
      await redis.del(`deposit:hd:evm:${addr}`);
      await redis.zrem("deposit:watch:evm", addr);
    }
    console.log("cleaned up test KMS deposit keys", addr ? `(addr ${addr})` : "");
    return;
  }
  console.error("usage: setup | verify | cleanup");
  process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
