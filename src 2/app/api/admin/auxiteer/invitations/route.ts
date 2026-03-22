// src/app/api/admin/auxiteer/invitations/route.ts
// Sovereign Tier Invitations API

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const INVITATIONS_KEY = 'auxiteer:sovereign:invitations';

// GET - List all Sovereign invitations
export async function GET(request: NextRequest) {
  try {
    const adminKey = request.headers.get('x-admin-key');
    if (adminKey !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get all user meta keys
    const keys = await redis.keys('user:*:meta');
    const invitations = [];

    for (const key of keys) {
      const meta = await redis.get(key);
      if (!meta) continue;
      
      const userData = typeof meta === 'string' ? JSON.parse(meta) : meta;
      
      if (userData.invitedToSovereign) {
        invitations.push({
          walletAddress: userData.walletAddress,
          invitedAt: userData.sovereignInvitedAt || userData.registeredAt,
          invitedBy: userData.sovereignInvitedBy || 'admin',
          status: 'active',
        });
      }
    }

    // Also check revoked invitations
    const revokedList = await redis.lrange('auxiteer:sovereign:revoked', 0, -1);
    for (const item of revokedList) {
      const data = typeof item === 'string' ? JSON.parse(item) : item;
      invitations.push({
        ...data,
        status: 'revoked',
      });
    }

    // Sort by invitedAt descending
    invitations.sort((a, b) => new Date(b.invitedAt).getTime() - new Date(a.invitedAt).getTime());

    return NextResponse.json({ invitations });
  } catch (error) {
    console.error('Get invitations error:', error);
    return NextResponse.json({ error: 'Failed to get invitations' }, { status: 500 });
  }
}
