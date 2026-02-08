// src/app/api/auth/register/route.ts
// Email/Password Registration API with Vault Creation

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { sendEmail } from '@/lib/email-service';
import { initializeCustody, createVault } from '@/lib/custody';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// JWT Secret - MUST be set in environment, no fallback for security
const JWT_SECRET = process.env.JWT_SECRET!;

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password requirements: min 8 chars, 1 uppercase, 1 lowercase, 1 number
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

// Generate 6 digit code
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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
    const verificationCode = generateVerificationCode();
    const userId = randomBytes(16).toString('hex');

    const userData = {
      id: userId,
      email: normalizedEmail,
      passwordHash,
      name: name || '',
      phone: phone || '',
      language,
      walletAddress: '',
      authProvider: 'email',
      emailVerified: false,
      verificationToken,
      verificationCode,
      verificationCodeExpiry: Date.now() + 10 * 60 * 1000, // 10 minutes
      createdAt: Date.now(),
      lastLogin: Date.now(),
    };

    // Save user
    await redis.hset(`auth:user:${normalizedEmail}`, userData);

    // Create email index for lookup
    await redis.set(`auth:email:${normalizedEmail}`, userId);

    // ══════════════════════════════════════════════════════════════
    // CREATE CUSTODY VAULT
    // ══════════════════════════════════════════════════════════════
    let vaultId = '';
    let vaultAddress = '';

    try {
      await initializeCustody();
      const { vault, addresses } = await createVault({
        userId,
        name: 'Client Vault',
      });

      vaultId = vault.id;

      // Use ETH address as primary wallet address for display
      const ethAddress = addresses.find(a => a.asset === 'ETH');
      if (ethAddress) {
        vaultAddress = ethAddress.address;
        // Update user with vault wallet address
        await redis.hset(`auth:user:${normalizedEmail}`, {
          walletAddress: vaultAddress,
          vaultId: vaultId,
        });
      }

      console.log(`[Register] Vault created for user ${userId}: ${vaultId}`);
    } catch (vaultError) {
      // Log but don't fail registration if vault creation fails
      console.error('[Register] Vault creation failed:', vaultError);
    }

    // ══════════════════════════════════════════════════════════════
    // SEND VERIFICATION EMAIL WITH CODE
    // ══════════════════════════════════════════════════════════════
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://wallet.auxite.io'}/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(normalizedEmail)}`;
    
    // Send email with both link and code
    await sendEmail({
      type: 'verification-code',
      to: normalizedEmail,
      data: {
        name: name || normalizedEmail.split('@')[0],
        code: verificationCode,
        verificationUrl,
        language,
      },
    });

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
      message: 'Registration successful. Your vault has been created.',
      user: {
        id: userId,
        email: normalizedEmail,
        name: name || '',
        emailVerified: false,
        walletAddress: vaultAddress,
        vaultId: vaultId,
      },
      token,
      requiresEmailVerification: true,
      requiresWalletSetup: false, // Vault is auto-created
      vaultCreated: !!vaultId,
    });

  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }
}
