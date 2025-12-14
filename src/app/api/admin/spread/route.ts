// Admin Spread Configuration API
import { NextRequest, NextResponse } from 'next/server';
import { getSpreadConfig, setSpreadConfig, setFullSpreadConfig } from '@/lib/spread-config';

// GET - Get current spread config
export async function GET() {
  try {
    const config = await getSpreadConfig();
    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Update spread config
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
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
