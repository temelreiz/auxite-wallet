// Public, crawlable marketing/legal pages. Client providers that otherwise
// blank the page during SSR (Web3Provider's mount spinner, LanguageProvider's
// null return) skip that gate for these paths so Googlebot receives real,
// indexable content. The providers themselves are still rendered, so shared
// components that read wallet/language context (e.g. TopNav) keep working.
const PUBLIC_PREFIXES = ["/legal", "/privacy-policy", "/privacy"];

export function isPublicMarketingPath(pathname: string | null): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname?.startsWith(`${p}/`)
  );
}
