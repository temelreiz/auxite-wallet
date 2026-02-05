"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/components/LanguageContext";

interface PriceAlert {
  id: string;
  token: string;
  targetPrice: number;
  direction: "above" | "below";
  status: "active" | "triggered" | "expired" | "cancelled";
  createdAt: string;
  triggeredAt?: string;
  repeat: boolean;
}

interface Props {
  walletAddress: string;
  currentPrices?: Record<string, number>;
}

const localTranslations: Record<string, any> = {
  tr: {
    title: "Fiyat Uyarıları",
    subtitle: "Hedef fiyatlara ulaşıldığında bildirim alın",
    createAlert: "Yeni Uyarı",
    activeAlerts: "Aktif Uyarılar",
    triggeredAlerts: "Tetiklenen Uyarılar",
    noAlerts: "Henüz fiyat uyarısı yok",
    token: "Token",
    targetPrice: "Hedef Fiyat",
    direction: "Yön",
    above: "Üstüne Çıktığında",
    below: "Altına Düştüğünde",
    repeat: "Tekrarlansın",
    create: "Oluştur",
    cancel: "İptal",
    delete: "Sil",
    reactivate: "Yeniden Aktifle",
    active: "Aktif",
    triggered: "Tetiklendi",
    expired: "Süresi Doldu",
    cancelled: "İptal Edildi",
    currentPrice: "Güncel Fiyat",
    difference: "Fark",
    suggestedPrices: "Önerilen Hedefler",
  },
  en: {
    title: "Price Alerts",
    subtitle: "Get notified when target prices are reached",
    createAlert: "New Alert",
    activeAlerts: "Active Alerts",
    triggeredAlerts: "Triggered Alerts",
    noAlerts: "No price alerts yet",
    token: "Token",
    targetPrice: "Target Price",
    direction: "Direction",
    above: "Goes Above",
    below: "Drops Below",
    repeat: "Repeat",
    create: "Create",
    cancel: "Cancel",
    delete: "Delete",
    reactivate: "Reactivate",
    active: "Active",
    triggered: "Triggered",
    expired: "Expired",
    cancelled: "Cancelled",
    currentPrice: "Current Price",
    difference: "Difference",
    suggestedPrices: "Suggested Targets",
  },
  de: {
    title: "Preisbenachrichtigungen",
    subtitle: "Erhalten Sie Benachrichtigungen bei Zielpreisen",
    createAlert: "Neue Benachrichtigung",
    activeAlerts: "Aktive Benachrichtigungen",
    triggeredAlerts: "Ausgelöste Benachrichtigungen",
    noAlerts: "Noch keine Preisbenachrichtigungen",
    token: "Token",
    targetPrice: "Zielpreis",
    direction: "Richtung",
    above: "Steigt über",
    below: "Fällt unter",
    repeat: "Wiederholen",
    create: "Erstellen",
    cancel: "Abbrechen",
    delete: "Löschen",
    reactivate: "Reaktivieren",
    active: "Aktiv",
    triggered: "Ausgelöst",
    expired: "Abgelaufen",
    cancelled: "Abgebrochen",
    currentPrice: "Aktueller Preis",
    difference: "Differenz",
    suggestedPrices: "Vorgeschlagene Ziele",
  },
  fr: {
    title: "Alertes de Prix",
    subtitle: "Soyez notifié lorsque les prix cibles sont atteints",
    createAlert: "Nouvelle Alerte",
    activeAlerts: "Alertes Actives",
    triggeredAlerts: "Alertes Déclenchées",
    noAlerts: "Aucune alerte de prix",
    token: "Token",
    targetPrice: "Prix Cible",
    direction: "Direction",
    above: "Dépasse",
    below: "Descend sous",
    repeat: "Répéter",
    create: "Créer",
    cancel: "Annuler",
    delete: "Supprimer",
    reactivate: "Réactiver",
    active: "Active",
    triggered: "Déclenchée",
    expired: "Expirée",
    cancelled: "Annulée",
    currentPrice: "Prix Actuel",
    difference: "Différence",
    suggestedPrices: "Cibles Suggérées",
  },
  ar: {
    title: "تنبيهات الأسعار",
    subtitle: "احصل على إشعارات عند الوصول للأسعار المستهدفة",
    createAlert: "تنبيه جديد",
    activeAlerts: "التنبيهات النشطة",
    triggeredAlerts: "التنبيهات المُفعّلة",
    noAlerts: "لا توجد تنبيهات أسعار",
    token: "الرمز",
    targetPrice: "السعر المستهدف",
    direction: "الاتجاه",
    above: "يرتفع فوق",
    below: "ينخفض تحت",
    repeat: "تكرار",
    create: "إنشاء",
    cancel: "إلغاء",
    delete: "حذف",
    reactivate: "إعادة تفعيل",
    active: "نشط",
    triggered: "مُفعّل",
    expired: "منتهي",
    cancelled: "ملغى",
    currentPrice: "السعر الحالي",
    difference: "الفرق",
    suggestedPrices: "الأهداف المقترحة",
  },
  ru: {
    title: "Ценовые Оповещения",
    subtitle: "Получайте уведомления при достижении целевых цен",
    createAlert: "Новое Оповещение",
    activeAlerts: "Активные Оповещения",
    triggeredAlerts: "Сработавшие Оповещения",
    noAlerts: "Ценовых оповещений пока нет",
    token: "Токен",
    targetPrice: "Целевая Цена",
    direction: "Направление",
    above: "Поднимается выше",
    below: "Опускается ниже",
    repeat: "Повторять",
    create: "Создать",
    cancel: "Отмена",
    delete: "Удалить",
    reactivate: "Реактивировать",
    active: "Активно",
    triggered: "Сработало",
    expired: "Истекло",
    cancelled: "Отменено",
    currentPrice: "Текущая Цена",
    difference: "Разница",
    suggestedPrices: "Предложенные Цели",
  },
};

