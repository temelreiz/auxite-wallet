/**
 * Push Notification Sender Library
 * Multilingual push notifications — uses client's preferred language from Redis.
 * Security alerts use fallback to 'en' if language unavailable (security > localization).
 */

import webpush from 'web-push';
import { redis } from '@/lib/redis';
import { getUserLanguage } from '@/lib/user-language';
import { sendPushToUser } from '@/lib/expo-push';

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

    let sent = 0;
    let failed = 0;

    // Her web subscription'a gönder
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

    // ─── Mobile Push (Expo) ────────────────────────────────────────────
    try {
      const categoryMap: Record<string, string> = {
        transaction: 'trade', deposit: 'trade', withdrawal: 'trade',
        login: 'security', security: 'security',
        price_alert: 'price_alert', system: 'system',
      };
      const channelMap: Record<string, string> = {
        security: 'security', login: 'security',
        transaction: 'trades', deposit: 'trades', withdrawal: 'trades',
      };

      const mobileResult = await sendPushToUser(
        walletAddress,
        payload.title,
        payload.body,
        {
          ...payload.data,
          type,
          category: categoryMap[type] || type,
        },
        {
          sound: 'default',
          channelId: channelMap[type] || 'default',
          priority: type === 'security' || type === 'login' ? 'high' : 'default',
        }
      );

      if (mobileResult) {
        sent += mobileResult.sent || 0;
        failed += mobileResult.failed || 0;
      }
    } catch (mobileErr) {
      console.error('[notification-sender] Mobile push error:', mobileErr);
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
// ─── Rich Transaction Notifications ─────────────────────────────────────────

const richTitles: Record<string, Record<LangCode, string>> = {
  buy: { en: '🪙 Purchase Confirmed', tr: '🪙 Alım Onaylandı', de: '🪙 Kauf bestätigt', fr: '🪙 Achat confirmé', ar: '🪙 تم تأكيد الشراء', ru: '🪙 Покупка подтверждена' },
  sell: { en: '💰 Sale Confirmed', tr: '💰 Satış Onaylandı', de: '💰 Verkauf bestätigt', fr: '💰 Vente confirmée', ar: '💰 تم تأكيد البيع', ru: '💰 Продажа подтверждена' },
  swap: { en: '🔄 Exchange Complete', tr: '🔄 Takas Tamamlandı', de: '🔄 Tausch abgeschlossen', fr: '🔄 Échange terminé', ar: '🔄 اكتمل التبادل', ru: '🔄 Обмен завершён' },
  deposit: { en: '✅ Deposit Confirmed', tr: '✅ Yatırım Onaylandı', de: '✅ Einzahlung bestätigt', fr: '✅ Dépôt confirmé', ar: '✅ تم تأكيد الإيداع', ru: '✅ Депозит подтверждён' },
  withdrawal: { en: '💸 Withdrawal Initiated', tr: '💸 Çekim Başlatıldı', de: '💸 Auszahlung eingeleitet', fr: '💸 Retrait initié', ar: '💸 تم بدء السحب', ru: '💸 Вывод инициирован' },
  transfer: { en: '📤 Transfer Sent', tr: '📤 Transfer Gönderildi', de: '📤 Überweisung gesendet', fr: '📤 Transfert envoyé', ar: '📤 تم إرسال التحويل', ru: '📤 Перевод отправлен' },
  receive: { en: '📥 Funds Received', tr: '📥 Ödeme Alındı', de: '📥 Geld erhalten', fr: '📥 Fonds reçus', ar: '📥 تم استلام الأموال', ru: '📥 Средства получены' },
  stake: { en: '📊 Staking Active', tr: '📊 Getiri Aktif', de: '📊 Staking aktiv', fr: '📊 Staking actif', ar: '📊 التخزين نشط', ru: '📊 Стейкинг активен' },
  metal_conversion: { en: '🔄 Conversion Complete', tr: '🔄 Dönüşüm Tamamlandı', de: '🔄 Umwandlung abgeschlossen', fr: '🔄 Conversion terminée', ar: '🔄 اكتملت عملية التحويل', ru: '🔄 Конвертация завершена' },
};

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr || '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function buildRichBody(
  type: string,
  lang: LangCode,
  data: { amount: number; token: string; fromToken?: string; toToken?: string; toAddress?: string; fromAddress?: string; certificateNumber?: string; apy?: string; duration?: string }
): string {
  const { amount, token, fromToken, toToken, toAddress, fromAddress, certificateNumber, apy, duration } = data;
  const amt = amount < 0.01 ? amount.toFixed(6) : amount < 1 ? amount.toFixed(4) : amount.toFixed(2);
  const cert = certificateNumber ? ` (${certificateNumber})` : '';

  const bodies: Record<string, Record<LangCode, string>> = {
    buy: {
      en: `${amt}g ${token} purchased with ${fromToken}${cert}`,
      tr: `${fromToken} ile ${amt}g ${token} satın alındı${cert}`,
      de: `${amt}g ${token} mit ${fromToken} gekauft${cert}`,
      fr: `${amt}g ${token} acheté avec ${fromToken}${cert}`,
      ar: `تم شراء ${amt}غ ${token} بـ ${fromToken}${cert}`,
      ru: `Куплено ${amt}г ${token} за ${fromToken}${cert}`,
    },
    sell: {
      en: `Sold ${amt}g ${fromToken} for ${toToken}`,
      tr: `${amt}g ${fromToken} satıldı, ${toToken} alındı`,
      de: `${amt}g ${fromToken} für ${toToken} verkauft`,
      fr: `${amt}g ${fromToken} vendu pour ${toToken}`,
      ar: `تم بيع ${amt}غ ${fromToken} مقابل ${toToken}`,
      ru: `Продано ${amt}г ${fromToken} за ${toToken}`,
    },
    swap: {
      en: `Swapped ${fromToken} for ${amt}g ${toToken}${cert}`,
      tr: `${fromToken} ile ${amt}g ${toToken} takas edildi${cert}`,
      de: `${fromToken} gegen ${amt}g ${toToken} getauscht${cert}`,
      fr: `${fromToken} échangé contre ${amt}g ${toToken}${cert}`,
      ar: `تم تبادل ${fromToken} بـ ${amt}غ ${toToken}${cert}`,
      ru: `Обмен ${fromToken} на ${amt}г ${toToken}${cert}`,
    },
    deposit: {
      en: `${amt} ${token} deposit confirmed`,
      tr: `${amt} ${token} yatırımı onaylandı`,
      de: `${amt} ${token} Einzahlung bestätigt`,
      fr: `Dépôt de ${amt} ${token} confirmé`,
      ar: `تم تأكيد إيداع ${amt} ${token}`,
      ru: `Депозит ${amt} ${token} подтверждён`,
    },
    withdrawal: {
      en: `Withdrawal of ${amt} ${token} initiated${toAddress ? ` to ${truncateAddress(toAddress)}` : ''}`,
      tr: `${amt} ${token} çekim başlatıldı${toAddress ? ` → ${truncateAddress(toAddress)}` : ''}`,
      de: `Auszahlung von ${amt} ${token} eingeleitet${toAddress ? ` an ${truncateAddress(toAddress)}` : ''}`,
      fr: `Retrait de ${amt} ${token} initié${toAddress ? ` vers ${truncateAddress(toAddress)}` : ''}`,
      ar: `تم بدء سحب ${amt} ${token}${toAddress ? ` إلى ${truncateAddress(toAddress)}` : ''}`,
      ru: `Вывод ${amt} ${token} инициирован${toAddress ? ` на ${truncateAddress(toAddress)}` : ''}`,
    },
    transfer: {
      en: `Sent ${amt} ${token} to ${truncateAddress(toAddress || '')}`,
      tr: `${amt} ${token} gönderildi → ${truncateAddress(toAddress || '')}`,
      de: `${amt} ${token} an ${truncateAddress(toAddress || '')} gesendet`,
      fr: `${amt} ${token} envoyé à ${truncateAddress(toAddress || '')}`,
      ar: `تم إرسال ${amt} ${token} إلى ${truncateAddress(toAddress || '')}`,
      ru: `Отправлено ${amt} ${token} на ${truncateAddress(toAddress || '')}`,
    },
    receive: {
      en: `Received ${amt} ${token} from ${truncateAddress(fromAddress || '')}`,
      tr: `${amt} ${token} alındı ← ${truncateAddress(fromAddress || '')}`,
      de: `${amt} ${token} von ${truncateAddress(fromAddress || '')} erhalten`,
      fr: `${amt} ${token} reçu de ${truncateAddress(fromAddress || '')}`,
      ar: `تم استلام ${amt} ${token} من ${truncateAddress(fromAddress || '')}`,
      ru: `Получено ${amt} ${token} от ${truncateAddress(fromAddress || '')}`,
    },
    stake: {
      en: `Staked ${amt}g ${token}${apy ? ` at ${apy}% APY` : ''}${duration ? ` for ${duration}` : ''}`,
      tr: `${amt}g ${token} stake edildi${apy ? ` %${apy} APY` : ''}${duration ? ` ${duration}` : ''}`,
      de: `${amt}g ${token} gestaked${apy ? ` mit ${apy}% APY` : ''}${duration ? ` für ${duration}` : ''}`,
      fr: `${amt}g ${token} staké${apy ? ` à ${apy}% APY` : ''}${duration ? ` pour ${duration}` : ''}`,
      ar: `تم تخزين ${amt}غ ${token}${apy ? ` بنسبة ${apy}% APY` : ''}${duration ? ` لمدة ${duration}` : ''}`,
      ru: `Стейкинг ${amt}г ${token}${apy ? ` под ${apy}% APY` : ''}${duration ? ` на ${duration}` : ''}`,
    },
    metal_conversion: {
      en: `Converted ${fromToken} to ${amt}g ${toToken}${cert}`,
      tr: `${fromToken} → ${amt}g ${toToken} dönüştürüldü${cert}`,
      de: `${fromToken} in ${amt}g ${toToken} umgewandelt${cert}`,
      fr: `${fromToken} converti en ${amt}g ${toToken}${cert}`,
      ar: `تم تحويل ${fromToken} إلى ${amt}غ ${toToken}${cert}`,
      ru: `Конвертация ${fromToken} в ${amt}г ${toToken}${cert}`,
    },
  };

  return bodies[type]?.[lang] || bodies[type]?.en || `${amt} ${token}`;
}

