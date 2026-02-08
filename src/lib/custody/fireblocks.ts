// src/lib/custody/fireblocks.ts
// Auxite Custody - Fireblocks Adapter Implementation

import crypto from 'crypto';
import {
  ICustodyAdapter,
  CustodyProvider,
  Vault,
  VaultStatus,
  DepositAddress,
  CustodyTransaction,
  TransactionStatus,
  SupportedAsset,
  NetworkType,
  CreateVaultParams,
  CreateVaultResult,
  GetDepositAddressParams,
  CreateWithdrawalParams,
  WebhookEvent,
  WebhookEventType,
  SUPPORTED_ASSETS,
  ASSET_NETWORKS,
  REQUIRED_CONFIRMATIONS,
} from './types';
import * as storage from './storage';

// ============================================
// FIREBLOCKS API CONFIGURATION
// ============================================

interface FireblocksConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
}

function getConfig(): FireblocksConfig {
  const apiKey = process.env.FIREBLOCKS_API_KEY;
  const apiSecret = process.env.FIREBLOCKS_API_SECRET;
  const baseUrl = process.env.FIREBLOCKS_API_URL || 'https://api.fireblocks.io';

  if (!apiKey || !apiSecret) {
    throw new Error('Fireblocks API credentials not configured');
  }

  return { apiKey, apiSecret, baseUrl };
}

// ============================================
// FIREBLOCKS API CLIENT
// ============================================

