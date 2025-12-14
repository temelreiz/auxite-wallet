// API to trigger oracle price update
import { NextRequest, NextResponse } from 'next/server';
import { updateOraclePrices, fetchMetalPrices, getOraclePrices } from '@/lib/oracle-updater';

// GET - Check current prices
export async function GET() {
  try {
    const [apiPrices, oraclePrices] = await Promise.all([
      fetchMetalPrices(),
      getOraclePrices(),
    ]);

    return NextResponse.json({
      api: {
        gold: (apiPrices.gold / 31.1035).toFixed(2),
        silver: (apiPrices.silver / 31.1035).toFixed(2),
        platinum: (apiPrices.platinum / 31.1035).toFixed(2),
        palladium: (apiPrices.palladium / 31.1035).toFixed(2),
      },
      oracle: oraclePrices,
      needsUpdate: Math.abs(apiPrices.gold / 31.1035 - oraclePrices.gold) > 1,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Update oracle prices
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await updateOraclePrices();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Oracle prices updated',
        txHashes: result.txHashes,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
