"use client";

import { useState, useEffect } from "react";

interface PriceAlert {
  id: string;
  token: string;
  targetPrice: number;
  direction: "above" | "below";
  currentPrice?: number;
  status: "active" | "triggered" | "expired" | "cancelled";
  createdAt: string;
  triggeredAt?: string;
  expiresAt?: string;
  repeat: boolean;
}

interface PriceAlertsPanelProps {
  walletAddress: string;
  lang?: "tr" | "en" | "de" | "fr" | "ar" | "ru";
  currentPrices?: Record<string, number>;
}

// Token bilgileri - gerçek ikonlar ile
const TOKENS = [
  { symbol: "AUXG", nameKey: "gold", icon: "/auxg_icon.png", isImage: true, color: "#FFD700" },
  { symbol: "AUXS", nameKey: "silver", icon: "/auxs_icon.png", isImage: true, color: "#C0C0C0" },
  { symbol: "AUXPT", nameKey: "platinum", icon: "/auxpt_icon.png", isImage: true, color: "#E5E4E2" },
  { symbol: "AUXPD", nameKey: "palladium", icon: "/auxpd_icon.png", isImage: true, color: "#CED0DD" },
  { symbol: "BTC", nameKey: "bitcoin", icon: "₿", isImage: false, color: "#F7931A" },
  { symbol: "ETH", nameKey: "ethereum", icon: "Ξ", isImage: false, color: "#627EEA" },
  { symbol: "XRP", nameKey: "ripple", icon: "✕", isImage: false, color: "#23292F" },
  { symbol: "SOL", nameKey: "solana", icon: "◎", isImage: false, color: "#9945FF" },
];

