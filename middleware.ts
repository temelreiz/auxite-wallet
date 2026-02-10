// middleware.ts (project root)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// DEV bypass key - Production'da ENV'den alınmalı, varsayılan yok
const ADMIN_SECRET = process.env.ADMIN_SECRET;
const CRON_SECRET = process.env.CRON_SECRET;

const ALLOWED_PATHS = [
  "/api/",
  "/under-construction",
  "/_next/",
  "/favicon.ico",
  "/manifest.json",
  "/robots.txt",
  "/sitemap.xml",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/auxg_icon.png",
  "/auxs_icon.png",
  "/auxpt_icon.png",
  "/auxpd_icon.png",
  "/auxite-wallet-logo.png",
];

function buildCsp() {
  const isDev = process.env.NODE_ENV === "development";
  
  // Production'da daha sıkı CSP
  const scriptSrc = isDev
    ? "'self' 'unsafe-inline' 'unsafe-eval' https://api.sumsub.com https://in.sumsub.com https://*.sumsub.com"
    : "'self' 'unsafe-inline' https://api.sumsub.com https://in.sumsub.com https://*.sumsub.com"; // Production'da unsafe-eval yok

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "frame-src 'self' https://api.sumsub.com https://in.sumsub.com https://*.sumsub.com",
    "connect-src 'self' https: wss: https://api.auxite.io https://*.walletconnect.com https://*.walletconnect.org https://*.web3modal.org https://*.web3modal.com https://*.reown.com https://*.infura.io https://*.alchemy.com",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'", // Clickjacking koruması
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // Trace header (helps debugging via curl -I)
  response.headers.set("x-auxite-mw", "wallet-security-v2");

  // =====================================================
  // 1) SECURITY HEADERS
  // =====================================================
  response.headers.set("X-DNS-Prefetch-Control", "on");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );
  response.headers.set("Content-Security-Policy", buildCsp());

  // =====================================================
  // 2) CRON ENDPOINT PROTECTION
  // =====================================================
  if (pathname.startsWith("/api/cron/")) {
    const authHeader = request.headers.get("authorization");
    const isVercelCron = request.headers.get("x-vercel-cron") === "true";
    const hasValidAuth = authHeader === `Bearer ${CRON_SECRET}`;

    if (!isVercelCron && !hasValidAuth && CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return response;
  }

  // =====================================================
  // 3) UNDER-CONSTRUCTION GATE (DISABLED)
  // =====================================================
  // Gate devre dışı - tüm sayfalara erişim açık
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
