// src/app/api/auth/google/callback/route.ts
// Google OAuth - Callback Handler

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'crypto';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// JWT Secret - MUST be set in environment, no fallback for security
const JWT_SECRET = process.env.JWT_SECRET!;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL 
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
  : 'https://vault.auxite.io/api/auth/google/callback';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://vault.auxite.io';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Check for errors from Google
    if (error) {
      console.error('Google OAuth error:', error);
      return NextResponse.redirect(`${APP_URL}/auth/login?error=google_denied`);
    }

    // Validate code
    if (!code) {
      return NextResponse.redirect(`${APP_URL}/auth/login?error=no_code`);
    }

    // Validate state (CSRF protection) — mobile requests have '_mobile' suffix and no cookie
    const isMobileRequest = state?.endsWith('_mobile');
    if (!isMobileRequest) {
      const storedState = request.cookies.get('oauth_state')?.value;
      if (!storedState || storedState !== state) {
        console.error('State mismatch:', { storedState, state });
        return NextResponse.redirect(`${APP_URL}/auth/login?error=invalid_state`);
      }
    }

    // ══════════════════════════════════════════════════════════════
    // EXCHANGE CODE FOR TOKENS
    // ══════════════════════════════════════════════════════════════
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return NextResponse.redirect(`${APP_URL}/auth/login?error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json();

    // ══════════════════════════════════════════════════════════════
    // GET USER INFO
    // ══════════════════════════════════════════════════════════════
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoResponse.ok) {
      console.error('Failed to get user info');
      return NextResponse.redirect(`${APP_URL}/auth/login?error=user_info_failed`);
    }

    const googleUser = await userInfoResponse.json();
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
        passwordHash: '',
        name: googleUser.name || '',
        phone: '',
        picture: googleUser.picture || '',
        language: 'en',
        walletAddress: '',
        authProvider: 'google',
        googleId: googleUser.id,
        emailVerified: true,
        createdAt: Date.now(),
        lastLogin: Date.now(),
      };

      await redis.hset(`auth:user:${normalizedEmail}`, userData);
      await redis.set(`auth:email:${normalizedEmail}`, userId);
      await redis.set(`auth:google:${googleUser.id}`, normalizedEmail);

    } else {
      // ══════════════════════════════════════════════════════════════
      // EXISTING USER - Update
      // ══════════════════════════════════════════════════════════════
      if (!userData.googleId) {
        await redis.hset(`auth:user:${normalizedEmail}`, {
          googleId: googleUser.id,
          picture: googleUser.picture || userData.picture || '',
          lastLogin: Date.now(),
        });
        await redis.set(`auth:google:${googleUser.id}`, normalizedEmail);
      } else {
        await redis.hset(`auth:user:${normalizedEmail}`, {
          lastLogin: Date.now(),
        });
      }

      userData = await redis.hgetall(`auth:user:${normalizedEmail}`);
    }

    // ══════════════════════════════════════════════════════════════
    // CHECK/CREATE VAULT (for users without vault)
    // ══════════════════════════════════════════════════════════════
    let walletAddress = userData.walletAddress || '';
    let vaultId = userData.vaultId || '';
    const userId = userData.id;

    if (!walletAddress) {
      const addressHash = createHash('sha256').update(`auxite-wallet-${userId}`).digest('hex');
      walletAddress = '0x' + addressHash.substring(0, 40);

      if (!vaultId) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        vaultId = `AX-VLT-${part1}-${part2}`;
      }

      await redis.hset(`auth:user:${normalizedEmail}`, { walletAddress, vaultId });
      await redis.set(`user:address:${walletAddress.toLowerCase()}`, userId);
      console.log(`[Google OAuth] Wallet assigned for ${userId}: ${walletAddress}, vault: ${vaultId}`);
    }

    // ══════════════════════════════════════════════════════════════
    // GENERATE JWT TOKEN
    // ══════════════════════════════════════════════════════════════
    const jwtToken = jwt.sign(
      {
        userId: userId,
        email: normalizedEmail,
        emailVerified: true,
        walletAddress: walletAddress,
        authProvider: 'google',
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // ══════════════════════════════════════════════════════════════
    // REDIRECT WITH TOKEN
    // ══════════════════════════════════════════════════════════════
    // We'll pass token via a temporary page that saves it to localStorage
    // Resolve user language from Redis
    let userLanguage = (userData.language as string) || 'en';
    if (userId && userLanguage === 'en') {
      const userProfile = await redis.hgetall(`user:${userId}`) as any;
      if (userProfile?.language && ['en','tr','de','fr','ar','ru'].includes(userProfile.language)) {
        userLanguage = userProfile.language;
      }
    }

    const userDataForClient = {
      id: userData.id,
      email: normalizedEmail,
      name: userData.name || googleUser.name || '',
      picture: userData.picture || googleUser.picture || '',
      emailVerified: true,
      walletAddress: walletAddress,
      language: userLanguage,
    };

    // Encode data for URL
    const encodedToken = encodeURIComponent(jwtToken);
    const encodedUser = encodeURIComponent(JSON.stringify(userDataForClient));

    // Mobile requests → redirect to app custom scheme
    // Web requests → redirect to web callback page
    const callbackBase = isMobileRequest
      ? 'auxite-vault://auth/callback'
      : `${APP_URL}/auth/callback`;

    const response = NextResponse.redirect(
      `${callbackBase}?token=${encodedToken}&user=${encodedUser}`
    );

    if (!isMobileRequest) {
      response.cookies.delete('oauth_state');
    }

    return response;

  } catch (error: any) {
    console.error('Google callback error:', error);
    return NextResponse.redirect(`${APP_URL}/auth/login?error=callback_failed`);
  }
}
