// src/lib/custody/storage.ts
// Auxite Custody Storage - Redis-based Vault & Transaction Storage

import { getRedis } from '@/lib/redis';
import {
  Vault,
  VaultStatus,
  DepositAddress,
  CustodyTransaction,
  TransactionStatus,
  SupportedAsset,
  CustodyProvider,
  CapitalEntry,
  CapitalStatus,
} from './types';

// ============================================
// REDIS KEY PATTERNS
// ============================================

const KEYS = {
  // Vault keys
  vault: (vaultId: string) => `custody:vault:${vaultId}`,
  vaultByUser: (userId: string) => `custody:vault:user:${userId}`,
  vaultAddresses: (vaultId: string) => `custody:vault:${vaultId}:addresses`,

  // Address keys
  address: (addressId: string) => `custody:address:${addressId}`,
  addressByValue: (address: string) => `custody:address:lookup:${address.toLowerCase()}`,

  // Transaction keys
  transaction: (txId: string) => `custody:tx:${txId}`,
  transactionByExternal: (externalId: string) => `custody:tx:external:${externalId}`,
  vaultTransactions: (vaultId: string) => `custody:vault:${vaultId}:transactions`,
  pendingTransactions: 'custody:transactions:pending',

  // Capital keys
  capital: (entryId: string) => `custody:capital:${entryId}`,
  vaultCapital: (vaultId: string) => `custody:vault:${vaultId}:capital`,

  // Balance keys (cached)
  vaultBalance: (vaultId: string, asset: SupportedAsset) =>
    `custody:vault:${vaultId}:balance:${asset}`,

  // Indexes
  allVaults: 'custody:vaults:all',
};

// ============================================
// VAULT OPERATIONS
// ============================================

/**
 * Save a vault to storage
 */
export async function saveVault(vault: Vault): Promise<void> {
  const redis = getRedis();
  const key = KEYS.vault(vault.id);

  await redis.hset(key, vault as unknown as unknown as Record<string, unknown>);

  // Create user -> vault index
  await redis.set(KEYS.vaultByUser(vault.userId), vault.id);

  // Add to all vaults set
  await redis.sadd(KEYS.allVaults, vault.id);
}

/**
 * Get vault by ID
 */
export async function getVault(vaultId: string): Promise<Vault | null> {
  const redis = getRedis();
  const data = await redis.hgetall(KEYS.vault(vaultId));

  if (!data || Object.keys(data).length === 0) {
    return null;
  }

  return parseVault(data);
}

/**
 * Get vault by user ID
 */
export async function getVaultByUserId(userId: string): Promise<Vault | null> {
  const redis = getRedis();
  const vaultId = await redis.get(KEYS.vaultByUser(userId));

  if (!vaultId) {
    return null;
  }

  return getVault(vaultId as string);
}

/**
 * Update vault status
 */
export async function updateVaultStatus(
  vaultId: string,
  status: VaultStatus
): Promise<void> {
  const redis = getRedis();
  await redis.hset(KEYS.vault(vaultId), {
    status,
    updatedAt: Date.now(),
  });
}

/**
 * Parse vault from Redis hash
 */
function parseVault(data: Record<string, unknown>): Vault {
  return {
    id: String(data.id),
    externalId: String(data.externalId),
    userId: String(data.userId),
    provider: String(data.provider) as CustodyProvider,
    status: String(data.status) as VaultStatus,
    name: String(data.name),
    createdAt: Number(data.createdAt),
    updatedAt: Number(data.updatedAt),
  };
}

// ============================================
// DEPOSIT ADDRESS OPERATIONS
// ============================================

/**
 * Save deposit address
 */
export async function saveDepositAddress(address: DepositAddress): Promise<void> {
  const redis = getRedis();

  // Save address data
  await redis.hset(KEYS.address(address.id), address as unknown as Record<string, unknown>);

  // Create address -> ID lookup
  await redis.set(KEYS.addressByValue(address.address), address.id);

  // Add to vault's addresses list
  await redis.sadd(KEYS.vaultAddresses(address.vaultId), address.id);
}

/**
 * Get deposit address by ID
 */
export async function getDepositAddress(addressId: string): Promise<DepositAddress | null> {
  const redis = getRedis();
  const data = await redis.hgetall(KEYS.address(addressId));

  if (!data || Object.keys(data).length === 0) {
    return null;
  }

  return parseDepositAddress(data);
}

/**
 * Get deposit address by blockchain address
 */
export async function getDepositAddressByValue(
  address: string
): Promise<DepositAddress | null> {
  const redis = getRedis();
  const addressId = await redis.get(KEYS.addressByValue(address));

  if (!addressId) {
    return null;
  }

  return getDepositAddress(addressId as string);
}

