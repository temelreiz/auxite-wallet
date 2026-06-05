// scripts/send-deposit-live-push.mjs
// Broadcast push: "deposits now credit instantly" announcement. Per-user
// language lookup, deep-links to the funding screen. Targets every wallet in
// `push:mobile:all_users`.
//
// DRY-RUN BY DEFAULT. Pass --send to actually deliver.
// Recent-send guard: `push:depositlive:sent:{wallet}` (TTL 30 days).
//
// Usage:
//   node scripts/send-deposit-live-push.mjs                  # dry-run, all
//   node scripts/send-deposit-live-push.mjs --limit=5        # dry-run sample
//   node scripts/send-deposit-live-push.mjs --send           # send to everyone
//   node scripts/send-deposit-live-push.mjs --test=0x.. --send # one wallet

import { Redis } from "@upstash/redis";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { getPushContent } from "./deposit-claim-content.mjs";

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
const TEST_WALLET = args.test ? String(args.test) : null;

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const RECENT_TTL_SECONDS = 30 * 24 * 60 * 60;
const SUPPORTED_LANGS = ["en", "tr", "de", "fr", "ar", "ru"];

async function getUserLanguageByWallet(walletAddress) {
  try {
    const normalized = walletAddress.toLowerCase();
    const userId = await redis.get(`user:address:${normalized}`);
    if (userId) {
      const userData = await redis.hgetall(`user:${userId}`);
      if (userData?.language && SUPPORTED_LANGS.includes(userData.language)) {
        return userData.language;
      }
      if (userData?.email) {
        const authData = await redis.hgetall(
          `auth:user:${String(userData.email).toLowerCase()}`
        );
        if (authData?.language && SUPPORTED_LANGS.includes(authData.language)) {
          return authData.language;
        }
      }
    }
    const walletData = await redis.hgetall(`user:${normalized}`);
    if (walletData?.language && SUPPORTED_LANGS.includes(walletData.language)) {
      return walletData.language;
    }
  } catch {
    // silent — fall through to default
  }
  return "en";
}

async function getTokensForWallet(walletAddress) {
  const raw = await redis.get(`push:mobile:${walletAddress.toLowerCase()}`);
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function alreadySent(walletAddress) {
  const v = await redis.get(`push:depositlive:sent:${walletAddress.toLowerCase()}`);
  return !!v;
}

async function markSent(walletAddress) {
  await redis.set(`push:depositlive:sent:${walletAddress.toLowerCase()}`, Date.now(), {
    ex: RECENT_TTL_SECONDS,
  });
}

async function sendExpoBatch(messages) {
  if (messages.length === 0) return [];
  const res = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
    },
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
  console.log(`📥 Deposit-Live Push — ${DRY_RUN ? "DRY-RUN" : "LIVE SEND"}`);
  console.log(`${"━".repeat(72)}\n`);

  let allWallets;
  if (TEST_WALLET) {
    allWallets = [TEST_WALLET];
    console.log(`Test mode: single wallet ${TEST_WALLET}`);
  } else {
    allWallets = await redis.smembers("push:mobile:all_users");
    console.log(`Total registered wallets: ${allWallets.length}`);
  }

  const limited = allWallets.slice(0, LIMIT);
  if (limited.length < allWallets.length) {
    console.log(`Limiting to first ${limited.length} (--limit=${LIMIT})\n`);
  } else {
    console.log("");
  }

  let skippedAlreadySent = 0;
  let skippedNoTokens = 0;
  let messagesByLang = { en: 0, tr: 0, de: 0, fr: 0, ar: 0, ru: 0 };
  let totalDevices = 0;
  let totalSent = 0;
  let totalFailed = 0;
  const batch = [];
  const flushedWallets = [];

  for (const wallet of limited) {
    if (await alreadySent(wallet)) {
      skippedAlreadySent++;
      continue;
    }
    const tokens = await getTokensForWallet(wallet);
    if (tokens.length === 0) {
      skippedNoTokens++;
      continue;
    }
    const lang = await getUserLanguageByWallet(wallet);
    const { title, body } = getPushContent(lang);
    messagesByLang[lang] = (messagesByLang[lang] || 0) + 1;
    totalDevices += tokens.length;

    if (DRY_RUN) {
      console.log(
        `  [${lang}] ${wallet.slice(0, 10)}… → ${tokens.length} device(s) | "${title}"`
      );
      continue;
    }

    if (batch.length + tokens.length > 100 && batch.length > 0) {
      const tickets = await sendExpoBatch(batch);
      tickets.forEach((t) => { if (t.status === "ok") totalSent++; else totalFailed++; });
      const batchOk = tickets.every((t) => t.status === "ok");
      batch.length = 0;
      if (batchOk) for (const w of flushedWallets) await markSent(w);
      flushedWallets.length = 0;
    }

    for (const t of tokens) {
      batch.push({
        to: t.token,
        title,
        body,
        sound: "default",
        priority: "high",
        channelId: "default",
        data: {
          type: "campaign",
          category: "product",
          campaign: "deposit_claim_v1",
          route: "/fund-vault",
          timestamp: Date.now(),
        },
      });
    }
    flushedWallets.push(wallet);
  }

  if (!DRY_RUN && batch.length > 0) {
    const tickets = await sendExpoBatch(batch);
    tickets.forEach((t) => { if (t.status === "ok") totalSent++; else totalFailed++; });
    const batchOk = tickets.every((t) => t.status === "ok");
    if (batchOk) for (const w of flushedWallets) await markSent(w);
  }

  console.log(`\n${"━".repeat(72)}`);
  console.log("Summary:");
  console.log(`  Wallets considered:      ${limited.length}`);
  console.log(`  Skipped (already sent):  ${skippedAlreadySent}`);
  console.log(`  Skipped (no tokens):     ${skippedNoTokens}`);
  const reachable = limited.length - skippedAlreadySent - skippedNoTokens;
  console.log(`  Reachable wallets:       ${reachable}`);
  console.log(`  Total push devices:      ${totalDevices}`);
  console.log("  Language breakdown:");
  for (const [k, v] of Object.entries(messagesByLang)) {
    if (v > 0) console.log(`    ${k}: ${v}`);
  }
  if (!DRY_RUN) {
    console.log(`  Delivered (Expo OK):     ${totalSent}`);
    console.log(`  Failed:                  ${totalFailed}`);
  } else {
    console.log("\n  💡 This was a DRY-RUN. Add --send to actually deliver.");
  }
  console.log(`${"━".repeat(72)}\n`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
