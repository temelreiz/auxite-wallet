import { NextRequest, NextResponse } from 'next/server';

// Web uses Services ID (different from mobile App/Bundle ID)
const APPLE_WEB_CLIENT_ID = process.env.APPLE_WEB_CLIENT_ID || process.env.APPLE_CLIENT_ID || 'com.auxite.wallet';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://vault.auxite.io';
const REDIRECT_URI = `${APP_URL}/api/auth/apple/callback`;

export async function GET(request: NextRequest) {
  const state = Math.random().toString(36).substring(2, 15);

  const params = new URLSearchParams({
    client_id: APPLE_WEB_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code id_token',
    response_mode: 'form_post',
    scope: 'name email',
    state,
  });

  const response = NextResponse.redirect(
    `https://appleid.apple.com/auth/authorize?${params.toString()}`
  );

  response.cookies.set('apple_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 10,
  });

  return response;
}
