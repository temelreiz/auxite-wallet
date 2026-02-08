// src/lib/custody/mock.ts
// Auxite Custody - Mock Adapter for Development & Testing

import crypto from 'crypto';
import {
  ICustodyAdapter,
  CustodyProvider,
  Vault,
  DepositAddress,
  CustodyTransaction,
  SupportedAsset,
  NetworkType,
  CreateVaultParams,
  CreateVaultResult,
  GetDepositAddressParams,
  CreateWithdrawalParams,
  WebhookEvent,
  SUPPORTED_ASSETS,
  ASSET_NETWORKS,
  REQUIRED_CONFIRMATIONS,
} from './types';
import * as storage from './storage';

// ============================================
// MOCK ADDRESS GENERATORS
// ============================================

function generateMockBtcAddress(): string {
  // Generate realistic looking testnet address
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let address = 'tb1q'; // Testnet bech32 prefix
  for (let i = 0; i < 38; i++) {
    address += chars[Math.floor(Math.random() * chars.length)];
  }
  return address;
}

function generateMockEthAddress(): string {
  // Generate realistic looking ETH address
  return '0x' + crypto.randomBytes(20).toString('hex');
}

function generateMockAddress(asset: SupportedAsset): string {
  switch (asset) {
    case 'BTC':
      return generateMockBtcAddress();
    case 'ETH':
    case 'USDC':
    case 'USDT':
      return generateMockEthAddress();
    default:
      return generateMockEthAddress();
  }
}

// ============================================
// MOCK BALANCES (for testing)
// ============================================

const mockBalances: Map<string, Record<SupportedAsset, string>> = new Map();

function getMockBalance(vaultId: string, asset: SupportedAsset): string {
  const balances = mockBalances.get(vaultId);
  if (!balances) {
    return '0';
  }
  return balances[asset] || '0';
}

function setMockBalance(vaultId: string, asset: SupportedAsset, amount: string): void {
  let balances = mockBalances.get(vaultId);
  if (!balances) {
    balances = { BTC: '0', ETH: '0', USDC: '0', USDT: '0' };
    mockBalances.set(vaultId, balances);
  }
  balances[asset] = amount;
}

// ============================================
// MOCK CUSTODY ADAPTER
// ============================================

export class MockCustodyAdapter implements ICustodyAdapter {
  readonly provider: CustodyProvider = 'mock';

