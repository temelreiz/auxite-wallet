// src/app/api/auth/verify-email/route.ts
// Email Verification API

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import jwt from 'jsonwebtoken';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const JWT_SECRET = process.env.JWT_SECRET || 'auxite-jwt-secret-change-in-production';

// GET - Verify email with token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    // ══════════════════════════════════════════════════════════════
    // VALIDATION
    // ══════════════════════════════════════════════════════════════
    if (!token || !email) {
      return NextResponse.json(
        { success: false, error: 'Invalid verification link' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ══════════════════════════════════════════════════════════════
    // FIND USER AND VERIFY TOKEN
    // ══════════════════════════════════════════════════════════════
    const userData = await redis.hgetall(`auth:user:${normalizedEmail}`) as any;
    
    if (!userData || Object.keys(userData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid verification link' },
        { status: 400 }
      );
    }

    // Check if already verified
    if (userData.emailVerified === 'true' || userData.emailVerified === true) {
      return NextResponse.json({
        success: true,
        message: 'Email already verified',
        alreadyVerified: true,
      });
    }

    // Check token
    if (userData.verificationToken !== token) {
      return NextResponse.json(
        { success: false, error: 'Invalid verification link' },
        { status: 400 }
      );
    }

    // ══════════════════════════════════════════════════════════════
    // VERIFY EMAIL
    // ══════════════════════════════════════════════════════════════
    await redis.hset(`auth:user:${normalizedEmail}`, {
      emailVerified: true,
      verificationToken: '',
      verifiedAt: Date.now(),
    });

    // ══════════════════════════════════════════════════════════════
    // GENERATE NEW JWT TOKEN
    // ══════════════════════════════════════════════════════════════
    const jwtToken = jwt.sign(
      {
        userId: userData.id,
        email: normalizedEmail,
        emailVerified: true,
        walletAddress: userData.walletAddress || '',
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // ══════════════════════════════════════════════════════════════
    // SEND WELCOME EMAIL
    // ══════════════════════════════════════════════════════════════
    await redis.lpush('email:queue', JSON.stringify({
      type: 'welcome',
      to: normalizedEmail,
      subject: 'Welcome to Auxite!',
      data: {
        name: userData.name || normalizedEmail.split('@')[0],
        language: userData.language || 'en',
      },
      createdAt: Date.now(),
    }));

    // ══════════════════════════════════════════════════════════════
    // RESPONSE
    // ══════════════════════════════════════════════════════════════
    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      token: jwtToken,
      user: {
        id: userData.id,
        email: normalizedEmail,
        name: userData.name || '',
        emailVerified: true,
        walletAddress: userData.walletAddress || '',
      },
    });

  } catch (error: any) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Verification failed. Please try again.' },
      { status: 500 }
    );
  }
}

// POST - Resend verification email
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // ══════════════════════════════════════════════════════════════
    // VALIDATION
    // ══════════════════════════════════════════════════════════════
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ══════════════════════════════════════════════════════════════
    // FIND USER
    // ══════════════════════════════════════════════════════════════
    const userData = await redis.hgetall(`auth:user:${normalizedEmail}`) as any;
    
    if (!userData || Object.keys(userData).length === 0) {
      // Don't reveal if email exists
      return NextResponse.json({
        success: true,
        message: 'If an account exists, a verification email has been sent.',
      });
    }

    // Check if already verified
    if (userData.emailVerified === 'true' || userData.emailVerified === true) {
      return NextResponse.json({
        success: true,
        message: 'Email is already verified',
        alreadyVerified: true,
      });
    }

    // ══════════════════════════════════════════════════════════════
    // RATE LIMITING
    // ══════════════════════════════════════════════════════════════
    const lastVerificationRequest = parseInt(userData.lastVerificationRequest || '0');
    const timeSinceLastRequest = Date.now() - lastVerificationRequest;
    
    // Allow only 1 request per 2 minutes
    if (timeSinceLastRequest < 2 * 60 * 1000) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists, a verification email has been sent.',
      });
    }

    // ══════════════════════════════════════════════════════════════
    // GENERATE NEW TOKEN IF NEEDED
    // ══════════════════════════════════════════════════════════════
    let verificationToken = userData.verificationToken;
    
    if (!verificationToken) {
      const { randomBytes } = await import('crypto');
      verificationToken = randomBytes(32).toString('hex');
      await redis.hset(`auth:user:${normalizedEmail}`, {
        verificationToken,
      });
    }

    // Update last request time
    await redis.hset(`auth:user:${normalizedEmail}`, {
      lastVerificationRequest: Date.now(),
    });

    // ══════════════════════════════════════════════════════════════
    // SEND VERIFICATION EMAIL
    // ══════════════════════════════════════════════════════════════
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://wallet.auxite.io'}/verify-email?token=${verificationToken}&email=${encodeURIComponent(normalizedEmail)}`;

    await redis.lpush('email:queue', JSON.stringify({
      type: 'verification',
      to: normalizedEmail,
      subject: 'Verify your Auxite account',
      data: {
        name: userData.name || normalizedEmail.split('@')[0],
        verificationUrl,
        language: userData.language || 'en',
      },
      createdAt: Date.now(),
    }));

    // ══════════════════════════════════════════════════════════════
    // RESPONSE
    // ══════════════════════════════════════════════════════════════
    return NextResponse.json({
      success: true,
      message: 'Verification email sent',
    });

  } catch (error: any) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send verification email. Please try again.' },
      { status: 500 }
    );
  }
}
