/**
 * Multi-Sig API
 * GET: Config ve pending işlemleri al
 * POST: Config güncelle, işlem oluştur, onayla/reddet
 */

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import {
  DEFAULT_MULTISIG_CONFIG,
  generateSignerId,
  createPendingTransaction,
  addApproval,
  addRejection,
  isTransactionApproved,
  isTransactionRejected,
  isTransactionExpired,
  hasUserVoted,
  isSigner,
  getSignerRole,
  type MultiSigConfig,
  type PendingTransaction,
  type Signer,
} from '@/lib/security/multisig';

// GET: Config ve pending işlemleri al
export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet adresi gerekli' },
        { status: 401 }
      );
    }

    // Config al
    const configData = await redis.get(`user:multisig:${walletAddress}`);
    const config: MultiSigConfig = configData 
      ? (typeof configData === 'string' ? JSON.parse(configData) : configData)
      : DEFAULT_MULTISIG_CONFIG;

    // Pending işlemleri al
    const pendingData = await redis.get(`user:multisig:pending:${walletAddress}`);
    const allPending: PendingTransaction[] = pendingData 
      ? (typeof pendingData === 'string' ? JSON.parse(pendingData) : pendingData)
      : [];

    // Süresi dolmuş işlemleri filtrele ve güncelle
    const now = new Date();
    const activePending = allPending.filter(tx => {
      if (tx.status !== 'pending') return false;
      if (new Date(tx.expiresAt) < now) {
        tx.status = 'expired';
        return false;
      }
      return true;
    });

    // Kullanıcının rolünü belirle
    const userRole = getSignerRole(config, walletAddress);
    const isOwner = userRole === 'owner' || config.signers.length === 0;

    return NextResponse.json({
      config: {
        ...config,
        // Secret bilgileri gizle
        signers: config.signers.map(s => ({
          ...s,
          walletAddress: s.walletAddress.slice(0, 6) + '...' + s.walletAddress.slice(-4),
        })),
      },
      pendingTransactions: activePending,
      userRole: userRole || (isOwner ? 'owner' : null),
      canApprove: isSigner(config, walletAddress) || isOwner,
    });
  } catch (error) {
    console.error('MultiSig GET error:', error);
    return NextResponse.json(
      { error: 'Multi-sig bilgileri alınamadı' },
      { status: 500 }
    );
  }
}

