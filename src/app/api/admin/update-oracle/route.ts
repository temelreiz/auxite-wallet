// API to trigger oracle price update
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { updateOraclePrices, getOraclePrices } from '@/lib/oracle-updater';

// GET - Check current oracle prices (no GoldAPI call)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.authorized) return auth.response!;

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
    const auth = await requireAdmin(request);
    if (!auth.authorized) return auth.response!;

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
