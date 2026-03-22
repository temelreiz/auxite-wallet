// app/api/auth/session/create/route.ts
// Create session token for cross-platform authentication

import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { v4 as uuidv4 } from 'uuid';

const SESSION_EXPIRY = 3600; // 1 hour

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress, deviceId, platform } = body;

    // Validate required fields
    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Wallet address required' },
        { status: 400 }
      );
    }

    const normalizedWallet = walletAddress.toLowerCase();

    // Generate session token
    const token = uuidv4();
    
    const sessionData = {
      walletAddress: normalizedWallet,
      deviceId: deviceId || null,
      platform: platform || 'unknown',
      createdAt: Date.now(),
      expiresAt: Date.now() + (SESSION_EXPIRY * 1000),
    };

    // Store session
    await kv.set(`auth:${token}`, JSON.stringify(sessionData), { 
      ex: SESSION_EXPIRY 
    });

    return NextResponse.json({
      success: true,
      token,
      expiresAt: sessionData.expiresAt,
    });
  } catch (error) {
    console.error('Create session error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create session' },
      { status: 500 }
    );
  }
}