async function fireblocksRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const config = getConfig();
  const timestamp = Date.now();
  const nonce = crypto.randomUUID();

  // Create JWT token for Fireblocks API
  const token = signFireblocksRequest(
    config.apiSecret,
    path,
    body ? JSON.stringify(body) : '',
    timestamp,
    nonce
  );

  const response = await fetch(`${config.baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': config.apiKey,
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`[Fireblocks] API Error: ${response.status}`, error);
    throw new Error(`Fireblocks API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Sign Fireblocks API request
 * Fireblocks uses JWT with RS256
 */
function signFireblocksRequest(
  privateKey: string,
  path: string,
  body: string,
  timestamp: number,
  nonce: string
): string {
  // Create JWT payload
  const payload = {
    uri: path,
    nonce,
    iat: Math.floor(timestamp / 1000),
    exp: Math.floor(timestamp / 1000) + 30, // 30 seconds
    sub: process.env.FIREBLOCKS_API_KEY,
    bodyHash: crypto.createHash('sha256').update(body || '').digest('hex'),
  };

  // Sign with RS256
  // Note: In production, use a proper JWT library
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(`${header}.${payloadB64}`);
  const signature = sign.sign(privateKey, 'base64url');

  return `${header}.${payloadB64}.${signature}`;
}

// ============================================
// ASSET ID MAPPING
// ============================================

const FIREBLOCKS_ASSET_IDS: Record<SupportedAsset, string> = {
  BTC: 'BTC',
  ETH: 'ETH',
  USDC: 'USDC',
  USDT: 'USDT',
};

const FIREBLOCKS_NETWORK_IDS: Record<NetworkType, string> = {
  BITCOIN: 'BTC',
  ETHEREUM: 'ETH',
  POLYGON: 'POLYGON',
  ARBITRUM: 'ARBITRUM',
};

// ============================================
// FIREBLOCKS ADAPTER
// ============================================

export class FireblocksCustodyAdapter implements ICustodyAdapter {
  readonly provider: CustodyProvider = 'fireblocks';

  /**
   * Create a new vault for a user
   */
  async createVault(params: CreateVaultParams): Promise<CreateVaultResult> {
    console.log(`[Fireblocks] Creating vault for user: ${params.userId}`);

    // Check if user already has a vault
    const existingVault = await storage.getVaultByUserId(params.userId);
    if (existingVault) {
      throw new Error('User already has a vault');
    }

    // Create vault in Fireblocks
    const fireblocksVault = await fireblocksRequest<{
      id: string;
      name: string;
    }>('POST', '/v1/vault/accounts', {
      name: params.name || `Auxite Client Vault - ${params.userId.substring(0, 8)}`,
      hiddenOnUI: false,
      autoFuel: false,
    });

    // Create local vault record
    const vault: Vault = {
      id: `vault_${crypto.randomUUID()}`,
      externalId: fireblocksVault.id,
      userId: params.userId,
      provider: 'fireblocks',
      status: 'active',
      name: params.name || 'Client Vault',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await storage.saveVault(vault);

    // Generate deposit addresses for all supported assets
    const addresses: DepositAddress[] = [];

    for (const asset of SUPPORTED_ASSETS) {
      const network = ASSET_NETWORKS[asset][0]; // Primary network
      const address = await this.createDepositAddress(vault.id, fireblocksVault.id, asset, network);
      addresses.push(address);
    }

    console.log(`[Fireblocks] Vault created: ${vault.id} with ${addresses.length} addresses`);

    return { vault, addresses };
  }

  /**
   * Create deposit address in Fireblocks
   */
  private async createDepositAddress(
    vaultId: string,
    fireblocksVaultId: string,
    asset: SupportedAsset,
    network: NetworkType
  ): Promise<DepositAddress> {
    const assetId = FIREBLOCKS_ASSET_IDS[asset];

    // Create wallet in Fireblocks
    const fireblocksWallet = await fireblocksRequest<{
      id: string;
      address: string;
      tag?: string;
    }>('POST', `/v1/vault/accounts/${fireblocksVaultId}/${assetId}`, {});

    const depositAddress: DepositAddress = {
      id: `addr_${crypto.randomUUID()}`,
      vaultId,
      asset,
      network,
      address: fireblocksWallet.address,
      tag: fireblocksWallet.tag,
      externalId: fireblocksWallet.id,
      createdAt: Date.now(),
    };

    await storage.saveDepositAddress(depositAddress);
    return depositAddress;
  }

  /**
   * Get vault by ID
   */
  async getVault(vaultId: string): Promise<Vault | null> {
    return storage.getVault(vaultId);
  }

  /**
   * Get vault by user ID
   */
  async getVaultByUserId(userId: string): Promise<Vault | null> {
    return storage.getVaultByUserId(userId);
  }

  /**
   * Get deposit address for an asset
   */
  async getDepositAddress(params: GetDepositAddressParams): Promise<DepositAddress> {
    const addresses = await storage.getVaultDepositAddresses(params.vaultId);
    const network = params.network || ASSET_NETWORKS[params.asset][0];

    const address = addresses.find(
      (a) => a.asset === params.asset && a.network === network
    );

    if (!address) {
      // Create new address if not found
      const vault = await storage.getVault(params.vaultId);
      if (!vault) {
        throw new Error('Vault not found');
      }

      return this.createDepositAddress(
        params.vaultId,
        vault.externalId,
        params.asset,
        network
      );
    }

    return address;
  }

  /**
   * Get all deposit addresses for a vault
   */
  async getDepositAddresses(vaultId: string): Promise<DepositAddress[]> {
    return storage.getVaultDepositAddresses(vaultId);
  }

  /**
   * Get transactions for a vault
   */
  async getTransactions(vaultId: string, limit?: number): Promise<CustodyTransaction[]> {
    return storage.getVaultTransactions(vaultId, limit || 50);
  }

  /**
   * Get single transaction
   */
  async getTransaction(transactionId: string): Promise<CustodyTransaction | null> {
    return storage.getTransaction(transactionId);
  }

  /**
   * Create withdrawal
   */
  async createWithdrawal(params: CreateWithdrawalParams): Promise<CustodyTransaction> {
    const vault = await storage.getVault(params.vaultId);
    if (!vault) {
      throw new Error('Vault not found');
    }

    const assetId = FIREBLOCKS_ASSET_IDS[params.asset];

    // Create transaction in Fireblocks
    const fbTx = await fireblocksRequest<{
      id: string;
      status: string;
    }>('POST', '/v1/transactions', {
      assetId,
      source: {
        type: 'VAULT_ACCOUNT',
        id: vault.externalId,
      },
      destination: {
        type: 'ONE_TIME_ADDRESS',
        oneTimeAddress: {
          address: params.toAddress,
        },
      },
      amount: params.amount,
      note: params.note || 'Auxite Withdrawal',
    });

    // Create local transaction record
    const tx: CustodyTransaction = {
      id: `tx_${crypto.randomUUID()}`,
      externalId: fbTx.id,
      vaultId: params.vaultId,
      type: 'WITHDRAWAL',
      status: 'PENDING_CONFIRMATION',
      asset: params.asset,
      network: params.network,
      amount: params.amount,
      toAddress: params.toAddress,
      confirmations: 0,
      requiredConfirmations: REQUIRED_CONFIRMATIONS[params.asset],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await storage.saveTransaction(tx);
    return tx;
  }

  /**
   * Get balance for an asset
   */
  async getBalance(vaultId: string, asset: SupportedAsset): Promise<string> {
    // Check cache first
    const cached = await storage.getCachedBalance(vaultId, asset);
    if (cached) {
      return cached;
    }

    // Fetch from Fireblocks
    const vault = await storage.getVault(vaultId);
    if (!vault) {
      throw new Error('Vault not found');
    }

    const assetId = FIREBLOCKS_ASSET_IDS[asset];
    const response = await fireblocksRequest<{
      available: string;
      total: string;
    }>('GET', `/v1/vault/accounts/${vault.externalId}/${assetId}`);

    // Cache the balance
    await storage.cacheBalance(vaultId, asset, response.available);

    return response.available;
  }

  /**
   * Get all balances for a vault
   */
  async getAllBalances(vaultId: string): Promise<Record<SupportedAsset, string>> {
    const balances: Record<SupportedAsset, string> = {
      BTC: '0',
      ETH: '0',
      USDC: '0',
      USDT: '0',
    };

    for (const asset of SUPPORTED_ASSETS) {
      try {
        balances[asset] = await this.getBalance(vaultId, asset);
      } catch (error) {
        console.error(`[Fireblocks] Failed to get balance for ${asset}:`, error);
      }
    }

    return balances;
  }

  /**
   * Verify webhook signature
   */
  async verifyWebhook(payload: unknown, signature: string): Promise<boolean> {
    const config = getConfig();

    // Fireblocks uses HMAC-SHA512
    const expectedSignature = crypto
      .createHmac('sha512', config.apiSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Parse webhook event
   */
  parseWebhookEvent(payload: unknown): WebhookEvent {
    const data = payload as Record<string, unknown>;

    // Map Fireblocks event type to our types
    const typeMap: Record<string, WebhookEventType> = {
      TRANSACTION_CREATED: 'TRANSACTION_CREATED',
      TRANSACTION_STATUS_UPDATED: 'TRANSACTION_STATUS_UPDATED',
      TRANSACTION_COMPLETED: 'TRANSACTION_COMPLETED',
      TRANSACTION_FAILED: 'TRANSACTION_FAILED',
    };

    return {
      id: String(data.id || crypto.randomUUID()),
      type: typeMap[String(data.type)] || 'TRANSACTION_STATUS_UPDATED',
      timestamp: Date.now(),
      provider: 'fireblocks',
      data: data as Record<string, unknown>,
    };
  }
}

// ============================================
// WEBHOOK HANDLER
// ============================================

/**
 * Handle Fireblocks webhook event
 */
export async function handleFireblocksWebhook(event: WebhookEvent): Promise<void> {
  console.log(`[Fireblocks] Webhook event: ${event.type}`, event.data);

  const data = event.data as Record<string, unknown>;

  switch (event.type) {
    case 'TRANSACTION_CREATED':
    case 'TRANSACTION_STATUS_UPDATED':
      await handleTransactionUpdate(data);
      break;

    case 'TRANSACTION_COMPLETED':
      await handleTransactionCompleted(data);
      break;

    case 'TRANSACTION_FAILED':
      await handleTransactionFailed(data);
      break;

    default:
      console.log(`[Fireblocks] Unhandled event type: ${event.type}`);
  }
}

async function handleTransactionUpdate(data: Record<string, unknown>): Promise<void> {
  const externalId = String(data.id);
  const tx = await storage.getTransactionByExternalId(externalId);

  if (!tx) {
    // New incoming transaction - create record
    console.log(`[Fireblocks] New transaction detected: ${externalId}`);
    // TODO: Create new transaction record for deposits
    return;
  }

  // Map Fireblocks status to our status
  const statusMap: Record<string, TransactionStatus> = {
    SUBMITTED: 'PENDING_CONFIRMATION',
    PENDING_AUTHORIZATION: 'PENDING_CONFIRMATION',
    QUEUED: 'PENDING_CONFIRMATION',
    PENDING_SIGNATURE: 'PENDING_CONFIRMATION',
    PENDING_3RD_PARTY: 'PENDING_CONFIRMATION',
    BROADCASTING: 'PENDING_CONFIRMATION',
    CONFIRMING: 'CONFIRMING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    CANCELLED: 'CANCELLED',
    BLOCKED: 'BLOCKED',
  };

  const newStatus = statusMap[String(data.status)] || tx.status;
  const confirmations = Number(data.numOfConfirmations || 0);

  await storage.updateTransactionStatus(tx.id, newStatus, {
    confirmations,
    txHash: data.txHash ? String(data.txHash) : tx.txHash,
  });
}

async function handleTransactionCompleted(data: Record<string, unknown>): Promise<void> {
  const externalId = String(data.id);
  const tx = await storage.getTransactionByExternalId(externalId);

  if (!tx) {
    console.error(`[Fireblocks] Transaction not found: ${externalId}`);
    return;
  }

  await storage.updateTransactionStatus(tx.id, 'COMPLETED', {
    confirmations: tx.requiredConfirmations,
    txHash: data.txHash ? String(data.txHash) : tx.txHash,
  });

  // Invalidate balance cache
  await storage.invalidateBalanceCache(tx.vaultId);

  console.log(`[Fireblocks] Transaction completed: ${tx.id}`);
}

async function handleTransactionFailed(data: Record<string, unknown>): Promise<void> {
  const externalId = String(data.id);
  const tx = await storage.getTransactionByExternalId(externalId);

  if (!tx) {
    console.error(`[Fireblocks] Transaction not found: ${externalId}`);
    return;
  }

  await storage.updateTransactionStatus(tx.id, 'FAILED', {
    metadata: {
      ...tx.metadata,
      failureReason: data.subStatus || data.status,
    },
  });

  console.log(`[Fireblocks] Transaction failed: ${tx.id}`);
}
