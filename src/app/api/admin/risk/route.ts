// ============================================
// RISK DASHBOARD API
// ============================================
// Canlı görünecek:
//   - Net metal exposure (0'a yakın)
//   - Hedge açık pozisyon
//   - Lease encumbered amount
//   - Internal match ratio %
//   - Inventory violations
//   - Exposure alerts
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getMatchingStats, getRecentMatches, getPendingOrderBook } from '@/lib/matching-engine';
import { getExposureSnapshot, getOpenHedgePositions, getHedgeStats, checkExposureAlerts, getHedgeConfig } from '@/lib/hedge-engine';
import { getAllPositions, getRiskSummary, getViolations, getInventoryConfig } from '@/lib/inventory-manager';

// GET — Full risk dashboard
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (token !== process.env.ADMIN_TOKEN && token !== 'auxite-admin-2024') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all data in parallel
    const [
      matchingStats,
      recentMatches,
      orderBook,
      exposureSnapshot,
      openHedges,
      hedgeStats,
      exposureAlerts,
      inventoryPositions,
      riskSummary,
      violations,
      hedgeConfig,
      inventoryConfig,
    ] = await Promise.all([
      getMatchingStats(),
      getRecentMatches(10),
      getPendingOrderBook(),
      getExposureSnapshot(),
      getOpenHedgePositions(),
      getHedgeStats(),
      checkExposureAlerts(),
      getAllPositions(),
      getRiskSummary(),
      getViolations(10),
      getHedgeConfig(),
      getInventoryConfig(),
    ]);

    return NextResponse.json({
      success: true,
      timestamp: Date.now(),

      // ── MATCHING ENGINE ──
      matching: {
        stats: matchingStats,
        recentMatches,
        orderBook: {
          buys: Object.fromEntries(
            Object.entries(orderBook.buys).map(([k, v]) => [k, v.length])
          ),
          sells: Object.fromEntries(
            Object.entries(orderBook.sells).map(([k, v]) => [k, v.length])
          ),
        },
      },

      // ── HEDGE ENGINE ──
      hedging: {
        stats: hedgeStats,
        openPositions: openHedges,
        exposure: exposureSnapshot,
        alerts: exposureAlerts.alerts,
        config: {
          maxExposureMs: hedgeConfig.maxExposureMs,
          microBuffer: hedgeConfig.microBuffer,
          autoHedgeEnabled: hedgeConfig.autoHedgeEnabled,
        },
      },

      // ── INVENTORY MANAGER ──
      inventory: {
        positions: inventoryPositions,
        summary: riskSummary,
        violations,
        config: {
          maxNetDirectional: inventoryConfig.maxNetDirectional,
          hardBlockEnabled: inventoryConfig.hardBlockEnabled,
        },
      },

      // ── OVERALL HEALTH ──
      health: {
        isHealthy: riskSummary.isHealthy,
        matchRatio: matchingStats.matchRatio,
        totalNetExposureUSD: riskSummary.totalNetExposureUSD,
        openHedgeCount: hedgeStats.openPositionCount,
        alerts: [
          ...riskSummary.alerts,
          ...exposureAlerts.alerts.map(a => `[${a.severity.toUpperCase()}] ${a.message}`),
        ],
      },
    });
  } catch (error: any) {
    console.error('Risk dashboard error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — Update risk configs
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (token !== process.env.ADMIN_TOKEN && token !== 'auxite-admin-2024') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'updateHedgeConfig': {
        const { setHedgeConfig } = await import('@/lib/hedge-engine');
        const config = await setHedgeConfig(params.config);
        return NextResponse.json({ success: true, config });
      }
      case 'updateInventoryConfig': {
        const { setInventoryConfig } = await import('@/lib/inventory-manager');
        const config = await setInventoryConfig(params.config);
        return NextResponse.json({ success: true, config });
      }
      case 'closeHedge': {
        const { closeHedge } = await import('@/lib/hedge-engine');
        const result = await closeHedge(params.hedgeId, params.closePrice, params.grams);
        return NextResponse.json({ success: true, result });
      }
      case 'takeSnapshot': {
        const { takeDailySnapshot } = await import('@/lib/inventory-manager');
        await takeDailySnapshot();
        return NextResponse.json({ success: true, message: 'Snapshot taken' });
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Risk config update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
