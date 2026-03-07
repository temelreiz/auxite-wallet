// src/app/api/auth/apple/route.ts
// Apple Sign-in Login/Register API

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import jwt from 'jsonwebtoken';
import crypto, { randomBytes } from 'crypto';
import * as jose from 'jose';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// JWT Secret - MUST be set in environment, no fallback for security
const JWT_SECRET = process.env.JWT_SECRET!;
const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID; // Mobile app's bundle ID
const APPLE_WEB_CLIENT_ID = process.env.APPLE_WEB_CLIENT_ID; // Web Services ID

// Apple's public keys URL
const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys';

// Verify Apple ID Token
async function verifyAppleToken(identityToken: string) {
  try {
    // Fetch Apple's public keys
    const keysResponse = await fetch(APPLE_KEYS_URL);
    const { keys } = await keysResponse.json();
    
    // Decode token header to get key ID
    const header = jose.decodeProtectedHeader(identityToken);
    const key = keys.find((k: any) => k.kid === header.kid);
    
    if (!key) {
      throw new Error('Unable to find matching Apple key');
    }

    // Import the public key
    const publicKey = await jose.importJWK(key, 'RS256');

    // Verify the token — accept both mobile (bundle ID) and web (services ID)
    const allowedAudiences = [APPLE_CLIENT_ID, APPLE_WEB_CLIENT_ID].filter(Boolean) as string[];
    const { payload } = await jose.jwtVerify(identityToken, publicKey, {
      issuer: 'https://appleid.apple.com',
      audience: allowedAudiences.length > 0 ? allowedAudiences : undefined,
    });

    return {
      email: payload.email as string,
      appleId: payload.sub as string,
      emailVerified: payload.email_verified === 'true' || payload.email_verified === true,
      isPrivateEmail: payload.is_private_email === 'true' || payload.is_private_email === true,
    };
  } catch (error) {
    console.error('Apple token verification error:', error);
    throw new Error('Failed to verify Apple token');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identityToken, user, language = 'en' } = body;
    
    // user object from Apple (only sent on first sign-in):
    // { email, name: { firstName, lastName } }

    // ══════════════════════════════════════════════════════════════
    // VALIDATION
    // ══════════════════════════════════════════════════════════════
    if (!identityToken) {
      return NextResponse.json(
        { success: false, error: 'Apple identity token is required' },
        { status: 400 }
      );
    }

    // ══════════════════════════════════════════════════════════════
    // VERIFY APPLE TOKEN
    // ══════════════════════════════════════════════════════════════
    const appleUser = await verifyAppleToken(identityToken);
    const normalizedEmail = appleUser.email.toLowerCase().trim();

    // ══════════════════════════════════════════════════════════════
    // CHECK IF USER EXISTS BY APPLE ID
    // ══════════════════════════════════════════════════════════════
    let existingEmail = await redis.get(`auth:apple:${appleUser.appleId}`) as string | null;
    let userData: any = null;
    let isNewUser = false;

    if (existingEmail) {
      // User exists, get their data
      userData = await redis.hgetall(`auth:user:${existingEmail}`);
    } else {
      // Check by email
      userData = await redis.hgetall(`auth:user:${normalizedEmail}`);
    }

    if (!userData || Object.keys(userData).length === 0) {
      // ══════════════════════════════════════════════════════════════
      // CREATE NEW USER
      // ══════════════════════════════════════════════════════════════
      isNewUser = true;
      const userId = randomBytes(16).toString('hex');

      // Get name from user object (only available on first sign-in)
      const fullName = user?.name 
        ? `${user.name.firstName || ''} ${user.name.lastName || ''}`.trim()
        : '';

      userData = {
        id: userId,
        email: normalizedEmail,
        passwordHash: '', // No password for OAuth users
        name: fullName,
        phone: '',
        language,
        walletAddress: '',
        authProvider: 'apple',
        appleId: appleUser.appleId,
        isPrivateEmail: appleUser.isPrivateEmail,
        emailVerified: true, // Apple already verified
        createdAt: Date.now(),
        lastLogin: Date.now(),
      };

      // Save user
      await redis.hset(`auth:user:${normalizedEmail}`, userData);
      
      // Create email index
      await redis.set(`auth:email:${normalizedEmail}`, userId);
      
      // Create Apple ID index
      await redis.set(`auth:apple:${appleUser.appleId}`, normalizedEmail);

      // Send welcome email (unless private relay)
      if (!appleUser.isPrivateEmail) {
        await redis.lpush('email:queue', JSON.stringify({
          type: 'welcome',
          to: normalizedEmail,
          subject: 'Welcome to Auxite!',
          data: {
            name: fullName || normalizedEmail.split('@')[0],
            language,
          },
          createdAt: Date.now(),
        }));
      }

    } else {
      // ══════════════════════════════════════════════════════════════
      // EXISTING USER - Update login info
      // ══════════════════════════════════════════════════════════════
      
      // If user registered with email, link Apple account
      if (!userData.appleId) {
        await redis.hset(`auth:user:${normalizedEmail}`, {
          appleId: appleUser.appleId,
          lastLogin: Date.now(),
        });
        await redis.set(`auth:apple:${appleUser.appleId}`, normalizedEmail);
      } else {
        // Just update last login
        await redis.hset(`auth:user:${normalizedEmail}`, {
          lastLogin: Date.now(),
        });
      }

      // Refresh userData
      userData = await redis.hgetall(`auth:user:${existingEmail || normalizedEmail}`);
    }

    // ══════════════════════════════════════════════════════════════
    // CHECK/CREATE VAULT (for users without vault)
    // ══════════════════════════════════════════════════════════════
    const userEmail = existingEmail || normalizedEmail;
    let walletAddress = userData.walletAddress || '';
    let vaultId = userData.vaultId || '';
    const userId = userData.id;

    if (!walletAddress) {
      const addressHash = crypto.createHash('sha256').update(`auxite-wallet-${userId}`).digest('hex');
      walletAddress = '0x' + addressHash.substring(0, 40);

      if (!vaultId) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const p1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        const p2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        vaultId = `AX-VLT-${p1}-${p2}`;
      }

      await redis.hset(`auth:user:${userEmail}`, { walletAddress, vaultId });
      await redis.set(`user:address:${walletAddress.toLowerCase()}`, userId);
      await redis.set(`vault:${vaultId}`, userId);
      console.log(`[Apple Auth] Wallet assigned for ${userId}: ${walletAddress}, vault: ${vaultId}`);
    }

    // Ensure user profile hash exists
    const existingProfile = await redis.hgetall(`user:${userId}`) as any;
    if (!existingProfile || Object.keys(existingProfile).length === 0) {
      const nameParts = (userData.name || '').trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      await redis.hset(`user:${userId}`, {
        email: userEmail,
        name: userData.name || '',
        firstName,
        lastName,
        phone: userData.phone || '',
        language: userData.language || 'en',
        walletAddress,
        vaultId,
        emailVerified: 'true',
        createdAt: (userData.createdAt || Date.now()).toString(),
      });
    }

    // ══════════════════════════════════════════════════════════════
    // GENERATE JWT TOKEN
    // ══════════════════════════════════════════════════════════════
    const token = jwt.sign(
      {
        userId,
        email: userEmail,
        emailVerified: true,
        walletAddress,
        authProvider: 'apple',
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // ══════════════════════════════════════════════════════════════
    // RESPONSE
    // ══════════════════════════════════════════════════════════════
    return NextResponse.json({
      success: true,
      message: isNewUser ? 'Account created successfully' : 'Login successful',
      isNewUser,
      user: {
        id: userId,
        email: userEmail,
        name: userData.name || '',
        emailVerified: true,
        walletAddress,
        authProvider: userData.authProvider || 'apple',
        isPrivateEmail: userData.isPrivateEmail === 'true' || userData.isPrivateEmail === true,
      },
      token,
    });

  } catch (error: any) {
    console.error('Apple auth error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Apple authentication failed' },
      { status: 500 }
    );
  }
}
