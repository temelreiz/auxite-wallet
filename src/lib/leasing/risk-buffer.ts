// ============================================
// RISK BUFFER — Auxite Metal Leasing Engine
// Counterparty exposure limits, volatility shield, alert system
// Buffer pool revenue tracking
// ============================================

import { Redis } from '@upstash/redis';
import {
  getCounterparty,
  getAllCounterparties,
  updateCounterparty,
  type Counterparty,
  type CounterpartyTier,
} from './counterparty-manager';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ============================================
// REDIS KEY NAMESPACE
// ============================================
const KEYS = {
  config: 'leasing:risk:config',
  exposure: (cpId: string) => `leasing:risk:exposure:${cpId}`,
  alerts: 'leasing:risk:alerts',
  alertHistory: 'leasing:risk:alerts:history',
  bufferPool: 'leasing:risk:buffer:pool',
  bufferHistory: 'leasing:risk:buffer:history',
  volatilityState: (metal: string) => `leasing:risk:volatility:${metal}`,
  riskDashboard: 'leasing:risk:dashboard',
};

// ============================================
// TYPES
// ============================================
export interface RiskConfig {
  // Exposure limits by tier
  maxExposureByTier: Record<CounterpartyTier, number>;  // USD
  // Alert thresholds (percent of max exposure)
  warningThreshold: number;        // 0.70 = 70%
  criticalThreshold: number;       // 0.90 = 90%
  // Volatility
  volatilityLookbackDays: number;  // Days to look back for volatility calc
  maxVolatilityBps: number;        // Max acceptable daily volatility (bps)
  volatilityPauseEnabled: boolean; // Pause new leases if volatility exceeds max
  // Buffer
  bufferRateBps: number;           // Risk buffer deducted from yield (default: 25bps)
  bufferPoolTarget: number;        // Target buffer pool size (USD)
  // Concentration
  maxSingleCpConcentration: number; // Max % of total exposure to single CP (0.40 = 40%)
  maxMetalConcentration: number;    // Max % of platform metal in leases (0.70 = 70%)
}

export interface ExposureState {
  counterpartyId: string;
  counterpartyName: string;
  tier: CounterpartyTier;
  // USD exposure
  currentExposureUSD: number;
  maxExposureUSD: number;
  utilizationPercent: number;
  // Metal exposure
  metalExposure: Record<string, number>;  // metal -> oz encumbered
  // Risk
  riskScore: number;
  alertLevel: 'normal' | 'warning' | 'critical' | 'breached';
  lastUpdated: number;
}

export interface RiskAlert {
  id: string;
  type: 'exposure_warning' | 'exposure_critical' | 'exposure_breach' | 'volatility_spike' | 'concentration_risk';
  severity: 'warning' | 'critical';
  counterpartyId?: string;
  metal?: string;
  message: string;
  data: Record<string, number | string>;
  acknowledged: boolean;
  createdAt: number;
}

export interface BufferPoolState {
  totalAccruedUSD: number;
  totalAccruedOz: Record<string, number>;  // metal -> oz
  targetUSD: number;
  utilizationPercent: number;
  lastAccrual: number;
  history: BufferAccrualEntry[];
}

interface BufferAccrualEntry {
  leaseId: string;
  metal: string;
  amountBps: number;
  amountUSD: number;
  timestamp: number;
}

export interface RiskDashboard {
  totalPlatformExposureUSD: number;
  totalCounterparties: number;
  activeCounterparties: number;
  exposureByTier: Record<CounterpartyTier, number>;
  exposureByMetal: Record<string, number>;
  topExposures: ExposureState[];
  activeAlerts: RiskAlert[];
  bufferPool: BufferPoolState;
  volatilityState: Record<string, { currentBps: number; maxBps: number; paused: boolean }>;
  computedAt: number;
}

