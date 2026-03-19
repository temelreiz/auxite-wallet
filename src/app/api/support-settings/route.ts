import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const DEFAULT_SETTINGS = {
  whatsappNumber: '+447520637591',
  telegramLink: 'https://t.me/auxite',
  supportEmail: 'support@auxite.io',
  phoneNumber: '+447520637591',
  businessHours: 'Mon-Fri 9:00-18:00 CET',
};

const SETTINGS_KEY = "auxite:support-contact-settings";

async function getRedis() {
  const { Redis } = await import("@upstash/redis");
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

// Public endpoint - no admin auth required
export async function GET() {
  try {
    const redis = await getRedis();
    const settings = await redis.get(SETTINGS_KEY);
    if (settings && typeof settings === "object") {
      return NextResponse.json({ settings: { ...DEFAULT_SETTINGS, ...settings as object } });
    }
    return NextResponse.json({ settings: DEFAULT_SETTINGS });
  } catch (e) {
    console.error("Public support settings GET error:", e);
    return NextResponse.json({ settings: DEFAULT_SETTINGS });
  }
}
