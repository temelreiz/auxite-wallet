/**
 * Emergency API
 * GET: Emergency durumunu al
 * POST: Freeze, unfreeze, panic mode, recovery
 */

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import {
  DEFAULT_EMERGENCY_CONFIG,
  freezeAccount,
  unfreezeAccount,
  activatePanicMode,
  deactivatePanicMode,
  checkAccountStatus,
  addTrustedContact,
  removeTrustedContact,
  createRecoveryRequest,
  completeRecoveryStep,
  createEmergencyLog,
  getSecurityLevelDescription,
  formatFreezeTime,
  type EmergencyConfig,
  type RecoveryRequest,
  type EmergencyLog,
} from '@/lib/security/emergency';
import { requireUser } from '@/lib/security/require-user';

// GET: Emergency durumunu al
export async function GET(request: NextRequest) {
  try {
    // Identity comes from the signed login token, never from a header the
    // caller controls — this endpoint can freeze and unfreeze accounts.
    const auth = requireUser(request);
    if (!auth.ok) return auth.response;
    const walletAddress = auth.user.address;

    // Config al
    const configData = await redis.get(`user:emergency:${walletAddress}`);
    const config: EmergencyConfig = configData 
      ? (typeof configData === 'string' ? JSON.parse(configData) : configData)
      : { ...DEFAULT_EMERGENCY_CONFIG };

    // Hesap durumunu kontrol et
    const status = checkAccountStatus(config);

    // Son logları al
    const logsData = await redis.lrange(`user:emergency:logs:${walletAddress}`, 0, 9);
    const logs: EmergencyLog[] = logsData.map(log => 
      typeof log === 'string' ? JSON.parse(log) : log
    );

    // Aktif recovery request var mı?
    const recoveryData = await redis.get(`user:recovery:${walletAddress}`);
    const activeRecovery: RecoveryRequest | null = recoveryData 
      ? (typeof recoveryData === 'string' ? JSON.parse(recoveryData) : recoveryData)
      : null;

    return NextResponse.json({
      config: {
        ...config,
        // Hassas bilgileri gizle
        trustedContacts: config.trustedContacts.map(c => ({
          ...c,
          email: c.email ? c.email.slice(0, 3) + '***' : undefined,
          phone: c.phone ? '***' + c.phone.slice(-4) : undefined,
        })),
      },
      status,
      freezeTime: formatFreezeTime(config),
      securityLevelInfo: getSecurityLevelDescription(config.securityLevel),
      recentLogs: logs,
      activeRecovery: activeRecovery?.status === 'pending' || activeRecovery?.status === 'verified' 
        ? activeRecovery 
        : null,
    });
  } catch (error) {
    console.error('Emergency GET error:', error);
    return NextResponse.json(
      { error: 'Emergency bilgileri alınamadı' },
      { status: 500 }
    );
  }
}

