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
import { getAuxrFeed, sendAuxrPushToAndroid } from "@/lib/auxr-push";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const LAST_NAV_KEY = "auxr:weekly-push:last-nav";

function isoWeek(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
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

  const nav = (await getAuxrFeed())?.nav ?? 0;
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

  const result = await sendAuxrPushToAndroid(title, body);
  const summary = { week, nav, change, ...result };
  await redis.lpush("auxr:weekly-push:runs", JSON.stringify({ at: Date.now(), ...summary }));
  await redis.ltrim("auxr:weekly-push:runs", 0, 51);
  return NextResponse.json({ success: true, ...summary });
}
