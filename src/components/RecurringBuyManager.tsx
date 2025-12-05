"use client";

import { useState, useEffect } from "react";

/**
 * Recurring Buy / DCA Component
 * Otomatik düzenli alım yönetimi
 */

interface RecurringBuy {
  id: string;
  token: string;
  amount: number;
  frequency: "daily" | "weekly" | "biweekly" | "monthly";
  status: "active" | "paused" | "completed" | "cancelled";
  paymentSource: "usd_balance" | "usdt_balance";
  dayOfWeek?: number;
  dayOfMonth?: number;
  hour: number;
  stats: {
    totalPurchased: number;
    totalSpent: number;
    averagePrice: number;
    executionCount: number;
    nextExecutionAt?: string;
  };
}

interface Props {
  walletAddress: string;
  lang: "tr" | "en";
  usdBalance?: number;
  usdtBalance?: number;
}

const t = {
  tr: {
    title: "Otomatik Alım (DCA)",
    subtitle: "Düzenli aralıklarla otomatik kripto alın",
    createPlan: "Yeni Plan",
    activePlans: "Aktif Planlar",
    pausedPlans: "Duraklatılmış",
    completedPlans: "Tamamlanmış",
    noPlans: "Henüz otomatik alım planı yok",
    token: "Token",
    amount: "Miktar (USD)",
    frequency: "Sıklık",
    paymentSource: "Ödeme Kaynağı",
    frequencies: {
      daily: "Günlük",
      weekly: "Haftalık",
      biweekly: "2 Haftada Bir",
      monthly: "Aylık",
    },
    days: ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"],
    create: "Oluştur",
    cancel: "İptal",
    pause: "Duraklat",
    resume: "Devam Et",
    delete: "Sil",
    stats: {
      totalSpent: "Toplam Harcanan",
      totalBought: "Toplam Alınan",
      avgPrice: "Ortalama Fiyat",
      executions: "Çalışma Sayısı",
      nextRun: "Sonraki Çalışma",
    },
    status: {
      active: "Aktif",
      paused: "Duraklatılmış",
      completed: "Tamamlandı",
      cancelled: "İptal Edildi",
    },
  },
  en: {
    title: "Auto Buy (DCA)",
    subtitle: "Automatically buy crypto at regular intervals",
    createPlan: "New Plan",
    activePlans: "Active Plans",
    pausedPlans: "Paused",
    completedPlans: "Completed",
    noPlans: "No recurring buy plans yet",
    token: "Token",
    amount: "Amount (USD)",
    frequency: "Frequency",
    paymentSource: "Payment Source",
    frequencies: {
      daily: "Daily",
      weekly: "Weekly",
      biweekly: "Bi-weekly",
      monthly: "Monthly",
    },
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    create: "Create",
    cancel: "Cancel",
    pause: "Pause",
    resume: "Resume",
    delete: "Delete",
    stats: {
      totalSpent: "Total Spent",
      totalBought: "Total Bought",
      avgPrice: "Avg Price",
      executions: "Executions",
      nextRun: "Next Run",
    },
    status: {
      active: "Active",
      paused: "Paused",
      completed: "Completed",
      cancelled: "Cancelled",
    },
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

export function RecurringBuyManager({ walletAddress, lang, usdBalance = 0, usdtBalance = 0 }: Props) {
  const labels = t[lang];
  const [plans, setPlans] = useState<RecurringBuy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [selectedToken, setSelectedToken] = useState("BTC");
  const [amount, setAmount] = useState("50");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "biweekly" | "monthly">("weekly");
  const [paymentSource, setPaymentSource] = useState<"usd_balance" | "usdt_balance">("usd_balance");
  const [dayOfWeek, setDayOfWeek] = useState(1); // Pazartesi
  const [dayOfMonth, setDayOfMonth] = useState(1);

  useEffect(() => {
    fetchPlans();
  }, [walletAddress]);

  const fetchPlans = async () => {
    try {
      const res = await fetch("/api/recurring", {
        headers: { "x-wallet-address": walletAddress },
      });
      const data = await res.json();
      setPlans(data.plans || []);
    } catch (error) {
      console.error("Fetch plans error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!amount || parseFloat(amount) < 10) return;

    setCreating(true);
    try {
      const res = await fetch("/api/recurring", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({
          token: selectedToken,
          amount: parseFloat(amount),
          frequency,
          paymentSource,
          dayOfWeek: frequency === "weekly" || frequency === "biweekly" ? dayOfWeek : undefined,
          dayOfMonth: frequency === "monthly" ? dayOfMonth : undefined,
          hour: 12,
        }),
      });

      if (res.ok) {
        setShowCreate(false);
        setAmount("50");
        fetchPlans();
      }
    } catch (error) {
      console.error("Create plan error:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleAction = async (planId: string, action: "pause" | "resume" | "cancel") => {
    try {
      await fetch("/api/recurring", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({ planId, action }),
      });
      fetchPlans();
    } catch (error) {
      console.error("Action error:", error);
    }
  };

  const handleDelete = async (planId: string) => {
    try {
      await fetch(`/api/recurring?id=${planId}`, {
        method: "DELETE",
        headers: { "x-wallet-address": walletAddress },
      });
      fetchPlans();
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const activePlans = plans.filter((p) => p.status === "active");
  const otherPlans = plans.filter((p) => p.status !== "active");

  const formatNextRun = (date?: string) => {
    if (!date) return "-";
    const d = new Date(date);
    return d.toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-12 bg-slate-800 rounded-xl" />
        <div className="h-40 bg-slate-800 rounded-xl" />
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
          + {labels.createPlan}
        </button>
      </div>

      {/* Active Plans */}
      {activePlans.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-400">{labels.activePlans}</h4>
          {activePlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              labels={labels}
              onPause={() => handleAction(plan.id, "pause")}
              onDelete={() => handleDelete(plan.id)}
              formatNextRun={formatNextRun}
            />
          ))}
        </div>
      )}

      {/* Other Plans */}
      {otherPlans.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-400">
            {labels.pausedPlans} / {labels.completedPlans}
          </h4>
          {otherPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              labels={labels}
              onResume={plan.status === "paused" ? () => handleAction(plan.id, "resume") : undefined}
              onDelete={() => handleDelete(plan.id)}
              formatNextRun={formatNextRun}
            />
          ))}
        </div>
      )}

      {/* No Plans */}
      {plans.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📅</div>
          <p className="text-slate-400">{labels.noPlans}</p>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl w-full max-w-md border border-slate-700">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">{labels.createPlan}</h3>
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
              </div>

              {/* Amount */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">{labels.amount}</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="10"
                    max="10000"
                    className="w-full pl-8 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  {[25, 50, 100, 250, 500].map((val) => (
                    <button
                      key={val}
                      onClick={() => setAmount(val.toString())}
                      className="px-3 py-1 text-sm bg-slate-800 hover:bg-slate-700 text-slate-400 rounded"
                    >
                      ${val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Frequency */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">{labels.frequency}</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["daily", "weekly", "biweekly", "monthly"] as const).map((freq) => (
                    <button
                      key={freq}
                      onClick={() => setFrequency(freq)}
                      className={`p-3 rounded-xl border transition-colors ${
                        frequency === freq
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                          : "border-slate-700 text-slate-400 hover:border-slate-600"
                      }`}
                    >
                      {labels.frequencies[freq]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Day Selection */}
              {(frequency === "weekly" || frequency === "biweekly") && (
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Gün</label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  >
                    {labels.days.map((day, i) => (
                      <option key={i} value={i}>{day}</option>
                    ))}
                  </select>
                </div>
              )}

              {frequency === "monthly" && (
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Ayın Günü</label>
                  <select
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Payment Source */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">{labels.paymentSource}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPaymentSource("usd_balance")}
                    className={`p-3 rounded-xl border transition-colors ${
                      paymentSource === "usd_balance"
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    <div className="text-white font-medium">USD</div>
                    <div className="text-xs text-slate-500">${usdBalance.toFixed(2)}</div>
                  </button>
                  <button
                    onClick={() => setPaymentSource("usdt_balance")}
                    className={`p-3 rounded-xl border transition-colors ${
                      paymentSource === "usdt_balance"
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    <div className="text-white font-medium">USDT</div>
                    <div className="text-xs text-slate-500">${usdtBalance.toFixed(2)}</div>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-700 flex gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl"
              >
                {labels.cancel}
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || parseFloat(amount) < 10}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl disabled:opacity-50"
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

// Plan Card Component
function PlanCard({
  plan,
  labels,
  onPause,
  onResume,
  onDelete,
  formatNextRun,
}: {
  plan: RecurringBuy;
  labels: typeof t.tr;
  onPause?: () => void;
  onResume?: () => void;
  onDelete: () => void;
  formatNextRun: (date?: string) => string;
}) {
  const token = TOKENS.find((t) => t.symbol === plan.token);
  
  const statusColors = {
    active: "text-emerald-400 bg-emerald-500/10",
    paused: "text-amber-400 bg-amber-500/10",
    completed: "text-blue-400 bg-blue-500/10",
    cancelled: "text-slate-400 bg-slate-500/10",
  };

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{token?.icon || "🪙"}</div>
          <div>
            <div className="font-medium text-white">
              ${plan.amount} {plan.token}
            </div>
            <div className="text-sm text-slate-500">
              {labels.frequencies[plan.frequency]}
            </div>
          </div>
        </div>
        <span className={`px-2 py-1 rounded text-xs ${statusColors[plan.status]}`}>
          {labels.status[plan.status]}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>
          <span className="text-slate-500">{labels.stats.totalSpent}:</span>
          <span className="text-white ml-1">${plan.stats.totalSpent.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-slate-500">{labels.stats.totalBought}:</span>
          <span className="text-white ml-1">{plan.stats.totalPurchased.toFixed(6)} {plan.token}</span>
        </div>
        <div>
          <span className="text-slate-500">{labels.stats.avgPrice}:</span>
          <span className="text-white ml-1">
            ${plan.stats.averagePrice > 0 ? plan.stats.averagePrice.toFixed(2) : "-"}
          </span>
        </div>
        <div>
          <span className="text-slate-500">{labels.stats.executions}:</span>
          <span className="text-white ml-1">{plan.stats.executionCount}</span>
        </div>
      </div>

      {plan.status === "active" && (
        <div className="text-xs text-slate-500 mb-3">
          {labels.stats.nextRun}: {formatNextRun(plan.stats.nextExecutionAt)}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {onPause && (
          <button
            onClick={onPause}
            className="flex-1 py-2 bg-amber-500/10 text-amber-400 rounded-lg text-sm hover:bg-amber-500/20"
          >
            {labels.pause}
          </button>
        )}
        {onResume && (
          <button
            onClick={onResume}
            className="flex-1 py-2 bg-emerald-500/10 text-emerald-400 rounded-lg text-sm hover:bg-emerald-500/20"
          >
            {labels.resume}
          </button>
        )}
        <button
          onClick={onDelete}
          className="py-2 px-4 bg-red-500/10 text-red-400 rounded-lg text-sm hover:bg-red-500/20"
        >
          {labels.delete}
        </button>
      </div>
    </div>
  );
}
