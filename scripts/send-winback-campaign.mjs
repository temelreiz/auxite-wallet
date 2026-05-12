// scripts/send-winback-campaign.mjs
// One-shot winback campaign: targets cohort 2 (signed up ≥14d, no KYC, no
// deposit) and cohort 3 (KYC approved, no deposit). Excludes anyone in the
// email:suppressed set + anyone who has received a winback in the last 30d.
//
// DRY-RUN BY DEFAULT. Pass --send to actually send. Pass --cohort=2|3 to
// scope. Pass --limit=N to cap recipients (for test slice).
//
// Usage:
//   node scripts/send-winback-campaign.mjs --cohort=3 --limit=5         # dry-run, only 5
//   node scripts/send-winback-campaign.mjs --cohort=3 --limit=5 --send  # actually send 5
//   node scripts/send-winback-campaign.mjs --cohort=3 --send            # send to all c3
//   node scripts/send-winback-campaign.mjs --test=you@example.com       # send one to yourself

import { Redis } from "@upstash/redis";
import { Resend } from "resend";
import { createHmac } from "crypto";
import { config } from "dotenv";
import { fileURLToPath, pathToFileURL } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env.local") });

// ── CLI flags ────────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    if (!a.startsWith("--")) return [a, true];
    const [k, v] = a.slice(2).split("=");
    return [k, v ?? true];
  })
);
const DRY_RUN = !args.send;
const COHORT = args.cohort ? String(args.cohort) : "all";
const LIMIT = args.limit ? parseInt(String(args.limit), 10) : Infinity;
const TEST_EMAIL = args.test ? String(args.test) : null;

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = `Auxite <${process.env.FROM_EMAIL || "noreply@auxite.io"}>`;
const SUPPRESSION_SET = "email:suppressed";
const CAMPAIGN_LOG = "email:winback:sent";
const RECENT_TTL_DAYS = 30;

// Template registry — keep in sync with src/lib/winback-email-templates.ts
// Loaded dynamically below via tsx-less dynamic import workaround.
async function loadTemplates() {
  // The TS file isn't directly requirable from Node without a transpiler.
  // We inline a JS-compatible mirror by importing the compiled output if it
  // exists, OR fall back to a small dynamic builder. To keep things simple
  // and avoid build pipeline coupling, we inline the strings here.
  // (Mirror only — when you edit src/lib/winback-email-templates.ts, update here too.)
  return await import("./winback-templates-inline.mjs");
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const ASSET_KEYS = ["auxm", "auxg", "auxs", "auxpt", "auxpd", "eth", "btc", "usdt", "usdc", "usd"];

function unsubscribeSecret() {
  return (
    process.env.UNSUBSCRIBE_SECRET ||
    process.env.CRON_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "auxite-unsubscribe-fallback"
  );
}
function unsubscribeToken(email) {
  return createHmac("sha256", unsubscribeSecret())
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 16);
}

async function hasDeposited(walletAddress) {
  if (!walletAddress) return false;
  const data = await redis.hgetall(`user:${walletAddress.toLowerCase()}:balance`);
  if (!data) return false;
  for (const k of ASSET_KEYS) {
    if (parseFloat(String(data[k] || 0)) > 0) return true;
  }
  return false;
}
async function getKycStatus(walletAddress) {
  if (!walletAddress) return "none";
  const raw = await redis.get(`kyc:${walletAddress.toLowerCase()}`);
  if (!raw) return "none";
  try {
    const k = typeof raw === "string" ? JSON.parse(raw) : raw;
    return k?.status || "none";
  } catch {
    return "none";
  }
}
async function isSuppressed(email) {
  return (await redis.sismember(SUPPRESSION_SET, email)) === 1;
}
async function recentlySent(email) {
  const at = await redis.get(`${CAMPAIGN_LOG}:${email}`);
  if (!at) return false;
  const ts = parseInt(String(at), 10);
  return Date.now() - ts < RECENT_TTL_DAYS * 24 * 60 * 60 * 1000;
}
async function markSent(email, stage) {
  await redis.set(`${CAMPAIGN_LOG}:${email}`, Date.now(), {
    ex: RECENT_TTL_DAYS * 24 * 60 * 60,
  });
  await redis.lpush(
    "email:winback:log",
    JSON.stringify({ email, stage, ts: Date.now() })
  );
  await redis.ltrim("email:winback:log", 0, 9999);
}

