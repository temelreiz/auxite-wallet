// scripts/test-watcher-setup.mjs — TEST ONLY. Injects/cleans a temporary
// armed-address mapping so we can dry-run the watcher against real chain data
// (the hot wallet, which has known historical deposits). Credits nothing.
//   node scripts/test-watcher-setup.mjs inject
//   node scripts/test-watcher-setup.mjs cleanup
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

const HOT = "0xae4d3eb67558423f74e8d80f56fbdfc1f91f3213"; // has real deposits
const TEST_USER = "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
const mode = process.argv[2];

async function main() {
  if (mode === "inject") {
    await redis.zadd("deposit:watch:evm", { score: Date.now() + 3600_000, member: HOT });
    await redis.set(`deposit:hd:evm:${HOT}`, TEST_USER);
    console.log("injected: armed", HOT, "→", TEST_USER, "(dry-test only)");
  } else if (mode === "cleanup") {
    await redis.zrem("deposit:watch:evm", HOT);
    await redis.del(`deposit:hd:evm:${HOT}`);
    await redis.del(`deposit:hd:lastblock:${HOT}`);
    console.log("cleaned up test mapping for", HOT);
  } else {
    console.error("usage: inject | cleanup");
    process.exit(1);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
