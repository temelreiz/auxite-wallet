// src/lib/custody/adapter.ts
// Auxite Custody Adapter - Provider-Agnostic Interface

import {
  CustodyProvider,
  ICustodyAdapter,
  CreateVaultParams,
  CreateVaultResult,
  GetDepositAddressParams,
  CreateWithdrawalParams,
  Vault,
  DepositAddress,
  CustodyTransaction,
  SupportedAsset,
  WebhookEvent,
} from './types';

// ============================================
// ADAPTER REGISTRY
// ============================================

const adapters: Map<CustodyProvider, ICustodyAdapter> = new Map();

/**
 * Register a custody adapter
 */
export function registerAdapter(adapter: ICustodyAdapter): void {
  adapters.set(adapter.provider, adapter);
  console.log(`[Custody] Registered adapter: ${adapter.provider}`);
}

/**
 * Get a specific adapter by provider
 */
export function getAdapter(provider: CustodyProvider): ICustodyAdapter {
  const adapter = adapters.get(provider);
  if (!adapter) {
    throw new Error(`Custody adapter not found: ${provider}`);
  }
  return adapter;
}

/**
 * Get the default/active adapter based on environment
 */
export function getDefaultAdapter(): ICustodyAdapter {
  const provider = getDefaultProvider();
  return getAdapter(provider);
}

/**
 * Determine the default provider based on environment
 */
export function getDefaultProvider(): CustodyProvider {
  const env = process.env.NODE_ENV;
  const configuredProvider = process.env.CUSTODY_PROVIDER as CustodyProvider;

  // If explicitly configured, use that
  if (configuredProvider && adapters.has(configuredProvider)) {
    return configuredProvider;
  }

  // Development: use mock
  if (env === 'development') {
    return 'mock';
  }

  // Production: require Fireblocks
  if (env === 'production') {
    if (!adapters.has('fireblocks')) {
      throw new Error('Fireblocks adapter required for production');
    }
    return 'fireblocks';
  }

  // Default to mock for testing
  return 'mock';
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Create a vault for a user
 */
export async function createVault(params: CreateVaultParams): Promise<CreateVaultResult> {
  const adapter = getDefaultAdapter();
  return adapter.createVault(params);
}

/**
 * Get vault by ID
 */
export async function getVault(vaultId: string): Promise<Vault | null> {
  const adapter = getDefaultAdapter();
  return adapter.getVault(vaultId);
}

/**
 * Get vault by user ID
 */
export async function getVaultByUserId(userId: string): Promise<Vault | null> {
  const adapter = getDefaultAdapter();
  return adapter.getVaultByUserId(userId);
}

/**
 * Get deposit address for an asset
 */
export async function getDepositAddress(params: GetDepositAddressParams): Promise<DepositAddress> {
  const adapter = getDefaultAdapter();
  return adapter.getDepositAddress(params);
}

/**
 * Get all deposit addresses for a vault
 */
export async function getDepositAddresses(vaultId: string): Promise<DepositAddress[]> {
  const adapter = getDefaultAdapter();
  return adapter.getDepositAddresses(vaultId);
}

/**
 * Get transactions for a vault
 */
export async function getTransactions(vaultId: string, limit?: number): Promise<CustodyTransaction[]> {
  const adapter = getDefaultAdapter();
  return adapter.getTransactions(vaultId, limit);
}

/**
 * Get single transaction
 */
export async function getTransaction(transactionId: string): Promise<CustodyTransaction | null> {
  const adapter = getDefaultAdapter();
  return adapter.getTransaction(transactionId);
}

/**
 * Create withdrawal
 */
export async function createWithdrawal(params: CreateWithdrawalParams): Promise<CustodyTransaction> {
  const adapter = getDefaultAdapter();
  return adapter.createWithdrawal(params);
}

/**
 * Get balance for an asset
 */
export async function getBalance(vaultId: string, asset: SupportedAsset): Promise<string> {
  const adapter = getDefaultAdapter();
  return adapter.getBalance(vaultId, asset);
}

/**
 * Get all balances for a vault
 */
export async function getAllBalances(vaultId: string): Promise<Record<SupportedAsset, string>> {
  const adapter = getDefaultAdapter();
  return adapter.getAllBalances(vaultId);
}

/**
 * Verify webhook signature
 */
export async function verifyWebhook(
  provider: CustodyProvider,
  payload: unknown,
  signature: string
): Promise<boolean> {
  const adapter = getAdapter(provider);
  return adapter.verifyWebhook(payload, signature);
}

/**
 * Parse webhook event
 */
export function parseWebhookEvent(provider: CustodyProvider, payload: unknown): WebhookEvent {
  const adapter = getAdapter(provider);
  return adapter.parseWebhookEvent(payload);
}

// ============================================
// INITIALIZATION
// ============================================

let initialized = false;

/**
 * Initialize custody adapters
 * Call this at app startup
 */
export async function initializeCustody(): Promise<void> {
  if (initialized) {
    console.log('[Custody] Already initialized');
    return;
  }

  console.log('[Custody] Initializing custody adapters...');

  // Always register mock adapter for development/testing
  const { MockCustodyAdapter } = await import('./mock');
  registerAdapter(new MockCustodyAdapter());

  // Register Fireblocks if configured
  const fireblocksApiKey = process.env.FIREBLOCKS_API_KEY;
  const fireblocksApiSecret = process.env.FIREBLOCKS_API_SECRET;

  if (fireblocksApiKey && fireblocksApiSecret) {
    const { FireblocksCustodyAdapter } = await import('./fireblocks');
    registerAdapter(new FireblocksCustodyAdapter());
    console.log('[Custody] Fireblocks adapter registered');
  } else if (process.env.NODE_ENV === 'production') {
    console.warn('[Custody] WARNING: Fireblocks not configured in production!');
  }

  initialized = true;
  console.log(`[Custody] Initialized with default provider: ${getDefaultProvider()}`);
}

// ============================================
// EXPORTS
// ============================================

export * from './types';
