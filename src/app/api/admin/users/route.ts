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

    // Get all user keys
    const userKeys = await redis.keys('user:*:meta');
    
    const users = [];
    for (const key of userKeys) {
      try {
        const userData = await redis.get(key);
        if (userData) {
          const user = typeof userData === 'string' ? JSON.parse(userData) : userData;
          
          // Get user balance
          const address = user.walletAddress?.toLowerCase() || key.split(':')[1];
          const balanceKey = `user:${address}:balance`;
          const balanceData = await redis.get(balanceKey);
          const balance = balanceData ? (typeof balanceData === 'string' ? JSON.parse(balanceData) : balanceData) : {};
          
          const userWithBalance = {
            walletAddress: address,
            ...user,
            balance,
          };

          // Search filter
          if (search) {
            const addr = userWithBalance.walletAddress?.toLowerCase() || '';
            const email = userWithBalance.email?.toLowerCase() || '';
            if (!addr.includes(search) && !email.includes(search)) {
              continue;
            }
          }
          
          users.push(userWithBalance);
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
