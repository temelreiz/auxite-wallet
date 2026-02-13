// /api/custody/transparency/route.ts
// Custody Transparency API — Aggregates platform stock + encumbrance data
// Public endpoint (no auth required) — returns aggregate custody data only
import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { getPlatformSummary, getPlatformLedgerLog } from '@/lib/leasing/encumbrance-ledger';

export const dynamic = 'force-dynamic';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const METALS = ['AUXG', 'AUXS', 'AUXPT', 'AUXPD'];
const OZ_TO_GRAMS = 31.1035;
const CACHE_KEY = 'custody:transparency:cache';
const CACHE_TTL = 300; // 5 minutes

export interface CustodyTransparencyResponse {
  success: boolean;
  timestamp: string;
  layers: {
    custodySnapshot: {
      metals: Array<{
        symbol: string;
        custodyHoldingsKg: number;
        custodyHoldingsG: number;
      }>;
      updatedAt: string | null;
    };
    encumbranceVisibility: {
      metals: Array<{
        symbol: string;
        allocatedG: number;
        encumberedG: number;
        availableG: number;
        pendingG: number;
        activeLeaseCount: number;
        utilizationPercent: number;
      }>;
    };
    reconciliation: {
      status: 'Reconciled' | 'Pending' | 'Mismatch';
      lastReconciliationAt: string | null;
      nextScheduledAudit: string | null;
      mismatchDetails: string | null;
    };
    ledgerVisibility: {
      totalAllocationsCount: number;
      lastLedgerActivity: string | null;
    };
  };
}

export async function GET(request: NextRequest) {
  try {
    // Check cache
    const cached = await redis.get(CACHE_KEY);
    if (cached && typeof cached === 'object') {
      return NextResponse.json(cached);
    }

    // ── Layer 1: Custody Snapshot (from platform stock) ──
    let latestUpdate: string | null = null;
    const custodyMetals: CustodyTransparencyResponse['layers']['custodySnapshot']['metals'] = [];

    for (const metal of METALS) {
      const stockKey = `platform:stock:${metal}`;
      const data = await redis.hgetall(stockKey);

      if (data && Object.keys(data).length > 0) {
        const totalG = parseFloat(data.total as string || '0');
        custodyMetals.push({
          symbol: metal,
          custodyHoldingsG: totalG,
          custodyHoldingsKg: totalG / 1000,
        });

        if (data.lastUpdated) {
          const ts = typeof data.lastUpdated === 'number'
            ? new Date(data.lastUpdated).toISOString()
            : String(data.lastUpdated);
          if (!latestUpdate || ts > latestUpdate) {
            latestUpdate = ts;
          }
        }
      } else {
        custodyMetals.push({
          symbol: metal,
          custodyHoldingsG: 0,
          custodyHoldingsKg: 0,
        });
      }
    }

    // ── Layer 2: Encumbrance Visibility ──
    const encumbranceSummary = await getPlatformSummary();
    const encumbranceMetals: CustodyTransparencyResponse['layers']['encumbranceVisibility']['metals'] = [];

    for (const metal of METALS) {
      const state = encumbranceSummary[metal];
      const stockEntry = custodyMetals.find(m => m.symbol === metal);
      const allocatedG = stockEntry?.custodyHoldingsG || 0;

      if (state) {
        const encumberedG = state.totalEncumberedOz * OZ_TO_GRAMS;
        const pendingG = state.totalPendingOz * OZ_TO_GRAMS;
        const availableG = Math.max(0, allocatedG - encumberedG - pendingG);
        const utilization = allocatedG > 0 ? (encumberedG / allocatedG) * 100 : 0;

        encumbranceMetals.push({
          symbol: metal,
          allocatedG,
          encumberedG,
          availableG,
          pendingG,
          activeLeaseCount: state.activeLeaseCount,
          utilizationPercent: parseFloat(utilization.toFixed(2)),
        });
      } else {
        encumbranceMetals.push({
          symbol: metal,
          allocatedG,
          encumberedG: 0,
          availableG: allocatedG,
          pendingG: 0,
          activeLeaseCount: 0,
          utilizationPercent: 0,
        });
      }
    }

    // ── Layer 3: Reconciliation & Audit ──
    const ledgerLog = await getPlatformLedgerLog(10);
    const lastLogTimestamp = ledgerLog.length > 0
      ? new Date(ledgerLog[0].timestamp).toISOString()
      : null;

    // Determine reconciliation status
    const allEncumbranceZero = Object.values(encumbranceSummary).every(
      s => s.totalAllocatedOz === 0 && s.totalEncumberedOz === 0
    );

    let reconciliationStatus: 'Reconciled' | 'Pending' | 'Mismatch' = 'Pending';
    let mismatchDetails: string | null = null;

    if (allEncumbranceZero) {
      // No encumbrance data yet — pending
      reconciliationStatus = 'Pending';
    } else {
      // Compare platform stock totals vs encumbrance totals
      let hasMismatch = false;
      const mismatches: string[] = [];

      for (const metal of METALS) {
        const stockG = custodyMetals.find(m => m.symbol === metal)?.custodyHoldingsG || 0;
        const encumbranceAllocG = (encumbranceSummary[metal]?.totalAllocatedOz || 0) * OZ_TO_GRAMS;

        // Only check if either side has meaningful data
        if (stockG > 0.01 || encumbranceAllocG > 0.01) {
          const diff = Math.abs(stockG - encumbranceAllocG);
          if (diff > 0.01) {
            hasMismatch = true;
            mismatches.push(`${metal}: stock=${stockG.toFixed(2)}g vs encumbrance=${encumbranceAllocG.toFixed(2)}g`);
          }
        }
      }

      reconciliationStatus = hasMismatch ? 'Mismatch' : 'Reconciled';
      mismatchDetails = hasMismatch ? mismatches.join('; ') : null;
    }

    // ── Layer 4: Ledger Visibility ──
    let totalAllocationsCount = 0;
    for (const state of Object.values(encumbranceSummary)) {
      totalAllocationsCount += state.activeLeaseCount;
    }

    // ── Build Response ──
    const response: CustodyTransparencyResponse = {
      success: true,
      timestamp: new Date().toISOString(),
      layers: {
        custodySnapshot: {
          metals: custodyMetals,
          updatedAt: latestUpdate,
        },
        encumbranceVisibility: {
          metals: encumbranceMetals,
        },
        reconciliation: {
          status: reconciliationStatus,
          lastReconciliationAt: lastLogTimestamp,
          nextScheduledAudit: 'Q2 2026',
          mismatchDetails,
        },
        ledgerVisibility: {
          totalAllocationsCount,
          lastLedgerActivity: lastLogTimestamp,
        },
      },
    };

    // Cache for 5 minutes
    await redis.set(CACHE_KEY, JSON.stringify(response), { ex: CACHE_TTL });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Custody transparency API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
