// src/app/api/auth/link-wallet/route.ts
// Link Wallet Address to User Account

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import jwt from 'jsonwebtoken';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const JWT_SECRET = process.env.JWT_SECRET || 'auxite-jwt-secret-change-in-production';

// Verify JWT and get user info
function verifyToken(authHeader: string | null): { userId: string; email: string } | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return {
      userId: decoded.userId,
      email: decoded.email,
    };
  } catch (error) {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // ══════════════════════════════════════════════════════════════
    // AUTHENTICATION
    // ══════════════════════════════════════════════════════════════
    const authHeader = request.headers.get('Authorization');
    const user = verifyToken(authHeader);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { walletAddress } = body;

    // ══════════════════════════════════════════════════════════════
    // VALIDATION
    // ══════════════════════════════════════════════════════════════
    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    const normalizedWallet = walletAddress.toLowerCase();
    const normalizedEmail = user.email.toLowerCase();

    // ══════════════════════════════════════════════════════════════
    // CHECK IF WALLET ALREADY LINKED TO ANOTHER USER
    // ══════════════════════════════════════════════════════════════
    const existingWalletUser = await redis.get(`auth:wallet:${normalizedWallet}`);
    
    if (existingWalletUser && existingWalletUser !== normalizedEmail) {
      return NextResponse.json(
        { success: false, error: 'This wallet is already linked to another account' },
        { status: 409 }
      );
    }

    // ══════════════════════════════════════════════════════════════
    // GET USER DATA
    // ══════════════════════════════════════════════════════════════
    const userData = await redis.hgetall(`auth:user:${normalizedEmail}`) as any;
    
    if (!userData || Object.keys(userData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // ══════════════════════════════════════════════════════════════
    // LINK WALLET TO USER
    // ══════════════════════════════════════════════════════════════
    
    // Update user record
    await redis.hset(`auth:user:${normalizedEmail}`, {
      walletAddress: normalizedWallet,
      walletLinkedAt: Date.now(),
    });

    // Create wallet -> email index
    await redis.set(`auth:wallet:${normalizedWallet}`, normalizedEmail);

    // ══════════════════════════════════════════════════════════════
    // UPDATE EXISTING WALLET DATA (if any)
    // ══════════════════════════════════════════════════════════════
    // Link email to existing wallet user data
    const walletUserData = await redis.hgetall(`user:${normalizedWallet}`) as any;
    
    if (walletUserData && Object.keys(walletUserData).length > 0) {
      await redis.hset(`user:${normalizedWallet}`, {
        email: normalizedEmail,
        authLinked: true,
        authLinkedAt: Date.now(),
      });
    } else {
      // Create new wallet user record
      await redis.hset(`user:${normalizedWallet}`, {
        address: normalizedWallet,
        email: normalizedEmail,
        authLinked: true,
        authLinkedAt: Date.now(),
        createdAt: Date.now(),
      });
    }

    // ══════════════════════════════════════════════════════════════
    // GENERATE NEW JWT TOKEN (with wallet info)
    // ══════════════════════════════════════════════════════════════
    const newToken = jwt.sign(
      {
        userId: userData.id,
        email: normalizedEmail,
        emailVerified: userData.emailVerified === 'true' || userData.emailVerified === true,
        walletAddress: normalizedWallet,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // ══════════════════════════════════════════════════════════════
    // RESPONSE
    // ══════════════════════════════════════════════════════════════
    return NextResponse.json({
      success: true,
      message: 'Wallet linked successfully',
      user: {
        id: userData.id,
        email: normalizedEmail,
        name: userData.name || '',
        emailVerified: userData.emailVerified === 'true' || userData.emailVerified === true,
        walletAddress: normalizedWallet,
      },
      token: newToken,
    });

  } catch (error: any) {
    console.error('Link wallet error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to link wallet. Please try again.' },
      { status: 500 }
    );
  }
}

// GET - Check if wallet is already linked
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    const normalizedWallet = walletAddress.toLowerCase();
    const linkedEmail = await redis.get(`auth:wallet:${normalizedWallet}`);

    return NextResponse.json({
      success: true,
      isLinked: !!linkedEmail,
      // Don't expose the actual email for privacy
    });

  } catch (error: any) {
    console.error('Check wallet link error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check wallet status' },
      { status: 500 }
    );
  }
}
