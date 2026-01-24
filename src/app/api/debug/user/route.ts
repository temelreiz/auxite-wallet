// src/app/api/debug/user/route.ts
// Debug endpoint - sadece development için

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const userData = await redis.hgetall(`auth:user:${normalizedEmail}`);

    if (!userData || Object.keys(userData).length === 0) {
      return NextResponse.json({ error: 'User not found', email: normalizedEmail }, { status: 404 });
    }

    // Hassas verileri çıkar
    const { passwordHash, ...safeData } = userData as any;

    return NextResponse.json({
      success: true,
      email: normalizedEmail,
      user: safeData,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Delete user data
    const deleted = await redis.del(`auth:user:${normalizedEmail}`);
    
    // Delete email index
    await redis.del(`auth:email:${normalizedEmail}`);

    if (deleted === 0) {
      return NextResponse.json({ error: 'User not found', email: normalizedEmail }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `User ${normalizedEmail} deleted`,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