// 6-language translations
const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "Fiyat Alarmları",
    subtitle: "Hedef fiyatlara ulaştığınızda bildirim alın",
    newAlert: "Yeni Alarm",
    noAlerts: "Henüz alarm yok",
    active: "Aktif",
    triggered: "Tetiklendi",
    expired: "Süresi Doldu",
    cancelled: "İptal Edildi",
    token: "Varlık",
    targetPrice: "Hedef Fiyat",
    direction: "Yön",
    above: "Üstüne çıktığında",
    below: "Altına düştüğünde",
    repeat: "Tekrarla",
    repeatDesc: "Tetiklendikten sonra yeniden aktifle",
    expiresIn: "Geçerlilik",
    days: "gün",
    create: "Oluştur",
    cancel: "İptal",
    delete: "Sil",
    currentPrice: "Güncel",
    distance: "Fark",
    walletRequired: "Cüzdan bağlantısı gerekli",
    alertCreated: "Alarm oluşturuldu!",
    validPrice: "Geçerli bir hedef fiyat girin",
    gold: "Altın",
    silver: "Gümüş",
    platinum: "Platin",
    palladium: "Paladyum",
    bitcoin: "Bitcoin",
    ethereum: "Ethereum",
    ripple: "Ripple",
    solana: "Solana",
  },
  en: {
    title: "Price Alerts",
    subtitle: "Get notified when prices reach your targets",
    newAlert: "New Alert",
    noAlerts: "No alerts yet",
    active: "Active",
    triggered: "Triggered",
    expired: "Expired",
    cancelled: "Cancelled",
    token: "Asset",
    targetPrice: "Target Price",
    direction: "Direction",
    above: "Goes above",
    below: "Drops below",
    repeat: "Repeat",
    repeatDesc: "Reactivate after triggered",
    expiresIn: "Expires in",
    days: "days",
    create: "Create",
    cancel: "Cancel",
    delete: "Delete",
    currentPrice: "Current",
    distance: "Distance",
    walletRequired: "Wallet connection required",
    alertCreated: "Alert created!",
    validPrice: "Enter a valid target price",
    gold: "Gold",
    silver: "Silver",
    platinum: "Platinum",
    palladium: "Palladium",
    bitcoin: "Bitcoin",
    ethereum: "Ethereum",
    ripple: "Ripple",
    solana: "Solana",
  },
  de: {
    title: "Preisalarme",
    subtitle: "Werden Sie benachrichtigt, wenn Preise Ihre Ziele erreichen",
    newAlert: "Neuer Alarm",
    noAlerts: "Noch keine Alarme",
    active: "Aktiv",
    triggered: "Ausgelöst",
    expired: "Abgelaufen",
    cancelled: "Abgebrochen",
    token: "Vermögenswert",
    targetPrice: "Zielpreis",
    direction: "Richtung",
    above: "Steigt über",
    below: "Fällt unter",
    repeat: "Wiederholen",
    repeatDesc: "Nach Auslösung erneut aktivieren",
    expiresIn: "Gültig für",
    days: "Tage",
    create: "Erstellen",
    cancel: "Abbrechen",
    delete: "Löschen",
    currentPrice: "Aktuell",
    distance: "Abstand",
    walletRequired: "Wallet-Verbindung erforderlich",
    alertCreated: "Alarm erstellt!",
    validPrice: "Geben Sie einen gültigen Zielpreis ein",
    gold: "Gold",
    silver: "Silber",
    platinum: "Platin",
    palladium: "Palladium",
    bitcoin: "Bitcoin",
    ethereum: "Ethereum",
    ripple: "Ripple",
    solana: "Solana",
  },
  fr: {
    title: "Alertes de Prix",
    subtitle: "Soyez notifié quand les prix atteignent vos objectifs",
    newAlert: "Nouvelle Alerte",
    noAlerts: "Aucune alerte pour le moment",
    active: "Actif",
    triggered: "Déclenché",
    expired: "Expiré",
    cancelled: "Annulé",
    token: "Actif",
    targetPrice: "Prix Cible",
    direction: "Direction",
    above: "Monte au-dessus",
    below: "Descend en-dessous",
    repeat: "Répéter",
    repeatDesc: "Réactiver après déclenchement",
    expiresIn: "Expire dans",
    days: "jours",
    create: "Créer",
    cancel: "Annuler",
    delete: "Supprimer",
    currentPrice: "Actuel",
    distance: "Distance",
    walletRequired: "Connexion wallet requise",
    alertCreated: "Alerte créée!",
    validPrice: "Entrez un prix cible valide",
    gold: "Or",
    silver: "Argent",
    platinum: "Platine",
    palladium: "Palladium",
    bitcoin: "Bitcoin",
    ethereum: "Ethereum",
    ripple: "Ripple",
    solana: "Solana",
  },
  ar: {
    title: "تنبيهات الأسعار",
    subtitle: "احصل على إشعار عندما تصل الأسعار إلى أهدافك",
    newAlert: "تنبيه جديد",
    noAlerts: "لا توجد تنبيهات بعد",
    active: "نشط",
    triggered: "تم التفعيل",
    expired: "منتهي الصلاحية",
    cancelled: "ملغى",
    token: "الأصل",
    targetPrice: "السعر المستهدف",
    direction: "الاتجاه",
    above: "يرتفع فوق",
    below: "ينخفض تحت",
    repeat: "تكرار",
    repeatDesc: "إعادة التفعيل بعد التشغيل",
    expiresIn: "ينتهي في",
    days: "أيام",
    create: "إنشاء",
    cancel: "إلغاء",
    delete: "حذف",
    currentPrice: "الحالي",
    distance: "المسافة",
    walletRequired: "اتصال المحفظة مطلوب",
    alertCreated: "تم إنشاء التنبيه!",
    validPrice: "أدخل سعراً مستهدفاً صالحاً",
    gold: "ذهب",
    silver: "فضة",
    platinum: "بلاتين",
    palladium: "بالاديوم",
    bitcoin: "بيتكوين",
    ethereum: "إيثريوم",
    ripple: "ريبل",
    solana: "سولانا",
  },
  ru: {
    title: "Ценовые Оповещения",
    subtitle: "Получайте уведомления, когда цены достигают ваших целей",
    newAlert: "Новое Оповещение",
    noAlerts: "Оповещений пока нет",
    active: "Активно",
    triggered: "Сработало",
    expired: "Истекло",
    cancelled: "Отменено",
    token: "Актив",
    targetPrice: "Целевая Цена",
    direction: "Направление",
    above: "Поднимется выше",
    below: "Опустится ниже",
    repeat: "Повторить",
    repeatDesc: "Повторно активировать после срабатывания",
    expiresIn: "Истекает через",
    days: "дней",
    create: "Создать",
    cancel: "Отмена",
    delete: "Удалить",
    currentPrice: "Текущая",
    distance: "Расстояние",
    walletRequired: "Требуется подключение кошелька",
    alertCreated: "Оповещение создано!",
    validPrice: "Введите допустимую целевую цену",
    gold: "Золото",
    silver: "Серебро",
    platinum: "Платина",
    palladium: "Палладий",
    bitcoin: "Биткоин",
    ethereum: "Эфириум",
    ripple: "Рипл",
    solana: "Солана",
  },
};