/**
 * Get all deposit addresses for a vault
 */
export async function getVaultDepositAddresses(
  vaultId: string
): Promise<DepositAddress[]> {
  const redis = getRedis();
  const addressIds = await redis.smembers(KEYS.vaultAddresses(vaultId));

  if (!addressIds || addressIds.length === 0) {
    return [];
  }

  const addresses: DepositAddress[] = [];
  for (const id of addressIds) {
    const address = await getDepositAddress(id as string);
    if (address) {
      addresses.push(address);
    }
  }

  return addresses;
}

/**
 * Parse deposit address from Redis hash
 */
function parseDepositAddress(data: Record<string, unknown>): DepositAddress {
  return {
    id: String(data.id),
    vaultId: String(data.vaultId),
    asset: String(data.asset) as SupportedAsset,
    network: String(data.network) as any,
    address: String(data.address),
    tag: data.tag ? String(data.tag) : undefined,
    externalId: data.externalId ? String(data.externalId) : undefined,
    createdAt: Number(data.createdAt),
  };
}

// ============================================
// TRANSACTION OPERATIONS
// ============================================

/**
 * Save transaction
 */
export async function saveTransaction(tx: CustodyTransaction): Promise<void> {
  const redis = getRedis();

  // Save transaction data
  await redis.hset(KEYS.transaction(tx.id), tx as unknown as Record<string, unknown>);

  // Create external ID -> ID lookup
  if (tx.externalId) {
    await redis.set(KEYS.transactionByExternal(tx.externalId), tx.id);
  }

  // Add to vault's transactions list (sorted by timestamp)
  await redis.zadd(KEYS.vaultTransactions(tx.vaultId), {
    score: tx.createdAt,
    member: tx.id,
  });

  // Track pending transactions
  if (['PENDING_AML', 'PENDING_CONFIRMATION', 'CONFIRMING'].includes(tx.status)) {
    await redis.sadd(KEYS.pendingTransactions, tx.id);
  } else {
    await redis.srem(KEYS.pendingTransactions, tx.id);
  }
}

/**
 * Get transaction by ID
 */
export async function getTransaction(txId: string): Promise<CustodyTransaction | null> {
  const redis = getRedis();
  const data = await redis.hgetall(KEYS.transaction(txId));

  if (!data || Object.keys(data).length === 0) {
    return null;
  }

  return parseTransaction(data);
}

/**
 * Get transaction by external ID
 */
export async function getTransactionByExternalId(
  externalId: string
): Promise<CustodyTransaction | null> {
  const redis = getRedis();
  const txId = await redis.get(KEYS.transactionByExternal(externalId));

  if (!txId) {
    return null;
  }

  return getTransaction(txId as string);
}

/**
 * Get transactions for a vault
 */
export async function getVaultTransactions(
  vaultId: string,
  limit: number = 50
): Promise<CustodyTransaction[]> {
  const redis = getRedis();

  // Get transaction IDs sorted by timestamp (descending)
  const txIds = await redis.zrange(
    KEYS.vaultTransactions(vaultId),
    0,
    limit - 1,
    { rev: true }
  );

  if (!txIds || txIds.length === 0) {
    return [];
  }

  const transactions: CustodyTransaction[] = [];
  for (const id of txIds) {
    const tx = await getTransaction(id as string);
    if (tx) {
      transactions.push(tx);
    }
  }

  return transactions;
}

/**
 * Update transaction status
 */
export async function updateTransactionStatus(
  txId: string,
  status: TransactionStatus,
  updates?: Partial<CustodyTransaction>
): Promise<void> {
  const redis = getRedis();

  const updateData: Record<string, unknown> = {
    status,
    updatedAt: Date.now(),
    ...updates,
  };

  // If completed, add settled timestamp
  if (status === 'COMPLETED') {
    updateData.settledAt = Date.now();
  }

  await redis.hset(KEYS.transaction(txId), updateData);

  // Update pending set
  if (['PENDING_AML', 'PENDING_CONFIRMATION', 'CONFIRMING'].includes(status)) {
    await redis.sadd(KEYS.pendingTransactions, txId);
  } else {
    await redis.srem(KEYS.pendingTransactions, txId);
  }
}

/**
 * Get all pending transactions
 */
export async function getPendingTransactions(): Promise<CustodyTransaction[]> {
  const redis = getRedis();
  const txIds = await redis.smembers(KEYS.pendingTransactions);

  if (!txIds || txIds.length === 0) {
    return [];
  }

  const transactions: CustodyTransaction[] = [];
  for (const id of txIds) {
    const tx = await getTransaction(id as string);
    if (tx) {
      transactions.push(tx);
    }
  }

  return transactions;
}

