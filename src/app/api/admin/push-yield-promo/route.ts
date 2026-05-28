// ============================================================================
// /api/admin/push-yield-promo — language-segmented yield promo broadcast.
//
// Sends a yield-highlighting push to all registered mobile users IN THEIR OWN
// LANGUAGE (getUserLanguage → user profile, default en). Localized copy below.
//
// Auth: CRON_SECRET (Bearer). Safety: dry-run by default; an actual send
// requires BOTH ?send=true AND ?confirm=yes. Tokens are batched (100/req).
//
//   GET ?dry-run            → segment counts, sends nothing
//   GET ?send=true&confirm=yes → sends the localized push
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import { getUserLanguage } from "@/lib/user-language";
import { sendExpoPushBatch, type ExpoPushMessage } from "@/lib/expo-push";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

type Copy = { title: string; body: string };
const COPY: Record<string, Copy> = {
  en: { title: "Put your metals to work", body: "Stake AUXG, AUXS, AUXPT or AUXPD and earn up to ~3% annual yield. Tap to start earning." },
  tr: { title: "Metalleriniz size kazandırsın", body: "AUXG, AUXS, AUXPT ve AUXPD'yi stake ederek yıllık %3'e varan getiri kazanın. Başlamak için dokunun." },
  de: { title: "Lassen Sie Ihre Metalle arbeiten", body: "Staken Sie AUXG, AUXS, AUXPT oder AUXPD und verdienen Sie bis zu ~3% Jahresrendite. Jetzt starten." },
  fr: { title: "Faites travailler vos métaux", body: "Stakez AUXG, AUXS, AUXPT ou AUXPD et gagnez jusqu'à ~3% de rendement annuel. Touchez pour commencer." },
  ar: { title: "اجعل معادنك تعمل لصالحك", body: "قم بعمل ستيك لـ AUXG وAUXS وAUXPT وAUXPD واربح عائدًا سنويًا يصل إلى ~3%. اضغط للبدء." },
  ru: { title: "Заставьте металлы работать", body: "Стейкайте AUXG, AUXS, AUXPT или AUXPD и получайте до ~3% годовых. Нажмите, чтобы начать." },
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

  // Resolve language + tokens per wallet (parallel in chunks).
  type Entry = { token: string; lang: string };
  const entries: Entry[] = [];
  const byLangWallets: Record<string, number> = {};

  for (let i = 0; i < wallets.length; i += CHUNK) {
    const slice = wallets.slice(i, i + CHUNK);
    await Promise.all(
      slice.map(async (w) => {
        const lang = await getUserLanguage(w);
        byLangWallets[lang] = (byLangWallets[lang] || 0) + 1;
        try {
          const raw = await redis.get(`push:mobile:${String(w).toLowerCase()}`);
          const toks = typeof raw === "string" ? JSON.parse(raw) : Array.isArray(raw) ? raw : [];
          for (const t of toks) if (t?.token) entries.push({ token: t.token, lang });
        } catch {}
      })
    );
  }

  const byLangTokens: Record<string, number> = {};
  for (const e of entries) byLangTokens[e.lang] = (byLangTokens[e.lang] || 0) + 1;

  const summary = {
    wallets: wallets.length,
    tokens: entries.length,
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
      data: { type: "promo", category: "yield", url: "/stake", timestamp: Date.now() },
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
      type: "promo", title: "yield-promo (localized)", recipients: entries.length,
      mobileSent: sent, mobileFailed: failed, broadcast: true, sentBy: "push-yield-promo", timestamp: Date.now(),
    })
  );
  await redis.ltrim("notifications:log", 0, 999);

  return NextResponse.json({ sent: true, totalTokens: entries.length, mobileSent: sent, mobileFailed: failed, ...summary });
}
