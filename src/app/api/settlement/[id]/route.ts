// Settlement Order Status by ID
import { NextRequest, NextResponse } from 'next/server';
import { getSettlementOrder } from '@/lib/settlement-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const order = await getSettlementOrder(params.id);
    if (!order) {
      return NextResponse.json({ error: 'Settlement order not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        metal: order.metal,
        grams: order.grams,
        spotPricePerGram: order.spotPricePerGram,
        exitSpreadPercent: order.exitSpreadPercent,
        settlementPricePerGram: order.settlementPricePerGram,
        totalSettlementUSD: order.totalSettlementUSD,
        settlementRail: order.settlementRail,
        status: order.status,
        statusHistory: order.statusHistory,
        proceedsCredited: order.proceedsCredited,
        createdAt: order.createdAt,
        settledAt: order.settledAt,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
