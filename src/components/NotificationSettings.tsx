"use client";

import { useState, useEffect } from "react";
import { usePushNotification } from "@/hooks/usePushNotification";
import { useLanguage } from "@/components/LanguageContext";

/**
 * Notification Settings Component
 * Push bildirim ayarları
 */

interface Props {
  walletAddress: string;
}

interface NotificationPreferences {
  enabled: boolean;
  transactions: boolean;
  priceAlerts: boolean;
  security: boolean;
  marketing: boolean;
}

const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "Bildirim Ayarları",
    subtitle: "Push bildirimlerini yönetin",
    pushNotifications: "Push Bildirimleri",
    enablePush: "Bildirimleri Aktifleştir",
    disablePush: "Bildirimleri Kapat",
    notSupported: "Tarayıcınız bildirimleri desteklemiyor",
    permissionDenied: "Bildirim izni verilmedi. Tarayıcı ayarlarından izin verin.",
    categories: "Bildirim Kategorileri",
    transactions: "İşlem Bildirimleri",
    transactionsDesc: "Yatırma, çekme ve transfer bildirimleri",
    priceAlerts: "Fiyat Uyarıları",
    priceAlertsDesc: "Belirlediğiniz fiyat hedeflerine ulaşıldığında",
    security: "Güvenlik Bildirimleri",
    securityDesc: "Yeni giriş, cihaz ve güvenlik uyarıları",
    marketing: "Promosyon Bildirimleri",
    marketingDesc: "Kampanya ve fırsat bildirimleri",
    enabled: "Açık",
    disabled: "Kapalı",
    testNotification: "Test Bildirimi Gönder",
    testSent: "Test bildirimi gönderildi",
  },
  en: {
    title: "Notification Settings",
    subtitle: "Manage push notifications",
    pushNotifications: "Push Notifications",
    enablePush: "Enable Notifications",
    disablePush: "Disable Notifications",
    notSupported: "Your browser doesn't support notifications",
    permissionDenied: "Notification permission denied. Enable in browser settings.",
    categories: "Notification Categories",
    transactions: "Transaction Notifications",
    transactionsDesc: "Deposit, withdrawal and transfer notifications",
    priceAlerts: "Price Alerts",
    priceAlertsDesc: "When your price targets are reached",
    security: "Security Notifications",
    securityDesc: "New login, device and security alerts",
    marketing: "Promotional Notifications",
    marketingDesc: "Campaign and offer notifications",
    enabled: "On",
    disabled: "Off",
    testNotification: "Send Test Notification",
    testSent: "Test notification sent",
  },
  de: {
    title: "Benachrichtigungseinstellungen",
    subtitle: "Push-Benachrichtigungen verwalten",
    pushNotifications: "Push-Benachrichtigungen",
    enablePush: "Benachrichtigungen aktivieren",
    disablePush: "Benachrichtigungen deaktivieren",
    notSupported: "Ihr Browser unterstützt keine Benachrichtigungen",
    permissionDenied: "Benachrichtigungsberechtigung verweigert. In den Browsereinstellungen aktivieren.",
    categories: "Benachrichtigungskategorien",
    transactions: "Transaktionsbenachrichtigungen",
    transactionsDesc: "Einzahlungs-, Auszahlungs- und Überweisungsbenachrichtigungen",
    priceAlerts: "Preisalarme",
    priceAlertsDesc: "Wenn Ihre Preisziele erreicht werden",
    security: "Sicherheitsbenachrichtigungen",
    securityDesc: "Neue Anmeldungen, Geräte- und Sicherheitswarnungen",
    marketing: "Werbebenachrichtigungen",
    marketingDesc: "Kampagnen- und Angebotsbenachrichtigungen",
    enabled: "An",
    disabled: "Aus",
    testNotification: "Testbenachrichtigung senden",
    testSent: "Testbenachrichtigung gesendet",
  },
  fr: {
    title: "Paramètres de notifications",
    subtitle: "Gérer les notifications push",
    pushNotifications: "Notifications Push",
    enablePush: "Activer les notifications",
    disablePush: "Désactiver les notifications",
    notSupported: "Votre navigateur ne prend pas en charge les notifications",
    permissionDenied: "Permission de notification refusée. Activez dans les paramètres du navigateur.",
    categories: "Catégories de notifications",
    transactions: "Notifications de transactions",
    transactionsDesc: "Notifications de dépôt, retrait et transfert",
    priceAlerts: "Alertes de prix",
    priceAlertsDesc: "Lorsque vos objectifs de prix sont atteints",
    security: "Notifications de sécurité",
    securityDesc: "Nouvelles connexions, appareils et alertes de sécurité",
    marketing: "Notifications promotionnelles",
    marketingDesc: "Notifications de campagnes et offres",
    enabled: "Activé",
    disabled: "Désactivé",
    testNotification: "Envoyer une notification test",
    testSent: "Notification test envoyée",
  },
  ar: {
    title: "إعدادات الإشعارات",
    subtitle: "إدارة إشعارات الدفع",
    pushNotifications: "إشعارات الدفع",
    enablePush: "تفعيل الإشعارات",
    disablePush: "تعطيل الإشعارات",
    notSupported: "متصفحك لا يدعم الإشعارات",
    permissionDenied: "تم رفض إذن الإشعارات. قم بالتفعيل من إعدادات المتصفح.",
    categories: "فئات الإشعارات",
    transactions: "إشعارات المعاملات",
    transactionsDesc: "إشعارات الإيداع والسحب والتحويل",
    priceAlerts: "تنبيهات الأسعار",
    priceAlertsDesc: "عند الوصول إلى أهداف السعر المحددة",
    security: "إشعارات الأمان",
    securityDesc: "تسجيلات الدخول الجديدة وتنبيهات الأجهزة والأمان",
    marketing: "إشعارات ترويجية",
    marketingDesc: "إشعارات الحملات والعروض",
    enabled: "مفعّل",
    disabled: "معطّل",
    testNotification: "إرسال إشعار تجريبي",
    testSent: "تم إرسال الإشعار التجريبي",
  },
  ru: {
    title: "Настройки уведомлений",
    subtitle: "Управление push-уведомлениями",
    pushNotifications: "Push-уведомления",
    enablePush: "Включить уведомления",
    disablePush: "Отключить уведомления",
    notSupported: "Ваш браузер не поддерживает уведомления",
    permissionDenied: "Разрешение на уведомления отклонено. Включите в настройках браузера.",
    categories: "Категории уведомлений",
    transactions: "Уведомления о транзакциях",
    transactionsDesc: "Уведомления о пополнении, выводе и переводах",
    priceAlerts: "Ценовые оповещения",
    priceAlertsDesc: "Когда ваши ценовые цели достигнуты",
    security: "Уведомления безопасности",
    securityDesc: "Новые входы, устройства и оповещения безопасности",
    marketing: "Рекламные уведомления",
    marketingDesc: "Уведомления о кампаниях и предложениях",
    enabled: "Вкл",
    disabled: "Выкл",
    testNotification: "Отправить тестовое уведомление",
    testSent: "Тестовое уведомление отправлено",
  },
};