/**
 * Rich transaction push notification — multilingual, detailed body, non-blocking
 */
export async function notifyTransactionRich(
  walletAddress: string,
  data: {
    type: 'buy' | 'sell' | 'swap' | 'deposit' | 'withdrawal' | 'transfer' | 'receive' | 'metal_conversion' | 'stake';
    amount: number;
    token: string;
    fromToken?: string;
    toToken?: string;
    toAddress?: string;
    fromAddress?: string;
    certificateNumber?: string;
    apy?: string;
    duration?: string;
    txHash?: string;
    channel?: 'trades' | 'default' | 'security';
  }
): Promise<void> {
  const lang = getLang(await getUserLanguage(walletAddress));
  const title = richTitles[data.type]?.[lang] || richTitles[data.type]?.en || transactionFallbackTitle[lang];
  const body = buildRichBody(data.type, lang, data);
  const channelId = data.channel || (
    ['buy', 'sell', 'swap', 'metal_conversion'].includes(data.type) ? 'trades' : 'default'
  );

  await sendNotification(walletAddress, 'transaction', {
    title,
    body,
    icon: '/icons/icon-192x192.png',
    tag: `tx-${data.txHash || Date.now()}`,
    data: {
      type: 'transaction',
      txType: data.type,
      txHash: data.txHash,
      token: data.token,
      amount: data.amount,
    },
  });
}

