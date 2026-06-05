// scripts/export-customer-match-gmail-only.mjs
// Cleaner Customer Match export — keeps only mainstream email providers
// that Google can actually match (Gmail/iCloud/Outlook/Hotmail/Yahoo).
//
// Background: the first Lite-launch CSV (1479 rows) included Asia exotic
// domains (@qq.com, @139.com, @126.com, @hanmail.net, etc.) that Google
// can't match because they're not tied to Google accounts. Match rate
// came back at ~14%.
//
// This export skips those domains so the resulting list is smaller but
// has a much higher hit ratio (target: 50-70%).
//
// Splits into TWO output CSVs by KYC status:
//   1. customer-match-verified-gmail.csv  — KYC approved users (high LTV)
//   2. customer-match-pending-gmail.csv   — KYC pending/none (re-engagement)
//
// Output dir: scripts/out/

import { Redis } from "@upstash/redis";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { writeFileSync, mkdirSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env.local") });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Domains Google's Customer Match algorithm can actually resolve. The
// list is conservative — only providers that meaningfully overlap with
// Google account ownership. @qq.com, @139.com etc. are excluded because
// their users are overwhelmingly not on Google accounts.
const ALLOWED_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "yahoo.co.uk",
  "yahoo.fr",
  "yahoo.de",
  "yahoo.com.tr",
  "yahoo.it",
  "yahoo.es",
  "ymail.com",
  "rocketmail.com",
  "protonmail.com",
  "proton.me",
  "aol.com",
  // Some regional providers with decent Google overlap
  "gmx.com", "gmx.de", "gmx.net",
  "web.de",
  "t-online.de",
  "orange.fr",
  "wanadoo.fr",
  "free.fr",
  "libero.it",
  "virgilio.it",
  "mail.ru",
  "yandex.ru",
  "yandex.com",
]);

const VERIFIED_STATUSES = new Set(["approved", "verified", "enhanced"]);

function normalizePhone(raw) {
  if (!raw) return "";
  const cleaned = String(raw).replace(/[^\d+]/g, "");
  if (!cleaned) return "";
  return cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
}

function normalizeName(raw) {
  if (!raw) return "";
  return String(raw).trim().toLowerCase();
}

function getDomain(email) {
  const at = email.lastIndexOf("@");
  if (at === -1) return "";
  return email.slice(at + 1).toLowerCase();
}

async function getKycStatus(walletAddress) {
  if (!walletAddress) return "none";
  try {
    const raw = await redis.get(`kyc:${walletAddress.toLowerCase()}`);
    if (!raw) return "none";
    const k = typeof raw === "string" ? JSON.parse(raw) : raw;
    return (k?.status || "none").toLowerCase();
  } catch {
    return "none";
  }
}

function csvRow(r) {
  return [r.email, r.phone, r.firstName, r.lastName, r.country]
    .map((v) => (String(v).includes(",") ? `"${v}"` : v))
    .join(",");
}

async function main() {
  console.log("Scanning auth:user:* records…");
  const keys = await redis.keys("auth:user:*");
  console.log(`Total user records: ${keys.length}\n`);

  const verifiedRows = [];
  const pendingRows = [];
  const domainCount = {};
  let stats = {
    noEmail: 0,
    invalidEmail: 0,
    domainSkipped: 0,
    noWallet: 0,
    verified: 0,
    pending: 0,
  };

  for (const k of keys) {
    const data = await redis.hgetall(k);
    if (!data || !data.email) { stats.noEmail++; continue; }
    const email = String(data.email).toLowerCase().trim();
    if (!email.includes("@")) { stats.invalidEmail++; continue; }

    const domain = getDomain(email);
    domainCount[domain] = (domainCount[domain] || 0) + 1;
    if (!ALLOWED_DOMAINS.has(domain)) { stats.domainSkipped++; continue; }

    const walletAddress = String(data.walletAddress || "").trim();
    const kycStatus = walletAddress ? await getKycStatus(walletAddress) : "none";

    const row = {
      email,
      phone: normalizePhone(data?.phone || ""),
      firstName: normalizeName(data?.firstName || ""),
      lastName: normalizeName(data?.lastName || ""),
      country: (data?.country || data?.nationality || "").toUpperCase().slice(0, 2),
    };

    if (VERIFIED_STATUSES.has(kycStatus)) {
      verifiedRows.push(row);
      stats.verified++;
    } else {
      pendingRows.push(row);
      stats.pending++;
    }
  }

  const outDir = resolve(__dirname, "out");
  mkdirSync(outDir, { recursive: true });
  const header = "Email,Phone,First Name,Last Name,Country";

  const verifiedPath = resolve(outDir, "customer-match-verified-gmail.csv");
  const pendingPath = resolve(outDir, "customer-match-pending-gmail.csv");
  writeFileSync(verifiedPath, header + "\n" + verifiedRows.map(csvRow).join("\n") + "\n");
  writeFileSync(pendingPath, header + "\n" + pendingRows.map(csvRow).join("\n") + "\n");

  // Domain distribution top 20 (helps tune ALLOWED_DOMAINS later)
  const topDomains = Object.entries(domainCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  console.log("Filter stats:");
  console.log(`  No email:              ${stats.noEmail}`);
  console.log(`  Invalid email:         ${stats.invalidEmail}`);
  console.log(`  Domain skipped (non-Google-matchable): ${stats.domainSkipped}`);
  console.log(`  KYC verified (kept):   ${stats.verified}`);
  console.log(`  KYC pending (kept):    ${stats.pending}`);
  console.log("");
  console.log("Top 20 email domains:");
  for (const [d, c] of topDomains) {
    const allowed = ALLOWED_DOMAINS.has(d) ? "✓" : "✗";
    console.log(`  ${allowed} ${d.padEnd(28)} ${c}`);
  }
  console.log("");
  console.log("Output:");
  console.log(`  ${verifiedPath}  (${verifiedRows.length} rows)`);
  console.log(`  ${pendingPath}   (${pendingRows.length} rows)`);
  console.log("");
  console.log("Upload steps:");
  console.log("  Google Ads → Tools → Audience Manager → + → Customer list");
  console.log("  Name: 'Auxite Verified Users — Gmail Only'  (verified.csv)");
  console.log("  Name: 'Auxite Pending KYC — Gmail Only'     (pending.csv)");
  console.log("  Customer data type: 'Audience for engagement and acquisition'");
  console.log("  Data type: 'Unhashed plain text'");
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
