// src/lib/limit-orders.ts
// Limit Order Management for Auxite

import { getRedis, getUserBalance, incrementBalance, addTransaction } from './redis';
import { formatAmount } from '@/lib/format';
import { createPublicClient, http, formatUnits } from 'viem';
import { base } from 'viem/chains';
import { METAL_TOKENS, USDT_ADDRESS } from '@/config/contracts-v8';

// Blockchain client for balance checks (Base Mainnet)
const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC_URL || process.env.BASE_RPC_URL || "https://mainnet.base.org";
const client = createPublicClient({
  chain: base,
  transport: http(RPC_URL, { timeout: 10000 }),
});

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

// Get blockchain balance for a token
async function getBlockchainBalance(address: string, token: string): Promise<number> {
  try {
    if (token === 'USDT') {
      const balance = await client.readContract({
        address: USDT_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address as `0x${string}`],
      });
      return parseFloat(formatUnits(balance, 6));
    } else if (token in METAL_TOKENS) {
      const tokenAddress = METAL_TOKENS[token as keyof typeof METAL_TOKENS];
      const balance = await client.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address as `0x${string}`],
      });
      return parseFloat(formatUnits(balance, 18));
    }
    return 0;
  } catch (error) {
    console.error(`Error getting blockchain balance for ${token}:`, error);
    return 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface LimitOrder {
  id: string;
  address: string;
  type: 'buy' | 'sell';
  metal: 'AUXG' | 'AUXS' | 'AUXPT' | 'AUXPD';
  grams: number;
  limitPrice: number;
  paymentMethod: 'AUXM' | 'USDT' | 'USD';
  status: 'pending' | 'filled' | 'partially_filled' | 'cancelled' | 'expired';
  filledGrams: number;
  filledAt?: string;
  txHash?: string;
  createdAt: string;
  expiresAt: string;
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
    
    if (params.grams <= 0) {
      return { success: false, error: 'Invalid amount' };
    }
    if (params.limitPrice <= 0) {
      return { success: false, error: 'Invalid limit price' };
    }

    const paymentMethod = params.paymentMethod || 'AUXM';
    const totalCost = params.grams * params.limitPrice;

    // Check balance for buy orders
    if (params.type === 'buy') {
      let availableBalance = 0;
      
      if (paymentMethod === 'USDT') {
        // USDT is on blockchain
        availableBalance = await getBlockchainBalance(params.address, 'USDT');
      } else {
        // AUXM and USD are in Redis
        const balance = await getUserBalance(params.address);
        availableBalance = paymentMethod === 'AUXM' ? balance.totalAuxm : balance.usd;
      }
      
      if (availableBalance < totalCost) {
        return { success: false, error: `Insufficient ${paymentMethod} balance. Need: $${totalCost.toFixed(2)}, Have: $${availableBalance.toFixed(2)}` };
      }
      
      // Only lock Redis-based balances (AUXM, USD)
      // USDT will be transferred on-chain when order fills
      if (paymentMethod !== 'USDT') {
        const lockField = paymentMethod.toLowerCase() as 'auxm' | 'usd';
        await incrementBalance(params.address, { [lockField]: -totalCost });
      }
    }
    
    // Check metal balance for sell orders
    if (params.type === 'sell') {
      // Metals are on blockchain
      const metalBalance = await getBlockchainBalance(params.address, params.metal);
      
      if (metalBalance < params.grams) {
        return { success: false, error: `Insufficient ${params.metal} balance. Need: ${params.grams}g, Have: ${formatAmount(metalBalance, params.metal)}g` };
      }
      
      // Note: Metal will be transferred on-chain when order fills
      // We don't lock it in Redis since it's on blockchain
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
      paymentMethod: paymentMethod,
      status: 'pending',
      filledGrams: 0,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      updatedAt: now.toISOString(),
    };

    // Save order to Redis
    await r.hset(KEYS.order(orderId), order as unknown as Record<string, unknown>);
    await r.lpush(KEYS.userOrders(params.address), orderId);
    
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
    const orderIds = await r.zrange(KEYS.pendingOrders(metal), 0, -1);
    
    const orders: LimitOrder[] = [];
    
    for (const id of orderIds) {
      const order = await getLimitOrder(String(id));
      if (order && order.status === 'pending') {
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
    
    // Refund locked Redis funds (only AUXM/USD)
    if (order.type === 'buy' && order.paymentMethod !== 'USDT') {
      const refundAmount = (order.grams - order.filledGrams) * order.limitPrice;
      const refundField = order.paymentMethod.toLowerCase() as 'auxm' | 'usd';
      await incrementBalance(order.address, { [refundField]: refundAmount });
    }
    
    // Update order status
    await r.hset(KEYS.order(orderId), {
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    });
    
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
    
    // Refund locked Redis funds (only AUXM/USD)
    if (order.type === 'buy' && order.paymentMethod !== 'USDT') {
      const refundAmount = (order.grams - order.filledGrams) * order.limitPrice;
      const refundField = order.paymentMethod.toLowerCase() as 'auxm' | 'usd';
      await incrementBalance(order.address, { [refundField]: refundAmount });
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
    
    if (order.type === 'buy' && currentPrice > order.limitPrice) {
      return { success: false, error: 'Price too high for buy order' };
    }
    if (order.type === 'sell' && currentPrice < order.limitPrice) {
      return { success: false, error: 'Price too low for sell order' };
    }
    
    const gramsToFill = order.grams - order.filledGrams;
    
    // For USDT orders, on-chain execution would happen here
    // For now, we just update Redis balances for non-USDT orders
    
    if (order.type === 'buy') {
      const metalKey = order.metal.toLowerCase() as 'auxg' | 'auxs' | 'auxpt' | 'auxpd';
      
      if (order.paymentMethod !== 'USDT') {
        // Redis-based: credit metal
        await incrementBalance(order.address, { [metalKey]: gramsToFill });
        
        const actualCost = gramsToFill * currentPrice;
        const lockedAmount = gramsToFill * order.limitPrice;
        const refund = lockedAmount - actualCost;
        
        if (refund > 0) {
          const refundField = order.paymentMethod.toLowerCase() as 'auxm' | 'usd';
          await incrementBalance(order.address, { [refundField]: refund });
        }
      }
      // Note: USDT orders need on-chain execution (not implemented yet)
      
    } else {
      // Sell order
      if (order.paymentMethod !== 'USDT') {
        const payout = gramsToFill * currentPrice;
        const payoutField = order.paymentMethod.toLowerCase() as 'auxm' | 'usd';
        await incrementBalance(order.address, { [payoutField]: payout });
      }
    }
    
    await r.hset(KEYS.order(orderId), {
      status: 'filled',
      filledGrams: order.grams,
      filledAt: new Date().toISOString(),
      txHash: txHash || '',
      updatedAt: new Date().toISOString(),
    });
    
    await r.zrem(KEYS.pendingOrders(order.metal), orderId);
    
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
    
    console.log(`✅ Limit order filled: ${orderId} - ${order.type} ${gramsToFill}g ${order.metal} @ $${currentPrice}`);
    
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
  currentAskPrice: number,
  currentBidPrice: number
): Promise<{ filled: number; errors: string[] }> {
  const results = { filled: 0, errors: [] as string[] };
  
  try {
    const pendingOrders = await getPendingOrdersForMetal(metal);
    
    for (const order of pendingOrders) {
      let shouldFill = false;
      let executionPrice = 0;
      
      if (order.type === 'buy') {
        if (currentAskPrice <= order.limitPrice) {
          shouldFill = true;
          executionPrice = currentAskPrice;
        }
      } else {
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
