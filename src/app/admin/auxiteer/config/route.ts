// src/app/api/admin/auxiteer/config/route.ts
// Auxiteer Tier Configuration API

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const TIER_CONFIG_KEY = 'auxiteer:tier:config';

// Default tier configuration
const DEFAULT_TIERS = [
  {
    id: 'regular',
    name: 'Regular',
    spread: 1.00,
    fee: 0.35,
    requirements: { kyc: false, minBalanceUsd: 0, minDays: 0, metalAsset: false, activeEarnLease: false, invitation: false },
  },
  {
    id: 'core',
    name: 'Core',
    spread: 0.80,
    fee: 0.25,
    requirements: { kyc: true, minBalanceUsd: 10000, minDays: 7, metalAsset: false, activeEarnLease: false, invitation: false },
  },
  {
    id: 'reserve',
    name: 'Reserve',
    spread: 0.65,
    fee: 0.18,
    requirements: { kyc: true, minBalanceUsd: 100000, minDays: 30, metalAsset: true, activeEarnLease: false, invitation: false },
  },
  {
    id: 'vault',
    name: 'Vault',
    spread: 0.50,
    fee: 0.12,
    requirements: { kyc: true, minBalanceUsd: 500000, minDays: 90, metalAsset: true, activeEarnLease: true, invitation: false },
  },
  {
    id: 'sovereign',
    name: 'Sovereign',
    spread: 0,
    fee: 0,
    requirements: { kyc: true, minBalanceUsd: 1000000, minDays: 180, metalAsset: true, activeEarnLease: true, invitation: true },
  },
];

// GET - Tier config
export async function GET(request: NextRequest) {
  try {
    const adminKey = request.headers.get('x-admin-key');
    if (adminKey !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const config = await redis.get(TIER_CONFIG_KEY);
    
    if (!config) {
      // Return default config if not set
      return NextResponse.json({ tiers: DEFAULT_TIERS });
    }

    const tiers = typeof config === 'string' ? JSON.parse(config) : config;
    
    return NextResponse.json({ tiers });
  } catch (error) {
    console.error('Get tier config error:', error);
    return NextResponse.json({ error: 'Failed to get config' }, { status: 500 });
  }
}

// POST - Update tier config
export async function POST(request: NextRequest) {
  try {
    const adminKey = request.headers.get('x-admin-key');
    if (adminKey !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { tiers } = body;

    if (!tiers || !Array.isArray(tiers)) {
      return NextResponse.json({ error: 'Invalid tiers data' }, { status: 400 });
    }

    // Validate tier structure
    const requiredTierIds = ['regular', 'core', 'reserve', 'vault', 'sovereign'];
    const tierIds = tiers.map((t: any) => t.id);
    
    for (const reqId of requiredTierIds) {
      if (!tierIds.includes(reqId)) {
        return NextResponse.json({ error: `Missing required tier: ${reqId}` }, { status: 400 });
      }
    }

    // Validate each tier
    for (const tier of tiers) {
      if (typeof tier.spread !== 'number' || typeof tier.fee !== 'number') {
        return NextResponse.json({ error: `Invalid spread/fee for tier: ${tier.id}` }, { status: 400 });
      }
      
      if (tier.spread < 0 || tier.spread > 10) {
        return NextResponse.json({ error: `Spread must be between 0-10%: ${tier.id}` }, { status: 400 });
      }
      
      if (tier.fee < 0 || tier.fee > 5) {
        return NextResponse.json({ error: `Fee must be between 0-5%: ${tier.id}` }, { status: 400 });
      }
    }

    // Save to Redis
    await redis.set(TIER_CONFIG_KEY, JSON.stringify(tiers));

    // Log the change
    await redis.lpush('auxiteer:config:history', JSON.stringify({
      timestamp: new Date().toISOString(),
      action: 'update_config',
      tiers: tiers.map((t: any) => ({ id: t.id, spread: t.spread, fee: t.fee })),
    }));

    return NextResponse.json({ success: true, message: 'Tier config updated' });
  } catch (error) {
    console.error('Update tier config error:', error);
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
  }
}
