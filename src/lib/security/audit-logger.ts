// src/lib/security/audit-logger.ts
// Audit logging sistemi - Tüm kritik işlemleri logla

import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type AuditAction =
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'register'
  | 'password_change'
  | '2fa_enabled'
  | '2fa_disabled'
  | '2fa_failed'
  | 'withdraw_request'
  | 'withdraw_approved'
  | 'withdraw_rejected'
  | 'withdraw_completed'
  | 'deposit_received'
  | 'trade_executed'
  | 'transfer_sent'
  | 'transfer_received'
  | 'session_created'
  | 'session_revoked'
  | 'suspicious_activity'
  | 'rate_limit_hit'
  | 'admin_login'
  | 'admin_action'
  | 'settings_changed'
  | 'api_key_created'
  | 'api_key_revoked';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  action: AuditAction;
  ip: string;
  userAgent: string;
  country?: string;
  city?: string;
  details: Record<string, any>;
  risk: RiskLevel;
  success: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// RISK ASSESSMENT
// ═══════════════════════════════════════════════════════════════════════════

const ACTION_RISK_MAP: Record<AuditAction, RiskLevel> = {
  login_success: 'low',
  login_failed: 'medium',
  logout: 'low',
  register: 'low',
  password_change: 'medium',
  '2fa_enabled': 'low',
  '2fa_disabled': 'high',
  '2fa_failed': 'medium',
  withdraw_request: 'high',
  withdraw_approved: 'high',
  withdraw_rejected: 'medium',
  withdraw_completed: 'high',
  deposit_received: 'low',
  trade_executed: 'medium',
  transfer_sent: 'medium',
  transfer_received: 'low',
  session_created: 'low',
  session_revoked: 'medium',
  suspicious_activity: 'critical',
  rate_limit_hit: 'medium',
  admin_login: 'high',
  admin_action: 'high',
  settings_changed: 'medium',
  api_key_created: 'high',
  api_key_revoked: 'high',
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Audit log kaydet
 */
export async function logAudit(params: {
  userId: string;
  action: AuditAction;
  ip: string;
  userAgent: string;
  details?: Record<string, any>;
  success?: boolean;
  riskOverride?: RiskLevel;
}): Promise<string> {
  const {
    userId,
    action,
    ip,
    userAgent,
    details = {},
    success = true,
    riskOverride,
  } = params;

  const id = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const risk = riskOverride || ACTION_RISK_MAP[action];

  const log: AuditLog = {
    id,
    timestamp: new Date(),
    userId,
    action,
    ip: maskIP(ip),
    userAgent: truncate(userAgent, 200),
    details: sanitizeDetails(details),
    risk,
    success,
  };

  // Redis'e kaydet
  const key = `audit:${userId}`;
  const globalKey = 'audit:global';

  await Promise.all([
    // Kullanıcı bazlı log
    redis.lpush(key, JSON.stringify(log)),
    redis.ltrim(key, 0, 999), // Son 1000 log
    redis.expire(key, 86400 * 90), // 90 gün

    // Global log (admin için)
    redis.lpush(globalKey, JSON.stringify(log)),
    redis.ltrim(globalKey, 0, 9999), // Son 10000 log

    // Risk bazlı index
    risk === 'high' || risk === 'critical'
      ? redis.lpush('audit:high_risk', JSON.stringify(log))
      : Promise.resolve(),
  ]);

  // Kritik işlemlerde alert gönder
  if (risk === 'critical' || (risk === 'high' && !success)) {
    await sendSecurityAlert(log);
  }

  return id;
}

/**
 * Kullanıcının audit loglarını getir
 */
export async function getUserAuditLogs(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<AuditLog[]> {
  const key = `audit:${userId}`;
  const logs = await redis.lrange(key, offset, offset + limit - 1);
  return logs.map((log: any) => typeof log === "string" ? JSON.parse(log) : log);
}

/**
 * Yüksek riskli logları getir (Admin)
 */
export async function getHighRiskLogs(
  limit: number = 100
): Promise<AuditLog[]> {
  const logs = await redis.lrange('audit:high_risk', 0, limit - 1);
  return logs.map((log: any) => typeof log === "string" ? JSON.parse(log) : log);
}

/**
 * Global logları getir (Admin)
 */
export async function getGlobalAuditLogs(
  limit: number = 100,
  filter?: { action?: AuditAction; risk?: RiskLevel }
): Promise<AuditLog[]> {
  const logs = await redis.lrange('audit:global', 0, limit * 2);
  let parsed = logs.map((log: any) => typeof log === "string" ? JSON.parse(log) : log);

  if (filter?.action) {
    parsed = parsed.filter((log: AuditLog) => log.action === filter.action);
  }

  if (filter?.risk) {
    parsed = parsed.filter((log: AuditLog) => log.risk === filter.risk);
  }

  return parsed.slice(0, limit);
}

/**
 * Belirli bir zaman aralığındaki logları getir
 */
export async function getAuditLogsByTimeRange(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<AuditLog[]> {
  const allLogs = await getUserAuditLogs(userId, 1000);
  return allLogs.filter((log) => {
    const logDate = new Date(log.timestamp);
    return logDate >= startDate && logDate <= endDate;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * IP adresini maskele (GDPR uyumu)
 */
function maskIP(ip: string): string {
  if (ip.includes(':')) {
    // IPv6
    const parts = ip.split(':');
    return parts.slice(0, 4).join(':') + ':****:****:****:****';
  }
  // IPv4
  const parts = ip.split('.');
  return `${parts[0]}.${parts[1]}.${parts[2]}.***`;
}

/**
 * String kısalt
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
}

/**
 * Details objesini temizle (hassas veri kaldır)
 */
function sanitizeDetails(details: Record<string, any>): Record<string, any> {
  const sensitiveKeys = [
    'password',
    'secret',
    'privateKey',
    'private_key',
    'accessToken',
    'apiKey',
    'api_key',
  ];

  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(details)) {
    if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof value === 'string' && value.length > 500) {
      sanitized[key] = truncate(value, 500);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Güvenlik alert'i gönder
 */
async function sendSecurityAlert(log: AuditLog): Promise<void> {
  console.error('🚨 SECURITY ALERT:', JSON.stringify(log, null, 2));

  // TODO: Email, Slack, Discord webhook etc.
  // await sendSlackAlert({
  //   channel: '#security-alerts',
  //   text: `🚨 ${log.risk.toUpperCase()}: ${log.action} by ${log.userId}`,
  //   details: log.details,
  // });

  // Alert'i ayrı bir key'e kaydet
  await redis.lpush(
    'audit:alerts',
    JSON.stringify({ ...log, alertedAt: new Date() })
  );
  await redis.ltrim('audit:alerts', 0, 999);
}

// ═══════════════════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Login başarılı log
 */
export function logLoginSuccess(
  userId: string,
  ip: string,
  userAgent: string,
  method: 'password' | '2fa' | 'biometric' = 'password'
) {
  return logAudit({
    userId,
    action: 'login_success',
    ip,
    userAgent,
    details: { method },
  });
}

/**
 * Login başarısız log
 */
export function logLoginFailed(
  userId: string,
  ip: string,
  userAgent: string,
  reason: string
) {
  return logAudit({
    userId,
    action: 'login_failed',
    ip,
    userAgent,
    details: { reason },
    success: false,
  });
}

/**
 * Withdraw log
 */
export function logWithdraw(
  userId: string,
  ip: string,
  userAgent: string,
  amount: number,
  token: string,
  address: string,
  status: 'request' | 'approved' | 'rejected' | 'completed'
) {
  const actionMap = {
    request: 'withdraw_request',
    approved: 'withdraw_approved',
    rejected: 'withdraw_rejected',
    completed: 'withdraw_completed',
  } as const;

  return logAudit({
    userId,
    action: actionMap[status],
    ip,
    userAgent,
    details: {
      amount,
      token,
      address: address.substring(0, 10) + '...',
    },
    success: status !== 'rejected',
  });
}

/**
 * Trade log
 */
export function logTrade(
  userId: string,
  ip: string,
  userAgent: string,
  fromToken: string,
  toToken: string,
  fromAmount: number,
  toAmount: number
) {
  return logAudit({
    userId,
    action: 'trade_executed',
    ip,
    userAgent,
    details: {
      fromToken,
      toToken,
      fromAmount,
      toAmount,
    },
  });
}
