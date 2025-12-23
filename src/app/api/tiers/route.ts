// src/app/api/tiers/route.ts
// Public API endpoint for Auxiteer tier configuration

import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const DEFAULT_TIERS = [
  { id: 'regular', name: 'Regular', spread: 1.00, fee: 0.35, requirements: { kyc: false, minBalanceUsd: 0, minDays: 0, metalAsset: false, activeEarnLease: false, invitation: false } },
  { id: 'core', name: 'Core', spread: 0.80, fee: 0.25, requirements: { kyc: true, minBalanceUsd: 10000, minDays: 7, metalAsset: false, activeEarnLease: false, invitation: false } },
  { id: 'reserve', name: 'Reserve', spread: 0.65, fee: 0.18, requirements: { kyc: true, minBalanceUsd: 100000, minDays: 30, metalAsset: true, activeEarnLease: false, invitation: false } },
  { id: 'vault', name: 'Vault', spread: 0.50, fee: 0.12, requirements: { kyc: true, minBalanceUsd: 500000, minDays: 90, metalAsset: true, activeEarnLease: true, invitation: false } },
  { id: 'sovereign', name: 'Sovereign', spread: 0, fee: 0, requirements: { kyc: true, minBalanceUsd: 1000000, minDays: 180, metalAsset: true, activeEarnLease: true, invitation: true } },
];

export async function GET() {
  try {
    const config = await redis.get('auxiteer:tier:config');
    
    if (config) {
      const tiers = typeof config === 'string' ? JSON.parse(config) : config;
      return NextResponse.json({ success: true, tiers, source: 'redis' });
    }
    
    return NextResponse.json({ success: true, tiers: DEFAULT_TIERS, source: 'default' });
  } catch (error: any) {
    console.error('Tiers API error:', error);
    return NextResponse.json({ success: true, tiers: DEFAULT_TIERS, source: 'fallback' });
  }
}
