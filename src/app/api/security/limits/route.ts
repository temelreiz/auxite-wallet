/**
 * Transaction Limits API
 * GET: Limit durumunu al
 * POST: Limitleri güncelle, whitelist yönet
 */

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import {
  DEFAULT_LIMITS,
  checkLimits,
  updateUsage,
  checkAndResetLimits,
  addToWhitelist,
  removeFromWhitelist,
  formatLimitSummary,
  getUsagePercentage,
  getNextResetTime,
  LIMIT_TIERS,
  type TransactionLimits,
} from '@/lib/security/limits';

// GET: Limit durumunu al
export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet adresi gerekli' },
        { status: 401 }
      );
    }

    // Limitleri al
    const limitsData = await redis.get(`user:limits:${walletAddress}`);
    let limits: TransactionLimits = limitsData 
      ? (typeof limitsData === 'string' ? JSON.parse(limitsData) : limitsData)
      : { ...DEFAULT_LIMITS };

    // Reset kontrolü yap
    limits = checkAndResetLimits(limits);
    await redis.set(`user:limits:${walletAddress}`, JSON.stringify(limits));

    // Kullanıcı tier'ını al (varsayılan: verified)
    const tierData = await redis.get(`user:tier:${walletAddress}`);
    const tier = tierData || 'verified';

    return NextResponse.json({
      limits,
      summary: formatLimitSummary(limits),
      usage: {
        daily: getUsagePercentage(limits.daily.used, limits.daily.amount),
        weekly: getUsagePercentage(limits.weekly.used, limits.weekly.amount),
        monthly: getUsagePercentage(limits.monthly.used, limits.monthly.amount),
      },
      nextReset: {
        daily: getNextResetTime('daily').toISOString(),
        weekly: getNextResetTime('weekly').toISOString(),
        monthly: getNextResetTime('monthly').toISOString(),
      },
      tier,
      availableTiers: LIMIT_TIERS,
    });
  } catch (error) {
    console.error('Limits GET error:', error);
    return NextResponse.json(
      { error: 'Limit bilgileri alınamadı' },
      { status: 500 }
    );
  }
}

// POST: Limit işlemleri
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
      case 'check':
        return handleCheck(walletAddress, body);
      case 'update_limits':
        return handleUpdateLimits(walletAddress, body);
      case 'add_whitelist':
        return handleAddWhitelist(walletAddress, body);
      case 'remove_whitelist':
        return handleRemoveWhitelist(walletAddress, body);
      case 'toggle':
        return handleToggle(walletAddress, body);
      case 'record_usage':
        return handleRecordUsage(walletAddress, body);
      default:
        return NextResponse.json(
          { error: 'Geçersiz action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Limits POST error:', error);
    return NextResponse.json(
      { error: 'İşlem başarısız' },
      { status: 500 }
    );
  }
}

// === Handlers ===

async function handleCheck(walletAddress: string, body: { amount: number; toAddress?: string }) {
  const limitsData = await redis.get(`user:limits:${walletAddress}`);
  let limits: TransactionLimits = limitsData 
    ? (typeof limitsData === 'string' ? JSON.parse(limitsData) : limitsData)
    : { ...DEFAULT_LIMITS };

  // Reset kontrolü
  limits = checkAndResetLimits(limits);

  const result = checkLimits(limits, body.amount, body.toAddress);

  return NextResponse.json({
    ...result,
    currentLimits: limits,
  });
}

