// app/api/auth/mobile-status/[requestId]/route.ts
// Check auth request status (polling from web)

import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

interface AuthRequest {
  requestId: string;
  walletAddress: string;
  action: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'expired';
  expiresAt: number;
  authToken: string | null;
  confirmedAt: number | null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const { requestId } = params;

    if (!requestId) {
      return NextResponse.json(
        { status: 'error', error: 'Request ID required' },
        { status: 400 }
      );
    }

    // Get auth request from KV
    const requestData = await kv.get(`auth_request:${requestId}`);
    
    if (!requestData) {
      return NextResponse.json({ status: 'expired' });
    }

    const authRequest: AuthRequest = typeof requestData === 'string' 
      ? JSON.parse(requestData) 
      : requestData as AuthRequest;

    // Check if expired
    if (Date.now() > authRequest.expiresAt && authRequest.status === 'pending') {
      return NextResponse.json({ status: 'expired' });
    }

    // Return appropriate response based on status
    const response: Record<string, any> = {
      status: authRequest.status,
    };

    // Include auth token only if confirmed
    if (authRequest.status === 'confirmed') {
      response.token = authRequest.authToken;
      response.walletAddress = authRequest.walletAddress;
      response.confirmedAt = authRequest.confirmedAt;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Check mobile status error:', error);
    return NextResponse.json(
      { status: 'error', error: 'Failed to check status' },
      { status: 500 }
    );
  }
}
