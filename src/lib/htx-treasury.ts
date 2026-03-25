// src/lib/htx-treasury.ts
// HTX Treasury Service - Business logic for exchange operations
// Handles crypto-to-USDT conversion, deposit processing, and balance tracking

import {
  getAccountBalance,
  getMarketTicker,
  createOrder,
  withdraw,
  getOrderStatus,
  type HTXBalance,
  type HTXTicker,
} from "./htx-client";
import { redis } from "./redis";

// ============================================
// TYPES
// ============================================

export interface ExchangeResult {
  success: boolean;
  orderId?: string;
  fromCrypto: string;
  fromAmount: number;
  toAmount?: number;
  rate?: number;
  error?: string;
}

export interface HTXBalanceSummary {
  currency: string;
  available: number;
  frozen: number;
  total: number;
}

export interface ExchangeRate {
  from: string;
  to: string;
  bid: number;
  ask: number;
  last: number;
  timestamp: number;
}

// ============================================
// SUPPORTED PAIRS
// ============================================

const USDT_PAIRS: Record<string, string> = {
  btc: "btcusdt",
  eth: "ethusdt",
  usdc: "usdcusdt",
};

// ============================================
// EXCHANGE OPERATIONS
// ============================================

/**
 * Exchange crypto to USDT on HTX
 * e.g. BTC -> USDT (sell BTC for USDT)
 * Tracks the exchange in Redis for audit/bank withdrawal reference
 */
