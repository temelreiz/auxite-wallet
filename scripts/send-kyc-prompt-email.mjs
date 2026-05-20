// scripts/send-kyc-prompt-email.mjs
// Email campaign for users who signed up but haven't completed KYC.
// Targets auth:user:* records where:
//   - has email
//   - has walletAddress
//   - kyc:{wallet}.status NOT IN ('approved', 'verified', 'enhanced')
//   - NOT in email:suppressed
//   - NOT in email:kycprompt:sent:{email}  (30d guard)
//
// DRY-RUN BY DEFAULT. --send to deliver.
//
// Usage:
//   node scripts/send-kyc-prompt-email.mjs                 # dry, all
//   node scripts/send-kyc-prompt-email.mjs --limit=10      # dry, sample
//   node scripts/send-kyc-prompt-email.mjs --send          # live, all
//   node scripts/send-kyc-prompt-email.mjs --test=you@x.com --send

import { Redis } from "@upstash/redis";
import { Resend } from "resend";
import { createHmac } from "crypto";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { getEmailContent } from "./kyc-prompt-content.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env.local") });

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    if (!a.startsWith("--")) return [a, true];
    const [k, v] = a.slice(2).split("=");
    return [k, v ?? true];
  }),
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
const CAMPAIGN_LOG_KEY = "email:kycprompt:sent";
const CAMPAIGN_LIST_KEY = "email:kycprompt:log";
const RECENT_TTL_DAYS = 30;

const SUPPORTED_LANGS = ["en", "tr", "de", "fr", "ar", "ru"];
const VERIFIED_STATUSES = new Set(["approved", "verified", "enhanced"]);

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
  return !!(await redis.get(`${CAMPAIGN_LOG_KEY}:${email}`));
}
async function markSent(email, lang) {
  await redis.set(`${CAMPAIGN_LOG_KEY}:${email}`, Date.now(), {
    ex: RECENT_TTL_DAYS * 24 * 60 * 60,
  });
  await redis.lpush(CAMPAIGN_LIST_KEY, JSON.stringify({ email, lang, ts: Date.now() }));
  await redis.ltrim(CAMPAIGN_LIST_KEY, 0, 99999);
}

async function getKycStatus(walletAddress) {
  if (!walletAddress) return "none";
  try {
    const raw = await redis.get(`kyc:${walletAddress.toLowerCase()}`);
    if (!raw) return "none";
    const k = typeof raw === "string" ? JSON.parse(raw) : raw;
    return (k?.status || "none").toLowerCase();
  } catch { return "none"; }
}

function htmlToPlainText(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/h\d>/gi, "\n\n")
    .replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi, "$2 ($1)")
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
    return [{ email: TEST_EMAIL.toLowerCase(), lang: "en", walletAddress: "" }];
  }
  const keys = await redis.keys("auth:user:*");
  console.log(`Scanning ${keys.length} user records…`);

  const out = [];
  let stats = { noEmail: 0, noWallet: 0, kycVerified: 0 };

  for (const k of keys) {
    const data = await redis.hgetall(k);
    if (!data || !data.email) { stats.noEmail++; continue; }
    const email = String(data.email).toLowerCase().trim();
    if (!email.includes("@")) { stats.noEmail++; continue; }

    const walletAddress = String(data.walletAddress || "").trim();
    if (!walletAddress) { stats.noWallet++; continue; }

    const kycStatus = await getKycStatus(walletAddress);
    if (VERIFIED_STATUSES.has(kycStatus)) { stats.kycVerified++; continue; }

    const lang = (data.language && SUPPORTED_LANGS.includes(data.language)) ? data.language : "en";
    out.push({ email, lang, walletAddress, kycStatus });
  }
  console.log(`  no email:           ${stats.noEmail}`);
  console.log(`  no wallet:          ${stats.noWallet}`);
  console.log(`  already verified:   ${stats.kycVerified}`);
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
      { name: "campaign", value: "kyc_prompt_v1" },
      { name: "language", value: recipient.lang },
    ],
  });
  if (error) throw new Error(error?.message || JSON.stringify(error));
  return data?.id;
}

async function main() {
  console.log(`\n${"━".repeat(72)}`);
  console.log(`📧 KYC Prompt Email — ${DRY_RUN ? "DRY-RUN" : "LIVE SEND"}`);
  console.log(`${"━".repeat(72)}\n`);

  const audience = await buildAudience();
  console.log(`\nKYC-incomplete audience: ${audience.length}`);

  // Dedup by email
  const seen = new Set();
  const unique = audience.filter((r) => {
    if (seen.has(r.email)) return false;
    seen.add(r.email);
    return true;
  });

  // Filter suppressed + recent
  const sendable = [];
  let skippedSuppressed = 0;
  let skippedRecent = 0;
  for (const r of unique) {
    if (await isSuppressed(r.email)) { skippedSuppressed++; continue; }
    if (await recentlySent(r.email)) { skippedRecent++; continue; }
    sendable.push(r);
  }

  const limited = sendable.slice(0, LIMIT);
  console.log(`After dedup:           ${unique.length}`);
  console.log(`After suppression:     ${unique.length - skippedSuppressed}  (skipped ${skippedSuppressed})`);
  console.log(`After recent guard:    ${sendable.length}  (skipped ${skippedRecent})`);
  console.log(`Will send to:          ${limited.length}\n`);

  const byLang = { en: 0, tr: 0, de: 0, fr: 0, ar: 0, ru: 0 };
  for (const r of limited) byLang[r.lang] = (byLang[r.lang] || 0) + 1;
  console.log("Language breakdown:");
  for (const [k, v] of Object.entries(byLang)) {
    if (v > 0) console.log(`  ${k}: ${v}`);
  }
  console.log("");

  if (DRY_RUN) {
    console.log("Sample (first 5):");
    for (const r of limited.slice(0, 5)) {
      console.log(`  [${r.lang}] ${r.email}  kyc=${r.kycStatus}  wallet=${r.walletAddress?.slice(0, 10)}…`);
    }
    console.log("\n💡 DRY-RUN. Add --send to deliver.\n");
    return;
  }

  let sent = 0, failed = 0;
  for (const r of limited) {
    try {
      await sendOne(r);
      await markSent(r.email, r.lang);
      sent++;
      if (sent % 25 === 0) console.log(`  Progress: ${sent}/${limited.length}`);
      await new Promise((res) => setTimeout(res, 110)); // ~9/sec
    } catch (e) {
      failed++;
      console.error(`  FAILED ${r.email}:`, e?.message || e);
    }
  }

  console.log(`\n${"━".repeat(72)}`);
  console.log(`Done. Sent ${sent}, failed ${failed}.`);
  console.log(`${"━".repeat(72)}\n`);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