// POST: Emergency işlemleri
export async function POST(request: NextRequest) {
  try {
    const auth = requireUser(request);
    if (!auth.ok) return auth.response;
    const walletAddress = auth.user.address;
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
    const userAgent = request.headers.get('user-agent');

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'freeze':
        return handleFreeze(walletAddress, body, ip, userAgent);
      case 'unfreeze':
        return handleUnfreeze(walletAddress, ip, userAgent);
      case 'panic':
        return handlePanic(walletAddress, body, ip, userAgent);
      case 'add_contact':
        return handleAddContact(walletAddress, body);
      case 'remove_contact':
        return handleRemoveContact(walletAddress, body);
      case 'set_security_level':
        return handleSetSecurityLevel(walletAddress, body);
      case 'initiate_recovery':
        return handleInitiateRecovery(walletAddress, body);
      case 'verify_recovery':
        return handleVerifyRecovery(walletAddress, body);
      default:
        return NextResponse.json(
          { error: 'Geçersiz action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Emergency POST error:', error);
    return NextResponse.json(
      { error: 'İşlem başarısız' },
      { status: 500 }
    );
  }
}

// === Handlers ===

async function handleFreeze(
  walletAddress: string, 
  body: { reason: string; duration?: number; notifyContacts?: boolean },
  ip: string | null,
  userAgent: string | null
) {
  const configData = await redis.get(`user:emergency:${walletAddress}`);
  let config: EmergencyConfig = configData 
    ? (typeof configData === 'string' ? JSON.parse(configData) : configData)
    : { ...DEFAULT_EMERGENCY_CONFIG };

  if (config.frozen) {
    return NextResponse.json(
      { error: 'Hesap zaten dondurulmuş' },
      { status: 400 }
    );
  }

  config = freezeAccount(config, walletAddress, {
    reason: body.reason || 'Manuel dondurma',
    duration: body.duration,
    notifyContacts: body.notifyContacts,
  });

  await redis.set(`user:emergency:${walletAddress}`, JSON.stringify(config));

  // Log kaydet
  const log = createEmergencyLog('freeze', walletAddress, { reason: body.reason }, ip || undefined, userAgent || undefined);
  await redis.lpush(`user:emergency:logs:${walletAddress}`, JSON.stringify(log));
  await redis.ltrim(`user:emergency:logs:${walletAddress}`, 0, 99);

  // TODO: Trusted contact'lara bildirim gönder
  if (body.notifyContacts && config.trustedContacts.length > 0) {
    // Email/SMS notification
  }

  return NextResponse.json({
    success: true,
    message: 'Hesap donduruldu',
    config,
    freezeTime: formatFreezeTime(config),
  });
}

async function handleUnfreeze(
  walletAddress: string,
  ip: string | null,
  userAgent: string | null
) {
  const configData = await redis.get(`user:emergency:${walletAddress}`);
  if (!configData) {
    return NextResponse.json(
      { error: 'Emergency yapılandırması bulunamadı' },
      { status: 400 }
    );
  }

  const config: EmergencyConfig = typeof configData === 'string' ? JSON.parse(configData) : configData;

  const result = unfreezeAccount(config);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: 400 }
    );
  }

  await redis.set(`user:emergency:${walletAddress}`, JSON.stringify(result.config));

  // Log kaydet
  const log = createEmergencyLog('unfreeze', walletAddress, {}, ip || undefined, userAgent || undefined);
  await redis.lpush(`user:emergency:logs:${walletAddress}`, JSON.stringify(log));

  return NextResponse.json({
    success: true,
    message: 'Hesap aktifleştirildi',
    config: result.config,
  });
}

async function handlePanic(
  walletAddress: string,
  body: { activate: boolean },
  ip: string | null,
  userAgent: string | null
) {
  const configData = await redis.get(`user:emergency:${walletAddress}`);
  let config: EmergencyConfig = configData 
    ? (typeof configData === 'string' ? JSON.parse(configData) : configData)
    : { ...DEFAULT_EMERGENCY_CONFIG };

  if (body.activate) {
    config = activatePanicMode(config);
    await redis.set(`user:emergency:${walletAddress}`, JSON.stringify(config));

    const log = createEmergencyLog('panic_activate', walletAddress, {}, ip || undefined, userAgent || undefined);
    await redis.lpush(`user:emergency:logs:${walletAddress}`, JSON.stringify(log));

    // TODO: Tüm trusted contact'lara acil bildirim
    // TODO: Aktif session'ları sonlandır
    // TODO: API key'leri deaktif et

    return NextResponse.json({
      success: true,
      message: '🚨 PANIC MODE AKTİF - Tüm işlemler durduruldu!',
      config,
    });
  } else {
    const result = deactivatePanicMode(config);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    await redis.set(`user:emergency:${walletAddress}`, JSON.stringify(result.config));

    const log = createEmergencyLog('panic_deactivate', walletAddress, {}, ip || undefined, userAgent || undefined);
    await redis.lpush(`user:emergency:logs:${walletAddress}`, JSON.stringify(log));

    return NextResponse.json({
      success: true,
      message: 'Panic mode kapatıldı. Not: Hesap hala dondurulmuş olabilir.',
      config: result.config,
    });
  }
}