// ============================================
// DEFAULT CONFIG
// ============================================
const DEFAULT_CONFIG: RiskConfig = {
  maxExposureByTier: {
    bullion_bank: 50_000_000,   // $50M
    otc_dealer: 20_000_000,     // $20M
    central_bank: 100_000_000,  // $100M
  },
  warningThreshold: 0.70,
  criticalThreshold: 0.90,
  volatilityLookbackDays: 30,
  maxVolatilityBps: 200,        // 2% daily vol triggers pause
  volatilityPauseEnabled: true,
  bufferRateBps: 25,            // 0.25% risk buffer
  bufferPoolTarget: 500_000,    // $500K target buffer
  maxSingleCpConcentration: 0.40,
  maxMetalConcentration: 0.70,
};

// ============================================
// CONFIG
// ============================================
export async function getRiskConfig(): Promise<RiskConfig> {
  try {
    const raw = await redis.get(KEYS.config);
    if (raw && typeof raw === 'object') {
      return { ...DEFAULT_CONFIG, ...(raw as Partial<RiskConfig>) };
    }
  } catch (e) {
    console.warn('Failed to fetch risk config, using defaults', e);
  }
  return DEFAULT_CONFIG;
}

export async function setRiskConfig(config: Partial<RiskConfig>): Promise<RiskConfig> {
  const current = await getRiskConfig();
  const merged = { ...current, ...config };
  await redis.set(KEYS.config, merged);
  return merged;
}

// ============================================
// EXPOSURE TRACKING
// ============================================
export async function getExposureState(cpId: string): Promise<ExposureState | null> {
  const cp = await getCounterparty(cpId);
  if (!cp) return null;

  const config = await getRiskConfig();
  const maxExposure = config.maxExposureByTier[cp.tier] || 20_000_000;
  const utilization = maxExposure > 0 ? cp.currentExposureUSD / maxExposure : 0;

  let alertLevel: ExposureState['alertLevel'] = 'normal';
  if (utilization >= 1.0) alertLevel = 'breached';
  else if (utilization >= config.criticalThreshold) alertLevel = 'critical';
  else if (utilization >= config.warningThreshold) alertLevel = 'warning';

  // Get metal-level exposure
  let metalExposure: Record<string, number> = {};
  try {
    const raw = await redis.get(KEYS.exposure(cpId));
    if (raw && typeof raw === 'object') {
      metalExposure = (raw as { metalExposure?: Record<string, number> }).metalExposure || {};
    }
  } catch (_) {}

  return {
    counterpartyId: cpId,
    counterpartyName: cp.name,
    tier: cp.tier,
    currentExposureUSD: cp.currentExposureUSD,
    maxExposureUSD: maxExposure,
    utilizationPercent: parseFloat((utilization * 100).toFixed(2)),
    metalExposure,
    riskScore: cp.riskScore,
    alertLevel,
    lastUpdated: cp.updatedAt,
  };
}

export async function updateExposure(
  cpId: string,
  deltaUSD: number,
  metal: string,
  deltaOz: number
): Promise<{ success: boolean; alert?: RiskAlert }> {
  const cp = await getCounterparty(cpId);
  if (!cp) return { success: false };

  const config = await getRiskConfig();
  const maxExposure = config.maxExposureByTier[cp.tier] || 20_000_000;
  const newExposure = cp.currentExposureUSD + deltaUSD;

  // Check if exposure would breach limit
  if (deltaUSD > 0 && newExposure > maxExposure) {
    const alert = await createAlert({
      type: 'exposure_breach',
      severity: 'critical',
      counterpartyId: cpId,
      message: `Exposure breach for ${cp.name}: $${newExposure.toLocaleString()} exceeds limit $${maxExposure.toLocaleString()}`,
      data: {
        currentExposure: cp.currentExposureUSD,
        requestedDelta: deltaUSD,
        maxExposure,
      },
    });
    return { success: false, alert };
  }

  // Update counterparty exposure
  await updateCounterparty(cpId, {
    currentExposureUSD: Math.max(0, newExposure),
  });

  // Update metal-level exposure
  try {
    const raw = await redis.get(KEYS.exposure(cpId));
    const existing = (raw && typeof raw === 'object')
      ? (raw as { metalExposure?: Record<string, number> })
      : { metalExposure: {} };

    const metalExposure = existing.metalExposure || {};
    metalExposure[metal] = Math.max(0, (metalExposure[metal] || 0) + deltaOz);

    await redis.set(KEYS.exposure(cpId), { metalExposure });
  } catch (_) {}

  // Check alert thresholds
  const utilization = newExposure / maxExposure;
  let alert: RiskAlert | undefined;

  if (utilization >= config.criticalThreshold) {
    alert = await createAlert({
      type: 'exposure_critical',
      severity: 'critical',
      counterpartyId: cpId,
      message: `Critical exposure for ${cp.name}: ${(utilization * 100).toFixed(1)}% of limit ($${newExposure.toLocaleString()} / $${maxExposure.toLocaleString()})`,
      data: {
        utilization: parseFloat((utilization * 100).toFixed(2)),
        currentExposure: newExposure,
        maxExposure,
      },
    });
  } else if (utilization >= config.warningThreshold) {
    alert = await createAlert({
      type: 'exposure_warning',
      severity: 'warning',
      counterpartyId: cpId,
      message: `Exposure warning for ${cp.name}: ${(utilization * 100).toFixed(1)}% of limit`,
      data: {
        utilization: parseFloat((utilization * 100).toFixed(2)),
        currentExposure: newExposure,
        maxExposure,
      },
    });
  }

  return { success: true, alert };
}

