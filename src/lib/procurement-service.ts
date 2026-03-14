// ============================================
// AUXITE PROCUREMENT SERVICE
// ============================================
// When a user buys metal (e.g., BTC → AUXG), we must:
//   1. Queue a procurement order
//   2. Convert received crypto → USD/USDT
//   3. Buy physical metal from KuveytTürk
//   4. Close the hedge position
//
// This service manages the procurement lifecycle.
// ============================================

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ============================================
// TYPES
// ============================================

export type ProcurementStatus =
  | 'pending'              // Queued, waiting for batch processing
  | 'converting_crypto'    // Crypto → USDT conversion in progress
  | 'crypto_converted'     // Crypto sold, USDT received
  | 'purchasing_metal'     // KuveytTürk metal buy in progress
  | 'completed'            // Metal purchased, fully hedged
  | 'failed'               // Something went wrong
  | 'manual_review';       // Needs human attention

export interface ProcurementOrder {
  id: string;
  tradeId: string;               // Original trade ID
  userAddress: string;

  // What the user paid
  fromToken: string;              // BTC, ETH, AUXM, USDT, etc.
  fromAmount: number;             // Amount received from user
  fromValueUSD: number;           // USD value at trade time

  // What we need to buy
  metal: string;                  // AUXG, AUXS, AUXPT, AUXPD
  metalGrams: number;             // Grams to procure

  // Execution prices
  tradePricePerGram: number;      // Price charged to user
  ktBuyRate?: number;             // KuveytTürk buy rate (TL/gram)
  usdTlRate?: number;             // USD/TL rate used

  // Status tracking
  status: ProcurementStatus;
  statusHistory: Array<{
    status: ProcurementStatus;
    timestamp: number;
    note: string;
    data?: Record<string, any>;
  }>;

  // Crypto conversion
  cryptoConversion?: {
    exchange: string;             // 'binance'
    orderId?: string;
    soldAmount: number;
    receivedUSDT: number;
    rate: number;
    completedAt: number;
  };

  // KuveytTürk purchase
  ktPurchase?: {
    referenceId: string;
    metalGrams: number;
    rateTLPerGram: number;
    totalTL: number;
    usdEquivalent: number;
    completedAt: number;
  };

  // Hedge linkage
  hedgeId?: string;
  hedgeClosed: boolean;

  // Timestamps
  createdAt: number;
  updatedAt: number;
  completedAt?: number;

  // Retry tracking
  retryCount: number;
  lastError?: string;

  // Batch ID (multiple procurements can be batched together)
  batchId?: string;
}

export interface ProcurementBatch {
  id: string;
  metal: string;
  orders: string[];               // Procurement order IDs
  totalGrams: number;
  totalValueUSD: number;
  status: 'pending' | 'processing' | 'completed' | 'partial' | 'failed';
  createdAt: number;
  completedAt?: number;
}

export interface ProcurementStats {
  pending: number;
  converting: number;
  purchasing: number;
  completedToday: number;
  failedToday: number;
  totalProcuredGrams: Record<string, number>;
  totalProcuredUSD: number;
}

// ============================================
// REDIS KEYS
// ============================================

const KEYS = {
  order: (id: string) => `procurement:order:${id}`,
  pending: 'procurement:queue:pending',
  converting: 'procurement:queue:converting',
  purchasing: 'procurement:queue:purchasing',
  completed: 'procurement:completed',
  failed: 'procurement:failed',
  manualReview: 'procurement:manual_review',
  batch: (id: string) => `procurement:batch:${id}`,
  pendingByMetal: (metal: string) => `procurement:pending:${metal.toUpperCase()}`,
  stats: 'procurement:stats',
  dailyStats: (date: string) => `procurement:daily:${date}`,
  config: 'procurement:config',
};

// ============================================
// CONFIGURATION
// ============================================

export interface ProcurementConfig {
  enabled: boolean;
  batchIntervalMs: number;        // How often to run batch processing
  minBatchGrams: Record<string, number>;  // Min grams to trigger purchase
  maxRetries: number;
  autoConvertCrypto: boolean;     // Auto-sell crypto to USDT
  autoPurchaseMetal: boolean;     // Auto-buy from KuveytTürk
}

const DEFAULT_CONFIG: ProcurementConfig = {
  enabled: true,
  batchIntervalMs: 5 * 60 * 1000,  // 5 minutes
  minBatchGrams: {
    AUXG: 1,     // Min 1g gold
    AUXS: 10,    // Min 10g silver
    AUXPT: 1,    // Min 1g platinum
    AUXPD: 1,    // Min 1g palladium
  },
  maxRetries: 3,
  autoConvertCrypto: true,
  autoPurchaseMetal: true,
};