  /**
   * Create a new vault for a user
   */
  async createVault(params: CreateVaultParams): Promise<CreateVaultResult> {
    console.log(`[Mock Custody] Creating vault for user: ${params.userId}`);

    // Check if user already has a vault
    const existingVault = await storage.getVaultByUserId(params.userId);
    if (existingVault) {
      throw new Error('User already has a vault');
    }

    // Create vault
    const vault: Vault = {
      id: `vault_${crypto.randomUUID()}`,
      externalId: `mock_vault_${Date.now()}`,
      userId: params.userId,
      provider: 'mock',
      status: 'active',
      name: params.name || 'Client Vault',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await storage.saveVault(vault);

    // Generate deposit addresses for all supported assets
    const addresses: DepositAddress[] = [];

    for (const asset of SUPPORTED_ASSETS) {
      const network = ASSET_NETWORKS[asset][0];
      const address: DepositAddress = {
        id: `addr_${crypto.randomUUID()}`,
        vaultId: vault.id,
        asset,
        network,
        address: generateMockAddress(asset),
        externalId: `mock_addr_${Date.now()}_${asset}`,
        createdAt: Date.now(),
      };

      await storage.saveDepositAddress(address);
      addresses.push(address);
    }

    // Initialize mock balances
    mockBalances.set(vault.id, {
      BTC: '0',
      ETH: '0',
      USDC: '0',
      USDT: '0',
    });

    console.log(`[Mock Custody] Vault created: ${vault.id}`);
    return { vault, addresses };
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
      const newAddress: DepositAddress = {
        id: `addr_${crypto.randomUUID()}`,
        vaultId: params.vaultId,
        asset: params.asset,
        network,
        address: generateMockAddress(params.asset),
        externalId: `mock_addr_${Date.now()}_${params.asset}`,
        createdAt: Date.now(),
      };

      await storage.saveDepositAddress(newAddress);
      return newAddress;
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
   * Create withdrawal (mock - immediate completion)
   */
  async createWithdrawal(params: CreateWithdrawalParams): Promise<CustodyTransaction> {
    console.log(`[Mock Custody] Creating withdrawal: ${params.amount} ${params.asset}`);

    // Check balance
    const balance = getMockBalance(params.vaultId, params.asset);
    if (parseFloat(balance) < parseFloat(params.amount)) {
      throw new Error('Insufficient balance');
    }

    // Create transaction
    const tx: CustodyTransaction = {
      id: `tx_${crypto.randomUUID()}`,
      externalId: `mock_tx_${Date.now()}`,
      vaultId: params.vaultId,
      type: 'WITHDRAWAL',
      status: 'COMPLETED', // Mock: immediate completion
      asset: params.asset,
      network: params.network,
      amount: params.amount,
      toAddress: params.toAddress,
      txHash: `0x${crypto.randomBytes(32).toString('hex')}`,
      confirmations: REQUIRED_CONFIRMATIONS[params.asset],
      requiredConfirmations: REQUIRED_CONFIRMATIONS[params.asset],
      fee: '0.0001',
      feeAsset: params.asset === 'BTC' ? 'BTC' : 'ETH',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      settledAt: Date.now(),
    };

    await storage.saveTransaction(tx);

    // Update mock balance
    const newBalance = (parseFloat(balance) - parseFloat(params.amount)).toFixed(8);
    setMockBalance(params.vaultId, params.asset, newBalance);

    return tx;
  }

  /**
   * Get balance for an asset
   */
  async getBalance(vaultId: string, asset: SupportedAsset): Promise<string> {
    return getMockBalance(vaultId, asset);
  }

  /**
   * Get all balances for a vault
   */
  async getAllBalances(vaultId: string): Promise<Record<SupportedAsset, string>> {
    const balances = mockBalances.get(vaultId);
    return balances || { BTC: '0', ETH: '0', USDC: '0', USDT: '0' };
  }

  /**
   * Verify webhook (mock - always true)
   */
  async verifyWebhook(_payload: unknown, _signature: string): Promise<boolean> {
    return true;
  }

  /**
   * Parse webhook event
   */
  parseWebhookEvent(payload: unknown): WebhookEvent {
    const data = payload as Record<string, unknown>;
    return {
      id: String(data.id || crypto.randomUUID()),
      type: 'TRANSACTION_STATUS_UPDATED',
      timestamp: Date.now(),
      provider: 'mock',
      data: data as Record<string, unknown>,
    };
  }
}

// ============================================
// MOCK DEPOSIT SIMULATOR
// ============================================

/**
 * Simulate an incoming deposit (for testing)
 */
export async function simulateDeposit(
  vaultId: string,
  asset: SupportedAsset,
  amount: string,
  fromAddress?: string
): Promise<CustodyTransaction> {
  console.log(`[Mock Custody] Simulating deposit: ${amount} ${asset} to vault ${vaultId}`);

  const addresses = await storage.getVaultDepositAddresses(vaultId);
  const depositAddress = addresses.find((a) => a.asset === asset);

  if (!depositAddress) {
    throw new Error(`No ${asset} deposit address found`);
  }

  // Create deposit transaction
  const tx: CustodyTransaction = {
    id: `tx_${crypto.randomUUID()}`,
    externalId: `mock_deposit_${Date.now()}`,
    vaultId,
    type: 'DEPOSIT',
    status: 'COMPLETED',
    asset,
    network: ASSET_NETWORKS[asset][0],
    amount,
    fromAddress: fromAddress || generateMockAddress(asset),
    toAddress: depositAddress.address,
    txHash: `0x${crypto.randomBytes(32).toString('hex')}`,
    confirmations: REQUIRED_CONFIRMATIONS[asset],
    requiredConfirmations: REQUIRED_CONFIRMATIONS[asset],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    settledAt: Date.now(),
  };

  await storage.saveTransaction(tx);

  // Update mock balance
  const currentBalance = getMockBalance(vaultId, asset);
  const newBalance = (parseFloat(currentBalance) + parseFloat(amount)).toFixed(8);
  setMockBalance(vaultId, asset, newBalance);

  console.log(`[Mock Custody] Deposit completed: ${tx.id}`);
  return tx;
}

/**
 * Simulate transaction status progression (for testing webhooks)
 */
export async function simulateTransactionProgress(
  transactionId: string,
  targetStatus: 'CONFIRMING' | 'COMPLETED' | 'FAILED'
): Promise<void> {
  const tx = await storage.getTransaction(transactionId);
  if (!tx) {
    throw new Error('Transaction not found');
  }

  await storage.updateTransactionStatus(tx.id, targetStatus, {
    confirmations:
      targetStatus === 'COMPLETED' ? tx.requiredConfirmations : Math.floor(tx.requiredConfirmations / 2),
  });

  console.log(`[Mock Custody] Transaction ${transactionId} status updated to ${targetStatus}`);
}
