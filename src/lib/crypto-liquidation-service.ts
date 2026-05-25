// ============================================
// CRYPTO LIQUIDATION SERVICE
// ============================================
// Converts received crypto (BTC, ETH, XRP, SOL) → USDT
// Uses Binance spot market sell orders
//
// Flow:
//   1. User pays BTC for metal → BTC lands in our custody
//   2. This service sells BTC → USDT on Binance
//   3. USDT is then available for KuveytTürk procurement
//
// For AUXM payments → no conversion needed (already USD-pegged)
// For USDT payments → no conversion needed (already USDT)
// ============================================

import { Redis } from '@upstash/redis';
import { getMarketTicker } from './htx-client';
import { exchangeCryptoToUsd } from './htx-treasury';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ============================================
// TYPES
// ============================================

export interface LiquidationOrder {
  id: string;
  procurementId: string;
  fromToken: string;         // BTC, ETH, XRP, SOL
  fromAmount: number;
  toToken: string;           // USDT
  expectedUSDT: number;      // Based on price at trade time
  actualUSDT?: number;       // Actual amount received
  exchange: string;           // 'binance'
  exchangeOrderId?: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  rate?: number;              // Actual execution rate
  slippage?: number;          // Slippage from expected
  createdAt: number;
  completedAt?: number;
  error?: string;
}

// ============================================
// BINANCE API CONFIG
// ============================================

const BINANCE_CONFIG = {
  apiKey: process.env.BINANCE_API_KEY || '',
  apiSecret: process.env.BINANCE_API_SECRET || '',
  baseUrl: process.env.BINANCE_API_URL || 'https://api.binance.com',
};

// Symbol mapping for Binance spot market
const BINANCE_SELL_PAIRS: Record<string, string> = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
  XRP: 'XRPUSDT',
  SOL: 'SOLUSDT',
};

// ============================================
// HTX (Huobi) LIQUIDATION VENUE
// ============================================
// HTX is the primary liquidation venue: Binance TR enforces a 48h TL
// withdrawal hold, so crypto→USDT is done on HTX (corporate account).
// Switch venues with LIQUIDATION_VENUE = 'htx' (default) | 'binance'.
// The actual HTX calls reuse the shared htx-client / htx-treasury (one HTX
// client, env HTX_ACCESS_KEY/HTX_SECRET_KEY, fee + audit tracking) — no
// private adapter here.

const LIQUIDATION_VENUE = (process.env.LIQUIDATION_VENUE || 'htx').toLowerCase();

// HTX uses lowercase USDT-quote symbols. Kept in sync with htx-treasury.
const HTX_PRICE_PAIRS: Record<string, string> = {
  BTC: 'btcusdt',
  ETH: 'ethusdt',
};

// Tokens that don't need conversion (already USD-denominated)
const NO_CONVERSION_TOKENS = ['USDT', 'USDC', 'AUXM'];

// ============================================
// CORE: CHECK IF CONVERSION NEEDED
// ============================================

export function needsConversion(token: string): boolean {
  return !NO_CONVERSION_TOKENS.includes(token.toUpperCase());
}

// ============================================
// CORE: GET CURRENT PRICE FROM BINANCE
// ============================================

export async function getBinancePrice(symbol: string): Promise<number> {
  try {
    const pair = BINANCE_SELL_PAIRS[symbol.toUpperCase()];
    if (!pair) throw new Error(`Unknown symbol: ${symbol}`);

    const response = await fetch(
      `${BINANCE_CONFIG.baseUrl}/api/v3/ticker/price?symbol=${pair}`,
      { cache: 'no-store' }
    );

    if (!response.ok) throw new Error(`Binance price API error: ${response.status}`);

    const data = await response.json();
    return parseFloat(data.price);
  } catch (error) {
    console.error(`❌ Binance price error for ${symbol}:`, error);
    return 0;
  }
}

// ============================================
// CORE: EXECUTE SPOT MARKET SELL
// ============================================
// Sells crypto on Binance spot market for USDT
// Uses MARKET order for immediate execution

