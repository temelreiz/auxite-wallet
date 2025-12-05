// src/lib/redis.ts
// Auxite Wallet - Redis Client (Upstash)

import { Redis } from "@upstash/redis";

// Redis client singleton
let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      throw new Error("Redis credentials not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN");
    }

    redis = new Redis({
      url,
      token,
    });
  }

  return redis;
}

// ============================================
// USER BALANCE FUNCTIONS
// ============================================

export interface UserBalance {
  auxm: number;
  bonusAuxm: number;
  totalAuxm: number;
  bonusExpiresAt: string | null;
  auxg: number;
  auxs: number;
  auxpt: number;
  auxpd: number;
  eth: number;
  btc: number;
  xrp: number;
  sol: number;
  usdt: number;
  usd: number;  // Fiat USD bakiyesi (USDT'den ayrı)
}

const DEFAULT_BALANCE: UserBalance = {
  auxm: 0,
  bonusAuxm: 0,
  totalAuxm: 0,
  bonusExpiresAt: null,
  auxg: 0,
  auxs: 0,
  auxpt: 0,
  auxpd: 0,
  eth: 0,
  btc: 0,
  xrp: 0,
  sol: 0,
  usdt: 0,
  usd: 0,
};

// Key formatları
const KEYS = {
  userBalance: (address: string) => `user:${address.toLowerCase()}:balance`,
  userMeta: (address: string) => `user:${address.toLowerCase()}:meta`,
  userTransactions: (address: string) => `user:${address.toLowerCase()}:transactions`,
  bonusExpiry: (address: string) => `user:${address.toLowerCase()}:bonus:expiry`,
};

/**
 * Kullanıcı bakiyesini al
 */
export async function getUserBalance(address: string): Promise<UserBalance> {
  try {
    const redis = getRedis();
    const key = KEYS.userBalance(address);
    
    const data = await redis.hgetall(key);
    
    if (!data || Object.keys(data).length === 0) {
      return DEFAULT_BALANCE;
    }

    const balance: UserBalance = {
      auxm: parseFloat(String(data.auxm || 0)),
      bonusAuxm: parseFloat(String(data.bonusAuxm || 0)),
      totalAuxm: 0,
      bonusExpiresAt: data.bonusExpiresAt ? String(data.bonusExpiresAt) : null,
      auxg: parseFloat(String(data.auxg || 0)),
      auxs: parseFloat(String(data.auxs || 0)),
      auxpt: parseFloat(String(data.auxpt || 0)),
      auxpd: parseFloat(String(data.auxpd || 0)),
      eth: parseFloat(String(data.eth || 0)),
      btc: parseFloat(String(data.btc || 0)),
      xrp: parseFloat(String(data.xrp || 0)),
      sol: parseFloat(String(data.sol || 0)),
      usdt: parseFloat(String(data.usdt || 0)),
      usd: parseFloat(String(data.usd || 0)),
    };

    balance.totalAuxm = balance.auxm + balance.bonusAuxm;

    if (balance.bonusExpiresAt) {
      const expiryDate = new Date(balance.bonusExpiresAt);
      if (expiryDate < new Date()) {
        await redis.hset(key, { bonusAuxm: 0, bonusExpiresAt: "" });
        balance.bonusAuxm = 0;
        balance.bonusExpiresAt = null;
        balance.totalAuxm = balance.auxm;
      }
    }

    return balance;
  } catch (error) {
    console.error("Redis getUserBalance error:", error);
    return DEFAULT_BALANCE;
  }
}

/**
 * Kullanıcı bakiyesini güncelle (increment)
 */
export async function incrementBalance(
  address: string,
  updates: Partial<Record<keyof UserBalance, number>>
): Promise<boolean> {
  try {
    const redis = getRedis();
    const key = KEYS.userBalance(address);

    const pipeline = redis.pipeline();
    
    for (const [field, value] of Object.entries(updates)) {
      if (typeof value === "number" && field !== "totalAuxm") {
        pipeline.hincrbyfloat(key, field, value);
      }
    }

    await pipeline.exec();

    const balance = await getUserBalance(address);
    await redis.hset(key, { totalAuxm: balance.auxm + balance.bonusAuxm });

    return true;
  } catch (error) {
    console.error("Redis incrementBalance error:", error);
    return false;
  }
}

/**
 * Kullanıcı bakiyesini set et
 */
export async function setBalance(
  address: string,
  updates: Partial<UserBalance>
): Promise<boolean> {
  try {
    const redis = getRedis();
    const key = KEYS.userBalance(address);

    const currentBalance = await getUserBalance(address);
    const newBalance = { ...currentBalance, ...updates };
    newBalance.totalAuxm = newBalance.auxm + newBalance.bonusAuxm;

    await redis.hset(key, newBalance as Record<string, unknown>);

    return true;
  } catch (error) {
    console.error("Redis setBalance error:", error);
    return false;
  }
}

/**
 * Bonus AUXM ekle
 */
export async function addBonusAuxm(
  address: string,
  amount: number,
  expiresAt: Date
): Promise<boolean> {
  try {
    const redis = getRedis();
    const key = KEYS.userBalance(address);

    await redis.hincrbyfloat(key, "bonusAuxm", amount);
    await redis.hset(key, { bonusExpiresAt: expiresAt.toISOString() });

    const balance = await getUserBalance(address);
    await redis.hset(key, { totalAuxm: balance.auxm + balance.bonusAuxm });

    return true;
  } catch (error) {
    console.error("Redis addBonusAuxm error:", error);
    return false;
  }
}