/**
 * Parse transaction from Redis hash
 */
function parseTransaction(data: Record<string, unknown>): CustodyTransaction {
  return {
    id: String(data.id),
    externalId: String(data.externalId),
    vaultId: String(data.vaultId),
    type: String(data.type) as any,
    status: String(data.status) as TransactionStatus,
    asset: String(data.asset) as SupportedAsset,
    network: String(data.network) as any,
    amount: String(data.amount),
    amountUsd: data.amountUsd ? String(data.amountUsd) : undefined,
    fromAddress: data.fromAddress ? String(data.fromAddress) : undefined,
    toAddress: data.toAddress ? String(data.toAddress) : undefined,
    txHash: data.txHash ? String(data.txHash) : undefined,
    confirmations: Number(data.confirmations || 0),
    requiredConfirmations: Number(data.requiredConfirmations || 0),
    fee: data.fee ? String(data.fee) : undefined,
    feeAsset: data.feeAsset ? String(data.feeAsset) : undefined,
    amlStatus: data.amlStatus as any,
    createdAt: Number(data.createdAt),
    updatedAt: Number(data.updatedAt),
    settledAt: data.settledAt ? Number(data.settledAt) : undefined,
    metadata: data.metadata ? JSON.parse(String(data.metadata)) : undefined,
  };
}

// ============================================
// CAPITAL OPERATIONS
// ============================================

/**
 * Save capital entry
 */
export async function saveCapitalEntry(entry: CapitalEntry): Promise<void> {
  const redis = getRedis();

  await redis.hset(KEYS.capital(entry.id), entry as unknown as Record<string, unknown>);
  await redis.sadd(KEYS.vaultCapital(entry.vaultId), entry.id);
}

/**
 * Get capital entries for a vault
 */
export async function getVaultCapital(vaultId: string): Promise<CapitalEntry[]> {
  const redis = getRedis();
  const entryIds = await redis.smembers(KEYS.vaultCapital(vaultId));

  if (!entryIds || entryIds.length === 0) {
    return [];
  }

  const entries: CapitalEntry[] = [];
  for (const id of entryIds) {
    const data = await redis.hgetall(KEYS.capital(id as string));
    if (data && Object.keys(data).length > 0) {
      entries.push(parseCapitalEntry(data));
    }
  }

  return entries;
}

/**
 * Update capital status
 */
export async function updateCapitalStatus(
  entryId: string,
  status: CapitalStatus,
  updates?: Partial<CapitalEntry>
): Promise<void> {
  const redis = getRedis();
  await redis.hset(KEYS.capital(entryId), {
    status,
    updatedAt: Date.now(),
    ...updates,
  });
}

/**
 * Parse capital entry from Redis hash
 */
function parseCapitalEntry(data: Record<string, unknown>): CapitalEntry {
  return {
    id: String(data.id),
    vaultId: String(data.vaultId),
    asset: String(data.asset) as any,
    amount: String(data.amount),
    status: String(data.status) as CapitalStatus,
    sourceTransactionId: data.sourceTransactionId
      ? String(data.sourceTransactionId)
      : undefined,
    allocatedTo: data.allocatedTo ? String(data.allocatedTo) : undefined,
    encumberedBy: data.encumberedBy ? String(data.encumberedBy) : undefined,
    createdAt: Number(data.createdAt),
    updatedAt: Number(data.updatedAt),
  };
}

// ============================================
// BALANCE CACHE OPERATIONS
// ============================================

/**
 * Cache vault balance for an asset
 */
export async function cacheBalance(
  vaultId: string,
  asset: SupportedAsset,
  balance: string
): Promise<void> {
  const redis = getRedis();
  await redis.set(KEYS.vaultBalance(vaultId, asset), balance, { ex: 60 }); // 1 minute cache
}

/**
 * Get cached balance
 */
export async function getCachedBalance(
  vaultId: string,
  asset: SupportedAsset
): Promise<string | null> {
  const redis = getRedis();
  const balance = await redis.get(KEYS.vaultBalance(vaultId, asset));
  return balance ? String(balance) : null;
}

/**
 * Invalidate balance cache for a vault
 */
export async function invalidateBalanceCache(vaultId: string): Promise<void> {
  const redis = getRedis();
  const assets: SupportedAsset[] = ['BTC', 'ETH', 'USDC', 'USDT'];

  for (const asset of assets) {
    await redis.del(KEYS.vaultBalance(vaultId, asset));
  }
}
