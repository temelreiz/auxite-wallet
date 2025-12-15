"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/components/LanguageContext";

interface PushNotificationSetupProps {
  walletAddress: string;
  lang?: string;
}

const translations: Record<string, any> = {
  tr: {
    title: "Push Bildirimleri",
    subtitle: "Anlık bildirimler alarak işlemlerinizi takip edin",
    enabled: "Bildirimler Aktif",
    disabled: "Bildirimler Kapalı",
    enable: "Bildirimleri Aç",
    disable: "Bildirimleri Kapat",
    permissionDenied: "Bildirim izni reddedildi. Tarayıcı ayarlarından izin verin.",
    preferences: "Bildirim Tercihleri",
    transactions: "İşlem Bildirimleri",
    transactionsDesc: "Alım, satım ve transfer bildirimleri",
    priceAlerts: "Fiyat Alarmları",
    priceAlertsDesc: "Belirlediğiniz fiyat hedeflerine ulaşıldığında",
    security: "Güvenlik Uyarıları",
    securityDesc: "Yeni cihaz girişleri ve güvenlik olayları",
    marketing: "Kampanyalar",
    marketingDesc: "Özel teklifler ve yenilikler",
    testNotification: "Test Bildirimi Gönder",
    walletRequired: "Cüzdan bağlantısı gerekli",
    notificationsEnabled: "Bildirimler aktifleştirildi!",
    notificationsDisabled: "Bildirimler kapatıldı",
    operationFailed: "İşlem başarısız",
    enableFailed: "Bildirimler aktifleştirilemedi",
  },
  en: {
    title: "Push Notifications",
    subtitle: "Stay updated with instant notifications",
    enabled: "Notifications Enabled",
    disabled: "Notifications Disabled",
    enable: "Enable Notifications",
    disable: "Disable Notifications",
    permissionDenied: "Notification permission denied. Enable in browser settings.",
    preferences: "Notification Preferences",
    transactions: "Transaction Notifications",
    transactionsDesc: "Buy, sell and transfer notifications",
    priceAlerts: "Price Alerts",
    priceAlertsDesc: "When your price targets are reached",
    security: "Security Alerts",
    securityDesc: "New device logins and security events",
    marketing: "Promotions",
    marketingDesc: "Special offers and updates",
    testNotification: "Send Test Notification",
    walletRequired: "Wallet connection required",
    notificationsEnabled: "Notifications enabled!",
    notificationsDisabled: "Notifications disabled",
    operationFailed: "Operation failed",
    enableFailed: "Failed to enable notifications",
  },
  de: {
    title: "Push-Benachrichtigungen",
    subtitle: "Bleiben Sie mit sofortigen Benachrichtigungen auf dem Laufenden",
    enabled: "Benachrichtigungen Aktiviert",
    disabled: "Benachrichtigungen Deaktiviert",
    enable: "Benachrichtigungen Aktivieren",
    disable: "Benachrichtigungen Deaktivieren",
    permissionDenied: "Benachrichtigungsberechtigung verweigert. In Browsereinstellungen aktivieren.",
    preferences: "Benachrichtigungseinstellungen",
    transactions: "Transaktionsbenachrichtigungen",
    transactionsDesc: "Kauf-, Verkaufs- und Transferbenachrichtigungen",
    priceAlerts: "Preisalarme",
    priceAlertsDesc: "Wenn Ihre Preisziele erreicht werden",
    security: "Sicherheitswarnungen",
    securityDesc: "Neue Geräteanmeldungen und Sicherheitsereignisse",
    marketing: "Aktionen",
    marketingDesc: "Sonderangebote und Updates",
    testNotification: "Testbenachrichtigung Senden",
    walletRequired: "Wallet-Verbindung erforderlich",
    notificationsEnabled: "Benachrichtigungen aktiviert!",
    notificationsDisabled: "Benachrichtigungen deaktiviert",
    operationFailed: "Vorgang fehlgeschlagen",
    enableFailed: "Benachrichtigungen konnten nicht aktiviert werden",
  },
  fr: {
    title: "Notifications Push",
    subtitle: "Restez informé avec des notifications instantanées",
    enabled: "Notifications Activées",
    disabled: "Notifications Désactivées",
    enable: "Activer les Notifications",
    disable: "Désactiver les Notifications",
    permissionDenied: "Permission de notification refusée. Activez dans les paramètres du navigateur.",
    preferences: "Préférences de Notification",
    transactions: "Notifications de Transaction",
    transactionsDesc: "Notifications d'achat, vente et transfert",
    priceAlerts: "Alertes de Prix",
    priceAlertsDesc: "Lorsque vos objectifs de prix sont atteints",
    security: "Alertes de Sécurité",
    securityDesc: "Nouvelles connexions et événements de sécurité",
    marketing: "Promotions",
    marketingDesc: "Offres spéciales et mises à jour",
    testNotification: "Envoyer Notification Test",
    walletRequired: "Connexion wallet requise",
    notificationsEnabled: "Notifications activées!",
    notificationsDisabled: "Notifications désactivées",
    operationFailed: "Opération échouée",
    enableFailed: "Impossible d'activer les notifications",
  },
  ar: {
    title: "إشعارات الدفع",
    subtitle: "ابق على اطلاع مع الإشعارات الفورية",
    enabled: "الإشعارات مفعلة",
    disabled: "الإشعارات معطلة",
    enable: "تفعيل الإشعارات",
    disable: "تعطيل الإشعارات",
    permissionDenied: "تم رفض إذن الإشعارات. فعّل من إعدادات المتصفح.",
    preferences: "تفضيلات الإشعارات",
    transactions: "إشعارات المعاملات",
    transactionsDesc: "إشعارات الشراء والبيع والتحويل",
    priceAlerts: "تنبيهات الأسعار",
    priceAlertsDesc: "عند الوصول لأهداف السعر",
    security: "تنبيهات الأمان",
    securityDesc: "تسجيلات دخول جديدة وأحداث أمنية",
    marketing: "العروض",
    marketingDesc: "عروض خاصة وتحديثات",
    testNotification: "إرسال إشعار تجريبي",
    walletRequired: "يتطلب اتصال المحفظة",
    notificationsEnabled: "تم تفعيل الإشعارات!",
    notificationsDisabled: "تم تعطيل الإشعارات",
    operationFailed: "فشلت العملية",
    enableFailed: "فشل تفعيل الإشعارات",
  },
  ru: {
    title: "Push-уведомления",
    subtitle: "Будьте в курсе с мгновенными уведомлениями",
    enabled: "Уведомления Включены",
    disabled: "Уведомления Отключены",
    enable: "Включить Уведомления",
    disable: "Отключить Уведомления",
    permissionDenied: "Разрешение на уведомления отклонено. Включите в настройках браузера.",
    preferences: "Настройки Уведомлений",
    transactions: "Уведомления о Транзакциях",
    transactionsDesc: "Уведомления о покупке, продаже и переводе",
    priceAlerts: "Ценовые Оповещения",
    priceAlertsDesc: "Когда достигнуты ваши ценовые цели",
    security: "Оповещения Безопасности",
    securityDesc: "Новые входы и события безопасности",
    marketing: "Акции",
    marketingDesc: "Специальные предложения и обновления",
    testNotification: "Отправить Тестовое Уведомление",
    walletRequired: "Требуется подключение кошелька",
    notificationsEnabled: "Уведомления включены!",
    notificationsDisabled: "Уведомления отключены",
    operationFailed: "Операция не удалась",
    enableFailed: "Не удалось включить уведомления",
  },
};

