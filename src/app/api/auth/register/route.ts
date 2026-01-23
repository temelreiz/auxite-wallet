// src/app/api/auth/register/route.ts
// Email/Password Registration API

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { sendVerificationEmail } from '@/lib/email-service';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const JWT_SECRET = process.env.JWT_SECRET || 'auxite-jwt-secret-change-in-production';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password requirements: min 8 chars, 1 uppercase, 1 lowercase, 1 number
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, phone, language = 'en' } = body;

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

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    if (!PASSWORD_REGEX.test(password)) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number' },
        { status: 400 }
      );
    }

    // ══════════════════════════════════════════════════════════════
    // CHECK IF USER EXISTS
    // ══════════════════════════════════════════════════════════════
    const existingUser = await redis.hgetall(`auth:user:${normalizedEmail}`);
    
    if (existingUser && Object.keys(existingUser).length > 0) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 409 }
      );
    }

    // ══════════════════════════════════════════════════════════════
    // CREATE USER
    // ══════════════════════════════════════════════════════════════
    const passwordHash = await bcrypt.hash(password, 12);
    const verificationToken = randomBytes(32).toString('hex');
    const userId = randomBytes(16).toString('hex');

    const userData = {
      id: userId,
      email: normalizedEmail,
      passwordHash,
      name: name || '',
      phone: phone || '',
      language,
      walletAddress: '', // Will be set after wallet onboarding
      authProvider: 'email',
      emailVerified: false,
      verificationToken,
      createdAt: Date.now(),
      lastLogin: Date.now(),
    };

    // Save user
    await redis.hset(`auth:user:${normalizedEmail}`, userData);
    
    // Create email index for lookup
    await redis.set(`auth:email:${normalizedEmail}`, userId);

    // ══════════════════════════════════════════════════════════════
    // SEND VERIFICATION EMAIL
    // ══════════════════════════════════════════════════════════════
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://wallet.auxite.io'}/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(normalizedEmail)}`;
    
    // Send email directly
    const emailResult = await sendVerificationEmail(
      normalizedEmail,
      name || normalizedEmail.split('@')[0],
      verificationUrl,
      language
    );

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      // Don't fail registration, just log the error
    }

    // ══════════════════════════════════════════════════════════════
    // GENERATE JWT TOKEN
    // ══════════════════════════════════════════════════════════════
    const token = jwt.sign(
      {
        userId,
        email: normalizedEmail,
        emailVerified: false,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // ══════════════════════════════════════════════════════════════
    // RESPONSE
    // ══════════════════════════════════════════════════════════════
    return NextResponse.json({
      success: true,
      message: 'Registration successful. Please verify your email.',
      user: {
        id: userId,
        email: normalizedEmail,
        name: name || '',
        emailVerified: false,
        walletAddress: '',
      },
      token,
      requiresWalletSetup: true,
    });

  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }
}
