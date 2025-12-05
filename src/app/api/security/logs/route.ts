/**
 * Security Logs API
 * GET: Güvenlik olayları geçmişini al
 */

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

interface SecurityLog {
  event: string;
  walletAddress: string;
  details: Record<string, unknown>;
  timestamp: string;
}

// Event türleri için açıklamalar
const EVENT_DESCRIPTIONS: Record<string, { tr: string; en: string; severity: 'info' | 'warning' | 'danger' }> = {
  '2FA_ENABLED': { tr: '2FA aktifleştirildi', en: '2FA enabled', severity: 'info' },
  '2FA_DISABLED': { tr: '2FA kapatıldı', en: '2FA disabled', severity: 'warning' },
  '2FA_VERIFIED': { tr: '2FA doğrulandı', en: '2FA verified', severity: 'info' },
  '2FA_FAILED': { tr: '2FA doğrulama başarısız', en: '2FA verification failed', severity: 'warning' },
  'NEW_DEVICE': { tr: 'Yeni cihaz tespit edildi', en: 'New device detected', severity: 'warning' },
  'DEVICE_TRUSTED': { tr: 'Cihaz güvenilir olarak işaretlendi', en: 'Device marked as trusted', severity: 'info' },
  'DEVICE_UNTRUSTED': { tr: 'Cihaz güvenilirlik durumu kaldırıldı', en: 'Device trust removed', severity: 'info' },
  'DEVICE_REMOVED': { tr: 'Cihaz silindi', en: 'Device removed', severity: 'info' },
  'SESSION_CREATED': { tr: 'Yeni oturum açıldı', en: 'New session created', severity: 'info' },
  'SESSION_REVOKED': { tr: 'Oturum sonlandırıldı', en: 'Session revoked', severity: 'info' },
  'ALL_SESSIONS_REVOKED': { tr: 'Tüm oturumlar sonlandırıldı', en: 'All sessions revoked', severity: 'warning' },
  'PASSKEY_REGISTERED': { tr: 'Passkey eklendi', en: 'Passkey registered', severity: 'info' },
  'PASSKEY_REMOVED': { tr: 'Passkey silindi', en: 'Passkey removed', severity: 'warning' },
  'PASSKEY_USED': { tr: 'Passkey ile giriş yapıldı', en: 'Passkey authentication', severity: 'info' },
  'LOGIN_SUCCESS': { tr: 'Başarılı giriş', en: 'Successful login', severity: 'info' },
  'LOGIN_FAILED': { tr: 'Başarısız giriş denemesi', en: 'Failed login attempt', severity: 'warning' },
  'PASSWORD_CHANGED': { tr: 'Şifre değiştirildi', en: 'Password changed', severity: 'info' },
  'SUSPICIOUS_ACTIVITY': { tr: 'Şüpheli aktivite tespit edildi', en: 'Suspicious activity detected', severity: 'danger' },
  'IP_BLOCKED': { tr: 'IP adresi engellendi', en: 'IP address blocked', severity: 'danger' },
  'WITHDRAWAL': { tr: 'Çekim işlemi', en: 'Withdrawal', severity: 'info' },
  'LARGE_TRANSACTION': { tr: 'Büyük işlem gerçekleşti', en: 'Large transaction', severity: 'warning' },
};

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet adresi gerekli' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const severity = searchParams.get('severity'); // 'info', 'warning', 'danger'
    const lang = (searchParams.get('lang') || 'tr') as 'tr' | 'en';

    // Logları al
    const logsData = await redis.lrange(
      `user:security:logs:${walletAddress}`,
      offset,
      offset + limit - 1
    );

    const logs: SecurityLog[] = logsData.map(log => 
      typeof log === 'string' ? JSON.parse(log) : log as SecurityLog
    );

    // Logları zenginleştir
    const enrichedLogs = logs
      .map(log => {
        const eventInfo = EVENT_DESCRIPTIONS[log.event] || {
          tr: log.event,
          en: log.event,
          severity: 'info' as const,
        };

        return {
          ...log,
          description: eventInfo[lang],
          severity: eventInfo.severity,
          relativeTime: getRelativeTime(new Date(log.timestamp), lang),
        };
      })
      .filter(log => !severity || log.severity === severity);

    // Toplam log sayısı
    const totalLogs = await redis.llen(`user:security:logs:${walletAddress}`);

    return NextResponse.json({
      logs: enrichedLogs,
      total: totalLogs,
      limit,
      offset,
      hasMore: offset + limit < totalLogs,
    });
  } catch (error) {
    console.error('Security logs error:', error);
    return NextResponse.json(
      { error: 'Güvenlik geçmişi alınamadı' },
      { status: 500 }
    );
  }
}

// Göreceli zaman hesapla
function getRelativeTime(date: Date, lang: 'tr' | 'en'): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (lang === 'tr') {
    if (diffMins < 1) return 'Az önce';
    if (diffMins < 60) return `${diffMins} dakika önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays < 7) return `${diffDays} gün önce`;
    return date.toLocaleDateString('tr-TR');
  } else {
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US');
  }
}