export function PushNotificationSetup({ walletAddress, lang: propLang }: PushNotificationSetupProps) {
  const { lang: contextLang } = useLanguage();
  const lang = propLang || contextLang || "en";
  const t = translations[lang] || translations.en;

  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [preferences, setPreferences] = useState({
    transactions: true,
    priceAlerts: true,
    security: true,
    marketing: false,
  });

  useEffect(() => {
    if (!walletAddress) return;

    const checkStatus = async () => {
      if ("Notification" in window) {
        setPermission(Notification.permission);
      }

      try {
        const res = await fetch("/api/notifications/subscribe", {
          headers: { "x-wallet-address": walletAddress },
        });
        const data = await res.json();
        setIsSubscribed(data.isSubscribed);
        if (data.preferences) {
          setPreferences(data.preferences);
        }
      } catch (err) {
        console.error("Status check error:", err);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, [walletAddress]);

  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const handleSubscribe = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        setError(t.permissionDenied);
        setLoading(false);
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      
      const subscribeOptions: PushSubscriptionOptionsInit = {
        userVisibleOnly: true,
      };
      
      if (vapidKey) {
        subscribeOptions.applicationServerKey = urlBase64ToUint8Array(vapidKey) as BufferSource;
      }

      const subscription = await registration.pushManager.subscribe(subscribeOptions);
      const subscriptionJson = subscription.toJSON();

      const res = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({
          endpoint: subscriptionJson.endpoint,
          keys: subscriptionJson.keys,
        }),
      });

      if (!res.ok) {
        throw new Error("Subscription failed");
      }

      setIsSubscribed(true);
      setSuccess(t.notificationsEnabled);
    } catch (err) {
      console.error("Subscribe error:", err);
      setError(t.enableFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setError("");
    setLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
      }

      await fetch("/api/notifications/subscribe", {
        method: "DELETE",
        headers: { "x-wallet-address": walletAddress },
      });

      setIsSubscribed(false);
      setSuccess(t.notificationsDisabled);
    } catch (err) {
      console.error("Unsubscribe error:", err);
      setError(t.operationFailed);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key: string, value: boolean) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);

    try {
      await fetch("/api/notifications/subscribe", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({ [key]: value }),
      });
    } catch (err) {
      console.error("Update preference error:", err);
    }
  };

  const sendTestNotification = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      registration.showNotification("Auxite Wallet 🎉", {
        body: lang === "tr" ? "Test bildirimi başarılı!" : "Test notification successful!",
        icon: "/icon-192.png",
        badge: "/badge-72.png",
        tag: "test",
      });
    } catch (err) {
      console.error("Test notification error:", err);
    }
  };

  if (!walletAddress) {
    return (
      <div className="p-6 text-center text-slate-400">
        {t.walletRequired}
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          🔔 {t.title}
        </h3>
        <p className="text-sm text-slate-400 mt-1">{t.subtitle}</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-lg text-emerald-400 text-sm">
          {success}
        </div>
      )}

      <div className={`p-4 rounded-xl border mb-6 ${
        isSubscribed 
          ? "bg-emerald-500/10 border-emerald-500/30" 
          : "bg-slate-800 border-slate-700"
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isSubscribed ? "bg-emerald-500/20" : "bg-slate-700"
            }`}>
              {isSubscribed ? "🔔" : "🔕"}
            </div>
            <div>
              <p className={`font-medium ${isSubscribed ? "text-emerald-400" : "text-slate-300"}`}>
                {isSubscribed ? t.enabled : t.disabled}
              </p>
              {permission === "denied" && (
                <p className="text-xs text-red-400">{t.permissionDenied}</p>
              )}
            </div>
          </div>
          
          {isSubscribed ? (
            <button
              onClick={handleUnsubscribe}
              disabled={loading}
              className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 text-sm font-medium disabled:opacity-50"
            >
              {t.disable}
            </button>
          ) : (
            <button
              onClick={handleSubscribe}
              disabled={loading || permission === "denied"}
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 text-sm font-medium disabled:opacity-50"
            >
              {loading ? "..." : t.enable}
            </button>
          )}
        </div>
      </div>

      {isSubscribed && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-slate-400">{t.preferences}</h4>
          
          {[
            { key: "transactions", label: t.transactions, desc: t.transactionsDesc },
            { key: "priceAlerts", label: t.priceAlerts, desc: t.priceAlertsDesc },
            { key: "security", label: t.security, desc: t.securityDesc },
            { key: "marketing", label: t.marketing, desc: t.marketingDesc },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
              <div>
                <p className="text-white text-sm font-medium">{item.label}</p>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>
              <button
                onClick={() => updatePreference(item.key, !preferences[item.key as keyof typeof preferences])}
                className={`w-12 h-6 rounded-full transition-colors ${
                  preferences[item.key as keyof typeof preferences]
                    ? "bg-emerald-500"
                    : "bg-slate-600"
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transform transition-transform ${
                  preferences[item.key as keyof typeof preferences]
                    ? "translate-x-6"
                    : "translate-x-1"
                }`} />
              </button>
            </div>
          ))}

          <button
            onClick={sendTestNotification}
            className="w-full py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 text-sm mt-4"
          >
            🔔 {t.testNotification}
          </button>
        </div>
      )}
    </div>
  );
}

export default PushNotificationSetup;
