// src/app/api/admin/analytics/route.ts
// Auxite Wallet - Analytics Dashboard API (Web + Mobile)

import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

interface AnalyticsEvent {
  id: string;
  event: string;
  userId?: string;
  platform: 'ios' | 'android' | 'web';
  screen?: string;
  data?: Record<string, any>;
  timestamp: string;
  sessionId?: string;
  country?: string;
  deviceInfo?: {
    model?: string;
    os?: string;
    appVersion?: string;
  };
}

interface DailyStats {
  date: string;
  users: number;
  sessions: number;
  trades: number;
  volume: number;
  newUsers: number;
}

const EVENTS_KEY = "auxite:analytics:events";
const DAILY_STATS_KEY = "auxite:analytics:daily";
const REALTIME_KEY = "auxite:analytics:realtime";

// Auth helper
const verifyAuth = (request: NextRequest): boolean => {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  return token === process.env.ADMIN_PASSWORD;
};

// GET - Analytics verilerini getir
export async function GET(request: NextRequest) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "7d";
    const type = searchParams.get("type") || "overview";
    
    // Tarih aralığını hesapla
    const now = new Date();
    let startDate = new Date();
    switch (range) {
      case "24h": startDate.setHours(startDate.getHours() - 24); break;
      case "7d": startDate.setDate(startDate.getDate() - 7); break;
      case "30d": startDate.setDate(startDate.getDate() - 30); break;
      case "90d": startDate.setDate(startDate.getDate() - 90); break;
    }
    
    // Daily stats'ı al
    let dailyStats: DailyStats[] = [];
    try {
      dailyStats = await kv.get<DailyStats[]>(DAILY_STATS_KEY) || [];
    } catch {
      dailyStats = [];
    }
    
    // Tarih aralığına göre filtrele
    const filteredStats = dailyStats.filter(s => new Date(s.date) >= startDate);
    
    // Mock data ile birleştir (gerçek data yoksa)
    if (filteredStats.length === 0) {
      // Demo data oluştur
      const days = range === '24h' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : 90;
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        filteredStats.push({
          date: date.toISOString().split('T')[0],
          users: Math.floor(Math.random() * 500) + 200,
          sessions: Math.floor(Math.random() * 1200) + 500,
          trades: Math.floor(Math.random() * 300) + 100,
          volume: Math.floor(Math.random() * 500000) + 100000,
          newUsers: Math.floor(Math.random() * 50) + 10,
        });
      }
    }
    
    // Toplam değerleri hesapla
    const totals = filteredStats.reduce((acc, day) => ({
      users: acc.users + day.users,
      sessions: acc.sessions + day.sessions,
      trades: acc.trades + day.trades,
      volume: acc.volume + day.volume,
      newUsers: acc.newUsers + day.newUsers,
    }), { users: 0, sessions: 0, trades: 0, volume: 0, newUsers: 0 });
    
    // Overview response
    const overview = {
      totalUsers: 12847 + Math.floor(Math.random() * 100),
      activeUsers24h: filteredStats[filteredStats.length - 1]?.users || 2341,
      activeUsers7d: filteredStats.slice(-7).reduce((sum, d) => sum + d.users, 0),
      activeUsers30d: filteredStats.slice(-30).reduce((sum, d) => sum + d.users, 0),
      newUsers24h: filteredStats[filteredStats.length - 1]?.newUsers || 127,
      newUsers7d: filteredStats.slice(-7).reduce((sum, d) => sum + d.newUsers, 0),
      totalTrades: 156789 + totals.trades,
      trades24h: filteredStats[filteredStats.length - 1]?.trades || 1234,
      trades7d: filteredStats.slice(-7).reduce((sum, d) => sum + d.trades, 0),
      totalVolume: 45678900 + totals.volume,
      volume24h: filteredStats[filteredStats.length - 1]?.volume || 1234567,
      volume7d: filteredStats.slice(-7).reduce((sum, d) => sum + d.volume, 0),
      avgTradeSize: 291,
      conversionRate: 23.5,
    };
    
    // User chart data
    const userChart = {
      labels: filteredStats.map(d => {
        const date = new Date(d.date);
        return `${date.getDate()}/${date.getMonth() + 1}`;
      }),
      datasets: [
        {
          label: "Aktif Kullanıcı",
          data: filteredStats.map(d => d.users),
          color: "#10b981",
        },
        {
          label: "Yeni Kullanıcı",
          data: filteredStats.map(d => d.newUsers),
          color: "#3b82f6",
        },
      ],
    };
    
    // Volume chart data
    const volumeChart = {
      labels: filteredStats.map(d => {
        const date = new Date(d.date);
        return `${date.getDate()}/${date.getMonth() + 1}`;
      }),
      datasets: [
        {
          label: "Hacim ($)",
          data: filteredStats.map(d => d.volume),
          color: "#f59e0b",
        },
        {
          label: "İşlem Sayısı",
          data: filteredStats.map(d => d.trades * 1000), // Scale for visibility
          color: "#8b5cf6",
        },
      ],
    };
    
    // Top assets
    const topAssets = [
      { symbol: 'AUXG', name: 'Altın', volume: 2345678 + Math.floor(Math.random() * 100000), trades: 4567, change: 12.5 - Math.random() * 5 },
      { symbol: 'AUXS', name: 'Gümüş', volume: 1234567 + Math.floor(Math.random() * 50000), trades: 2345, change: -3.2 + Math.random() * 2 },
      { symbol: 'AUXPT', name: 'Platin', volume: 567890 + Math.floor(Math.random() * 20000), trades: 890, change: 5.7 - Math.random() * 3 },
      { symbol: 'AUXPD', name: 'Paladyum', volume: 234567 + Math.floor(Math.random() * 10000), trades: 456, change: -1.2 + Math.random() * 2 },
    ];
    
    // User segments
    const userSegments = [
      { name: 'Aktif Trader', count: 3421, percentage: 26.6, color: '#10b981' },
      { name: 'Casual', count: 5234, percentage: 40.7, color: '#3b82f6' },
      { name: 'HODLer', count: 2891, percentage: 22.5, color: '#f59e0b' },
      { name: 'Yeni', count: 1301, percentage: 10.2, color: '#8b5cf6' },
    ];
    
    // Platform stats
    const platformStats = [
      { platform: 'ios', users: 5234, sessions: 12456, avgSessionDuration: 8.5, bounceRate: 23.4 },
      { platform: 'android', users: 4892, sessions: 10234, avgSessionDuration: 7.2, bounceRate: 28.1 },
      { platform: 'web', users: 2721, sessions: 6789, avgSessionDuration: 12.3, bounceRate: 18.7 },
    ];
    
    // Geo stats
    const geoStats = [
      { country: 'Türkiye', code: 'TR', users: 8234, percentage: 64.1 },
      { country: 'Almanya', code: 'DE', users: 1892, percentage: 14.7 },
      { country: 'ABD', code: 'US', users: 1234, percentage: 9.6 },
      { country: 'İngiltere', code: 'GB', users: 892, percentage: 6.9 },
      { country: 'Diğer', code: 'XX', users: 595, percentage: 4.7 },
    ];
    
    // Hourly activity (for 24h view)
    const hourlyActivity = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      users: Math.floor(Math.random() * 200) + 50,
      trades: Math.floor(Math.random() * 50) + 10,
    }));
    
    // Realtime data
    const realtime = {
      activeNow: Math.floor(Math.random() * 300) + 100,
      tradesLastHour: Math.floor(Math.random() * 50) + 20,
      volumeLastHour: Math.floor(Math.random() * 100000) + 50000,
    };
    
    return NextResponse.json({
      success: true,
      range,
      overview,
      userChart,
      volumeChart,
      topAssets,
      userSegments,
      platformStats,
      geoStats,
      hourlyActivity,
      realtime,
      dailyStats: filteredStats,
      generatedAt: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error("Analytics GET error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

// POST - Event tracking (mobile/web'den çağrılır)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, userId, platform, screen, data, sessionId, country, deviceInfo } = body;
    
    if (!event || !platform) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    const analyticsEvent: AnalyticsEvent = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      event,
      userId,
      platform,
      screen,
      data,
      timestamp: new Date().toISOString(),
      sessionId,
      country,
      deviceInfo,
    };
    
    // Events listesine ekle (son 10000 event tut)
    try {
      let events: AnalyticsEvent[] = await kv.get<AnalyticsEvent[]>(EVENTS_KEY) || [];
      events.push(analyticsEvent);
      if (events.length > 10000) {
        events = events.slice(-10000);
      }
      await kv.set(EVENTS_KEY, events);
    } catch (e) {
      console.error("Failed to save event:", e);
    }
    
    // Daily stats güncelle
    const today = new Date().toISOString().split('T')[0];
    try {
      let dailyStats: DailyStats[] = await kv.get<DailyStats[]>(DAILY_STATS_KEY) || [];
      let todayStats = dailyStats.find(d => d.date === today);
      
      if (!todayStats) {
        todayStats = { date: today, users: 0, sessions: 0, trades: 0, volume: 0, newUsers: 0 };
        dailyStats.push(todayStats);
      }
      
      // Event tipine göre güncelle
      if (event === 'session_start') {
        todayStats.sessions += 1;
      } else if (event === 'trade_complete') {
        todayStats.trades += 1;
        todayStats.volume += data?.amount || 0;
      } else if (event === 'signup') {
        todayStats.newUsers += 1;
      }
      
      // Son 90 günü tut
      if (dailyStats.length > 90) {
        dailyStats = dailyStats.slice(-90);
      }
      
      await kv.set(DAILY_STATS_KEY, dailyStats);
    } catch (e) {
      console.error("Failed to update daily stats:", e);
    }
    
    return NextResponse.json({
      success: true,
      eventId: analyticsEvent.id,
    });
    
  } catch (error) {
    console.error("Analytics POST error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({});
}
