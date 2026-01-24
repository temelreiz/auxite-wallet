// src/app/api/auth/link-wallet/route.ts
// Link wallet address to user account

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import jwt from 'jsonwebtoken';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

export async function POST(request: NextRequest) {
  try {
    // Get token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { walletAddress } = await request.json();

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Validate wallet address format (Ethereum)
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    const userEmail = decoded.email;
    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: 'Invalid token - no email' },
        { status: 401 }
      );
    }

    // Get user from Redis
    const userData = await redis.hgetall(`auth:user:${userEmail}`) as any;
    if (!userData || Object.keys(userData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if wallet is already linked to another user
    const existingUser = await redis.get(`wallet:${walletAddress.toLowerCase()}`);
    if (existingUser && existingUser !== userEmail) {
      return NextResponse.json(
        { success: false, error: 'Wallet already linked to another account' },
        { status: 400 }
      );
    }

    // Update user with wallet address
    await redis.hset(`auth:user:${userEmail}`, {
      walletAddress: walletAddress,
    });

    // Create wallet -> email mapping for reverse lookup
    await redis.set(`wallet:${walletAddress.toLowerCase()}`, userEmail);

    // Generate new token with wallet address
    const newToken = jwt.sign(
      {
        userId: userData.id,
        email: userEmail,
        emailVerified: true,
        walletAddress: walletAddress,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return updated user
    const updatedUser = {
      id: userData.id,
      email: userEmail,
      name: userData.name,
      emailVerified: true,
      walletAddress: walletAddress,
    };

    return NextResponse.json({
      success: true,
      message: 'Wallet linked successfully',
      user: updatedUser,
      token: newToken,
    });

  } catch (error: any) {
    console.error('Link wallet error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to link wallet' },
      { status: 500 }
    );
  }
}
