// src/middleware.ts
//
// Geo-block click-farm cohort countries from hitting the API. These
// regions produced 128K Android installs over 30 days with 0
// transactions and continue to use the app (existing installs)
// after we removed Play Store availability. The middleware short-
// circuits at the edge so they never touch Vercel functions or
// Upstash — pure cost savings, zero downside (no legitimate revenue
// has ever come from these countries on this product).
//
// Cloudflare WAF should be the primary block (cheaper, runs before
// Vercel). This middleware is defense-in-depth in case the WAF rule
// is removed or someone bypasses Cloudflare with a direct *.vercel.app
// URL.

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ISO-3166 alpha-2 codes for the click-farm cohort observed in
// Firebase Analytics. Easy to extend.
const BLOCKED_COUNTRIES = new Set([
  'BD', // Bangladesh
  'NP', // Nepal
  'ET', // Ethiopia
  'DZ', // Algeria
  'MM', // Myanmar
  'SD', // Sudan
  'TD', // Chad
  'CD', // Congo-Kinshasa
  'VE', // Venezuela
  'IN', // India
  'PK', // Pakistan (frequently same fraud rings)
  'NG', // Nigeria
]);

// Paths exempt from the geo-block. Public marketing pages, auth
// flows that legit users might recover into, and the unsubscribe
// endpoint all stay open.
const ALLOW_PATHS = [
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/verify-email',
  '/api/auth/verify-code',
  '/api/unsubscribe',
];

export function middleware(req: NextRequest) {
  // Vercel sets x-vercel-ip-country on every request based on the
  // edge POP that received it. Cloudflare also sets cf-ipcountry,
  // we check both.
  const country =
    req.headers.get('x-vercel-ip-country') ||
    req.headers.get('cf-ipcountry') ||
    '';

  if (!country || !BLOCKED_COUNTRIES.has(country.toUpperCase())) {
    return NextResponse.next();
  }

  // Even within blocked countries, leave a recovery path open: if
  // a real user got onboarded before we added the block and now
  // needs to reset their password, they can still complete that
  // flow. Everything else (signup, trading, deposits) is closed.
  const pathname = req.nextUrl.pathname;
  if (ALLOW_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  return new NextResponse(
    JSON.stringify({
      ok: false,
      error: 'Service unavailable in your region.',
      code: 'GEO_BLOCKED',
    }),
    {
      status: 451, // "Unavailable for Legal Reasons" — closest match
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

// Only run on API routes. Static pages, marketing assets, and the
// auxite.io homepage stay open to anyone — SEO and brand visibility
// shouldn't be blocked by geo.
export const config = {
  matcher: ['/api/:path*'],
};
