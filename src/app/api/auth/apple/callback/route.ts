import { NextRequest, NextResponse } from 'next/server';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://vault.auxite.io';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const idToken = formData.get('id_token') as string;
    const state = formData.get('state') as string;
    const userStr = formData.get('user') as string; // Only on first sign-in

    // Validate state — mobile requests have '_mobile' suffix and no cookie
    const isMobileRequest = state?.endsWith('_mobile');
    if (!isMobileRequest) {
      const storedState = request.cookies.get('apple_oauth_state')?.value;
      if (!storedState || storedState !== state) {
        return NextResponse.redirect(`${APP_URL}/auth/login?error=invalid_state`);
      }
    }

    if (!idToken) {
      return NextResponse.redirect(`${APP_URL}/auth/login?error=no_token`);
    }

    // Parse user data if available (Apple only sends this on first sign-in)
    let user = undefined;
    if (userStr) {
      try { user = JSON.parse(userStr); } catch {}
    }

    // Call our existing Apple auth endpoint
    const appleAuthResponse = await fetch(`${APP_URL}/api/auth/apple`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identityToken: idToken, user }),
    });

    const data = await appleAuthResponse.json();

    if (!data.success) {
      return NextResponse.redirect(`${APP_URL}/auth/login?error=apple_auth_failed`);
    }

    // Redirect with token
    const encodedToken = encodeURIComponent(data.token);
    const encodedUser = encodeURIComponent(JSON.stringify(data.user));

    // Mobile requests → redirect to app custom scheme
    // Web requests → redirect to web callback page
    const callbackBase = isMobileRequest
      ? 'auxite-vault://auth/callback'
      : `${APP_URL}/auth/callback`;

    const response = NextResponse.redirect(
      `${callbackBase}?token=${encodedToken}&user=${encodedUser}`
    );

    if (!isMobileRequest) {
      response.cookies.delete('apple_oauth_state');
    }
    return response;

  } catch (error: any) {
    console.error('Apple callback error:', error);
    return NextResponse.redirect(`${APP_URL}/auth/login?error=callback_failed`);
  }
}
