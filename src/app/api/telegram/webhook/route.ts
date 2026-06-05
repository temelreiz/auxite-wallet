// Telegram AI Support Bot — @AuxiteSupportbot inbound webhook
// Receives customer messages, generates AI reply with Claude, sends back.
// First message in a new conversation also pings the ops chat so a human
// can take over if needed.

import { NextRequest, NextResponse } from "next/server";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_OPS_CHAT_ID = process.env.TELEGRAM_CHAT_ID; // reused ops chat (admin notifications)
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET; // optional — set during setWebhook
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Auxite platform knowledge base — same content as the WhatsApp bot so
// brand voice and facts stay consistent across both channels.
const SYSTEM_PROMPT = `You are the Auxite Support Assistant — a helpful, professional AI that assists users of the Auxite precious metals platform.

ABOUT AUXITE:
- Auxite is a tokenized precious metals platform by Aurum Ledger Limited (Hong Kong)
- Users can buy/sell/hold Gold (AUXG), Silver (AUXS), Platinum (AUXPT), Palladium (AUXPD)
- Each token = 1 gram of physically allocated, insured bullion
- Platform: vault.auxite.io (web) and Auxite Vault app (Google Play)

HOW IT WORKS:
1. Sign up with email (Google Sign-In available)
2. Complete KYC verification (identity check via Sumsub)
3. Deposit crypto (USDT, USDC, ETH, BTC) — no minimum required
4. Allocate metals — buy tokenized precious metals at live market prices
5. Hold, trade, or sell anytime at live market price
6. Structured Yield — lease metals for 90/180/365 days to earn returns

DEPOSIT:
- Crypto only: USDT, USDC, ETH, BTC on Base network (USDT also on Tron TRC-20)
- Bank wire: Coming soon
- No minimum deposit required
- Complete KYC to activate your 5 AUXG Welcome Gold

PRICING:
- Live market prices during weekdays
- Weekend/holiday: last Friday closing prices applied, orders execute at Monday open
- Trading fee: 0.35%

WITHDRAWAL:
- Convert metals back to crypto anytime
- Withdraw to external wallet

SECURITY:
- Fully allocated — each token backed 1:1 by physical metal
- Segregated custody — client assets never commingled
- Audited — regular third-party verification
- KYC/AML compliant

SUPPORT:
- Email: support@auxite.io
- Telegram: @AuxiteSupportbot (this bot)
- For complex issues, a human will follow up after your message reaches the team.

RULES:
- Be concise and helpful (Telegram messages should be short and clear)
- Never give investment advice or price predictions
- Never share private keys, passwords, or sensitive info
- If unsure, direct user to support@auxite.io
- Respond in the same language the user writes in
- Use emojis sparingly for friendliness`;

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; first_name?: string; username?: string; language_code?: string };
    chat: { id: number; type: string };
    text?: string;
    date: number;
  };
}

export async function POST(request: NextRequest) {
  // Optional secret header check — Telegram echoes whatever you pass to
  // setWebhook's `secret_token` field in `X-Telegram-Bot-Api-Secret-Token`.
  // If we haven't set one yet this is a no-op; once set, anything missing
  // the matching value gets rejected.
  if (TELEGRAM_WEBHOOK_SECRET) {
    const incoming = request.headers.get("x-telegram-bot-api-secret-token");
    if (incoming !== TELEGRAM_WEBHOOK_SECRET) {
      console.warn("[Telegram] Webhook secret mismatch — dropping request");
      return new NextResponse("forbidden", { status: 403 });
    }
  }

  try {
    const update = (await request.json()) as TelegramUpdate;
    const message = update.message;

    if (!message || !message.text || !message.chat?.id) {
      return NextResponse.json({ ok: true }); // ignore non-text or system updates
    }

    const chatId = message.chat.id;
    const userText = message.text.trim();
    const firstName = message.from?.first_name || "";
    const username = message.from?.username ? `@${message.from.username}` : "";

    console.log(`[Telegram] In: ${firstName} ${username} (${chatId}): ${userText.slice(0, 100)}`);

    // /start — friendly intro, no AI call needed.
    if (userText.startsWith("/start")) {
      await sendTelegramReply(
        chatId,
        `👋 Welcome to Auxite Support!\n\nI'm an AI assistant for the Auxite precious metals platform. Ask me anything about deposits, KYC, trading metals (AUXG/AUXS/AUXPT/AUXPD), yields, or withdrawals.\n\nFor account-specific issues a human will follow up after I answer.\n\nEmail: support@auxite.io\nWeb: vault.auxite.io`
      );
      // Also let the ops chat know a new user joined.
      await notifyOps(`👤 New Telegram support chat: ${firstName} ${username} (chat_id: <code>${chatId}</code>)`);
      return NextResponse.json({ ok: true });
    }

    // Generate AI response with Claude.
    const aiText = await generateAIResponse(userText, firstName);
    await sendTelegramReply(chatId, aiText);

    // First inbound message after /start usually contains the actual
    // question — forward a digest to the ops chat so a human can jump in.
    await notifyOps(
      `💬 Telegram support — ${firstName} ${username} (chat_id: <code>${chatId}</code>)\n\n<b>User:</b> ${escapeHtml(userText.slice(0, 500))}\n\n<b>AI replied:</b> ${escapeHtml(aiText.slice(0, 500))}`
    );

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[Telegram] Webhook error:", error?.message || error);
    // Always 200 — Telegram retries indefinitely on non-200 responses,
    // which is worse than dropping one buggy update.
    return NextResponse.json({ ok: true });
  }
}

// GET = health probe. Telegram only POSTs; this is for us / monitoring.
export async function GET() {
  return NextResponse.json({
    status: "Telegram webhook active",
    bot: "@AuxiteSupportbot",
    aiEnabled: !!ANTHROPIC_API_KEY,
    opsNotifications: !!TELEGRAM_OPS_CHAT_ID,
  });
}

async function generateAIResponse(userMessage: string, firstName: string): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    return "Thanks for reaching out! Our team will get back to you shortly. For urgent matters: support@auxite.io 📧";
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: firstName
              ? `User ${firstName} says: ${userMessage}`
              : userMessage,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("[Telegram] Anthropic API error:", response.status);
      return "Thanks for your message! Our team will get back to you shortly. For urgent matters: support@auxite.io 📧";
    }

    const data = await response.json();
    const aiText: string = data.content?.[0]?.text || "Thank you for your message. Please contact support@auxite.io for assistance.";

    // Telegram message limit is 4096 chars — truncate safely.
    return aiText.length > 4000 ? aiText.substring(0, 4000) + "…" : aiText;
  } catch (error: any) {
    console.error("[Telegram] AI generation error:", error?.message || error);
    return "Thanks for reaching out! Our support team will assist you shortly. Email: support@auxite.io 📧";
  }
}

async function sendTelegramReply(chatId: number, text: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("[Telegram] No bot token — cannot send reply");
    return;
  }
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    console.error("[Telegram] sendMessage failed:", response.status, err);
  }
}

async function notifyOps(html: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_OPS_CHAT_ID) return;
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_OPS_CHAT_ID,
      text: html,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  }).catch((e) => console.warn("[Telegram] ops notify failed:", e?.message));
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
