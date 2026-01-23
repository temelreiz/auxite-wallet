// src/app/api/auth/forgot-password/route.ts
// Forgot Password - Send Reset Email

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { randomBytes } from 'crypto';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

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
    // CHECK IF USER EXISTS
    // ══════════════════════════════════════════════════════════════
    const userData = await redis.hgetall(`auth:user:${normalizedEmail}`) as any;
    
    // Always return success to prevent email enumeration attacks
    if (!userData || Object.keys(userData).length === 0) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a reset link has been sent.',
      });
    }

    // Check if user is OAuth only (no password)
    if (userData.authProvider !== 'email' && !userData.passwordHash) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a reset link has been sent.',
      });
    }

    // ══════════════════════════════════════════════════════════════
    // RATE LIMITING
    // ══════════════════════════════════════════════════════════════
    const lastResetRequest = parseInt(userData.lastPasswordResetRequest || '0');
    const timeSinceLastRequest = Date.now() - lastResetRequest;
    
    // Allow only 1 request per 2 minutes
    if (timeSinceLastRequest < 2 * 60 * 1000) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a reset link has been sent.',
      });
    }

    // ══════════════════════════════════════════════════════════════
    // GENERATE RESET TOKEN
    // ══════════════════════════════════════════════════════════════
    const resetToken = randomBytes(32).toString('hex');
    const resetExpiry = Date.now() + 60 * 60 * 1000; // 1 hour expiry

    // Save reset token
    await redis.hset(`auth:user:${normalizedEmail}`, {
      passwordResetToken: resetToken,
      passwordResetExpiry: resetExpiry,
      lastPasswordResetRequest: Date.now(),
    });

    // ══════════════════════════════════════════════════════════════
    // SEND RESET EMAIL
    // ══════════════════════════════════════════════════════════════
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://wallet.auxite.io'}/reset-password?token=${resetToken}&email=${encodeURIComponent(normalizedEmail)}`;

    await redis.lpush('email:queue', JSON.stringify({
      type: 'password-reset',
      to: normalizedEmail,
      subject: 'Reset your Auxite password',
      data: {
        name: userData.name || normalizedEmail.split('@')[0],
        resetUrl,
        expiryMinutes: 60,
        language: userData.language || 'en',
      },
      createdAt: Date.now(),
    }));

    // ══════════════════════════════════════════════════════════════
    // RESPONSE
    // ══════════════════════════════════════════════════════════════
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a reset link has been sent.',
    });

  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request. Please try again.' },
      { status: 500 }
    );
  }
}
