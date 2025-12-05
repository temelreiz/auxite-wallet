/**
 * Multi-Signature System
 * 2-of-3 onay sistemi için utility fonksiyonları
 */

import crypto from 'crypto';

// ============================================
// TYPES
// ============================================

export interface MultiSigConfig {
  enabled: boolean;
  requiredApprovals: number; // Örn: 2
  totalSigners: number; // Örn: 3
  signers: Signer[];
  thresholdAmount: number; // Bu miktarın üstünde multi-sig gerekli (USD)
  createdAt: string;
  updatedAt: string;
}

export interface Signer {
  id: string;
  walletAddress: string;
  email?: string;
  name: string;
  role: 'owner' | 'approver' | 'viewer';
  addedAt: string;
  lastActive?: string;
}

export interface PendingTransaction {
  id: string;
  type: 'withdraw' | 'transfer' | 'swap' | 'settings_change';
  initiator: string; // Wallet address
  amount?: number;
  token?: string;
  toAddress?: string;
  metadata?: Record<string, unknown>;
  approvals: Approval[];
  rejections: Rejection[];
  requiredApprovals: number;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'executed';
  createdAt: string;
  expiresAt: string;
  executedAt?: string;
}

export interface Approval {
  signerId: string;
  walletAddress: string;
  signature?: string;
  timestamp: string;
  ip?: string;
}

export interface Rejection {
  signerId: string;
  walletAddress: string;
  reason?: string;
  timestamp: string;
}

// ============================================
// DEFAULT CONFIG
// ============================================

export const DEFAULT_MULTISIG_CONFIG: MultiSigConfig = {
  enabled: false,
  requiredApprovals: 2,
  totalSigners: 3,
  signers: [],
  thresholdAmount: 10000, // $10,000 üstü işlemler için
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Benzersiz transaction ID oluştur
 */
export function generateTransactionId(): string {
  return `tx_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Benzersiz signer ID oluştur
 */
export function generateSignerId(): string {
  return `sig_${crypto.randomBytes(12).toString('hex')}`;
}

/**
 * İşlem için multi-sig gerekli mi kontrol et
 */
export function requiresMultiSig(
  config: MultiSigConfig,
  amount: number
): boolean {
  if (!config.enabled) return false;
  if (config.signers.length < config.requiredApprovals) return false;
  return amount >= config.thresholdAmount;
}

/**
 * İşlem onaylandı mı kontrol et
 */
export function isTransactionApproved(tx: PendingTransaction): boolean {
  return tx.approvals.length >= tx.requiredApprovals;
}

/**
 * İşlem reddedildi mi kontrol et (çoğunluk reddetmişse)
 */
export function isTransactionRejected(
  tx: PendingTransaction,
  totalSigners: number
): boolean {
  const rejectionThreshold = Math.ceil(totalSigners / 2);
  return tx.rejections.length >= rejectionThreshold;
}

/**
 * İşlem süresi dolmuş mu kontrol et
 */
export function isTransactionExpired(tx: PendingTransaction): boolean {
  return new Date() > new Date(tx.expiresAt);
}

/**
 * Kullanıcı zaten onay/red vermiş mi kontrol et
 */
export function hasUserVoted(
  tx: PendingTransaction,
  walletAddress: string
): { voted: boolean; type?: 'approval' | 'rejection' } {
  const approved = tx.approvals.some(a => a.walletAddress.toLowerCase() === walletAddress.toLowerCase());
  if (approved) return { voted: true, type: 'approval' };
  
  const rejected = tx.rejections.some(r => r.walletAddress.toLowerCase() === walletAddress.toLowerCase());
  if (rejected) return { voted: true, type: 'rejection' };
  
  return { voted: false };
}

/**
 * Kullanıcı signer mı kontrol et
 */
export function isSigner(
  config: MultiSigConfig,
  walletAddress: string
): boolean {
  return config.signers.some(
    s => s.walletAddress.toLowerCase() === walletAddress.toLowerCase()
  );
}

/**
 * Kullanıcının rolünü al
 */
export function getSignerRole(
  config: MultiSigConfig,
  walletAddress: string
): Signer['role'] | null {
  const signer = config.signers.find(
    s => s.walletAddress.toLowerCase() === walletAddress.toLowerCase()
  );
  return signer?.role || null;
}

/**
 * Yeni pending transaction oluştur
 */
export function createPendingTransaction(
  type: PendingTransaction['type'],
  initiator: string,
  requiredApprovals: number,
  options: {
    amount?: number;
    token?: string;
    toAddress?: string;
    metadata?: Record<string, unknown>;
    expiresInHours?: number;
  } = {}
): PendingTransaction {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (options.expiresInHours || 24) * 60 * 60 * 1000);

  return {
    id: generateTransactionId(),
    type,
    initiator,
    amount: options.amount,
    token: options.token,
    toAddress: options.toAddress,
    metadata: options.metadata,
    approvals: [],
    rejections: [],
    requiredApprovals,
    status: 'pending',
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

/**
 * İşleme onay ekle
 */
export function addApproval(
  tx: PendingTransaction,
  signerId: string,
  walletAddress: string,
  ip?: string
): PendingTransaction {
  // Zaten onaylamış mı kontrol et
  if (tx.approvals.some(a => a.walletAddress.toLowerCase() === walletAddress.toLowerCase())) {
    return tx;
  }

  const approval: Approval = {
    signerId,
    walletAddress,
    timestamp: new Date().toISOString(),
    ip,
  };

  tx.approvals.push(approval);

  // Yeterli onay var mı kontrol et
  if (tx.approvals.length >= tx.requiredApprovals) {
    tx.status = 'approved';
  }

  return tx;
}

/**
 * İşleme red ekle
 */
export function addRejection(
  tx: PendingTransaction,
  signerId: string,
  walletAddress: string,
  totalSigners: number,
  reason?: string
): PendingTransaction {
  // Zaten reddetmiş mi kontrol et
  if (tx.rejections.some(r => r.walletAddress.toLowerCase() === walletAddress.toLowerCase())) {
    return tx;
  }

  const rejection: Rejection = {
    signerId,
    walletAddress,
    reason,
    timestamp: new Date().toISOString(),
  };

  tx.rejections.push(rejection);

  // Çoğunluk reddetmiş mi kontrol et
  if (isTransactionRejected(tx, totalSigners)) {
    tx.status = 'rejected';
  }

  return tx;
}

/**
 * İşlem özeti oluştur
 */
export function formatTransactionSummary(tx: PendingTransaction): string {
  switch (tx.type) {
    case 'withdraw':
      return `${tx.amount} ${tx.token} çekim - ${tx.toAddress?.slice(0, 10)}...`;
    case 'transfer':
      return `${tx.amount} ${tx.token} transfer - ${tx.toAddress?.slice(0, 10)}...`;
    case 'swap':
      return `Dönüşüm işlemi`;
    case 'settings_change':
      return `Ayar değişikliği`;
    default:
      return `İşlem #${tx.id.slice(-8)}`;
  }
}

/**
 * Kalan süreyi hesapla
 */
export function getRemainingTime(tx: PendingTransaction): {
  expired: boolean;
  hours: number;
  minutes: number;
  formatted: string;
} {
  const now = new Date();
  const expires = new Date(tx.expiresAt);
  const diff = expires.getTime() - now.getTime();

  if (diff <= 0) {
    return { expired: true, hours: 0, minutes: 0, formatted: 'Süresi doldu' };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return {
    expired: false,
    hours,
    minutes,
    formatted: hours > 0 ? `${hours}s ${minutes}dk` : `${minutes}dk`,
  };
}
