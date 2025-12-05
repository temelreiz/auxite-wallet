"use client";

import { useState, useEffect } from "react";

/**
 * Price Alert Component
 * Fiyat uyarısı oluşturma ve yönetim UI
 */

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
  lang: "tr" | "en";
  currentPrices?: Record<string, number>;
}

const t = {
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
    currentPrice: "Current Price",
    difference: "Difference",
    suggestedPrices: "Suggested Targets",
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

export function PriceAlertManager({ walletAddress, lang, currentPrices = {} }: Props) {
  const labels = t[lang];
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [selectedToken, setSelectedToken] = useState("BTC");
  const [targetPrice, setTargetPrice] = useState("");
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [repeat, setRepeat] = useState(false);

  // Uyarıları yükle
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">{labels.title}</h3>
          <p className="text-sm text-slate-400">{labels.subtitle}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
        >
          + {labels.createAlert}
        </button>
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h4 className="font-medium text-white">{labels.activeAlerts}</h4>
          </div>
          <div className="divide-y divide-slate-700">
            {activeAlerts.map((alert) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                currentPrice={getCurrentPrice(alert.token)}
                onDelete={() => handleDelete(alert.id)}
                lang={lang}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other Alerts */}
      {otherAlerts.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h4 className="font-medium text-white">{labels.triggeredAlerts}</h4>
          </div>
          <div className="divide-y divide-slate-700">
            {otherAlerts.map((alert) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                currentPrice={getCurrentPrice(alert.token)}
                onDelete={() => handleDelete(alert.id)}
                onReactivate={() => handleReactivate(alert.id)}
                lang={lang}
              />
            ))}
          </div>
        </div>
      )}

      {/* No Alerts */}
      {alerts.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🔔</div>
          <p className="text-slate-400">{labels.noAlerts}</p>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl w-full max-w-md border border-slate-700">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">{labels.createAlert}</h3>
            </div>

            <div className="p-6 space-y-4">
              {/* Token Selection */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">{labels.token}</label>
                <div className="grid grid-cols-3 gap-2">
                  {TOKENS.map((token) => (
                    <button
                      key={token.symbol}
                      onClick={() => setSelectedToken(token.symbol)}
                      className={`p-3 rounded-xl border transition-colors ${
                        selectedToken === token.symbol
                          ? "border-emerald-500 bg-emerald-500/10"
                          : "border-slate-700 hover:border-slate-600"
                      }`}
                    >
                      <div className="text-xl">{token.icon}</div>
                      <div className="text-sm text-white mt-1">{token.symbol}</div>
                    </button>
                  ))}
                </div>
                {getCurrentPrice(selectedToken) > 0 && (
                  <p className="text-sm text-slate-500 mt-2">
                    {labels.currentPrice}: ${getCurrentPrice(selectedToken).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Direction */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">{labels.direction}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setDirection("above")}
                    className={`p-3 rounded-xl border transition-colors ${
                      direction === "above"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                        : "border-slate-700 text-slate-400 hover:border-slate-600"
                    }`}
                  >
                    📈 {labels.above}
                  </button>
                  <button
                    onClick={() => setDirection("below")}
                    className={`p-3 rounded-xl border transition-colors ${
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
                <label className="text-sm text-slate-400 mb-2 block">{labels.targetPrice}</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Suggested Prices */}
                {getCurrentPrice(selectedToken) > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-slate-500 mb-1">{labels.suggestedPrices}:</p>
                    <div className="flex flex-wrap gap-1">
                      {getSuggestedTargets(selectedToken, direction).map((price) => (
                        <button
                          key={price}
                          onClick={() => setTargetPrice(price.toString())}
                          className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 rounded"
                        >
                          ${price.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Repeat Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                <span className="text-slate-300">{labels.repeat}</span>
                <button
                  onClick={() => setRepeat(!repeat)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    repeat ? "bg-emerald-500" : "bg-slate-600"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      repeat ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="p-6 border-t border-slate-700 flex gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
              >
                {labels.cancel}
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !targetPrice}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors disabled:opacity-50"
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

// Alert Row Component
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
  lang: "tr" | "en";
}) {
  const labels = t[lang];
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
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        <div className="text-2xl">{token?.icon || "🪙"}</div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">{alert.token}</span>
            <span className={`text-sm ${alert.direction === "above" ? "text-emerald-400" : "text-red-400"}`}>
              {alert.direction === "above" ? "▲" : "▼"} ${alert.targetPrice.toLocaleString()}
            </span>
            {alert.repeat && <span className="text-xs text-slate-500">🔄</span>}
          </div>
          <div className="text-sm text-slate-500">
            {currentPrice > 0 && (
              <span>
                {labels.currentPrice}: ${currentPrice.toLocaleString()} ({diff > 0 ? "+" : ""}
                {diff.toFixed(1)}%)
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className={`px-2 py-1 rounded text-xs ${statusColors[alert.status]}`}>
          {labels[alert.status] || alert.status}
        </span>
        {alert.status !== "active" && onReactivate && (
          <button
            onClick={onReactivate}
            className="text-sm text-emerald-400 hover:text-emerald-300"
          >
            {labels.reactivate}
          </button>
        )}
        <button onClick={onDelete} className="text-sm text-red-400 hover:text-red-300">
          {labels.delete}
        </button>
      </div>
    </div>
  );
}
