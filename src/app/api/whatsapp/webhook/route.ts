// WhatsApp AI Chatbot - Twilio Webhook
// Receives incoming WhatsApp messages, processes with AI, sends response

import { NextRequest, NextResponse } from "next/server";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!;
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+15559556796";

// Auxite platform knowledge base for AI
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
- Crypto only: USDT, USDC, ETH, BTC on Base network
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
- WhatsApp: +44 7520 637591
- Telegram: t.me/auxite

RULES:
- Be concise and helpful (WhatsApp messages should be short)
- Never give investment advice or price predictions
- Never share private keys, passwords, or sensitive info
- If unsure, direct user to support@auxite.io
- Respond in the same language the user writes in
- Use emojis sparingly for friendliness`;

export async function POST(request: NextRequest) {
  try {
    // Parse Twilio webhook (form-urlencoded)
    const formData = await request.formData();
    const from = formData.get("From") as string; // whatsapp:+447520637591
    const body = (formData.get("Body") as string || "").trim();
    const profileName = formData.get("ProfileName") as string || "";

    if (!from || !body) {
      return new NextResponse("OK", { status: 200 });
    }

    console.log(`[WhatsApp] From: ${from} (${profileName}): ${body}`);

    // Generate AI response using Anthropic Claude
    const aiResponse = await generateAIResponse(body, from, profileName);

    // Send response via Twilio
    await sendWhatsAppMessage(from, aiResponse);

    // Return TwiML empty response (we send via REST API instead)
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { status: 200, headers: { "Content-Type": "text/xml" } }
    );
  } catch (error) {
    console.error("[WhatsApp] Webhook error:", error);
    return new NextResponse("OK", { status: 200 });
  }
}

// Also handle GET for webhook verification
export async function GET() {
  return NextResponse.json({ status: "WhatsApp webhook active" });
}

async function generateAIResponse(
  userMessage: string,
  userPhone: string,
  profileName: string
): Promise<string> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!anthropicKey) {
    return "Thank you for contacting Auxite! Our AI assistant is being set up. Please email support@auxite.io for immediate help. 🙏";
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `User ${profileName || userPhone} says: ${userMessage}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("[WhatsApp] Anthropic API error:", response.status);
      return "Thanks for your message! Our team will get back to you shortly. For urgent matters, email support@auxite.io 📧";
    }

    const data = await response.json();
    const aiText = data.content?.[0]?.text || "Thank you for your message. Please contact support@auxite.io for assistance.";

    // WhatsApp message limit is 4096 chars — truncate if needed
    return aiText.length > 4000 ? aiText.substring(0, 4000) + "..." : aiText;
  } catch (error) {
    console.error("[WhatsApp] AI generation error:", error);
    return "Thanks for reaching out! Our support team will assist you shortly. Email: support@auxite.io 📧";
  }
}

async function sendWhatsAppMessage(to: string, body: string): Promise<void> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

  const params = new URLSearchParams();
  params.append("To", to);
  params.append("From", TWILIO_WHATSAPP_FROM);
  params.append("Body", body);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[WhatsApp] Send failed:", error);
  } else {
    console.log("[WhatsApp] Message sent to:", to);
  }
}
