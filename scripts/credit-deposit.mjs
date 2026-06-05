// scripts/credit-deposit.mjs — manually credit ONE orphan deposit to a user.
// Idempotent: if deposit:tx:{hash} === "credited" it aborts.
// Run with --commit to actually write; without it, dry-run (plan only).
//
//   node scripts/credit-deposit.mjs            # dry-run
//   node scripts/credit-deposit.mjs --commit   # execute
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

// ── The deposit + recipient (confirmed by operator) ───────────────────────
const ADDR = "0x4cc925ba624d4d066d6baf729dc0e43ef4dd74f7";
const EMAIL = "aduk34@gmail.com";
const TX = "0x74777637947fe20a9b26c746003b86fe3b145063dec800b334eee7173640a74a";
const FROM = "0x3304e22ddaa22bcdc5fca2269b418046ae7b566a";
const COIN = "ETH";
const FIELD = "eth";
const AMOUNT = 0.024986;
const AMOUNT_USD = 51.59246703;
// Exact pending-queue record (as stored by the scanner) for clean removal.
const PENDING_OBJ = {
  chain: "eth", coin: "ETH", amount: 0.024986, txHash: TX,
  fromAddress: FROM, toAddress: "0xae4d3eb67558423f74e8d80f56fbdfc1f91f3213",
  blockNumber: 46385452, timestamp: 1779560251000, confirmations: 18,
  amountUsd: 51.59246703, receivedAt: "2026-05-23T18:18:15.815Z",
  source: "direct-scanner", assignedTo: null, status: "pending-assignment",
};

const COMMIT = process.argv.includes("--commit");
const balKey = `user:${ADDR}:balance`;
const txKey = `user:${ADDR}:transactions`;
const depTxKey = `deposit:tx:${TX}`;
const assignedKey = `deposit:assigned:${TX}`;

async function main() {
  console.log(`\n${"━".repeat(72)}`);
  console.log(`Credit deposit — ${COMMIT ? "COMMIT" : "DRY-RUN"}`);
  console.log(`${"━".repeat(72)}`);
  console.log(`Recipient : ${EMAIL}  (${ADDR})`);
  console.log(`Amount    : ${AMOUNT} ${COIN}  (~$${AMOUNT_USD.toFixed(2)})`);
  console.log(`Tx        : ${TX}\n`);

  // Idempotency guard
  const existing = await redis.get(depTxKey);
  if (existing === "credited") {
    console.log("⛔ Already credited (deposit:tx === 'credited'). Aborting.\n");
    return;
  }
  console.log(`deposit:tx current value => ${JSON.stringify(existing)}`);

  const before = await redis.hgetall(balKey);
  console.log(`\nBalance BEFORE => eth=${before?.eth} auxm=${before?.auxm} totalAuxm=${before?.totalAuxm}`);

  if (!COMMIT) {
    console.log("\n(dry-run) Would: hincrbyfloat eth +" + AMOUNT + ", add deposit tx, mark credited, remove from pending.");
    console.log(`${"━".repeat(72)}\n`);
    return;
  }

  // 1. Credit the coin balance
  await redis.hincrbyfloat(balKey, FIELD, AMOUNT);
  // keep totalAuxm consistent (unchanged for an ETH credit, but recompute)
  const b = await redis.hgetall(balKey);
  const auxm = parseFloat(String(b?.auxm || 0));
  const bonus = parseFloat(String(b?.bonusAuxm || b?.bonusauxm || 0));
  await redis.hset(balKey, { totalAuxm: auxm + bonus });

  // 2. Record the transaction (same shape addTransaction() writes)
  const tx = {
    id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: "deposit",
    token: COIN,
    amount: AMOUNT,
    status: "completed",
    timestamp: Date.now(),
    metadata: {
      source: "manual-assign",
      chain: "eth",
      txHash: TX,
      fromAddress: FROM,
      amountUsd: AMOUNT_USD,
      autoConverted: false,
      assignedBy: "ops",
      assignedAt: new Date().toISOString(),
    },
  };
  await redis.lpush(txKey, JSON.stringify(tx));
  await redis.ltrim(txKey, 0, 99);

  // 3. Mark credited (blocks double-credit incl. admin panel 409) + assigned record
  await redis.set(depTxKey, "credited", { ex: 86400 * 365 });
  await redis.set(
    assignedKey,
    JSON.stringify({
      walletAddress: ADDR, email: EMAIL, coin: COIN, amount: AMOUNT,
      txHash: TX, assignedAt: new Date().toISOString(), source: "manual-script",
    }),
    { ex: 86400 * 365 }
  );

  // 4. Best-effort removal from the pending queue (safe: no double-credit risk either way)
  let removed = 0;
  try {
    removed = await redis.lrem("deposits:pending", 1, JSON.stringify(PENDING_OBJ));
  } catch (e) {
    console.log("  (pending removal skipped:", e.message, ")");
  }

  const after = await redis.hgetall(balKey);
  console.log(`Balance AFTER  => eth=${after?.eth} auxm=${after?.auxm} totalAuxm=${after?.totalAuxm}`);
  console.log(`Pending entry removed: ${removed}`);
  console.log(`Tx id: ${tx.id}`);
  console.log("\n✅ Credited.");
  console.log(`${"━".repeat(72)}\n`);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