export async function executeBinanceSell(
  symbol: string,
  amount: number,
): Promise<{
  success: boolean;
  orderId?: string;
  executedQty?: number;
  receivedUSDT?: number;
  avgPrice?: number;
  error?: string;
}> {
  const pair = BINANCE_SELL_PAIRS[symbol.toUpperCase()];
  if (!pair) {
    return { success: false, error: `Unknown symbol: ${symbol}` };
  }

  // Check if API keys are configured
  if (!BINANCE_CONFIG.apiKey || !BINANCE_CONFIG.apiSecret) {
    console.warn('⚠️ Binance API keys not configured. Recording as manual liquidation.');
    return {
      success: false,
      error: 'BINANCE_API_NOT_CONFIGURED',
    };
  }

  try {
    const timestamp = Date.now();

    // Build query string
    const params = new URLSearchParams({
      symbol: pair,
      side: 'SELL',
      type: 'MARKET',
      quantity: amount.toString(),
      timestamp: timestamp.toString(),
    });

    // Create HMAC signature
    const { createHmac } = await import('crypto');
    const signature = createHmac('sha256', BINANCE_CONFIG.apiSecret)
      .update(params.toString())
      .digest('hex');

    params.append('signature', signature);

    // Execute order
    const response = await fetch(`${BINANCE_CONFIG.baseUrl}/api/v3/order`, {
      method: 'POST',
      headers: {
        'X-MBX-APIKEY': BINANCE_CONFIG.apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Binance order error:', data);
      return {
        success: false,
        error: data.msg || `Binance error: ${response.status}`,
      };
    }

    // Calculate received USDT from fills
    let totalUSDT = 0;
    let totalQty = 0;
    if (data.fills && Array.isArray(data.fills)) {
      for (const fill of data.fills) {
        totalUSDT += parseFloat(fill.price) * parseFloat(fill.qty);
        totalQty += parseFloat(fill.qty);
      }
    }

    console.log(`✅ Binance SELL executed: ${amount} ${symbol} → ${totalUSDT.toFixed(2)} USDT (order: ${data.orderId})`);

    return {
      success: true,
      orderId: data.orderId?.toString(),
      executedQty: totalQty || parseFloat(data.executedQty || '0'),
      receivedUSDT: totalUSDT || parseFloat(data.cummulativeQuoteQty || '0'),
      avgPrice: totalQty > 0 ? totalUSDT / totalQty : 0,
    };
  } catch (error: any) {
    console.error('❌ Binance sell execution error:', error);
    return {
      success: false,
      error: error.message || 'Binance API error',
    };
  }
}

// ============================================
// HTX: PRICE + SELL (via shared htx-client / htx-treasury)
// ============================================
// No private HTX adapter here — reuse the canonical client/treasury so there
// is a single HTX integration (one signing impl, env HTX_ACCESS_KEY, fee +
// Redis audit tracking).

export async function getHtxPrice(symbol: string): Promise<number> {
  const pair = HTX_PRICE_PAIRS[symbol.toUpperCase()];
  if (!pair) return 0;
  try {
    const ticker = await getMarketTicker(pair);
    return ticker?.close ? Number(ticker.close) : 0;
  } catch (error) {
    console.error(`❌ HTX price error for ${symbol}:`, error);
    return 0;
  }
}

async function executeHtxSell(
  symbol: string,
  amount: number,
): Promise<{
  success: boolean;
  orderId?: string;
  executedQty?: number;
  receivedUSDT?: number;
  avgPrice?: number;
  error?: string;
}> {
  // Keys missing → standard sentinel so executeLiquidation keeps it pending
  // for manual processing (rather than throwing).
  if (!process.env.HTX_ACCESS_KEY || !process.env.HTX_SECRET_KEY) {
    console.warn('⚠️ HTX API keys not configured. Recording as manual liquidation.');
    return { success: false, error: 'HTX_API_NOT_CONFIGURED' };
  }

  // Delegate to the canonical treasury path: market sell + fill poll + fee
  // capture + Redis audit are all handled there.
  const r = await exchangeCryptoToUsd(symbol, amount);
  if (!r.success) return { success: false, error: r.error };

  return {
    success: true,
    orderId: r.orderId,
    executedQty: r.fromAmount,
    receivedUSDT: r.toAmount,
    avgPrice: r.rate,
  };
}

// ============================================
// VENUE ROUTING
// ============================================
// One switch (LIQUIDATION_VENUE) selects the price source + sell venue so
// the rest of the pipeline stays venue-agnostic.

export async function getCryptoSpotPrice(symbol: string): Promise<number> {
  return LIQUIDATION_VENUE === 'binance' ? getBinancePrice(symbol) : getHtxPrice(symbol);
}

async function executeVenueSell(symbol: string, amount: number) {
  return LIQUIDATION_VENUE === 'binance'
    ? executeBinanceSell(symbol, amount)
    : executeHtxSell(symbol, amount);
}

// ============================================
// LIQUIDATION ORDER MANAGEMENT
// ============================================

export async function createLiquidationOrder(
  procurementId: string,
  fromToken: string,
  fromAmount: number,
  expectedUSDT: number,
): Promise<LiquidationOrder> {
  const id = `LIQ-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  const order: LiquidationOrder = {
    id,
    procurementId,
    fromToken: fromToken.toUpperCase(),
    fromAmount,
    toToken: 'USDT',
    expectedUSDT,
    exchange: LIQUIDATION_VENUE,
    status: 'pending',
    createdAt: Date.now(),
  };

  await redis.set(`liquidation:order:${id}`, JSON.stringify(order), { ex: 86400 * 7 });
  await redis.lpush('liquidation:pending', id);

  console.log(`💱 Liquidation order created: ${id} | ${fromAmount} ${fromToken} → ~${expectedUSDT.toFixed(2)} USDT`);

  return order;
}

export async function executeLiquidation(orderId: string): Promise<LiquidationOrder | null> {
  const raw = await redis.get(`liquidation:order:${orderId}`);
  if (!raw) return null;

  const order: LiquidationOrder = typeof raw === 'string' ? JSON.parse(raw) : raw as LiquidationOrder;

  if (order.status !== 'pending') {
    console.warn(`Liquidation ${orderId} is already ${order.status}`);
    return order;
  }

  // Update status
  order.status = 'executing';
  await redis.set(`liquidation:order:${orderId}`, JSON.stringify(order), { ex: 86400 * 7 });

  // Execute the sell on the active venue (HTX by default, Binance optional)
  const result = await executeVenueSell(order.fromToken, order.fromAmount);

  if (result.success) {
    order.status = 'completed';
    order.exchangeOrderId = result.orderId;
    order.actualUSDT = result.receivedUSDT;
    order.rate = result.avgPrice;
    order.completedAt = Date.now();

    if (order.expectedUSDT > 0 && result.receivedUSDT) {
      order.slippage = ((order.expectedUSDT - result.receivedUSDT) / order.expectedUSDT) * 100;
    }

    await redis.lrem('liquidation:pending', 1, orderId);
    console.log(`✅ Liquidation completed: ${orderId} | ${order.fromAmount} ${order.fromToken} → ${result.receivedUSDT?.toFixed(2)} USDT`);
  } else {
    if (result.error?.endsWith('_API_NOT_CONFIGURED')) {
      // Mark for manual processing (venue API keys not set)
      order.status = 'pending';
      order.error = `${order.exchange.toUpperCase()} API not configured - manual liquidation required`;
      console.warn(`⚠️ Liquidation ${orderId}: ${order.exchange} not configured, keeping as pending for manual processing`);
    } else {
      order.status = 'failed';
      order.error = result.error;
      await redis.lrem('liquidation:pending', 1, orderId);
      console.error(`❌ Liquidation failed: ${orderId} | ${result.error}`);
    }
  }

  await redis.set(`liquidation:order:${orderId}`, JSON.stringify(order), { ex: 86400 * 7 });
  return order;
}

// ============================================
// BATCH LIQUIDATION
// ============================================
// Process all pending liquidations for a token

export async function processPendingLiquidations(token?: string): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const ids = await redis.lrange('liquidation:pending', 0, -1);
  let processed = 0, succeeded = 0, failed = 0;

  for (const id of ids) {
    const raw = await redis.get(`liquidation:order:${id as string}`);
    if (!raw) continue;

    const order: LiquidationOrder = typeof raw === 'string' ? JSON.parse(raw) : raw as LiquidationOrder;

    // Filter by token if specified
    if (token && order.fromToken !== token.toUpperCase()) continue;

    const result = await executeLiquidation(id as string);
    processed++;

    if (result?.status === 'completed') {
      succeeded++;
    } else if (result?.status === 'failed') {
      failed++;
    }
  }

  return { processed, succeeded, failed };
}

// ============================================
// GET LIQUIDATION ORDER
// ============================================

export async function getLiquidationOrder(orderId: string): Promise<LiquidationOrder | null> {
  const raw = await redis.get(`liquidation:order:${orderId}`);
  if (!raw) return null;
  return typeof raw === 'string' ? JSON.parse(raw) : raw as LiquidationOrder;
}
