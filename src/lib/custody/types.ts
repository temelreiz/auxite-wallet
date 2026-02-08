// src/lib/custody/types.ts
// Auxite Custody Types - Provider-Agnostic Definitions

// ============================================
// VAULT TYPES
// ============================================

export type VaultStatus =
  | 'pending'      // Vault creation in progress
  | 'active'       // Vault ready for deposits
  | 'suspended'    // Temporarily suspended (compliance)
  | 'closed';      // Permanently closed

export type CustodyProvider =
  | 'fireblocks'   // Production provider
  | 'bitgo'        // Future provider
  | 'mock';        // Development/testing

export interface Vault {
  id: string;                    // Internal Auxite vault ID
  externalId: string;            // Provider's vault ID (e.g., Fireblocks vault ID)
  userId: string;                // Auxite user ID
  provider: CustodyProvider;     // Which custody provider
  status: VaultStatus;
  name: string;                  // "Client Vault" or custom name
  createdAt: number;             // Unix timestamp
  updatedAt: number;
}

// ============================================
// DEPOSIT ADDRESS TYPES
// ============================================

export type SupportedAsset =
  | 'BTC'          // Bitcoin
  | 'ETH'          // Ethereum
  | 'USDC'         // USD Coin (ERC-20)
  | 'USDT';        // Tether (ERC-20)

export type NetworkType =
  | 'BITCOIN'      // BTC mainnet
  | 'ETHEREUM'     // ETH mainnet
  | 'POLYGON'      // Polygon (future)
  | 'ARBITRUM';    // Arbitrum (future)

export interface DepositAddress {
  id: string;                    // Internal address ID
  vaultId: string;               // Parent vault ID
  asset: SupportedAsset;
  network: NetworkType;
  address: string;               // Blockchain address
  tag?: string;                  // Memo/tag (for XRP, etc.)
  externalId?: string;           // Provider's address ID
  createdAt: number;
}

// ============================================
// TRANSACTION TYPES
// ============================================

export type TransactionType =
  | 'DEPOSIT'      // Incoming funds
  | 'WITHDRAWAL'   // Outgoing funds
  | 'INTERNAL';    // Between vaults

export type TransactionStatus =
  | 'PENDING_AML'           // Awaiting AML check
  | 'PENDING_CONFIRMATION'  // Awaiting blockchain confirmations
  | 'CONFIRMING'            // Partially confirmed
  | 'COMPLETED'             // Fully settled
  | 'FAILED'                // Transaction failed
  | 'CANCELLED'             // Cancelled by user/system
  | 'BLOCKED';              // Blocked by compliance

export interface CustodyTransaction {
  id: string;                    // Internal transaction ID
  externalId: string;            // Provider's transaction ID
  vaultId: string;
  type: TransactionType;
  status: TransactionStatus;
  asset: SupportedAsset;
  network: NetworkType;
  amount: string;                // String for precision
  amountUsd?: string;            // USD value at time of transaction
  fromAddress?: string;          // Source address
  toAddress?: string;            // Destination address
  txHash?: string;               // Blockchain transaction hash
  confirmations: number;
  requiredConfirmations: number;
  fee?: string;                  // Network fee
  feeAsset?: string;
  amlStatus?: 'CLEAR' | 'REVIEW' | 'BLOCKED';
  createdAt: number;
  updatedAt: number;
  settledAt?: number;            // When funds became available
  metadata?: Record<string, unknown>;
}

// ============================================
// CAPITAL CLASSIFICATION
// ============================================

export type CapitalStatus =
  | 'SETTLED'          // Available for allocation
  | 'PENDING'          // Awaiting settlement
  | 'ALLOCATED'        // Converted to metals
  | 'ENCUMBERED'       // Locked in yield products
  | 'WITHDRAWING';     // Pending withdrawal

export interface CapitalEntry {
  id: string;
  vaultId: string;
  asset: SupportedAsset | 'AUXM';  // AUXM for settlement credits
  amount: string;
  status: CapitalStatus;
  sourceTransactionId?: string;
  allocatedTo?: string;           // Metal token if allocated
  encumberedBy?: string;          // Yield product ID if locked
  createdAt: number;
  updatedAt: number;
}

// ============================================
// WEBHOOK EVENTS
// ============================================

export type WebhookEventType =
  | 'TRANSACTION_CREATED'
  | 'TRANSACTION_STATUS_UPDATED'
  | 'TRANSACTION_COMPLETED'
  | 'TRANSACTION_FAILED'
  | 'VAULT_CREATED'
  | 'ADDRESS_CREATED';

export interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  timestamp: number;
  provider: CustodyProvider;
  data: Record<string, unknown>;
  signature?: string;
}

// ============================================
// ADAPTER INTERFACE
// ============================================

export interface CreateVaultParams {
  userId: string;
  name?: string;
}

export interface CreateVaultResult {
  vault: Vault;
  addresses: DepositAddress[];
}

export interface GetDepositAddressParams {
  vaultId: string;
  asset: SupportedAsset;
  network?: NetworkType;
}

export interface CreateWithdrawalParams {
  vaultId: string;
  asset: SupportedAsset;
  network: NetworkType;
  amount: string;
  toAddress: string;
  note?: string;
}

export interface ICustodyAdapter {
  // Provider info
  readonly provider: CustodyProvider;

  // Vault operations
  createVault(params: CreateVaultParams): Promise<CreateVaultResult>;
  getVault(vaultId: string): Promise<Vault | null>;
  getVaultByUserId(userId: string): Promise<Vault | null>;

  // Address operations
  getDepositAddress(params: GetDepositAddressParams): Promise<DepositAddress>;
  getDepositAddresses(vaultId: string): Promise<DepositAddress[]>;

  // Transaction operations
  getTransactions(vaultId: string, limit?: number): Promise<CustodyTransaction[]>;
  getTransaction(transactionId: string): Promise<CustodyTransaction | null>;

  // Withdrawal operations
  createWithdrawal(params: CreateWithdrawalParams): Promise<CustodyTransaction>;

  // Balance operations
  getBalance(vaultId: string, asset: SupportedAsset): Promise<string>;
  getAllBalances(vaultId: string): Promise<Record<SupportedAsset, string>>;

  // Webhook verification
  verifyWebhook(payload: unknown, signature: string): Promise<boolean>;
  parseWebhookEvent(payload: unknown): WebhookEvent;
}

// ============================================
// CONSTANTS
// ============================================

export const SUPPORTED_ASSETS: SupportedAsset[] = ['BTC', 'ETH', 'USDC', 'USDT'];

export const ASSET_NETWORKS: Record<SupportedAsset, NetworkType[]> = {
  BTC: ['BITCOIN'],
  ETH: ['ETHEREUM'],
  USDC: ['ETHEREUM'],
  USDT: ['ETHEREUM'],
};

export const REQUIRED_CONFIRMATIONS: Record<SupportedAsset, number> = {
  BTC: 3,
  ETH: 12,
  USDC: 12,
  USDT: 12,
};

export const ASSET_DECIMALS: Record<SupportedAsset, number> = {
  BTC: 8,
  ETH: 18,
  USDC: 6,
  USDT: 6,
};
