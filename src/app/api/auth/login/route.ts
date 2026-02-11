// src/app/api/auth/login/route.ts
// Email/Password Login API with Vault Auto-Creation

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// JWT Secret - MUST be set in environment, no fallback for security
const JWT_SECRET = process.env.JWT_SECRET!;

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
    // CHECK/CREATE VAULT (for users without vault)
    // ══════════════════════════════════════════════════════════════
    let walletAddress = userData.walletAddress || '';
    let vaultId = userData.vaultId || '';

    // Ensure user has an ID (for legacy users without ID)
    let userId = userData.id;
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await redis.hset(`auth:user:${normalizedEmail}`, { id: userId });
      console.log(`[Login] Generated ID for legacy user: ${userId}`);
    }

    if (!walletAddress) {
      // Generate a deterministic wallet address from userId
      const addressHash = crypto.createHash('sha256').update(`auxite-wallet-${userId}`).digest('hex');
      walletAddress = '0x' + addressHash.substring(0, 40);

      // Generate vault ID if not present
      if (!vaultId) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        vaultId = `AX-VLT-${part1}-${part2}`;
      }

      // Save to Redis
      await redis.hset(`auth:user:${normalizedEmail}`, {
        walletAddress,
        vaultId,
      });

      // Create address-to-user mapping for deposit scanner
      await redis.set(`user:address:${walletAddress.toLowerCase()}`, userId);

      console.log(`[Login] Wallet assigned for ${userId}: ${walletAddress}, vault: ${vaultId}`);
    }

    // ══════════════════════════════════════════════════════════════
    // GENERATE JWT TOKEN
    // ══════════════════════════════════════════════════════════════
    const token = jwt.sign(
      {
        userId: userId,
        email: normalizedEmail,
        emailVerified: userData.emailVerified === 'true' || userData.emailVerified === true,
        walletAddress: walletAddress,  // Use the updated walletAddress (may be newly created)
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // ══════════════════════════════════════════════════════════════
    // RESPONSE
    // ══════════════════════════════════════════════════════════════
    const hasWallet = walletAddress && walletAddress.length > 0;

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: userId,
        email: normalizedEmail,
        name: userData.name || '',
        phone: userData.phone || '',
        emailVerified: userData.emailVerified === 'true' || userData.emailVerified === true,
        walletAddress: walletAddress,
        vaultId: vaultId,
        authProvider: userData.authProvider || 'email',
      },
      token,
      requiresWalletSetup: !hasWallet,
      requiresEmailVerification: !(userData.emailVerified === 'true' || userData.emailVerified === true),
    });

  } catch (error: any) {
    console.error('Login error:', error);
    console.error('Login error stack:', error?.stack);
    return NextResponse.json(
      { success: false, error: 'Login failed. Please try again.', details: error?.message },
      { status: 500 }
    );
  }
}
