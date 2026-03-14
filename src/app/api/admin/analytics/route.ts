import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { requireAdmin } from '@/lib/admin-auth';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.authorized) return auth.response!;

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7d';

    const now = Date.now();
    const ranges: Record<string, number> = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
    };
    const rangeMs = ranges[range] || ranges['7d'];
    const cutoff = now - rangeMs;

    // ─── Real user count from platform counter + user keys ───
    const [platformUserCount, userKeys] = await Promise.all([
      redis.get('stats:total:users'),
      redis.keys('user:0x*:balance'),
    ]);
    const totalUsers = Number(platformUserCount) || userKeys.length;

    // ─── Real trade count from platform counter ───
    const [totalTradesRaw, platformVolume] = await Promise.all([
      redis.get('stats:total:trades'),
      redis.get('stats:total:volume'),
    ]);
    const totalTrades = Number(totalTradesRaw) || 0;
    const totalVolume = Number(platformVolume) || 0;

    // ─── Real daily stats from Redis time-series keys ───
    // stats:daily:{YYYY-MM-DD}:users, stats:daily:{YYYY-MM-DD}:trades, stats:daily:{YYYY-MM-DD}:volume
    const days = range === '24h' ? 24 : range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const labels: string[] = [];
    const usersData: number[] = [];
    const tradesData: number[] = [];
    const volumeData: number[] = [];

    let activeUsers24h = 0;
    let activeUsers7d = 0;
    let newUsers24h = 0;
    let newUsers7d = 0;
    let trades24h = 0;
    let trades7d = 0;
    let volume24h = 0;
    let volume7d = 0;

    // Pipeline daily stats reads
    const pipeline = redis.pipeline();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now - i * (range === '24h' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000));
      const dateKey = range === '24h'
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}:${String(date.getHours()).padStart(2, '0')}`
        : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      labels.push(range === '24h'
        ? date.toLocaleTimeString('tr-TR', { hour: '2-digit' })
        : date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
      );

      pipeline.get(`stats:daily:${dateKey}:users`);
      pipeline.get(`stats:daily:${dateKey}:trades`);
      pipeline.get(`stats:daily:${dateKey}:volume`);
    }

    const pipelineResults = await pipeline.exec();

    for (let i = 0; i < days; i++) {
      const dayUsers = Number(pipelineResults[i * 3] || 0);
      const dayTrades = Number(pipelineResults[i * 3 + 1] || 0);
      const dayVolume = Number(pipelineResults[i * 3 + 2] || 0);

      usersData.push(dayUsers);
      tradesData.push(dayTrades);
      volumeData.push(dayVolume);

      // Accumulate period totals
      const daysAgo = days - 1 - i;
      if (daysAgo === 0) {
        activeUsers24h = dayUsers;
        trades24h = dayTrades;
        volume24h = dayVolume;
        newUsers24h = dayUsers;
      }
      if (daysAgo < 7) {
        activeUsers7d += dayUsers;
        trades7d += dayTrades;
        volume7d += dayVolume;
        newUsers7d += dayUsers;
      }
    }

    // ─── Fee totals ───
    const feeTokens = ['auxg', 'auxs', 'auxpt', 'auxpd', 'eth', 'btc', 'auxm'];
    const feePipeline = redis.pipeline();
    for (const token of feeTokens) {
      feePipeline.hgetall(`platform:fees:${token}`);
    }
    const feeResults = await feePipeline.exec();
    const fees: Record<string, any> = {};
    feeTokens.forEach((token, idx) => {
      const data = feeResults[idx] as Record<string, string> | null;
      if (data && Object.keys(data).length > 0) {
        fees[token] = {
          total: parseFloat(data.total || '0'),
          count: parseInt(data.count || '0'),
        };
      }
    });

    return NextResponse.json({
      success: true,
      overview: {
        totalUsers,
        activeUsers24h,
        activeUsers7d,
        activeUsers30d: totalUsers, // fallback
        newUsers24h,
        newUsers7d,
        totalTrades,
        trades24h,
        trades7d,
        totalVolume,
        volume24h,
        volume7d,
        avgTradeSize: totalTrades > 0 ? Math.round(totalVolume / totalTrades) : 0,
        conversionRate: totalUsers > 0 ? ((totalTrades / totalUsers) * 100).toFixed(1) : '0',
      },
      charts: {
        users: { labels, datasets: [{ label: 'Kullanıcılar', data: usersData, color: '#10b981' }] },
        trades: { labels, datasets: [{ label: 'İşlemler', data: tradesData, color: '#3b82f6' }] },
        volume: { labels, datasets: [{ label: 'Hacim ($)', data: volumeData, color: '#f59e0b' }] },
      },
      fees,
      range,
    });
  } catch (error: any) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
