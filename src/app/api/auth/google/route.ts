// src/app/api/auth/google/route.ts
// Google OAuth - Redirect to Google + POST handler for mobile id_token verification

import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
  : 'https://vault.auxite.io/api/auth/google/callback';

export async function GET(request: NextRequest) {
  // Generate state for CSRF protection
  const state = Math.random().toString(36).substring(2, 15);

  // Store state in cookie
  const response = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${GOOGLE_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent('openid email profile')}` +
    `&state=${state}` +
    `&access_type=offline` +
    `&prompt=consent`
  );

  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
  });

  return response;
}

export async function POST(request: NextRequest) {
  try {
    const { idToken, language = 'en' } = await request.json();

    if (!idToken) {
      return NextResponse.json({ success: false, error: 'Google ID token is required' }, { status: 400 });
    }

    // Verify ID token with Google
    const verifyResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    if (!verifyResponse.ok) {
      return NextResponse.json({ success: false, error: 'Invalid Google token' }, { status: 401 });
    }

    const googleUser = await verifyResponse.json();

    // Validate audience matches our client ID(s)
    const validClientIds = [
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_IOS_CLIENT_ID,
      process.env.GOOGLE_ANDROID_CLIENT_ID,
    ].filter(Boolean);

    if (!validClientIds.includes(googleUser.aud)) {
      return NextResponse.json({ success: false, error: 'Token not issued for this app' }, { status: 401 });
    }

    const normalizedEmail = googleUser.email.toLowerCase().trim();

    // Check if user exists (same pattern as callback route)
    const redis = (await import('@upstash/redis')).Redis;
    const redisClient = new redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    let userData = await redisClient.hgetall(`auth:user:${normalizedEmail}`) as any;
    let isNewUser = false;

    if (!userData || Object.keys(userData).length === 0) {
      isNewUser = true;
      const { randomBytes } = await import('crypto');
      const userId = randomBytes(16).toString('hex');

      userData = {
        id: userId,
        email: normalizedEmail,
        passwordHash: '',
        name: googleUser.name || '',
        phone: '',
        picture: googleUser.picture || '',
        language,
        walletAddress: '',
        authProvider: 'google',
        googleId: googleUser.sub,
        emailVerified: true,
        createdAt: Date.now(),
        lastLogin: Date.now(),
      };

      await redisClient.hset(`auth:user:${normalizedEmail}`, userData);
      await redisClient.set(`auth:email:${normalizedEmail}`, userId);
      await redisClient.set(`auth:google:${googleUser.sub}`, normalizedEmail);
    } else {
      if (!userData.googleId) {
        await redisClient.hset(`auth:user:${normalizedEmail}`, {
          googleId: googleUser.sub,
          picture: googleUser.picture || userData.picture || '',
          lastLogin: Date.now(),
        });
        await redisClient.set(`auth:google:${googleUser.sub}`, normalizedEmail);
      } else {
        await redisClient.hset(`auth:user:${normalizedEmail}`, { lastLogin: Date.now() });
      }
      userData = await redisClient.hgetall(`auth:user:${normalizedEmail}`);
    }

    // Check/Create Vault
    const crypto = (await import('crypto'));
    let walletAddress = userData.walletAddress || '';
    let vaultId = userData.vaultId || '';
    const userId = userData.id;

    if (!walletAddress) {
      const addressHash = crypto.createHash('sha256').update(`auxite-wallet-${userId}`).digest('hex');
      walletAddress = '0x' + addressHash.substring(0, 40);

      if (!vaultId) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        vaultId = `AX-VLT-${part1}-${part2}`;
      }

      await redisClient.hset(`auth:user:${normalizedEmail}`, { walletAddress, vaultId });
      await redisClient.set(`user:address:${walletAddress.toLowerCase()}`, userId);
      console.log(`[Google Mobile Auth] Wallet assigned for ${userId}: ${walletAddress}, vault: ${vaultId}`);
    }

    // Generate JWT
    const jwt = (await import('jsonwebtoken')).default;
    const token = jwt.sign(
      {
        userId: userId,
        email: normalizedEmail,
        emailVerified: true,
        walletAddress: walletAddress,
        authProvider: 'google',
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      success: true,
      message: isNewUser ? 'Account created successfully' : 'Login successful',
      isNewUser,
      user: {
        id: userId,
        email: normalizedEmail,
        name: userData.name || googleUser.name || '',
        picture: userData.picture || googleUser.picture || '',
        emailVerified: true,
        walletAddress: walletAddress,
        authProvider: 'google',
      },
      token,
    });
  } catch (error: any) {
    console.error('Google token auth error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Google authentication failed' }, { status: 500 });
  }
}
