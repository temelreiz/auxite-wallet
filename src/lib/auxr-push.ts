// src/lib/auxr-push.ts
//
// Shared audience + send for AUXR marketing pushes (weekly NAV update and
// the 15-day launch campaign).
//
// Android only: AUXR is hidden on iOS (App Store 3.1.5(iii)). Users whose push
// preferences turn marketing or all notifications off are skipped. Tapping
// opens the AUXR tab.

import { getRedis } from "@/lib/redis";
import { sendExpoPushBatch, type ExpoPushMessage } from "@/lib/expo-push";

export const NAV_FEED_URL = "https://vault.auxite.io/api/auxr/price";

export interface AuxrFeed {
  nav: number;
  weights: Record<"gold" | "silver" | "platinum" | "palladium", number>;
}

/** Live NAV and basket weights (%), or null when the feed is unavailable. */
export async function getAuxrFeed(): Promise<AuxrFeed | null> {
  try {
    const j = await (await fetch(NAV_FEED_URL, { cache: "no-store" })).json();
    const nav = Number(j?.navUSD);
    if (!(nav > 0)) return null;
    const c = j.components || {};
    const w = (k: string) => Number(c[k]?.weightPct) || 0;
    return { nav, weights: { gold: w("gold"), silver: w("silver"), platinum: w("platinum"), palladium: w("palladium") } };
  } catch {
    return null;
  }
}

function parse<T>(v: unknown): T | null {
  if (!v) return null;
  try { return typeof v === "string" ? (JSON.parse(v) as T) : (v as T); } catch { return null; }
}

export interface PushResult {
  devices: number;
  sent: number;
  failed: number;
  optedOut: number;
  /** First error message from Expo, when any message failed. */
  error?: string;
}

/** Send one title/body to every Android device of every opted-in user. */
export async function sendAuxrPushToAndroid(title: string, body: string): Promise<PushResult> {
  const redis = getRedis();
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
  const error = tickets.find((t) => t.status !== "ok")?.message;
  return { devices: messages.length, sent, failed: messages.length - sent, optedOut, ...(error ? { error } : {}) };
}