/**
 * Transfer işlemi (atomik)
 */
export async function transfer(
  fromAddress: string,
  toAddress: string,
  token: keyof UserBalance,
  amount: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const redis = getRedis();

    const fromBalance = await getUserBalance(fromAddress);
    const availableBalance = fromBalance[token];

    if (typeof availableBalance !== "number") {
      return { success: false, error: "Invalid token" };
    }

    if (availableBalance < amount) {
      return { success: false, error: "Insufficient balance" };
    }

    const pipeline = redis.pipeline();
    
    pipeline.hincrbyfloat(KEYS.userBalance(fromAddress), token, -amount);
    pipeline.hincrbyfloat(KEYS.userBalance(toAddress), token, amount);

    await pipeline.exec();

    return { success: true };
  } catch (error) {
    console.error("Redis transfer error:", error);
    return { success: false, error: "Transfer failed" };
  }
}

// ============================================
// USD SPECIFIC FUNCTIONS
// ============================================

/**
 * USD bakiyesi ekle (Admin için)
 */
export async function addUsdBalance(
  address: string,
  amount: number,
  note?: string
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  try {
    const redis = getRedis();
    const key = KEYS.userBalance(address);

    await ensureUser(address);

    const newBalance = await redis.hincrbyfloat(key, "usd", amount);

    await addTransaction(address, {
      type: "deposit",
      token: "usd",
      amount: amount,
      status: "completed",
      metadata: {
        method: "admin_deposit",
        note: note || "Admin USD deposit",
      },
    });

    return { success: true, newBalance: parseFloat(String(newBalance)) };
  } catch (error) {
    console.error("Redis addUsdBalance error:", error);
    return { success: false, error: "Failed to add USD balance" };
  }
}

/**
 * USD ile satın alma (USD -> Token dönüşümü)
 */
export async function buyWithUsd(
  address: string,
  targetToken: "usdt" | "auxm" | "auxg" | "auxs" | "auxpt" | "auxpd",
  usdAmount: number,
  tokenAmount: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const redis = getRedis();
    const key = KEYS.userBalance(address);

    const balance = await getUserBalance(address);
    
    if (balance.usd < usdAmount) {
      return { success: false, error: "Insufficient USD balance" };
    }

    const pipeline = redis.pipeline();
    pipeline.hincrbyfloat(key, "usd", -usdAmount);
    pipeline.hincrbyfloat(key, targetToken, tokenAmount);
    await pipeline.exec();

    await addTransaction(address, {
      type: "swap",
      fromToken: "usd",
      toToken: targetToken,
      fromAmount: usdAmount,
      toAmount: tokenAmount,
      status: "completed",
      metadata: {
        method: "usd_purchase",
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Redis buyWithUsd error:", error);
    return { success: false, error: "Purchase failed" };
  }
}

// ============================================
// TRANSACTION HISTORY
// ============================================

export interface Transaction {
  id: string;
  type: "deposit" | "withdraw" | "swap" | "transfer" | "bonus";
  fromToken?: string;
  toToken?: string;
  fromAmount?: number;
  toAmount?: number;
  amount?: number;
  token?: string;
  txHash?: string;
  status: "pending" | "completed" | "failed";
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Transaction ekle
 */
export async function addTransaction(
  address: string,
  transaction: Omit<Transaction, "id" | "timestamp">
): Promise<string> {
  try {
    const redis = getRedis();
    const key = KEYS.userTransactions(address);

    const tx: Transaction = {
      ...transaction,
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    await redis.lpush(key, JSON.stringify(tx));
    await redis.ltrim(key, 0, 99);

    return tx.id;
  } catch (error) {
    console.error("Redis addTransaction error:", error);
    throw error;
  }
}

/**
 * Transaction geçmişini al
 */
export async function getTransactions(
  address: string,
  limit: number = 20,
  offset: number = 0
): Promise<Transaction[]> {
  try {
    const redis = getRedis();
    const key = KEYS.userTransactions(address);

    const data = await redis.lrange(key, offset, offset + limit - 1);

    return data.map((item) => {
      if (typeof item === "string") {
        return JSON.parse(item) as Transaction;
      }
      return item as Transaction;
    });
  } catch (error) {
    console.error("Redis getTransactions error:", error);
    return [];
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Kullanıcı var mı kontrol et, yoksa oluştur
 */
export async function ensureUser(address: string): Promise<void> {
  try {
    const redis = getRedis();
    const key = KEYS.userBalance(address);

    const exists = await redis.exists(key);
    
    if (!exists) {
      await redis.hset(key, { ...DEFAULT_BALANCE });
    }
  } catch (error) {
    console.error("Redis ensureUser error:", error);
  }
}

/**
 * Tüm kullanıcı verisini sil
 */
export async function deleteUser(address: string): Promise<boolean> {
  try {
    const redis = getRedis();

    await redis.del(
      KEYS.userBalance(address),
      KEYS.userMeta(address),
      KEYS.userTransactions(address),
      KEYS.bonusExpiry(address)
    );

    return true;
  } catch (error) {
    console.error("Redis deleteUser error:", error);
    return false;
  }
}