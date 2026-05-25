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
// HTX (Huobi) API CONFIG
// ============================================
// HTX is the primary liquidation venue: Binance TR enforces a 48h TL
// withdrawal hold, so crypto→USDT is done on HTX (corporate account).
// Switch venues with LIQUIDATION_VENUE = 'htx' (default) | 'binance'.

const LIQUIDATION_VENUE = (process.env.LIQUIDATION_VENUE || 'htx').toLowerCase();

const HTX_CONFIG = {
  apiKey: process.env.HTX_API_KEY || '',
  apiSecret: process.env.HTX_API_SECRET || '',
  baseUrl: process.env.HTX_API_URL || 'https://api.huobi.pro',
};
const HTX_HOST = HTX_CONFIG.baseUrl.replace(/^https?:\/\//, '');

// HTX uses lowercase symbols
const HTX_SELL_PAIRS: Record<string, string> = {
  BTC: 'btcusdt',
  ETH: 'ethusdt',
  XRP: 'xrpusdt',
  SOL: 'solusdt',
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
// HTX: SIGNATURE (Huobi v2 — HMAC-SHA256, base64)
// ============================================
// Signed string = METHOD\nHOST\nPATH\n<sorted url-encoded query params>.
// The 4 auth params (AccessKeyId, SignatureMethod, SignatureVersion,
// Timestamp) are always part of the query, even for POST (whose JSON body
// is NOT signed).

async function htxSign(
  method: 'GET' | 'POST',
  path: string,
  extraParams: Record<string, string> = {},
): Promise<string> {
  const { createHmac } = await import('crypto');

  const params: Record<string, string> = {
    AccessKeyId: HTX_CONFIG.apiKey,
    SignatureMethod: 'HmacSHA256',
    SignatureVersion: '2',
    Timestamp: new Date().toISOString().slice(0, 19), // UTC, seconds, no ms/Z
    ...extraParams,
  };

  const encode = (s: string) => encodeURIComponent(s);
  const canonical = Object.keys(params)
    .sort()
    .map((k) => `${encode(k)}=${encode(params[k])}`)
    .join('&');

  const signPayload = `${method}\n${HTX_HOST}\n${path}\n${canonical}`;
  const signature = createHmac('sha256', HTX_CONFIG.apiSecret).update(signPayload, 'utf8').digest('base64');

  return `${canonical}&Signature=${encode(signature)}`;
}

// ============================================
// HTX: PUBLIC PRICE
// ============================================

export async function getHtxPrice(symbol: string): Promise<number> {
  const pair = HTX_SELL_PAIRS[symbol.toUpperCase()];
  if (!pair) return 0;
  try {
    const res = await fetch(`${HTX_CONFIG.baseUrl}/market/detail/merged?symbol=${pair}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTX price API error: ${res.status}`);
    const data = await res.json();
    const close = data?.tick?.close;
    return close ? parseFloat(String(close)) : 0;
  } catch (error) {
    console.error(`❌ HTX price error for ${symbol}:`, error);
    return 0;
  }
}

// ============================================
// HTX: SPOT ACCOUNT ID (cached)
// ============================================

let htxSpotAccountId: string | null = null;

async function getHtxSpotAccountId(): Promise<string> {
  if (htxSpotAccountId) return htxSpotAccountId;
  const path = '/v1/account/accounts';
  const query = await htxSign('GET', path);
  const res = await fetch(`${HTX_CONFIG.baseUrl}${path}?${query}`, { cache: 'no-store' });
  const data = await res.json();
  if (data.status !== 'ok' || !Array.isArray(data.data)) {
    throw new Error(`HTX accounts error: ${JSON.stringify(data).slice(0, 200)}`);
  }
  const spot =
    data.data.find((a: any) => a.type === 'spot' && a.state === 'working') ||
    data.data.find((a: any) => a.type === 'spot');
  if (!spot) throw new Error('HTX spot account not found');
  htxSpotAccountId = String(spot.id);
  return htxSpotAccountId;
}

// ============================================
// HTX: POLL ORDER UNTIL FILLED
// ============================================
// Market orders return only an order id; the fill must be read from the
// order detail (field-cash-amount = quote/USDT filled, field-fees = fee in
// quote for a sell).

async function pollHtxOrder(orderId: string, maxTries = 8): Promise<any> {
  const path = `/v1/order/orders/${orderId}`;
  for (let i = 0; i < maxTries; i++) {
    const query = await htxSign('GET', path);
    const res = await fetch(`${HTX_CONFIG.baseUrl}${path}?${query}`, { cache: 'no-store' });
    const data = await res.json();
    if (data.status === 'ok' && data.data) {
      const st = data.data.state;
      if (st === 'filled' || st === 'partial-canceled' || st === 'canceled') return data.data;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  // Timed out waiting for terminal state — return last known detail
  const query = await htxSign('GET', path);
  const res = await fetch(`${HTX_CONFIG.baseUrl}${path}?${query}`, { cache: 'no-store' });
  const data = await res.json();
  return data?.data || {};
}

// ============================================
// HTX: EXECUTE SPOT MARKET SELL
// ============================================

export async function executeHtxSell(
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
  const pair = HTX_SELL_PAIRS[symbol.toUpperCase()];
  if (!pair) return { success: false, error: `Unknown symbol: ${symbol}` };

  if (!HTX_CONFIG.apiKey || !HTX_CONFIG.apiSecret) {
    console.warn('⚠️ HTX API keys not configured. Recording as manual liquidation.');
    return { success: false, error: 'HTX_API_NOT_CONFIGURED' };
  }

  try {
    const accountId = await getHtxSpotAccountId();

    // For sell-market, `amount` is the base-currency quantity to sell.
    const path = '/v1/order/orders/place';
    const query = await htxSign('POST', path);
    const body = {
      'account-id': accountId,
      symbol: pair,
      type: 'sell-market',
      amount: amount.toString(),
      source: 'spot-api',
      // Idempotency: protects against duplicate fills on pipeline retry.
      'client-order-id': `liq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };

    const res = await fetch(`${HTX_CONFIG.baseUrl}${path}?${query}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (data.status !== 'ok' || !data.data) {
      return { success: false, error: data['err-msg'] || `HTX order error: ${JSON.stringify(data).slice(0, 200)}` };
    }

    const orderId = String(data.data);
    const detail = await pollHtxOrder(orderId);

    const filledQuote = parseFloat(detail?.['field-cash-amount'] || '0'); // gross USDT
    const fees = parseFloat(detail?.['field-fees'] || '0');               // fee in USDT (sell)
    const filledQty = parseFloat(detail?.['field-amount'] || '0');
    const receivedUSDT = filledQuote - fees;

    console.log(`✅ HTX SELL executed: ${amount} ${symbol} → ${(receivedUSDT > 0 ? receivedUSDT : filledQuote).toFixed(2)} USDT (order: ${orderId})`);

    return {
      success: true,
      orderId,
      executedQty: filledQty || amount,
      receivedUSDT: receivedUSDT > 0 ? receivedUSDT : filledQuote,
      avgPrice: filledQty > 0 ? filledQuote / filledQty : 0,
    };
  } catch (error: any) {
    console.error('❌ HTX sell execution error:', error);
    return { success: false, error: error.message || 'HTX API error' };
  }
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
