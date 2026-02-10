// ============================================
// LEASING POOLS API — Auxite Metal Leasing Engine
// GET: Active pools, user pools
// POST: Join pool, withdraw, execute (admin), mature (admin)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getOrCreateFormingPool,
  joinPool,
  withdrawFromPool,
  executePool,
  maturePool,
  getPool,
  getPoolMembers,
  getAllPools,
  getActivePools,
  getUserPools,
  getPoolSummary,
  getPoolHistory,
} from '@/lib/leasing/pool-manager';

// GET — Fetch pools
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const poolId = searchParams.get('poolId');
    const status = searchParams.get('status');
    const summary = searchParams.get('summary');
    const history = searchParams.get('history');

    // Pool summary
    if (summary === 'true') {
      const summaryData = await getPoolSummary();
      return NextResponse.json({ success: true, summary: summaryData });
    }

    // Pool history
    if (history === 'true') {
      const historyData = await getPoolHistory();
      return NextResponse.json({ success: true, history: historyData });
    }

    // Specific pool with members
    if (poolId) {
      const pool = await getPool(poolId);
      if (!pool) {
        return NextResponse.json({ error: 'Pool not found' }, { status: 404 });
      }
      const members = await getPoolMembers(poolId);
      return NextResponse.json({ success: true, pool, members });
    }

    // User's pools
    if (address) {
      const pools = await getUserPools(address);
      return NextResponse.json({ success: true, pools, count: pools.length });
    }

    // Active pools
    if (status === 'active') {
      const pools = await getActivePools();
      return NextResponse.json({ success: true, pools, count: pools.length });
    }

    // All pools
    const pools = await getAllPools();
    return NextResponse.json({ success: true, pools, count: pools.length });
  } catch (error: any) {
    console.error('Leasing pools GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — Pool actions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // ─────────────────────────────────────────────
    // JOIN POOL
    // ─────────────────────────────────────────────
    if (action === 'join') {
      const { metal, tenor, address, amountOz } = body;

      if (!metal || !tenor || !address || !amountOz) {
        return NextResponse.json(
          { error: 'metal, tenor, address, and amountOz are required' },
          { status: 400 }
        );
      }

      const result = await joinPool(
        metal.toUpperCase(),
        tenor.toUpperCase(),
        address.toLowerCase(),
        parseFloat(amountOz)
      );

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        pool: result.pool,
        member: result.member,
        message: `Joined pool ${result.pool?.id} with ${amountOz} oz ${metal}`,
      });
    }

    // ─────────────────────────────────────────────
    // WITHDRAW FROM POOL
    // ─────────────────────────────────────────────
    if (action === 'withdraw') {
      const { poolId, address } = body;

      if (!poolId || !address) {
        return NextResponse.json(
          { error: 'poolId and address are required' },
          { status: 400 }
        );
      }

      const result = await withdrawFromPool(poolId, address.toLowerCase());

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: `Withdrawn from pool ${poolId}`,
      });
    }

    // ─────────────────────────────────────────────
    // EXECUTE POOL (admin)
    // ─────────────────────────────────────────────
    if (action === 'execute') {
      const { poolId, quoteId, executedBy } = body;

      if (!poolId || !quoteId) {
        return NextResponse.json(
          { error: 'poolId and quoteId are required' },
          { status: 400 }
        );
      }

      const result = await executePool(poolId, quoteId, executedBy || 'admin');

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: `Pool ${poolId} executed against quote ${quoteId}`,
      });
    }

    // ─────────────────────────────────────────────
    // MATURE POOL (admin)
    // ─────────────────────────────────────────────
    if (action === 'mature') {
      const { poolId } = body;

      if (!poolId) {
        return NextResponse.json(
          { error: 'poolId is required' },
          { status: 400 }
        );
      }

      const result = await maturePool(poolId);

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: `Pool ${poolId} matured — yield distributed`,
      });
    }

    // ─────────────────────────────────────────────
    // GET/CREATE FORMING POOL (for display)
    // ─────────────────────────────────────────────
    if (action === 'get_forming') {
      const { metal, tenor } = body;

      if (!metal || !tenor) {
        return NextResponse.json(
          { error: 'metal and tenor are required' },
          { status: 400 }
        );
      }

      const pool = await getOrCreateFormingPool(metal.toUpperCase(), tenor.toUpperCase());
      return NextResponse.json({ success: true, pool });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Leasing pools POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
