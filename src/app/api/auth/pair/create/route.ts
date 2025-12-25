// app/api/auth/pair/create/route.ts
// Creates a new pairing session for QR code display (Web → Mobile login)
import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { v4 as uuidv4 } from 'uuid';

const SESSION_EXPIRY = 300; // 5 minutes

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { sourceDevice = 'web', targetDevice = 'mobile', walletAddress } = body;

    // Generate unique session ID and 6-digit pairing code
    const sessionId = uuidv4();
    const pairingCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // ✅ QR'a wallet address'i de ekle
    const qrData = walletAddress 
      ? `auxite://auth?session=${sessionId}&code=${pairingCode}&address=${walletAddress}`
      : `auxite://auth?session=${sessionId}&code=${pairingCode}`;
    
    const session = {
      sessionId,
      pairingCode,
      qrData,
      walletAddress: walletAddress || null,
      sourceDevice,
      targetDevice,
      expiresAt: Date.now() + (SESSION_EXPIRY * 1000),
      status: 'pending' as const,
      createdAt: Date.now(),
      mobileDeviceId: null,
      verifiedAt: null,
      confirmedAt: null,
      authToken: null,
    };

    // Store in Redis/KV with expiry
    await kv.set(`pair:${sessionId}`, JSON.stringify(session), { ex: SESSION_EXPIRY });

    // Return session data for QR code generation
    return NextResponse.json({
      sessionId: session.sessionId,
      pairingCode: session.pairingCode,
      qrData: session.qrData,
      expiresAt: session.expiresAt,
      status: session.status,
      walletAddress: session.walletAddress,
    });
  } catch (error) {
    console.error('Create pairing session error:', error);
    return NextResponse.json(
      { error: 'Failed to create pairing session' },
      { status: 500 }
    );
  }
}
