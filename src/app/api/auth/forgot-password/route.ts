// src/app/api/auth/forgot-password/route.ts
// Forgot Password - Send Reset Email

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { randomBytes } from 'crypto';
import { authLimiter, withRateLimit } from '@/lib/security/rate-limiter';
import { sendPasswordResetEmail } from '@/lib/email-service';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 attempts per minute per IP
    const rateLimited = await withRateLimit(request, authLimiter);
    if (rateLimited) return rateLimited;

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
    // The old code lpush()'d onto an email:queue that nothing was
    // consuming — reset mails sat in Redis forever and users gave up.
    // Sending directly via Resend (same call every other auth flow
    // already uses) so the link lands within seconds. Failures are
    // logged but we still return success to preserve enumeration
    // protection.
    // ══════════════════════════════════════════════════════════════
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://vault.auxite.io'}/reset-password?token=${resetToken}&email=${encodeURIComponent(normalizedEmail)}`;

    try {
      const result = await sendPasswordResetEmail(
        normalizedEmail,
        userData.name || normalizedEmail.split('@')[0],
        resetUrl,
        userData.language || 'en',
      );
      if (!result.success) {
        console.error('[forgot-password] Resend failure:', result.error);
      }
    } catch (mailErr) {
      console.error('[forgot-password] sendPasswordResetEmail threw:', mailErr);
    }

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
