// src/app/api/auth/reset-password/route.ts
// Reset Password - Set New Password

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// JWT Secret - MUST be set in environment, no fallback for security
const JWT_SECRET = process.env.JWT_SECRET!;

// Password requirements: min 8 chars, 1 uppercase, 1 lowercase, 1 number
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, token, newPassword } = body;

    // ══════════════════════════════════════════════════════════════
    // VALIDATION
    // ══════════════════════════════════════════════════════════════
    if (!email || !token || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Email, token, and new password are required' },
        { status: 400 }
      );
    }

    if (!PASSWORD_REGEX.test(newPassword)) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number' },
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
        { success: false, error: 'Invalid or expired reset link' },
        { status: 400 }
      );
    }

    // Check token
    if (userData.passwordResetToken !== token) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired reset link' },
        { status: 400 }
      );
    }

    // Check expiry
    const resetExpiry = parseInt(userData.passwordResetExpiry || '0');
    if (Date.now() > resetExpiry) {
      return NextResponse.json(
        { success: false, error: 'Reset link has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // ══════════════════════════════════════════════════════════════
    // UPDATE PASSWORD
    // ══════════════════════════════════════════════════════════════
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await redis.hset(`auth:user:${normalizedEmail}`, {
      passwordHash,
      passwordResetToken: '',
      passwordResetExpiry: 0,
      failedLoginAttempts: 0,
      lockUntil: 0,
      lastPasswordChange: Date.now(),
    });

    // ══════════════════════════════════════════════════════════════
    // INVALIDATE ALL EXISTING SESSIONS (optional security measure)
    // ══════════════════════════════════════════════════════════════
    // You could add session management here if needed

    // ══════════════════════════════════════════════════════════════
    // SEND CONFIRMATION EMAIL
    // ══════════════════════════════════════════════════════════════
    await redis.lpush('email:queue', JSON.stringify({
      type: 'password-changed',
      to: normalizedEmail,
      subject: 'Your Auxite password has been changed',
      data: {
        name: userData.name || normalizedEmail.split('@')[0],
        language: userData.language || 'en',
        timestamp: new Date().toISOString(),
      },
      createdAt: Date.now(),
    }));

    // ══════════════════════════════════════════════════════════════
    // GENERATE NEW JWT TOKEN (auto login)
    // ══════════════════════════════════════════════════════════════
    const jwtToken = jwt.sign(
      {
        userId: userData.id,
        email: normalizedEmail,
        emailVerified: userData.emailVerified === 'true' || userData.emailVerified === true,
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
      message: 'Password has been reset successfully',
      token: jwtToken,
      user: {
        id: userData.id,
        email: normalizedEmail,
        name: userData.name || '',
        emailVerified: userData.emailVerified === 'true' || userData.emailVerified === true,
        walletAddress: userData.walletAddress || '',
      },
    });

  } catch (error: any) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset password. Please try again.' },
      { status: 500 }
    );
  }
}
