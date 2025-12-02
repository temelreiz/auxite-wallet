// src/app/api/news/route.ts
// Auxite Wallet - News API
// Admin paneli ve mobile app için haber yönetimi

import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

interface NewsItem {
  id: string;
  title: string;
  description: string;
  source: string;
  date: string;
  icon: string;
  color: string;
}

interface NewsData {
  tr: NewsItem[];
  en: NewsItem[];
  lastUpdated: string;
}

const NEWS_KEY = "auxite:news";

// Varsayılan haberler
const DEFAULT_NEWS: NewsData = {
  tr: [
    {
      id: "1",
      title: "Auxite Wallet Lansmanı Gerçekleşti!",
      description: "Değerli metal yatırımlarınızı dijitalleştirin. %2 AUXM bonus kampanyamız devam ediyor.",
      source: "Auxite",
      date: "2 Aralık 2024",
      icon: "gift",
      color: "#8B5CF6",
    },
    {
      id: "2",
      title: "Altın Fiyatları Rekor Seviyede",
      description: "Ons altın 2.700$ üzerinde işlem görüyor. Uzmanlar yükselişin devam edeceğini öngörüyor.",
      source: "Piyasa",
      date: "2 Aralık 2024",
      icon: "trending-up",
      color: "#FFD700",
    },
    {
      id: "3",
      title: "Yeni Özellik: Fiziksel Teslimat",
      description: "Artık tokenlerinizi fiziksel altın ve gümüş olarak teslim alabilirsiniz.",
      source: "Auxite",
      date: "1 Aralık 2024",
      icon: "package",
      color: "#10B981",
    },
  ],
  en: [
    {
      id: "1",
      title: "Auxite Wallet Launch!",
      description: "Digitize your precious metal investments. Our 2% AUXM bonus campaign continues.",
      source: "Auxite",
      date: "Dec 2, 2024",
      icon: "gift",
      color: "#8B5CF6",
    },
    {
      id: "2",
      title: "Gold Prices at Record High",
      description: "Gold trading above $2,700 per ounce. Experts predict continued rise.",
      source: "Market",
      date: "Dec 2, 2024",
      icon: "trending-up",
      color: "#FFD700",
    },
    {
      id: "3",
      title: "New Feature: Physical Delivery",
      description: "You can now receive your tokens as physical gold and silver.",
      source: "Auxite",
      date: "Dec 1, 2024",
      icon: "package",
      color: "#10B981",
    },
  ],
  lastUpdated: new Date().toISOString(),
};

// GET - Haberleri getir
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get("lang") || "tr";
    const all = searchParams.get("all");
    
    let newsData: NewsData | null = null;
    
    try {
      newsData = await kv.get<NewsData>(NEWS_KEY);
    } catch (kvError) {
      console.log("KV not available, using defaults");
    }
    
    if (!newsData) {
      newsData = DEFAULT_NEWS;
    }
    
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };
    
    if (all === "true") {
      return NextResponse.json({
        success: true,
        allNews: {
          tr: newsData.tr || [],
          en: newsData.en || [],
        },
        lastUpdated: newsData.lastUpdated,
      }, { headers });
    }
    
    return NextResponse.json({
      success: true,
      news: newsData[lang as keyof Pick<NewsData, "tr" | "en">] || newsData.tr,
      lastUpdated: newsData.lastUpdated,
    }, { headers });
    
  } catch (error) {
    console.error("News GET error:", error);
    return NextResponse.json({
      success: false,
      news: DEFAULT_NEWS.tr,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// POST - Haberleri güncelle (Admin only)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const adminPassword = process.env.ADMIN_PASSWORD || "auxite2024";
    const expectedAuth = "Bearer " + adminPassword;
    
    if (authHeader !== expectedAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await request.json();
    const { tr, en } = body;
    
    if (!tr || !en) {
      return NextResponse.json({ error: "Missing tr or en news arrays" }, { status: 400 });
    }
    
    const newsData: NewsData = {
      tr,
      en,
      lastUpdated: new Date().toISOString(),
    };
    
    try {
      await kv.set(NEWS_KEY, newsData);
      console.log("News saved to KV");
    } catch (kvError) {
      console.error("KV save error:", kvError);
    }
    
    return NextResponse.json({
      success: true,
      message: "News updated successfully",
      newsData,
    }, {
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("News POST error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

// OPTIONS - CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
