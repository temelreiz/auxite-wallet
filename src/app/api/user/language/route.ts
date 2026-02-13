// POST /api/user/language
// Syncs user language preference to Redis for email/notification delivery

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import jwt from 'jsonwebtoken';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const SUPPORTED_LANGUAGES = ['en', 'tr', 'de', 'fr', 'ar', 'ru'];

export async function POST(req: NextRequest) {
  try {
    const { language } = await req.json();

    if (!language || !SUPPORTED_LANGUAGES.includes(language)) {
      return NextResponse.json(
        { error: 'Invalid language. Supported: en, tr, de, fr, ar, ru' },
        { status: 400 }
      );
    }

    // Extract user from JWT token
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || '';

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const email = decoded.email;
    const userId = decoded.userId;
    const walletAddress = decoded.walletAddress;

    if (!email) {
      return NextResponse.json({ error: 'No email in token' }, { status: 400 });
    }

    // Update language in all user record locations
    const updates: Promise<any>[] = [];

    // 1. auth:user:{email} — primary user record
    updates.push(redis.hset(`auth:user:${email}`, { language }));

    // 2. user:{userId} — if userId exists
    if (userId) {
      updates.push(redis.hset(`user:${userId}`, { language }));
    }

    // 3. user:{walletAddress} — deposit scanner user record
    if (walletAddress) {
      updates.push(redis.hset(`user:${walletAddress.toLowerCase()}`, { language }));
    }

    await Promise.all(updates);

    console.log(`[Language] Updated to '${language}' for ${email}`);

    return NextResponse.json({ success: true, language });
  } catch (error: any) {
    console.error('[Language] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update language' },
      { status: 500 }
    );
  }
}
