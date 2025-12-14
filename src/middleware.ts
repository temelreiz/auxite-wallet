import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rate limit store (production'da Redis kullan)
const rateLimit = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 100; // requests
const RATE_WINDOW = 60 * 1000; // 1 minute

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Security Headers
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api.sumsub.com https://in.sumsub.com https://*.sumsub.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "frame-src 'self' https://api.sumsub.com https://in.sumsub.com https://*.sumsub.com",
      "connect-src 'self' https://api.auxite.io https://*.thirdweb.com https://*.merkle.io https://*.walletconnect.com https://*.walletconnect.org https://api.binance.com https://api.coingecko.com https://www.goldapi.io https://*.upstash.io https://api.sumsub.com https://in.sumsub.com https://*.sumsub.com wss://*",
      "media-src 'self' blob:",
      "worker-src 'self' blob:",
    ].join('; ')
  );
  response.headers.set(
    'Permissions-Policy',
    'camera=(self), microphone=(self), geolocation=()'
  );

  // CORS - Only allow own domain
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    'https://auxite.io',
    'https://www.auxite.io',
    'http://localhost:3000',
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  // Rate Limiting for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';
    const now = Date.now();
    const key = `${ip}:${request.nextUrl.pathname}`;
    
    const current = rateLimit.get(key);
    
    if (current) {
      if (now > current.resetTime) {
        rateLimit.set(key, { count: 1, resetTime: now + RATE_WINDOW });
      } else if (current.count >= RATE_LIMIT) {
        return NextResponse.json(
          { error: 'Too many requests' },
          { status: 429, headers: { 'Retry-After': '60' } }
        );
      } else {
        current.count++;
      }
    } else {
      rateLimit.set(key, { count: 1, resetTime: now + RATE_WINDOW });
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
  ],
};
