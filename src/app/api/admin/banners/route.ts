// src/app/api/mobile/banners/route.ts
// Auxite Wallet - Mobile Banners API with Vercel KV

import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

interface Banner {
  id: string;
  title: { tr: string; en: string };
  subtitle?: { tr: string; en: string };
  imageUrl?: string;
  backgroundColor: string;
  textColor: string;
  actionType: 'none' | 'link' | 'screen' | 'promo';
  actionValue?: string;
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

const BANNERS_KEY = "auxite:mobile:banners";

// Varsayılan banner'lar
const DEFAULT_BANNERS: BannersData = {
  banners: [
    {
      id: "welcome-banner",
      title: { tr: "Auxite'e Hoş Geldiniz! 🎉", en: "Welcome to Auxite! 🎉" },
      subtitle: { tr: "Değerli metal yatırımlarınızı dijitalleştirin", en: "Digitize your precious metal investments" },
      backgroundColor: "#10b981",
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
      title: { tr: "🎁 %2 AUXM Bonus", en: "🎁 2% AUXM Bonus" },
      subtitle: { tr: "AUXM ile işlem yap, bonus kazan!", en: "Trade with AUXM, earn bonus!" },
      backgroundColor: "#8B5CF6",
      textColor: "#ffffff",
      actionType: "screen",
      actionValue: "convert",
      active: true,
      priority: 90,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  lastUpdated: new Date().toISOString(),
};

// GET - Banner'ları getir
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get("lang") || "tr";
    const all = searchParams.get("all") === "true"; // Admin için tüm banner'lar
    
    let bannersData: BannersData | null = null;
    
    // Vercel KV'den banner'ları çek
    try {
      bannersData = await kv.get<BannersData>(BANNERS_KEY);
    } catch (kvError) {
      console.log("KV fetch error, using defaults:", kvError);
    }
    
    // KV'de veri yoksa varsayılanları kullan
    if (!bannersData) {
      bannersData = DEFAULT_BANNERS;
    }
    
    // Admin için tüm banner'ları döndür
    if (all) {
      return NextResponse.json({
        success: true,
        banners: bannersData.banners,
        lastUpdated: bannersData.lastUpdated,
      });
    }
    
    // Mobile app için aktif ve tarih aralığındaki banner'ları filtrele
    const now = new Date();
    const activeBanners = bannersData.banners
      .filter((banner) => {
        if (!banner.active) return false;
        if (banner.startDate && new Date(banner.startDate) > now) return false;
        if (banner.endDate && new Date(banner.endDate) < now) return false;
        return true;
      })
      .sort((a, b) => b.priority - a.priority)
      .map((banner) => ({
        id: banner.id,
        title: lang === "en" ? banner.title.en : banner.title.tr,
        subtitle: banner.subtitle ? (lang === "en" ? banner.subtitle.en : banner.subtitle.tr) : undefined,
        imageUrl: banner.imageUrl,
        backgroundColor: banner.backgroundColor,
        textColor: banner.textColor,
        actionType: banner.actionType,
        actionValue: banner.actionValue,
      }));
    
    return NextResponse.json({
      success: true,
      banners: activeBanners,
      lastUpdated: bannersData.lastUpdated,
    });
    
  } catch (error) {
    console.error("Banners GET error:", error);
    return NextResponse.json({
      success: false,
      banners: [],
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// POST - Banner ekle/güncelle (Admin only)
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
    
    // Mevcut banner'ları al
    let bannersData: BannersData | null = await kv.get<BannersData>(BANNERS_KEY);
    if (!bannersData) {
      bannersData = { banners: [], lastUpdated: new Date().toISOString() };
    }
    
    switch (action) {
      case "add": {
        const newBanner: Banner = {
          id: banner.id || `banner-${Date.now()}`,
          title: { tr: banner.titleTr || banner.title?.tr || "", en: banner.titleEn || banner.title?.en || "" },
          subtitle: { tr: banner.subtitleTr || banner.subtitle?.tr || "", en: banner.subtitleEn || banner.subtitle?.en || "" },
          backgroundColor: banner.bgColor || banner.backgroundColor || "#10b981",
          textColor: banner.textColor || "#ffffff",
          actionType: banner.actionType || "none",
          actionValue: banner.actionValue || "",
          active: banner.active !== false,
          priority: banner.priority || 50,
          createdAt: new Date().toISOString(),
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
        const { bannerIds } = body; // ["id1", "id2", "id3"] - priority sırasına göre
        if (Array.isArray(bannerIds)) {
          bannerIds.forEach((id, index) => {
            const bannerIdx = bannersData!.banners.findIndex((b) => b.id === id);
            if (bannerIdx !== -1) {
              bannersData!.banners[bannerIdx].priority = 100 - index;
            }
          });
        }
        break;
      }
      
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    
    bannersData.lastUpdated = new Date().toISOString();
    
    // KV'ye kaydet
    await kv.set(BANNERS_KEY, bannersData);
    
    return NextResponse.json({
      success: true,
      message: `Banner ${action} successful`,
      banners: bannersData.banners,
    });
    
  } catch (error) {
    console.error("Banners POST error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

// OPTIONS - CORS
export async function OPTIONS() {
  return NextResponse.json({});
}