// ─── Welcome Gold Notifications ─────────────────────────────────────────

const welcomeGoldTitles: Record<string, Record<LangCode, string>> = {
  unlocked: {
    en: '🏆 Gold Unlocked!',
    tr: '🏆 Altın Açıldı!',
    de: '🏆 Gold freigeschaltet!',
    fr: '🏆 Or débloqué !',
    ar: '🏆 تم فتح الذهب!',
    ru: '🏆 Золото разблокировано!',
  },
  reminder: {
    en: '🪙 Your Gold Is Waiting',
    tr: '🪙 Altınınız Bekliyor',
    de: '🪙 Ihr Gold wartet',
    fr: '🪙 Votre Or vous attend',
    ar: '🪙 ذهبك في انتظارك',
    ru: '🪙 Ваше золото ждёт',
  },
  activate: {
    en: '✨ Activate Your Gold',
    tr: '✨ Altınınızı Aktive Edin',
    de: '✨ Aktivieren Sie Ihr Gold',
    fr: '✨ Activez votre Or',
    ar: '✨ فعّل ذهبك',
    ru: '✨ Активируйте золото',
  },
};

const welcomeGoldBodies: Record<string, Record<LangCode, string>> = {
  unlocked: {
    en: '5 AUXG Welcome Gold has been added to your vault. Complete KYC to activate full access.',
    tr: '5 AUXG Hoş Geldin Altını kasanıza eklendi. Tam erişim için KYC doğrulamasını tamamlayın.',
    de: '5 AUXG Willkommensgold wurde Ihrem Tresor hinzugefügt. Schließen Sie KYC ab, um vollen Zugang zu erhalten.',
    fr: '5 AUXG d\'Or de Bienvenue ont été ajoutés à votre coffre. Complétez le KYC pour un accès complet.',
    ar: 'تمت إضافة 5 AUXG ذهب ترحيب إلى خزنتك. أكمل KYC للوصول الكامل.',
    ru: '5 AUXG приветственного золота добавлено в ваше хранилище. Пройдите KYC для полного доступа.',
  },
  reminder: {
    en: 'Complete a demo trade to unlock 5g of Welcome Gold in your vault.',
    tr: 'Kasanızda 5g Hoş Geldin Altını açmak için demo işlem yapın.',
    de: 'Führen Sie einen Demo-Trade durch, um 5g Willkommensgold freizuschalten.',
    fr: 'Effectuez une transaction démo pour débloquer 5g d\'Or de Bienvenue.',
    ar: 'قم بتداول تجريبي لفتح 5غ من ذهب الترحيب في خزنتك.',
    ru: 'Совершите демо-сделку, чтобы разблокировать 5г приветственного золота.',
  },
  activate: {
    en: 'Verify your account to unlock full access to your 5 AUXG Welcome Gold.',
    tr: 'Hesabınızı doğrulayarak 5 AUXG Hoş Geldin Altınınıza tam erişim sağlayın.',
    de: 'Verifizieren Sie Ihr Konto, um vollen Zugang zu Ihren 5 AUXG zu erhalten.',
    fr: 'Vérifiez votre compte pour débloquer l\'accès complet à vos 5 AUXG.',
    ar: 'تحقق من حسابك لفتح الوصول الكامل إلى 5 AUXG ذهب الترحيب.',
    ru: 'Подтвердите аккаунт для полного доступа к 5 AUXG приветственного золота.',
  },
};

/**
 * Welcome Gold push notification — multilingual
 */
export async function notifyWelcomeGold(
  walletAddress: string,
  stage: 'unlocked' | 'reminder' | 'activate',
): Promise<void> {
  const lang = getLang(await getUserLanguage(walletAddress));

  await sendNotification(walletAddress, 'system', {
    title: welcomeGoldTitles[stage]?.[lang] || welcomeGoldTitles[stage]?.en || 'Welcome Gold',
    body: welcomeGoldBodies[stage]?.[lang] || welcomeGoldBodies[stage]?.en || '',
    icon: '/icons/icon-192x192.png',
    tag: `welcome-gold-${stage}-${Date.now()}`,
    data: {
      type: 'welcome_gold',
      stage,
    },
  });
}

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
