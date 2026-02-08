// src/lib/custody/index.ts
// Auxite Custody Module - Main Entry Point

// Export types
export * from './types';

// Export adapter (main interface)
export {
  registerAdapter,
  getAdapter,
  getDefaultAdapter,
  getDefaultProvider,
  createVault,
  getVault,
  getVaultByUserId,
  getDepositAddress,
  getDepositAddresses,
  getTransactions,
  getTransaction,
  createWithdrawal,
  getBalance,
  getAllBalances,
  verifyWebhook,
  parseWebhookEvent,
  initializeCustody,
} from './adapter';

// Export storage functions with namespace to avoid conflicts
export * as storage from './storage';

// Re-export specific adapters for direct access if needed
export { FireblocksCustodyAdapter, handleFireblocksWebhook } from './fireblocks';
export { MockCustodyAdapter, simulateDeposit, simulateTransactionProgress } from './mock';
