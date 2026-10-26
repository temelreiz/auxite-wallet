// src/lib/ops-digest.ts
// Non-urgent ops notices go to ONE daily email instead of Telegram.
//
// Telegram had become a feed of every trade, settlement and daily status, and
// the alerts that needed a human were drowning in it (founder, 2026-10-21).
// The rule now: Telegram = something to act on soon (security, money stuck or
// at risk, systems down). Everything else is queued here and mailed once a day
// by /api/cron/ops-digest.
//
// Messages keep the Telegram HTML subset (<b>, <code>, <a>), which renders
// as-is in an email body.

import { Resend } from "resend";
import { getRedis } from "@/lib/redis";

const dayKey = (ms: number) => `ops:digest:${new Date(ms).toISOString().slice(0, 10)}`;
const KEEP_SEC = 8 * 86400;
const MAX_ITEMS = 2000;

/** Queue a notice for the next daily digest. Never throws. */
export async function queueOpsDigest(html: string, now = Date.now()): Promise<boolean> {
  try {
    const r = getRedis();
    const key = dayKey(now);
    await r.rpush(key, JSON.stringify({ t: now, html }));
    await r.ltrim(key, -MAX_ITEMS, -1);
    await r.expire(key, KEEP_SEC);
    return true;
  } catch (e) {
    console.error("[ops-digest] queue failed:", e);
    return false;
  }
}

export async function readDigest(dayMs: number): Promise<{ t: number; html: string }[]> {
  const raw = await getRedis().lrange(dayKey(dayMs), 0, -1);
  return raw.map((x: any) => (typeof x === "string" ? JSON.parse(x) : x));
}

export function renderDigest(day: string, items: { t: number; html: string }[]): string {
  const time = (t: number) =>
    new Date(t).toLocaleTimeString("tr-TR", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit" });
  const body = items.length
    ? items
        .map(
          (i) =>
            `<div style="padding:10px 0;border-top:1px solid #e5e5e5"><div style="color:#888;font-size:12px">${time(i.t)}</div>` +
            `<div style="white-space:pre-wrap;font-size:14px;line-height:1.45">${i.html.trim()}</div></div>`,
        )
        .join("")
    : `<p>Bugün kayda değer bir bildirim yok.</p>`;
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111;max-width:680px">
  <h2 style="margin:0 0 4px;font-size:18px">Auxite günlük operasyon özeti</h2>
  <div style="color:#666;font-size:13px;margin-bottom:8px">${day} (UTC) · ${items.length} bildirim</div>
  ${body}
  <p style="margin-top:20px;color:#888;font-size:12px">Acil olanlar (güvenlik, para çıkışı, sistem çökmesi, rezerv) Telegram'a gitmeye devam ediyor. Bu e-posta geri kalan her şeyi topluyor.</p>
</div>`;
}

export async function sendDigestEmail(subject: string, html: string): Promise<string | null> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return "RESEND_API_KEY not set";
  const to = (process.env.OPS_DIGEST_EMAIL || "bs@auxite.io").split(",").map((s) => s.trim());
  const from = `Auxite Ops <${process.env.FROM_EMAIL || "noreply@auxite.io"}>`;
  try {
    const { error } = await new Resend(key).emails.send({ from, to, subject, html });
    return error ? `Resend: ${error.message}` : null;
  } catch (e: any) {
    return `Resend unreachable: ${e?.message || e}`;
  }
}
