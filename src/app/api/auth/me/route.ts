// src/app/api/auth/me/route.ts
// Get Current User Info

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

export async function GET(request: NextRequest) {
  try {
    // ══════════════════════════════════════════════════════════════
    // AUTHENTICATION
    // ══════════════════════════════════════════════════════════════
    const authHeader = request.headers.get('Authorization');
    const tokenUser = verifyToken(authHeader);

    if (!tokenUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // ══════════════════════════════════════════════════════════════
    // GET USER DATA
    // ══════════════════════════════════════════════════════════════
    const userData = await redis.hgetall(`auth:user:${tokenUser.email}`) as any;
    
    if (!userData || Object.keys(userData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // ══════════════════════════════════════════════════════════════
    // RESPONSE
    // ══════════════════════════════════════════════════════════════
    return NextResponse.json({
      success: true,
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name || '',
        phone: userData.phone || '',
        picture: userData.picture || '',
        language: userData.language || 'en',
        emailVerified: userData.emailVerified === 'true' || userData.emailVerified === true,
        walletAddress: userData.walletAddress || '',
        authProvider: userData.authProvider || 'email',
        createdAt: userData.createdAt,
        lastLogin: userData.lastLogin,
        has2FA: !!(userData.twoFactorEnabled === 'true' || userData.twoFactorEnabled === true),
      },
    });

  } catch (error: any) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get user info' },
      { status: 500 }
    );
  }
}

// PUT - Update user profile
export async function PUT(request: NextRequest) {
  try {
    // ══════════════════════════════════════════════════════════════
    // AUTHENTICATION
    // ══════════════════════════════════════════════════════════════
    const authHeader = request.headers.get('Authorization');
    const tokenUser = verifyToken(authHeader);

    if (!tokenUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, phone, language } = body;

    // ══════════════════════════════════════════════════════════════
    // GET USER DATA
    // ══════════════════════════════════════════════════════════════
    const userData = await redis.hgetall(`auth:user:${tokenUser.email}`) as any;
    
    if (!userData || Object.keys(userData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // ══════════════════════════════════════════════════════════════
    // UPDATE USER
    // ══════════════════════════════════════════════════════════════
    const updates: any = { updatedAt: Date.now() };
    
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (language !== undefined) updates.language = language;

    await redis.hset(`auth:user:${tokenUser.email}`, updates);

    // ══════════════════════════════════════════════════════════════
    // RESPONSE
    // ══════════════════════════════════════════════════════════════
    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: userData.id,
        email: userData.email,
        name: updates.name || userData.name || '',
        phone: updates.phone || userData.phone || '',
        language: updates.language || userData.language || 'en',
        emailVerified: userData.emailVerified === 'true' || userData.emailVerified === true,
        walletAddress: userData.walletAddress || '',
      },
    });

  } catch (error: any) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
