import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const adminKey = request.headers.get('x-admin-key') || 
                     request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (adminKey !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7d';

    // Get user count
    const userKeys = await redis.keys('user:*:meta');
    const totalUsers = userKeys.length;

    // Get trade count
    const tradeKeys = await redis.keys('trade:*');
    const totalTrades = tradeKeys.length;

    // Get recent activity
    const now = Date.now();
    const ranges: Record<string, number> = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
    };
    const rangeMs = ranges[range] || ranges['7d'];

    // Mock data for charts (replace with real data aggregation)
    const days = range === '24h' ? 24 : range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const labels = [];
    const usersData = [];
    const tradesData = [];
    const volumeData = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now - i * (range === '24h' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000));
      labels.push(range === '24h' 
        ? date.toLocaleTimeString('tr-TR', { hour: '2-digit' })
        : date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
      );
      // Mock random data - replace with real aggregation
      usersData.push(Math.floor(Math.random() * 10) + totalUsers / days);
      tradesData.push(Math.floor(Math.random() * 50));
      volumeData.push(Math.floor(Math.random() * 10000));
    }

    return NextResponse.json({
      success: true,
      overview: {
        totalUsers,
        activeUsers24h: Math.floor(totalUsers * 0.1),
        activeUsers7d: Math.floor(totalUsers * 0.3),
        activeUsers30d: Math.floor(totalUsers * 0.5),
        newUsers24h: Math.floor(Math.random() * 5),
        newUsers7d: Math.floor(Math.random() * 20),
        totalTrades,
        trades24h: Math.floor(Math.random() * 50),
        trades7d: Math.floor(Math.random() * 200),
        totalVolume: Math.floor(Math.random() * 1000000),
        volume24h: Math.floor(Math.random() * 50000),
        volume7d: Math.floor(Math.random() * 200000),
        avgTradeSize: Math.floor(Math.random() * 1000) + 100,
        conversionRate: Math.random() * 10 + 5,
      },
      charts: {
        users: { labels, datasets: [{ label: 'Kullanıcılar', data: usersData, color: '#10b981' }] },
        trades: { labels, datasets: [{ label: 'İşlemler', data: tradesData, color: '#3b82f6' }] },
        volume: { labels, datasets: [{ label: 'Hacim ($)', data: volumeData, color: '#f59e0b' }] },
      },
      range,
    });
  } catch (error: any) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