export function NotificationSettings({ walletAddress }: Props) {
  const { lang } = useLanguage();
  const t = (key: string) =>
    (translations as any)[lang]?.[key] || (translations as any).en[key] || key;
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading: pushLoading,
    error: pushError,
    subscribe,
    unsubscribe,
  } = usePushNotification();

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enabled: true,
    transactions: true,
    priceAlerts: true,
    security: true,
    marketing: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testSent, setTestSent] = useState(false);

  // Tercihleri yükle
  useEffect(() => {
    async function loadPreferences() {
      try {
        const res = await fetch("/api/notifications/subscribe", {
          headers: { "x-wallet-address": walletAddress },
        });
        const data = await res.json();
        if (data.preferences) {
          setPreferences(data.preferences);
        }
      } catch (error) {
        console.error("Load preferences error:", error);
      } finally {
        setLoading(false);
      }
    }

    if (walletAddress) {
      loadPreferences();
    }
  }, [walletAddress]);

  // Tercih güncelle
  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    setSaving(true);
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
    } catch (error) {
      console.error("Update preference error:", error);
      // Revert on error
      setPreferences(preferences);
    } finally {
      setSaving(false);
    }
  };

  // Push toggle
  const handlePushToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  // Test bildirimi
  const sendTestNotification = async () => {
    try {
      await fetch("/api/notifications/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
      });
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
    } catch (error) {
      console.error("Test notification error:", error);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-20 bg-slate-800 rounded-xl" />
        <div className="h-40 bg-slate-800 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-white">{t("title")}</h3>
        <p className="text-sm text-slate-400">{t("subtitle")}</p>
      </div>

      {/* Push Notifications Toggle */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#2F6F62]/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-white">{t("pushNotifications")}</p>
              <p className="text-sm text-slate-400">
                {!isSupported && t("notSupported")}
                {isSupported && permission === "denied" && t("permissionDenied")}
                {isSupported && permission !== "denied" && (isSubscribed ? t("enabled") : t("disabled"))}
              </p>
            </div>
          </div>

          {isSupported && permission !== "denied" && (
            <button
              onClick={handlePushToggle}
              disabled={pushLoading}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isSubscribed
                  ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  : "bg-[#2F6F62] text-white hover:bg-[#2F6F62]"
              } disabled:opacity-50`}
            >
              {pushLoading ? (
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : isSubscribed ? (
                t("disablePush")
              ) : (
                t("enablePush")
              )}
            </button>
          )}
        </div>

        {pushError && (
          <p className="mt-2 text-sm text-red-400">{pushError}</p>
        )}
      </div>

      {/* Categories */}
      {isSubscribed && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h4 className="font-medium text-white">{t("categories")}</h4>
          </div>

          <div className="divide-y divide-slate-700">
            {/* Transactions */}
            <ToggleRow
              icon="💸"
              title={t("transactions")}
              description={t("transactionsDesc")}
              checked={preferences.transactions}
              onChange={(v) => updatePreference("transactions", v)}
              disabled={saving}
            />

            {/* Price Alerts */}
            <ToggleRow
              icon="📈"
              title={t("priceAlerts")}
              description={t("priceAlertsDesc")}
              checked={preferences.priceAlerts}
              onChange={(v) => updatePreference("priceAlerts", v)}
              disabled={saving}
            />

            {/* Security */}
            <ToggleRow
              icon="🔒"
              title={t("security")}
              description={t("securityDesc")}
              checked={preferences.security}
              onChange={(v) => updatePreference("security", v)}
              disabled={saving}
            />

            {/* Marketing */}
            <ToggleRow
              icon="🎁"
              title={t("marketing")}
              description={t("marketingDesc")}
              checked={preferences.marketing}
              onChange={(v) => updatePreference("marketing", v)}
              disabled={saving}
            />
          </div>
        </div>
      )}

      {/* Test Button */}
      {isSubscribed && (
        <button
          onClick={sendTestNotification}
          disabled={testSent}
          className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors disabled:opacity-50"
        >
          {testSent ? `✓ ${t("testSent")}` : t("testNotification")}
        </button>
      )}
    </div>
  );
}

// Toggle Row Component
function ToggleRow({
  icon,
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  icon: string;
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <div>
          <p className="font-medium text-white">{title}</p>
          <p className="text-sm text-slate-400">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          checked ? "bg-[#2F6F62]" : "bg-slate-600"
        } disabled:opacity-50`}
      >
        <div
          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? "left-7" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}
