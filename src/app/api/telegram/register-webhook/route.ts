// One-shot admin endpoint that registers the support bot's webhook with
// Telegram. We don't want the bot token to leave Vercel, so this calls
// setWebhook from inside the server, gated by CRON_SECRET (same key used
// by every other admin/cron endpoint).
//
// Usage after deploy (token never touches the curl command):
//   curl -X POST "https://vault.auxite.io/api/telegram/register-webhook?secret=$CRON_SECRET"
//   curl "https://vault.auxite.io/api/telegram/register-webhook?secret=$CRON_SECRET"   # GET = inspect current state
//
// Idempotent — safe to re-run if the webhook URL ever moves.

import { NextRequest, NextResponse } from "next/server";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET; // optional
const CRON_SECRET = process.env.CRON_SECRET;
const WEBHOOK_URL = "https://vault.auxite.io/api/telegram/webhook";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

function isAuthed(req: NextRequest): boolean {
  if (!CRON_SECRET) return false;
  const url = new URL(req.url);
  const qs = url.searchParams.get("secret");
  if (qs && qs === CRON_SECRET) return true;
  const auth = req.headers.get("authorization") || "";
  if (auth === `Bearer ${CRON_SECRET}`) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return unauthorized();
  if (!TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ ok: false, error: "TELEGRAM_BOT_TOKEN not set" }, { status: 500 });
  }
  const r = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`);
  const data = await r.json();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!isAuthed(req)) return unauthorized();
  if (!TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ ok: false, error: "TELEGRAM_BOT_TOKEN not set" }, { status: 500 });
  }

  const body: Record<string, any> = {
    url: WEBHOOK_URL,
    allowed_updates: ["message"], // we ignore inline queries / channel posts for now
    drop_pending_updates: true,
  };
  if (TELEGRAM_WEBHOOK_SECRET) {
    body.secret_token = TELEGRAM_WEBHOOK_SECRET;
  }

  const r = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  return NextResponse.json({ ok: r.ok, telegramResponse: data, webhookUrl: WEBHOOK_URL });
}
