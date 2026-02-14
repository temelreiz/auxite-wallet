// ============================================
// ADMIN SETTLEMENT API
// Spread overrides, feature flags, pending orders
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { getSettlementSpreadConfig, setSettlementSpreadConfig } from '@/lib/settlement-spread';
import { getSettlementConfig, getPendingOrders } from '@/lib/settlement-service';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'auxite-admin-2024';

function checkAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  return token === ADMIN_TOKEN;
}

// ── GET: Full settlement dashboard data ──
export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const config = await getSettlementConfig();
  const spreadConfig = await getSettlementSpreadConfig();
  const pendingOrders = await getPendingOrders(50);

  // Get all orders for history
  const allOrderIds = await redis.lrange('settlement:orders:all', 0, 29);
  const recentOrders: any[] = [];
  for (const id of allOrderIds) {
    const data = await redis.get(`settlement:order:${id}`);
    if (data) {
      recentOrders.push(typeof data === 'string' ? JSON.parse(data) : data);
    }
  }

  return NextResponse.json({
    success: true,
    config,
    spreadConfig,
    pendingOrders,
    recentOrders,
  });
}

// ── POST: Update config, flags, spread ──
export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { action, ...data } = await request.json();

    switch (action) {
      case 'toggle_enabled': {
        const current = await redis.get('config:cash_settlement_enabled');
        const newVal = current === 'true' || current === true ? 'false' : 'true';
        await redis.set('config:cash_settlement_enabled', newVal);
        return NextResponse.json({ success: true, enabled: newVal === 'true' });
      }

      case 'toggle_rail': {
        const { rail } = data;
        if (!rail) return NextResponse.json({ error: 'Missing rail' }, { status: 400 });
        const key = `config:settlement:rail:${rail}`;
        const current = await redis.get(key);
        const newVal = current === 'true' || current === true || current === null ? 'false' : 'true';
        await redis.set(key, newVal);
        return NextResponse.json({ success: true, rail, enabled: newVal === 'true' });
      }

      case 'set_spread': {
        const { spreads } = data;
        if (!spreads) return NextResponse.json({ error: 'Missing spreads' }, { status: 400 });
        await setSettlementSpreadConfig(spreads);
        return NextResponse.json({ success: true, spreads: await getSettlementSpreadConfig() });
      }

      case 'set_daily_cap': {
        const { cap } = data;
        if (!cap || cap <= 0) return NextResponse.json({ error: 'Invalid cap' }, { status: 400 });
        await redis.set('config:settlement:daily_cap_usd', cap.toString());
        return NextResponse.json({ success: true, dailyCap: cap });
      }

      case 'set_quote_ttl': {
        const { ttl } = data;
        if (!ttl || ttl < 30 || ttl > 300) return NextResponse.json({ error: 'TTL must be 30-300 seconds' }, { status: 400 });
        await redis.set('config:settlement:quote_ttl', ttl.toString());
        return NextResponse.json({ success: true, quoteTTL: ttl });
      }

      case 'emergency_freeze': {
        await redis.set('config:cash_settlement_enabled', 'false');
        // Log the freeze
        const logEntry = {
          id: `tlog_${Date.now()}`,
          type: 'emergency',
          message: 'EMERGENCY FREEZE: Cash settlement disabled by admin',
          amount: 0,
          token: 'SYSTEM',
          operator: 'admin',
          timestamp: Date.now(),
          date: new Date().toISOString(),
        };
        await redis.lpush('treasury:log', JSON.stringify(logEntry));
        return NextResponse.json({ success: true, message: 'Cash settlement frozen' });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
