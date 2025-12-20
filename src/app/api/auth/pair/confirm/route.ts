// app/api/auth/pair/confirm/route.ts
// Final confirmation from mobile - approves or rejects web login

import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { v4 as uuidv4 } from 'uuid';

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
    const { sessionId, walletAddress, approved, signature, deviceId } = body;

    // Validate required fields
    if (!sessionId || !walletAddress || approved === undefined) {
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

    // Verify wallet address matches
    if (session.walletAddress && session.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return NextResponse.json({
        success: false,
        error: 'Wallet address mismatch',
      });
    }

    // Check if already processed
    if (session.status === 'confirmed' || session.status === 'rejected') {
      return NextResponse.json({
        success: false,
        error: 'Session already processed',
      });
    }

    // TODO: In production, verify signature to ensure user owns the wallet
    // const isValidSignature = await verifySignature(message, signature, walletAddress);
    // if (!isValidSignature) { return error }

    if (approved) {
      // Generate auth token for web session
      const authToken = uuidv4();
      
      session.status = 'confirmed';
      session.authToken = authToken;
      session.confirmedAt = Date.now();
      session.walletAddress = walletAddress;

      // Store auth token mapping (1 hour expiry)
      await kv.set(`auth:${authToken}`, JSON.stringify({
        walletAddress,
        sessionId,
        createdAt: Date.now(),
        expiresAt: Date.now() + (3600 * 1000),
      }), { ex: 3600 });

    } else {
      session.status = 'rejected';
      session.confirmedAt = Date.now();
    }

    // Save updated session (keep for 2 minutes for polling)
    await kv.set(`pair:${sessionId}`, JSON.stringify(session), { ex: 120 });

    return NextResponse.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        status: session.status,
        walletAddress: session.walletAddress,
        authToken: approved ? session.authToken : null,
      },
    });
  } catch (error) {
    console.error('Confirm pairing error:', error);
    return NextResponse.json(
      { success: false, error: 'Confirmation failed' },
      { status: 500 }
    );
  }
}
