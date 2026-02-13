/**
 * Push Notification Sender Library
 * Multilingual push notifications — uses client's preferred language from Redis.
 * Security alerts use fallback to 'en' if language unavailable (security > localization).
 */

import webpush from 'web-push';
import { redis } from '@/lib/redis';
import { getUserLanguage } from '@/lib/user-language';

type LangCode = 'en' | 'tr' | 'de' | 'fr' | 'ar' | 'ru';

// ─── Notification Translations ───────────────────────────────────────────────

const transactionTitles: Record<string, Record<LangCode, string>> = {
  deposit: {
    en: 'Deposit Confirmed',
    tr: 'Yatırım Onaylandı',
    de: 'Einzahlung bestätigt',
    fr: 'Dépôt confirmé',
    ar: 'تم تأكيد الإيداع',
    ru: 'Депозит подтверждён',
  },
  withdrawal: {
    en: 'Withdrawal Completed',
    tr: 'Çekim Tamamlandı',
    de: 'Auszahlung abgeschlossen',
    fr: 'Retrait terminé',
    ar: 'تم إتمام السحب',
    ru: 'Вывод завершён',
  },
  swap: {
    en: 'Conversion Successful',
    tr: 'Dönüşüm Başarılı',
    de: 'Umwandlung erfolgreich',
    fr: 'Conversion réussie',
    ar: 'تم التحويل بنجاح',
    ru: 'Конвертация успешна',
  },
  transfer: {
    en: 'Transfer Completed',
    tr: 'Transfer Tamamlandı',
    de: 'Überweisung abgeschlossen',
    fr: 'Transfert terminé',
    ar: 'تم إتمام التحويل',
    ru: 'Перевод завершён',
  },
};

const transactionBody: Record<LangCode, string> = {
  en: 'transaction completed',
  tr: 'işlemi tamamlandı',
  de: 'Transaktion abgeschlossen',
  fr: 'transaction terminée',
  ar: 'تمت المعاملة',
  ru: 'транзакция завершена',
};

const transactionFallbackTitle: Record<LangCode, string> = {
  en: 'Transaction Notification',
  tr: 'İşlem Bildirimi',
  de: 'Transaktionsbenachrichtigung',
  fr: 'Notification de transaction',
  ar: 'إشعار معاملة',
  ru: 'Уведомление о транзакции',
};

const actionLabels: Record<string, Record<LangCode, string>> = {
  view: { en: 'View', tr: 'Görüntüle', de: 'Anzeigen', fr: 'Voir', ar: 'عرض', ru: 'Просмотр' },
  dismiss: { en: 'Dismiss', tr: 'Kapat', de: 'Schließen', fr: 'Fermer', ar: 'إغلاق', ru: 'Закрыть' },
  trade: { en: 'Trade', tr: 'İşlem Yap', de: 'Handeln', fr: 'Négocier', ar: 'تداول', ru: 'Торговать' },
  review: { en: 'Review', tr: 'İncele', de: 'Überprüfen', fr: 'Examiner', ar: 'مراجعة', ru: 'Проверить' },
  freeze: { en: 'Freeze Account', tr: 'Hesabı Dondur', de: 'Konto sperren', fr: 'Geler le compte', ar: 'تجميد الحساب', ru: 'Заморозить счёт' },
};

const priceAlertTitle: Record<LangCode, string> = {
  en: 'Price Alert',
  tr: 'Fiyat Uyarısı',
  de: 'Preisalarm',
  fr: 'Alerte de prix',
  ar: 'تنبيه السعر',
  ru: 'Ценовое уповещение',
};

const priceAlertBody: Record<LangCode, (token: string, target: number, price: number, dir: 'above' | 'below') => string> = {
  en: (token, target, price, dir) => `${token} went ${dir} $${target}! Now: $${price}`,
  tr: (token, target, price, dir) => `${token} $${target} ${dir === 'above' ? 'üstüne çıktı' : 'altına düştü'}! Şu an: $${price}`,
  de: (token, target, price, dir) => `${token} ${dir === 'above' ? 'über' : 'unter'} $${target}! Aktuell: $${price}`,
  fr: (token, target, price, dir) => `${token} ${dir === 'above' ? 'au-dessus de' : 'en dessous de'} $${target} ! Actuel : $${price}`,
  ar: (token, target, price, dir) => `${token} ${dir === 'above' ? 'فوق' : 'تحت'} $${target}! الآن: $${price}`,
  ru: (token, target, price, dir) => `${token} ${dir === 'above' ? 'выше' : 'ниже'} $${target}! Сейчас: $${price}`,
};

