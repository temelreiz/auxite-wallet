// src/app/api/cron/auxr-campaign-push/route.ts
//
// 15-day AUXR push campaign: 31 Oct – 14 Nov 2026, daily 14:00 UTC, Android
// only (see src/lib/auxr-push.ts). Mondays are skipped because the weekly NAV
// push goes out then — nobody gets two AUXR pushes in a day. That leaves 13
// campaign messages, one per non-Monday day, in order. (Planned start was
// 30 Oct; that send failed, so the schedule moved a day to keep all 13.)
//
// 15:00 and 16:00 are retries: the daily claim is released when nothing was
// delivered, so a failed 14:00 run is retried instead of skipping the day.
//
// Stop at any time: SET auxr:campaign-push:halt 1
//
// Copy rules: facts only — no predictions, returns, urgency, or backing /
// custody claims. Numbers come from the live feed at send time.

import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import { isCronRequest } from "@/lib/security/require-user";
import { getAuxrFeed, sendAuxrPushToAndroid, type AuxrFeed } from "@/lib/auxr-push";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const START = "2026-10-31";
const END = "2026-11-14";
const HALT_KEY = "auxr:campaign-push:halt";

type Msg = { title: string; body: string } | ((f: AuxrFeed) => { title: string; body: string });

const pct = (n: number) => `${Math.round(n)}%`;

const MESSAGES: Msg[] = [
  { title: "AUXR is live on 3 exchanges", body: "One token tracking gold, silver, platinum & palladium. Now on LBANK, Hotcoin and Pionex." },
  { title: "One token, four metals", body: "Each AUXR tracks fixed grams of gold, silver, platinum and palladium. Tap to see the basket." },
  (f) => ({ title: `AUXR NAV today: $${f.nav.toFixed(2)}`, body: "NAV = grams × live spot prices, published 24/7. Check it any time in the app." }),
  { title: "Why a basket?", body: "Gold, silver, platinum and palladium move differently. AUXR tracks all four in a single token." },
  { title: "Where to trade AUXR", body: "AUXR/USDT on LBANK, Hotcoin and Pionex — or in the Auxite app at NAV ± spread. Not investment advice." },
  (f) => ({ title: "Gold in the AUXR basket", body: `Gold is about ${pct(f.weights.gold)} of AUXR's value today. Tap to see every metal's live weight.` }),
  { title: "No rebalancing, by design", body: "AUXR tracks fixed grams per token, so weights drift with metal prices. See the rules in the app." },
  { title: "Built on Base", body: "AUXR is an ERC-20 on Base: verified contract, no transfer tax, no max-wallet limits." },
  (f) => ({ title: "Silver's share of AUXR", body: `Silver is about ${pct(f.weights.silver)} of the basket today. See the live breakdown in the app.` }),
  { title: "Pricing you can check", body: "The AUXR NAV feed is public and updates live. Tap to view the current NAV and basket." },
  { title: "Platinum & palladium", body: "Two metals most portfolios skip. AUXR includes both, alongside gold and silver." },
  { title: "AUXR in the Auxite app", body: "Buy or sell AUXR in the app at NAV ± spread with USDT, USDC, BTC or ETH. Not investment advice." },
  (f) => ({ title: `AUXR NAV: $${f.nav.toFixed(2)}`, body: "Learn how AUXR works — basket, NAV and where it trades — in the AUXR tab." }),
];

/** Index of today's message, or null when today is outside the campaign or a Monday. */
function messageIndex(now: Date): number | null {
  const today = now.toISOString().slice(0, 10);
  if (today < START || today > END || now.getUTCDay() === 1) return null;
  let i = 0;
  for (let d = new Date(`${START}T00:00:00Z`); d.toISOString().slice(0, 10) < today; d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() !== 1) i++;
  }
  return i < MESSAGES.length ? i : null;
}

export async function GET(request: NextRequest) {
  if (!isCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const redis = getRedis();
  const now = new Date();
  const day = now.toISOString().slice(0, 10);

  if (await redis.get(HALT_KEY)) return NextResponse.json({ success: true, skipped: "halted" });
  const idx = messageIndex(now);
  if (idx === null) return NextResponse.json({ success: true, skipped: "no campaign message today", day });

  // One send per day even if the cron is retried.
  const claimed = await redis.set(`auxr:campaign-push:sent:${day}`, String(idx), { nx: true, ex: 30 * 86400 });
  if (claimed === null) return NextResponse.json({ success: true, skipped: "already sent today", day });

  const m = MESSAGES[idx];
  let msg: { title: string; body: string };
  if (typeof m === "function") {
    const feed = await getAuxrFeed();
    if (!feed) {
      await redis.del(`auxr:campaign-push:sent:${day}`);
      return NextResponse.json({ success: false, error: "NAV unavailable" }, { status: 503 });
    }
    msg = m(feed);
  } else {
    msg = m;
  }

  const log = async (entry: Record<string, unknown>) => {
    await redis.lpush("auxr:campaign-push:runs", JSON.stringify({ at: Date.now(), day, index: idx + 1, title: msg.title, ...entry }));
    await redis.ltrim("auxr:campaign-push:runs", 0, 29);
  };

  let result;
  try {
    result = await sendAuxrPushToAndroid(msg.title, msg.body);
  } catch (e) {
    await redis.del(`auxr:campaign-push:sent:${day}`);
    const error = e instanceof Error ? e.message : String(e);
    await log({ error });
    return NextResponse.json({ success: false, day, error }, { status: 500 });
  }
  if (result.devices > 0 && result.sent === 0) {
    await redis.del(`auxr:campaign-push:sent:${day}`);
    await log({ ...result, error: "nothing delivered; claim released for retry" });
    return NextResponse.json({ success: false, day, ...result }, { status: 502 });
  }

  const summary = { day, index: idx + 1, of: MESSAGES.length, title: msg.title, ...result };
  await log(result as unknown as Record<string, unknown>);
  return NextResponse.json({ success: true, ...summary });
}