export function PriceAlertsPanel({ walletAddress, lang = "tr", currentPrices = {} }: PriceAlertsPanelProps) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [selectedToken, setSelectedToken] = useState("AUXG");
  const [targetPrice, setTargetPrice] = useState("");
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [repeat, setRepeat] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState(30);

  const t = translations[lang] || translations.en;

  // Render token icon
  const renderTokenIcon = (token: typeof TOKENS[0], size: "sm" | "md" | "lg" = "md") => {
    const sizeClass = size === "sm" ? "w-6 h-6" : size === "lg" ? "w-10 h-10" : "w-8 h-8";
    const textSize = size === "sm" ? "text-sm" : size === "lg" ? "text-xl" : "text-lg";
    
    if (token.isImage) {
      return <img src={token.icon} alt={token.symbol} className={sizeClass} />;
    }
    return (
      <div 
        className={`${sizeClass} rounded-full flex items-center justify-center text-white font-bold ${textSize}`}
        style={{ backgroundColor: token.color }}
      >
        {token.icon}
      </div>
    );
  };

  // Fetch alerts
  useEffect(() => {
    if (!walletAddress) return;
    fetchAlerts();
  }, [walletAddress]);

  const fetchAlerts = async () => {
    try {
      const res = await fetch("/api/alerts", {
        headers: { "x-wallet-address": walletAddress },
      });
      const data = await res.json();
      setAlerts(data.alerts || []);
    } catch (err) {
      console.error("Fetch alerts error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Create alert
  const handleCreate = async () => {
    if (!targetPrice || parseFloat(targetPrice) <= 0) {
      setError(t.validPrice);
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({
          token: selectedToken,
          targetPrice: parseFloat(targetPrice),
          direction,
          repeat,
          expiresInDays,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create alert");
      }

      setSuccess(t.alertCreated);
      setShowForm(false);
      setTargetPrice("");
      fetchAlerts();

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  // Delete alert
  const handleDelete = async (alertId: string) => {
    try {
      await fetch(`/api/alerts?id=${alertId}`, {
        method: "DELETE",
        headers: { "x-wallet-address": walletAddress },
      });
      fetchAlerts();
    } catch (err) {
      console.error("Delete alert error:", err);
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-[#2F6F62]/20 text-[#2F6F62] dark:text-[#2F6F62]";
      case "triggered": return "bg-blue-500/20 text-blue-600 dark:text-blue-400";
      case "expired": return "bg-slate-500/20 text-slate-600 dark:text-slate-400";
      case "cancelled": return "bg-red-500/20 text-red-600 dark:text-red-400";
      default: return "bg-slate-500/20 text-slate-600 dark:text-slate-400";
    }
  };

  // Get status text
  const getStatusText = (status: string) => {
    switch (status) {
      case "active": return t.active;
      case "triggered": return t.triggered;
      case "expired": return t.expired;
      case "cancelled": return t.cancelled;
      default: return status;
    }
  };

  // Calculate distance
  const calculateDistance = (alert: PriceAlert) => {
    const current = currentPrices[alert.token.toLowerCase()] || alert.currentPrice;
    if (!current) return null;
    const diff = ((alert.targetPrice - current) / current) * 100;
    return diff;
  };

  if (!walletAddress) {
    return (
      <div className="p-4 sm:p-6 text-center text-slate-600 dark:text-slate-400 text-sm">
        {t.walletRequired}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg sm:rounded-xl border border-stone-200 dark:border-slate-800 shadow-sm dark:shadow-none p-3 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-6">
        <div className="min-w-0">
          <h3 className="text-sm sm:text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-1.5 sm:gap-2">
            🔔 {t.title}
          </h3>
          <p className="text-[10px] sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1 truncate">{t.subtitle}</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-[#2F6F62] text-white rounded-lg hover:bg-[#2F6F62] text-[10px] sm:text-sm font-medium flex-shrink-0 ml-2"
          >
            + {t.newAlert}
          </button>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-600 dark:text-red-400 text-xs sm:text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-[#2F6F62]/20 border border-[#2F6F62]/50 rounded-lg text-[#2F6F62] dark:text-[#2F6F62] text-xs sm:text-sm">
          {success}
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-stone-50 dark:bg-slate-800/50 rounded-lg sm:rounded-xl border border-stone-200 dark:border-slate-700 space-y-3 sm:space-y-4">
          {/* Token Select */}
          <div>
            <label className="block text-[10px] sm:text-sm text-slate-600 dark:text-slate-400 mb-1.5 sm:mb-2 font-medium">{t.token}</label>
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              {TOKENS.map((token) => (
                <button
                  key={token.symbol}
                  onClick={() => setSelectedToken(token.symbol)}
                  className={`p-2 sm:p-3 rounded-lg border text-center transition-colors flex flex-col items-center gap-0.5 sm:gap-1 ${
                    selectedToken === token.symbol
                      ? "border-[#2F6F62] bg-[#2F6F62]/10"
                      : "border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-stone-400 dark:hover:border-slate-600"
                  }`}
                >
                  {renderTokenIcon(token, "sm")}
                  <p className="text-[9px] sm:text-xs text-slate-600 dark:text-slate-400 mt-0.5 sm:mt-1">{token.symbol}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Target Price */}
          <div>
            <label className="block text-[10px] sm:text-sm text-slate-600 dark:text-slate-400 mb-1.5 sm:mb-2 font-medium">{t.targetPrice} ($)</label>
            <input
              type="number"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-lg sm:rounded-xl text-xs sm:text-base text-slate-800 dark:text-white focus:outline-none focus:border-[#2F6F62]"
            />
            {currentPrices[selectedToken.toLowerCase()] && (
              <p className="text-[9px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t.currentPrice}: ${currentPrices[selectedToken.toLowerCase()]?.toLocaleString()}
              </p>
            )}
          </div>

          {/* Direction */}
          <div>
            <label className="block text-[10px] sm:text-sm text-slate-600 dark:text-slate-400 mb-1.5 sm:mb-2 font-medium">{t.direction}</label>
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
              <button
                onClick={() => setDirection("above")}
                className={`p-2 sm:p-3 rounded-lg border text-[10px] sm:text-sm font-medium transition-colors ${
                  direction === "above"
                    ? "border-[#2F6F62] bg-[#2F6F62]/10 text-[#2F6F62] dark:text-[#2F6F62]"
                    : "border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                📈 {t.above}
              </button>
              <button
                onClick={() => setDirection("below")}
                className={`p-2 sm:p-3 rounded-lg border text-[10px] sm:text-sm font-medium transition-colors ${
                  direction === "below"
                    ? "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400"
                    : "border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                📉 {t.below}
              </button>
            </div>
          </div>

          {/* Expires & Repeat */}
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div>
              <label className="block text-[10px] sm:text-sm text-slate-600 dark:text-slate-400 mb-1.5 sm:mb-2 font-medium">{t.expiresIn}</label>
              <select
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(parseInt(e.target.value))}
                className="w-full px-2 sm:px-4 py-2 sm:py-3 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-lg sm:rounded-xl text-xs sm:text-base text-slate-800 dark:text-white focus:outline-none focus:border-[#2F6F62]"
              >
                <option value={7}>7 {t.days}</option>
                <option value={14}>14 {t.days}</option>
                <option value={30}>30 {t.days}</option>
                <option value={60}>60 {t.days}</option>
                <option value={90}>90 {t.days}</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] sm:text-sm text-slate-600 dark:text-slate-400 mb-1.5 sm:mb-2 font-medium">{t.repeat}</label>
              <button
                onClick={() => setRepeat(!repeat)}
                className={`w-full p-2 sm:p-3 rounded-lg border text-[10px] sm:text-sm font-medium transition-colors ${
                  repeat
                    ? "border-[#2F6F62] bg-[#2F6F62]/10 text-[#2F6F62] dark:text-[#2F6F62]"
                    : "border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                {repeat ? "✅ " : "○ "}{t.repeat}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 sm:gap-3 pt-1 sm:pt-2">
            <button
              onClick={() => {
                setShowForm(false);
                setError("");
              }}
              className="flex-1 py-2 sm:py-3 bg-stone-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg sm:rounded-xl hover:bg-stone-300 dark:hover:bg-slate-600 font-medium text-xs sm:text-base"
            >
              {t.cancel}
            </button>
            <button
              onClick={handleCreate}
              disabled={loading || !targetPrice}
              className="flex-1 py-2 sm:py-3 bg-[#2F6F62] text-white rounded-lg sm:rounded-xl hover:bg-[#2F6F62] disabled:opacity-50 font-medium text-xs sm:text-base"
            >
              {loading ? "..." : t.create}
            </button>
          </div>
        </div>
      )}

      {/* Alerts List */}
      {loading && !showForm ? (
        <div className="flex items-center justify-center py-6 sm:py-8">
          <div className="animate-spin w-6 h-6 sm:w-8 sm:h-8 border-2 border-stone-300 dark:border-slate-600 border-t-[#BFA181] rounded-full"></div>
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-6 sm:py-8 text-slate-500 dark:text-slate-400">
          <p className="text-2xl sm:text-4xl mb-2">🔕</p>
          <p className="text-xs sm:text-base">{t.noAlerts}</p>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {alerts.map((alert) => {
            const token = TOKENS.find(tk => tk.symbol === alert.token);
            const distance = calculateDistance(alert);

            return (
              <div
                key={alert.id}
                className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border ${
                  alert.status === "active"
                    ? "bg-stone-50 dark:bg-slate-800/50 border-stone-200 dark:border-slate-700"
                    : "bg-stone-100/50 dark:bg-slate-800/30 border-stone-200/50 dark:border-slate-700/50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: token?.isImage ? 'transparent' : (token?.color + "20") }}
                    >
                      {token && renderTokenIcon(token, "lg")}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                        <span className="font-medium text-xs sm:text-base text-slate-800 dark:text-white">{alert.token}</span>
                        <span className="text-[9px] sm:text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
                          {token && t[token.nameKey]}
                        </span>
                        <span className={`text-[9px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full ${getStatusColor(alert.status)}`}>
                          {getStatusText(alert.status)}
                        </span>
                      </div>
                      <p className="text-[10px] sm:text-sm text-slate-600 dark:text-slate-400">
                        {alert.direction === "above" ? "📈" : "📉"} ${alert.targetPrice.toLocaleString()}
                        {distance !== null && alert.status === "active" && (
                          <span className={`ml-1 sm:ml-2 ${distance > 0 ? "text-[#2F6F62] dark:text-[#2F6F62]" : "text-red-600 dark:text-red-400"}`}>
                            ({distance > 0 ? "+" : ""}{distance.toFixed(2)}%)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    {alert.repeat && (
                      <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">🔄</span>
                    )}
                    <button
                      onClick={() => handleDelete(alert.id)}
                      className="p-1.5 sm:p-2 hover:bg-red-500/20 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default PriceAlertsPanel;
