// scripts/send-kyc-prompt-push.mjs
// Push notification campaign for users who signed up but haven't completed
// KYC. Targets wallets in push:mobile:all_users where kyc:{wallet}.status is
// NOT in ('approved', 'verified', 'enhanced'). Per-user language picked
// from Redis. Idempotent across reruns via push:kycprompt:sent:{wallet}.
//
// DRY-RUN BY DEFAULT. --send to actually deliver. --limit=N for staged tests.

import { Redis } from "@upstash/redis";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { getPushContent } from "./kyc-prompt-content.mjs";

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
const TEST_WALLET = args.test ? String(args.test) : null;

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const RECENT_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const SUPPORTED_LANGS = ["en", "tr", "de", "fr", "ar", "ru"];
const VERIFIED_STATUSES = new Set(["approved", "verified", "enhanced"]);

async function getKycStatus(walletAddress) {
  try {
    const raw = await redis.get(`kyc:${walletAddress.toLowerCase()}`);
    if (!raw) return "none";
    const k = typeof raw === "string" ? JSON.parse(raw) : raw;
    return (k?.status || "none").toLowerCase();
  } catch {
    return "none";
  }
}

async function getUserLanguageByWallet(walletAddress) {
  try {
    const normalized = walletAddress.toLowerCase();
    const userId = await redis.get(`user:address:${normalized}`);
    if (userId) {
      const userData = await redis.hgetall(`user:${userId}`);
      if (userData?.language && SUPPORTED_LANGS.includes(userData.language)) return userData.language;
      if (userData?.email) {
        const authData = await redis.hgetall(`auth:user:${String(userData.email).toLowerCase()}`);
        if (authData?.language && SUPPORTED_LANGS.includes(authData.language)) return authData.language;
      }
    }
    const walletData = await redis.hgetall(`user:${normalized}`);
    if (walletData?.language && SUPPORTED_LANGS.includes(walletData.language)) return walletData.language;
  } catch {}
  return "en";
}

async function getTokensForWallet(walletAddress) {
  const raw = await redis.get(`push:mobile:${walletAddress.toLowerCase()}`);
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

async function alreadySent(walletAddress) {
  const v = await redis.get(`push:kycprompt:sent:${walletAddress.toLowerCase()}`);
  return !!v;
}
async function markSent(walletAddress) {
  await redis.set(`push:kycprompt:sent:${walletAddress.toLowerCase()}`, Date.now(), {
    ex: RECENT_TTL_SECONDS,
  });
}

async function sendExpoBatch(messages) {
  if (messages.length === 0) return [];
  const res = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "Accept-Encoding": "gzip, deflate" },
    body: JSON.stringify(messages),
  });
  if (!res.ok) {
    console.error(`[Expo] HTTP ${res.status}:`, await res.text());
    return messages.map(() => ({ status: "error", message: `HTTP ${res.status}` }));
  }
  const data = await res.json();
  return data?.data || [];
}

async function main() {
  console.log(`\n${"━".repeat(72)}`);
  console.log(`🪙 KYC Prompt Push — ${DRY_RUN ? "DRY-RUN" : "LIVE SEND"}`);
  console.log(`${"━".repeat(72)}\n`);

  let allWallets;
  if (TEST_WALLET) {
    allWallets = [TEST_WALLET];
    console.log(`Test mode: single wallet ${TEST_WALLET}`);
  } else {
    allWallets = await redis.smembers("push:mobile:all_users");
    console.log(`Total registered wallets: ${allWallets.length}`);
  }

  let skippedAlreadySent = 0;
  let skippedNoTokens = 0;
  let skippedKycVerified = 0;
  let messagesByLang = { en: 0, tr: 0, de: 0, fr: 0, ar: 0, ru: 0 };
  let totalDevices = 0;
  let totalSent = 0;
  let totalFailed = 0;
  const targetWallets = [];
  const batch = [];

  for (const wallet of allWallets) {
    // Filter: skip already KYC'd
    const kycStatus = await getKycStatus(wallet);
    if (VERIFIED_STATUSES.has(kycStatus)) {
      skippedKycVerified++;
      continue;
    }
    // Filter: skip if no push tokens
    const tokens = await getTokensForWallet(wallet);
    if (tokens.length === 0) { skippedNoTokens++; continue; }
    // Filter: skip recent sends (30d guard)
    if (await alreadySent(wallet)) { skippedAlreadySent++; continue; }

    targetWallets.push({ wallet, tokens });
    if (targetWallets.length >= LIMIT) break;
  }

  console.log(`\nAfter filters:`);
  console.log(`  Skipped already KYC verified: ${skippedKycVerified}`);
  console.log(`  Skipped no push tokens:        ${skippedNoTokens}`);
  console.log(`  Skipped already sent:          ${skippedAlreadySent}`);
  console.log(`  Reachable target wallets:      ${targetWallets.length}\n`);

  for (const { wallet, tokens } of targetWallets) {
    const lang = await getUserLanguageByWallet(wallet);
    const { title, body } = getPushContent(lang);
    messagesByLang[lang] = (messagesByLang[lang] || 0) + 1;
    totalDevices += tokens.length;

    if (DRY_RUN) {
      console.log(`  [${lang}] ${wallet.slice(0, 10)}… → ${tokens.length} device(s) | "${title}"`);
      continue;
    }

    for (const t of tokens) {
      batch.push({
        to: t.token,
        title, body,
        sound: "default",
        priority: "high",
        channelId: "default",
        data: { type: "campaign", category: "kyc_prompt", campaign: "kyc_prompt_v1", timestamp: Date.now() },
      });
    }
    if (batch.length >= 100) {
      const tickets = await sendExpoBatch(batch);
      tickets.forEach((t) => { if (t.status === "ok") totalSent++; else totalFailed++; });
      batch.length = 0;
    }
  }

  if (!DRY_RUN && batch.length > 0) {
    const tickets = await sendExpoBatch(batch);
    tickets.forEach((t) => { if (t.status === "ok") totalSent++; else totalFailed++; });
  }
  if (!DRY_RUN) {
    for (const { wallet } of targetWallets) {
      await markSent(wallet);
    }
  }

  console.log(`\n${"━".repeat(72)}`);
  console.log("Summary:");
  console.log(`  Total wallets scanned:       ${allWallets.length}`);
  console.log(`  Target wallets:              ${targetWallets.length}`);
  console.log(`  Total push devices:          ${totalDevices}`);
  console.log("  Language breakdown:");
  for (const [k, v] of Object.entries(messagesByLang)) {
    if (v > 0) console.log(`    ${k}: ${v}`);
  }
  if (!DRY_RUN) {
    console.log(`  Delivered (Expo OK):         ${totalSent}`);
    console.log(`  Failed:                      ${totalFailed}`);
  } else {
    console.log("\n  💡 DRY-RUN. Add --send to deliver.");
  }
  console.log(`${"━".repeat(72)}\n`);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