// POST: İşlemler
export async function POST(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet adresi gerekli' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'enable':
        return handleEnable(walletAddress, body);
      case 'disable':
        return handleDisable(walletAddress);
      case 'add_signer':
        return handleAddSigner(walletAddress, body);
      case 'remove_signer':
        return handleRemoveSigner(walletAddress, body);
      case 'create_transaction':
        return handleCreateTransaction(walletAddress, body);
      case 'approve':
        return handleApprove(walletAddress, body);
      case 'reject':
        return handleReject(walletAddress, body);
      case 'update_threshold':
        return handleUpdateThreshold(walletAddress, body);
      default:
        return NextResponse.json(
          { error: 'Geçersiz action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('MultiSig POST error:', error);
    return NextResponse.json(
      { error: 'İşlem başarısız' },
      { status: 500 }
    );
  }
}

// === Handlers ===

async function handleEnable(walletAddress: string, body: { requiredApprovals?: number; thresholdAmount?: number }) {
  const configData = await redis.get(`user:multisig:${walletAddress}`);
  const config: MultiSigConfig = configData 
    ? (typeof configData === 'string' ? JSON.parse(configData) : configData)
    : { ...DEFAULT_MULTISIG_CONFIG };

  // Owner olarak ekle
  if (!config.signers.some(s => s.walletAddress.toLowerCase() === walletAddress.toLowerCase())) {
    config.signers.push({
      id: generateSignerId(),
      walletAddress,
      name: 'Owner',
      role: 'owner',
      addedAt: new Date().toISOString(),
    });
  }

  config.enabled = true;
  config.requiredApprovals = body.requiredApprovals || 2;
  config.thresholdAmount = body.thresholdAmount || 10000;
  config.updatedAt = new Date().toISOString();

  await redis.set(`user:multisig:${walletAddress}`, JSON.stringify(config));

  return NextResponse.json({
    success: true,
    message: 'Multi-sig aktifleştirildi',
    config,
  });
}

async function handleDisable(walletAddress: string) {
  const configData = await redis.get(`user:multisig:${walletAddress}`);
  if (!configData) {
    return NextResponse.json(
      { error: 'Multi-sig yapılandırması bulunamadı' },
      { status: 400 }
    );
  }

  const config: MultiSigConfig = typeof configData === 'string' ? JSON.parse(configData) : configData;
  
  // Sadece owner kapatabilir
  const role = getSignerRole(config, walletAddress);
  if (role !== 'owner') {
    return NextResponse.json(
      { error: 'Sadece owner multi-sig kapatabilir' },
      { status: 403 }
    );
  }

  config.enabled = false;
  config.updatedAt = new Date().toISOString();

  await redis.set(`user:multisig:${walletAddress}`, JSON.stringify(config));

  return NextResponse.json({
    success: true,
    message: 'Multi-sig kapatıldı',
  });
}

async function handleAddSigner(walletAddress: string, body: { 
  signerAddress: string; 
  name: string; 
  email?: string;
  role?: 'approver' | 'viewer';
}) {
  const configData = await redis.get(`user:multisig:${walletAddress}`);
  const config: MultiSigConfig = configData 
    ? (typeof configData === 'string' ? JSON.parse(configData) : configData)
    : { ...DEFAULT_MULTISIG_CONFIG };

  // Sadece owner ekleyebilir
  const role = getSignerRole(config, walletAddress);
  if (role !== 'owner' && config.signers.length > 0) {
    return NextResponse.json(
      { error: 'Sadece owner signer ekleyebilir' },
      { status: 403 }
    );
  }

  // Zaten var mı kontrol et
  if (config.signers.some(s => s.walletAddress.toLowerCase() === body.signerAddress.toLowerCase())) {
    return NextResponse.json(
      { error: 'Bu adres zaten ekli' },
      { status: 400 }
    );
  }

  // Maksimum 5 signer
  if (config.signers.length >= 5) {
    return NextResponse.json(
      { error: 'Maksimum 5 signer eklenebilir' },
      { status: 400 }
    );
  }

  const newSigner: Signer = {
    id: generateSignerId(),
    walletAddress: body.signerAddress,
    name: body.name,
    email: body.email,
    role: body.role || 'approver',
    addedAt: new Date().toISOString(),
  };

  config.signers.push(newSigner);
  config.totalSigners = config.signers.filter(s => s.role !== 'viewer').length;
  config.updatedAt = new Date().toISOString();

  await redis.set(`user:multisig:${walletAddress}`, JSON.stringify(config));

  return NextResponse.json({
    success: true,
    message: 'Signer eklendi',
    signer: newSigner,
  });
}

async function handleRemoveSigner(walletAddress: string, body: { signerId: string }) {
  const configData = await redis.get(`user:multisig:${walletAddress}`);
  if (!configData) {
    return NextResponse.json(
      { error: 'Multi-sig yapılandırması bulunamadı' },
      { status: 400 }
    );
  }

  const config: MultiSigConfig = typeof configData === 'string' ? JSON.parse(configData) : configData;

  // Sadece owner silebilir
  const role = getSignerRole(config, walletAddress);
  if (role !== 'owner') {
    return NextResponse.json(
      { error: 'Sadece owner signer silebilir' },
      { status: 403 }
    );
  }

  const signerIndex = config.signers.findIndex(s => s.id === body.signerId);
  if (signerIndex === -1) {
    return NextResponse.json(
      { error: 'Signer bulunamadı' },
      { status: 404 }
    );
  }

  // Owner kendini silemez
  if (config.signers[signerIndex].role === 'owner') {
    return NextResponse.json(
      { error: 'Owner kendini silemez' },
      { status: 400 }
    );
  }

  config.signers.splice(signerIndex, 1);
  config.totalSigners = config.signers.filter(s => s.role !== 'viewer').length;
  config.updatedAt = new Date().toISOString();

  await redis.set(`user:multisig:${walletAddress}`, JSON.stringify(config));

  return NextResponse.json({
    success: true,
    message: 'Signer silindi',
  });
}

async function handleCreateTransaction(walletAddress: string, body: {
  type: PendingTransaction['type'];
  amount?: number;
  token?: string;
  toAddress?: string;
  metadata?: Record<string, unknown>;
}) {
  const configData = await redis.get(`user:multisig:${walletAddress}`);
  if (!configData) {
    return NextResponse.json(
      { error: 'Multi-sig yapılandırması bulunamadı' },
      { status: 400 }
    );
  }

  const config: MultiSigConfig = typeof configData === 'string' ? JSON.parse(configData) : configData;

  if (!config.enabled) {
    return NextResponse.json(
      { error: 'Multi-sig aktif değil' },
      { status: 400 }
    );
  }

  // Pending işlemleri al
  const pendingData = await redis.get(`user:multisig:pending:${walletAddress}`);
  const pending: PendingTransaction[] = pendingData 
    ? (typeof pendingData === 'string' ? JSON.parse(pendingData) : pendingData)
    : [];

  // Yeni işlem oluştur
  const newTx = createPendingTransaction(
    body.type,
    walletAddress,
    config.requiredApprovals,
    {
      amount: body.amount,
      token: body.token,
      toAddress: body.toAddress,
      metadata: body.metadata,
      expiresInHours: 24,
    }
  );

  pending.push(newTx);
  await redis.set(`user:multisig:pending:${walletAddress}`, JSON.stringify(pending));

  // TODO: Signer'lara bildirim gönder

  return NextResponse.json({
    success: true,
    message: 'İşlem onay bekliyor',
    transaction: newTx,
  });
}

async function handleApprove(walletAddress: string, body: { transactionId: string }) {
  const configData = await redis.get(`user:multisig:${walletAddress}`);
  if (!configData) {
    return NextResponse.json(
      { error: 'Multi-sig yapılandırması bulunamadı' },
      { status: 400 }
    );
  }

  const config: MultiSigConfig = typeof configData === 'string' ? JSON.parse(configData) : configData;

  // Signer mı kontrol et
  if (!isSigner(config, walletAddress)) {
    return NextResponse.json(
      { error: 'Bu işlemi onaylama yetkiniz yok' },
      { status: 403 }
    );
  }

  // Pending işlemleri al
  const pendingData = await redis.get(`user:multisig:pending:${walletAddress}`);
  const pending: PendingTransaction[] = pendingData 
    ? (typeof pendingData === 'string' ? JSON.parse(pendingData) : pendingData)
    : [];

  const txIndex = pending.findIndex(tx => tx.id === body.transactionId);
  if (txIndex === -1) {
    return NextResponse.json(
      { error: 'İşlem bulunamadı' },
      { status: 404 }
    );
  }

  const tx = pending[txIndex];

  // Süresi dolmuş mu?
  if (isTransactionExpired(tx)) {
    tx.status = 'expired';
    await redis.set(`user:multisig:pending:${walletAddress}`, JSON.stringify(pending));
    return NextResponse.json(
      { error: 'İşlem süresi dolmuş' },
      { status: 400 }
    );
  }

  // Zaten oy kullanmış mı?
  const voteStatus = hasUserVoted(tx, walletAddress);
  if (voteStatus.voted) {
    return NextResponse.json(
      { error: `Bu işlemi zaten ${voteStatus.type === 'approval' ? 'onayladınız' : 'reddettiniz'}` },
      { status: 400 }
    );
  }

  // Signer bilgisini bul
  const signer = config.signers.find(s => s.walletAddress.toLowerCase() === walletAddress.toLowerCase());

  // Onay ekle
  const updatedTx = addApproval(tx, signer?.id || 'unknown', walletAddress);
  pending[txIndex] = updatedTx;

  await redis.set(`user:multisig:pending:${walletAddress}`, JSON.stringify(pending));

  const isApproved = isTransactionApproved(updatedTx);

  return NextResponse.json({
    success: true,
    message: isApproved ? 'İşlem onaylandı ve yürütülmeye hazır' : 'Onay kaydedildi',
    transaction: updatedTx,
    isFullyApproved: isApproved,
  });
}

async function handleReject(walletAddress: string, body: { transactionId: string; reason?: string }) {
  const configData = await redis.get(`user:multisig:${walletAddress}`);
  if (!configData) {
    return NextResponse.json(
      { error: 'Multi-sig yapılandırması bulunamadı' },
      { status: 400 }
    );
  }

  const config: MultiSigConfig = typeof configData === 'string' ? JSON.parse(configData) : configData;

  if (!isSigner(config, walletAddress)) {
    return NextResponse.json(
      { error: 'Bu işlemi reddetme yetkiniz yok' },
      { status: 403 }
    );
  }

  const pendingData = await redis.get(`user:multisig:pending:${walletAddress}`);
  const pending: PendingTransaction[] = pendingData 
    ? (typeof pendingData === 'string' ? JSON.parse(pendingData) : pendingData)
    : [];

  const txIndex = pending.findIndex(tx => tx.id === body.transactionId);
  if (txIndex === -1) {
    return NextResponse.json(
      { error: 'İşlem bulunamadı' },
      { status: 404 }
    );
  }

  const tx = pending[txIndex];
  const signer = config.signers.find(s => s.walletAddress.toLowerCase() === walletAddress.toLowerCase());

  const updatedTx = addRejection(tx, signer?.id || 'unknown', walletAddress, config.totalSigners, body.reason);
  pending[txIndex] = updatedTx;

  await redis.set(`user:multisig:pending:${walletAddress}`, JSON.stringify(pending));

  const isRejected = isTransactionRejected(updatedTx, config.totalSigners);

  return NextResponse.json({
    success: true,
    message: isRejected ? 'İşlem reddedildi' : 'Red kaydedildi',
    transaction: updatedTx,
    isFullyRejected: isRejected,
  });
}

async function handleUpdateThreshold(walletAddress: string, body: { thresholdAmount: number }) {
  const configData = await redis.get(`user:multisig:${walletAddress}`);
  if (!configData) {
    return NextResponse.json(
      { error: 'Multi-sig yapılandırması bulunamadı' },
      { status: 400 }
    );
  }

  const config: MultiSigConfig = typeof configData === 'string' ? JSON.parse(configData) : configData;

  const role = getSignerRole(config, walletAddress);
  if (role !== 'owner') {
    return NextResponse.json(
      { error: 'Sadece owner threshold değiştirebilir' },
      { status: 403 }
    );
  }

  config.thresholdAmount = body.thresholdAmount;
  config.updatedAt = new Date().toISOString();

  await redis.set(`user:multisig:${walletAddress}`, JSON.stringify(config));

  return NextResponse.json({
    success: true,
    message: 'Threshold güncellendi',
    thresholdAmount: config.thresholdAmount,
  });
}
