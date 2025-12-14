// src/lib/limit-orders.ts
// Limit Order Management for Auxite

import { getRedis, getUserBalance, incrementBalance, addTransaction } from './redis';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface LimitOrder {
  id: string;
  address: string;
  type: 'buy' | 'sell';
  metal: 'AUXG' | 'AUXS' | 'AUXPT' | 'AUXPD';
  grams: number;
  limitPrice: number; // USD per gram
  paymentMethod: 'AUXM' | 'USDT' | 'USD';
  status: 'pending' | 'filled' | 'partially_filled' | 'cancelled' | 'expired';
  filledGrams: number;
  filledAt?: string;
  txHash?: string;
  createdAt: string;
  expiresAt: string; // Default 7 days
  updatedAt: string;
}

export interface CreateOrderParams {
  address: string;
  type: 'buy' | 'sell';
  metal: 'AUXG' | 'AUXS' | 'AUXPT' | 'AUXPD';
  grams: number;
  limitPrice: number;
  paymentMethod?: 'AUXM' | 'USDT' | 'USD';
  expiresInDays?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REDIS KEYS
// ═══════════════════════════════════════════════════════════════════════════════

const KEYS = {
  order: (orderId: string) => `limit-order:${orderId}`,
  userOrders: (address: string) => `user:${address.toLowerCase()}:limit-orders`,
  pendingOrders: (metal: string) => `limit-orders:pending:${metal.toLowerCase()}`,
  allPendingOrders: () => `limit-orders:all-pending`,
};

// ═══════════════════════════════════════════════════════════════════════════════
// CREATE ORDER
// ═══════════════════════════════════════════════════════════════════════════════

export async function createLimitOrder(params: CreateOrderParams): Promise<{ 
  success: boolean; 
  order?: LimitOrder; 
  error?: string 
}> {
  try {
    const r = getRedis();
    
    // Validate params
    if (params.grams <= 0) {
      return { success: false, error: 'Invalid amount' };
    }
    if (params.limitPrice <= 0) {
      return { success: false, error: 'Invalid limit price' };
    }

    // Check user balance for buy orders
    if (params.type === 'buy') {
      const balance = await getUserBalance(params.address);
      const totalCost = params.grams * params.limitPrice;
      
      const paymentMethod = params.paymentMethod || 'AUXM';
      let availableBalance = 0;
      
      if (paymentMethod === 'AUXM') {
        availableBalance = balance.totalAuxm;
      } else if (paymentMethod === 'USDT') {
        availableBalance = balance.usdt;
      } else if (paymentMethod === 'USD') {
        availableBalance = balance.usd;
      }
      
      if (availableBalance < totalCost) {
        return { success: false, error: `Insufficient ${paymentMethod} balance. Need: $${totalCost.toFixed(2)}, Have: $${availableBalance.toFixed(2)}` };
      }
      
      // Reserve funds (lock them)
      const lockField = paymentMethod.toLowerCase() as 'auxm' | 'usdt' | 'usd';
      await incrementBalance(params.address, { [lockField]: -totalCost });
    }
    
    // Check metal balance for sell orders
    if (params.type === 'sell') {
      const balance = await getUserBalance(params.address);
      const metalKey = params.metal.toLowerCase() as 'auxg' | 'auxs' | 'auxpt' | 'auxpd';
      const metalBalance = balance[metalKey];
      
      if (metalBalance < params.grams) {
        return { success: false, error: `Insufficient ${params.metal} balance. Need: ${params.grams}g, Have: ${metalBalance.toFixed(4)}g` };
      }
      
      // Reserve metal (lock it)
      await incrementBalance(params.address, { [metalKey]: -params.grams });
    }

    // Generate order ID
    const orderId = `LO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (params.expiresInDays || 7) * 24 * 60 * 60 * 1000);

    const order: LimitOrder = {
      id: orderId,
      address: params.address.toLowerCase(),
      type: params.type,
      metal: params.metal,
      grams: params.grams,
      limitPrice: params.limitPrice,
      paymentMethod: params.paymentMethod || 'AUXM',
      status: 'pending',
      filledGrams: 0,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      updatedAt: now.toISOString(),
    };

    // Save order to Redis
    await r.hset(KEYS.order(orderId), order as Record<string, unknown>);
    
    // Add to user's order list
    await r.lpush(KEYS.userOrders(params.address), orderId);
    
    // Add to pending orders (sorted by price for matching)
    // For buy orders: higher price = higher priority (willing to pay more)
    // For sell orders: lower price = higher priority (willing to sell cheaper)
    const score = params.type === 'buy' ? -params.limitPrice : params.limitPrice;
    await r.zadd(KEYS.pendingOrders(params.metal), { score, member: orderId });
    await r.lpush(KEYS.allPendingOrders(), orderId);

    console.log(`✅ Limit order created: ${orderId} - ${params.type} ${params.grams}g ${params.metal} @ $${params.limitPrice}`);

    return { success: true, order };
    
  } catch (error: any) {
    console.error('Create limit order error:', error);
    return { success: false, error: error.message || 'Failed to create order' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET ORDERS
// ═══════════════════════════════════════════════════════════════════════════════

export async function getLimitOrder(orderId: string): Promise<LimitOrder | null> {
  try {
    const r = getRedis();
    const data = await r.hgetall(KEYS.order(orderId));
    
    if (!data || Object.keys(data).length === 0) {
      return null;
    }
    
    return {
      id: String(data.id),
      address: String(data.address),
      type: String(data.type) as 'buy' | 'sell',
      metal: String(data.metal) as LimitOrder['metal'],
      grams: parseFloat(String(data.grams)),
      limitPrice: parseFloat(String(data.limitPrice)),
      paymentMethod: String(data.paymentMethod) as LimitOrder['paymentMethod'],
      status: String(data.status) as LimitOrder['status'],
      filledGrams: parseFloat(String(data.filledGrams || 0)),
      filledAt: data.filledAt ? String(data.filledAt) : undefined,
      txHash: data.txHash ? String(data.txHash) : undefined,
      createdAt: String(data.createdAt),
      expiresAt: String(data.expiresAt),
      updatedAt: String(data.updatedAt),
    };
  } catch (error) {
    console.error('Get limit order error:', error);
    return null;
  }
}

export async function getUserLimitOrders(
  address: string, 
  status?: LimitOrder['status'],
  limit: number = 20
): Promise<LimitOrder[]> {
  try {
    const r = getRedis();
    const orderIds = await r.lrange(KEYS.userOrders(address), 0, limit - 1);
    
    const orders: LimitOrder[] = [];
    
    for (const id of orderIds) {
      const order = await getLimitOrder(String(id));
      if (order && (!status || order.status === status)) {
        orders.push(order);
      }
    }
    
    return orders;
  } catch (error) {
    console.error('Get user limit orders error:', error);
    return [];
  }
}

export async function getPendingOrdersForMetal(metal: string): Promise<LimitOrder[]> {
  try {
    const r = getRedis();
    // Get all pending order IDs for this metal
    const orderIds = await r.zrange(KEYS.pendingOrders(metal), 0, -1);
    
    const orders: LimitOrder[] = [];
    
    for (const id of orderIds) {
      const order = await getLimitOrder(String(id));
      if (order && order.status === 'pending') {
        // Check expiry
        if (new Date(order.expiresAt) < new Date()) {
          await expireOrder(order.id);
        } else {
          orders.push(order);
        }
      }
    }
    
    return orders;
  } catch (error) {
    console.error('Get pending orders error:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CANCEL ORDER
// ═══════════════════════════════════════════════════════════════════════════════

export async function cancelLimitOrder(
  orderId: string, 
  address: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const r = getRedis();
    const order = await getLimitOrder(orderId);
    
    if (!order) {
      return { success: false, error: 'Order not found' };
    }
    
    if (order.address !== address.toLowerCase()) {
      return { success: false, error: 'Unauthorized' };
    }
    
    if (order.status !== 'pending') {
      return { success: false, error: `Cannot cancel order with status: ${order.status}` };
    }
    
    // Refund locked funds
    if (order.type === 'buy') {
      const refundAmount = (order.grams - order.filledGrams) * order.limitPrice;
      const refundField = order.paymentMethod.toLowerCase() as 'auxm' | 'usdt' | 'usd';
      await incrementBalance(order.address, { [refundField]: refundAmount });
    } else {
      // Refund locked metal
      const refundGrams = order.grams - order.filledGrams;
      const metalKey = order.metal.toLowerCase() as 'auxg' | 'auxs' | 'auxpt' | 'auxpd';
      await incrementBalance(order.address, { [metalKey]: refundGrams });
    }
    
    // Update order status
    await r.hset(KEYS.order(orderId), {
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    });
    
    // Remove from pending
    await r.zrem(KEYS.pendingOrders(order.metal), orderId);
    
    console.log(`❌ Limit order cancelled: ${orderId}`);
    
    return { success: true };
    
  } catch (error: any) {
    console.error('Cancel limit order error:', error);
    return { success: false, error: error.message || 'Failed to cancel order' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPIRE ORDER
// ═══════════════════════════════════════════════════════════════════════════════

async function expireOrder(orderId: string): Promise<void> {
  try {
    const r = getRedis();
    const order = await getLimitOrder(orderId);
    
    if (!order || order.status !== 'pending') return;
    
    // Refund locked funds
    if (order.type === 'buy') {
      const refundAmount = (order.grams - order.filledGrams) * order.limitPrice;
      const refundField = order.paymentMethod.toLowerCase() as 'auxm' | 'usdt' | 'usd';
      await incrementBalance(order.address, { [refundField]: refundAmount });
    } else {
      const refundGrams = order.grams - order.filledGrams;
      const metalKey = order.metal.toLowerCase() as 'auxg' | 'auxs' | 'auxpt' | 'auxpd';
      await incrementBalance(order.address, { [metalKey]: refundGrams });
    }
    
    await r.hset(KEYS.order(orderId), {
      status: 'expired',
      updatedAt: new Date().toISOString(),
    });
    
    await r.zrem(KEYS.pendingOrders(order.metal), orderId);
    
    console.log(`⏰ Limit order expired: ${orderId}`);
    
  } catch (error) {
    console.error('Expire order error:', error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILL ORDER (Called by cron when price matches)
// ═══════════════════════════════════════════════════════════════════════════════

export async function fillLimitOrder(
  orderId: string,
  currentPrice: number,
  txHash?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const r = getRedis();
    const order = await getLimitOrder(orderId);
    
    if (!order) {
      return { success: false, error: 'Order not found' };
    }
    
    if (order.status !== 'pending') {
      return { success: false, error: `Order not pending: ${order.status}` };
    }
    
    // Verify price condition
    if (order.type === 'buy' && currentPrice > order.limitPrice) {
      return { success: false, error: 'Price too high for buy order' };
    }
    if (order.type === 'sell' && currentPrice < order.limitPrice) {
      return { success: false, error: 'Price too low for sell order' };
    }
    
    const gramsToFill = order.grams - order.filledGrams;
    
    // Execute the trade
    if (order.type === 'buy') {
      // User receives metal (funds already locked)
      const metalKey = order.metal.toLowerCase() as 'auxg' | 'auxs' | 'auxpt' | 'auxpd';
      await incrementBalance(order.address, { [metalKey]: gramsToFill });
      
      // Calculate actual cost at current price (might be less than limit)
      const actualCost = gramsToFill * currentPrice;
      const lockedAmount = gramsToFill * order.limitPrice;
      const refund = lockedAmount - actualCost;
      
      // Refund difference if current price is lower
      if (refund > 0) {
        const refundField = order.paymentMethod.toLowerCase() as 'auxm' | 'usdt' | 'usd';
        await incrementBalance(order.address, { [refundField]: refund });
      }
      
    } else {
      // Sell order: User receives payment (metal already locked)
      const payout = gramsToFill * currentPrice;
      const payoutField = order.paymentMethod.toLowerCase() as 'auxm' | 'usdt' | 'usd';
      await incrementBalance(order.address, { [payoutField]: payout });
    }
    
    // Update order
    await r.hset(KEYS.order(orderId), {
      status: 'filled',
      filledGrams: order.grams,
      filledAt: new Date().toISOString(),
      txHash: txHash || '',
      updatedAt: new Date().toISOString(),
    });
    
    // Remove from pending
    await r.zrem(KEYS.pendingOrders(order.metal), orderId);
    
    // Add transaction record
    await addTransaction(order.address, {
      type: 'swap',
      fromToken: order.type === 'buy' ? order.paymentMethod : order.metal,
      toToken: order.type === 'buy' ? order.metal : order.paymentMethod,
      fromAmount: order.type === 'buy' ? gramsToFill * currentPrice : gramsToFill,
      toAmount: order.type === 'buy' ? gramsToFill : gramsToFill * currentPrice,
      txHash: txHash,
      status: 'completed',
      metadata: {
        orderType: 'limit',
        orderId: orderId,
        limitPrice: order.limitPrice,
        executedPrice: currentPrice,
      },
    });
    
    console.log(`✅ Limit order filled: ${orderId} - ${order.type} ${gramsToFill}g ${order.metal} @ $${currentPrice} (limit: $${order.limitPrice})`);
    
    return { success: true };
    
  } catch (error: any) {
    console.error('Fill limit order error:', error);
    return { success: false, error: error.message || 'Failed to fill order' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK MATCHING ORDERS (Called by cron)
// ═══════════════════════════════════════════════════════════════════════════════

export async function checkAndFillMatchingOrders(
  metal: string,
  currentAskPrice: number, // Price to buy from platform
  currentBidPrice: number  // Price to sell to platform
): Promise<{ filled: number; errors: string[] }> {
  const results = { filled: 0, errors: [] as string[] };
  
  try {
    const pendingOrders = await getPendingOrdersForMetal(metal);
    
    for (const order of pendingOrders) {
      let shouldFill = false;
      let executionPrice = 0;
      
      if (order.type === 'buy') {
        // Buy order fills when current ask price <= limit price
        if (currentAskPrice <= order.limitPrice) {
          shouldFill = true;
          executionPrice = currentAskPrice;
        }
      } else {
        // Sell order fills when current bid price >= limit price
        if (currentBidPrice >= order.limitPrice) {
          shouldFill = true;
          executionPrice = currentBidPrice;
        }
      }
      
      if (shouldFill) {
        const result = await fillLimitOrder(order.id, executionPrice);
        if (result.success) {
          results.filled++;
        } else {
          results.errors.push(`${order.id}: ${result.error}`);
        }
      }
    }
    
  } catch (error: any) {
    results.errors.push(error.message || 'Unknown error');
  }
  
  return results;
}
