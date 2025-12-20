// app/api/auth/session/verify/route.ts
// Verify session token for authentication

import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

interface SessionData {
  walletAddress: string;
  deviceId: string | null;
  platform: string;
  createdAt: number;
  expiresAt: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token } = body;

    // Validate required fields
    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Token required' },
        { status: 400 }
      );
    }

    // Get session from KV
    const sessionData = await kv.get(`auth:${token}`);
    
    if (!sessionData) {
      return NextResponse.json({ valid: false });
    }

    const session: SessionData = typeof sessionData === 'string' 
      ? JSON.parse(sessionData) 
      : sessionData as SessionData;

    // Check if expired
    if (Date.now() > session.expiresAt) {
      // Clean up expired session
      await kv.del(`auth:${token}`);
      return NextResponse.json({ valid: false });
    }

    return NextResponse.json({
      valid: true,
      walletAddress: session.walletAddress,
      platform: session.platform,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    console.error('Verify session error:', error);
    return NextResponse.json(
      { valid: false, error: 'Verification failed' },
      { status: 500 }
    );
  }
}

// GET - Verify via query param (for redirects)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Token required' },
        { status: 400 }
      );
    }

    // Get session from KV
    const sessionData = await kv.get(`auth:${token}`);
    
    if (!sessionData) {
      return NextResponse.json({ valid: false });
    }

    const session: SessionData = typeof sessionData === 'string' 
      ? JSON.parse(sessionData) 
      : sessionData as SessionData;

    // Check if expired
    if (Date.now() > session.expiresAt) {
      await kv.del(`auth:${token}`);
      return NextResponse.json({ valid: false });
    }

    return NextResponse.json({
      valid: true,
      walletAddress: session.walletAddress,
    });
  } catch (error) {
    console.error('Verify session error:', error);
    return NextResponse.json(
      { valid: false, error: 'Verification failed' },
      { status: 500 }
    );
  }
}
