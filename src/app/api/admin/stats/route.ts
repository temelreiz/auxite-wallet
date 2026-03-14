// src/app/api/admin/stats/route.ts
// Admin Dashboard Statistics API

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { requireAdmin } from '@/lib/admin-auth';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// GET - Dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.authorized) return auth.response!;

    // Stats hesaplama
    let totalUsers = 0;
    let totalTrades = 0;
    let totalVolume = 0;
    let pendingWithdraws = 0;
    let pendingKYC = 0;
    let activeAlerts = 0;

    try {
      // Toplam kullanıcı sayısı — auth:user:* (kayıtlı) + user:0x*:balance (bakiyeli)
      const authUserKeys = await redis.keys('auth:user:*');
      const balanceUserKeys = await redis.keys('user:0x*:balance');
      // Unique adresler: auth kullanıcılardan wallet adreslerini al
      const addressSet = new Set<string>();
      for (const key of authUserKeys) {
        try {
          const userData = await redis.hgetall(key);
          const addr = ((userData?.walletAddress as string) || '').toLowerCase().trim();
          if (addr) addressSet.add(addr);
        } catch { /* skip */ }
      }
      for (const key of balanceUserKeys) {
        const addr = key.split(':')[1];
        if (addr) addressSet.add(addr);
      }
      totalUsers = addressSet.size;

      // KYC bekleyenler — user:0x*:info'dan kycStatus kontrol
      const infoKeys = await redis.keys('user:0x*:info');
      for (const key of infoKeys) {
        try {
          const info = await redis.hgetall(key);
          if (info && (info as any).kycStatus === 'pending') {
            pendingKYC++;
          }
        } catch { /* skip */ }
      }

      // Toplam trade sayısı — tüm kullanıcıların işlem listelerini say
      const tradeCountStr = await redis.get('stats:total:trades');
      totalTrades = tradeCountStr ? parseInt(tradeCountStr as string) : 0;
      // Alternatif: bireysel transaction listelerinden hesapla
      if (totalTrades === 0) {
        const txKeys = await redis.keys('user:0x*:transactions');
        for (const txKey of txKeys) {
          const len = await redis.llen(txKey);
          totalTrades += len;
        }
      }

      // Toplam hacim
      const volumeStr = await redis.get('stats:total:volume');
      totalVolume = volumeStr ? parseFloat(volumeStr as string) : 0;

      // Bekleyen çekimler
      const withdrawKeys = await redis.keys('withdraw:pending:*');
      pendingWithdraws = withdrawKeys.length;
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
            if (data.active) activeAlerts++;
          }
        } catch { /* skip */ }
      }
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
