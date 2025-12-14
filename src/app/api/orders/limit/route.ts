// src/app/api/orders/limit/route.ts
// Limit Order API - Create, List, Cancel orders

import { NextRequest, NextResponse } from 'next/server';
import { 
  createLimitOrder, 
  getUserLimitOrders, 
  cancelLimitOrder,
  getLimitOrder,
  type CreateOrderParams 
} from '@/lib/limit-orders';

// ═══════════════════════════════════════════════════════════════════════════════
// GET - List user's limit orders
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const status = searchParams.get('status') as 'pending' | 'filled' | 'cancelled' | 'expired' | null;
    const orderId = searchParams.get('orderId');
    
    // Get single order by ID
    if (orderId) {
      const order = await getLimitOrder(orderId);
      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, order });
    }
    
    // Get user's orders
    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }
    
    const orders = await getUserLimitOrders(address, status || undefined);
    
    return NextResponse.json({
      success: true,
      orders,
      count: orders.length,
    });
    
  } catch (error: any) {
    console.error('GET /api/orders/limit error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get orders' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST - Create new limit order
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { 
      address, 
      type, 
      metal, 
      grams, 
      limitPrice, 
      paymentMethod = 'AUXM',
      expiresInDays = 7 
    } = body;
    
    // Validation
    if (!address) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }
    if (!type || !['buy', 'sell'].includes(type)) {
      return NextResponse.json({ error: 'Invalid order type. Use "buy" or "sell"' }, { status: 400 });
    }
    if (!metal || !['AUXG', 'AUXS', 'AUXPT', 'AUXPD'].includes(metal.toUpperCase())) {
      return NextResponse.json({ error: 'Invalid metal. Use AUXG, AUXS, AUXPT, or AUXPD' }, { status: 400 });
    }
    if (!grams || grams <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }
    if (!limitPrice || limitPrice <= 0) {
      return NextResponse.json({ error: 'Invalid limit price' }, { status: 400 });
    }
    if (!['AUXM', 'USDT', 'USD'].includes(paymentMethod.toUpperCase())) {
      return NextResponse.json({ error: 'Invalid payment method. Use AUXM, USDT, or USD' }, { status: 400 });
    }
    
    const params: CreateOrderParams = {
      address,
      type: type as 'buy' | 'sell',
      metal: metal.toUpperCase() as 'AUXG' | 'AUXS' | 'AUXPT' | 'AUXPD',
      grams: parseFloat(grams),
      limitPrice: parseFloat(limitPrice),
      paymentMethod: paymentMethod.toUpperCase() as 'AUXM' | 'USDT' | 'USD',
      expiresInDays: parseInt(expiresInDays) || 7,
    };
    
    const result = await createLimitOrder(params);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      order: result.order,
      message: `Limit ${type} order created: ${grams}g ${metal} @ $${limitPrice}/g`,
    });
    
  } catch (error: any) {
    console.error('POST /api/orders/limit error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE - Cancel limit order
// ═══════════════════════════════════════════════════════════════════════════════

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, address } = body;
    
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 });
    }
    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }
    
    const result = await cancelLimitOrder(orderId, address);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Order cancelled successfully',
    });
    
  } catch (error: any) {
    console.error('DELETE /api/orders/limit error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel order' },
      { status: 500 }
    );
  }
}