export async function exchangeCryptoToUsd(
  crypto: string,
  amount: number
): Promise<ExchangeResult> {
  const cryptoLower = crypto.toLowerCase();
  const symbol = USDT_PAIRS[cryptoLower];

  if (!symbol) {
    return {
      success: false,
      fromCrypto: crypto,
      fromAmount: amount,
      error: `Unsupported crypto pair: ${crypto}/USDT`,
    };
  }

  try {
    // Get current rate for logging
    const ticker = await getMarketTicker(symbol);
    const estimatedUsdt = amount * ticker.bid;

    console.log(
      `[HTX Treasury] Selling ${amount} ${crypto.toUpperCase()} @ ~${ticker.bid} USDT = ~${estimatedUsdt.toFixed(2)} USDT`
    );

    // Place market sell order
    const orderId = await createOrder(symbol, "sell-market", amount);

    // Log to Redis for tracking
    const txRecord = {
      orderId,
      type: "crypto_to_usdt",
      from: crypto.toUpperCase(),
      to: "USDT",
      fromAmount: amount,
      estimatedToAmount: estimatedUsdt,
      rate: ticker.bid,
      status: "submitted",
      createdAt: new Date().toISOString(),
    };

    await redis.lpush("htx:treasury:transactions", JSON.stringify(txRecord));
    await redis.ltrim("htx:treasury:transactions", 0, 499);

    // Poll for completion (up to 30 seconds)
    let finalOrder = null;
    for (let i = 0; i < 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      try {
        const order = await getOrderStatus(orderId);
        if (order.state === "filled" || order.state === "partial-canceled") {
          finalOrder = order;
          break;
        }
        if (order.state === "canceled") {
          return {
            success: false,
            orderId,
            fromCrypto: crypto,
            fromAmount: amount,
            error: "Order was canceled",
          };
        }
      } catch {
        // Continue polling
      }
    }

    if (finalOrder) {
      const filledUsdt = parseFloat(finalOrder["field-cash-amount"]);
      const filledAmount = parseFloat(finalOrder["field-amount"]);
      const fees = parseFloat(finalOrder["field-fees"]);

      // Update Redis record
      const completedRecord = {
        ...txRecord,
        status: "filled",
        actualToAmount: filledUsdt,
        actualFromAmount: filledAmount,
        fees,
        completedAt: new Date().toISOString(),
      };
      await redis.set(`htx:order:${orderId}`, JSON.stringify(completedRecord), { ex: 86400 * 30 });

      return {
        success: true,
        orderId,
        fromCrypto: crypto,
        fromAmount: filledAmount,
        toAmount: filledUsdt,
        rate: filledUsdt / filledAmount,
      };
    }

    // Order submitted but not yet filled - return pending
    return {
      success: true,
      orderId,
      fromCrypto: crypto,
      fromAmount: amount,
      toAmount: estimatedUsdt,
      rate: ticker.bid,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[HTX Treasury] Exchange failed:`, message);
    return {
      success: false,
      fromCrypto: crypto,
      fromAmount: amount,
      error: message,
    };
  }
}

/**
 * Get live exchange rate from HTX
 * @param from - Source currency (e.g. "BTC", "ETH")
 * @param to - Target currency (e.g. "USDT")
 */
export async function getExchangeRate(
  from: string,
  to: string
): Promise<ExchangeRate> {
  const fromLower = from.toLowerCase();
  const toLower = to.toLowerCase();

  // Direct pair lookup
  let symbol = `${fromLower}${toLower}`;

  // Check if we have this as a known pair
  if (USDT_PAIRS[fromLower] && toLower === "usdt") {
    symbol = USDT_PAIRS[fromLower];
  }

  const ticker: HTXTicker = await getMarketTicker(symbol);

  return {
    from: from.toUpperCase(),
    to: to.toUpperCase(),
    bid: ticker.bid,
    ask: ticker.ask,
    last: ticker.close,
    timestamp: Date.now(),
  };
}

/**
 * Process a user deposit:
 * 1. User deposits crypto to platform address
 * 2. Platform sends crypto to HTX
 * 3. Exchange to USDT on HTX
 * 4. Track for future bank withdrawal
 *
 * @param userId - User wallet address or ID
 * @param crypto - Deposited cryptocurrency (e.g. "BTC", "ETH")
 * @param amount - Amount deposited
 */
export async function processUserDeposit(
  userId: string,
  crypto: string,
  amount: number
): Promise<{
  success: boolean;
  exchangeResult?: ExchangeResult;
  error?: string;
}> {
  try {
    console.log(
      `[HTX Treasury] Processing deposit: ${amount} ${crypto.toUpperCase()} from user ${userId}`
    );

    // Log deposit event
    const depositRecord = {
      userId,
      crypto: crypto.toUpperCase(),
      amount,
      status: "processing",
      step: "exchange",
      createdAt: new Date().toISOString(),
    };
    await redis.lpush("htx:deposits:log", JSON.stringify(depositRecord));
    await redis.ltrim("htx:deposits:log", 0, 999);

    // Exchange crypto to USDT on HTX
    const exchangeResult = await exchangeCryptoToUsd(crypto, amount);

    if (!exchangeResult.success) {
      // Update deposit record
      const failedRecord = {
        ...depositRecord,
        status: "exchange_failed",
        error: exchangeResult.error,
        updatedAt: new Date().toISOString(),
      };
      await redis.lpush("htx:deposits:log", JSON.stringify(failedRecord));

      return {
        success: false,
        exchangeResult,
        error: `Exchange failed: ${exchangeResult.error}`,
      };
    }

    // Update deposit record with success
    const successRecord = {
      ...depositRecord,
      status: "exchanged",
      orderId: exchangeResult.orderId,
      usdtAmount: exchangeResult.toAmount,
      rate: exchangeResult.rate,
      updatedAt: new Date().toISOString(),
    };
    await redis.lpush("htx:deposits:log", JSON.stringify(successRecord));

    // Track total USDT available for bank withdrawal
    if (exchangeResult.toAmount) {
      await redis.hincrbyfloat(
        "htx:treasury:totals",
        "usdt_from_deposits",
        exchangeResult.toAmount
      );
    }

    return {
      success: true,
      exchangeResult,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[HTX Treasury] processUserDeposit failed:`, message);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Get current HTX account balances, summarized per currency
 */
export async function getHTXBalances(): Promise<HTXBalanceSummary[]> {
  const accountData = await getAccountBalance();
  const balanceMap = new Map<string, { available: number; frozen: number }>();

  for (const item of accountData.list) {
    const bal = parseFloat(item.balance);
    if (bal === 0) continue;

    const existing = balanceMap.get(item.currency) || { available: 0, frozen: 0 };

    if (item.type === "trade") {
      existing.available += bal;
    } else if (item.type === "frozen") {
      existing.frozen += bal;
    }

    balanceMap.set(item.currency, existing);
  }

  const summaries: HTXBalanceSummary[] = [];
  for (const [currency, { available, frozen }] of balanceMap) {
    summaries.push({
      currency: currency.toUpperCase(),
      available,
      frozen,
      total: available + frozen,
    });
  }

  // Sort by total descending
  summaries.sort((a, b) => b.total - a.total);

  return summaries;
}

/**
 * Get recent HTX treasury transactions from Redis log
 */
export async function getRecentTransactions(
  limit: number = 20
): Promise<Array<Record<string, unknown>>> {
  const raw = await redis.lrange("htx:treasury:transactions", 0, limit - 1);
  return raw.map((item) => {
    if (typeof item === "string") {
      return JSON.parse(item);
    }
    return item as Record<string, unknown>;
  });
}

/**
 * Get treasury totals from Redis
 */
export async function getTreasuryTotals(): Promise<Record<string, number>> {
  const data = await redis.hgetall("htx:treasury:totals") as Record<string, string> | null;
  if (!data) return {};

  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(data)) {
    result[key] = parseFloat(String(value)) || 0;
  }
  return result;
}