async function handleAddContact(walletAddress: string, body: {
  name: string;
  email?: string;
  phone?: string;
  contactWalletAddress?: string;
  canUnfreeze?: boolean;
  canRecover?: boolean;
}) {
  const configData = await redis.get(`user:emergency:${walletAddress}`);
  let config: EmergencyConfig = configData 
    ? (typeof configData === 'string' ? JSON.parse(configData) : configData)
    : { ...DEFAULT_EMERGENCY_CONFIG };

  // Maksimum 5 trusted contact
  if (config.trustedContacts.length >= 5) {
    return NextResponse.json(
      { error: 'Maksimum 5 güvenilir kişi eklenebilir' },
      { status: 400 }
    );
  }

  config = addTrustedContact(config, {
    name: body.name,
    email: body.email,
    phone: body.phone,
    walletAddress: body.contactWalletAddress,
    canUnfreeze: body.canUnfreeze || false,
    canRecover: body.canRecover || false,
  });

  await redis.set(`user:emergency:${walletAddress}`, JSON.stringify(config));

  const log = createEmergencyLog('trusted_contact_added', walletAddress, { name: body.name });
  await redis.lpush(`user:emergency:logs:${walletAddress}`, JSON.stringify(log));

  return NextResponse.json({
    success: true,
    message: 'Güvenilir kişi eklendi',
    trustedContacts: config.trustedContacts.length,
  });
}

async function handleRemoveContact(walletAddress: string, body: { contactId: string }) {
  const configData = await redis.get(`user:emergency:${walletAddress}`);
  if (!configData) {
    return NextResponse.json(
      { error: 'Emergency yapılandırması bulunamadı' },
      { status: 400 }
    );
  }

  let config: EmergencyConfig = typeof configData === 'string' ? JSON.parse(configData) : configData;

  const contact = config.trustedContacts.find(c => c.id === body.contactId);
  if (!contact) {
    return NextResponse.json(
      { error: 'Kişi bulunamadı' },
      { status: 404 }
    );
  }

  config = removeTrustedContact(config, body.contactId);
  await redis.set(`user:emergency:${walletAddress}`, JSON.stringify(config));

  const log = createEmergencyLog('trusted_contact_removed', walletAddress, { name: contact.name });
  await redis.lpush(`user:emergency:logs:${walletAddress}`, JSON.stringify(log));

  return NextResponse.json({
    success: true,
    message: 'Güvenilir kişi silindi',
  });
}

async function handleSetSecurityLevel(walletAddress: string, body: { level: 'standard' | 'high' | 'maximum' }) {
  const configData = await redis.get(`user:emergency:${walletAddress}`);
  let config: EmergencyConfig = configData 
    ? (typeof configData === 'string' ? JSON.parse(configData) : configData)
    : { ...DEFAULT_EMERGENCY_CONFIG };

  const oldLevel = config.securityLevel;
  config.securityLevel = body.level;

  await redis.set(`user:emergency:${walletAddress}`, JSON.stringify(config));

  const log = createEmergencyLog('security_level_changed', walletAddress, { 
    from: oldLevel, 
    to: body.level 
  });
  await redis.lpush(`user:emergency:logs:${walletAddress}`, JSON.stringify(log));

  return NextResponse.json({
    success: true,
    message: `Güvenlik seviyesi ${body.level} olarak ayarlandı`,
    securityLevelInfo: getSecurityLevelDescription(body.level),
  });
}

