// scripts/lookup-user.mjs — READ-ONLY. Resolve an email to wallet + balance.
// Usage: node scripts/lookup-user.mjs someone@example.com
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

const email = (process.argv[2] || "").trim().toLowerCase();
if (!email) { console.error("Pass an email"); process.exit(1); }

async function main() {
  console.log(`\nUser lookup for ${email}\n${"━".repeat(72)}`);

  const authUser = await redis.hgetall(`auth:user:${email}`);
  console.log(`auth:user:{email}  =>`, authUser);

  const userId = await redis.get(`auth:email:${email}`);
  console.log(`auth:email:{email} => ${userId}`);

  let vaultAddress = authUser?.vaultAddress || authUser?.address || null;

  if (userId) {
    const userHash = await redis.hgetall(`user:${userId}`);
    console.log(`user:{userId}      =>`, userHash);
    vaultAddress = vaultAddress || userHash?.vaultAddress || userHash?.address;
  }

  if (!vaultAddress) {
    console.log("\n⚠️  No wallet/vault address resolved for this email.");
    console.log(`${"━".repeat(72)}\n`);
    return;
  }

  const addr = String(vaultAddress).toLowerCase();
  console.log(`\nResolved wallet     => ${vaultAddress}  (normalized: ${addr})`);

  const walletEmail = await redis.get(`wallet:${vaultAddress}`);
  const walletEmailLc = await redis.get(`wallet:${addr}`);
  console.log(`wallet:{addr}        => ${walletEmail}`);
  console.log(`wallet:{addr-lc}     => ${walletEmailLc}`);

  const balance = await redis.hgetall(`user:${addr}:balance`);
  console.log(`\nbalance hash         =>`, balance);

  const settings = await redis.hgetall(`user:${addr}:settings`);
  console.log(`settings             =>`, settings);

  const kyc = await redis.get(`kyc:${addr}`);
  console.log(`kyc:{addr}           =>`, typeof kyc === "string" ? kyc : JSON.stringify(kyc));

  console.log(`${"━".repeat(72)}\n`);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
