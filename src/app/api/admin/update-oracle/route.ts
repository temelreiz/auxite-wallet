// API to trigger oracle price update
import { NextRequest, NextResponse } from 'next/server';
import { updateOraclePrices, fetchMetalPrices, getOraclePrices } from '@/lib/oracle-updater';

// GET - Check current prices
// GET - Check current oracle prices (no GoldAPI call)
export async function GET() {
  try {
    const oraclePrices = await getOraclePrices();
    
    return NextResponse.json({
      oracle: oraclePrices,
      timestamp: new Date().toISOString(),
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
