// src/app/api/oracle/route.ts
// Oracle Price Updater API - Cron job ile çağrılır
import { NextRequest, NextResponse } from 'next/server';
import { updateOraclePrices, getOraclePrices } from '@/lib/oracle-updater';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 saniye timeout

// GET - Vercel cron'dan çağrılır, fiyatları günceller
export async function GET(request: NextRequest) {
  try {
    const isVercelCron = request.headers.get('x-vercel-cron') === '1';

    // Cron veya auth ile güncelleme yap
    if (isVercelCron) {
      console.log('🔄 Cron: Starting Oracle price update...');
      const result = await updateOraclePrices();

      if (result.success) {
        console.log('✅ Cron: Oracle updated successfully');
        return NextResponse.json({
          success: true,
          message: 'Oracle prices updated via cron',
          txHashes: result.txHashes,
          prices: result.prices,
          timestamp: new Date().toISOString(),
        });
      } else {
        console.error('❌ Cron: Oracle update failed:', result.error);
        return NextResponse.json({
          success: false,
          error: result.error,
        }, { status: 500 });
      }
    }

    // Normal GET - sadece oku
    const prices = await getOraclePrices();

    return NextResponse.json({
      success: true,
      prices,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Oracle GET error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

// POST - Oracle fiyatlarını güncelle (Cron job veya manual)
export async function POST(request: NextRequest) {
  try {
    // Vercel cron'dan gelen istek mi kontrol et
    const isVercelCron = request.headers.get('x-vercel-cron') === '1';
    
    // CRON_SECRET tanımlıysa auth kontrolü yap
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && !isVercelCron) {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    // CRON_SECRET yoksa herkes çağırabilir (development mode)

    console.log('🔄 Starting Oracle price update...');
    
    const result = await updateOraclePrices();
    
    if (result.success) {
      console.log('✅ Oracle updated successfully');
      return NextResponse.json({
        success: true,
        message: 'Oracle prices updated',
        txHashes: result.txHashes,
        prices: result.prices,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.error('❌ Oracle update failed:', result.error);
      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Oracle POST error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
