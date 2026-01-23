// src/app/api/auth/google/route.ts
// Google OAuth Login/Register API

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const JWT_SECRET = process.env.JWT_SECRET || 'auxite-jwt-secret-change-in-production';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

// Verify Google ID Token
async function verifyGoogleToken(idToken: string) {
  try {
    // Verify token with Google
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
    );
    
    if (!response.ok) {
      throw new Error('Invalid Google token');
    }

    const payload = await response.json();

    // Verify audience (client ID)
    if (payload.aud !== GOOGLE_CLIENT_ID) {
      throw new Error('Invalid token audience');
    }

    // Check token expiry
    if (payload.exp < Date.now() / 1000) {
      throw new Error('Token expired');
    }

    return {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      googleId: payload.sub,
      emailVerified: payload.email_verified === 'true' || payload.email_verified === true,
    };
  } catch (error) {
    console.error('Google token verification error:', error);
    throw new Error('Failed to verify Google token');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken, language = 'en' } = body;

    // ══════════════════════════════════════════════════════════════
    // VALIDATION
    // ══════════════════════════════════════════════════════════════
    if (!idToken) {
      return NextResponse.json(
        { success: false, error: 'Google ID token is required' },
        { status: 400 }
      );
    }

    // ══════════════════════════════════════════════════════════════
    // VERIFY GOOGLE TOKEN
    // ══════════════════════════════════════════════════════════════
    const googleUser = await verifyGoogleToken(idToken);
    const normalizedEmail = googleUser.email.toLowerCase().trim();

    // ══════════════════════════════════════════════════════════════
    // CHECK IF USER EXISTS
    // ══════════════════════════════════════════════════════════════
    let userData = await redis.hgetall(`auth:user:${normalizedEmail}`) as any;
    let isNewUser = false;

    if (!userData || Object.keys(userData).length === 0) {
      // ══════════════════════════════════════════════════════════════
      // CREATE NEW USER
      // ══════════════════════════════════════════════════════════════
      isNewUser = true;
      const userId = randomBytes(16).toString('hex');

      userData = {
        id: userId,
        email: normalizedEmail,
        passwordHash: '', // No password for OAuth users
        name: googleUser.name || '',
        phone: '',
        picture: googleUser.picture || '',
        language,
        walletAddress: '',
        authProvider: 'google',
        googleId: googleUser.googleId,
        emailVerified: true, // Google already verified
        createdAt: Date.now(),
        lastLogin: Date.now(),
      };

      // Save user
      await redis.hset(`auth:user:${normalizedEmail}`, userData);
      
      // Create email index
      await redis.set(`auth:email:${normalizedEmail}`, userId);
      
      // Create Google ID index
      await redis.set(`auth:google:${googleUser.googleId}`, normalizedEmail);

      // Send welcome email
      await redis.lpush('email:queue', JSON.stringify({
        type: 'welcome',
        to: normalizedEmail,
        subject: 'Welcome to Auxite!',
        data: {
          name: googleUser.name || normalizedEmail.split('@')[0],
          language,
        },
        createdAt: Date.now(),
      }));

    } else {
      // ══════════════════════════════════════════════════════════════
      // EXISTING USER - Update login info
      // ══════════════════════════════════════════════════════════════
      
      // If user registered with email, link Google account
      if (!userData.googleId) {
        await redis.hset(`auth:user:${normalizedEmail}`, {
          googleId: googleUser.googleId,
          picture: googleUser.picture || userData.picture || '',
          lastLogin: Date.now(),
        });
        await redis.set(`auth:google:${googleUser.googleId}`, normalizedEmail);
      } else {
        // Just update last login
        await redis.hset(`auth:user:${normalizedEmail}`, {
          lastLogin: Date.now(),
        });
      }

      // Refresh userData
      userData = await redis.hgetall(`auth:user:${normalizedEmail}`);
    }

    // ══════════════════════════════════════════════════════════════
    // GENERATE JWT TOKEN
    // ══════════════════════════════════════════════════════════════
    const token = jwt.sign(
      {
        userId: userData.id,
        email: normalizedEmail,
        emailVerified: true,
        walletAddress: userData.walletAddress || '',
        authProvider: 'google',
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
      message: isNewUser ? 'Account created successfully' : 'Login successful',
      isNewUser,
      user: {
        id: userData.id,
        email: normalizedEmail,
        name: userData.name || googleUser.name || '',
        picture: userData.picture || googleUser.picture || '',
        emailVerified: true,
        walletAddress: userData.walletAddress || '',
        authProvider: userData.authProvider || 'google',
      },
      token,
      requiresWalletSetup: !hasWallet,
    });

  } catch (error: any) {
    console.error('Google auth error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Google authentication failed' },
      { status: 500 }
    );
  }
}
