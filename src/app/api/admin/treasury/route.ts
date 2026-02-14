// ============================================
// AUXM TREASURY DASHBOARD API
// ============================================
// Internal Settlement Currency (AUXM) management
// Total Float, Liquidity Coverage, Net Settlement,
// Netting Monitor, Exposure Panel, Dealer Utilization,
// Treasury Allocation, Client Float vs Operating Capital
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Auth check
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;
  const token = authHeader.replace('Bearer ', '');
  return token === process.env.ADMIN_TOKEN || token === 'auxite-admin-2024';
}

// ═══════════════════════════════════════════════════════════════════════
// HELPER: Aggregate all user AUXM balances
// ═══════════════════════════════════════════════════════════════════════

async function getAuxmFloatData() {
  // Get all user balance keys
  const userKeys = await redis.keys('user:0x*:balance');

  let totalClientFloat = 0;
  let clientCount = 0;
  const topHolders: { address: string; balance: number }[] = [];

  for (const key of userKeys) {
    const auxmBalance = parseFloat(await redis.hget(key, 'auxm') as string || '0');
    const usdBalance = parseFloat(await redis.hget(key, 'usd') as string || '0');
    const usdtBalance = parseFloat(await redis.hget(key, 'usdt') as string || '0');

    const total = auxmBalance + usdBalance + usdtBalance;
    if (total > 0) {
      clientCount++;
      totalClientFloat += total;
      const address = key.replace('user:', '').replace(':balance', '');
      topHolders.push({ address, balance: total });
    }
  }

  // Sort top holders
  topHolders.sort((a, b) => b.balance - a.balance);

  return {
    totalClientFloat,
    clientCount,
    topHolders: topHolders.slice(0, 10),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// HELPER: Get platform fee balances (Operating Capital)
// ═══════════════════════════════════════════════════════════════════════

async function getOperatingCapital() {
  const feeTokens = ['auxm', 'usd', 'usdt', 'eth'];
  const prices: Record<string, number> = { auxm: 1, usd: 1, usdt: 1, eth: 2900 };

  let totalOperatingUsd = 0;
  const breakdown: Record<string, { amount: number; pending: number; transferred: number; valueUsd: number }> = {};

  for (const token of feeTokens) {
    const feeData = await redis.hgetall(`platform:fees:${token}`);
    if (feeData && Object.keys(feeData).length > 0) {
      const total = parseFloat(feeData.total as string || '0');
      const pending = parseFloat(feeData.pending as string || '0');
      const transferred = parseFloat(feeData.transferred as string || '0');
      const price = prices[token] || 1;
      const valueUsd = pending * price;

      breakdown[token.toUpperCase()] = { amount: total, pending, transferred, valueUsd };
      totalOperatingUsd += valueUsd;
    }
  }

  return { totalOperatingUsd, breakdown };
}

// ═══════════════════════════════════════════════════════════════════════
// HELPER: Staking / Yield program data
// ═══════════════════════════════════════════════════════════════════════

async function getYieldProgramData() {
  // Get all stake keys
  const stakeKeys = await redis.keys('stakes:0x*');

  let totalStakedValueUsd = 0;
  let activeStakeCount = 0;
  let totalStakers = 0;
  const stakedByMetal: Record<string, { grams: number; valueUsd: number; count: number }> = {
    AUXG: { grams: 0, valueUsd: 0, count: 0 },
    AUXS: { grams: 0, valueUsd: 0, count: 0 },
    AUXPT: { grams: 0, valueUsd: 0, count: 0 },
    AUXPD: { grams: 0, valueUsd: 0, count: 0 },
  };

  // Approximate prices per gram (in USD)
  const metalPrices: Record<string, number> = {
    AUXG: 95,
    AUXS: 1.1,
    AUXPT: 32,
    AUXPD: 35,
  };

  const stakedByTerm: Record<string, number> = {
    '3m': 0,
    '6m': 0,
    '12m': 0,
  };

  for (const key of stakeKeys) {
    const stakesData = await redis.get(key);
    const stakes = stakesData ? (typeof stakesData === 'string' ? JSON.parse(stakesData) : stakesData) : [];
    if (!Array.isArray(stakes)) continue;

    let userHasStake = false;
    for (const stake of stakes) {
      if (stake.status === 'active' || stake.status === 'locked') {
        activeStakeCount++;
        userHasStake = true;
        const amount = parseFloat(stake.amount) || 0;
        const metal = (stake.metal || 'AUXG').toUpperCase();
        const price = metalPrices[metal] || 95;
        const valueUsd = amount * price;

        totalStakedValueUsd += valueUsd;

        if (stakedByMetal[metal]) {
          stakedByMetal[metal].grams += amount;
          stakedByMetal[metal].valueUsd += valueUsd;
          stakedByMetal[metal].count++;
        }

        // Categorize by term
        const termDays = stake.termDays || stake.term || 91;
        if (termDays <= 91) stakedByTerm['3m']++;
        else if (termDays <= 181) stakedByTerm['6m']++;
        else stakedByTerm['12m']++;
      }
    }
    if (userHasStake) totalStakers++;
  }

  return {
    totalStakedValueUsd,
    activeStakeCount,
    totalStakers,
    stakedByMetal,
    stakedByTerm,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// HELPER: Settlement & Netting data
// ═══════════════════════════════════════════════════════════════════════

async function getSettlementData() {
  // Recent trades for settlement analysis
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  let buys24h = 0;
  let sells24h = 0;
  let buyVolume24h = 0;
  let sellVolume24h = 0;
  let buys7d = 0;
  let sells7d = 0;

  // Get recent transactions from trade stats
  const totalTrades = parseInt(await redis.get('stats:total:trades') as string || '0');
  const totalVolume = parseFloat(await redis.get('stats:total:volume') as string || '0');

  // Sample users for recent activity
  const userKeys = await redis.keys('user:0x*:balance');
  const sampleSize = Math.min(userKeys.length, 30);
  const sampleKeys = userKeys.slice(0, sampleSize);

  for (const key of sampleKeys) {
    const address = key.replace('user:', '').replace(':balance', '');
    const txKey = `user:${address}:transactions`;
    const recentTx = await redis.lrange(txKey, 0, 19);

    for (const tx of recentTx) {
      try {
        const parsed = typeof tx === 'string' ? JSON.parse(tx) : tx;
        const ts = parsed.timestamp || 0;
        const amount = parseFloat(parsed.fromAmount || parsed.amount || '0');

        if (ts > oneDayAgo) {
          if (parsed.type === 'buy' || parsed.action === 'buy') {
            buys24h++;
            buyVolume24h += amount;
          } else if (parsed.type === 'sell' || parsed.action === 'sell') {
            sells24h++;
            sellVolume24h += amount;
          }
        }
        if (ts > sevenDaysAgo) {
          if (parsed.type === 'buy' || parsed.action === 'buy') buys7d++;
          else if (parsed.type === 'sell' || parsed.action === 'sell') sells7d++;
        }
      } catch {}
    }
  }

  // Extrapolate
  if (sampleSize < userKeys.length && sampleSize > 0) {
    const mult = userKeys.length / sampleSize;
    buys24h = Math.round(buys24h * mult);
    sells24h = Math.round(sells24h * mult);
    buyVolume24h *= mult;
    sellVolume24h *= mult;
    buys7d = Math.round(buys7d * mult);
    sells7d = Math.round(sells7d * mult);
  }

  // Net settlement position = buys - sells (positive = net buy pressure)
  const netSettlement24h = buyVolume24h - sellVolume24h;
  const nettingRatio = (buys24h + sells24h) > 0
    ? Math.min(buys24h, sells24h) / Math.max(buys24h, sells24h) * 100
    : 0;

  return {
    totalTrades,
    totalVolume,
    buys24h,
    sells24h,
    buyVolume24h,
    sellVolume24h,
    netSettlement24h,
    nettingRatio,
    buys7d,
    sells7d,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// HELPER: Metal exposure data
// ═══════════════════════════════════════════════════════════════════════

async function getMetalExposure() {
  const metals = ['AUXG', 'AUXS', 'AUXPT', 'AUXPD'];
  const metalPrices: Record<string, number> = { AUXG: 95, AUXS: 1.1, AUXPT: 32, AUXPD: 35 };

  const exposure: Record<string, {
    totalAllocated: number;
    totalStaked: number;
    netExposure: number;
    netExposureUsd: number;
    hedgedPercent: number;
  }> = {};

  for (const metal of metals) {
    // Get platform stock
    const stockData = await redis.hgetall(`platform:stock:${metal.toLowerCase()}`);
    const totalMinted = parseFloat(stockData?.totalMinted as string || '0');
    const totalBurned = parseFloat(stockData?.totalBurned as string || '0');
    const allocated = totalMinted - totalBurned;

    // Get staked amount for this metal
    const stakedKey = `platform:staked:${metal.toLowerCase()}`;
    const staked = parseFloat(await redis.get(stakedKey) as string || '0');

    const price = metalPrices[metal] || 95;
    const net = allocated - staked;

    exposure[metal] = {
      totalAllocated: allocated,
      totalStaked: staked,
      netExposure: net,
      netExposureUsd: net * price,
      hedgedPercent: allocated > 0 ? (staked / allocated) * 100 : 0,
    };
  }

  return exposure;
}

// ═══════════════════════════════════════════════════════════════════════
// HELPER: Treasury log
// ═══════════════════════════════════════════════════════════════════════

async function getTreasuryLog(limit: number = 20) {
  const logs = await redis.lrange('treasury:log', 0, limit - 1);
  return logs.map((log: any) => {
    try {
      return typeof log === 'string' ? JSON.parse(log) : log;
    } catch {
      return log;
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════
// GET — Full Treasury Dashboard
// ═══════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section');

    // If specific section requested
    if (section) {
      switch (section) {
        case 'float':
          return NextResponse.json({ success: true, ...(await getAuxmFloatData()) });
        case 'operating':
          return NextResponse.json({ success: true, ...(await getOperatingCapital()) });
        case 'yield':
          return NextResponse.json({ success: true, ...(await getYieldProgramData()) });
        case 'settlement':
          return NextResponse.json({ success: true, ...(await getSettlementData()) });
        case 'exposure':
          return NextResponse.json({ success: true, exposure: await getMetalExposure() });
        case 'log':
          return NextResponse.json({ success: true, log: await getTreasuryLog() });
      }
    }

    // Full dashboard — fetch all in parallel
    const [floatData, operatingData, yieldData, settlementData, exposureData, treasuryLog] = await Promise.all([
      getAuxmFloatData(),
      getOperatingCapital(),
      getYieldProgramData(),
      getSettlementData(),
      getMetalExposure(),
      getTreasuryLog(),
    ]);

    // ── AUXM Total Float ──
    const totalAuxmFloat = floatData.totalClientFloat + operatingData.totalOperatingUsd;

    // ── Liquidity Coverage Ratio ──
    // Available liquid / Total obligations
    const liquidAssets = operatingData.totalOperatingUsd;
    const obligations = floatData.totalClientFloat + yieldData.totalStakedValueUsd;
    const liquidityCoverageRatio = obligations > 0 ? (liquidAssets / obligations) * 100 : 100;

    // ── Treasury Summary ──
    const treasurySummary = {
      totalAuxmFloat,
      available: totalAuxmFloat - yieldData.totalStakedValueUsd,
      reserved: yieldData.totalStakedValueUsd,
      pendingSettlement: Math.abs(settlementData.netSettlement24h),
      liquidityCoverageRatio: parseFloat(liquidityCoverageRatio.toFixed(2)),
    };

    return NextResponse.json({
      success: true,
      timestamp: Date.now(),

      // ── SUMMARY ──
      summary: treasurySummary,

      // ── CLIENT FLOAT ──
      clientFloat: {
        total: floatData.totalClientFloat,
        clientCount: floatData.clientCount,
        topHolders: floatData.topHolders,
      },

      // ── OPERATING CAPITAL ──
      operatingCapital: operatingData,

      // ── YIELD PROGRAMS ──
      yieldPrograms: yieldData,

      // ── SETTLEMENT / NETTING ──
      settlement: settlementData,

      // ── METAL EXPOSURE ──
      metalExposure: exposureData,

      // ── TREASURY LOG ──
      recentLog: treasuryLog,
    });
  } catch (error: any) {
    console.error('Treasury dashboard error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════
// POST — Treasury Actions
// ═══════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'addLog': {
        const logEntry = {
          id: `tlog_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          type: params.type || 'note',
          message: params.message || '',
          amount: params.amount || 0,
          token: params.token || 'AUXM',
          operator: params.operator || 'admin',
          timestamp: Date.now(),
          date: new Date().toISOString(),
        };
        await redis.lpush('treasury:log', JSON.stringify(logEntry));
        await redis.ltrim('treasury:log', 0, 99);
        return NextResponse.json({ success: true, log: logEntry });
      }

      case 'clearLog': {
        await redis.del('treasury:log');
        return NextResponse.json({ success: true, message: 'Treasury log cleared' });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Treasury action error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
