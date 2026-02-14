// ============================================
// CASH SETTLEMENT SERVICE
// Custody unwind — not trading, not redemption
// LBMA spot - exit spread, T+1 settlement
// ============================================

import { Redis } from '@upstash/redis';
import { getMetalPrices, getMetalPrice } from './price-cache';
import { getSettlementSpread, applyExitSpread } from './settlement-spread';
import crypto from 'crypto';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const DEFAULT_QUOTE_TTL = 120; // 120 seconds
const DEFAULT_DAILY_CAP = 500000; // $500,000 USD
const T1_HOURS = 24; // T+1 = 24 hours

// ── Interfaces ──

export interface SettlementQuote {
  id: string;
  address: string;
  metal: string;
  grams: number;
  spotPricePerGram: number;
  exitSpreadPercent: number;
  settlementPricePerGram: number;
  totalSettlementUSD: number;
  settlementRail: 'auxm' | 'usdt';
  expiresAt: number;
  createdAt: number;
  oracleSnapshot: {
    source: string;
    spotPriceOz: number;
    spotPriceGram: number;
    fetchedAt: number;
  };
}

export type SettlementStatus = 'price_locked' | 'pending_settlement' | 'treasury_processing' | 'completed' | 'failed';

export interface SettlementOrder {
  id: string;
  quoteId: string;
  address: string;
  metal: string;
  grams: number;
  spotPricePerGram: number;
  exitSpreadPercent: number;
  settlementPricePerGram: number;
  totalSettlementUSD: number;
  settlementRail: 'auxm' | 'usdt';
  status: SettlementStatus;
  statusHistory: Array<{ status: string; timestamp: number; note: string }>;
  proceedsCredited: boolean;
  createdAt: number;
  settledAt: number | null;
  oracleSnapshot: SettlementQuote['oracleSnapshot'];
}

// ── Configuration Helpers ──

async function getQuoteTTL(): Promise<number> {
  const ttl = await redis.get('config:settlement:quote_ttl');
  return ttl ? parseInt(ttl as string) : DEFAULT_QUOTE_TTL;
}

async function getDailyCap(): Promise<number> {
  const cap = await redis.get('config:settlement:daily_cap_usd');
  return cap ? parseFloat(cap as string) : DEFAULT_DAILY_CAP;
}

async function getDailyUsage(): Promise<{ totalUSD: number; orderCount: number }> {
  const today = new Date().toISOString().split('T')[0];
  const usage = await redis.get(`settlement:daily:${today}`);
  if (usage) {
    const parsed = typeof usage === 'string' ? JSON.parse(usage) : usage;
    return parsed;
  }
  return { totalUSD: 0, orderCount: 0 };
}

async function incrementDailyUsage(amountUSD: number): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const key = `settlement:daily:${today}`;
  const current = await getDailyUsage();
  await redis.setex(key, 172800, JSON.stringify({
    totalUSD: current.totalUSD + amountUSD,
    orderCount: current.orderCount + 1,
  }));
}

// ── Feature Flags ──

export async function isSettlementEnabled(): Promise<boolean> {
  const enabled = await redis.get('config:cash_settlement_enabled');
  if (enabled === false || enabled === 'false' || enabled === '0') return false;
  return true; // default enabled
}

export async function isRailEnabled(rail: string): Promise<boolean> {
  const enabled = await redis.get(`config:settlement:rail:${rail}`);
  if (enabled === false || enabled === 'false' || enabled === '0') return false;
  return true;
}

export async function getEnabledRails(): Promise<string[]> {
  const rails: string[] = [];
  if (await isRailEnabled('auxm')) rails.push('auxm');
  if (await isRailEnabled('usdt')) rails.push('usdt');
  return rails.length > 0 ? rails : ['auxm']; // fallback to AUXM
}

// ── Quote Creation ──

