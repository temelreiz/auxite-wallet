import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json({ error: 'address required' }, { status: 400 });
    }

    const uid = await redis.get(`user:address:${address.toLowerCase()}:uid`);
    
    return NextResponse.json({
      success: true,
      exists: !!uid,
      address: address.toLowerCase(),
    });
  } catch (error: any) {
    console.error('User check error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
