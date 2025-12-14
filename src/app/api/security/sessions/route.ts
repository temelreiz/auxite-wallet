// app/api/security/sessions/route.ts
// Session Management - Aktif oturumlar yönetimi

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

const redis = Redis.fromEnv();

interface Session {
  id: string;
  walletAddress: string;
  deviceInfo: {
    browser: string;
    os: string;
    device: string;
  };
  ip: string;
  location?: string;
  createdAt: number;
  lastActiveAt: number;
  isCurrent: boolean;
}

// User-Agent parse helper
function parseUserAgent(ua: string): { browser: string; os: string; device: string } {
  let browser = "Unknown";
  let os = "Unknown";
  let device = "Desktop";

  // Browser detection
  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";
  else if (ua.includes("Opera")) browser = "Opera";

  // OS detection
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  // Device detection
  if (ua.includes("Mobile") || ua.includes("Android") || ua.includes("iPhone")) {
    device = "Mobile";
  } else if (ua.includes("iPad") || ua.includes("Tablet")) {
    device = "Tablet";
  }

  return { browser, os, device };
}

// GET - Kullanıcının aktif oturumlarını getir
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("address");

    if (!walletAddress) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    const key = `sessions:${walletAddress.toLowerCase()}`;
    const sessions = await redis.lrange(key, 0, -1) as Session[];

    // Mevcut session'ı işaretle
    const headersList = headers();
    const currentIp = headersList.get("x-forwarded-for")?.split(",")[0] || "unknown";
    
    const sessionsWithCurrent = (sessions || []).map((s) => ({
      ...s,
      isCurrent: s.ip === currentIp,
    }));

    // Son aktiviteye göre sırala
    sessionsWithCurrent.sort((a, b) => b.lastActiveAt - a.lastActiveAt);

    return NextResponse.json({
      sessions: sessionsWithCurrent,
      count: sessionsWithCurrent.length,
    });
  } catch (error: any) {
    console.error("Sessions GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Yeni oturum oluştur (login sırasında çağrılır)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json({ error: "walletAddress required" }, { status: 400 });
    }

    const headersList = headers();
    const userAgent = headersList.get("user-agent") || "";
    const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "unknown";

    const deviceInfo = parseUserAgent(userAgent);

    const session: Session = {
      id: `SES_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      walletAddress: walletAddress.toLowerCase(),
      deviceInfo,
      ip,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      isCurrent: true,
    };

    const key = `sessions:${walletAddress.toLowerCase()}`;
    
    // Mevcut oturumları al
    const existingSessions = await redis.lrange(key, 0, -1) as Session[];
    
    // Aynı IP'den eski session varsa güncelle, yoksa ekle
    const sameIpSession = existingSessions?.find((s) => s.ip === ip);
    
    if (sameIpSession) {
      // Mevcut session'ı güncelle
      const updatedSessions = existingSessions.map((s) =>
        s.ip === ip ? { ...s, lastActiveAt: Date.now(), deviceInfo } : s
      );
      await redis.del(key);
      for (const s of updatedSessions) {
        await redis.rpush(key, JSON.stringify(s));
      }
      
      return NextResponse.json({
        success: true,
        session: { ...sameIpSession, lastActiveAt: Date.now() },
        isNew: false,
      });
    }

    // Yeni session ekle (max 10)
    if (existingSessions && existingSessions.length >= 10) {
      // En eski session'ı sil
      await redis.lpop(key);
    }

    await redis.rpush(key, JSON.stringify(session));

    // Login notification gönder
    const notifKey = `notifications:${walletAddress.toLowerCase()}`;
    await redis.lpush(notifKey, JSON.stringify({
      id: `NOTIF_${Date.now()}`,
      type: "security",
      title: "New Login Detected",
      message: `New login from ${deviceInfo.browser} on ${deviceInfo.os} (${ip})`,
      createdAt: Date.now(),
      read: false,
    }));

    return NextResponse.json({
      success: true,
      session,
      isNew: true,
    });
  } catch (error: any) {
    console.error("Sessions POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Oturumu sonlandır
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, sessionId, terminateAll } = body;

    if (!walletAddress) {
      return NextResponse.json({ error: "walletAddress required" }, { status: 400 });
    }

    const key = `sessions:${walletAddress.toLowerCase()}`;

    if (terminateAll) {
      // Tüm oturumları sonlandır (mevcut hariç)
      const headersList = headers();
      const currentIp = headersList.get("x-forwarded-for")?.split(",")[0] || "unknown";
      
      const sessions = await redis.lrange(key, 0, -1) as Session[];
      const currentSession = sessions?.find((s) => s.ip === currentIp);
      
      await redis.del(key);
      
      if (currentSession) {
        await redis.rpush(key, JSON.stringify(currentSession));
      }

      return NextResponse.json({
        success: true,
        message: "All other sessions terminated",
        terminatedCount: (sessions?.length || 1) - 1,
      });
    }

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const sessions = await redis.lrange(key, 0, -1) as Session[];
    const sessionToRemove = sessions?.find((s) => s.id === sessionId);

    if (!sessionToRemove) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Session'ı sil
    const updatedSessions = sessions.filter((s) => s.id !== sessionId);
    await redis.del(key);
    
    for (const s of updatedSessions) {
      await redis.rpush(key, JSON.stringify(s));
    }

    return NextResponse.json({
      success: true,
      message: "Session terminated",
    });
  } catch (error: any) {
    console.error("Sessions DELETE error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Session'ı güncelle (activity update)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json({ error: "walletAddress required" }, { status: 400 });
    }

    const headersList = headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "unknown";

    const key = `sessions:${walletAddress.toLowerCase()}`;
    const sessions = await redis.lrange(key, 0, -1) as Session[];

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ error: "No sessions found" }, { status: 404 });
    }

    // Mevcut IP'nin session'ını güncelle
    const updatedSessions = sessions.map((s) =>
      s.ip === ip ? { ...s, lastActiveAt: Date.now() } : s
    );

    await redis.del(key);
    for (const s of updatedSessions) {
      await redis.rpush(key, JSON.stringify(s));
    }

    return NextResponse.json({
      success: true,
      message: "Session activity updated",
    });
  } catch (error: any) {
    console.error("Sessions PATCH error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
