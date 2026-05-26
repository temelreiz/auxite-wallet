// Admin Spread Configuration API
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getSpreadConfig, setSpreadConfig, setFullSpreadConfig } from '@/lib/spread-config';
import { getProcurementConfig, setProcurementConfig } from '@/lib/procurement-service';

// GET - Get current spread config
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.authorized) return auth.response!;

    const [config, proc] = await Promise.all([getSpreadConfig(), getProcurementConfig()]);
    return NextResponse.json({ success: true, config, costModel: proc.costModel });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Update spread config
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.authorized) return auth.response!;

    const body = await request.json();

    // Cost model / margin-guard update (stored in procurement config)
    if (body.costModel) {
      const cm = body.costModel;
      const num = (v: any) => (typeof v === 'number' && isFinite(v) ? v : null);
      const htxFeePct = num(cm.htxFeePct);
      const fxSpreadPct = num(cm.fxSpreadPct);
      const withdrawFeeUSD = num(cm.withdrawFeeUSD);
      const minMarginPct = num(cm.minMarginPct);
      if (htxFeePct === null || fxSpreadPct === null || withdrawFeeUSD === null || minMarginPct === null) {
        return NextResponse.json({ error: 'costModel fields must be numbers' }, { status: 400 });
      }
      if (
        htxFeePct < 0 || htxFeePct > 5 ||
        fxSpreadPct < 0 || fxSpreadPct > 10 ||
        withdrawFeeUSD < 0 || withdrawFeeUSD > 1000 ||
        minMarginPct < -100 || minMarginPct > 100
      ) {
        return NextResponse.json({ error: 'costModel value out of range' }, { status: 400 });
      }
      await setProcurementConfig({
        costModel: {
          htxFeePct,
          fxSpreadPct,
          withdrawFeeUSD,
          minMarginPct,
          blockOnNegativeMargin: cm.blockOnNegativeMargin !== false,
        },
      });
      const proc = await getProcurementConfig();
      return NextResponse.json({ success: true, message: 'Cost model updated', costModel: proc.costModel });
    }

    // Check if it's a full config update
    if (body.metals || body.crypto) {
      await setFullSpreadConfig(body);
      const updated = await getSpreadConfig();
      return NextResponse.json({
        success: true,
        message: 'Full spread config updated',
        config: updated,
      });
    }

    // Single asset update
    const { type, asset, buy, sell } = body;
    
    if (!type || !asset || buy === undefined || sell === undefined) {
      return NextResponse.json({ 
        error: 'Missing parameters: type (metal/crypto), asset, buy, sell required' 
      }, { status: 400 });
    }

    // Validate type
    if (type !== 'metal' && type !== 'crypto') {
      return NextResponse.json({ 
        error: 'Type must be "metal" or "crypto"' 
      }, { status: 400 });
    }

    // Validate spread range (0-10%)
    if (buy < 0 || buy > 10 || sell < 0 || sell > 10) {
      return NextResponse.json({ 
        error: 'Spread must be between 0 and 10%' 
      }, { status: 400 });
    }

    // Normalize asset key
    let assetKey = asset.toLowerCase();
    if (type === 'metal') {
      // Convert AUXG -> gold, etc.
      const metalMap: Record<string, string> = {
        'auxg': 'gold',
        'auxs': 'silver',
        'auxpt': 'platinum',
        'auxpd': 'palladium',
        'gold': 'gold',
        'silver': 'silver',
        'platinum': 'platinum',
        'palladium': 'palladium',
      };
      assetKey = metalMap[assetKey] || assetKey;
    }

    await setSpreadConfig(type, assetKey, { buy, sell });
    const updated = await getSpreadConfig();
    
    return NextResponse.json({
      success: true,
      message: `${asset} spread updated: Buy ${buy}%, Sell ${sell}%`,
      config: updated,
    });
  } catch (error: any) {
    console.error('Spread update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
