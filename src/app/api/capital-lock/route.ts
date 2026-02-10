// Capital Lock API
// When user clicks "Confirm Allocation":
// 1. Lock AUXM balance (prevent double-spend)
// 2. Freeze execution price
// 3. Return lock ID for execution
import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const LOCK_TTL = 120; // 2 minutes lock

// POST - Create capital lock
export async function POST(request: NextRequest) {
  try {
    const { address, fromAsset, toAsset, fromAmount, executionPrice } = await request.json();

    if (!address || !fromAsset || !toAsset || !fromAmount || !executionPrice) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();
    const balanceKey = `user:${normalizedAddress}:balance`;
    const fromKey = fromAsset.toLowerCase();

    // Check balance
    const currentBalance = parseFloat((await redis.hget(balanceKey, fromKey) as string) || "0");
    if (currentBalance < fromAmount) {
      return NextResponse.json({
        error: 'Insufficient balance',
        available: currentBalance,
        required: fromAmount,
      }, { status: 400 });
    }

    // Create lock
    const lockId = `lock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const lockData = {
      lockId,
      address: normalizedAddress,
      fromAsset,
      toAsset,
      fromAmount,
      executionPrice,
      createdAt: Date.now(),
      status: 'active',
    };

    // Deduct from balance immediately (lock)
    await redis.hincrbyfloat(balanceKey, fromKey, -fromAmount);

    // Store lock with TTL
    await redis.set(`capital:lock:${lockId}`, JSON.stringify(lockData), { ex: LOCK_TTL });

    // Track active lock for this user
    await redis.set(`capital:lock:user:${normalizedAddress}`, lockId, { ex: LOCK_TTL });

    console.log(`🔒 Capital locked: ${fromAmount} ${fromAsset} for ${normalizedAddress} (${lockId})`);

    return NextResponse.json({
      success: true,
      lockId,
      frozenPrice: executionPrice,
      expiresIn: LOCK_TTL,
    });
  } catch (error: any) {
    console.error('Capital lock error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Release capital lock (cancel / timeout)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lockId = searchParams.get('lockId');

    if (!lockId) {
      return NextResponse.json({ error: 'lockId required' }, { status: 400 });
    }

    const lockDataStr = await redis.get(`capital:lock:${lockId}`) as string;
    if (!lockDataStr) {
      return NextResponse.json({ error: 'Lock not found or expired' }, { status: 404 });
    }

    const lockData = typeof lockDataStr === 'string' ? JSON.parse(lockDataStr) : lockDataStr;

    // Return funds to user
    const balanceKey = `user:${lockData.address}:balance`;
    const fromKey = lockData.fromAsset.toLowerCase();
    await redis.hincrbyfloat(balanceKey, fromKey, lockData.fromAmount);

    // Clean up lock
    await redis.del(`capital:lock:${lockId}`);
    await redis.del(`capital:lock:user:${lockData.address}`);

    console.log(`🔓 Capital released: ${lockData.fromAmount} ${lockData.fromAsset} for ${lockData.address}`);

    return NextResponse.json({ success: true, released: lockData.fromAmount });
  } catch (error: any) {
    console.error('Capital release error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
