// src/app/api/admin/auxiteer/stats/route.ts
// Auxiteer Tier Statistics API

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// GET - Tier statistics
export async function GET(request: NextRequest) {
  try {
    const adminKey = request.headers.get('x-admin-key');
    if (adminKey !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get all user meta keys
    const keys = await redis.keys('user:*:meta');
    
    const tierCounts: Record<string, number> = {
      regular: 0,
      core: 0,
      reserve: 0,
      vault: 0,
      sovereign: 0,
    };
    
    const tierVolumes: Record<string, number> = {
      regular: 0,
      core: 0,
      reserve: 0,
      vault: 0,
      sovereign: 0,
    };
    
    const tierBalances: Record<string, number[]> = {
      regular: [],
      core: [],
      reserve: [],
      vault: [],
      sovereign: [],
    };

    for (const key of keys) {
      try {
        const meta = await redis.get(key);
        if (!meta) continue;
        
        const userData = typeof meta === 'string' ? JSON.parse(meta) : meta;
        const tierId = userData.auxiteerTier || 'regular';
        
        if (tierCounts[tierId] !== undefined) {
          tierCounts[tierId]++;
        }
        
        // Get user balance
        const address = userData.walletAddress;
        if (address) {
          const balanceKey = `user:${address.toLowerCase()}:balance`;
          const balance = await redis.hgetall(balanceKey);
          
          if (balance) {
            // Calculate USD value (simplified)
            let totalUsd = 0;
            totalUsd += parseFloat(balance.auxm as string || '0');
            totalUsd += parseFloat(balance.usdt as string || '0');
            totalUsd += parseFloat(balance.usd as string || '0');
            // Add metal values (approximate)
            totalUsd += parseFloat(balance.auxg as string || '0') * 85;
            totalUsd += parseFloat(balance.auxs as string || '0') * 1;
            totalUsd += parseFloat(balance.auxpt as string || '0') * 32;
            totalUsd += parseFloat(balance.auxpd as string || '0') * 34;
            
            if (tierBalances[tierId]) {
              tierBalances[tierId].push(totalUsd);
            }
          }
          
          // Get user volume (from transactions)
          const txKey = `user:${address.toLowerCase()}:transactions`;
          const txCount = await redis.llen(txKey);
          // Simplified: just count transactions * average
          if (tierVolumes[tierId] !== undefined) {
            tierVolumes[tierId] += txCount * 500; // Rough estimate
          }
        }
      } catch (e) {
        // Skip invalid entries
      }
    }

    // Calculate stats
    const stats = Object.keys(tierCounts).map(tierId => {
      const balances = tierBalances[tierId] || [];
      const avgBalance = balances.length > 0 
        ? balances.reduce((a, b) => a + b, 0) / balances.length 
        : 0;
      
      return {
        tierId,
        userCount: tierCounts[tierId] || 0,
        totalVolume: tierVolumes[tierId] || 0,
        avgBalance: Math.round(avgBalance * 100) / 100,
      };
    });

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Get tier stats error:', error);
    return NextResponse.json({ error: 'Failed to get stats' }, { status: 500 });
  }
}
