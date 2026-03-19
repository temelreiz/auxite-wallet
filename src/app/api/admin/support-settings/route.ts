import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = 'force-dynamic';

const DEFAULT_SETTINGS = {
  whatsappNumber: '+447520637591',
  telegramLink: 'https://t.me/auxite',
  supportEmail: 'support@auxite.io',
  phoneNumber: '+447520637591',
  businessHours: 'Mon-Fri 9:00-18:00 CET',
};

const SETTINGS_KEY = "auxite:support-contact-settings";

// Lazy Redis client
async function getRedis() {
  const { Redis } = await import("@upstash/redis");
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.authorized) return auth.response!;

    const redis = await getRedis();
    const settings = await redis.get(SETTINGS_KEY);
    if (settings && typeof settings === "object") {
      return NextResponse.json({ settings: { ...DEFAULT_SETTINGS, ...settings as object } });
    }
    return NextResponse.json({ settings: DEFAULT_SETTINGS });
  } catch (e) {
    console.error("Support settings GET error:", e);
    return NextResponse.json({ settings: DEFAULT_SETTINGS });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.authorized) return auth.response!;

    const body = await request.json();

    const settings = {
      whatsappNumber: String(body.whatsappNumber || '').trim(),
      telegramLink: String(body.telegramLink || '').trim(),
      supportEmail: String(body.supportEmail || '').trim(),
      phoneNumber: String(body.phoneNumber || '').trim(),
      businessHours: String(body.businessHours || '').trim(),
      lastUpdated: new Date().toISOString(),
    };

    const redis = await getRedis();
    await redis.set(SETTINGS_KEY, settings);

    return NextResponse.json({ success: true, settings });
  } catch (e: any) {
    console.error("Support settings POST error:", e);
    return NextResponse.json(
      { error: e.message || "Failed to save support settings" },
      { status: 500 }
    );
  }
}
