// POST /api/admin/campaigns/announce
//
// Body: { campaignId: string, channels: ('push'|'email'|'banner'|'telegram')[] }
//
// Fires a one-shot announcement for a volume_bonus campaign across the
// admin-selected channels:
//   push     → broadcastPush to every registered mobile device (+ anon)
//   email    → email blast (reuses existing email-campaigns infra)
//   banner   → in-app banner that stays until campaign.endDate
//   telegram → broadcast to ops chat (no per-user Telegram bot send yet)
//
// Idempotent on a per-channel basis — re-firing the same channel will
// append a new send record but won't block. The admin button should
// show "Sent at HH:MM" once campaign.announcementSentAt is populated.

import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { requireAdmin } from "@/lib/admin-auth";
import { broadcastPush, broadcastAnonPush } from "@/lib/expo-push";
import { sendTelegramMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const CAMPAIGNS_KEY = "auxite:campaigns";

type Channel = "push" | "email" | "banner" | "telegram";

interface AnnounceBody {
  campaignId?: string;
  channels?: Channel[];
}

interface CampaignShape {
  id: string;
  type?: string;
  name?: { tr?: string; en?: string };
  description?: { tr?: string; en?: string };
  bonusAsset?: string;
  bonusAmountGrams?: number;
  minTradeUsd?: number;
  poolCap?: number;
  endDate?: string;
  active?: boolean;
  announcementSentAt?: string;
  announcementChannels?: Channel[];
}

function buildTitle(c: CampaignShape): string {
  return c.name?.tr || c.name?.en || "Auxite Kampanya";
}

function buildBody(c: CampaignShape): string {
  const min = c.minTradeUsd ?? 0;
  const grams = c.bonusAmountGrams ?? 0;
  const asset = c.bonusAsset ?? "AUXG";
  return `$${min}+ işlem yapın, ${grams}g ${asset} kazanın 🎁`;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  let body: AnnounceBody;
  try {
    body = (await request.json()) as AnnounceBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }
  const { campaignId } = body;
  const channels = (body.channels ?? ["push", "banner"]).filter((c) =>
    ["push", "email", "banner", "telegram"].includes(c),
  );
  if (!campaignId) {
    return NextResponse.json({ ok: false, error: "campaignId is required" }, { status: 400 });
  }
  if (channels.length === 0) {
    return NextResponse.json({ ok: false, error: "channels cannot be empty" }, { status: 400 });
  }

  const campaigns = ((await kv.get<CampaignShape[]>(CAMPAIGNS_KEY)) ?? []) as CampaignShape[];
  const idx = campaigns.findIndex((c) => c.id === campaignId);
  if (idx === -1) {
    return NextResponse.json({ ok: false, error: "campaign not found" }, { status: 404 });
  }
  const c = campaigns[idx];
  if (c.type !== "volume_bonus") {
    return NextResponse.json(
      { ok: false, error: "only volume_bonus campaigns can be announced" },
      { status: 400 },
    );
  }

  const title = buildTitle(c);
  const text = buildBody(c);
  const results: Record<string, unknown> = {};

  // ─── PUSH ───────────────────────────────────────────────────────────
  if (channels.includes("push")) {
    try {
      // Registered users
      const r1 = await broadcastPush(title, text, {
        type: "campaign",
        category: "campaign",
        campaignId: c.id,
      });
      // Anon devices (downloaded the app but haven't signed up) — they
      // can still benefit from the campaign once they create an account.
      const r2 = await broadcastAnonPush(title, text, {
        type: "campaign",
        category: "campaign",
        campaignId: c.id,
      });
      results.push = {
        // broadcastPush counts at user level; broadcastAnonPush counts at
        // device level (no auth means no user attribution) — keep the
        // field names accurate so the dashboard summary doesn't lie.
        registered: { sent: r1.totalSent, failed: r1.totalFailed, recipients: r1.userCount },
        anon: { sent: r2.totalSent, failed: r2.totalFailed, devices: r2.deviceCount },
      };
    } catch (err) {
      results.push = { error: err instanceof Error ? err.message : String(err) };
    }
  }

  // ─── BANNER ─────────────────────────────────────────────────────────
  // Sets a banner record that the mobile/web banner readers already
  // poll. Banner lives until the campaign's endDate so it self-expires
  // without an extra cleanup cron.
  if (channels.includes("banner")) {
    try {
      const banner = {
        id: `vb-${c.id}`,
        title: c.name?.tr || title,
        titleEn: c.name?.en || title,
        message: c.description?.tr || text,
        messageEn: c.description?.en || text,
        type: "campaign",
        priority: "high",
        active: true,
        startDate: new Date().toISOString(),
        endDate: c.endDate ?? new Date(Date.now() + 14 * 86400_000).toISOString(),
        campaignId: c.id,
      };
      // Existing banners list lives under "auxite:banners" — same shape
      // the admin Banner tab writes. Keep schemas in sync if either side
      // changes.
      const existing = (await kv.get<unknown[]>("auxite:banners")) ?? [];
      const dedup = (existing as Array<{ id?: string }>).filter((b) => b.id !== banner.id);
      dedup.unshift(banner);
      await kv.set("auxite:banners", dedup);
      results.banner = { ok: true };
    } catch (err) {
      results.banner = { error: err instanceof Error ? err.message : String(err) };
    }
  }

  // ─── TELEGRAM (ops chat — not per-user yet) ─────────────────────────
  if (channels.includes("telegram")) {
    try {
      const msg = `📢 <b>YENİ KAMPANYA</b>\n\n<b>${title}</b>\n\n${text}\n\nKampanya ID: <code>${c.id}</code>`;
      await sendTelegramMessage(msg);
      results.telegram = { ok: true };
    } catch (err) {
      results.telegram = { error: err instanceof Error ? err.message : String(err) };
    }
  }

  // ─── EMAIL ──────────────────────────────────────────────────────────
  // Defer to existing email-campaigns admin route. This endpoint just
  // records intent — the actual sender already supports campaign IDs.
  // (Wiring email-campaigns inline here would duplicate auth + segmenting
  // logic we don't want to fork.)
  if (channels.includes("email")) {
    results.email = {
      ok: false,
      note: "Email blast deferred — trigger via Admin → Email Kampanya tab and pass campaignId",
    };
  }

  // Mark the campaign as announced for the admin UI.
  const sentChannels: Channel[] = Array.from(
    new Set([...(c.announcementChannels ?? []), ...channels]),
  );
  campaigns[idx] = {
    ...c,
    announcementSentAt: new Date().toISOString(),
    announcementChannels: sentChannels,
  };
  await kv.set(CAMPAIGNS_KEY, campaigns);

  return NextResponse.json({
    ok: true,
    campaignId,
    channels,
    results,
    announcedAt: campaigns[idx].announcementSentAt,
  });
}