async function handleInitiateRecovery(walletAddress: string, body: { 
  type: 'self' | 'trusted_contact';
  email?: string;
}) {
  // Mevcut recovery var mı kontrol et
  const existingRecovery = await redis.get(`user:recovery:${walletAddress}`);
  if (existingRecovery) {
    const recovery: RecoveryRequest = typeof existingRecovery === 'string' 
      ? JSON.parse(existingRecovery) 
      : existingRecovery;
    
    if (recovery.status === 'pending' || recovery.status === 'verified') {
      return NextResponse.json(
        { error: 'Zaten aktif bir recovery işlemi var' },
        { status: 400 }
      );
    }
  }

  const recovery = createRecoveryRequest(body.email || walletAddress, body.type);
  await redis.set(`user:recovery:${walletAddress}`, JSON.stringify(recovery));

  const log = createEmergencyLog('recovery_initiated', walletAddress, { type: body.type });
  await redis.lpush(`user:emergency:logs:${walletAddress}`, JSON.stringify(log));

  // TODO: Email ile doğrulama kodu gönder

  return NextResponse.json({
    success: true,
    message: 'Recovery işlemi başlatıldı. Email adresinize doğrulama kodu gönderildi.',
    recoveryId: recovery.id,
    requiredSteps: recovery.requiredSteps,
    expiresAt: recovery.expiresAt,
  });
}

async function handleVerifyRecovery(walletAddress: string, body: { 
  recoveryId: string;
  step: string;
  verificationCode?: string;
}) {
  const recoveryData = await redis.get(`user:recovery:${walletAddress}`);
  if (!recoveryData) {
    return NextResponse.json(
      { error: 'Recovery işlemi bulunamadı' },
      { status: 404 }
    );
  }

  let recovery: RecoveryRequest = typeof recoveryData === 'string' 
    ? JSON.parse(recoveryData) 
    : recoveryData;

  if (recovery.id !== body.recoveryId) {
    return NextResponse.json(
      { error: 'Geçersiz recovery ID' },
      { status: 400 }
    );
  }

  // Süre dolmuş mu?
  if (new Date() > new Date(recovery.expiresAt)) {
    recovery.status = 'cancelled';
    await redis.set(`user:recovery:${walletAddress}`, JSON.stringify(recovery));
    return NextResponse.json(
      { error: 'Recovery süresi dolmuş' },
      { status: 400 }
    );
  }

  // Doğrulama kodu kontrolü (email_verification için)
  if (body.step === 'email_verification' && body.verificationCode !== recovery.verificationCode) {
    return NextResponse.json(
      { error: 'Geçersiz doğrulama kodu' },
      { status: 400 }
    );
  }

  // Adımı tamamla
  recovery = completeRecoveryStep(recovery, body.step);
  await redis.set(`user:recovery:${walletAddress}`, JSON.stringify(recovery));

  // Tamamlandıysa hesabı aç
  if (recovery.status === 'completed') {
    const configData = await redis.get(`user:emergency:${walletAddress}`);
    let config: EmergencyConfig = configData 
      ? (typeof configData === 'string' ? JSON.parse(configData) : configData)
      : { ...DEFAULT_EMERGENCY_CONFIG };

    config.frozen = false;
    config.panicMode = false;
    config.frozenAt = undefined;
    config.frozenBy = undefined;
    config.frozenReason = undefined;

    await redis.set(`user:emergency:${walletAddress}`, JSON.stringify(config));

    const log = createEmergencyLog('recovery_completed', walletAddress, {});
    await redis.lpush(`user:emergency:logs:${walletAddress}`, JSON.stringify(log));

    return NextResponse.json({
      success: true,
      message: 'Recovery tamamlandı! Hesabınız aktif.',
      recovery,
      accountActive: true,
    });
  }

  return NextResponse.json({
    success: true,
    message: `${body.step} adımı tamamlandı`,
    recovery,
    remainingSteps: recovery.requiredSteps.filter(s => !recovery.verifiedSteps.includes(s)),
  });
}
