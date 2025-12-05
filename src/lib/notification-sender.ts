/**
 * Push Notification Sender Library
 * Bildirim gönderme fonksiyonları
 */

import webpush from 'web-push';
import { redis } from '@/lib/redis';

// Types
export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: Array<{ action: string; title: string; icon?: string }>;
  requireInteraction?: boolean;
}

export type NotificationType = 
  | 'transaction'
  | 'deposit'
  | 'withdrawal'
  | 'price_alert'
  | 'security'
  | 'login'
  | 'system';

// VAPID config
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:info@auxite.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

/**
 * Kullanıcıya bildirim gönder
 */
export async function sendNotification(
  walletAddress: string,
  type: NotificationType,
  payload: NotificationPayload
): Promise<{ success: boolean; sent: number; failed: number }> {
  try {
    // Kullanıcı tercihlerini kontrol et
    const prefsData = await redis.get(`push:preferences:${walletAddress}`);
    const prefs = prefsData 
      ? (typeof prefsData === 'string' ? JSON.parse(prefsData) : prefsData)
      : { enabled: true };

    // Bildirimler kapalıysa gönderme
    if (!prefs.enabled) {
      return { success: false, sent: 0, failed: 0 };
    }

    // Tip bazlı tercih kontrolü
    const typePreferenceMap: Record<NotificationType, string> = {
      transaction: 'transactions',
      deposit: 'transactions',
      withdrawal: 'transactions',
      price_alert: 'priceAlerts',
      security: 'security',
      login: 'security',
      system: 'enabled', // Her zaman gönder
    };

    const prefKey = typePreferenceMap[type];
    if (prefKey && prefs[prefKey] === false) {
      return { success: false, sent: 0, failed: 0 };
    }

    // Kullanıcının subscription'larını al
    const endpoints = await redis.smembers(`push:user:${walletAddress}`);
    
    if (endpoints.length === 0) {
      return { success: false, sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    // Her subscription'a gönder
    for (const endpoint of endpoints) {
      const subKey = `push:subscription:${walletAddress}:${Buffer.from(endpoint).toString('base64').slice(0, 32)}`;
      const subData = await redis.get(subKey);
      
      if (!subData) continue;

      const subscription = typeof subData === 'string' ? JSON.parse(subData) : subData;

      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: subscription.keys,
          },
          JSON.stringify({
            ...payload,
            data: { ...payload.data, type },
          })
        );
        sent++;
      } catch (err: unknown) {
        const error = err as { statusCode?: number };
        console.error('Push send error:', error);
        failed++;

        // Subscription geçersizse sil (410 Gone)
        if (error.statusCode === 410) {
          await redis.del(subKey);
          await redis.srem(`push:user:${walletAddress}`, endpoint);
        }
      }
    }

    // Log kaydet
    await logNotification(walletAddress, type, payload, sent, failed);

    return { success: sent > 0, sent, failed };

  } catch (error) {
    console.error('sendNotification error:', error);
    return { success: false, sent: 0, failed: 0 };
  }
}

/**
 * Bildirim logla
 */
async function logNotification(
  walletAddress: string,
  type: NotificationType,
  payload: NotificationPayload,
  sent: number,
  failed: number
): Promise<void> {
  const log = {
    type,
    title: payload.title,
    body: payload.body,
    sent,
    failed,
    timestamp: new Date().toISOString(),
  };

  await redis.lpush(`push:logs:${walletAddress}`, JSON.stringify(log));
  await redis.ltrim(`push:logs:${walletAddress}`, 0, 99); // Son 100 log
}

/**
 * İşlem bildirimi gönder
 */
export async function notifyTransaction(
  walletAddress: string,
  data: {
    type: 'deposit' | 'withdrawal' | 'swap' | 'transfer';
    amount: number;
    token: string;
    txHash?: string;
  }
): Promise<void> {
  const titles = {
    deposit: 'Yatırım Onaylandı',
    withdrawal: 'Çekim Tamamlandı',
    swap: 'Dönüşüm Başarılı',
    transfer: 'Transfer Tamamlandı',
  };

  await sendNotification(walletAddress, 'transaction', {
    title: titles[data.type] || 'İşlem Bildirimi',
    body: `${data.amount} ${data.token} işlemi tamamlandı`,
    icon: '/icons/transaction.png',
    tag: `tx-${data.txHash || Date.now()}`,
    data: {
      type: 'transaction',
      txType: data.type,
      txHash: data.txHash,
    },
    actions: [
      { action: 'view', title: 'Görüntüle' },
      { action: 'dismiss', title: 'Kapat' },
    ],
  });
}

/**
 * Fiyat uyarısı bildirimi gönder
 */
export async function notifyPriceAlert(
  walletAddress: string,
  data: {
    token: string;
    price: number;
    targetPrice: number;
    direction: 'above' | 'below';
    alertId: string;
  }
): Promise<void> {
  const direction = data.direction === 'above' ? 'üstüne' : 'altına';
  
  await sendNotification(walletAddress, 'price_alert', {
    title: `🔔 ${data.token} Fiyat Uyarısı`,
    body: `${data.token} $${data.targetPrice} ${direction} ${data.direction === 'above' ? 'çıktı' : 'düştü'}! Şu an: $${data.price}`,
    icon: '/icons/price-alert.png',
    tag: `alert-${data.alertId}`,
    data: {
      type: 'price_alert',
      alertId: data.alertId,
      token: data.token,
    },
    requireInteraction: true,
    actions: [
      { action: 'trade', title: 'İşlem Yap' },
      { action: 'dismiss', title: 'Kapat' },
    ],
  });
}

/**
 * Güvenlik bildirimi gönder
 */
export async function notifySecurityEvent(
  walletAddress: string,
  data: {
    event: 'login' | 'new_device' | '2fa_enabled' | 'password_changed' | 'suspicious_activity';
    details?: string;
    ip?: string;
    location?: string;
  }
): Promise<void> {
  const titles = {
    login: 'Yeni Giriş',
    new_device: 'Yeni Cihaz Algılandı',
    '2fa_enabled': '2FA Aktifleştirildi',
    password_changed: 'Şifre Değiştirildi',
    suspicious_activity: '⚠️ Şüpheli Aktivite',
  };

  const bodies = {
    login: `Hesabınıza ${data.location || 'bilinmeyen konum'}dan giriş yapıldı`,
    new_device: 'Hesabınıza yeni bir cihazdan erişildi',
    '2fa_enabled': 'İki faktörlü doğrulama aktifleştirildi',
    password_changed: 'Hesap şifreniz değiştirildi',
    suspicious_activity: data.details || 'Hesabınızda şüpheli aktivite tespit edildi',
  };

  await sendNotification(walletAddress, 'security', {
    title: titles[data.event],
    body: bodies[data.event],
    icon: '/icons/security.png',
    tag: `security-${data.event}-${Date.now()}`,
    data: {
      type: 'security',
      event: data.event,
      ip: data.ip,
    },
    requireInteraction: data.event === 'suspicious_activity',
    actions: data.event === 'suspicious_activity' 
      ? [
          { action: 'review', title: 'İncele' },
          { action: 'freeze', title: 'Hesabı Dondur' },
        ]
      : undefined,
  });
}
