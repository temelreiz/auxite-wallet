import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    if (token !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase() || '';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get all user keys
    const userKeys = await redis.keys('user:*:meta');
    
    const users = [];
    for (const key of userKeys.slice(0, limit)) {
      try {
        const userData = await redis.get(key);
        if (userData) {
          const user = typeof userData === 'string' ? JSON.parse(userData) : userData;
          
          // Search filter
          if (search) {
            const address = user.walletAddress?.toLowerCase() || '';
            const email = user.email?.toLowerCase() || '';
            if (!address.includes(search) && !email.includes(search)) {
              continue;
            }
          }
          
          // Get user balance
          const balanceKey = `user:${user.walletAddress?.toLowerCase()}:balance`;
          const balance = await redis.get(balanceKey) || {};
          
          users.push({
            ...user,
            balance: typeof balance === 'string' ? JSON.parse(balance) : balance,
          });
        }
      } catch (e) {
        console.error('Error parsing user:', key, e);
      }
    }

    return NextResponse.json({
      success: true,
      users,
      total: userKeys.length,
    });

  } catch (error: any) {
    console.error('Users API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