async function handleUpdateLimits(walletAddress: string, body: {
  daily?: number;
  weekly?: number;
  monthly?: number;
  perTransaction?: number;
}) {
  const limitsData = await redis.get(`user:limits:${walletAddress}`);
  let limits: TransactionLimits = limitsData 
    ? (typeof limitsData === 'string' ? JSON.parse(limitsData) : limitsData)
    : { ...DEFAULT_LIMITS };

  // Tier'a göre maksimum limitleri kontrol et
  const tierData = await redis.get(`user:tier:${walletAddress}`);
  const tier = (tierData as keyof typeof LIMIT_TIERS) || 'verified';
  const maxLimits = LIMIT_TIERS[tier] || LIMIT_TIERS.verified;

  // Güncellemeleri uygula (tier limitlerini aşamaz)
  if (body.daily !== undefined) {
    limits.daily.amount = Math.min(body.daily, maxLimits.daily);
  }
  if (body.weekly !== undefined) {
    limits.weekly.amount = Math.min(body.weekly, maxLimits.weekly);
  }
  if (body.monthly !== undefined) {
    limits.monthly.amount = Math.min(body.monthly, maxLimits.monthly);
  }
  if (body.perTransaction !== undefined) {
    limits.perTransaction.amount = Math.min(body.perTransaction, maxLimits.perTransaction);
  }

  limits.updatedAt = new Date().toISOString();
  await redis.set(`user:limits:${walletAddress}`, JSON.stringify(limits));

  return NextResponse.json({
    success: true,
    message: 'Limitler güncellendi',
    limits,
  });
}

async function handleAddWhitelist(walletAddress: string, body: { address: string }) {
  if (!body.address) {
    return NextResponse.json(
      { error: 'Adres gerekli' },
      { status: 400 }
    );
  }

  const limitsData = await redis.get(`user:limits:${walletAddress}`);
  let limits: TransactionLimits = limitsData 
    ? (typeof limitsData === 'string' ? JSON.parse(limitsData) : limitsData)
    : { ...DEFAULT_LIMITS };

  // Maksimum 10 whitelist adresi
  if (limits.whitelistedAddresses.length >= 10) {
    return NextResponse.json(
      { error: 'Maksimum 10 adres eklenebilir' },
      { status: 400 }
    );
  }

  limits = addToWhitelist(limits, body.address);
  await redis.set(`user:limits:${walletAddress}`, JSON.stringify(limits));

  return NextResponse.json({
    success: true,
    message: 'Adres whitelist\'e eklendi',
    whitelistedAddresses: limits.whitelistedAddresses,
  });
}

async function handleRemoveWhitelist(walletAddress: string, body: { address: string }) {
  const limitsData = await redis.get(`user:limits:${walletAddress}`);
  let limits: TransactionLimits = limitsData 
    ? (typeof limitsData === 'string' ? JSON.parse(limitsData) : limitsData)
    : { ...DEFAULT_LIMITS };

  limits = removeFromWhitelist(limits, body.address);
  await redis.set(`user:limits:${walletAddress}`, JSON.stringify(limits));

  return NextResponse.json({
    success: true,
    message: 'Adres whitelist\'ten çıkarıldı',
    whitelistedAddresses: limits.whitelistedAddresses,
  });
}

async function handleToggle(walletAddress: string, body: { 
  type: 'all' | 'daily' | 'weekly' | 'monthly' | 'perTransaction';
  enabled: boolean;
}) {
  const limitsData = await redis.get(`user:limits:${walletAddress}`);
  let limits: TransactionLimits = limitsData 
    ? (typeof limitsData === 'string' ? JSON.parse(limitsData) : limitsData)
    : { ...DEFAULT_LIMITS };

  if (body.type === 'all') {
    limits.enabled = body.enabled;
  } else {
    limits[body.type].enabled = body.enabled;
  }

  limits.updatedAt = new Date().toISOString();
  await redis.set(`user:limits:${walletAddress}`, JSON.stringify(limits));

  return NextResponse.json({
    success: true,
    message: `${body.type} limiti ${body.enabled ? 'aktifleştirildi' : 'kapatıldı'}`,
    limits,
  });
}

async function handleRecordUsage(walletAddress: string, body: { amount: number }) {
  const limitsData = await redis.get(`user:limits:${walletAddress}`);
  let limits: TransactionLimits = limitsData 
    ? (typeof limitsData === 'string' ? JSON.parse(limitsData) : limitsData)
    : { ...DEFAULT_LIMITS };

  // Reset kontrolü
  limits = checkAndResetLimits(limits);

  // Kullanımı kaydet
  limits = updateUsage(limits, body.amount);
  await redis.set(`user:limits:${walletAddress}`, JSON.stringify(limits));

  return NextResponse.json({
    success: true,
    message: 'Kullanım kaydedildi',
    limits,
  });
}
