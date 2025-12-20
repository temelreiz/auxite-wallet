// app/api/auth/mobile-confirm/route.ts
// Mobile confirms or rejects auth request

import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { v4 as uuidv4 } from 'uuid';

interface AuthRequest {
  requestId: string;
  walletAddress: string;
  action: string;
  actionData: Record<string, any>;
  fromDevice: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'expired';
  createdAt: number;
  expiresAt: number;
  confirmedBy: string | null;
  confirmedAt: number | null;
  authToken: string | null;
  deepLink: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { requestId, walletAddress, approved, deviceId } = body;

    // Validate required fields
    if (!requestId || !walletAddress || approved === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get auth request
    const requestData = await kv.get(`auth_request:${requestId}`);
    
    if (!requestData) {
      return NextResponse.json({
        success: false,
        error: 'Request not found or expired',
      });
    }

    const authRequest: AuthRequest = typeof requestData === 'string' 
      ? JSON.parse(requestData) 
      : requestData as AuthRequest;

    // Verify wallet address matches
    if (authRequest.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return NextResponse.json({
        success: false,
        error: 'Wallet address mismatch',
      });
    }

    // Check if already processed
    if (authRequest.status !== 'pending') {
      return NextResponse.json({
        success: false,
        error: 'Request already processed',
      });
    }

    // Check if expired
    if (Date.now() > authRequest.expiresAt) {
      authRequest.status = 'expired';
      await kv.set(`auth_request:${requestId}`, JSON.stringify(authRequest), { ex: 60 });
      return NextResponse.json({
        success: false,
        error: 'Request expired',
      });
    }

    let responseData: Record<string, any> = { success: true };

    if (approved) {
      // Generate auth token for web
      const authToken = uuidv4();
      
      authRequest.status = 'confirmed';
      authRequest.confirmedBy = deviceId || 'unknown';
      authRequest.confirmedAt = Date.now();
      authRequest.authToken = authToken;

      // Store auth token (1 hour expiry)
      await kv.set(`auth:${authToken}`, JSON.stringify({
        walletAddress: authRequest.walletAddress,
        requestId,
        createdAt: Date.now(),
        expiresAt: Date.now() + (3600 * 1000),
      }), { ex: 3600 });

      // Generate deep link if action requires it
      if (authRequest.action === 'open_app') {
        const path = authRequest.actionData?.path || '/';
        authRequest.deepLink = `auxite://${path.replace(/^\//, '')}`;
      } else if (authRequest.action === 'stake') {
        authRequest.deepLink = `auxite://stake`;
      } else if (authRequest.action === 'trade') {
        const metal = authRequest.actionData?.metal || '';
        authRequest.deepLink = `auxite://trade${metal ? `?metal=${metal}` : ''}`;
      }

      responseData.authToken = authToken;
      responseData.deepLink = authRequest.deepLink;
    } else {
      authRequest.status = 'rejected';
      authRequest.confirmedBy = deviceId || 'unknown';
      authRequest.confirmedAt = Date.now();
    }

    // Save updated request (keep for 2 minutes for polling)
    await kv.set(`auth_request:${requestId}`, JSON.stringify(authRequest), { ex: 120 });

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Mobile confirm error:', error);
    return NextResponse.json(
      { success: false, error: 'Confirmation failed' },
      { status: 500 }
    );
  }
}