const securityTitles: Record<string, Record<LangCode, string>> = {
  login: {
    en: 'New Login',
    tr: 'Yeni Giriş',
    de: 'Neue Anmeldung',
    fr: 'Nouvelle connexion',
    ar: 'تسجيل دخول جديد',
    ru: 'Новый вход',
  },
  new_device: {
    en: 'New Device Detected',
    tr: 'Yeni Cihaz Algılandı',
    de: 'Neues Gerät erkannt',
    fr: 'Nouvel appareil détecté',
    ar: 'تم اكتشاف جهاز جديد',
    ru: 'Обнаружено новое устройство',
  },
  '2fa_enabled': {
    en: '2FA Enabled',
    tr: '2FA Aktifleştirildi',
    de: '2FA aktiviert',
    fr: '2FA activé',
    ar: 'تم تفعيل المصادقة الثنائية',
    ru: '2FA активирована',
  },
  password_changed: {
    en: 'Password Changed',
    tr: 'Şifre Değiştirildi',
    de: 'Passwort geändert',
    fr: 'Mot de passe modifié',
    ar: 'تم تغيير كلمة المرور',
    ru: 'Пароль изменён',
  },
  suspicious_activity: {
    en: 'Suspicious Activity',
    tr: 'Şüpheli Aktivite',
    de: 'Verdächtige Aktivität',
    fr: 'Activité suspecte',
    ar: 'نشاط مشبوه',
    ru: 'Подозрительная активность',
  },
};

const securityBodies: Record<string, Record<LangCode, (location?: string, details?: string) => string>> = {
  login: {
    en: (loc) => `Your account was accessed from ${loc || 'unknown location'}`,
    tr: (loc) => `Hesabınıza ${loc || 'bilinmeyen konum'}dan giriş yapıldı`,
    de: (loc) => `Zugriff auf Ihr Konto von ${loc || 'unbekanntem Standort'}`,
    fr: (loc) => `Connexion à votre compte depuis ${loc || 'emplacement inconnu'}`,
    ar: (loc) => `تم الوصول إلى حسابك من ${loc || 'موقع غير معروف'}`,
    ru: (loc) => `Вход в ваш аккаунт из ${loc || 'неизвестного местоположения'}`,
  },
  new_device: {
    en: () => 'Your account was accessed from a new device',
    tr: () => 'Hesabınıza yeni bir cihazdan erişildi',
    de: () => 'Zugriff auf Ihr Konto von einem neuen Gerät',
    fr: () => 'Votre compte a été accédé depuis un nouvel appareil',
    ar: () => 'تم الوصول إلى حسابك من جهاز جديد',
    ru: () => 'В ваш аккаунт вошли с нового устройства',
  },
  '2fa_enabled': {
    en: () => 'Two-factor authentication has been enabled',
    tr: () => 'İki faktörlü doğrulama aktifleştirildi',
    de: () => 'Zwei-Faktor-Authentifizierung wurde aktiviert',
    fr: () => "L'authentification à deux facteurs a été activée",
    ar: () => 'تم تفعيل المصادقة الثنائية',
    ru: () => 'Двухфакторная аутентификация активирована',
  },
  password_changed: {
    en: () => 'Your account password has been changed',
    tr: () => 'Hesap şifreniz değiştirildi',
    de: () => 'Ihr Kontokennwort wurde geändert',
    fr: () => 'Le mot de passe de votre compte a été modifié',
    ar: () => 'تم تغيير كلمة مرور حسابك',
    ru: () => 'Пароль вашего аккаунта был изменён',
  },
  suspicious_activity: {
    en: (_loc, details) => details || 'Suspicious activity detected on your account',
    tr: (_loc, details) => details || 'Hesabınızda şüpheli aktivite tespit edildi',
    de: (_loc, details) => details || 'Verdächtige Aktivität auf Ihrem Konto festgestellt',
    fr: (_loc, details) => details || 'Activité suspecte détectée sur votre compte',
    ar: (_loc, details) => details || 'تم اكتشاف نشاط مشبوه في حسابك',
    ru: (_loc, details) => details || 'Обнаружена подозрительная активность в вашем аккаунте',
  },
};

