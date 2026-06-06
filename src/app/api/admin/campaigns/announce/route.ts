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
  // Banner lives in the canonical mobile:banners key with the same
  // shape (BannersData wrapper + multi-locale title/subtitle) that
  // /api/admin/banners and /api/mobile/banners read. Earlier code was
  // writing a flat array under auxite:banners, which is why the
  // banner never showed up in the app on test pushes.
  if (channels.includes("banner")) {
    try {
      const bannerId = `vb-${c.id}`;
      const banner = {
        id: bannerId,
        // Multi-locale at minimum has tr+en; the app falls back
        // gracefully but the admin banner reader expects both keys.
        title: {
          tr: c.name?.tr || title,
          en: c.name?.en || title,
        },
        subtitle: {
          tr: c.description?.tr || text,
          en: c.description?.en || text,
        },
        backgroundColor: "#10b981", // emerald — matches volume-bonus chrome
        textColor: "#ffffff",
        // Tapping the banner deep-links to the trade screen so users
        // land where they can earn the bonus immediately.
        actionType: "screen",
        actionValue: "trade",
        active: true,
        priority: 90, // above the standard 50 so campaign banner ranks first
        startDate: new Date().toISOString(),
        endDate: c.endDate ?? new Date(Date.now() + 14 * 86400_000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const BANNERS_KEY = "mobile:banners";
      type BannerEntry = { id?: string };
      type BannersData = { banners: BannerEntry[]; lastUpdated: string };
      const existing = (await kv.get<BannersData>(BANNERS_KEY)) ?? {
        banners: [] as BannerEntry[],
        lastUpdated: new Date().toISOString(),
      };
      // Upsert by id so re-firing the announcement refreshes the same
      // banner instead of stacking duplicates.
      const banners = existing.banners.filter((b) => b.id !== bannerId);
      banners.unshift(banner);
      await kv.set(BANNERS_KEY, {
        banners,
        lastUpdated: new Date().toISOString(),
      });
      results.banner = { ok: true, bannerId };
    } catch (err) {
      results.banner = { error: err instanceof Error ? err.message : String(err) };
    }
  }

  // ─── TELEGRAM ──────────────────────────────────────────────────────
  // Fires two messages on the same Telegram channel click:
  //   1) Ops chat (TELEGRAM_CHAT_ID) — internal "campaign just went live"
  //      receipt for the operations team.
  //   2) Public community channel (TELEGRAM_CHANNEL_ID, e.g. @auxite_community)
  //      — public-facing announcement. Skipped silently if not configured;
  //      bot must be an admin of that channel with "Post Messages" enabled.
  if (channels.includes("telegram")) {
    const opsMsg = `📢 <b>YENİ KAMPANYA</b>\n\n<b>${title}</b>\n\n${text}\n\nKampanya ID: <code>${c.id}</code>`;
    // Public copy is plain Markdown-style, no HTML tags, since channel
    // subscribers shouldn't see internal IDs or chrome.
    const publicMsg = `🎁 ${title}\n\n${text}\n\n🔗 https://vault.auxite.io`;

    const sub: Record<string, unknown> = {};
    try {
      await sendTelegramMessage(opsMsg);
      sub.ops = { ok: true };
    } catch (err) {
      sub.ops = { error: err instanceof Error ? err.message : String(err) };
    }

    const channelId = process.env.TELEGRAM_CHANNEL_ID;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (channelId && botToken) {
      try {
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: channelId,
            text: publicMsg,
            disable_web_page_preview: false,
          }),
        });
        const j = (await r.json()) as { ok?: boolean; description?: string };
        sub.public = j.ok ? { ok: true } : { error: j.description ?? "send failed" };
      } catch (err) {
        sub.public = { error: err instanceof Error ? err.message : String(err) };
      }
    } else {
      sub.public = { skipped: "TELEGRAM_CHANNEL_ID not configured" };
    }
    results.telegram = sub;
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
