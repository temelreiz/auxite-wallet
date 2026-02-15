// src/app/api/auth/resend-code/route.ts
// Resend Verification Code

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { sendEmail } from '@/lib/email-service';
import { authLimiter, withRateLimit } from '@/lib/security/rate-limiter';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Generate 6 digit code
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 attempts per minute per IP
    const rateLimited = await withRateLimit(request, authLimiter);
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Get user
    const userData = await redis.hgetall(`auth:user:${normalizedEmail}`) as any;

    if (!userData || Object.keys(userData).length === 0) {
      // Don't reveal if user exists
      return NextResponse.json({ success: true });
    }

    // Check if already verified
    if (userData.emailVerified === true || userData.emailVerified === 'true') {
      return NextResponse.json({
        success: true,
        message: 'Email already verified',
      });
    }

    // Generate new code
    const verificationCode = generateVerificationCode();
    const verificationToken = require('crypto').randomBytes(32).toString('hex');

    // Update user with new code
    await redis.hset(`auth:user:${normalizedEmail}`, {
      verificationCode,
      verificationCodeExpiry: Date.now() + 10 * 60 * 1000, // 10 minutes
      verificationToken,
    });

    // Send email
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://vault.auxite.io'}/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(normalizedEmail)}`;

    await sendEmail({
      type: 'verification-code',
      to: normalizedEmail,
      data: {
        name: userData.name || normalizedEmail.split('@')[0],
        code: verificationCode,
        verificationUrl,
        language: userData.language || 'en',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Verification code sent',
    });

  } catch (error: any) {
    console.error('Resend code error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to resend code' },
      { status: 500 }
    );
  }
}
