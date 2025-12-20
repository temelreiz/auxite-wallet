// app/api/auth/pair/verify/route.ts
// Verifies QR scan from mobile app

import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

interface PairingSession {
  sessionId: string;
  pairingCode: string;
  qrData: string;
  walletAddress: string | null;
  sourceDevice: string;
  targetDevice: string;
  expiresAt: number;
  status: 'pending' | 'verified' | 'confirmed' | 'rejected' | 'expired';
  createdAt: number;
  mobileDeviceId: string | null;
  verifiedAt: number | null;
  confirmedAt: number | null;
  authToken: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, pairingCode, walletAddress, deviceId } = body;

    // Validate required fields
    if (!sessionId || !pairingCode || !walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get session from KV
    const sessionData = await kv.get(`pair:${sessionId}`);
    if (!sessionData) {
      return NextResponse.json({
        success: false,
        error: 'Session not found or expired',
      });
    }

    const session: PairingSession = typeof sessionData === 'string' 
      ? JSON.parse(sessionData) 
      : sessionData as PairingSession;

    // Verify pairing code
    if (session.pairingCode !== pairingCode) {
      return NextResponse.json({
        success: false,
        error: 'Invalid pairing code',
      });
    }

    // Check if session expired
    if (Date.now() > session.expiresAt) {
      await kv.del(`pair:${sessionId}`);
      return NextResponse.json({
        success: false,
        error: 'Session expired',
      });
    }

    // Check if already confirmed
    if (session.status === 'confirmed') {
      return NextResponse.json({
        success: false,
        error: 'Session already confirmed',
      });
    }

    // Update session with wallet address and device info
    session.walletAddress = walletAddress;
    session.mobileDeviceId = deviceId || null;
    session.verifiedAt = Date.now();
    session.status = 'verified';

    // Save updated session
    const remainingTTL = Math.ceil((session.expiresAt - Date.now()) / 1000);
    await kv.set(`pair:${sessionId}`, JSON.stringify(session), { 
      ex: Math.max(remainingTTL, 60) 
    });

    return NextResponse.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        status: session.status,
        walletAddress: session.walletAddress,
        sourceDevice: session.sourceDevice,
      },
    });
  } catch (error) {
    console.error('Verify pairing error:', error);
    return NextResponse.json(
      { success: false, error: 'Verification failed' },
      { status: 500 }
    );
  }
}