const TOKENS = [
  { symbol: "BTC", name: "Bitcoin", icon: "₿" },
  { symbol: "ETH", name: "Ethereum", icon: "Ξ" },
  { symbol: "XRP", name: "Ripple", icon: "✕" },
  { symbol: "SOL", name: "Solana", icon: "◎" },
  { symbol: "AUXG", name: "Gold", icon: "🥇" },
  { symbol: "AUXS", name: "Silver", icon: "🥈" },
];

export function PriceAlertManager({ walletAddress, currentPrices = {} }: Props) {
  const { lang } = useLanguage();
  const effectiveLang = lang || "en";
  const labels = localTranslations[effectiveLang] || localTranslations.en;
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const [selectedToken, setSelectedToken] = useState("BTC");
  const [targetPrice, setTargetPrice] = useState("");
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [repeat, setRepeat] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, [walletAddress]);

  const fetchAlerts = async () => {
    try {
      const res = await fetch("/api/alerts", {
        headers: { "x-wallet-address": walletAddress },
      });
      const data = await res.json();
      setAlerts(data.alerts || []);
    } catch (error) {
      console.error("Fetch alerts error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!targetPrice || parseFloat(targetPrice) <= 0) return;

    setCreating(true);
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
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowCreate(false);
        setTargetPrice("");
        setRepeat(false);
        fetchAlerts();
      }
    } catch (error) {
      console.error("Create alert error:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (alertId: string) => {
    try {
      await fetch(`/api/alerts?id=${alertId}`, {
        method: "DELETE",
        headers: { "x-wallet-address": walletAddress },
      });
      fetchAlerts();
    } catch (error) {
      console.error("Delete alert error:", error);
    }
  };

  const handleReactivate = async (alertId: string) => {
    try {
      await fetch("/api/alerts", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({ alertId, action: "reactivate" }),
      });
      fetchAlerts();
    } catch (error) {
      console.error("Reactivate alert error:", error);
    }
  };

  const getCurrentPrice = (token: string): number => {
    return currentPrices[token] || 0;
  };

  const getSuggestedTargets = (token: string, dir: "above" | "below"): number[] => {
    const current = getCurrentPrice(token);
    if (!current) return [];
    const percentages = [1, 2, 5, 10, 20];
    return percentages.map((pct) => {
      const multiplier = dir === "above" ? 1 + pct / 100 : 1 - pct / 100;
      return Math.round(current * multiplier * 100) / 100;
    });
  };

  const activeAlerts = alerts.filter((a) => a.status === "active");
  const otherAlerts = alerts.filter((a) => a.status !== "active");

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-12 bg-slate-800 rounded-xl" />
        <div className="h-32 bg-slate-800 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
        <div>
          <h3 className="text-sm sm:text-lg font-semibold text-white">{labels.title}</h3>
          <p className="text-[10px] sm:text-sm text-slate-400">{labels.subtitle}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white text-xs sm:text-sm rounded-lg transition-colors touch-manipulation w-full sm:w-auto"
        >
          + {labels.createAlert}
        </button>
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div className="bg-slate-800/50 rounded-lg sm:rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-2.5 sm:p-4 border-b border-slate-700">
            <h4 className="text-xs sm:text-base font-medium text-white">{labels.activeAlerts}</h4>
          </div>
          <div className="divide-y divide-slate-700">
            {activeAlerts.map((alert) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                currentPrice={getCurrentPrice(alert.token)}
                onDelete={() => handleDelete(alert.id)}
                lang={effectiveLang}
              />
            ))}
          </div>
        </div>
      )}

      {/* Triggered/Other Alerts */}
      {otherAlerts.length > 0 && (
        <div className="bg-slate-800/50 rounded-lg sm:rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-2.5 sm:p-4 border-b border-slate-700">
            <h4 className="text-xs sm:text-base font-medium text-white">{labels.triggeredAlerts}</h4>
          </div>
          <div className="divide-y divide-slate-700">
            {otherAlerts.map((alert) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                currentPrice={getCurrentPrice(alert.token)}
                onDelete={() => handleDelete(alert.id)}
                onReactivate={() => handleReactivate(alert.id)}
                lang={effectiveLang}
              />
            ))}
          </div>
        </div>
      )}

      {/* No Alerts */}
      {alerts.length === 0 && (
        <div className="text-center py-6 sm:py-12">
          <div className="text-2xl sm:text-4xl mb-3 sm:mb-4">🔔</div>
          <p className="text-xs sm:text-base text-slate-400">{labels.noAlerts}</p>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-slate-900 rounded-lg sm:rounded-2xl w-full max-w-[calc(100vw-16px)] sm:max-w-md border border-slate-700 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="p-3 sm:p-6 border-b border-slate-700">
              <h3 className="text-sm sm:text-lg font-semibold text-white">{labels.createAlert}</h3>
            </div>

            <div className="p-3 sm:p-6 space-y-3 sm:space-y-4">
              {/* Token Selection */}
              <div>
                <label className="text-[10px] sm:text-sm text-slate-400 mb-1.5 sm:mb-2 block">{labels.token}</label>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  {TOKENS.map((token) => (
                    <button
                      key={token.symbol}
                      onClick={() => setSelectedToken(token.symbol)}
                      className={`p-1.5 sm:p-3 rounded-lg sm:rounded-xl border transition-colors touch-manipulation ${
                        selectedToken === token.symbol
                          ? "border-emerald-500 bg-emerald-500/10"
                          : "border-slate-700 hover:border-slate-600"
                      }`}
                    >
                      <div className="text-base sm:text-xl">{token.icon}</div>
                      <div className="text-[10px] sm:text-sm text-white mt-0.5 sm:mt-1">{token.symbol}</div>
                    </button>
                  ))}
                </div>
                {getCurrentPrice(selectedToken) > 0 && (
                  <p className="text-[10px] sm:text-sm text-slate-500 mt-1.5 sm:mt-2">
                    {labels.currentPrice}: ${getCurrentPrice(selectedToken).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Direction */}
              <div>
                <label className="text-[10px] sm:text-sm text-slate-400 mb-1.5 sm:mb-2 block">{labels.direction}</label>
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                  <button
                    onClick={() => setDirection("above")}
                    className={`p-2 sm:p-3 rounded-lg sm:rounded-xl border transition-colors text-[10px] sm:text-sm touch-manipulation ${
                      direction === "above"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                        : "border-slate-700 text-slate-400 hover:border-slate-600"
                    }`}
                  >
                    📈 {labels.above}
                  </button>
                  <button
                    onClick={() => setDirection("below")}
                    className={`p-2 sm:p-3 rounded-lg sm:rounded-xl border transition-colors text-[10px] sm:text-sm touch-manipulation ${
                      direction === "below"
                        ? "border-red-500 bg-red-500/10 text-red-400"
                        : "border-slate-700 text-slate-400 hover:border-slate-600"
                    }`}
                  >
                    📉 {labels.below}
                  </button>
                </div>
              </div>

              {/* Target Price */}
              <div>
                <label className="text-[10px] sm:text-sm text-slate-400 mb-1.5 sm:mb-2 block">{labels.targetPrice}</label>
                <div className="relative">
                  <span className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-6 sm:pl-8 pr-3 sm:pr-4 py-2 sm:py-3 bg-slate-800 border border-slate-700 rounded-lg sm:rounded-xl text-xs sm:text-base text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {getCurrentPrice(selectedToken) > 0 && (
                  <div className="mt-1.5 sm:mt-2">
                    <p className="text-[9px] sm:text-xs text-slate-500 mb-1">{labels.suggestedPrices}:</p>
                    <div className="flex flex-wrap gap-1">
                      {getSuggestedTargets(selectedToken, direction).map((price) => (
                        <button
                          key={price}
                          onClick={() => setTargetPrice(price.toString())}
                          className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[9px] sm:text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 rounded touch-manipulation"
                        >
                          ${price.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Repeat Toggle */}
              <div className="flex items-center justify-between p-2.5 sm:p-3 bg-slate-800/50 rounded-lg sm:rounded-xl">
                <span className="text-xs sm:text-sm text-slate-300">{labels.repeat}</span>
                <button
                  onClick={() => setRepeat(!repeat)}
                  className={`w-10 sm:w-12 h-5 sm:h-6 rounded-full transition-colors touch-manipulation ${
                    repeat ? "bg-emerald-500" : "bg-slate-600"
                  }`}
                >
                  <div
                    className={`w-3.5 sm:w-4 h-3.5 sm:h-4 rounded-full bg-white transition-transform ${
                      repeat ? "translate-x-5 sm:translate-x-7" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="p-3 sm:p-6 border-t border-slate-700 flex gap-2 sm:gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2 sm:py-3 bg-slate-700 hover:bg-slate-600 text-white text-xs sm:text-base rounded-lg sm:rounded-xl transition-colors touch-manipulation"
              >
                {labels.cancel}
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !targetPrice}
                className="flex-1 py-2 sm:py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-base rounded-lg sm:rounded-xl transition-colors disabled:opacity-50 touch-manipulation"
              >
                {creating ? "..." : labels.create}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AlertRow({
  alert,
  currentPrice,
  onDelete,
  onReactivate,
  lang,
}: {
  alert: PriceAlert;
  currentPrice: number;
  onDelete: () => void;
  onReactivate?: () => void;
  lang: string;
}) {
  const labels = localTranslations[lang] || localTranslations.en;
  const token = TOKENS.find((t) => t.symbol === alert.token);
  const diff = currentPrice
    ? ((alert.targetPrice - currentPrice) / currentPrice) * 100
    : 0;

  const statusColors = {
    active: "text-emerald-400 bg-emerald-500/10",
    triggered: "text-amber-400 bg-amber-500/10",
    expired: "text-slate-500 bg-slate-500/10",
    cancelled: "text-slate-500 bg-slate-500/10",
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 sm:p-4 gap-2 sm:gap-3">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="text-lg sm:text-2xl">{token?.icon || "🪙"}</div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="font-medium text-xs sm:text-base text-white">{alert.token}</span>
            <span className={`text-[10px] sm:text-sm ${alert.direction === "above" ? "text-emerald-400" : "text-red-400"}`}>
              {alert.direction === "above" ? "▲" : "▼"} ${alert.targetPrice.toLocaleString()}
            </span>
            {alert.repeat && <span className="text-[10px] sm:text-xs text-slate-500">🔄</span>}
          </div>
          <div className="text-[10px] sm:text-sm text-slate-500">
            {currentPrice > 0 && (
              <span>
                {labels.currentPrice}: ${currentPrice.toLocaleString()} ({diff > 0 ? "+" : ""}
                {diff.toFixed(1)}%)
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 self-end sm:self-auto">
        <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[9px] sm:text-xs ${statusColors[alert.status]}`}>
          {alert.status === "active" ? labels.active : 
           alert.status === "triggered" ? labels.triggered :
           alert.status === "expired" ? labels.expired :
           alert.status === "cancelled" ? labels.cancelled : alert.status}
        </span>
        {alert.status !== "active" && onReactivate && (
          <button
            onClick={onReactivate}
            className="text-[10px] sm:text-sm text-emerald-400 hover:text-emerald-300 touch-manipulation"
          >
            {labels.reactivate}
          </button>
        )}
        <button 
          onClick={onDelete} 
          className="text-[10px] sm:text-sm text-red-400 hover:text-red-300 touch-manipulation"
        >
          {labels.delete}
        </button>
      </div>
    </div>
  );
}

export default PriceAlertManager;
