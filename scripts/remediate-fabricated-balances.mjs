// scripts/remediate-fabricated-balances.mjs
//
// Zeroes the balances that were written through the unauthenticated endpoints
// closed in PR #67, then freezes and bans the account.
//
// Target: 0xb7f4f51b…9588 — registered 2026-09-24 23:41 from a disposable
// address, credited exactly 1000.00 of all 13 assets ~20 minutes later via
// POST /api/balance/add (11 assets, no transaction record) and
// POST /api/admin/pending-deposits (USDC + AUXR, with "admin-assigned"
// transaction records). None of it was ever deposited.
//
// Transactions are deliberately NOT deleted: they are the evidence trail.
//
//   node scripts/remediate-fabricated-balances.mjs            # dry run
//   node scripts/remediate-fabricated-balances.mjs --apply    # writes
//
import { Redis } from "@upstash/redis";
import { config } from "dotenv";
config({ path: new URL("../.env.local", import.meta.url).pathname, quiet: true });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const APPLY = process.argv.includes("--apply");
const TARGETS = ["0xb7f4f51bd2da3037871703dcdb55154cac359588"];
const REASON = "Security review — fabricated balances via unauthenticated endpoints (PR #67)";
const NOW = new Date().toISOString();

const parse = (v) => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return null; } };
const num = (v) => { const n = parseFloat(String(v)); return Number.isFinite(n) ? n : null; };

console.log(APPLY ? "MODE: APPLY (writes)\n" : "MODE: DRY RUN (no writes)\n");

for (const a of TARGETS) {
  console.log(`=== ${a} ===`);

  // ── 1. Balances ──────────────────────────────────────────────────────────
  const balKey = `user:${a}:balance`;
  const before = (await redis.hgetall(balKey)) || {};
  const fields = Object.keys(before);

  if (!fields.length) {
    console.log("  balance hash: empty — nothing to zero");
  } else {
    // Zero every numeric field; leave non-numeric ones (e.g. bonusExpiresAt)
    // untouched so we do not corrupt the record's shape.
    const zeroed = {};
    const skipped = [];
    for (const f of fields) {
      if (num(before[f]) === null) { skipped.push(f); continue; }
      zeroed[f] = 0;
    }
    for (const f of Object.keys(zeroed)) {
      console.log(`  ${f.padEnd(16)} ${String(before[f]).padStart(14)}  ->  0`);
    }
    if (skipped.length) console.log(`  (left as-is, non-numeric: ${skipped.join(", ")})`);

    if (APPLY && Object.keys(zeroed).length) await redis.hset(balKey, zeroed);
  }

  // ── 2. AUXM ledger reversal ──────────────────────────────────────────────
  // auxm is the unit the ledger tracks; zeroing it in the hash without a
  // journal entry would leave auxm:total_minted overstated forever.
  //
  // Only the `auxm` field is reversed. incrementBalance journals a mint solely
  // when `updates.auxm` is present (src/lib/redis.ts), so the bonus credit —
  // which landed in the hash as `bonusauxm`, lowercased by the deleted
  // /api/balance/add — never reached the journal and has nothing to undo.
  // Burning it here would overstate auxm:total_burned by that amount, which is
  // the same class of error this script exists to correct, pointed the other
  // way.
  const auxmBurn = num(before.auxm) || 0;
  if (auxmBurn > 0) {
    console.log(`  auxm ledger: burn entry for -${auxmBurn}`);
    if (APPLY) {
      const rec = {
        ts: Date.now(), address: a, delta: -auxmBurn, reason: "admin_adjust",
        counterAsset: null, counterAmount: null, refTxId: null, refTxHash: null,
        meta: { incident: "PR#67", note: "fabricated balance reversal", by: "admin:security-review" },
      };
      const p = redis.pipeline();
      p.lpush("auxm:journal", JSON.stringify(rec));
      p.ltrim("auxm:journal", 0, 199_999);
      p.incrbyfloat("auxm:total_burned", auxmBurn);
      await p.exec();
    }
  } else {
    console.log("  auxm ledger: no reversal needed");
  }

  // ── 3. Freeze + ban (indefinite) ─────────────────────────────────────────
  const prev = parse(await redis.get(`user:emergency:${a}`)) || {};
  const next = {
    panicMode: false, trustedContacts: [], cooldownPeriod: 24, securityLevel: "standard",
    ...prev,
    frozen: true,
    frozenAt: prev.frozenAt || NOW,
    frozenBy: "admin:security-review",
    frozenReason: REASON,
  };
  delete next.frozenUntil; // must never auto-expire

  if (APPLY) {
    await redis.set(`user:emergency:${a}`, JSON.stringify(next));
    await redis.hset(`user:${a}:info`, { banned: "true", bannedAt: Date.now(), banReason: REASON });
    await redis.lpush(`user:emergency:logs:${a}`, JSON.stringify({
      action: "freeze", walletAddress: a, timestamp: NOW,
      details: { reason: REASON, by: "admin:security-review" },
    }));
    await redis.ltrim(`user:emergency:logs:${a}`, 0, 99);
  }
  console.log(`  freeze: frozen=true banned=true frozenUntil=none${APPLY ? "" : "  (not written)"}`);
  console.log(`  transactions: left intact (evidence)\n`);
}

console.log(APPLY ? "Done." : "Dry run complete — re-run with --apply to write.");
