// middleware.ts (proje root'una koyun)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Geliştirme modunda bypass için secret key
const ADMIN_SECRET = process.env.ADMIN_SECRET || "auxite2024secret";

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

  // API ve static dosyalara izin ver
  if (ALLOWED_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Admin secret ile bypass (URL'de ?secret=xxx veya cookie)
  const url = new URL(request.url);
  const secretParam = url.searchParams.get("secret");
  const secretCookie = request.cookies.get("admin_secret")?.value;

  if (secretParam === ADMIN_SECRET) {
    // Cookie ayarla ve devam et
    const response = NextResponse.next();
    response.cookies.set("admin_secret", ADMIN_SECRET, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 24 saat
    });
    return response;
  }

  if (secretCookie === ADMIN_SECRET) {
    return NextResponse.next();
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
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image).*)",
  ],
};
