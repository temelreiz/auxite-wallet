// src/app/api/cron/check-limit-orders/route.ts
// Cron Job: Check and execute matching limit orders

import { NextRequest, NextResponse } from 'next/server';
import { checkAndFillMatchingOrders } from '@/lib/limit-orders';
import { getMetalPrices } from '@/lib/price-cache';
import { getMetalSpread, applySpread } from '@/lib/spread-config';

// Metals to check
const METALS = ['AUXG', 'AUXS', 'AUXPT', 'AUXPD'];

// Map AUXG -> gold for price lookup
const METAL_TO_PRICE_KEY: Record<string, string> = {
  'AUXG': 'gold',
  'AUXS': 'silver',
  'AUXPT': 'platinum',
  'AUXPD': 'palladium',
};

// ═══════════════════════════════════════════════════════════════════════════════
// CRON HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel cron or manual trigger)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  // Allow if:
  // 1. CRON_SECRET matches
  // 2. x-api-key matches INTERNAL_API_KEY
  // 3. Running locally (no secret required in dev)
  const isAuthorized = 
    authHeader === `Bearer ${cronSecret}` ||
    request.headers.get('x-api-key') === process.env.INTERNAL_API_KEY ||
    process.env.NODE_ENV === 'development';
    
  if (!isAuthorized && cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  console.log('🔄 Running limit order check...');
  
  const results: Record<string, { filled: number; errors: string[]; askPrice: number; bidPrice: number }> = {};
  let totalFilled = 0;
  let totalErrors: string[] = [];
  
  try {
    // Get current prices for all metals
    const prices = await getMetalPrices();
    
    for (const metal of METALS) {
      try {
        // Get base price using correct key mapping
        const priceKey = METAL_TO_PRICE_KEY[metal] as keyof typeof prices;
        const basePrice = prices[priceKey] || 0;
        
        if (basePrice <= 0) {
          console.log(`⚠️ No price available for ${metal}, skipping...`);
          continue;
        }
        
        // Get spread settings
        const spread = await getMetalSpread(metal);
        
        // Calculate ask (user buys) and bid (user sells) prices
        const askPrice = applySpread(basePrice, 'buy', spread.buy);
        const bidPrice = applySpread(basePrice, 'sell', spread.sell);
        
        console.log(`📊 ${metal}: Base $${basePrice.toFixed(2)}, Ask $${askPrice.toFixed(2)}, Bid $${bidPrice.toFixed(2)}`);
        
        // Check and fill matching orders
        const result = await checkAndFillMatchingOrders(metal, askPrice, bidPrice);
        
        results[metal] = {
          filled: result.filled,
          errors: result.errors,
          askPrice,
          bidPrice,
        };
        
        totalFilled += result.filled;
        totalErrors = [...totalErrors, ...result.errors];
        
        if (result.filled > 0) {
          console.log(`✅ ${metal}: Filled ${result.filled} orders`);
        }
        
      } catch (metalError: any) {
        console.error(`Error checking ${metal}:`, metalError);
        results[metal] = {
          filled: 0,
          errors: [metalError.message],
          askPrice: 0,
          bidPrice: 0,
        };
        totalErrors.push(`${metal}: ${metalError.message}`);
      }
    }
    
    console.log(`🏁 Limit order check complete: ${totalFilled} orders filled`);
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalFilled,
        totalErrors: totalErrors.length,
      },
      results,
      errors: totalErrors.length > 0 ? totalErrors : undefined,
    });
    
  } catch (error: any) {
    console.error('Limit order cron error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Cron job failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// POST also supported for manual testing
export async function POST(request: NextRequest) {
  return GET(request);
}
