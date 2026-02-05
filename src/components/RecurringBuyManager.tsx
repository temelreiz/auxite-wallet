"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/components/LanguageContext";

interface RecurringBuy {
  id: string;
  token: string;
  amount: number;
  frequency: "daily" | "weekly" | "biweekly" | "monthly";
  status: "active" | "paused" | "completed" | "cancelled";
  paymentSource: "usd_balance" | "usdt_balance" | "eth_balance" | "btc_balance" | "xrp_balance" | "sol_balance";
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
  lang?: string;
  usdBalance?: number;
  usdtBalance?: number;
  ethBalance?: number;
  btcBalance?: number;
  xrpBalance?: number;
  solBalance?: number;
}

// ============================================
// LOCAL TRANSLATIONS - 6 Language Support
// ============================================
const t: Record<string, any> = {
  tr: {
    title: "Düzenli Yatırım",
    subtitle: "Düzenli aralıklarla otomatik metal alın",
    createPlan: "Yeni Plan",
    noPlans: "Henüz otomatik alım planı yok",
    token: "Token",
    amount: "Miktar (USD)",
    frequency: "Sıklık",
    paymentSource: "Ödeme Kaynağı",
    frequencies: { daily: "Günlük", weekly: "Haftalık", biweekly: "2 Haftada Bir", monthly: "Aylık" },
    days: ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"],
    create: "Oluştur",
    cancel: "İptal",
    pause: "Duraklat",
    resume: "Devam Et",
    delete: "Sil",
    confirm: "Onayla",
    status: { active: "Aktif", paused: "Duraklatılmış", completed: "Tamamlandı", cancelled: "İptal Edildi" },
    success: { created: "Otomatik alım planı başarıyla oluşturuldu!", paused: "Plan duraklatıldı", resumed: "Plan devam ettirildi", deleted: "Plan silindi" },
    confirmMessages: { pause: "Bu planı duraklatmak istediğinizden emin misiniz?", resume: "Bu planı devam ettirmek istediğinizden emin misiniz?", delete: "Bu planı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz." },
    autoStake: "Alımları Biriktir",
    autoStakeDesc: "Her alım biriktirme havuzuna da eklensin",
    month: "Ay",
    day: "Gün",
  },
  en: {
    title: "Auto-Invest",
    subtitle: "Automatically buy metals at regular intervals",
    createPlan: "New Plan",
    noPlans: "No recurring buy plans yet",
    token: "Token",
    amount: "Amount (USD)",
    frequency: "Frequency",
    paymentSource: "Payment Source",
    frequencies: { daily: "Daily", weekly: "Weekly", biweekly: "Biweekly", monthly: "Monthly" },
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    create: "Create",
    cancel: "Cancel",
    pause: "Pause",
    resume: "Resume",
    delete: "Delete",
    confirm: "Confirm",
    status: { active: "Active", paused: "Paused", completed: "Completed", cancelled: "Cancelled" },
    success: { created: "Auto buy plan created successfully!", paused: "Plan paused", resumed: "Plan resumed", deleted: "Plan deleted" },
    confirmMessages: { pause: "Are you sure you want to pause this plan?", resume: "Are you sure you want to resume this plan?", delete: "Are you sure you want to delete this plan? This action cannot be undone." },
    autoStake: "Auto-Stake",
    autoStakeDesc: "Add each purchase to staking pool",
    month: "Mo",
    day: "Day",
  },
  de: {
    title: "Auto-Investieren",
    subtitle: "Automatisch Metalle in regelmäßigen Abständen kaufen",
    createPlan: "Neuer Plan",
    noPlans: "Noch keine automatischen Kaufpläne",
    token: "Token",
    amount: "Betrag (USD)",
    frequency: "Häufigkeit",
    paymentSource: "Zahlungsquelle",
    frequencies: { daily: "Täglich", weekly: "Wöchentlich", biweekly: "Alle 2 Wochen", monthly: "Monatlich" },
    days: ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"],
    create: "Erstellen",
    cancel: "Abbrechen",
    pause: "Pausieren",
    resume: "Fortsetzen",
    delete: "Löschen",
    confirm: "Bestätigen",
    status: { active: "Aktiv", paused: "Pausiert", completed: "Abgeschlossen", cancelled: "Abgebrochen" },
    success: { created: "Automatischer Kaufplan erfolgreich erstellt!", paused: "Plan pausiert", resumed: "Plan fortgesetzt", deleted: "Plan gelöscht" },
    confirmMessages: { pause: "Möchten Sie diesen Plan wirklich pausieren?", resume: "Möchten Sie diesen Plan wirklich fortsetzen?", delete: "Möchten Sie diesen Plan wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden." },
    autoStake: "Auto-Staken",
    autoStakeDesc: "Jeden Kauf zum Staking-Pool hinzufügen",
    month: "Mo",
    day: "Tag",
  },
  fr: {
    title: "Investissement Auto",
    subtitle: "Achetez automatiquement des métaux à intervalles réguliers",
    createPlan: "Nouveau Plan",
    noPlans: "Aucun plan d'achat automatique",
    token: "Token",
    amount: "Montant (USD)",
    frequency: "Fréquence",
    paymentSource: "Source de Paiement",
    frequencies: { daily: "Quotidien", weekly: "Hebdomadaire", biweekly: "Bimensuel", monthly: "Mensuel" },
    days: ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"],
    create: "Créer",
    cancel: "Annuler",
    pause: "Pause",
    resume: "Reprendre",
    delete: "Supprimer",
    confirm: "Confirmer",
    status: { active: "Actif", paused: "En pause", completed: "Terminé", cancelled: "Annulé" },
    success: { created: "Plan d'achat automatique créé avec succès!", paused: "Plan en pause", resumed: "Plan repris", deleted: "Plan supprimé" },
    confirmMessages: { pause: "Êtes-vous sûr de vouloir mettre ce plan en pause?", resume: "Êtes-vous sûr de vouloir reprendre ce plan?", delete: "Êtes-vous sûr de vouloir supprimer ce plan? Cette action est irréversible." },
    autoStake: "Auto-Staking",
    autoStakeDesc: "Ajouter chaque achat au pool de staking",
    month: "Mois",
    day: "Jour",
  },
  ar: {
    title: "الاستثمار التلقائي",
    subtitle: "شراء المعادن تلقائياً على فترات منتظمة",
    createPlan: "خطة جديدة",
    noPlans: "لا توجد خطط شراء تلقائية بعد",
    token: "الرمز",
    amount: "المبلغ (USD)",
    frequency: "التكرار",
    paymentSource: "مصدر الدفع",
    frequencies: { daily: "يومي", weekly: "أسبوعي", biweekly: "كل أسبوعين", monthly: "شهري" },
    days: ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
    create: "إنشاء",
    cancel: "إلغاء",
    pause: "إيقاف مؤقت",
    resume: "استئناف",
    delete: "حذف",
    confirm: "تأكيد",
    status: { active: "نشط", paused: "متوقف مؤقتاً", completed: "مكتمل", cancelled: "ملغى" },
    success: { created: "تم إنشاء خطة الشراء التلقائي بنجاح!", paused: "تم إيقاف الخطة مؤقتاً", resumed: "تم استئناف الخطة", deleted: "تم حذف الخطة" },
    confirmMessages: { pause: "هل أنت متأكد من إيقاف هذه الخطة مؤقتاً؟", resume: "هل أنت متأكد من استئناف هذه الخطة؟", delete: "هل أنت متأكد من حذف هذه الخطة؟ لا يمكن التراجع عن هذا الإجراء." },
    autoStake: "التخزين التلقائي",
    autoStakeDesc: "إضافة كل عملية شراء إلى مجمع التخزين",
    month: "شهر",
    day: "يوم",
  },
  ru: {
    title: "Авто-инвестирование",
    subtitle: "Автоматически покупайте металлы через регулярные интервалы",
    createPlan: "Новый План",
    noPlans: "Планов автопокупки пока нет",
    token: "Токен",
    amount: "Сумма (USD)",
    frequency: "Частота",
    paymentSource: "Источник Оплаты",
    frequencies: { daily: "Ежедневно", weekly: "Еженедельно", biweekly: "Раз в 2 недели", monthly: "Ежемесячно" },
    days: ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"],
    create: "Создать",
    cancel: "Отмена",
    pause: "Пауза",
    resume: "Возобновить",
    delete: "Удалить",
    confirm: "Подтвердить",
    status: { active: "Активен", paused: "Приостановлен", completed: "Завершён", cancelled: "Отменён" },
    success: { created: "План автопокупки успешно создан!", paused: "План приостановлен", resumed: "План возобновлён", deleted: "План удалён" },
    confirmMessages: { pause: "Вы уверены, что хотите приостановить этот план?", resume: "Вы уверены, что хотите возобновить этот план?", delete: "Вы уверены, что хотите удалить этот план? Это действие нельзя отменить." },
    autoStake: "Авто-стейкинг",
    autoStakeDesc: "Добавлять каждую покупку в пул стейкинга",
    month: "Мес",
    day: "День",
  },
};