// ============================================
// CONCENTRATION RISK
// ============================================
export async function checkConcentrationRisk(
  cpId: string,
  additionalUSD: number
): Promise<{ allowed: boolean; concentrationPercent: number; maxPercent: number }> {
  const config = await getRiskConfig();
  const counterparties = await getAllCounterparties();

  const totalExposure = counterparties.reduce((sum, cp) => sum + cp.currentExposureUSD, 0) + additionalUSD;
  const cp = counterparties.find((c) => c.id === cpId);
  if (!cp) return { allowed: false, concentrationPercent: 0, maxPercent: config.maxSingleCpConcentration * 100 };

  const cpExposure = cp.currentExposureUSD + additionalUSD;
  const concentration = totalExposure > 0 ? cpExposure / totalExposure : 0;

  return {
    allowed: concentration <= config.maxSingleCpConcentration,
    concentrationPercent: parseFloat((concentration * 100).toFixed(2)),
    maxPercent: config.maxSingleCpConcentration * 100,
  };
}

// ============================================
// PRE-LEASE RISK CHECK (comprehensive)
// ============================================
export async function preLeaseRiskCheck(
  cpId: string,
  metal: string,
  amountUSD: number
): Promise<{
  approved: boolean;
  checks: Array<{ check: string; passed: boolean; detail: string }>;
}> {
  const config = await getRiskConfig();
  const checks: Array<{ check: string; passed: boolean; detail: string }> = [];

  // 1. Exposure limit check
  const cp = await getCounterparty(cpId);
  if (!cp) {
    return {
      approved: false,
      checks: [{ check: 'counterparty_exists', passed: false, detail: 'Counterparty not found' }],
    };
  }

  const maxExposure = config.maxExposureByTier[cp.tier] || 20_000_000;
  const newExposure = cp.currentExposureUSD + amountUSD;
  const exposureCheck = newExposure <= maxExposure;
  checks.push({
    check: 'exposure_limit',
    passed: exposureCheck,
    detail: `${exposureCheck ? 'Within' : 'Exceeds'} limit: $${newExposure.toLocaleString()} / $${maxExposure.toLocaleString()}`,
  });

  // 2. Counterparty active check
  checks.push({
    check: 'counterparty_active',
    passed: cp.active,
    detail: cp.active ? 'Counterparty is active' : 'Counterparty is deactivated',
  });

  // 3. Concentration risk check
  const concentration = await checkConcentrationRisk(cpId, amountUSD);
  checks.push({
    check: 'concentration_risk',
    passed: concentration.allowed,
    detail: `Concentration: ${concentration.concentrationPercent}% (max: ${concentration.maxPercent}%)`,
  });

  // 4. Counterparty risk score check
  const minScore = 40; // Minimum acceptable risk score
  checks.push({
    check: 'risk_score',
    passed: cp.riskScore >= minScore,
    detail: `Risk score: ${cp.riskScore}/100 (min: ${minScore})`,
  });

  // 5. Volatility check
  const volatility = await getVolatilityState(metal);
  const volCheck = !config.volatilityPauseEnabled || volatility.currentBps <= config.maxVolatilityBps;
  checks.push({
    check: 'volatility',
    passed: volCheck,
    detail: volCheck
      ? `Volatility OK: ${volatility.currentBps} bps`
      : `Volatility too high: ${volatility.currentBps} bps (max: ${config.maxVolatilityBps} bps) — leasing paused`,
  });

  const approved = checks.every((c) => c.passed);

  return { approved, checks };
}

