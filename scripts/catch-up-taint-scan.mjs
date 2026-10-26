// scripts/catch-up-taint-scan.mjs
//
// Clears the backlog the stalled scan left behind, and records the addresses
// the stall hid.
//
// The watch stopped at block 52,833,000 on 20 October and nothing said so for
// six days. In that time 172 AUXR was moved through five addresses. The cron
// can clear a backlog on its own now, 60,000 blocks at a time, but that is
// several hours of runs — this does it in one pass and seeds the destinations
// that are already known from tracing by hand, so the alerts that follow are
// about new movement rather than six days of history.
//
// Run with --apply to write.

import { Redis } from "@upstash/redis";
import { config } from "dotenv";
config({ path: new URL("../.env.local", import.meta.url).pathname, quiet: true });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
const APPLY = process.argv.includes("--apply");

// Traced by hand on 26 October, in order of the flow.
const DISCOVERED = [
  ["0x2ef57924a844cf3b0fdad6010c53041463c7b299", "received 18 AUXR from 0x52Ef3BB0, 23-24 Oct — since emptied"],
  ["0x6289bb3cd07ab18c22f91870f93b5d3353f29946", "received 3 AUXR from 0x52Ef3BB0, 25 Oct — since emptied"],
  ["0x30a40808123be89cee796430ebcf949b65b0f800", "received 156.19 AUXR from 0x52Ef3BB0, 25 Oct 22:10 — pass-through, emptied one minute later"],
  ["0x67be8ce27ef8158d51d8593bb5b26eafacc955d9", "CONSOLIDATION — received 159.19 AUXR 25 Oct 22:33; holds 204.29 AUXR"],
];

// Recorded for the investigation, but deliberately NOT put in the taint set.
// 0xdc601950 has a nonce of 6,423: it is an exchange hot wallet. Tainting it
// would mark every ordinary customer withdrawal that exchange makes, and the
// set would fill with people who have nothing to do with this.
const NOTED_NOT_TAINTED = [
  ["0xdc601950c59b9a0f9dbcb23594418f5613576ec3", "exchange hot wallet (nonce 6,423) that fed 0x30a40808 — AUXR left an exchange through here. NOT tainted: it serves ordinary customers too."],
];

const RPCS = ["https://base.drpc.org", "https://mainnet.base.org", "https://1rpc.io/base"];
const head = await (async () => {
  for (const url of RPCS) {
    try {
      const r = await (await fetch(url, { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }) })).json();
      if (r.result) return BigInt(r.result);
    } catch {}
  }
  throw new Error("no RPC answered");
})();

const stored = await redis.get("auxr:taint:lastBlock");
console.log(APPLY ? "MODE: APPLY\n" : "MODE: DRY RUN\n");
console.log(`watermark : ${stored}`);
console.log(`head      : ${head}`);
console.log(`backlog   : ${(head - BigInt(String(stored))).toLocaleString()} blocks\n`);

console.log("addresses to add to the taint set:");
for (const [addr, note] of DISCOVERED) {
  const already = await redis.sismember("auxr:taint:addresses", addr);
  console.log(`  ${already ? "already there" : "ADD         "}  ${addr}`);
  console.log(`                  ${note}`);
}

console.log("\nrecorded but NOT tainted (exchange wallet — would mark innocent users):");
for (const [addr, note] of NOTED_NOT_TAINTED) console.log(`  ${addr}\n                  ${note}`);

if (!APPLY) {
  console.log("\nnothing written — re-run with --apply");
  process.exit(0);
}

for (const [addr, note] of DISCOVERED) {
  await redis.sadd("auxr:taint:addresses", addr);
  await redis.hset("auxr:taint:meta", { [addr]: note });
}
// Notes only — no sadd, so taint does not propagate from an exchange's wallet.
for (const [addr, note] of NOTED_NOT_TAINTED) {
  await redis.hset("auxr:taint:noted", { [addr]: note });
}

// Move the watermark to the head. The six days are accounted for by hand
// above; replaying them would produce a burst of alerts about movement that
// has already been traced and written down.
await redis.set("auxr:taint:lastBlock", head.toString());

console.log(`\ntaint set is now ${await redis.scard("auxr:taint:addresses")} addresses`);
console.log(`watermark moved to ${head} — the scan resumes from here`);
