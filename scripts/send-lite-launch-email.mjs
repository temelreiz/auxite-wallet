// scripts/send-lite-launch-email.mjs
// One-shot email campaign for the "Auxite Lite is live" launch.
// Targets every auth:user:* entry that:
//   - has an email
//   - is NOT in email:suppressed
//   - was NOT already sent the lite-launch email (30d guard)
//
// Per-user language picked from auth:user.{language} (fallback en).
// Gmail bulk-sender compliance preserved (List-Unsubscribe + One-Click).
//
// DRY-RUN BY DEFAULT. Pass --send to actually deliver.
//
// Usage:
//   node scripts/send-lite-launch-email.mjs                       # dry-run, full audience
//   node scripts/send-lite-launch-email.mjs --limit=5             # dry, 5 sample
//   node scripts/send-lite-launch-email.mjs --limit=5 --send      # send 5
//   node scripts/send-lite-launch-email.mjs --send                # send all
//   node scripts/send-lite-launch-email.mjs --test=you@example.com  # 1 to yourself

import { Redis } from "@upstash/redis";
import { Resend } from "resend";
import { createHmac } from "crypto";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { getEmailContent } from "./lite-launch-content.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env.local") });

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    if (!a.startsWith("--")) return [a, true];
    const [k, v] = a.slice(2).split("=");
    return [k, v ?? true];
  })
);
const DRY_RUN = !args.send;
const LIMIT = args.limit ? parseInt(String(args.limit), 10) : Infinity;
const TEST_EMAIL = args.test ? String(args.test) : null;

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = `Auxite <${process.env.FROM_EMAIL || "noreply@auxite.io"}>`;
const REPLY_TO = process.env.REPLY_TO_EMAIL || "support@auxite.io";

const SUPPRESSION_SET = "email:suppressed";
const CAMPAIGN_LOG_KEY = "email:litelaunch:sent";
const CAMPAIGN_LIST_KEY = "email:litelaunch:log";
const RECENT_TTL_DAYS = 30;

const SUPPORTED_LANGS = ["en", "tr", "de", "fr", "ar", "ru"];

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
async function isSuppressed(email) {
  return (await redis.sismember(SUPPRESSION_SET, email)) === 1;
}
async function recentlySent(email) {
  const v = await redis.get(`${CAMPAIGN_LOG_KEY}:${email}`);
  return !!v;
}
async function markSent(email, lang) {
  await redis.set(`${CAMPAIGN_LOG_KEY}:${email}`, Date.now(), {
    ex: RECENT_TTL_DAYS * 24 * 60 * 60,
  });
  await redis.lpush(
    CAMPAIGN_LIST_KEY,
    JSON.stringify({ email, lang, ts: Date.now() })
  );
  await redis.ltrim(CAMPAIGN_LIST_KEY, 0, 99999);
}

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

async function buildAudience() {
  if (TEST_EMAIL) {
    return [{ email: TEST_EMAIL.toLowerCase(), lang: "en" }];
  }
  const keys = await redis.keys("auth:user:*");
  console.log(`Scanning ${keys.length} user records…`);
  const out = [];
  for (const k of keys) {
    const data = await redis.hgetall(k);
    if (!data || !data.email) continue;
    const email = String(data.email).toLowerCase().trim();
    if (!email.includes("@")) continue;
    let lang = (data.language && SUPPORTED_LANGS.includes(data.language)) ? data.language : "en";
    out.push({ email, lang });
  }
  return out;
}

async function sendOne(recipient) {
  const unsubToken = unsubscribeToken(recipient.email);
  const { subject, html } = getEmailContent(recipient.lang, recipient.email, unsubToken);
  const text = htmlToPlainText(html);

  const unsubUrl = `https://vault.auxite.io/unsubscribe?email=${encodeURIComponent(recipient.email)}&token=${unsubToken}`;
  const headers = {
    "List-Unsubscribe": `<mailto:unsubscribe@auxite.io?subject=unsubscribe&body=${encodeURIComponent(recipient.email)}>, <${unsubUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: recipient.email,
    replyTo: REPLY_TO,
    subject,
    html,
    text,
    headers,
    tags: [
      { name: "campaign", value: "lite_launch_v1" },
      { name: "language", value: recipient.lang },
    ],
  });
  if (error) throw new Error(error?.message || JSON.stringify(error));
  return data?.id;
}

async function main() {
  console.log(`\n${"━".repeat(72)}`);
  console.log(`📧 Auxite Lite Launch Email — ${DRY_RUN ? "DRY-RUN" : "LIVE SEND"}`);
  console.log(`${"━".repeat(72)}\n`);

  const audience = await buildAudience();
  console.log(`Audience: ${audience.length} email(s)`);

  // Dedup by email (in case same email appears in multiple records)
  const seen = new Set();
  const unique = audience.filter((r) => {
    if (seen.has(r.email)) return false;
    seen.add(r.email);
    return true;
  });
  console.log(`After dedup: ${unique.length}`);

  // Filter sendable
  const sendable = [];
  let skippedSuppressed = 0;
  let skippedRecent = 0;
  for (const r of unique) {
    if (await isSuppressed(r.email)) { skippedSuppressed++; continue; }
    if (await recentlySent(r.email)) { skippedRecent++; continue; }
    sendable.push(r);
  }

  const limited = sendable.slice(0, LIMIT);
  console.log(`Sendable after filters: ${sendable.length}`);
  if (limited.length < sendable.length) {
    console.log(`Limiting to first ${limited.length} (--limit=${LIMIT})`);
  }
  console.log(`Skipped suppressed: ${skippedSuppressed}`);
  console.log(`Skipped already sent: ${skippedRecent}\n`);

  const byLang = { en: 0, tr: 0, de: 0, fr: 0, ar: 0, ru: 0 };
  for (const r of limited) byLang[r.lang] = (byLang[r.lang] || 0) + 1;
  console.log("Language breakdown of recipients:");
  for (const [k, v] of Object.entries(byLang)) {
    if (v > 0) console.log(`  ${k}: ${v}`);
  }
  console.log("");

  if (DRY_RUN) {
    console.log("Sample (first 5):");
    for (const r of limited.slice(0, 5)) {
      console.log(`  [${r.lang}] ${r.email}`);
    }
    console.log("\n💡 This was a DRY-RUN. Add --send to actually deliver.\n");
    return;
  }

  let sent = 0;
  let failed = 0;
  for (const r of limited) {
    try {
      const id = await sendOne(r);
      await markSent(r.email, r.lang);
      sent++;
      if (sent % 25 === 0) console.log(`  Progress: ${sent}/${limited.length}`);
      // Resend free tier: 100/day. Paid: 10/sec. Gentle 100ms gap.
      await new Promise((res) => setTimeout(res, 110));
    } catch (e) {
      failed++;
      console.error(`  FAILED ${r.email}:`, e?.message || e);
    }
  }

  console.log(`\n${"━".repeat(72)}`);
  console.log(`Done. Sent ${sent}, failed ${failed}.`);
  console.log(`${"━".repeat(72)}\n`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