export async function getProcurementConfig(): Promise<ProcurementConfig> {
  try {
    const raw = await redis.get(KEYS.config);
    if (raw) {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return { ...DEFAULT_CONFIG, ...parsed };
    }
    return DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function setProcurementConfig(config: Partial<ProcurementConfig>): Promise<void> {
  const current = await getProcurementConfig();
  await redis.set(KEYS.config, JSON.stringify({ ...current, ...config }));
}

// ============================================
// CREATE PROCUREMENT ORDER
// ============================================
// Called after each trade that creates metal exposure

export async function createProcurementOrder(params: {
  tradeId: string;
  userAddress: string;
  fromToken: string;
  fromAmount: number;
  fromValueUSD: number;
  metal: string;
  metalGrams: number;
  tradePricePerGram: number;
  hedgeId?: string;
}): Promise<ProcurementOrder> {
  const id = `PROC-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  const order: ProcurementOrder = {
    id,
    tradeId: params.tradeId,
    userAddress: params.userAddress,
    fromToken: params.fromToken.toUpperCase(),
    fromAmount: params.fromAmount,
    fromValueUSD: params.fromValueUSD,
    metal: params.metal.toUpperCase(),
    metalGrams: params.metalGrams,
    tradePricePerGram: params.tradePricePerGram,
    status: 'pending',
    statusHistory: [{
      status: 'pending',
      timestamp: Date.now(),
      note: `Procurement queued: ${params.metalGrams.toFixed(3)}g ${params.metal} from ${params.fromAmount} ${params.fromToken} ($${params.fromValueUSD.toFixed(2)})`,
    }],
    hedgeId: params.hedgeId,
    hedgeClosed: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    retryCount: 0,
  };

  // Save order
  await redis.set(KEYS.order(id), JSON.stringify(order));

  // Add to pending queue
  await redis.lpush(KEYS.pending, id);

  // Add to metal-specific pending queue
  await redis.lpush(KEYS.pendingByMetal(params.metal), id);

  console.log(`📦 Procurement order created: ${id} | ${params.metalGrams.toFixed(3)}g ${params.metal} | $${params.fromValueUSD.toFixed(2)}`);

  return order;
}

// ============================================
// UPDATE PROCUREMENT STATUS
// ============================================

export async function updateProcurementStatus(
  orderId: string,
  newStatus: ProcurementStatus,
  note: string,
  data?: Record<string, any>,
): Promise<ProcurementOrder | null> {
  const raw = await redis.get(KEYS.order(orderId));
  if (!raw) return null;

  const order: ProcurementOrder = typeof raw === 'string' ? JSON.parse(raw) : raw as ProcurementOrder;
  const oldStatus = order.status;

  order.status = newStatus;
  order.updatedAt = Date.now();
  order.statusHistory.push({
    status: newStatus,
    timestamp: Date.now(),
    note,
    data,
  });

  if (newStatus === 'completed') {
    order.completedAt = Date.now();
  }

  // Move between queues
  if (oldStatus === 'pending') {
    await redis.lrem(KEYS.pending, 1, orderId);
    await redis.lrem(KEYS.pendingByMetal(order.metal), 1, orderId);
  }
  if (oldStatus === 'converting_crypto') {
    await redis.lrem(KEYS.converting, 1, orderId);
  }
  if (oldStatus === 'purchasing_metal') {
    await redis.lrem(KEYS.purchasing, 1, orderId);
  }

  // Add to new queue
  switch (newStatus) {
    case 'converting_crypto':
      await redis.lpush(KEYS.converting, orderId);
      break;
    case 'purchasing_metal':
      await redis.lpush(KEYS.purchasing, orderId);
      break;
    case 'completed':
      await redis.lpush(KEYS.completed, orderId);
      await redis.ltrim(KEYS.completed, 0, 999);
      await updateDailyStats('completed', order);
      break;
    case 'failed':
      await redis.lpush(KEYS.failed, orderId);
      await redis.ltrim(KEYS.failed, 0, 999);
      await updateDailyStats('failed', order);
      break;
    case 'manual_review':
      await redis.lpush(KEYS.manualReview, orderId);
      break;
  }

  await redis.set(KEYS.order(orderId), JSON.stringify(order));

  console.log(`📦 Procurement ${orderId}: ${oldStatus} → ${newStatus} | ${note}`);

  return order;
}

// ============================================
// RECORD CRYPTO CONVERSION
// ============================================

export async function recordCryptoConversion(
  orderId: string,
  conversion: ProcurementOrder['cryptoConversion'],
): Promise<ProcurementOrder | null> {
  const raw = await redis.get(KEYS.order(orderId));
  if (!raw) return null;

  const order: ProcurementOrder = typeof raw === 'string' ? JSON.parse(raw) : raw as ProcurementOrder;
  order.cryptoConversion = conversion;
  order.updatedAt = Date.now();

  await redis.set(KEYS.order(orderId), JSON.stringify(order));
  return order;
}

// ============================================
// RECORD KUVEYTTURK PURCHASE
// ============================================

export async function recordKtPurchase(
  orderId: string,
  purchase: ProcurementOrder['ktPurchase'],
): Promise<ProcurementOrder | null> {
  const raw = await redis.get(KEYS.order(orderId));
  if (!raw) return null;

  const order: ProcurementOrder = typeof raw === 'string' ? JSON.parse(raw) : raw as ProcurementOrder;
  order.ktPurchase = purchase;
  order.ktBuyRate = purchase?.rateTLPerGram;
  order.updatedAt = Date.now();

  await redis.set(KEYS.order(orderId), JSON.stringify(order));
  return order;
}

// ============================================
// GET PENDING ORDERS BY METAL
// ============================================

export async function getPendingOrdersByMetal(metal: string): Promise<ProcurementOrder[]> {
  const ids = await redis.lrange(KEYS.pendingByMetal(metal), 0, -1);
  const orders: ProcurementOrder[] = [];

  for (const id of ids) {
    const raw = await redis.get(KEYS.order(id as string));
    if (raw) {
      const order: ProcurementOrder = typeof raw === 'string' ? JSON.parse(raw) : raw as ProcurementOrder;
      if (order.status === 'pending') {
        orders.push(order);
      }
    }
  }

  return orders;
}

// ============================================
// GET ALL PENDING ORDERS
// ============================================

export async function getAllPendingOrders(): Promise<ProcurementOrder[]> {
  const ids = await redis.lrange(KEYS.pending, 0, -1);
  const orders: ProcurementOrder[] = [];

  for (const id of ids) {
    const raw = await redis.get(KEYS.order(id as string));
    if (raw) {
      const order: ProcurementOrder = typeof raw === 'string' ? JSON.parse(raw) : raw as ProcurementOrder;
      if (order.status === 'pending') {
        orders.push(order);
      }
    }
  }

  return orders;
}

// ============================================
// GET ORDER
// ============================================

export async function getProcurementOrder(orderId: string): Promise<ProcurementOrder | null> {
  const raw = await redis.get(KEYS.order(orderId));
  if (!raw) return null;
  return typeof raw === 'string' ? JSON.parse(raw) : raw as ProcurementOrder;
}

// ============================================
// BATCH PENDING ORDERS
// ============================================
// Groups pending orders by metal for efficient purchasing

export async function createBatch(metal: string): Promise<ProcurementBatch | null> {
  const config = await getProcurementConfig();
  const orders = await getPendingOrdersByMetal(metal);

  if (orders.length === 0) return null;

  const totalGrams = orders.reduce((sum, o) => sum + o.metalGrams, 0);
  const minGrams = config.minBatchGrams[metal.toUpperCase()] || 1;

  if (totalGrams < minGrams) {
    console.log(`📦 Batch ${metal}: ${totalGrams.toFixed(3)}g < min ${minGrams}g, skipping`);
    return null;
  }

  const batchId = `BATCH-${metal}-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

  const batch: ProcurementBatch = {
    id: batchId,
    metal: metal.toUpperCase(),
    orders: orders.map(o => o.id),
    totalGrams,
    totalValueUSD: orders.reduce((sum, o) => sum + o.fromValueUSD, 0),
    status: 'pending',
    createdAt: Date.now(),
  };

  // Link orders to batch
  for (const order of orders) {
    order.batchId = batchId;
    order.updatedAt = Date.now();
    await redis.set(KEYS.order(order.id), JSON.stringify(order));
  }

  await redis.set(KEYS.batch(batchId), JSON.stringify(batch));

  console.log(`📦 Batch created: ${batchId} | ${orders.length} orders | ${totalGrams.toFixed(3)}g ${metal} | $${batch.totalValueUSD.toFixed(2)}`);

  return batch;
}

// ============================================
// STATS
// ============================================

async function updateDailyStats(type: 'completed' | 'failed', order: ProcurementOrder): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const key = KEYS.dailyStats(today);

  try {
    const raw = await redis.get(key);
    const stats: any = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {
      completed: 0,
      failed: 0,
      gramsProcessed: {},
      usdProcessed: 0,
    };

    if (type === 'completed') {
      stats.completed++;
      stats.gramsProcessed[order.metal] = (stats.gramsProcessed[order.metal] || 0) + order.metalGrams;
      stats.usdProcessed += order.fromValueUSD;
    } else {
      stats.failed++;
    }

    await redis.set(key, JSON.stringify(stats), { ex: 172800 }); // 48h TTL
  } catch (e) {
    console.error('Procurement stats error:', e);
  }
}

export async function getProcurementStats(): Promise<ProcurementStats> {
  const pendingCount = await redis.llen(KEYS.pending);
  const convertingCount = await redis.llen(KEYS.converting);
  const purchasingCount = await redis.llen(KEYS.purchasing);

  const today = new Date().toISOString().split('T')[0];
  const raw = await redis.get(KEYS.dailyStats(today));
  const daily: any = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {};

  return {
    pending: pendingCount || 0,
    converting: convertingCount || 0,
    purchasing: purchasingCount || 0,
    completedToday: daily.completed || 0,
    failedToday: daily.failed || 0,
    totalProcuredGrams: daily.gramsProcessed || {},
    totalProcuredUSD: daily.usdProcessed || 0,
  };
}
