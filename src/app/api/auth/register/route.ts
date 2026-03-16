// src/app/api/auth/register/route.ts
// Email/Password Registration API with Vault Creation

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto, { randomBytes } from 'crypto';
import { sendEmail } from '@/lib/email-service';
import { sendEarlyAccessBonusEmail } from '@/lib/email';
import { authLimiter, withRateLimit } from '@/lib/security/rate-limiter';

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
    // 🎉 EARLY BIRD CAMPAIGN — First N users get free AUXS
    // ══════════════════════════════════════════════════════════════
    const EARLY_BIRD_ENABLED = process.env.EARLY_BIRD_ENABLED !== "false";
    const EARLY_BIRD_LIMIT = parseInt(process.env.EARLY_BIRD_LIMIT || "50");
    const EARLY_BIRD_AMOUNT = parseFloat(process.env.EARLY_BIRD_AMOUNT || "10");
    const EARLY_BIRD_ASSET = process.env.EARLY_BIRD_ASSET || "AUXS";
    const EARLY_BIRD_EXPIRY_DAYS = parseInt(process.env.EARLY_BIRD_EXPIRY_DAYS || "90");

    let earlyBirdGranted = false;
    if (EARLY_BIRD_ENABLED && EARLY_BIRD_AMOUNT > 0) {
      try {
        const currentCount = await redis.incr("campaign:earlybird:count");

        if (currentCount <= EARLY_BIRD_LIMIT) {
          const assetKey = EARLY_BIRD_ASSET.toUpperCase();

          // Grant asset to balance (userId key + wallet hash)
          await redis.set(`user:${userId}:balance:${assetKey}`, EARLY_BIRD_AMOUNT);
          await redis.hset(`user:${vaultAddress.toLowerCase()}:balance`, {
            [assetKey.toLowerCase()]: EARLY_BIRD_AMOUNT,
          });

          // Mark as bonus (non-transferable, non-withdrawable)
          await redis.set(`user:${userId}:balance:bonus${assetKey}`, EARLY_BIRD_AMOUNT);

          // Set bonus expiry
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + EARLY_BIRD_EXPIRY_DAYS);
          await redis.set(`user:${userId}:earlybird:expiresAt`, expiryDate.toISOString());
          await redis.set(`user:${userId}:balance:bonus${assetKey}ExpiresAt`, expiryDate.toISOString());

          // Transaction record
          await redis.lpush(
            `user:${vaultAddress.toLowerCase()}:transactions`,
            JSON.stringify({
              type: "bonus",
              subtype: "earlybird",
              asset: assetKey,
              amount: EARLY_BIRD_AMOUNT,
              transferable: false,
              description: `Early Bird — Free ${EARLY_BIRD_AMOUNT} ${assetKey} for the first ${EARLY_BIRD_LIMIT} users!`,
              descriptionTr: `Early Bird — İlk ${EARLY_BIRD_LIMIT} kullanıcıya ${EARLY_BIRD_AMOUNT} ${assetKey} hediye!`,
              timestamp: new Date().toISOString(),
              campaign: "earlybird",
              expiresAt: expiryDate.toISOString(),
            })
          );

          // Track which users received the bonus
          await redis.lpush("campaign:earlybird:users", JSON.stringify({
            userId,
            email: normalizedEmail,
            rank: currentCount,
            asset: assetKey,
            amount: EARLY_BIRD_AMOUNT,
            grantedAt: new Date().toISOString(),
          }));

          earlyBirdGranted = true;
          console.log(`🎉 Early Bird #${currentCount}/${EARLY_BIRD_LIMIT}: ${userId} received ${EARLY_BIRD_AMOUNT} ${assetKey}`);

          // Send Early Access Bonus terms email (non-blocking)
          sendEarlyAccessBonusEmail(normalizedEmail, {
            clientName: name || 'Client',
            bonusAmount: String(EARLY_BIRD_AMOUNT),
            bonusAsset: assetKey,
            unlockThreshold: '500',
            expiryDays: String(EARLY_BIRD_EXPIRY_DAYS),
            language: language || 'en',
          }).catch(err => console.error('Early access bonus email error:', err));
        } else {
          await redis.decr("campaign:earlybird:count");
          console.log(`⏰ Early Bird campaign full (${EARLY_BIRD_LIMIT}/${EARLY_BIRD_LIMIT})`);
        }
      } catch (ebError) {
        console.error("Early Bird campaign error (non-blocking):", ebError);
      }
    }

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
      earlyBird: earlyBirdGranted ? {
        granted: true,
        amount: EARLY_BIRD_AMOUNT,
        asset: EARLY_BIRD_ASSET,
        transferable: false,
        message: {
          tr: `Tebrikler! 🎉 İlk ${EARLY_BIRD_LIMIT} kullanıcıdan biri olarak ${EARLY_BIRD_AMOUNT} ${EARLY_BIRD_ASSET} hediye kazandınız!`,
          en: `Congratulations! 🎉 As one of the first ${EARLY_BIRD_LIMIT} users, you've earned ${EARLY_BIRD_AMOUNT} free ${EARLY_BIRD_ASSET}!`,
        },
      } : undefined,
    });

  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }
}
