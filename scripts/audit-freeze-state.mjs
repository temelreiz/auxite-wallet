// scripts/audit-freeze-state.mjs
//
// Read-only. Reports whether the accounts frozen during the 2026-09-09 balance
// manipulation incident are still frozen.
//
// Why this needs checking: until PR #69, /api/security/emergency identified the
// caller by the x-wallet-address header and unfreezeAccount() refused nothing
// but the 24h cooldown. Any caller could therefore lift any freeze, including
// one placed by security review, from the moment the cooldown expired.
//
// `banned` is the flag that actually gates the money paths (assertAccountActive,
// PR #58) and could never be cleared from that endpoint — so a cleared `frozen`
// with `banned` still true means the account is contained but its freeze state
// was tampered with. Both false means it is fully loose.
//
//   node scripts/audit-freeze-state.mjs
//
import { Redis } from "@upstash/redis";
import { config } from "dotenv";
config({ path: new URL("../.env.local", import.meta.url).pathname, quiet: true });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const parse = (v) => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return null; } };

const ACCOUNTS = [
  // 2026-09-09 balance manipulation incident
  "0x11f589705dae12174a7907cc35cee23f3b023b88",
  "0xf39f27ea538d45c1e13f9614cec43b6800dbb1c7",
  "0x1916659ec7214a0a7eecab4d08bb0daba0fcf58d",
  "0x287477412580f72fbecd60cb6372c3b9b4a41dbe",
  // fabricated balances via the endpoints closed in #67
  "0xb7f4f51bd2da3037871703dcdb55154cac359588",
];

let loose = 0;

for (const a of ACCOUNTS) {
  const cfg = parse(await redis.get(`user:emergency:${a}`)) || {};
  const info = (await redis.hgetall(`user:${a}:info`)) || {};
  const banned = info.banned === "true" || info.banned === true;
  const frozen = cfg.frozen === true;

  const verdict = frozen && banned ? "OK — frozen + banned"
    : banned ? "!! freeze cleared, ban holds (money paths still blocked)"
    : frozen ? "!! frozen but NOT banned"
    : "!! LOOSE — neither frozen nor banned";
  if (!(frozen && banned)) loose++;

  console.log(a);
  console.log(`  frozen=${frozen} frozenBy=${cfg.frozenBy ?? "-"} frozenAt=${cfg.frozenAt ?? "-"}`);
  console.log(`  banned=${banned} banReason=${info.banReason ?? "-"}`);
  console.log(`  ${verdict}\n`);
}

console.log(loose === 0
  ? "All accounts still fully contained."
  : `${loose} of ${ACCOUNTS.length} need attention — re-run freeze-incident-accounts.mjs --apply for those.`);
