// ============================================
// ENCUMBRANCE API — Auxite Metal Leasing Engine
// GET: User encumbrance state, platform metal availability
// POST: Admin operations (set allocated, release, reconcile)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getUserEncumbrance,
  getUserLeases,
  getUserActiveLeases,
  getUserLedgerLog,
  checkAvailability,
  setTotalAllocated,
  getPlatformSummary,
  getPlatformLedgerLog,
  getLeaseEntry,
} from '@/lib/leasing/encumbrance-ledger';

// GET — Fetch encumbrance state
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const leaseId = searchParams.get('leaseId');
    const platform = searchParams.get('platform');
    const log = searchParams.get('log');

    // Platform-level summary
    if (platform === 'true') {
      const summary = await getPlatformSummary();

      if (log === 'true') {
        const platformLog = await getPlatformLedgerLog();
        return NextResponse.json({ success: true, summary, log: platformLog });
      }

      return NextResponse.json({ success: true, summary });
    }

    // Specific lease entry
    if (leaseId) {
      const entry = await getLeaseEntry(leaseId);
      if (!entry) {
        return NextResponse.json({ error: 'Lease entry not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, entry });
    }

    // User encumbrance
    if (!address) {
      return NextResponse.json({ error: 'address parameter required' }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();
    const encumbrance = await getUserEncumbrance(normalizedAddress);
    const activeLeases = await getUserActiveLeases(normalizedAddress);

    // Include log if requested
    if (log === 'true') {
      const ledgerLog = await getUserLedgerLog(normalizedAddress);
      return NextResponse.json({
        success: true,
        encumbrance,
        activeLeases,
        log: ledgerLog,
      });
    }

    return NextResponse.json({
      success: true,
      encumbrance,
      activeLeases,
      activeLeasesCount: activeLeases.length,
    });
  } catch (error: any) {
    console.error('Encumbrance GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — Admin encumbrance operations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // ─────────────────────────────────────────────
    // SET TOTAL ALLOCATED (sync with balance system)
    // ─────────────────────────────────────────────
    if (action === 'set_allocated') {
      const { address, metal, totalOz } = body;

      if (!address || !metal || totalOz === undefined) {
        return NextResponse.json(
          { error: 'address, metal, and totalOz are required' },
          { status: 400 }
        );
      }

      const encumbrance = await setTotalAllocated(
        address.toLowerCase(),
        metal.toUpperCase(),
        parseFloat(totalOz)
      );

      return NextResponse.json({
        success: true,
        encumbrance,
        message: `Set ${metal} allocated to ${totalOz} oz for ${address}`,
      });
    }

    // ─────────────────────────────────────────────
    // CHECK AVAILABILITY
    // ─────────────────────────────────────────────
    if (action === 'check_availability') {
      const { address, metal, requiredOz } = body;

      if (!address || !metal || !requiredOz) {
        return NextResponse.json(
          { error: 'address, metal, and requiredOz are required' },
          { status: 400 }
        );
      }

      const result = await checkAvailability(
        address.toLowerCase(),
        metal.toUpperCase(),
        parseFloat(requiredOz)
      );

      return NextResponse.json({ success: true, ...result });
    }

    // ─────────────────────────────────────────────
    // GET ALL USER LEASES
    // ─────────────────────────────────────────────
    if (action === 'get_leases') {
      const { address } = body;

      if (!address) {
        return NextResponse.json({ error: 'address required' }, { status: 400 });
      }

      const leases = await getUserLeases(address.toLowerCase());
      return NextResponse.json({
        success: true,
        leases,
        count: leases.length,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Encumbrance POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
