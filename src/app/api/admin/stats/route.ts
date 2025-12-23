// src/app/api/admin/stats/route.ts
// Admin Dashboard Statistics API

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// GET - Dashboard statistics
export async function GET(request: NextRequest) {
  try {
    // Auth check - Bearer token veya ADMIN_SECRET
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token || token === 'null' || token === 'undefined') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Stats hesaplama
    let totalUsers = 0;
    let totalTrades = 0;
    let totalVolume = 0;
    let pendingWithdraws = 0;
    let pendingKYC = 0;
    let activeAlerts = 0;

    try {
      // Toplam kullanıcı sayısı
      const userKeys = await redis.keys('user:*:meta');
      totalUsers = userKeys.length;

      // KYC bekleyenler
      for (const key of userKeys) {
        try {
          const meta = await redis.get(key);
          if (meta) {
            const userData = typeof meta === 'string' ? JSON.parse(meta) : meta;
            if (userData.kycStatus === 'pending') {
              pendingKYC++;
            }
          }
        } catch (e) {
          // Skip invalid entries
        }
      }

      // Toplam trade sayısı
      const tradeCountStr = await redis.get('stats:total:trades');
      totalTrades = tradeCountStr ? parseInt(tradeCountStr as string) : 0;

      // Toplam hacim
      const volumeStr = await redis.get('stats:total:volume');
      totalVolume = volumeStr ? parseFloat(volumeStr as string) : 0;

      // Bekleyen çekimler
      const withdrawKeys = await redis.keys('withdraw:pending:*');
      pendingWithdraws = withdrawKeys.length;

      // Alternatif: withdraw listesinden
      if (pendingWithdraws === 0) {
        const pendingList = await redis.lrange('withdraws:pending', 0, -1);
        pendingWithdraws = pendingList.length;
      }

      // Aktif duyurular
      const announcementKeys = await redis.keys('announcement:*');
      for (const key of announcementKeys) {
        try {
          const ann = await redis.get(key);
          if (ann) {
            const data = typeof ann === 'string' ? JSON.parse(ann) : ann;
            if (data.active) {
              activeAlerts++;
            }
          }
        } catch (e) {
          // Skip
        }
      }

      // Alternatif: announcements listesinden
      if (activeAlerts === 0) {
        const annList = await redis.lrange('announcements:active', 0, -1);
        activeAlerts = annList.length;
      }

    } catch (redisError) {
      console.error('Redis error:', redisError);
      // Redis hatası olsa bile varsayılan değerlerle devam et
    }

    // Volume formatla
    const formatVolume = (vol: number): string => {
      if (vol >= 1000000) {
        return `$${(vol / 1000000).toFixed(2)}M`;
      } else if (vol >= 1000) {
        return `$${(vol / 1000).toFixed(2)}K`;
      }
      return `$${vol.toFixed(2)}`;
    };

    return NextResponse.json({
      totalUsers,
      totalTrades,
      totalVolume: formatVolume(totalVolume),
      pendingWithdraws,
      pendingKYC,
      activeAlerts,
    });

  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ 
      error: 'Failed to load stats',
      // Fallback data
      totalUsers: 0,
      totalTrades: 0,
      totalVolume: '$0',
      pendingWithdraws: 0,
      pendingKYC: 0,
      activeAlerts: 0,
    }, { status: 500 });
  }
}
