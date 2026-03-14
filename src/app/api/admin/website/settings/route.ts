import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { requireAdmin } from "@/lib/admin-auth";

const redis = Redis.fromEnv();
const SETTINGS_KEY = 'website:settings';

const DEFAULT_SETTINGS = {
  maintenanceMode: false,
  maintenanceMessage: { en: '', tr: '' },
  announcementBar: null,
  socialLinks: { twitter: '', telegram: '', discord: '', linkedin: '' },
  contactEmail: 'hello@auxite.io',
  supportEmail: 'support@auxite.io',
};

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.authorized) return auth.response!;

    const settings = await redis.get(SETTINGS_KEY);
    return NextResponse.json(settings || DEFAULT_SETTINGS);
  } catch (error) {
    console.error('Settings fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.authorized) return auth.response!;

    const settings = await request.json();
    await redis.set(SETTINGS_KEY, settings);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Settings save error:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