function getLang(lang: string): LangCode {
  if (['en', 'tr', 'de', 'fr', 'ar', 'ru'].includes(lang)) return lang as LangCode;
  return 'en';
}

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
      system: 'enabled',
    };

    const prefKey = typePreferenceMap[type];
    if (prefKey && prefs[prefKey] === false) {
      return { success: false, sent: 0, failed: 0 };
    }

    // Kullanıcının subscription'larını al (JSON array olarak saklıyoruz)
    const subscriptionsData = await redis.get(`push:subscriptions:${walletAddress}`);
    const subscriptions: Array<{ endpoint: string; keys: { p256dh: string; auth: string } }> = 
      subscriptionsData 
        ? (typeof subscriptionsData === 'string' ? JSON.parse(subscriptionsData) : subscriptionsData)
        : [];

    if (subscriptions.length === 0) {
      return { success: false, sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    // Her subscription'a gönder
    for (const subscription of subscriptions) {
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
          const updatedSubs = subscriptions.filter(s => s.endpoint !== subscription.endpoint);
          await redis.set(`push:subscriptions:${walletAddress}`, JSON.stringify(updatedSubs));
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

  // Son 100 log sakla
  const logsData = await redis.get(`push:logs:${walletAddress}`);
  const logs: Array<typeof log> = logsData 
    ? (typeof logsData === 'string' ? JSON.parse(logsData) : logsData)
    : [];
  
  logs.unshift(log);
  if (logs.length > 100) logs.pop();
  
  await redis.set(`push:logs:${walletAddress}`, JSON.stringify(logs));
}

/**
 * İşlem bildirimi gönder (multilingual)
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
  const lang = getLang(await getUserLanguage(walletAddress));

  await sendNotification(walletAddress, 'transaction', {
    title: transactionTitles[data.type]?.[lang] || transactionFallbackTitle[lang],
    body: `${data.amount} ${data.token} ${transactionBody[lang]}`,
    icon: '/icons/icon-192x192.png',
    tag: `tx-${data.txHash || Date.now()}`,
    data: {
      type: 'transaction',
      txType: data.type,
      txHash: data.txHash,
    },
    actions: [
      { action: 'view', title: actionLabels.view[lang] },
      { action: 'dismiss', title: actionLabels.dismiss[lang] },
    ],
  });
}

/**
 * Fiyat uyarısı bildirimi gönder (multilingual)
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
  const lang = getLang(await getUserLanguage(walletAddress));

  await sendNotification(walletAddress, 'price_alert', {
    title: `🔔 ${data.token} ${priceAlertTitle[lang]}`,
    body: priceAlertBody[lang](data.token, data.targetPrice, data.price, data.direction),
    icon: '/icons/icon-192x192.png',
    tag: `alert-${data.alertId}`,
    data: {
      type: 'price_alert',
      alertId: data.alertId,
      token: data.token,
    },
    requireInteraction: true,
    actions: [
      { action: 'trade', title: actionLabels.trade[lang] },
      { action: 'dismiss', title: actionLabels.dismiss[lang] },
    ],
  });
}

/**
 * Güvenlik bildirimi gönder (multilingual)
 * Note: Security alerts use fallback to 'en' if language unavailable.
 * Per institutional standard: security > localization for alerts.
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
  const lang = getLang(await getUserLanguage(walletAddress));
  const prefix = data.event === 'suspicious_activity' ? '⚠️ ' : '';

  await sendNotification(walletAddress, 'security', {
    title: prefix + (securityTitles[data.event]?.[lang] || securityTitles[data.event]?.en || 'Security Alert'),
    body: securityBodies[data.event]?.[lang]?.(data.location, data.details)
      || securityBodies[data.event]?.en?.(data.location, data.details)
      || 'Security event detected',
    icon: '/icons/icon-192x192.png',
    tag: `security-${data.event}-${Date.now()}`,
    data: {
      type: 'security',
      event: data.event,
      ip: data.ip,
    },
    requireInteraction: data.event === 'suspicious_activity',
    actions: data.event === 'suspicious_activity'
      ? [
          { action: 'review', title: actionLabels.review[lang] },
          { action: 'freeze', title: actionLabels.freeze[lang] },
        ]
      : undefined,
  });
}
