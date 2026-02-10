// ============================================
// ADMIN LEASING API — Auxite Metal Leasing Engine
// Unified admin endpoint for all leasing engine management
// Counterparty CRUD, Quote management, RFQ, Pool, Risk, Yield Config
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import {
  registerCounterparty,
  updateCounterparty,
  getCounterparty,
  getAllCounterparties,
  deactivateCounterparty,
  getCounterpartyConfig,
  setCounterpartyConfig,
  getCounterpartyQuotes,
} from '@/lib/leasing/counterparty-manager';
import {
  getYieldConfig,
  setYieldConfig,
  computeAllYields,
  getYieldSnapshot,
} from '@/lib/leasing/yield-builder';
import {
  getSmootherConfig,
  setSmootherConfig,
  resetAllSmootherWindows,
  getSmootherDiagnostics,
} from '@/lib/leasing/yield-smoother';
import {
  getRiskConfig,
  setRiskConfig,
  computeRiskDashboard,
  getActiveAlerts,
  acknowledgeAlert,
  getAlertHistory,
  getBufferPool,
} from '@/lib/leasing/risk-buffer';
import {
  createRFQ,
  openRFQ,
  submitRFQResponse,
  closeRFQ,
  awardRFQ,
  cancelRFQ,
  getRFQ,
  getRFQResponses,
  getActiveRFQs,
  getAllRFQs,
  getRFQSummary,
  expireStaleRFQs,
  getRFQHistory,
} from '@/lib/leasing/rfq-engine';
import {
  getPoolConfig,
  setPoolConfig,
} from '@/lib/leasing/pool-manager';
import {
  getPlatformSummary,
  getPlatformLedgerLog,
} from '@/lib/leasing/encumbrance-ledger';

