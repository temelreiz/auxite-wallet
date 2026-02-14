// ============================================
// T+1 SETTLEMENT CRON
// Auto-completes settlements older than 24 hours
// Triggered by Vercel cron or manual admin call
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { completeSettlement, getSettlementOrder } from '@/lib/settlement-service';
import { sendEmail } from '@/lib/email';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'physicalredemption@auxite.io';
const T1_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function POST(request: NextRequest) {
  try {
    // Auth: Vercel cron header or bearer token
    const cronHeader = request.headers.get('x-vercel-cron');
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronHeader && token !== cronSecret && token !== (process.env.ADMIN_TOKEN || 'auxite-admin-2024')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get pending orders
    const pendingIds = await redis.lrange('settlement:orders:pending', 0, 99);

    let completed = 0;
    let skipped = 0;
    let errors = 0;
    const results: any[] = [];

    for (const orderId of pendingIds) {
      try {
        const order = await getSettlementOrder(orderId as string);
        if (!order) {
          // Remove stale ID from pending
          await redis.lrem('settlement:orders:pending', 1, orderId as string);
          skipped++;
          continue;
        }

        // Already completed or failed
        if (order.status === 'completed' || order.status === 'failed') {
          await redis.lrem('settlement:orders:pending', 1, orderId as string);
          skipped++;
          continue;
        }

        // Check if T+1 has elapsed
        if (Date.now() - order.createdAt < T1_MS) {
          skipped++;
          results.push({ id: orderId, status: 'waiting', hoursLeft: ((T1_MS - (Date.now() - order.createdAt)) / 3600000).toFixed(1) });
          continue;
        }

        // Complete the settlement
        const completedOrder = await completeSettlement(orderId as string);
        await redis.lrem('settlement:orders:pending', 1, orderId as string);
        completed++;
        results.push({ id: orderId, status: 'completed', amount: completedOrder.totalSettlementUSD });

      } catch (err: any) {
        errors++;
        results.push({ id: orderId, status: 'error', message: err.message });
      }
    }

    // Log summary
    if (completed > 0) {
      console.log(`✅ T+1 Cron: ${completed} settlements completed, ${skipped} skipped, ${errors} errors`);
    }

    return NextResponse.json({
      success: true,
      summary: { completed, skipped, errors, totalPending: pendingIds.length },
      results,
    });
  } catch (error: any) {
    console.error('Settlement cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