// ── Audience builder ─────────────────────────────────────────────────────────
async function buildAudience() {
  const cohort2 = []; // signed up ≥14d, no KYC, no deposit
  const cohort3 = []; // KYC approved, no deposit

  const authKeys = await redis.keys("auth:user:*");
  console.log(`Scanning ${authKeys.length} users…`);

  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  for (const key of authKeys) {
    const data = await redis.hgetall(key);
    if (!data || !data.email) continue;

    const email = String(data.email).toLowerCase().trim();
    const addr = String(data.walletAddress || "").toLowerCase();
    const lang = data.language || "en";
    const createdAt = parseInt(String(data.createdAt || "0"), 10);
    const ageDays = createdAt ? Math.floor((now - createdAt) / DAY) : 0;

    const kyc = await getKycStatus(addr);
    const deposited = await hasDeposited(addr);

    if (deposited) continue;

    if (kyc === "approved") {
      cohort3.push({ email, lang, ageDays, walletAddress: addr });
    } else if (kyc === "none" && ageDays >= 14) {
      cohort2.push({ email, lang, ageDays, walletAddress: addr });
    }
  }

  return { cohort2, cohort3 };
}

async function filterSendable(recipients) {
  const out = [];
  const skipped = { suppressed: 0, recentlySent: 0 };
  for (const r of recipients) {
    if (await isSuppressed(r.email)) {
      skipped.suppressed++;
      continue;
    }
    if (await recentlySent(r.email)) {
      skipped.recentlySent++;
      continue;
    }
    out.push(r);
  }
  return { sendable: out, skipped };
}

// ── Send ─────────────────────────────────────────────────────────────────────

// Strip HTML to plain text for the multipart alternative. Spam filters
// (esp. Gmail) score significantly higher when only HTML is present.
function htmlToPlainText(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/h\d>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&middot;/g, "·")
    .replace(/&nbsp;/g, " ").replace(/&mdash;/g, "—").replace(/&ndash;/g, "–")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .split("\n").map((l) => l.trim()).join("\n")
    .trim();
}

async function sendOne(template, recipient, stage) {
  const unsubToken = unsubscribeToken(recipient.email);
  const { subject, html } = template.getWinbackEmail(
    stage,
    recipient.lang,
    recipient.email,
    unsubToken
  );
  const text = htmlToPlainText(html);

  // Gmail bulk-sender compliance (Feb 2024):
  // - List-Unsubscribe must include BOTH mailto and https
  // - List-Unsubscribe-Post must be "List-Unsubscribe=One-Click"
  const unsubUrl = `https://vault.auxite.io/unsubscribe?email=${encodeURIComponent(recipient.email)}&token=${unsubToken}`;
  const headers = {
    "List-Unsubscribe": `<mailto:unsubscribe@auxite.io?subject=unsubscribe&body=${encodeURIComponent(recipient.email)}>, <${unsubUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };

  if (DRY_RUN) {
    console.log(`[DRY] would send to ${recipient.email} (lang=${recipient.lang}, stage=${stage})`);
    return { ok: true };
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: recipient.email,
      subject,
      html,
      text,
      headers,
    });
    if (error) return { ok: false, error: error.message || String(error) };
    await markSent(recipient.email, stage);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const template = await loadTemplates();

  // Test mode: send to a single email, both cohort templates
  if (TEST_EMAIL) {
    console.log(`TEST MODE — sending both cohort templates to ${TEST_EMAIL}`);
    for (const stage of ["cohort2_no_kyc", "cohort3_kyc_done"]) {
      const recipient = { email: TEST_EMAIL, lang: "en", ageDays: 30, walletAddress: "" };
      const result = await sendOne(template, recipient, stage);
      console.log(`  ${stage}: ${result.ok ? "OK" : "FAIL " + result.error}`);
    }
    return;
  }

  const { cohort2, cohort3 } = await buildAudience();
  console.log(`Raw cohort sizes: cohort2=${cohort2.length}, cohort3=${cohort3.length}`);

  const stages = [];
  if (COHORT === "2" || COHORT === "all") {
    stages.push({ name: "cohort2_no_kyc", list: cohort2 });
  }
  if (COHORT === "3" || COHORT === "all") {
    stages.push({ name: "cohort3_kyc_done", list: cohort3 });
  }

  let totalSent = 0;
  let totalFailed = 0;

  for (const { name, list } of stages) {
    const { sendable, skipped } = await filterSendable(list);
    console.log(`\n[${name}] raw=${list.length} sendable=${sendable.length} suppressed=${skipped.suppressed} recentlySent=${skipped.recentlySent}`);
    const slice = sendable.slice(0, LIMIT);
    console.log(`  will send to ${slice.length} (limit=${LIMIT === Infinity ? "none" : LIMIT})`);

    let i = 0;
    for (const r of slice) {
      i++;
      const result = await sendOne(template, r, name);
      if (result.ok) totalSent++;
      else { totalFailed++; console.error(`  FAIL ${r.email}: ${result.error}`); }
      // Small jitter to avoid burst rate limits (Resend ~10/s default)
      if (!DRY_RUN && i % 8 === 0) await new Promise((res) => setTimeout(res, 1000));
    }
  }

  console.log(`\n${DRY_RUN ? "[DRY RUN] " : ""}Done. sent=${totalSent} failed=${totalFailed}`);
  if (DRY_RUN) console.log("Pass --send to actually send.");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