// ============================================
// VOLATILITY STATE
// ============================================
async function getVolatilityState(metal: string): Promise<{ currentBps: number; maxBps: number; paused: boolean }> {
  try {
    const raw = await redis.get(KEYS.volatilityState(metal));
    if (raw && typeof raw === 'object') return raw as { currentBps: number; maxBps: number; paused: boolean };
  } catch (_) {}

  const config = await getRiskConfig();
  return { currentBps: 0, maxBps: config.maxVolatilityBps, paused: false };
}

export async function updateVolatilityState(
  metal: string,
  currentBps: number
): Promise<{ paused: boolean }> {
  const config = await getRiskConfig();
  const paused = config.volatilityPauseEnabled && currentBps > config.maxVolatilityBps;

  await redis.set(KEYS.volatilityState(metal), {
    currentBps,
    maxBps: config.maxVolatilityBps,
    paused,
  });

  if (paused) {
    await createAlert({
      type: 'volatility_spike',
      severity: 'critical',
      metal,
      message: `Volatility spike in ${metal}: ${currentBps} bps exceeds max ${config.maxVolatilityBps} bps — new leases paused`,
      data: { currentBps, maxBps: config.maxVolatilityBps },
    });
  }

  return { paused };
}

// ============================================
// BUFFER POOL (revenue from risk buffer deduction)
// ============================================
export async function getBufferPool(): Promise<BufferPoolState> {
  try {
    const raw = await redis.get(KEYS.bufferPool);
    if (raw && typeof raw === 'object') return raw as BufferPoolState;
  } catch (_) {}

  const config = await getRiskConfig();
  return {
    totalAccruedUSD: 0,
    totalAccruedOz: {},
    targetUSD: config.bufferPoolTarget,
    utilizationPercent: 0,
    lastAccrual: 0,
    history: [],
  };
}

export async function accrueToBufferPool(
  leaseId: string,
  metal: string,
  amountBps: number,
  amountUSD: number
): Promise<BufferPoolState> {
  const pool = await getBufferPool();

  pool.totalAccruedUSD += amountUSD;
  pool.totalAccruedOz[metal] = (pool.totalAccruedOz[metal] || 0) + (amountBps / 10000); // Convert bps to fraction
  pool.utilizationPercent = pool.targetUSD > 0
    ? parseFloat(((pool.totalAccruedUSD / pool.targetUSD) * 100).toFixed(2))
    : 0;
  pool.lastAccrual = Date.now();

  // Add history entry (keep last 100)
  pool.history.unshift({
    leaseId,
    metal,
    amountBps,
    amountUSD,
    timestamp: Date.now(),
  });
  if (pool.history.length > 100) pool.history = pool.history.slice(0, 100);

  await redis.set(KEYS.bufferPool, pool);
  return pool;
}

