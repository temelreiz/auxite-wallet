// src/app/api/auth/google/callback/route.ts
// Google OAuth - Callback Handler

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const JWT_SECRET = process.env.JWT_SECRET || 'auxite-jwt-secret-change-in-production';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL 
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
  : 'https://wallet.auxite.io/api/auth/google/callback';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://wallet.auxite.io';

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

    // Validate state (CSRF protection)
    const storedState = request.cookies.get('oauth_state')?.value;
    if (!storedState || storedState !== state) {
      console.error('State mismatch:', { storedState, state });
      return NextResponse.redirect(`${APP_URL}/auth/login?error=invalid_state`);
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
    // GENERATE JWT TOKEN
    // ══════════════════════════════════════════════════════════════
    const jwtToken = jwt.sign(
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
    // REDIRECT WITH TOKEN
    // ══════════════════════════════════════════════════════════════
    // We'll pass token via a temporary page that saves it to localStorage
    const userDataForClient = {
      id: userData.id,
      email: normalizedEmail,
      name: userData.name || googleUser.name || '',
      picture: userData.picture || googleUser.picture || '',
      emailVerified: true,
      walletAddress: userData.walletAddress || '',
    };

    // Encode data for URL
    const encodedToken = encodeURIComponent(jwtToken);
    const encodedUser = encodeURIComponent(JSON.stringify(userDataForClient));

    // Clear oauth state cookie
    const response = NextResponse.redirect(
      `${APP_URL}/auth/callback?token=${encodedToken}&user=${encodedUser}`
    );
    
    response.cookies.delete('oauth_state');

    return response;

  } catch (error: any) {
    console.error('Google callback error:', error);
    return NextResponse.redirect(`${APP_URL}/auth/login?error=callback_failed`);
  }
}
