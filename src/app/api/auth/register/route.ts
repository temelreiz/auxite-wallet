// src/app/api/auth/register/route.ts
// Email/Password Registration API with Vault Creation

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto, { randomBytes } from 'crypto';
import { sendEmail } from '@/lib/email-service';
import { sendCampaignWelcomeEmail } from '@/lib/email';
import { authLimiter, withRateLimit } from '@/lib/security/rate-limiter';
import { autoAssignRM } from '@/lib/relationship-manager';

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
    // Rate limit: 5 register attempts per minute per IP
    const rateLimited = await withRateLimit(request, authLimiter);
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const { email, password, name, phone, language = 'en', platform: clientPlatform } = body;

    // Detect platform from User-Agent or client-sent field
    const ua = request.headers.get('user-agent') || '';
    const platform = clientPlatform || (
      ua.includes('Expo') || ua.includes('okhttp') || ua.includes('Auxite') ? 'mobile' :
      ua.includes('Mozilla') || ua.includes('Chrome') || ua.includes('Safari') ? 'web' : 'unknown'
    );

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

    // Parse full name into firstName / lastName
    const nameParts = (name || '').trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    const userData = {
      id: userId,
      email: normalizedEmail,
      passwordHash,
      name: name || '',
      firstName,
      lastName,
      phone: phone || '',
      language,
      walletAddress: '',
      authProvider: 'email',
      emailVerified: false,
      verificationToken,
      verificationCode,
      verificationCodeExpiry: Date.now() + 10 * 60 * 1000, // 10 minutes
      platform,
      createdAt: Date.now(),
      lastLogin: Date.now(),
    };

    // Save user
    await redis.hset(`auth:user:${normalizedEmail}`, userData);

    // Create email index for lookup
    await redis.set(`auth:email:${normalizedEmail}`, userId);

    // ══════════════════════════════════════════════════════════════
    // CREATE WALLET ADDRESS & VAULT ID
    // ══════════════════════════════════════════════════════════════
    const addressHash = crypto.createHash('sha256').update(`auxite-wallet-${userId}`).digest('hex');
    const vaultAddress = '0x' + addressHash.substring(0, 40);

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const p1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const p2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const vaultId = `AX-VLT-${p1}-${p2}`;

    // Update user with wallet address and vault ID
    await redis.hset(`auth:user:${normalizedEmail}`, {
      walletAddress: vaultAddress,
      vaultId: vaultId,
    });

    // Create address-to-user mapping for deposit scanner
    await redis.set(`user:address:${vaultAddress.toLowerCase()}`, userId);

    // Create wallet-to-email mapping (for admin user list)
    await redis.set(`wallet:${vaultAddress}`, normalizedEmail);

    // Create vault ID reverse lookup for internal transfers
    await redis.set(`vault:${vaultId}`, userId);

    // Store user profile in user:{userId} hash (for getUserLanguage and other lookups)
    await redis.hset(`user:${userId}`, {
      email: normalizedEmail,
      name: name || '',
      firstName,
      lastName,
      phone: phone || '',
      language,
      walletAddress: vaultAddress,
      vaultId: vaultId,
      createdAt: Date.now().toString(),
    });

    console.log(`[Register] Wallet assigned for ${userId}: ${vaultAddress}, vault: ${vaultId}`);

    // ══════════════════════════════════════════════════════════════
    // INITIALIZE BALANCES
    // ══════════════════════════════════════════════════════════════
    // Legacy userId-based keys
    await redis.set(`user:${userId}:balance:AUXM`, 0);
    await redis.set(`user:${userId}:balance:AUXG`, 0);
    await redis.set(`user:${userId}:balance:AUXS`, 0);
    await redis.set(`user:${userId}:balance:AUXPT`, 0);
    await redis.set(`user:${userId}:balance:AUXPD`, 0);

    // Wallet address-based hash (used by balance API)
    await redis.hset(`user:${vaultAddress.toLowerCase()}:balance`, {
      auxm: 0, auxg: 0, auxs: 0, auxpt: 0, auxpd: 0,
      eth: 0, btc: 0, xrp: 0, sol: 0, usdt: 0, usd: 0,
      bonusAuxm: 0, totalAuxm: 0, bonusExpiresAt: null,
    });

    // ══════════════════════════════════════════════════════════════
    // BONUS v2: Welcome bonus is now triggered on first deposit
    // (KYC + $100 deposit required). No more early bird at registration.
    // ══════════════════════════════════════════════════════════════

    // ══════════════════════════════════════════════════════════════
    // SEND VERIFICATION EMAIL WITH CODE
    // ══════════════════════════════════════════════════════════════
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://vault.auxite.io'}/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(normalizedEmail)}`;
    
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
    // SEND CAMPAIGN WELCOME EMAIL (non-blocking)
    // ══════════════════════════════════════════════════════════════
    sendCampaignWelcomeEmail(normalizedEmail, {
      clientName: name || normalizedEmail.split('@')[0],
      language,
    }).catch(err => console.error('Campaign welcome email failed:', err));

    // ══════════════════════════════════════════════════════════════
    // AUTO-ASSIGN RELATIONSHIP MANAGER (non-blocking)
    // ══════════════════════════════════════════════════════════════
    if (vaultAddress) {
      autoAssignRM(vaultAddress).catch(err => console.error('Auto-assign RM failed:', err));
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
      bonusInfo: {
        message: {
          tr: 'İlk yatırımınızda hoşgeldin bonusu kazanın! (KYC + min $100)',
          en: 'Earn a welcome bonus on your first deposit! (KYC + min $100)',
        },
      },
    });

  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }
}