// ============================================
// ALERTS
// ============================================
async function createAlert(
  data: Omit<RiskAlert, 'id' | 'acknowledged' | 'createdAt'>
): Promise<RiskAlert> {
  const alert: RiskAlert = {
    ...data,
    id: `ALERT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    acknowledged: false,
    createdAt: Date.now(),
  };

  await redis.lpush(KEYS.alerts, JSON.stringify(alert));
  await redis.ltrim(KEYS.alerts, 0, 99); // Keep 100 active alerts

  // Also add to history
  await redis.lpush(KEYS.alertHistory, JSON.stringify(alert));
  await redis.ltrim(KEYS.alertHistory, 0, 499);

  return alert;
}

export async function getActiveAlerts(): Promise<RiskAlert[]> {
  try {
    const raw = await redis.lrange(KEYS.alerts, 0, 99);
    if (!raw || raw.length === 0) return [];

    return raw.map((item) => {
      if (typeof item === 'string') return JSON.parse(item) as RiskAlert;
      return item as RiskAlert;
    }).filter((a) => !a.acknowledged);
  } catch (e) {
    console.warn('Failed to fetch active alerts', e);
    return [];
  }
}

export async function acknowledgeAlert(alertId: string): Promise<boolean> {
  try {
    const raw = await redis.lrange(KEYS.alerts, 0, 99);
    if (!raw) return false;

    for (let i = 0; i < raw.length; i++) {
      const alert = typeof raw[i] === 'string' ? JSON.parse(raw[i] as string) : raw[i];
      if ((alert as RiskAlert).id === alertId) {
        (alert as RiskAlert).acknowledged = true;
        await redis.lset(KEYS.alerts, i, JSON.stringify(alert));
        return true;
      }
    }
  } catch (e) {
    console.warn(`Failed to acknowledge alert ${alertId}`, e);
  }
  return false;
}

export async function getAlertHistory(limit: number = 50): Promise<RiskAlert[]> {
  try {
    const raw = await redis.lrange(KEYS.alertHistory, 0, limit - 1);
    if (!raw || raw.length === 0) return [];

    return raw.map((item) => {
      if (typeof item === 'string') return JSON.parse(item) as RiskAlert;
      return item as RiskAlert;
    });
  } catch (e) {
    console.warn('Failed to fetch alert history', e);
    return [];
  }
}

// ============================================
// RISK DASHBOARD
// ============================================
export async function computeRiskDashboard(): Promise<RiskDashboard> {
  const config = await getRiskConfig();
  const counterparties = await getAllCounterparties();
  const alerts = await getActiveAlerts();
  const bufferPool = await getBufferPool();

  // Calculate totals
  let totalExposure = 0;
  const exposureByTier: Record<CounterpartyTier, number> = {
    bullion_bank: 0,
    otc_dealer: 0,
    central_bank: 0,
  };
  const exposureByMetal: Record<string, number> = {};
  const exposures: ExposureState[] = [];

  for (const cp of counterparties) {
    totalExposure += cp.currentExposureUSD;
    exposureByTier[cp.tier] = (exposureByTier[cp.tier] || 0) + cp.currentExposureUSD;

    const state = await getExposureState(cp.id);
    if (state) {
      exposures.push(state);
      for (const [metal, oz] of Object.entries(state.metalExposure)) {
        exposureByMetal[metal] = (exposureByMetal[metal] || 0) + oz;
      }
    }
  }

  // Sort by utilization (highest first)
  exposures.sort((a, b) => b.utilizationPercent - a.utilizationPercent);

  // Volatility state
  const metals = ['AUXG', 'AUXS', 'AUXPT', 'AUXPD'];
  const volatilityState: Record<string, { currentBps: number; maxBps: number; paused: boolean }> = {};
  for (const metal of metals) {
    volatilityState[metal] = await getVolatilityState(metal);
  }

  const dashboard: RiskDashboard = {
    totalPlatformExposureUSD: totalExposure,
    totalCounterparties: counterparties.length,
    activeCounterparties: counterparties.filter((cp) => cp.active).length,
    exposureByTier,
    exposureByMetal,
    topExposures: exposures.slice(0, 10),
    activeAlerts: alerts,
    bufferPool,
    volatilityState,
    computedAt: Date.now(),
  };

  // Cache dashboard
  await redis.set(KEYS.riskDashboard, dashboard);

  return dashboard;
}

export async function getCachedRiskDashboard(): Promise<RiskDashboard | null> {
  try {
    const raw = await redis.get(KEYS.riskDashboard);
    if (raw && typeof raw === 'object') return raw as RiskDashboard;
  } catch (_) {}
  return null;
}
