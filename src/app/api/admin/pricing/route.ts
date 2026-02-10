// Admin Pricing Engine Configuration API v3
import { NextRequest, NextResponse } from 'next/server';
import {
  getPricingConfig,
  setPricingConfig,
  setVolatilityMode,
  setMarketHoursMode,
  setDepthMode,
  setMetalMarkup,
} from '@/lib/pricing-engine';
import type { DepthMode } from '@/lib/pricing-engine';

export async function GET() {
  try {
    const config = await getPricingConfig();
    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Volatility mode
    if (body.volatilityMode) {
      const valid = ['calm', 'elevated', 'high', 'extreme'];
      if (!valid.includes(body.volatilityMode)) return NextResponse.json({ error: 'Invalid' }, { status: 400 });
      await setVolatilityMode(body.volatilityMode);
      return NextResponse.json({ success: true, message: `Volatility → ${body.volatilityMode}`, config: await getPricingConfig() });
    }

    // Market hours mode
    if (body.marketHoursMode) {
      const valid = ['london_ny', 'asia', 'weekend'];
      if (!valid.includes(body.marketHoursMode)) return NextResponse.json({ error: 'Invalid' }, { status: 400 });
      await setMarketHoursMode(body.marketHoursMode);
      return NextResponse.json({ success: true, message: `Market hours → ${body.marketHoursMode}`, config: await getPricingConfig() });
    }

    // Depth mode
    if (body.depthMode) {
      const valid = ['deep', 'normal', 'thin', 'shock'];
      if (!valid.includes(body.depthMode)) return NextResponse.json({ error: 'Invalid' }, { status: 400 });
      await setDepthMode(body.depthMode as DepthMode);
      return NextResponse.json({ success: true, message: `Depth → ${body.depthMode}`, config: await getPricingConfig() });
    }

    // Metal markup (baseMargin + absoluteFloor)
    if (body.metal && (body.baseMargin !== undefined || body.absoluteFloor !== undefined)) {
      await setMetalMarkup(body.metal, {
        ...(body.baseMargin !== undefined && { baseMargin: body.baseMargin }),
        ...(body.absoluteFloor !== undefined && { absoluteFloor: body.absoluteFloor }),
      });
      return NextResponse.json({ success: true, message: `${body.metal} updated`, config: await getPricingConfig() });
    }

    // Full config update (whaleFloorPercent, microOptimizationPercent, etc.)
    const updated = await setPricingConfig(body);
    return NextResponse.json({ success: true, message: 'Config updated', config: updated });

  } catch (error: any) {
    console.error('Pricing config error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
