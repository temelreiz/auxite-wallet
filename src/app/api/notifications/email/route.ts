// app/api/notifications/email/route.ts
// Email Notification API

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import {
  sendEmail,
  tradeCompletedEmail,
  depositReceivedEmail,
  withdrawalSentEmail,
  stakingStartedEmail,
  stakingEndingSoonEmail,
  stakingEndedEmail,
  securityAlertEmail,
} from "@/lib/email";

const redis = Redis.fromEnv();

interface EmailPreferences {
  transactions: boolean;
  deposits: boolean;
  withdrawals: boolean;
  staking: boolean;
  security: boolean;
  marketing: boolean;
}

// Default preferences
const DEFAULT_PREFERENCES: EmailPreferences = {
  transactions: true,
  deposits: true,
  withdrawals: true,
  staking: true,
  security: true,
  marketing: false,
};

// GET - Kullanıcının email tercihlerini getir
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("address");

    if (!walletAddress) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    const key = `email-prefs:${walletAddress.toLowerCase()}`;
    const prefs = await redis.get(key) as EmailPreferences | null;

    // Email adresini al
    const emailKey = `user-email:${walletAddress.toLowerCase()}`;
    const email = await redis.get(emailKey) as string | null;

    return NextResponse.json({
      preferences: prefs || DEFAULT_PREFERENCES,
      email: email ? `${email.slice(0, 3)}***@${email.split("@")[1]}` : null,
      hasEmail: !!email,
    });
  } catch (error: any) {
    console.error("Email prefs GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Email gönder
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, type, data, lang = "en" } = body;

    if (!walletAddress || !type) {
      return NextResponse.json(
        { error: "walletAddress and type required" },
        { status: 400 }
      );
    }

    // Kullanıcının email'ini al
    const emailKey = `user-email:${walletAddress.toLowerCase()}`;
    const userEmail = await redis.get(emailKey) as string | null;

    if (!userEmail) {
      return NextResponse.json({
        success: false,
        error: "No email address configured",
        skipped: true,
      });
    }

    // Tercihleri kontrol et
    const prefsKey = `email-prefs:${walletAddress.toLowerCase()}`;
    const prefs = (await redis.get(prefsKey) as EmailPreferences) || DEFAULT_PREFERENCES;

    // Tip bazlı tercih kontrolü
    const typeToPreference: Record<string, keyof EmailPreferences> = {
      trade_completed: "transactions",
      deposit_received: "deposits",
      withdrawal_sent: "withdrawals",
      staking_started: "staking",
      staking_ending: "staking",
      staking_ended: "staking",
      security_alert: "security",
    };

    const preferenceKey = typeToPreference[type];
    if (preferenceKey && !prefs[preferenceKey]) {
      return NextResponse.json({
        success: false,
        error: `Email notifications disabled for ${preferenceKey}`,
        skipped: true,
      });
    }

    // Email şablonunu oluştur
    let emailContent: { subject: string; html: string };

    switch (type) {
      case "trade_completed":
        emailContent = tradeCompletedEmail({ ...data, lang });
        break;
      case "deposit_received":
        emailContent = depositReceivedEmail({ ...data, lang });
        break;
      case "withdrawal_sent":
        emailContent = withdrawalSentEmail({ ...data, lang });
        break;
      case "staking_started":
        emailContent = stakingStartedEmail({ ...data, lang });
        break;
      case "staking_ending":
        emailContent = stakingEndingSoonEmail({ ...data, lang });
        break;
      case "staking_ended":
        emailContent = stakingEndedEmail({ ...data, lang });
        break;
      case "security_alert":
        emailContent = securityAlertEmail({ ...data, lang });
        break;
      default:
        return NextResponse.json({ error: "Unknown email type" }, { status: 400 });
    }

    // Email gönder
    const result = await sendEmail({
      to: userEmail,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    // Email log kaydet
    const logKey = `email-log:${walletAddress.toLowerCase()}`;
    await redis.lpush(logKey, JSON.stringify({
      type,
      subject: emailContent.subject,
      sentAt: Date.now(),
      success: result.success,
      error: result.error,
    }));
    await redis.ltrim(logKey, 0, 99); // Son 100 email

    return NextResponse.json({
      success: result.success,
      emailId: result.id,
      error: result.error,
    });
  } catch (error: any) {
    console.error("Email send error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Email adresini ve tercihlerini güncelle
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, email, preferences } = body;

    if (!walletAddress) {
      return NextResponse.json({ error: "walletAddress required" }, { status: 400 });
    }

    const addressLower = walletAddress.toLowerCase();

    // Email güncelle
    if (email !== undefined) {
      const emailKey = `user-email:${addressLower}`;
      if (email) {
        // Email format kontrolü
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
        }
        await redis.set(emailKey, email);
      } else {
        await redis.del(emailKey);
      }
    }

    // Tercihleri güncelle
    if (preferences) {
      const prefsKey = `email-prefs:${addressLower}`;
      const currentPrefs = (await redis.get(prefsKey) as EmailPreferences) || DEFAULT_PREFERENCES;
      const updatedPrefs = { ...currentPrefs, ...preferences };
      await redis.set(prefsKey, JSON.stringify(updatedPrefs));
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Email update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
