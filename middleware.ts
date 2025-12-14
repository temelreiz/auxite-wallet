// middleware.ts (proje root'una koyun)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Geliştirme modunda bypass için secret key
const ADMIN_SECRET = process.env.ADMIN_SECRET || "auxite2024secret";
const CRON_SECRET = process.env.CRON_SECRET;

// İzin verilen path'ler (API'ler çalışmaya devam etmeli)
const ALLOWED_PATHS = [
  "/api/",
  "/under-construction",
  "/_next/",
  "/favicon.ico",
  "/auxite-wallet-logo.png",
  "/gold-favicon-32x32.png",
  "/silver-favicon-32x32.png",
  "/platinum-favicon-32x32.png",
  "/palladium-favicon-32x32.png",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // ============================================
  // SECURITY HEADERS - YENİ
  // ============================================
  response.headers.set("X-DNS-Prefetch-Control", "on");
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );

  // ============================================
  // CRON ENDPOINT PROTECTION - YENİ
  // ============================================
  if (pathname.startsWith("/api/cron/")) {
    const authHeader = request.headers.get("authorization");
    const isVercelCron = request.headers.get("x-vercel-cron") === "true";
    const hasValidAuth = authHeader === `Bearer ${CRON_SECRET}`;

    if (!isVercelCron && !hasValidAuth && CRON_SECRET) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    return response;
  }

  // ============================================
  // MEVCUT UNDER CONSTRUCTION LOGIC
  // ============================================
  
  // API ve static dosyalara izin ver
  if (ALLOWED_PATHS.some((path) => pathname.startsWith(path))) {
    return response;
  }

  // Admin secret ile bypass (URL'de ?secret=xxx veya cookie)
  const url = new URL(request.url);
  const secretParam = url.searchParams.get("secret");
  const secretCookie = request.cookies.get("admin_secret")?.value;

  if (secretParam === ADMIN_SECRET) {
    // Cookie ayarla ve devam et
    response.cookies.set("admin_secret", ADMIN_SECRET, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 24 saat
    });
    return response;
  }

  if (secretCookie === ADMIN_SECRET) {
    return response;
  }

  // Under construction sayfasına yönlendir
  return NextResponse.rewrite(new URL("/under-construction", request.url));
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     */
    "/((?!_next/static|_next/image).*)",
  ],
};
