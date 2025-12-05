/**
 * Emergency System
 * Hesap dondurma, panic button, recovery
 */

import crypto from 'crypto';

// ============================================
// TYPES
// ============================================

export interface EmergencyConfig {
  frozen: boolean;
  frozenAt?: string;
  frozenBy?: string; // Wallet address
  frozenReason?: string;
  frozenUntil?: string; // Opsiyonel: geçici dondurma
  panicMode: boolean;
  panicActivatedAt?: string;
  recoveryEmail?: string;
  recoveryPhone?: string;
  trustedContacts: TrustedContact[];
  cooldownPeriod: number; // Saat cinsinden (unfreeze için bekleme süresi)
  lastActivityAt?: string;
  securityLevel: 'standard' | 'high' | 'maximum';
}

export interface TrustedContact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  walletAddress?: string;
  canUnfreeze: boolean;
  canRecover: boolean;
  addedAt: string;
  verifiedAt?: string;
}

export interface EmergencyLog {
  id: string;
  action: EmergencyAction;
  performedBy: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export type EmergencyAction =
  | 'freeze'
  | 'unfreeze'
  | 'panic_activate'
  | 'panic_deactivate'
  | 'recovery_initiated'
  | 'recovery_completed'
  | 'trusted_contact_added'
  | 'trusted_contact_removed'
  | 'security_level_changed';

export interface FreezeRequest {
  reason: string;
  duration?: number; // Saat cinsinden, undefined = süresiz
  notifyContacts?: boolean;
}

export interface RecoveryRequest {
  id: string;
  initiatedBy: string; // email veya wallet
  type: 'self' | 'trusted_contact' | 'support';
  status: 'pending' | 'verified' | 'completed' | 'cancelled';
  verificationCode?: string;
  verifiedSteps: string[];
  requiredSteps: string[];
  createdAt: string;
  expiresAt: string;
  completedAt?: string;
}

// ============================================
// DEFAULT CONFIG
// ============================================

export const DEFAULT_EMERGENCY_CONFIG: EmergencyConfig = {
  frozen: false,
  panicMode: false,
  trustedContacts: [],
  cooldownPeriod: 24, // 24 saat
  securityLevel: 'standard',
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Hesabı dondur
 */
export function freezeAccount(
  config: EmergencyConfig,
  frozenBy: string,
  request: FreezeRequest
): EmergencyConfig {
  const now = new Date();
  
  return {
    ...config,
    frozen: true,
    frozenAt: now.toISOString(),
    frozenBy,
    frozenReason: request.reason,
    frozenUntil: request.duration 
      ? new Date(now.getTime() + request.duration * 60 * 60 * 1000).toISOString()
      : undefined,
  };
}

/**
 * Hesabı çöz
 */
export function unfreezeAccount(
  config: EmergencyConfig
): { success: boolean; config?: EmergencyConfig; error?: string } {
  if (!config.frozen) {
    return { success: false, error: 'Hesap zaten aktif' };
  }

  // Cooldown kontrolü
  if (config.frozenAt) {
    const frozenTime = new Date(config.frozenAt).getTime();
    const cooldownEnd = frozenTime + config.cooldownPeriod * 60 * 60 * 1000;
    const now = Date.now();

    if (now < cooldownEnd) {
      const remainingHours = Math.ceil((cooldownEnd - now) / (60 * 60 * 1000));
      return { 
        success: false, 
        error: `Hesap çözme için ${remainingHours} saat beklemeniz gerekiyor` 
      };
    }
  }

  return {
    success: true,
    config: {
      ...config,
      frozen: false,
      frozenAt: undefined,
      frozenBy: undefined,
      frozenReason: undefined,
      frozenUntil: undefined,
    },
  };
}

/**
 * Panic mode aktifleştir
 */
export function activatePanicMode(config: EmergencyConfig): EmergencyConfig {
  return {
    ...config,
    panicMode: true,
    panicActivatedAt: new Date().toISOString(),
    frozen: true, // Panic mode hesabı otomatik dondurur
    frozenAt: new Date().toISOString(),
    frozenReason: 'Panic mode activated',
  };
}

/**
 * Panic mode deaktifleştir
 */
export function deactivatePanicMode(
  config: EmergencyConfig
): { success: boolean; config?: EmergencyConfig; error?: string } {
  if (!config.panicMode) {
    return { success: false, error: 'Panic mode zaten kapalı' };
  }

  // Panic mode için minimum 1 saat bekleme
  if (config.panicActivatedAt) {
    const activatedTime = new Date(config.panicActivatedAt).getTime();
    const minWait = 60 * 60 * 1000; // 1 saat
    const now = Date.now();

    if (now - activatedTime < minWait) {
      const remainingMins = Math.ceil((minWait - (now - activatedTime)) / (60 * 1000));
      return { 
        success: false, 
        error: `Panic mode kapatmak için ${remainingMins} dakika beklemeniz gerekiyor` 
      };
    }
  }

  return {
    success: true,
    config: {
      ...config,
      panicMode: false,
      panicActivatedAt: undefined,
      // Not: Hesap hala dondurulmuş olabilir, ayrıca unfreeze gerekebilir
    },
  };
}

/**
 * Hesap durumunu kontrol et
 */
export function checkAccountStatus(config: EmergencyConfig): {
  canTransact: boolean;
  reason?: string;
  status: 'active' | 'frozen' | 'panic' | 'recovery';
} {
  if (config.panicMode) {
    return {
      canTransact: false,
      reason: 'Panic mode aktif - tüm işlemler durduruldu',
      status: 'panic',
    };
  }

  if (config.frozen) {
    // Geçici dondurma süresi dolmuş mu?
    if (config.frozenUntil) {
      const unfreezeTime = new Date(config.frozenUntil).getTime();
      if (Date.now() >= unfreezeTime) {
        return { canTransact: true, status: 'active' };
      }
    }

    return {
      canTransact: false,
      reason: config.frozenReason || 'Hesap dondurulmuş',
      status: 'frozen',
    };
  }

  return { canTransact: true, status: 'active' };
}

/**
 * Trusted contact ekle
 */
export function addTrustedContact(
  config: EmergencyConfig,
  contact: Omit<TrustedContact, 'id' | 'addedAt'>
): EmergencyConfig {
  const newContact: TrustedContact = {
    ...contact,
    id: `tc_${crypto.randomBytes(8).toString('hex')}`,
    addedAt: new Date().toISOString(),
  };

  return {
    ...config,
    trustedContacts: [...config.trustedContacts, newContact],
  };
}

/**
 * Trusted contact sil
 */
export function removeTrustedContact(
  config: EmergencyConfig,
  contactId: string
): EmergencyConfig {
  return {
    ...config,
    trustedContacts: config.trustedContacts.filter(c => c.id !== contactId),
  };
}

/**
 * Recovery isteği oluştur
 */
export function createRecoveryRequest(
  initiatedBy: string,
  type: RecoveryRequest['type']
): RecoveryRequest {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 saat

  const requiredSteps: string[] = [];
  
  if (type === 'self') {
    requiredSteps.push('email_verification', '2fa_verification', 'cooldown_wait');
  } else if (type === 'trusted_contact') {
    requiredSteps.push('contact_verification', 'owner_notification', 'cooldown_wait');
  } else {
    requiredSteps.push('identity_verification', 'support_approval', 'owner_notification');
  }

  return {
    id: `rec_${crypto.randomBytes(12).toString('hex')}`,
    initiatedBy,
    type,
    status: 'pending',
    verificationCode: crypto.randomBytes(4).toString('hex').toUpperCase(),
    verifiedSteps: [],
    requiredSteps,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

/**
 * Recovery adımını tamamla
 */
export function completeRecoveryStep(
  request: RecoveryRequest,
  step: string
): RecoveryRequest {
  if (request.verifiedSteps.includes(step)) {
    return request;
  }

  const updated: RecoveryRequest = {
    ...request,
    verifiedSteps: [...request.verifiedSteps, step],
  };

  // Tüm adımlar tamamlandı mı?
  const allCompleted = updated.requiredSteps.every(s => updated.verifiedSteps.includes(s));
  if (allCompleted) {
    updated.status = 'completed';
    updated.completedAt = new Date().toISOString();
  } else {
    updated.status = 'verified';
  }

  return updated;
}

/**
 * Emergency log oluştur
 */
export function createEmergencyLog(
  action: EmergencyAction,
  performedBy: string,
  details?: Record<string, unknown>,
  ip?: string,
  userAgent?: string
): EmergencyLog {
  return {
    id: `elog_${crypto.randomBytes(8).toString('hex')}`,
    action,
    performedBy,
    ip,
    userAgent,
    details,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Güvenlik seviyesi açıklaması
 */
export function getSecurityLevelDescription(level: EmergencyConfig['securityLevel']): {
  name: string;
  description: string;
  features: string[];
} {
  switch (level) {
    case 'standard':
      return {
        name: 'Standart',
        description: 'Günlük kullanım için temel güvenlik',
        features: [
          'İşlem limitleri',
          '2FA desteği',
          'Email bildirimleri',
        ],
      };
    case 'high':
      return {
        name: 'Yüksek',
        description: 'Artırılmış güvenlik önlemleri',
        features: [
          'Tüm standart özellikler',
          'Çekim için 24 saat bekleme',
          'Yeni adresler için onay',
          'Anormal aktivite algılama',
        ],
      };
    case 'maximum':
      return {
        name: 'Maksimum',
        description: 'En yüksek güvenlik seviyesi',
        features: [
          'Tüm yüksek güvenlik özellikleri',
          'Multi-sig zorunlu',
          'Coğrafi kısıtlamalar',
          'Tüm işlemler için onay',
          '48 saat çekim bekleme',
        ],
      };
  }
}

/**
 * Dondurma süresini formatla
 */
export function formatFreezeTime(config: EmergencyConfig): string {
  if (!config.frozen || !config.frozenAt) {
    return 'Aktif';
  }

  const frozenAt = new Date(config.frozenAt);
  const now = new Date();
  const diff = now.getTime() - frozenAt.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (config.frozenUntil) {
    const until = new Date(config.frozenUntil);
    const remaining = until.getTime() - now.getTime();
    if (remaining > 0) {
      const remainingHours = Math.ceil(remaining / (1000 * 60 * 60));
      return `Geçici donduruldu (${remainingHours} saat kaldı)`;
    }
  }

  if (days > 0) {
    return `${days} gündür dondurulmuş`;
  }
  return `${hours} saattir dondurulmuş`;
}
