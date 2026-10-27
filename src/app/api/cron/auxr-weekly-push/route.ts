// src/app/api/cron/auxr-weekly-push/route.ts
//
// Weekly AUXR NAV update push — Mondays 14:00 UTC.
//
// Android only: AUXR is hidden on iOS (App Store 3.1.5(iii)). Users who
// turned marketing notifications off (push:preferences.marketing === false or
// enabled === false) are skipped. Tapping opens the AUXR tab.
//
// Copy rules: NAV and week-over-week change only — no predictions, no
// backing/custody claims, no "buy now".

import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import { isCronRequest } from "@/lib/security/require-user";
import { sendExpoPushBatch, type ExpoPushMessage } from "@/lib/expo-push";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const NAV_FEED_URL = "https://vault.auxite.io/api/auxr/price";
const LAST_NAV_KEY = "auxr:weekly-push:last-nav";

function isoWeek(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function parse<T>(v: unknown): T | null {
  if (!v) return null;
  try { return typeof v === "string" ? (JSON.parse(v) as T) : (v as T); } catch { return null; }
}

export async function GET(request: NextRequest) {
  if (!isCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const redis = getRedis();

  // One send per ISO week, even if the cron is retried or invoked by hand.
  const week = isoWeek(new Date());
  const claimed = await redis.set(`auxr:weekly-push:sent:${week}`, Date.now().toString(), { nx: true, ex: 14 * 86400 });
  if (claimed === null) return NextResponse.json({ success: true, skipped: "already sent this week", week });

  const nav = Number((await (await fetch(NAV_FEED_URL, { cache: "no-store" })).json())?.navUSD);
  if (!(nav > 0)) {
    await redis.del(`auxr:weekly-push:sent:${week}`);
    return NextResponse.json({ success: false, error: "NAV unavailable" }, { status: 503 });
  }
  const lastNav = Number(await redis.get(LAST_NAV_KEY)) || 0;
  await redis.set(LAST_NAV_KEY, String(nav));

  const change = lastNav > 0 ? ((nav - lastNav) / lastNav) * 100 : null;
  const title = "AUXR weekly NAV update";
  const body =
    `NAV $${nav.toFixed(2)}` +
    (change !== null ? ` (${change >= 0 ? "+" : ""}${change.toFixed(1)}% w/w)` : "") +
    ` · gold, silver, platinum & palladium basket. Trade on LBANK, Hotcoin, Pionex or in the app.`;

  // Android devices of every user with a mobile push token, minus marketing opt-outs.
  const users = (await redis.smembers("push:mobile:all_users")) as string[];
  const messages: ExpoPushMessage[] = [];
  let optedOut = 0;
  for (let i = 0; i < users.length; i += 200) {
    const slice = users.slice(i, i + 200).map((u) => u.toLowerCase());
    const [tokens, prefs] = await Promise.all([
      redis.mget(...slice.map((u) => `push:mobile:${u}`)),
      redis.mget(...slice.map((u) => `push:preferences:${u}`)),
    ]);
    slice.forEach((_, j) => {
      const p = parse<{ enabled?: boolean; marketing?: boolean }>(prefs[j]);
      if (p && (p.enabled === false || p.marketing === false)) { optedOut++; return; }
      for (const t of parse<Array<{ token: string; platform?: string }>>(tokens[j]) || []) {
        if ((t.platform || "").toLowerCase() !== "android") continue;
        messages.push({
          to: t.token,
          title,
          body,
          data: { category: "system", screen: "/(tabs)/auxr", timestamp: Date.now() },
          sound: "default",
          channelId: "default",
          priority: "high",
        });
      }
    });
  }

  const tickets = messages.length ? await sendExpoPushBatch(messages) : [];
  const sent = tickets.filter((t) => t.status === "ok").length;
  const summary = { week, nav, change, devices: messages.length, sent, failed: messages.length - sent, optedOut };
  await redis.lpush("auxr:weekly-push:runs", JSON.stringify({ at: Date.now(), ...summary }));
  await redis.ltrim("auxr:weekly-push:runs", 0, 51);
  return NextResponse.json({ success: true, ...summary });
}
