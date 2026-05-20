// scripts/export-customer-match-csv.mjs
// Exports a Google Ads Customer Match-compatible CSV from the lite-launch
// email cohort (1479 recipients). Google Ads accepts plaintext emails and
// SHA-256 hashes them server-side, but we also include first/last name
// and phone where available to boost match rate (40-50% → 70-80%).
//
// Output: scripts/out/customer-match-lite-launch.csv
//
// Usage:
//   node scripts/export-customer-match-csv.mjs

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

function normalizePhone(raw) {
  if (!raw) return "";
  // E.164 format Google wants: +<country><number>, no spaces, no dashes
  const cleaned = String(raw).replace(/[^\d+]/g, "");
  if (!cleaned) return "";
  return cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
}

function normalizeName(raw) {
  if (!raw) return "";
  // Strip accents lightly, lowercase — Google normalizes too but match
  // is better when input is already clean.
  return String(raw).trim().toLowerCase();
}

async function main() {
  console.log("Pulling lite-launch cohort from Redis…");
  const logs = await redis.lrange("email:litelaunch:log", 0, 99999);
  console.log(`Cohort size: ${logs.length}`);

  const rows = [];
  let withPhone = 0;
  let withName = 0;

  for (const entry of logs) {
    const log = typeof entry === "string" ? JSON.parse(entry) : entry;
    const email = String(log.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) continue;

    // Look up the full auth record for richer match signals
    const auth = await redis.hgetall(`auth:user:${email}`);
    const firstName = normalizeName(auth?.firstName || "");
    const lastName = normalizeName(auth?.lastName || "");
    const phone = normalizePhone(auth?.phone || "");
    const country = (auth?.country || auth?.nationality || "").toUpperCase().slice(0, 2);

    if (phone) withPhone++;
    if (firstName || lastName) withName++;

    rows.push({ email, firstName, lastName, phone, country });
  }

  // Build CSV per Google Ads spec — column names matter (exact strings).
  // https://support.google.com/google-ads/answer/7659867
  const header = "Email,Phone,First Name,Last Name,Country";
  const csvLines = [header];
  for (const r of rows) {
    csvLines.push(
      [
        r.email,
        r.phone,
        r.firstName,
        r.lastName,
        r.country,
      ]
        .map((v) => (String(v).includes(",") ? `"${v}"` : v))
        .join(","),
    );
  }

  const outDir = resolve(__dirname, "out");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "customer-match-lite-launch.csv");
  writeFileSync(outPath, csvLines.join("\n") + "\n");

  console.log(`\nWrote ${rows.length} rows to:\n  ${outPath}`);
  console.log(`  With phone:    ${withPhone}`);
  console.log(`  With name:     ${withName}`);
  console.log("\nUpload this CSV to:");
  console.log(
    "  Google Ads → Tools & Settings → Audience Manager →",
    "+ → Customer List → Upload",
  );
  console.log(
    "  Customer data type: 'Audience for engagement and acquisition'",
  );
  console.log("  Data type: 'Unhashed plain text' (Google hashes server-side)");
  console.log("  Name: 'Auxite Email List — Lite Launch v1'");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
