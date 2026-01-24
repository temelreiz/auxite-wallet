// src/app/api/auth/verify-code/route.ts
// Verify Email with 6-digit Code (for mobile)

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import jwt from 'jsonwebtoken';
import { sendEmail } from '@/lib/email-service';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const JWT_SECRET = process.env.JWT_SECRET || 'auxite-jwt-secret-change-in-production';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = body;

    // ══════════════════════════════════════════════════════════════
    // VALIDATION
    // ══════════════════════════════════════════════════════════════
    if (!email || !code) {
      return NextResponse.json(
        { success: false, error: 'Email and code are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ══════════════════════════════════════════════════════════════
    // GET USER
    // ══════════════════════════════════════════════════════════════
    const userData = await redis.hgetall(`auth:user:${normalizedEmail}`) as any;

    if (!userData || Object.keys(userData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // ══════════════════════════════════════════════════════════════
    // CHECK IF ALREADY VERIFIED
    // ══════════════════════════════════════════════════════════════
    if (userData.emailVerified === true || userData.emailVerified === 'true') {
      return NextResponse.json({
        success: true,
        message: 'Email already verified',
        alreadyVerified: true,
      });
    }

    // ══════════════════════════════════════════════════════════════
    // VERIFY CODE
    // ══════════════════════════════════════════════════════════════
    // Compare as strings to handle both string and number types
    if (String(userData.verificationCode) !== String(code)) {
      return NextResponse.json(
        { success: false, error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Check expiry
    const expiry = parseInt(userData.verificationCodeExpiry || '0');
    if (Date.now() > expiry) {
      return NextResponse.json(
        { success: false, error: 'Verification code has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // ══════════════════════════════════════════════════════════════
    // MARK EMAIL AS VERIFIED
    // ══════════════════════════════════════════════════════════════
    await redis.hset(`auth:user:${normalizedEmail}`, {
      emailVerified: true,
      verificationCode: '',
      verificationCodeExpiry: 0,
      verificationToken: '',
    });

    // ══════════════════════════════════════════════════════════════
    // SEND WELCOME EMAIL
    // ══════════════════════════════════════════════════════════════
    await sendEmail({
      type: 'welcome',
      to: normalizedEmail,
      data: {
        name: userData.name || normalizedEmail.split('@')[0],
        language: userData.language || 'en',
      },
    });

    // ══════════════════════════════════════════════════════════════
    // GENERATE NEW TOKEN WITH VERIFIED STATUS
    // ══════════════════════════════════════════════════════════════
    const token = jwt.sign(
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
    // RESPONSE
    // ══════════════════════════════════════════════════════════════
    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      user: {
        id: userData.id,
        email: normalizedEmail,
        name: userData.name || '',
        emailVerified: true,
        walletAddress: userData.walletAddress || '',
      },
      token,
    });

  } catch (error: any) {
    console.error('Verify code error:', error);
    return NextResponse.json(
      { success: false, error: 'Verification failed. Please try again.' },
      { status: 500 }
    );
  }
}
