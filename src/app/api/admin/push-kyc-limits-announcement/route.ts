// ============================================================================
// /api/admin/push-kyc-limits-announcement — soft-KYC easing announcement.
//
// Tells users they can now buy up to $500/tx (and $1000 in 30 days) WITHOUT
// completing KYC. Targets UNVERIFIED users only — verified users have no
// limit and would find the copy confusing.
//
// Localized to TR/EN/DE/FR/AR/RU via getUserLanguage(walletAddress) and
// batched 100 tokens/request through expo-push (same as push-yield-promo).
//
// Auth: CRON_SECRET (Bearer). Safety: dry-run by default; an actual send
// requires BOTH ?send=true AND ?confirm=yes. Default deep link → /fund-vault
// so the tap lands the user directly on the Buy with Card surface.
//
//   GET ?dry-run               → segment counts, sends nothing
//   GET ?send=true&confirm=yes → sends the localized push
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import { getUserLanguage } from "@/lib/user-language";
import { sendExpoPushBatch, type ExpoPushMessage } from "@/lib/expo-push";
import { isKycVerified } from "@/lib/kyc-limits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

type Copy = { title: string; body: string };
const COPY: Record<string, Copy> = {
  en: {
    title: "Buy without KYC — up to $500",
    body:
      "Skip the paperwork: spend up to $500 per purchase ($1,000/month) on gold, silver, platinum or palladium with just your email. Tap to buy.",
  },
  tr: {
    title: "KYC'siz $500'a kadar alım",
    body:
      "Belge yok: altın, gümüş, platin veya paladyumda işlem başına $500'a (ay boyunca $1.000'a) kadar sadece e-postanla satın al. Dokun → satın al.",
  },
  de: {
    title: "Bis $500 ohne KYC kaufen",
    body:
      "Keine Papiere: kauf Gold, Silber, Platin oder Palladium bis $500 pro Kauf ($1.000/Monat) nur mit deiner E-Mail. Antippen zum Kaufen.",
  },
  fr: {
    title: "Achetez sans KYC — jusqu'à 500 $",
    body:
      "Sans paperasse : achetez or, argent, platine ou palladium jusqu'à 500 $ par achat (1 000 $/mois) avec votre seul e-mail. Touchez pour acheter.",
  },
  ar: {
    title: "اشترِ بدون KYC حتى 500 دولار",
    body:
      "بدون أوراق: اشترِ الذهب أو الفضة أو البلاتين أو البلاديوم حتى 500 دولار لكل عملية شراء (1000 دولار شهريًا) ببريدك الإلكتروني فقط. اضغط للشراء.",
  },
  ru: {
    title: "Покупайте без KYC — до $500",
    body:
      "Без бумаг: покупайте золото, серебро, платину или палладий до $500 за покупку ($1 000/мес) только по email. Нажмите, чтобы купить.",
  },
};
const copyFor = (lang: string): Copy => COPY[lang] || COPY.en;

const CHUNK = 40;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = new URL(req.url).searchParams;
  const doSend = sp.get("send") === "true";
  const confirmed = sp.get("confirm") === "yes";

  const redis = getRedis();
  const wallets = (await redis.smembers("push:mobile:all_users")) as string[];

  // Resolve language + KYC status + tokens per wallet (parallel in chunks).
  // Skip verified users — the announcement is about removing friction for
  // the NOT-verified cohort; verified users would read "buy without KYC up
  // to $500" as a downgrade.
  type Entry = { token: string; lang: string };
  const entries: Entry[] = [];
  const byLangWallets: Record<string, number> = {};
  let skippedVerified = 0;
  let skippedNoToken = 0;

  for (let i = 0; i < wallets.length; i += CHUNK) {
    const slice = wallets.slice(i, i + CHUNK);
    await Promise.all(
      slice.map(async (w) => {
        try {
          if (await isKycVerified(w)) {
            skippedVerified++;
            return;
          }
          const lang = await getUserLanguage(w);
          byLangWallets[lang] = (byLangWallets[lang] || 0) + 1;
          const raw = await redis.get(`push:mobile:${String(w).toLowerCase()}`);
          const toks = typeof raw === "string" ? JSON.parse(raw) : Array.isArray(raw) ? raw : [];
          let added = 0;
          for (const t of toks) if (t?.token) { entries.push({ token: t.token, lang }); added++; }
          if (added === 0) skippedNoToken++;
        } catch {
          skippedNoToken++;
        }
      })
    );
  }

  const byLangTokens: Record<string, number> = {};
  for (const e of entries) byLangTokens[e.lang] = (byLangTokens[e.lang] || 0) + 1;

  const summary = {
    totalWallets: wallets.length,
    targetedWallets: Object.values(byLangWallets).reduce((a, b) => a + b, 0),
    targetedTokens: entries.length,
    skippedVerified,
    skippedNoToken,
    byLangWallets,
    byLangTokens,
    copyByLang: Object.fromEntries(Object.keys(byLangTokens).map((l) => [l, copyFor(l)])),
  };

  // Dry-run (default): report only.
  if (!doSend) {
    return NextResponse.json({ dryRun: true, ...summary });
  }
  if (!confirmed) {
    return NextResponse.json(
      { error: "Refusing to send: pass &confirm=yes together with &send=true", ...summary },
      { status: 400 }
    );
  }

  // Build localized messages and send in batches of 100.
  const messages: ExpoPushMessage[] = entries.map((e) => {
    const c = copyFor(e.lang);
    return {
      to: e.token,
      title: c.title,
      body: c.body,
      data: {
        type: "promo",
        category: "kyc_limits_announcement",
        url: "/fund-vault",
        timestamp: Date.now(),
      },
      sound: "default",
      channelId: "default",
      priority: "high",
    };
  });

  const tickets = await sendExpoPushBatch(messages);
  let sent = 0, failed = 0;
  for (const t of tickets) (t?.status === "ok" ? sent++ : failed++);

  await redis.lpush(
    "notifications:log",
    JSON.stringify({
      type: "promo",
      title: "kyc-limits-announcement (localized, unverified-only)",
      recipients: entries.length,
      mobileSent: sent,
      mobileFailed: failed,
      broadcast: true,
      sentBy: "push-kyc-limits-announcement",
      timestamp: Date.now(),
    })
  );
  await redis.ltrim("notifications:log", 0, 999);

  return NextResponse.json({
    sent: true,
    totalTokens: entries.length,
    mobileSent: sent,
    mobileFailed: failed,
    ...summary,
  });
}
