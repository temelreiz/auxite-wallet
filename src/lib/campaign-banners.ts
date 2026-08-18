// ════════════════════════════════════════════════════════════════════════════
// CAMPAIGN BANNERS — shared shape, fetching and routing
// ════════════════════════════════════════════════════════════════════════════
//
// Banner records come from /api/mobile/banners and are rendered by two web
// surfaces (the inline carousel and the popup) plus the mobile app. The type,
// the date/active filtering and the symbolic-route map used to live inside
// CampaignBannerCarousel.tsx; a second consumer would have meant a second copy
// that quietly drifts, so they live here now.
//
// Keep the screen map in sync with the mobile screenMap — the same banner
// record has to route to the same place in both apps.
// ════════════════════════════════════════════════════════════════════════════

export interface BannerLocale {
  tr?: string;
  en?: string;
  de?: string;
  fr?: string;
  ar?: string;
  ru?: string;
}

export interface Banner {
  id: string;
  title: BannerLocale;
  subtitle?: BannerLocale;
  imageUrl?: string;
  backgroundColor: string;
  textColor: string;
  actionType: "none" | "link" | "screen" | "promo";
  actionValue?: string;
  active: boolean;
  priority: number;
  startDate?: string;
  endDate?: string;
}

interface BannersResponse {
  success: boolean;
  banners: Banner[];
}

/** Pick the viewer's language, falling back through the other locales. */
export function pickBannerLocale(
  localized: BannerLocale | undefined,
  language: string,
): string {
  if (!localized) return "";
  return (
    (localized[language as keyof BannerLocale] as string | undefined) ||
    localized.tr ||
    localized.en ||
    localized.de ||
    localized.fr ||
    localized.ar ||
    localized.ru ||
    ""
  );
}

/**
 * Resolve a banner's symbolic destination to a real path. Symbolic names stay
 * short in the record ("trade", "convert") so one banner works in both apps.
 */
export function resolveBannerRoute(actionValue: string | undefined): string | null {
  if (!actionValue) return null;
  const map: Record<string, string> = {
    trade: "/allocate",
    buy: "/allocate",
    allocate: "/allocate",
    markets: "/allocate",
    convert: "/allocate",
    withdraw: "/redeem",
    redeem: "/redeem",
    fund: "/fund-vault",
    "fund-vault": "/fund-vault",
    stake: "/stake",
    yield: "/stake",
    profile: "/profile",
    account: "/profile",
    vault: "/vault",
    auxr: "/auxr",
    trust: "/trust",
    support: "/support",
    transfers: "/transfers",
    ledger: "/ledger",
  };
  return map[actionValue.toLowerCase()] || `/${actionValue}`;
}

/**
 * Fetch the banners that should be visible right now, highest priority first.
 * Never throws — a failed banner fetch must not take down the page it sits on,
 * so the caller just gets an empty list.
 */
export async function fetchActiveBanners(): Promise<Banner[]> {
  try {
    const res = await fetch("/api/mobile/banners?active=true", { cache: "no-store" });
    const data: BannersResponse = await res.json();
    if (!data.success || !Array.isArray(data.banners)) return [];

    const now = Date.now();
    return data.banners
      .filter((b) => {
        if (!b.active) return false;
        if (b.startDate && Date.parse(b.startDate) > now) return false;
        if (b.endDate && Date.parse(b.endDate) < now) return false;
        return true;
      })
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  } catch (err) {
    console.warn("[campaign-banners] fetch failed:", err);
    return [];
  }
}
