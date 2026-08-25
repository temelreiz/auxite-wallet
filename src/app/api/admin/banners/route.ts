import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

interface Banner {
  id: string;
  title: { tr: string; en: string; de?: string; fr?: string; ar?: string; ru?: string };
  subtitle?: { tr: string; en: string; de?: string; fr?: string; ar?: string; ru?: string };
  imageUrl?: string;
  backgroundColor: string;
  textColor: string;
  actionType: 'none' | 'link' | 'screen' | 'promo';
  actionValue?: string;
  ctaLabel?: { tr: string; en: string; de?: string; fr?: string; ar?: string; ru?: string };
  dismissLabel?: { tr: string; en: string; de?: string; fr?: string; ar?: string; ru?: string };
  active: boolean;
  priority: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface BannersData {
  banners: Banner[];
  lastUpdated: string;
}

const BANNERS_KEY = "mobile:banners";

const DEFAULT_BANNERS: Banner[] = [
  {
    id: "welcome-banner",
    title: { tr: "Auxite'e Hoş Geldiniz! 🎉", en: "Welcome to Auxite! 🎉", de: "Willkommen bei Auxite! 🎉", fr: "Bienvenue sur Auxite! 🎉", ar: "مرحباً بك في Auxite! 🎉", ru: "Добро пожаловать в Auxite! 🎉" },
    subtitle: { tr: "Değerli metal yatırımına başlayın", en: "Start investing in precious metals", de: "Beginnen Sie mit Edelmetall-Investitionen", fr: "Commencez à investir dans les métaux précieux", ar: "ابدأ الاستثمار في المعادن الثمينة", ru: "Начните инвестировать в драгоценные металлы" },
    backgroundColor: "#8b5cf6",
    textColor: "#ffffff",
    actionType: "screen",
    actionValue: "trade",
    active: true,
    priority: 100,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "auxm-bonus",
    title: { tr: "🎁 %2 AUXM Bonus", en: "🎁 2% AUXM Bonus", de: "🎁 2% AUXM Bonus", fr: "🎁 2% Bonus AUXM", ar: "🎁 مكافأة AUXM 2%", ru: "🎁 2% бонус AUXM" },
    subtitle: { tr: "AUXM ile işlem yap, bonus kazan!", en: "Trade with AUXM, earn bonus!", de: "Handel mit AUXM, verdiene Bonus!", fr: "Tradez avec AUXM, gagnez des bonus!", ar: "تداول باستخدام AUXM واربح مكافآت!", ru: "Торгуйте с AUXM, получайте бонусы!" },
    backgroundColor: "#10b981",
    textColor: "#ffffff",
    actionType: "screen",
    actionValue: "convert",
    active: true,
    priority: 90,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// GET - Banner listesi
export async function GET(request: NextRequest) {
  try {
    let bannersData: BannersData | null = await kv.get<BannersData>(BANNERS_KEY);
    
    if (!bannersData) {
      bannersData = { banners: DEFAULT_BANNERS, lastUpdated: new Date().toISOString() };
      await kv.set(BANNERS_KEY, bannersData);
    }

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform");
    const activeOnly = searchParams.get("active") === "true";

    let filteredBanners = bannersData.banners;

    if (activeOnly) {
      filteredBanners = filteredBanners.filter(b => b.active);
    }

    filteredBanners.sort((a, b) => b.priority - a.priority);

    return NextResponse.json({
      success: true,
      banners: filteredBanners,
      lastUpdated: bannersData.lastUpdated,
    });
  } catch (error: any) {
    console.error("Banners GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** Locales the wallet renders. Keep in sync with LanguageContext. */
const LOCALES = ["tr", "en", "de", "fr", "ar", "ru"] as const;

/**
 * Build a locale record from a full object plus any legacy flat fields
 * (titleTr/titleEn) the older admin callers still send. Empty strings are
 * dropped so pickBannerLocale's fallback chain can do its job.
 */
function pickLocales(
  source: Record<string, string> | undefined,
  legacy: Record<string, string | undefined>,
): Banner["title"] {
  // tr and en are required by the Banner type — the render-side fallback
  // chain starts there — so they're always present, empty string included.
  const out: Banner["title"] = { tr: "", en: "" };
  for (const code of LOCALES) {
    const value = legacy[code] ?? source?.[code];
    if (typeof value === "string" && value.trim()) out[code] = value.trim();
  }
  return out;
}

// POST - Banner ekle/güncelle/sil
export async function POST(request: NextRequest) {
  try {
    // Auth kontrolü - session token
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const session = await kv.get(`admin:session:${token}`);
    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const body = await request.json();
    const { action, banner, bannerId } = body;

    let bannersData: BannersData | null = await kv.get<BannersData>(BANNERS_KEY);
    if (!bannersData) {
      bannersData = { banners: DEFAULT_BANNERS, lastUpdated: new Date().toISOString() };
    }

    switch (action) {
      case "add": {
        const newBanner: Banner = {
          id: banner.id || `banner-${Date.now()}`,
          // Keep every locale the app can render. This used to persist only
          // tr/en, so a German or Arabic viewer silently fell back to Turkish
          // even when ops had written a translation.
          title: pickLocales(banner.title, {
            tr: banner.titleTr,
            en: banner.titleEn,
          }),
          subtitle: pickLocales(banner.subtitle, {
            tr: banner.subtitleTr,
            en: banner.subtitleEn,
          }),
          // Per-campaign button copy; empty locales fall back to the
          // component defaults at render time.
          ctaLabel: pickLocales(banner.ctaLabel, {}),
          dismissLabel: pickLocales(banner.dismissLabel, {}),
          // imageUrl and the date window were absent here, so a banner created
          // with a hero image or a schedule silently lost all three — the
          // admin form collects them and they never reached storage.
          imageUrl: banner.imageUrl || undefined,
          startDate: banner.startDate || undefined,
          endDate: banner.endDate || undefined,
          backgroundColor: banner.bgColor || banner.backgroundColor || "#10b981",
          textColor: banner.textColor || "#ffffff",
          actionType: banner.actionType || "none",
          actionValue: banner.actionValue || "",
          active: banner.active !== false,
          priority: banner.priority || 50,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        bannersData.banners.push(newBanner);
        break;
      }

      case "update": {
        const index = bannersData.banners.findIndex((b) => b.id === bannerId);
        if (index === -1) {
          return NextResponse.json({ error: "Banner not found" }, { status: 404 });
        }
        bannersData.banners[index] = {
          ...bannersData.banners[index],
          ...banner,
          title: banner.title || bannersData.banners[index].title,
          subtitle: banner.subtitle || bannersData.banners[index].subtitle,
          updatedAt: new Date().toISOString(),
        };
        break;
      }

      case "delete": {
        bannersData.banners = bannersData.banners.filter((b) => b.id !== bannerId);
        break;
      }

      case "toggle": {
        const idx = bannersData.banners.findIndex((b) => b.id === bannerId);
        if (idx !== -1) {
          bannersData.banners[idx].active = !bannersData.banners[idx].active;
          bannersData.banners[idx].updatedAt = new Date().toISOString();
        }
        break;
      }

      case "reorder": {
        const { bannerIds } = body;
        if (bannerIds && Array.isArray(bannerIds)) {
          const reordered: Banner[] = [];
          bannerIds.forEach((id: string, index: number) => {
            const b = bannersData!.banners.find((x) => x.id === id);
            if (b) {
              b.priority = 100 - index;
              reordered.push(b);
            }
          });
          bannersData.banners = reordered;
        }
        break;
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    bannersData.lastUpdated = new Date().toISOString();
    await kv.set(BANNERS_KEY, bannersData);

    return NextResponse.json({
      success: true,
      message: `Banner ${action} successful`,
      banners: bannersData.banners,
    });
  } catch (error: any) {
    console.error("Banners POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Reset banners to defaults
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const session = await kv.get(`admin:session:${token}`);
    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Delete the key - defaults will be recreated on next GET
    await kv.del(BANNERS_KEY);
    
    return NextResponse.json({ success: true, message: "Banners reset to defaults" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
