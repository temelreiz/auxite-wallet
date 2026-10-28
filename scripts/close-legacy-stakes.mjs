// Close the pre-ledger custody stakes kept in `stakes:<address>`.
//
// These records never locked the metal and nothing ever matured or paid them
// (see src/lib/staking/ledger.ts). Decision 2026-10-28: real customers are
// paid the reward accrued to today (to their in-app balance, in the same
// metal) and get an in-app notice; internal/test accounts and the address
// with no user record are closed without payout.
//
//   node scripts/close-legacy-stakes.mjs            # dry run (default)
//   node scripts/close-legacy-stakes.mjs --apply    # write
//
// Idempotent: only records still "active" are touched.
import { Redis } from "@upstash/redis";

const APPLY = process.argv.includes("--apply");
const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });

// Address prefixes, decided by hand from the 2026-10-28 listing.
const PAY = ["0x4cc925ba", "0xc15600e8"];                       // customers
const NO_PAY = ["0xd24b2bca", "0x8d23e12c", "0xaa197e01"];       // internal ×2, no user record

const now = Date.now();
const iso = new Date(now).toISOString();
let cursor = "0", keys = [];
do {
  const [c, k] = await redis.scan(cursor, { match: "stakes:*", count: 500 });
  cursor = String(c); keys.push(...k);
} while (cursor !== "0");

const totals = {};
for (const key of keys) {
  if (key.split(":").length !== 2) continue;
  const address = key.slice("stakes:".length).toLowerCase();
  const pay = PAY.some((p) => address.startsWith(p));
  const skip = NO_PAY.some((p) => address.startsWith(p));
  if (!pay && !skip) { console.log(`?? ${address} not in either list — left alone`); continue; }

  const raw = await redis.get(key);
  const list = Array.isArray(raw) ? raw : typeof raw === "string" ? JSON.parse(raw) : [];
  let changed = false;
  for (const s of list) {
    if (s.status !== "active") continue;
    const metal = String(s.metal).toLowerCase();
    const amount = parseFloat(s.amount) || 0;
    const apy = parseFloat(s.apy) || 0;
    const start = Date.parse(s.startDate), end = Date.parse(s.endDate);
    const days = Math.max(0, (Math.min(now, end) - start) / 86_400_000);
    const reward = pay ? Number((amount * apy / 100 * days / 365).toFixed(6)) : 0;

    console.log(`${APPLY ? "CLOSE" : "would close"} ${address.slice(0, 10)}… ${s.id} ${amount} ${metal.toUpperCase()} @${apy}% → ${pay ? `pay ${reward} ${metal.toUpperCase()}` : "no payout"}`);
    if (pay) totals[metal] = (totals[metal] || 0) + reward;

    s.status = "closed";
    s.closedAt = iso;
    s.closeReason = pay ? "legacy-migration-paid-accrued" : "legacy-migration-no-payout";
    s.legacyReward = reward;
    changed = true;

    if (APPLY) {
      if (reward > 0) {
        const m = redis.multi();
        m.hincrbyfloat(`user:${address}:balance`, metal, reward);
        m.hincrbyfloat(`platform:yield:paid:${metal}`, "total", reward);
        m.hincrbyfloat(`platform:yield:paid:${metal}`, "count", 1);
        m.lpush(`user:${address}:transactions`, JSON.stringify({
          id: `legacy_stake_${s.id}`, type: "stake_reward", metal: metal.toUpperCase(),
          amount: reward.toFixed(6), status: "completed", timestamp: now, originalPositionId: s.id,
          note: "Reward for an earlier stake, paid when it was moved off the old staking system",
        }));
        m.lpush(`notifications:${address}`, JSON.stringify({
          id: `NOTIF_${now}_${s.id}`, type: "staking", createdAt: now, read: false,
          title: "Stake reward paid",
          message: `Your earlier ${amount} ${metal.toUpperCase()} stake has been closed and its reward of ${reward.toFixed(4)} ${metal.toUpperCase()} added to your balance. Your metal was never locked and remains available; you can stake again any time.`,
          data: { stakeId: s.id, reward, metal },
        }));
        await m.exec();
      }
      await redis.hset(`stake:${s.id}`, { status: "closed", closedAt: iso, legacyReward: String(reward) }).catch(() => {});
    }
  }
  if (APPLY && changed) await redis.set(key, JSON.stringify(list));
}
console.log(`\n${APPLY ? "Paid" : "Would pay"}:`, Object.fromEntries(Object.entries(totals).map(([k, v]) => [k.toUpperCase(), v.toFixed(6)])));
