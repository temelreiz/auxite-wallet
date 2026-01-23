// src/app/api/auth/login/route.ts
// Email/Password Login API

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const JWT_SECRET = process.env.JWT_SECRET || 'auxite-jwt-secret-change-in-production';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // ══════════════════════════════════════════════════════════════
    // VALIDATION
    // ══════════════════════════════════════════════════════════════
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ══════════════════════════════════════════════════════════════
    // FIND USER
    // ══════════════════════════════════════════════════════════════
    const userData = await redis.hgetall(`auth:user:${normalizedEmail}`) as any;
    
    if (!userData || Object.keys(userData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // ══════════════════════════════════════════════════════════════
    // CHECK IF ACCOUNT IS LOCKED
    // ══════════════════════════════════════════════════════════════
    const failedAttempts = parseInt(userData.failedLoginAttempts || '0');
    const lockUntil = parseInt(userData.lockUntil || '0');

    if (lockUntil > Date.now()) {
      const remainingMinutes = Math.ceil((lockUntil - Date.now()) / 60000);
      return NextResponse.json(
        { success: false, error: `Account locked. Try again in ${remainingMinutes} minutes.` },
        { status: 429 }
      );
    }

    // ══════════════════════════════════════════════════════════════
    // VERIFY PASSWORD
    // ══════════════════════════════════════════════════════════════
    const isValidPassword = await bcrypt.compare(password, userData.passwordHash);

    if (!isValidPassword) {
      // Increment failed attempts
      const newFailedAttempts = failedAttempts + 1;
      
      const updates: any = { failedLoginAttempts: newFailedAttempts };
      
      // Lock account after 5 failed attempts (15 minutes)
      if (newFailedAttempts >= 5) {
        updates.lockUntil = Date.now() + 15 * 60 * 1000;
      }

      await redis.hset(`auth:user:${normalizedEmail}`, updates);

      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // ══════════════════════════════════════════════════════════════
    // SUCCESSFUL LOGIN
    // ══════════════════════════════════════════════════════════════
    // Reset failed attempts and update last login
    await redis.hset(`auth:user:${normalizedEmail}`, {
      failedLoginAttempts: 0,
      lockUntil: 0,
      lastLogin: Date.now(),
    });

    // ══════════════════════════════════════════════════════════════
    // GENERATE JWT TOKEN
    // ══════════════════════════════════════════════════════════════
    const token = jwt.sign(
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
    const hasWallet = userData.walletAddress && userData.walletAddress.length > 0;

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: userData.id,
        email: normalizedEmail,
        name: userData.name || '',
        phone: userData.phone || '',
        emailVerified: userData.emailVerified === 'true' || userData.emailVerified === true,
        walletAddress: userData.walletAddress || '',
        authProvider: userData.authProvider || 'email',
      },
      token,
      requiresWalletSetup: !hasWallet,
      requiresEmailVerification: !(userData.emailVerified === 'true' || userData.emailVerified === true),
    });

  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Login failed. Please try again.' },
      { status: 500 }
    );
  }
}
