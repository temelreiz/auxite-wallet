// One-shot — move all dead-letter sells back to pending queue.
// Use after refilling hot wallet ETH so the reconcile cron can retry.

const { Redis } = require("@upstash/redis");
const r = Redis.fromEnv();

(async () => {
  const items = await r.lrange("dead-letter:onchain:sells", 0, -1);
  console.log(`Found ${items.length} item(s) in dead-letter`);

  for (const it of items) {
    const o = typeof it === "string" ? JSON.parse(it) : it;
    delete o.retries;
    delete o.failedAt;
    delete o.lastError;
    await r.lpush("pending:onchain:sells", JSON.stringify(o));
    console.log(`  ✓ requeued ${o.fromAmount} ${o.fromToken} → ${o.address.slice(0, 15)}...`);
  }
  await r.del("dead-letter:onchain:sells");

  console.log("");
  console.log("Status now:");
  console.log("  pending:", await r.llen("pending:onchain:sells"));
  console.log("  dead-letter:", await r.llen("dead-letter:onchain:sells"));
})();