const TOKENS = [
  { symbol: "AUXG", name: "Gold", icon: "/gold-favicon-32x32.png", isImage: true },
  { symbol: "AUXS", name: "Silver", icon: "/silver-favicon-32x32.png", isImage: true },
  { symbol: "AUXPT", name: "Platinum", icon: "/platinum-favicon-32x32.png", isImage: true },
  { symbol: "AUXPD", name: "Palladium", icon: "/palladium-favicon-32x32.png", isImage: true },
];

export function RecurringBuyManager({ 
  walletAddress, 
  lang: propLang, 
  usdBalance = 0, 
  usdtBalance = 0,
  ethBalance = 0,
  btcBalance = 0,
  xrpBalance = 0,
  solBalance = 0,
}: Props) {
  const { lang: contextLang } = useLanguage();
  const lang = propLang || contextLang || "en";
  const labels = t[lang] || t.en;
  const [plans, setPlans] = useState<RecurringBuy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Success/Error messages
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  
  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    type: "pause" | "resume" | "delete";
    planId: string;
    planToken: string;
  } | null>(null);

  // Form state
  const [selectedToken, setSelectedToken] = useState("AUXG");
  const [amount, setAmount] = useState("50");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "biweekly" | "monthly">("weekly");
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [paymentSource, setPaymentSource] = useState<"usd_balance" | "usdt_balance" | "eth_balance" | "btc_balance" | "xrp_balance" | "sol_balance">("usd_balance");
  const [autoStake, setAutoStake] = useState(false);
  const [stakeDuration, setStakeDuration] = useState<3 | 6 | 12>(6);

  useEffect(() => {
    if (walletAddress) fetchPlans();
  }, [walletAddress]);

  // Auto-hide success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const fetchPlans = async () => {
    try {
      const res = await fetch("/api/recurring-buy", {
        headers: { "x-wallet-address": walletAddress },
      });
      const data = await res.json();
      setPlans(data.plans || []);
    } catch (err) {
      console.error("Fetch plans error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/recurring-buy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({
          token: selectedToken,
          amount: parseFloat(amount),
          frequency,
          dayOfWeek: frequency === "weekly" || frequency === "biweekly" ? dayOfWeek : undefined,
          paymentSource,
          autoStake,
          stakeDuration: autoStake ? stakeDuration : undefined,
          hour: 9,
        }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setShowCreate(false);
        setSuccessMessage(labels.success.created);
        fetchPlans();
        // Reset form
        setAmount("50");
        setSelectedToken("AUXG");
        setFrequency("weekly");
        setPaymentSource("usd_balance");
      } else {
        setErrorMessage(data.error || "Bir hata oluştu");
      }
    } catch (err) {
      console.error("Create error:", err);
      setErrorMessage("Bir hata oluştu");
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmModal) return;
    
    const { type, planId } = confirmModal;
    
    try {
      if (type === "delete") {
        await fetch(`/api/recurring-buy?id=${planId}`, {
          method: "DELETE",
          headers: { "x-wallet-address": walletAddress },
        });
        setSuccessMessage(labels.success.deleted);
      } else {
        await fetch("/api/recurring-buy", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-wallet-address": walletAddress },
          body: JSON.stringify({ planId, action: type }),
        });
        setSuccessMessage(type === "pause" ? labels.success.paused : labels.success.resumed);
      }
      fetchPlans();
    } catch (err) {
      console.error("Action error:", err);
    } finally {
      setConfirmModal(null);
    }
  };

  if (!walletAddress) {
    return <div className="text-center text-slate-400 py-8">Cüzdan bağlantısı gerekli</div>;
  }

  return (
    <div className="space-y-4">
      {/* Success Message */}
      {successMessage && (
        <div className="p-3 sm:p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-xl text-emerald-400 flex items-center gap-2 sm:gap-3 text-sm">
          <span className="text-lg sm:text-xl">✅</span>
          <span className="flex-1">{successMessage}</span>
        </div>
      )}
      
      {/* Error Message */}
      {errorMessage && (
        <div className="p-3 sm:p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 flex items-center gap-2 sm:gap-3 text-sm">
          <span className="text-lg sm:text-xl">❌</span>
          <span className="flex-1">{errorMessage}</span>
          <button onClick={() => setErrorMessage("")} className="touch-manipulation">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">{labels.title}</h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">{labels.subtitle}</p>
        </div>
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600 active:bg-emerald-700 touch-manipulation w-full sm:w-auto"
          >
            + {labels.createPlan}
          </button>
        )}
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-white dark:bg-slate-800/50 rounded-xl p-3 sm:p-4 border border-stone-200 dark:border-slate-700 space-y-4">
          {/* Token Selection */}
          <div>
            <label className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-300 mb-2 block">{labels.token}</label>
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              {TOKENS.map((token: any) => (
                <button
                  key={token.symbol}
                  onClick={() => setSelectedToken(token.symbol)}
                  className={`p-2 sm:p-3 rounded-xl border transition-colors touch-manipulation ${
                    selectedToken === token.symbol
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-stone-300 dark:border-slate-700 hover:border-stone-400 dark:hover:border-slate-600"
                  }`}
                >
                  {token.isImage ? (
                    <img src={token.icon} alt={token.symbol} className="w-5 h-5 sm:w-6 sm:h-6 mx-auto" />
                  ) : (
                    <div className="text-lg sm:text-xl text-center">{token.icon}</div>
                  )}
                  <div className="text-[10px] sm:text-xs text-center font-medium text-slate-700 dark:text-slate-300 mt-1">{token.symbol}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-300 mb-2 block">{labels.amount}</label>
            <div className="flex items-center gap-2">
              <span className="text-slate-600 dark:text-slate-400 font-medium">$</span>
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 bg-stone-100 dark:bg-slate-900 border border-stone-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm sm:text-base text-slate-900 dark:text-white"
                min="10"
              />
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2">
              {["25", "50", "100", "250", "500"].map((val) => (
                <button
                  key={val}
                  onClick={() => setAmount(val)}
                  className="px-2.5 sm:px-3 py-1 bg-stone-200 dark:bg-slate-700 rounded-lg text-xs sm:text-sm text-slate-700 dark:text-slate-300 hover:bg-stone-300 dark:hover:bg-slate-600 touch-manipulation"
                >
                  ${val}
                </button>
              ))}
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-300 mb-2 block">{labels.frequency}</label>
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
              {(["daily", "weekly", "biweekly", "monthly"] as const).map((freq) => (
                <button
                  key={freq}
                  onClick={() => setFrequency(freq)}
                  className={`p-2 sm:p-3 rounded-xl border transition-colors text-xs sm:text-sm touch-manipulation ${
                    frequency === freq
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                      : "border-stone-300 dark:border-slate-700 hover:border-stone-400 dark:hover:border-slate-600 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {labels.frequencies[freq]}
                </button>
              ))}
            </div>
          </div>

          {/* Day of Week (for weekly/biweekly) */}
          {(frequency === "weekly" || frequency === "biweekly") && (
            <div>
              <label className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-300 mb-2 block">{labels.day}</label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
                className="w-full bg-stone-100 dark:bg-slate-900 border border-stone-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm sm:text-base text-slate-900 dark:text-white"
              >
                {labels.days.map((day: string, i: number) => (
                  <option key={i} value={i}>{day}</option>
                ))}
              </select>
            </div>
          )}

          {/* Payment Source */}
          <div>
            <label className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-300 mb-2 block">{labels.paymentSource}</label>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              <button
                onClick={() => setPaymentSource("usd_balance")}
                className={`p-2 sm:p-3 rounded-xl border transition-colors touch-manipulation ${
                  paymentSource === "usd_balance"
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-stone-300 dark:border-slate-700 hover:border-stone-400 dark:hover:border-slate-600"
                }`}
              >
                <div className="text-xs sm:text-sm text-slate-900 dark:text-white font-medium">USD</div>
                <div className="text-[10px] sm:text-xs text-slate-500">${usdBalance.toFixed(2)}</div>
              </button>
              <button
                onClick={() => setPaymentSource("usdt_balance")}
                className={`p-2 sm:p-3 rounded-xl border transition-colors touch-manipulation ${
                  paymentSource === "usdt_balance"
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-stone-300 dark:border-slate-700 hover:border-stone-400 dark:hover:border-slate-600"
                }`}
              >
                <div className="text-xs sm:text-sm text-slate-900 dark:text-white font-medium">USDT</div>
                <div className="text-[10px] sm:text-xs text-slate-500">${usdtBalance.toFixed(2)}</div>
              </button>
              <button
                onClick={() => setPaymentSource("eth_balance")}
                className={`p-2 sm:p-3 rounded-xl border transition-colors touch-manipulation ${
                  paymentSource === "eth_balance"
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-stone-300 dark:border-slate-700 hover:border-stone-400 dark:hover:border-slate-600"
                }`}
              >
                <div className="text-xs sm:text-sm text-slate-900 dark:text-white font-medium">ETH</div>
                <div className="text-[10px] sm:text-xs text-slate-500">{ethBalance.toFixed(4)}</div>
              </button>
              <button
                onClick={() => setPaymentSource("btc_balance")}
                className={`p-2 sm:p-3 rounded-xl border transition-colors touch-manipulation ${
                  paymentSource === "btc_balance"
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-stone-300 dark:border-slate-700 hover:border-stone-400 dark:hover:border-slate-600"
                }`}
              >
                <div className="text-xs sm:text-sm text-slate-900 dark:text-white font-medium">BTC</div>
                <div className="text-[10px] sm:text-xs text-slate-500">{btcBalance.toFixed(6)}</div>
              </button>
              <button
                onClick={() => setPaymentSource("xrp_balance")}
                className={`p-2 sm:p-3 rounded-xl border transition-colors touch-manipulation ${
                  paymentSource === "xrp_balance"
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-stone-300 dark:border-slate-700 hover:border-stone-400 dark:hover:border-slate-600"
                }`}
              >
                <div className="text-xs sm:text-sm text-slate-900 dark:text-white font-medium">XRP</div>
                <div className="text-[10px] sm:text-xs text-slate-500">{xrpBalance.toFixed(2)}</div>
              </button>
              <button
                onClick={() => setPaymentSource("sol_balance")}
                className={`p-2 sm:p-3 rounded-xl border transition-colors touch-manipulation ${
                  paymentSource === "sol_balance"
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-stone-300 dark:border-slate-700 hover:border-stone-400 dark:hover:border-slate-600"
                }`}
              >
                <div className="text-xs sm:text-sm text-slate-900 dark:text-white font-medium">SOL</div>
                <div className="text-[10px] sm:text-xs text-slate-500">{solBalance.toFixed(4)}</div>
              </button>
            </div>
          </div>

          {/* Auto-Stake Option */}
          <div className="p-3 sm:p-4 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/30">
            <div className="flex items-center justify-between mb-3">
              <div className="min-w-0 flex-1">
                <div className="text-xs sm:text-sm text-slate-900 dark:text-white font-medium flex items-center gap-2">
                  🔒 {labels.autoStake}
                </div>
                <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {labels.autoStakeDesc}
                </p>
              </div>
              <button
                onClick={() => setAutoStake(!autoStake)}
                className={`w-11 sm:w-12 h-6 rounded-full transition-colors flex-shrink-0 ml-3 touch-manipulation ${autoStake ? "bg-emerald-500" : "bg-stone-300 dark:bg-slate-600"}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transform transition-transform ${autoStake ? "translate-x-5 sm:translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
            {autoStake && (
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-3">
                {([3, 6, 12] as const).map((months) => (
                  <button
                    key={months}
                    onClick={() => setStakeDuration(months)}
                    className={`p-2 sm:p-3 rounded-xl border transition-colors text-xs sm:text-sm touch-manipulation ${stakeDuration === months ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-stone-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-stone-400 dark:hover:border-slate-600"}`}
                  >
                    <div className="font-medium">{months} {labels.month}</div>
                    <div className="text-[10px] sm:text-xs opacity-70">{months === 3 ? "5%" : months === 6 ? "8%" : "12%"} APY</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 sm:gap-3 pt-2">
            <button
              onClick={() => setShowCreate(false)}
              className="flex-1 py-2.5 sm:py-3 bg-stone-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-stone-300 dark:hover:bg-slate-600 text-sm sm:text-base font-medium touch-manipulation"
            >
              {labels.cancel}
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !amount || parseFloat(amount) < 10}
              className="flex-1 py-2.5 sm:py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 active:bg-emerald-700 disabled:opacity-50 text-sm sm:text-base touch-manipulation"
            >
              {creating ? "..." : labels.create}
            </button>
          </div>
        </div>
      )}

      {/* Plans List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin w-6 h-6 sm:w-8 sm:h-8 border-2 border-slate-600 border-t-emerald-500 rounded-full"></div>
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-6 sm:py-8 text-slate-500">
          <p className="text-3xl sm:text-4xl mb-2">📅</p>
          <p className="text-sm sm:text-base">{labels.noPlans}</p>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {plans.map((plan) => {
            const token = TOKENS.find((t) => t.symbol === plan.token);
            return (
              <div key={plan.id} className="bg-white dark:bg-slate-800/50 rounded-xl p-3 sm:p-4 border border-stone-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3">
                    {token?.isImage ? (
                      <img src={token.icon} alt={token.symbol} className="w-6 h-6 sm:w-8 sm:h-8" />
                    ) : (
                      <div className="text-xl sm:text-2xl">{token?.icon || "🪙"}</div>
                    )}
                    <div>
                      <div className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                        ${plan.amount} → {plan.token}
                      </div>
                      <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                        {labels.frequencies[plan.frequency]}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] sm:text-xs px-2 py-1 rounded-full ${
                      plan.status === "active" ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" :
                      plan.status === "paused" ? "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400" :
                      "bg-slate-200 dark:bg-slate-500/20 text-slate-600 dark:text-slate-400"
                    }`}>
                      {labels.status[plan.status]}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  {plan.status === "active" && (
                    <button
                      onClick={() => setConfirmModal({ show: true, type: "pause", planId: plan.id, planToken: plan.token })}
                      className="flex-1 py-2 bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg text-xs sm:text-sm font-medium hover:bg-amber-200 dark:hover:bg-amber-500/20 transition-colors touch-manipulation"
                    >
                      {labels.pause}
                    </button>
                  )}
                  {plan.status === "paused" && (
                    <button
                      onClick={() => setConfirmModal({ show: true, type: "resume", planId: plan.id, planToken: plan.token })}
                      className="flex-1 py-2 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs sm:text-sm font-medium hover:bg-emerald-200 dark:hover:bg-emerald-500/20 transition-colors touch-manipulation"
                    >
                      {labels.resume}
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmModal({ show: true, type: "delete", planId: plan.id, planToken: plan.token })}
                    className="py-2 px-3 sm:px-4 bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-xs sm:text-sm font-medium hover:bg-red-200 dark:hover:bg-red-500/20 transition-colors touch-manipulation"
                  >
                    {labels.delete}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-stone-200 dark:border-slate-700 max-w-[calc(100vw-24px)] sm:max-w-sm w-full p-4 sm:p-6">
            <div className="text-center mb-4 sm:mb-6">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">
                {confirmModal.type === "delete" ? "🗑️" : confirmModal.type === "pause" ? "⏸️" : "▶️"}
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white mb-2">
                {confirmModal.planToken} {confirmModal.type === "delete" ? "Planı Sil" : confirmModal.type === "pause" ? "Planı Duraklat" : "Planı Devam Ettir"}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                {labels.confirmMessages[confirmModal.type]}
              </p>
            </div>
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-2.5 sm:py-3 bg-stone-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-stone-300 dark:hover:bg-slate-600 text-sm sm:text-base font-medium touch-manipulation"
              >
                {labels.cancel}
              </button>
              <button
                onClick={handleConfirmAction}
                className={`flex-1 py-2.5 sm:py-3 rounded-xl text-white text-sm sm:text-base font-medium touch-manipulation ${
                  confirmModal.type === "delete" 
                    ? "bg-red-500 hover:bg-red-600 active:bg-red-700" 
                    : "bg-amber-500 hover:bg-amber-600 active:bg-emerald-700"
                }`}
              >
                {labels.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecurringBuyManager;
