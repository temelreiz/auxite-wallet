"use client";

import { useState, useEffect } from "react";

interface PushNotificationSetupProps {
  walletAddress: string;
  lang?: "tr" | "en";
}

export function PushNotificationSetup({ walletAddress, lang = "tr" }: PushNotificationSetupProps) {
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

  const t = {
    title: lang === "tr" ? "Push Bildirimleri" : "Push Notifications",
    subtitle: lang === "tr" 
      ? "Anlık bildirimler alarak işlemlerinizi takip edin" 
      : "Stay updated with instant notifications",
    enabled: lang === "tr" ? "Bildirimler Aktif" : "Notifications Enabled",
    disabled: lang === "tr" ? "Bildirimler Kapalı" : "Notifications Disabled",
    enable: lang === "tr" ? "Bildirimleri Aç" : "Enable Notifications",
    disable: lang === "tr" ? "Bildirimleri Kapat" : "Disable Notifications",
    permissionDenied: lang === "tr" 
      ? "Bildirim izni reddedildi. Tarayıcı ayarlarından izin verin." 
      : "Notification permission denied. Enable in browser settings.",
    preferences: lang === "tr" ? "Bildirim Tercihleri" : "Notification Preferences",
    transactions: lang === "tr" ? "İşlem Bildirimleri" : "Transaction Notifications",
    transactionsDesc: lang === "tr" ? "Alım, satım ve transfer bildirimleri" : "Buy, sell and transfer notifications",
    priceAlerts: lang === "tr" ? "Fiyat Alarmları" : "Price Alerts",
    priceAlertsDesc: lang === "tr" ? "Belirlediğiniz fiyat hedeflerine ulaşıldığında" : "When your price targets are reached",
    security: lang === "tr" ? "Güvenlik Uyarıları" : "Security Alerts",
    securityDesc: lang === "tr" ? "Yeni cihaz girişleri ve güvenlik olayları" : "New device logins and security events",
    marketing: lang === "tr" ? "Kampanyalar" : "Promotions",
    marketingDesc: lang === "tr" ? "Özel teklifler ve yenilikler" : "Special offers and updates",
    testNotification: lang === "tr" ? "Test Bildirimi Gönder" : "Send Test Notification",
  };

  // Check current status
  useEffect(() => {
    if (!walletAddress) return;

    const checkStatus = async () => {
      // Check browser permission
      if ("Notification" in window) {
        setPermission(Notification.permission);
      }

      // Check subscription status
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

  // Subscribe to push notifications
  const handleSubscribe = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        setError(t.permissionDenied);
        setLoading(false);
        return;
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      });

      const subscriptionJson = subscription.toJSON();

      // Send to backend
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
      setSuccess(lang === "tr" ? "Bildirimler aktifleştirildi!" : "Notifications enabled!");
    } catch (err) {
      console.error("Subscribe error:", err);
      setError(lang === "tr" ? "Bildirimler aktifleştirilemedi" : "Failed to enable notifications");
    } finally {
      setLoading(false);
    }
  };

  // Unsubscribe
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
      setSuccess(lang === "tr" ? "Bildirimler kapatıldı" : "Notifications disabled");
    } catch (err) {
      console.error("Unsubscribe error:", err);
      setError(lang === "tr" ? "İşlem başarısız" : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  // Update preferences
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

  // Send test notification
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

  // Helper function
  function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  if (!walletAddress) {
    return (
      <div className="p-6 text-center text-slate-400">
        {lang === "tr" ? "Cüzdan bağlantısı gerekli" : "Wallet connection required"}
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          🔔 {t.title}
        </h3>
        <p className="text-sm text-slate-400 mt-1">{t.subtitle}</p>
      </div>

      {/* Error/Success Messages */}
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

      {/* Status */}
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

      {/* Preferences */}
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

          {/* Test Button */}
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
