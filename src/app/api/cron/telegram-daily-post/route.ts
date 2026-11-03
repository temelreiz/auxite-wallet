// src/app/api/cron/telegram-daily-post/route.ts
// One post a day on the public @auxite channel (text in src/lib/telegram-daily-post.ts).
// Runs 12:00 UTC: afternoon in the Gulf and Moscow, London open, early New
// York. Posts at most once per UTC date (redis flag), and never posts prices
// older than MAX_PRICE_AGE_MS: on a stale feed it falls back to the fact post
// rather than publishing yesterday's numbers as today's.
// Auth: Authorization: Bearer ${CRON_SECRET}.

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { buildDailyPost, buyRewardPromo, dailyKind, type Spot } from "@/lib/telegram-daily-post";
import { CAMPAIGN, campaignActive } from "@/lib/auxr-buy-reward";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const redis = Redis.fromEnv();
const SECRET = process.env.CRON_SECRET || "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://vault.auxite.io";
const MAX_PRICE_AGE_MS = 6 * 60 * 60 * 1000;
const SNAP_TTL = 21 * 24 * 60 * 60;
const FLAG_TTL = 2 * 24 * 60 * 60;

const ymd = (d: Date) => d.toISOString().slice(0, 10);

async function snapshot(date: string): Promise<Spot | undefined> {
  const raw = await redis.get(`tg:daily:snap:${date}`);
  if (!raw) return undefined;
  return (typeof raw === "string" ? JSON.parse(raw) : raw) as Spot;
}

/**
 * The app's own buy price (/api/prices "prices", spread included), so the
 * number in the post is the number a reader sees after tapping the link.
 * Null when the feed is unreachable, malformed or stale.
 */
async function appPrices(): Promise<Spot | null> {
  try {
    const res = await fetch(`${APP_URL}/api/prices`, { cache: "no-store", signal: AbortSignal.timeout(10000) });
    const p = (await res.json()) as { prices?: Record<string, number>; timestamp?: number };
    const g = p.prices || {};
    const s = { gold: g.AUXG, silver: g.AUXS, platinum: g.AUXPT, palladium: g.AUXPD };
    const sane = Object.values(s).every((v) => typeof v === "number" && v > 0 && v < 500);
    if (sane && p.timestamp && Date.now() - p.timestamp < MAX_PRICE_AGE_MS) return s as Spot;
  } catch {
    // fall through to the fact post
  }
  return null;
}

export async function GET(request: NextRequest) {
  if (SECRET && request.headers.get("Authorization") !== `Bearer ${SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const channelId = process.env.TELEGRAM_CHANNEL_ID;
  const botToken = process.env.TELEGRAM_CHANNEL_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  if (!channelId || !botToken) {
    return NextResponse.json({ skipped: "TELEGRAM_CHANNEL_ID or bot token not configured" });
  }

  const now = new Date();
  const today = ymd(now);
  const flagKey = `tg:daily:posted:${today}`;
  if (!(await redis.set(flagKey, "pending", { nx: true, ex: FLAG_TTL }))) {
    return NextResponse.json({ skipped: "already posted today" });
  }

  const prices = await appPrices();
  const kind = dailyKind(now);
  let prev: Spot | undefined;
  if (prices && kind !== "fact") {
    // Snapshots are only taken Mon–Fri. Weekly (Saturday): the previous week's
    // Friday, eight days back. Daily: the most recent earlier snapshot (Monday
    // compares with Friday).
    const back = kind === "weekly" ? [8, 9] : [1, 2, 3, 4];
    for (const n of back) {
      prev = await snapshot(ymd(new Date(now.getTime() - n * 86400000)));
      if (prev) break;
    }
  }

  const promo = campaignActive(now.getTime()) ? buyRewardPromo(CAMPAIGN.endAt, CAMPAIGN.settleAt) : undefined;
  const text = buildDailyPost(now, prices, prev, promo);
  const r = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: channelId, text, parse_mode: "HTML", disable_web_page_preview: true }),
  });
  const j = (await r.json().catch(() => ({}))) as { ok?: boolean; description?: string };

  const entry = { timestamp: Date.now(), date: today, kind: prices ? kind : "fact", ok: !!j.ok, error: j.ok ? undefined : j.description };
  await redis.lpush("cron:tg-daily:log", JSON.stringify(entry));
  await redis.ltrim("cron:tg-daily:log", 0, 49);

  if (!j.ok) {
    await redis.del(flagKey); // let a manual re-run try again
    return NextResponse.json({ ok: false, error: j.description }, { status: 502 });
  }

  await redis.set(flagKey, "1", { ex: FLAG_TTL });
  if (prices && kind === "prices") await redis.set(`tg:daily:snap:${today}`, JSON.stringify(prices), { ex: SNAP_TTL });
  return NextResponse.json({ ok: true, kind: entry.kind });
}