// GET — Admin dashboard data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section');

    // ─────────────────────────────────────────────
    // COUNTERPARTIES
    // ─────────────────────────────────────────────
    if (section === 'counterparties') {
      const cpId = searchParams.get('cpId');
      if (cpId) {
        const cp = await getCounterparty(cpId);
        const quotes = await getCounterpartyQuotes(cpId);
        return NextResponse.json({ success: true, counterparty: cp, quotes });
      }
      const counterparties = await getAllCounterparties();
      return NextResponse.json({ success: true, counterparties });
    }

    // ─────────────────────────────────────────────
    // YIELD
    // ─────────────────────────────────────────────
    if (section === 'yield') {
      const snapshot = await getYieldSnapshot();
      const yieldConfig = await getYieldConfig();
      const smootherConfig = await getSmootherConfig();
      return NextResponse.json({
        success: true,
        snapshot,
        yieldConfig,
        smootherConfig,
      });
    }

    // ─────────────────────────────────────────────
    // RISK
    // ─────────────────────────────────────────────
    if (section === 'risk') {
      const dashboard = await computeRiskDashboard();
      return NextResponse.json({ success: true, dashboard });
    }

    // ─────────────────────────────────────────────
    // ALERTS
    // ─────────────────────────────────────────────
    if (section === 'alerts') {
      const showHistory = searchParams.get('history') === 'true';
      if (showHistory) {
        const history = await getAlertHistory();
        return NextResponse.json({ success: true, alerts: history });
      }
      const alerts = await getActiveAlerts();
      return NextResponse.json({ success: true, alerts });
    }

    // ─────────────────────────────────────────────
    // RFQ
    // ─────────────────────────────────────────────
    if (section === 'rfq') {
      const rfqId = searchParams.get('rfqId');
      if (rfqId) {
        const rfq = await getRFQ(rfqId);
        const responses = await getRFQResponses(rfqId);
        return NextResponse.json({ success: true, rfq, responses });
      }
      const active = searchParams.get('active') === 'true';
      const rfqs = active ? await getActiveRFQs() : await getAllRFQs();
      const rfqSummary = await getRFQSummary();
      return NextResponse.json({ success: true, rfqs, summary: rfqSummary });
    }

    // ─────────────────────────────────────────────
    // ENCUMBRANCE (platform level)
    // ─────────────────────────────────────────────
    if (section === 'encumbrance') {
      const platformSummary = await getPlatformSummary();
      const recentLog = await getPlatformLedgerLog(20);
      return NextResponse.json({ success: true, platform: platformSummary, recentLog });
    }

    // ─────────────────────────────────────────────
    // BUFFER POOL
    // ─────────────────────────────────────────────
    if (section === 'buffer') {
      const bufferPool = await getBufferPool();
      return NextResponse.json({ success: true, bufferPool });
    }

    // ─────────────────────────────────────────────
    // CONFIG (all configs)
    // ─────────────────────────────────────────────
    if (section === 'config') {
      const [cpConfig, yieldConfig, smootherConfig, riskConfig, poolConfig] = await Promise.all([
        getCounterpartyConfig(),
        getYieldConfig(),
        getSmootherConfig(),
        getRiskConfig(),
        getPoolConfig(),
      ]);
      return NextResponse.json({
        success: true,
        configs: {
          counterparty: cpConfig,
          yield: yieldConfig,
          smoother: smootherConfig,
          risk: riskConfig,
          pool: poolConfig,
        },
      });
    }

    // ─────────────────────────────────────────────
    // FULL DASHBOARD (overview)
    // ─────────────────────────────────────────────
    const [counterparties, yieldSnapshot, riskDashboard, activeAlerts, activeRfqs, platformSummary, bufferPool] =
      await Promise.all([
        getAllCounterparties(),
        getYieldSnapshot(),
        computeRiskDashboard(),
        getActiveAlerts(),
        getActiveRFQs(),
        getPlatformSummary(),
        getBufferPool(),
      ]);

    return NextResponse.json({
      success: true,
      overview: {
        counterparties: {
          total: counterparties.length,
          active: counterparties.filter((cp) => cp.active).length,
        },
        yield: yieldSnapshot
          ? { source: yieldSnapshot.source, computedAt: yieldSnapshot.computedAt }
          : null,
        risk: {
          totalExposure: riskDashboard.totalPlatformExposureUSD,
          activeAlerts: activeAlerts.length,
        },
        rfq: { active: activeRfqs.length },
        encumbrance: platformSummary,
        bufferPool: {
          totalAccrued: bufferPool.totalAccruedUSD,
          target: bufferPool.targetUSD,
        },
      },
    });
  } catch (error: any) {
    console.error('Admin leasing GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — Admin actions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { section, action } = body;

    // ═══════════════════════════════════════════════
    // COUNTERPARTY MANAGEMENT
    // ═══════════════════════════════════════════════
    if (section === 'counterparty') {
      if (action === 'register') {
        const cp = await registerCounterparty(body.data);
        return NextResponse.json({ success: true, counterparty: cp });
      }

      if (action === 'update') {
        const cp = await updateCounterparty(body.cpId, body.data);
        return NextResponse.json({ success: true, counterparty: cp });
      }

      if (action === 'deactivate') {
        const success = await deactivateCounterparty(body.cpId);
        return NextResponse.json({ success });
      }

      if (action === 'update_config') {
        const config = await setCounterpartyConfig(body.config);
        return NextResponse.json({ success: true, config });
      }
    }

    // ═══════════════════════════════════════════════
    // YIELD MANAGEMENT
    // ═══════════════════════════════════════════════
    if (section === 'yield') {
      if (action === 'compute') {
        const snapshot = await computeAllYields();
        return NextResponse.json({ success: true, snapshot });
      }

      if (action === 'update_config') {
        const config = await setYieldConfig(body.config);
        return NextResponse.json({ success: true, config });
      }

      if (action === 'update_smoother_config') {
        const config = await setSmootherConfig(body.config);
        return NextResponse.json({ success: true, config });
      }

      if (action === 'reset_smoother') {
        await resetAllSmootherWindows();
        return NextResponse.json({ success: true, message: 'Smoother windows reset' });
      }

      if (action === 'diagnostics') {
        const { metal, tenor } = body;
        const diag = await getSmootherDiagnostics(metal, tenor);
        return NextResponse.json({ success: true, diagnostics: diag });
      }
    }

    // ═══════════════════════════════════════════════
    // RISK MANAGEMENT
    // ═══════════════════════════════════════════════
    if (section === 'risk') {
      if (action === 'update_config') {
        const config = await setRiskConfig(body.config);
        return NextResponse.json({ success: true, config });
      }

      if (action === 'acknowledge_alert') {
        const success = await acknowledgeAlert(body.alertId);
        return NextResponse.json({ success });
      }

      if (action === 'refresh_dashboard') {
        const dashboard = await computeRiskDashboard();
        return NextResponse.json({ success: true, dashboard });
      }
    }

    // ═══════════════════════════════════════════════
    // RFQ MANAGEMENT
    // ═══════════════════════════════════════════════
    if (section === 'rfq') {
      if (action === 'create') {
        const rfq = await createRFQ(body.data);
        return NextResponse.json({ success: true, rfq });
      }

      if (action === 'open') {
        const result = await openRFQ(body.rfqId);
        return NextResponse.json({ success: result.success, sentTo: result.sentTo, error: result.error });
      }

      if (action === 'respond') {
        const result = await submitRFQResponse(body.rfqId, body.response);
        return NextResponse.json({ success: result.success, response: result.response, error: result.error });
      }

      if (action === 'close') {
        const result = await closeRFQ(body.rfqId);
        return NextResponse.json({ success: result.success, error: result.error });
      }

      if (action === 'award') {
        const result = await awardRFQ(body.rfqId, body.responseId);
        return NextResponse.json({ success: result.success, error: result.error });
      }

      if (action === 'cancel') {
        const result = await cancelRFQ(body.rfqId);
        return NextResponse.json({ success: result.success, error: result.error });
      }

      if (action === 'expire_stale') {
        const count = await expireStaleRFQs();
        return NextResponse.json({ success: true, expiredCount: count });
      }
    }

    // ═══════════════════════════════════════════════
    // POOL CONFIG
    // ═══════════════════════════════════════════════
    if (section === 'pool') {
      if (action === 'update_config') {
        const config = await setPoolConfig(body.config);
        return NextResponse.json({ success: true, config });
      }
    }

    return NextResponse.json({ error: 'Invalid section or action' }, { status: 400 });
  } catch (error: any) {
    console.error('Admin leasing POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
