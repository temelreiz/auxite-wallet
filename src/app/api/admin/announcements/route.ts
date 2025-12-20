// src/app/api/admin/announcements/route.ts
// Auxite Wallet - Announcement/Alert System API

import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

interface Announcement {
  id: string;
  title: { tr: string; en: string };
  message: { tr: string; en: string };
  type: 'info' | 'warning' | 'success' | 'error' | 'maintenance';
  priority: 'low' | 'medium' | 'high' | 'critical';
  dismissible: boolean;
  showOnce: boolean;
  targetScreens?: string[];
  targetUsers?: 'all' | 'verified' | 'unverified' | 'premium';
  platform: 'all' | 'mobile' | 'web';
  actionButton?: { text: { tr: string; en: string }; action: string };
  startDate?: string;
  endDate?: string;
  active: boolean;
  createdAt: string;
}

const ANNOUNCEMENTS_KEY = "auxite:announcements";
const DISMISSED_KEY = "auxite:announcements:dismissed"; // user dismissed announcements

// Auth helper
const verifyAuth = (request: NextRequest): boolean => {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  return token === process.env.ADMIN_PASSWORD;
};

// GET - Duyuruları getir
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform") || "all";
    const screen = searchParams.get("screen");
    const userType = searchParams.get("userType") || "all";
    const lang = searchParams.get("lang") || "tr";
    const userId = searchParams.get("userId"); // For checking dismissed
    const all = searchParams.get("all") === "true"; // Admin için tümü
    
    let announcements: Announcement[] = [];
    try {
      announcements = await kv.get<Announcement[]>(ANNOUNCEMENTS_KEY) || [];
    } catch {
      announcements = [];
    }
    
    // Admin için tüm duyuruları döndür
    if (all) {
      return NextResponse.json({
        success: true,
        announcements: announcements.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
      });
    }
    
    const now = new Date();
    
    // Kullanıcı için filtreleme
    let filtered = announcements.filter(a => {
      // Aktif mi?
      if (!a.active) return false;
      
      // Tarih kontrolü
      if (a.startDate && new Date(a.startDate) > now) return false;
      if (a.endDate && new Date(a.endDate) < now) return false;
      
      // Platform kontrolü
      if (a.platform !== 'all' && a.platform !== platform) return false;
      
      // Ekran kontrolü
      if (screen && a.targetScreens && !a.targetScreens.includes('all') && !a.targetScreens.includes(screen)) {
        return false;
      }
      
      // Kullanıcı tipi kontrolü
      if (a.targetUsers && a.targetUsers !== 'all' && a.targetUsers !== userType) {
        return false;
      }
      
      return true;
    });
    
    // Dismissed kontrolü (showOnce olanlar için)
    if (userId) {
      try {
        const dismissed = await kv.get<string[]>(`${DISMISSED_KEY}:${userId}`) || [];
        filtered = filtered.filter(a => {
          if (a.showOnce && dismissed.includes(a.id)) return false;
          return true;
        });
      } catch {
        // Dismissed bilgisi alınamazsa devam et
      }
    }
    
    // Önceliğe göre sırala
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    filtered.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    
    // Dil bazlı response
    const localizedAnnouncements = filtered.map(a => ({
      id: a.id,
      title: lang === 'en' ? a.title.en : a.title.tr,
      message: lang === 'en' ? a.message.en : a.message.tr,
      type: a.type,
      priority: a.priority,
      dismissible: a.dismissible,
      actionButton: a.actionButton ? {
        text: lang === 'en' ? a.actionButton.text.en : a.actionButton.text.tr,
        action: a.actionButton.action,
      } : undefined,
    }));
    
    return NextResponse.json({
      success: true,
      announcements: localizedAnnouncements,
    });
    
  } catch (error) {
    console.error("Announcements GET error:", error);
    return NextResponse.json({
      success: false,
      announcements: [],
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// POST - Duyuru işlemleri
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    // Dismiss action - kullanıcı tarafından çağrılabilir
    if (action === "dismiss") {
      const { announcementId, userId } = body;
      if (!announcementId || !userId) {
        return NextResponse.json({ error: "Missing announcementId or userId" }, { status: 400 });
      }
      
      const dismissedKey = `${DISMISSED_KEY}:${userId}`;
      let dismissed: string[] = [];
      try {
        dismissed = await kv.get<string[]>(dismissedKey) || [];
      } catch {
        dismissed = [];
      }
      
      if (!dismissed.includes(announcementId)) {
        dismissed.push(announcementId);
        await kv.set(dismissedKey, dismissed);
      }
      
      return NextResponse.json({ success: true, message: "Announcement dismissed" });
    }
    
    // Admin işlemleri
    if (!verifyAuth(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { announcement, announcementId } = body;
    
    let announcements: Announcement[] = await kv.get<Announcement[]>(ANNOUNCEMENTS_KEY) || [];
    
    switch (action) {
      case "add": {
        const newAnnouncement: Announcement = {
          ...announcement,
          id: `announcement-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        announcements.push(newAnnouncement);
        break;
      }
      
      case "update": {
        const index = announcements.findIndex(a => a.id === announcementId);
        if (index === -1) {
          return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
        }
        announcements[index] = { ...announcements[index], ...announcement };
        break;
      }
      
      case "toggle": {
        const idx = announcements.findIndex(a => a.id === announcementId);
        if (idx !== -1) {
          announcements[idx].active = !announcements[idx].active;
        }
        break;
      }
      
      case "delete": {
        announcements = announcements.filter(a => a.id !== announcementId);
        break;
      }
      
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    
    await kv.set(ANNOUNCEMENTS_KEY, announcements);
    
    return NextResponse.json({
      success: true,
      message: `Announcement ${action} successful`,
      announcements,
    });
    
  } catch (error) {
    console.error("Announcements POST error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({});
}
