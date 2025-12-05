// src/lib/redis.ts
// Auxite Wallet - Redis Client (Upstash)

import { Redis } from "@upstash/redis";

// Redis client singleton
let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (!redisClient) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      throw new Error("Redis credentials not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN");
    }

    redisClient = new Redis({
      url,
      token,
    });
  }

  return redisClient;
}

// Direct redis export for convenience
export const redis = {
  get: async (key: string) => getRedis().get(key),
  set: async (key: string, value: string, options?: { ex?: number } | string, exValue?: number) => {
    if (options === 'EX' && exValue) {
      return getRedis().set(key, value, { ex: exValue });
    }
    if (typeof options === 'object' && options.ex) {
      return getRedis().set(key, value, { ex: options.ex });
    }
    return getRedis().set(key, value);
  },
  del: async (...keys: string[]) => getRedis().del(...keys),
  exists: async (key: string) => getRedis().exists(key),
  expire: async (key: string, seconds: number) => getRedis().expire(key, seconds),
  incr: async (key: string) => getRedis().incr(key),
  lpush: async (key: string, ...values: string[]) => getRedis().lpush(key, ...values),
  lrange: async (key: string, start: number, stop: number) => getRedis().lrange(key, start, stop),
  ltrim: async (key: string, start: number, stop: number) => getRedis().ltrim(key, start, stop),
  llen: async (key: string) => getRedis().llen(key),
  hset: async (key: string, data: Record<string, unknown>) => getRedis().hset(key, data),
  hget: async (key: string, field: string) => getRedis().hget(key, field),
  hgetall: async (key: string) => getRedis().hgetall(key),
  hincrbyfloat: async (key: string, field: string, value: number) => getRedis().hincrbyfloat(key, field, value),
  pipeline: () => getRedis().pipeline(),
};

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
  usd: number;
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
    const r = getRedis();
    const key = KEYS.userBalance(address);
    
    const data = await r.hgetall(key);
    
    if (!data || Object.keys(data).length === 0) {
      return DEFAULT_BALANCE;
    }

    // Redis'ten gelen değerleri parse et
    const balance: UserBalance = {
      auxm: parseFloat(String(data.auxm || 0)),
      bonusAuxm: parseFloat(String(data.bonusAuxm || 0)),
      totalAuxm: 0, // Hesaplanacak
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

    // Toplam AUXM hesapla
    balance.totalAuxm = balance.auxm + balance.bonusAuxm;

    // Bonus süresi dolmuş mu kontrol et
    if (balance.bonusExpiresAt) {
      const expiryDate = new Date(balance.bonusExpiresAt);
      if (expiryDate < new Date()) {
        // Bonus süresi dolmuş, sıfırla
        await r.hset(key, { bonusAuxm: 0, bonusExpiresAt: "" });
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
    const r = getRedis();
    const key = KEYS.userBalance(address);

    // Her field için increment yap
    const pipeline = r.pipeline();
    
    for (const [field, value] of Object.entries(updates)) {
      if (typeof value === "number" && field !== "totalAuxm") {
        pipeline.hincrbyfloat(key, field, value);
      }
    }

    await pipeline.exec();

    // totalAuxm'i güncelle
    const balance = await getUserBalance(address);
    await r.hset(key, { totalAuxm: balance.auxm + balance.bonusAuxm });

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
    const r = getRedis();
    const key = KEYS.userBalance(address);

    // Mevcut bakiyeyi al
    const currentBalance = await getUserBalance(address);

    // Güncellemeleri birleştir
    const newBalance = { ...currentBalance, ...updates };
    newBalance.totalAuxm = newBalance.auxm + newBalance.bonusAuxm;

    // Redis'e kaydet
    await r.hset(key, newBalance as Record<string, unknown>);

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
    const r = getRedis();
    const key = KEYS.userBalance(address);

    await r.hincrbyfloat(key, "bonusAuxm", amount);
    await r.hset(key, { bonusExpiresAt: expiresAt.toISOString() });

    // totalAuxm'i güncelle
    const balance = await getUserBalance(address);
    await r.hset(key, { totalAuxm: balance.auxm + balance.bonusAuxm });

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
    const r = getRedis();

    // Gönderen bakiyesini kontrol et
    const fromBalance = await getUserBalance(fromAddress);
    const availableBalance = fromBalance[token];

    if (typeof availableBalance !== "number") {
      return { success: false, error: "Invalid token" };
    }

    if (availableBalance < amount) {
      return { success: false, error: "Insufficient balance" };
    }

    // Atomik transfer (pipeline)
    const pipeline = r.pipeline();
    
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
    const r = getRedis();
    const key = KEYS.userTransactions(address);

    const tx: Transaction = {
      ...transaction,
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    // Liste başına ekle (en yeni en üstte)
    await r.lpush(key, JSON.stringify(tx));

    // Maksimum 100 transaction tut
    await r.ltrim(key, 0, 99);

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
    const r = getRedis();
    const key = KEYS.userTransactions(address);

    const data = await r.lrange(key, offset, offset + limit - 1);

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
    const r = getRedis();
    const key = KEYS.userBalance(address);

    const exists = await r.exists(key);
    
    if (!exists) {
      await r.hset(key, { ...DEFAULT_BALANCE });
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
    const r = getRedis();

    await r.del(
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

// ============================================
// USD PURCHASE FUNCTIONS
// ============================================

/**
 * USD ile token satın al
 */
export async function buyWithUsd(
  address: string,
  token: keyof UserBalance,
  usdAmount: number,
  tokenAmount: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const r = getRedis();
    const key = KEYS.userBalance(address);

    // Mevcut bakiyeyi al
    const balance = await getUserBalance(address);

    // USD bakiyesi yeterli mi?
    if (balance.usd < usdAmount) {
      return { success: false, error: "Insufficient USD balance" };
    }

    // Atomik işlem: USD azalt, token artır
    const pipeline = r.pipeline();
    pipeline.hincrbyfloat(key, "usd", -usdAmount);
    pipeline.hincrbyfloat(key, token, tokenAmount);
    await pipeline.exec();

    // Transaction kaydı
    await addTransaction(address, {
      type: "swap",
      fromToken: "USD",
      toToken: token.toUpperCase(),
      fromAmount: usdAmount,
      toAmount: tokenAmount,
      status: "completed",
    });

    return { success: true };
  } catch (error) {
    console.error("Redis buyWithUsd error:", error);
    return { success: false, error: "Purchase failed" };
  }
}

/**
 * USD'yi USDT'ye dönüştür
 */
export async function convertUsdToUsdt(
  address: string,
  usdAmount: number,
  usdtAmount: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const r = getRedis();
    const key = KEYS.userBalance(address);

    const balance = await getUserBalance(address);

    if (balance.usd < usdAmount) {
      return { success: false, error: "Insufficient USD balance" };
    }

    const pipeline = r.pipeline();
    pipeline.hincrbyfloat(key, "usd", -usdAmount);
    pipeline.hincrbyfloat(key, "usdt", usdtAmount);
    await pipeline.exec();

    await addTransaction(address, {
      type: "swap",
      fromToken: "USD",
      toToken: "USDT",
      fromAmount: usdAmount,
      toAmount: usdtAmount,
      status: "completed",
    });

    return { success: true };
  } catch (error) {
    console.error("Redis convertUsdToUsdt error:", error);
    return { success: false, error: "Conversion failed" };
  }
}

/**
 * USDT'yi USD'ye dönüştür
 */
export async function convertUsdtToUsd(
  address: string,
  usdtAmount: number,
  usdAmount: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const r = getRedis();
    const key = KEYS.userBalance(address);

    const balance = await getUserBalance(address);

    if (balance.usdt < usdtAmount) {
      return { success: false, error: "Insufficient USDT balance" };
    }

    const pipeline = r.pipeline();
    pipeline.hincrbyfloat(key, "usdt", -usdtAmount);
    pipeline.hincrbyfloat(key, "usd", usdAmount);
    await pipeline.exec();

    await addTransaction(address, {
      type: "swap",
      fromToken: "USDT",
      toToken: "USD",
      fromAmount: usdtAmount,
      toAmount: usdAmount,
      status: "completed",
    });

    return { success: true };
  } catch (error) {
    console.error("Redis convertUsdtToUsd error:", error);
    return { success: false, error: "Conversion failed" };
  }
}

/**
 * USD bakiyesi ekle (deposit)
 */
export async function addUsdBalance(
  address: string,
  amount: number,
  metadata?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    const r = getRedis();
    const key = KEYS.userBalance(address);

    // USD bakiyesini artır
    await r.hincrbyfloat(key, "usd", amount);

    // Transaction kaydı
    await addTransaction(address, {
      type: "deposit",
      token: "USD",
      amount: amount,
      status: "completed",
      metadata,
    });

    return { success: true };
  } catch (error) {
    console.error("Redis addUsdBalance error:", error);
    return { success: false, error: "Deposit failed" };
  }
}

/**
 * USD bakiyesi çıkar (withdraw)
 */
export async function withdrawUsdBalance(
  address: string,
  amount: number,
  metadata?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    const r = getRedis();
    const key = KEYS.userBalance(address);

    const balance = await getUserBalance(address);

    if (balance.usd < amount) {
      return { success: false, error: "Insufficient USD balance" };
    }

    await r.hincrbyfloat(key, "usd", -amount);

    await addTransaction(address, {
      type: "withdraw",
      token: "USD",
      amount: amount,
      status: "completed",
      metadata,
    });

    return { success: true };
  } catch (error) {
    console.error("Redis withdrawUsdBalance error:", error);
    return { success: false, error: "Withdrawal failed" };
  }
}
