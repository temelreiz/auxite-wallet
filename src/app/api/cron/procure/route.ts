// ============================================
// CRON: PROCUREMENT PIPELINE
// ============================================
// Processes pending procurement orders:
//   1. Convert crypto → USDT (Binance)
//   2. Buy metal from KuveytTürk
//   3. Close hedges
//
// Schedule: Every 5 minutes (Vercel cron or external trigger)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { processProcurementQueue } from '@/lib/procurement-pipeline';
import { getProcurementStats } from '@/lib/procurement-service';

export const maxDuration = 60;

// Cron secret for authorization
const CRON_SECRET = process.env.CRON_SECRET || '';

export async function GET(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get('authorization');
  const cronSecret = request.nextUrl.searchParams.get('secret');

  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}` && cronSecret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('🔄 Procurement cron triggered');

    const result = await processProcurementQueue();

    // Get current stats
    const stats = await getProcurementStats();

    return NextResponse.json({
      success: true,
      result,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Procurement cron error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// POST: Manual trigger with options
export async function POST(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { metal } = body;

    let result;
    if (metal) {
      // Process specific metal
      const { processMetalProcurement } = await import('@/lib/procurement-pipeline');
      result = await processMetalProcurement(metal);
    } else {
      result = await processProcurementQueue();
    }

    const stats = await getProcurementStats();

    return NextResponse.json({
      success: true,
      result,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Procurement manual trigger error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
