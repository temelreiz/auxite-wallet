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
  active: boolean;
  priority: number;
  startDate?: string;
  endDate?: string;
  /** Where the banner may show. Unset = everywhere. The mobile app sends
   *  X-Client-Platform (ios|android); a request without it is the web. */
  platforms?: Array<'web' | 'android' | 'ios'>;
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
    title: { tr: "🎁 %2 Nakit Bonus", en: "🎁 2% Cash Bonus", de: "🎁 2% Bar-Bonus", fr: "🎁 2% de bonus en espèces", ar: "🎁 مكافأة نقدية 2%", ru: "🎁 2% денежный бонус" },
    subtitle: { tr: "Nakit bakiyenle işlem yap, bonus kazan!", en: "Trade with your cash balance, earn bonus!", de: "Mit Barguthaben handeln, Bonus verdienen!", fr: "Tradez avec votre solde en espèces, gagnez des bonus!", ar: "تداول برصيدك النقدي واربح مكافآت!", ru: "Торгуйте с денежного баланса, получайте бонусы!" },
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
    const platform = (
      request.headers.get("x-client-platform") || searchParams.get("platform") || "web"
    ).toLowerCase();
    const activeOnly = searchParams.get("active") === "true";

    let filteredBanners = bannersData.banners;

    // Display requests (active=true) also get the platform filter; the admin
    // list asks without it and sees every banner.
    if (activeOnly) {
      filteredBanners = filteredBanners.filter(
        (b) => b.active && (!b.platforms?.length || b.platforms.includes(platform as "web" | "android" | "ios")),
      );
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
          title: { 
            tr: banner.titleTr || banner.title?.tr || "", 
            en: banner.titleEn || banner.title?.en || "" 
          },
          subtitle: { 
            tr: banner.subtitleTr || banner.subtitle?.tr || "", 
            en: banner.subtitleEn || banner.subtitle?.en || "" 
          },
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