export async function createSettlementQuote(
  address: string,
  metal: string,
  grams: number,
  rail: 'auxm' | 'usdt'
): Promise<SettlementQuote> {
  // Validate rail
  if (!(await isRailEnabled(rail))) {
    throw new Error(`Settlement rail "${rail}" is not currently enabled`);
  }

  // Fetch LBMA spot price
  const prices = await getMetalPrices();
  const TROY_OZ = 31.1035;

  let spotPriceGram: number;
  let spotPriceOz: number;
  switch (metal.toUpperCase()) {
    case 'AUXG': spotPriceGram = prices.gold; spotPriceOz = prices.gold * TROY_OZ; break;
    case 'AUXS': spotPriceGram = prices.silver; spotPriceOz = prices.silver * TROY_OZ; break;
    case 'AUXPT': spotPriceGram = prices.platinum; spotPriceOz = prices.platinum * TROY_OZ; break;
    case 'AUXPD': spotPriceGram = prices.palladium; spotPriceOz = prices.palladium * TROY_OZ; break;
    default: throw new Error('Invalid metal');
  }

  // Get exit spread
  const exitSpreadPercent = await getSettlementSpread(metal);

  // Apply exit spread: settlement price = spot - spread%
  const settlementPricePerGram = applyExitSpread(spotPriceGram, exitSpreadPercent);
  const totalSettlementUSD = settlementPricePerGram * grams;

  const quoteTTL = await getQuoteTTL();

  const quote: SettlementQuote = {
    id: `SQ_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    address: address.toLowerCase(),
    metal: metal.toUpperCase(),
    grams,
    spotPricePerGram: spotPriceGram,
    exitSpreadPercent,
    settlementPricePerGram,
    totalSettlementUSD,
    settlementRail: rail,
    expiresAt: Date.now() + (quoteTTL * 1000),
    createdAt: Date.now(),
    oracleSnapshot: {
      source: 'goldapi',
      spotPriceOz,
      spotPriceGram: spotPriceGram,
      fetchedAt: Date.now(),
    },
  };

  // Store with TTL
  await redis.setex(`settlement:quote:${quote.id}`, quoteTTL, JSON.stringify(quote));

  // Link to user (overwrite previous)
  await redis.setex(`settlement:quote:user:${address.toLowerCase()}`, quoteTTL, quote.id);

  return quote;
}

// ── Quote Retrieval ──

export async function getSettlementQuote(quoteId: string): Promise<SettlementQuote | null> {
  const data = await redis.get(`settlement:quote:${quoteId}`);
  if (!data) return null;
  const quote: SettlementQuote = typeof data === 'string' ? JSON.parse(data) : data;
  if (Date.now() > quote.expiresAt) {
    await redis.del(`settlement:quote:${quoteId}`);
    return null;
  }
  return quote;
}

export function getQuoteTimeRemaining(quote: SettlementQuote): number {
  return Math.max(0, Math.floor((quote.expiresAt - Date.now()) / 1000));
}

// ── Settlement Execution ──

export async function executeSettlement(quoteId: string): Promise<SettlementOrder> {
  // 1. Validate quote
  const quote = await getSettlementQuote(quoteId);
  if (!quote) throw new Error('Settlement quote expired or not found. Please get a new quote.');

  const { address, metal, grams, totalSettlementUSD } = quote;

  // 2. Check daily cap
  const dailyCap = await getDailyCap();
  const dailyUsage = await getDailyUsage();
  if (dailyUsage.totalUSD + totalSettlementUSD > dailyCap) {
    throw new Error(`Daily settlement cap reached ($${dailyCap.toLocaleString()}). Please try again tomorrow.`);
  }

  // 3. Check balance & encumbrance
  const balKey = `user:${address}:balance`;
  const bal = parseFloat(await redis.hget(balKey, metal.toLowerCase()) as string || '0');

  let encumbered = 0;
  const stakesRaw = await redis.get(`stakes:${address}`);
  if (stakesRaw) {
    const stakes = typeof stakesRaw === 'string' ? JSON.parse(stakesRaw) : stakesRaw;
    if (Array.isArray(stakes)) {
      for (const s of stakes) {
        if ((s.metal || '').toUpperCase() === metal && (s.status === 'active' || s.status === 'locked')) {
          encumbered += parseFloat(s.amount) || 0;
        }
      }
    }
  }

  const available = bal - encumbered;
  if (grams > available) {
    throw new Error('Insufficient available balance (encumbered positions excluded)');
  }

  // 4. Deduct metal balance IMMEDIATELY (prevents double-spend)
  const newBal = bal - grams;
  await redis.hset(balKey, { [metal.toLowerCase()]: newBal.toString() });

  // 5. Create settlement order
  const orderId = `STLM_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  const order: SettlementOrder = {
    id: orderId,
    quoteId: quote.id,
    address,
    metal,
    grams,
    spotPricePerGram: quote.spotPricePerGram,
    exitSpreadPercent: quote.exitSpreadPercent,
    settlementPricePerGram: quote.settlementPricePerGram,
    totalSettlementUSD: quote.totalSettlementUSD,
    settlementRail: quote.settlementRail,
    status: 'price_locked',
    statusHistory: [
      { status: 'price_locked', timestamp: Date.now(), note: 'Settlement executed. Price locked. Metal deducted.' },
    ],
    proceedsCredited: false,
    createdAt: Date.now(),
    settledAt: null,
    oracleSnapshot: quote.oracleSnapshot,
  };

  // 6. Store order
  await redis.set(`settlement:order:${orderId}`, JSON.stringify(order));
  await redis.lpush(`settlement:orders:${address}`, orderId);
  await redis.lpush('settlement:orders:all', orderId);
  await redis.ltrim('settlement:orders:all', 0, 499);
  await redis.lpush('settlement:orders:pending', orderId);

  // 7. Increment daily usage
  await incrementDailyUsage(totalSettlementUSD);

  // 8. Consume quote (delete)
  await redis.del(`settlement:quote:${quote.id}`);

  // 9. Log to treasury
  const logEntry = {
    id: `tlog_${Date.now()}`,
    type: 'settlement',
    message: `CASH SETTLEMENT: ${grams}g ${metal} at $${quote.settlementPricePerGram.toFixed(2)}/g = $${totalSettlementUSD.toFixed(2)} via ${quote.settlementRail.toUpperCase()}`,
    amount: grams,
    token: metal,
    operator: 'system',
    timestamp: Date.now(),
    date: new Date().toISOString(),
  };
  await redis.lpush('treasury:log', JSON.stringify(logEntry));

  // 10. Log transaction for user
  const tx = {
    id: orderId,
    type: 'settlement',
    coin: metal,
    amount: grams,
    amountUsd: totalSettlementUSD,
    price: quote.settlementPricePerGram,
    fee: quote.spotPricePerGram * grams - totalSettlementUSD,
    status: 'pending',
    metadata: {
      method: 'cash_settlement',
      settlementRail: quote.settlementRail,
      exitSpread: quote.exitSpreadPercent,
      spotPrice: quote.spotPricePerGram,
      settlementPrice: quote.settlementPricePerGram,
    },
    createdAt: new Date().toISOString(),
    timestamp: Date.now(),
  };
  await redis.lpush(`user:${address}:transactions`, JSON.stringify(tx));

  return order;
}

// ── Order Retrieval ──

export async function getSettlementOrder(orderId: string): Promise<SettlementOrder | null> {
  const data = await redis.get(`settlement:order:${orderId}`);
  if (!data) return null;
  return (typeof data === 'string' ? JSON.parse(data) : data) as SettlementOrder;
}

export async function getUserSettlementOrders(address: string, limit = 20): Promise<SettlementOrder[]> {
  const orderIds = await redis.lrange(`settlement:orders:${address.toLowerCase()}`, 0, limit - 1);
  const orders: SettlementOrder[] = [];
  for (const id of orderIds) {
    const order = await getSettlementOrder(id as string);
    if (order) orders.push(order);
  }
  return orders;
}

export async function getPendingOrders(limit = 50): Promise<SettlementOrder[]> {
  const orderIds = await redis.lrange('settlement:orders:pending', 0, limit - 1);
  const orders: SettlementOrder[] = [];
  for (const id of orderIds) {
    const order = await getSettlementOrder(id as string);
    if (order && order.status !== 'completed' && order.status !== 'failed') {
      orders.push(order);
    }
  }
  return orders;
}

// ── Settlement Completion (T+1) ──

export async function completeSettlement(orderId: string): Promise<SettlementOrder> {
  const order = await getSettlementOrder(orderId);
  if (!order) throw new Error('Settlement order not found');
  if (order.status === 'completed') throw new Error('Settlement already completed');
  if (order.status === 'failed') throw new Error('Settlement has failed');

  // Credit proceeds based on rail
  const balKey = `user:${order.address}:balance`;
  const railKey = order.settlementRail === 'usdt' ? 'usdt' : 'auxm';
  const currentBal = parseFloat(await redis.hget(balKey, railKey) as string || '0');
  await redis.hset(balKey, { [railKey]: (currentBal + order.totalSettlementUSD).toString() });

  // Update order status
  order.status = 'completed';
  order.proceedsCredited = true;
  order.settledAt = Date.now();
  order.statusHistory.push({
    status: 'completed',
    timestamp: Date.now(),
    note: `Proceeds credited: $${order.totalSettlementUSD.toFixed(2)} ${order.settlementRail.toUpperCase()}`,
  });

  await redis.set(`settlement:order:${orderId}`, JSON.stringify(order));

  // Update user transaction status
  const txList = await redis.lrange(`user:${order.address}:transactions`, 0, 49);
  for (let i = 0; i < txList.length; i++) {
    const tx = typeof txList[i] === 'string' ? JSON.parse(txList[i] as string) : txList[i];
    if (tx.id === orderId) {
      tx.status = 'completed';
      await redis.lset(`user:${order.address}:transactions`, i, JSON.stringify(tx));
      break;
    }
  }

  // Log
  const logEntry = {
    id: `tlog_${Date.now()}`,
    type: 'settlement_complete',
    message: `SETTLEMENT COMPLETED: ${orderId} — $${order.totalSettlementUSD.toFixed(2)} ${order.settlementRail.toUpperCase()} credited to ${order.address.slice(0, 8)}...`,
    amount: order.totalSettlementUSD,
    token: order.settlementRail.toUpperCase(),
    operator: 'system',
    timestamp: Date.now(),
    date: new Date().toISOString(),
  };
  await redis.lpush('treasury:log', JSON.stringify(logEntry));

  return order;
}

export async function failSettlement(orderId: string, reason: string): Promise<SettlementOrder> {
  const order = await getSettlementOrder(orderId);
  if (!order) throw new Error('Settlement order not found');
  if (order.status === 'completed') throw new Error('Cannot fail a completed settlement');

  // Reverse: credit metal back
  const balKey = `user:${order.address}:balance`;
  const currentBal = parseFloat(await redis.hget(balKey, order.metal.toLowerCase()) as string || '0');
  await redis.hset(balKey, { [order.metal.toLowerCase()]: (currentBal + order.grams).toString() });

  order.status = 'failed';
  order.statusHistory.push({
    status: 'failed',
    timestamp: Date.now(),
    note: `Settlement failed: ${reason}. Metal balance reversed.`,
  });

  await redis.set(`settlement:order:${orderId}`, JSON.stringify(order));

  return order;
}

// ── Config for API responses ──

export async function getSettlementConfig() {
  const enabled = await isSettlementEnabled();
  const rails = await getEnabledRails();
  const dailyCap = await getDailyCap();
  const dailyUsage = await getDailyUsage();
  const quoteTTL = await getQuoteTTL();

  return {
    enabled,
    rails,
    dailyCap,
    dailyRemaining: Math.max(0, dailyCap - dailyUsage.totalUSD),
    dailyUsage: dailyUsage.totalUSD,
    dailyOrderCount: dailyUsage.orderCount,
    quoteTTL,
    settlementTimeline: 'T+1 (1 business day)',
    nonCancelable: true,
  };
}
