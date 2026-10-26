// GET /api/cron/ops-digest — daily email of the non-urgent ops notices
// queued by queueOpsDigest() (src/lib/ops-digest.ts). Vercel Cron, 05:00 UTC,
// covers the previous UTC day. ?day=YYYY-MM-DD to resend a specific day.

import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import { readDigest, renderDigest, sendDigestEmail } from "@/lib/ops-digest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const cronHeader = request.headers.get("x-vercel-cron");
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!cronHeader && token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const q = request.nextUrl.searchParams.get("day");
  const dayMs = q ? Date.parse(`${q}T12:00:00Z`) : Date.now() - 86_400_000;
  if (!Number.isFinite(dayMs)) return NextResponse.json({ error: "bad day" }, { status: 400 });
  const day = new Date(dayMs).toISOString().slice(0, 10);

  // One email per day, also when Vercel retries the cron.
  const sentKey = `ops:digest:sent:${day}`;
  if (!q) {
    const fresh = await getRedis().set(sentKey, Date.now().toString(), { nx: true, ex: 3 * 86400 });
    if (fresh === null) return NextResponse.json({ ok: true, skipped: "already sent", day });
  }

  const items = await readDigest(dayMs);
  const err = await sendDigestEmail(
    `[Auxite] Günlük operasyon özeti ${day} · ${items.length} bildirim`,
    renderDigest(day, items),
  );
  if (err) {
    if (!q) await getRedis().del(sentKey);
    return NextResponse.json({ ok: false, error: err }, { status: 502 });
  }
  return NextResponse.json({ ok: true, day, items: items.length });
}
