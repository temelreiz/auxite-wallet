"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/components/LanguageContext";

interface RecurringStake {
  id: string;
  token: string;
  amount: number;
  frequency: "weekly" | "biweekly" | "monthly";
  stakeDuration: 3 | 6 | 12;
  status: "active" | "paused" | "cancelled";
  paymentSource: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  stats: {
    totalStaked: number;
    totalSpent: number;
    executionCount: number;
    nextExecutionAt?: string;
  };
}

interface Props {
  walletAddress: string;
  lang?: string;
  metalBalances?: {
    AUXG?: number;
    AUXS?: number;
    AUXPT?: number;
    AUXPD?: number;
  };
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
    title: "Düzenli Tahsis",
    subtitle: "Otomatik periyodik tahsis talimatları oluşturun",
    createPlan: "Yeni Talimat",
    noPlans: "Henüz tahsis talimatı yok",
    token: "Metal",
    amount: "Miktar (gram)",
    frequency: "Sıklık",
    stakeDuration: "Tahsis Vadesi",
    paymentSource: "Kaynak",
    paymentSourceDesc: "Metal bakiyeniz yoksa bu kaynaktan alım yapılır",
    frequencies: { weekly: "Haftalık", biweekly: "2 Haftada Bir", monthly: "Aylık" },
    durations: { 3: "3 Ay Vade", 6: "6 Ay Vade", 12: "12 Ay Vade" },
    apyRates: { 3: "5%", 6: "8%", 12: "12%" },
    days: ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"],
    dayOfMonth: "Ayın Günü",
    create: "Talimat Ver",
    cancel: "İptal",
    pause: "Duraklat",
    resume: "Devam Et",
    delete: "Sil",
    confirm: "Onayla",
    status: { active: "Aktif", paused: "Duraklatılmış", cancelled: "İptal Edildi" },
    success: { created: "Tahsis talimatı başarıyla oluşturuldu!", paused: "Talimat duraklatıldı", resumed: "Talimat devam ettirildi", deleted: "Talimat silindi" },
    confirmMessages: { pause: "Bu talimatı duraklatmak istediğinizden emin misiniz?", resume: "Bu talimatı devam ettirmek istediğinizden emin misiniz?", delete: "Bu talimatı silmek istediğinizden emin misiniz?" },
    metalBalance: "Metal Bakiyesi",
    nextExecution: "Sonraki Çalışma",
  },
  en: {
    title: "Recurring Allocation",
    subtitle: "Set automatic periodic allocation instructions",
    createPlan: "New Instruction",
    noPlans: "No allocation instructions yet",
    token: "Metal",
    amount: "Amount (grams)",
    frequency: "Frequency",
    stakeDuration: "Deployment Term",
    paymentSource: "Source",
    paymentSourceDesc: "If metal balance is insufficient, purchase from this source",
    frequencies: { weekly: "Weekly", biweekly: "Biweekly", monthly: "Monthly" },
    durations: { 3: "3 Month Term", 6: "6 Month Term", 12: "12 Month Term" },
    apyRates: { 3: "5%", 6: "8%", 12: "12%" },
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    dayOfMonth: "Day of Month",
    create: "Create Instruction",
    cancel: "Cancel",
    pause: "Pause",
    resume: "Resume",
    delete: "Delete",
    confirm: "Confirm",
    status: { active: "Active", paused: "Paused", cancelled: "Cancelled" },
    success: { created: "Allocation instruction created successfully!", paused: "Instruction paused", resumed: "Instruction resumed", deleted: "Instruction deleted" },
    confirmMessages: { pause: "Are you sure you want to pause this instruction?", resume: "Are you sure you want to resume this instruction?", delete: "Are you sure you want to delete this instruction?" },
    metalBalance: "Metal Balance",
    nextExecution: "Next Execution",
  },
  de: {
    title: "Wiederkehrende Allokation",
    subtitle: "Automatische periodische Allokationsanweisungen einrichten",
    createPlan: "Neue Anweisung",
    noPlans: "Noch keine Allokationsanweisungen",
    token: "Metall",
    amount: "Menge (Gramm)",
    frequency: "Häufigkeit",
    stakeDuration: "Einsatzdauer",
    paymentSource: "Quelle",
    paymentSourceDesc: "Bei unzureichendem Metallguthaben wird aus dieser Quelle gekauft",
    frequencies: { weekly: "Wöchentlich", biweekly: "Alle 2 Wochen", monthly: "Monatlich" },
    durations: { 3: "3 Monate Laufzeit", 6: "6 Monate Laufzeit", 12: "12 Monate Laufzeit" },
    apyRates: { 3: "5%", 6: "8%", 12: "12%" },
    days: ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"],
    dayOfMonth: "Tag des Monats",
    create: "Anweisung Erstellen",
    cancel: "Abbrechen",
    pause: "Pausieren",
    resume: "Fortsetzen",
    delete: "Löschen",
    confirm: "Bestätigen",
    status: { active: "Aktiv", paused: "Pausiert", cancelled: "Abgebrochen" },
    success: { created: "Allokationsanweisung erfolgreich erstellt!", paused: "Anweisung pausiert", resumed: "Anweisung fortgesetzt", deleted: "Anweisung gelöscht" },
    confirmMessages: { pause: "Möchten Sie diese Anweisung wirklich pausieren?", resume: "Möchten Sie diese Anweisung wirklich fortsetzen?", delete: "Möchten Sie diese Anweisung wirklich löschen?" },
    metalBalance: "Metallguthaben",
    nextExecution: "Nächste Ausführung",
  },
  fr: {
    title: "Allocation Récurrente",
    subtitle: "Définir des instructions d'allocation périodiques automatiques",
    createPlan: "Nouvelle Instruction",
    noPlans: "Aucune instruction d'allocation",
    token: "Métal",
    amount: "Quantité (grammes)",
    frequency: "Fréquence",
    stakeDuration: "Durée de Déploiement",
    paymentSource: "Source",
    paymentSourceDesc: "Si le solde métal est insuffisant, achat depuis cette source",
    frequencies: { weekly: "Hebdomadaire", biweekly: "Bimensuel", monthly: "Mensuel" },
    durations: { 3: "Terme de 3 Mois", 6: "Terme de 6 Mois", 12: "Terme de 12 Mois" },
    apyRates: { 3: "5%", 6: "8%", 12: "12%" },
    days: ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"],
    dayOfMonth: "Jour du Mois",
    create: "Créer Instruction",
    cancel: "Annuler",
    pause: "Pause",
    resume: "Reprendre",
    delete: "Supprimer",
    confirm: "Confirmer",
    status: { active: "Actif", paused: "En pause", cancelled: "Annulé" },
    success: { created: "Instruction d'allocation créée avec succès!", paused: "Instruction en pause", resumed: "Instruction reprise", deleted: "Instruction supprimée" },
    confirmMessages: { pause: "Êtes-vous sûr de vouloir mettre cette instruction en pause?", resume: "Êtes-vous sûr de vouloir reprendre cette instruction?", delete: "Êtes-vous sûr de vouloir supprimer cette instruction?" },
    metalBalance: "Solde Métal",
    nextExecution: "Prochaine Exécution",
  },
  ar: {
    title: "التخصيص المتكرر",
    subtitle: "تعيين تعليمات التخصيص الدوري التلقائي",
    createPlan: "تعليمات جديدة",
    noPlans: "لا توجد تعليمات تخصيص بعد",
    token: "المعدن",
    amount: "الكمية (جرام)",
    frequency: "التكرار",
    stakeDuration: "مدة النشر",
    paymentSource: "المصدر",
    paymentSourceDesc: "إذا كان رصيد المعدن غير كافٍ، يتم الشراء من هذا المصدر",
    frequencies: { weekly: "أسبوعي", biweekly: "كل أسبوعين", monthly: "شهري" },
    durations: { 3: "فترة 3 أشهر", 6: "فترة 6 أشهر", 12: "فترة 12 شهر" },
    apyRates: { 3: "5%", 6: "8%", 12: "12%" },
    days: ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
    dayOfMonth: "يوم الشهر",
    create: "إنشاء تعليمات",
    cancel: "إلغاء",
    pause: "إيقاف مؤقت",
    resume: "استئناف",
    delete: "حذف",
    confirm: "تأكيد",
    status: { active: "نشط", paused: "متوقف مؤقتاً", cancelled: "ملغى" },
    success: { created: "تم إنشاء تعليمات التخصيص بنجاح!", paused: "تم إيقاف التعليمات مؤقتاً", resumed: "تم استئناف التعليمات", deleted: "تم حذف التعليمات" },
    confirmMessages: { pause: "هل أنت متأكد من إيقاف هذه التعليمات مؤقتاً؟", resume: "هل أنت متأكد من استئناف هذه التعليمات؟", delete: "هل أنت متأكد من حذف هذه التعليمات؟" },
    metalBalance: "رصيد المعدن",
    nextExecution: "التنفيذ التالي",
  },
  ru: {
    title: "Периодическая Аллокация",
    subtitle: "Настроить автоматические периодические инструкции аллокации",
    createPlan: "Новая Инструкция",
    noPlans: "Инструкций аллокации пока нет",
    token: "Металл",
    amount: "Количество (грамм)",
    frequency: "Частота",
    stakeDuration: "Срок Размещения",
    paymentSource: "Источник",
    paymentSourceDesc: "При недостаточном балансе металла покупка из этого источника",
    frequencies: { weekly: "Еженедельно", biweekly: "Раз в 2 недели", monthly: "Ежемесячно" },
    durations: { 3: "Срок 3 Месяца", 6: "Срок 6 Месяцев", 12: "Срок 12 Месяцев" },
    apyRates: { 3: "5%", 6: "8%", 12: "12%" },
    days: ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"],
    dayOfMonth: "День Месяца",
    create: "Создать Инструкцию",
    cancel: "Отмена",
    pause: "Пауза",
    resume: "Возобновить",
    delete: "Удалить",
    confirm: "Подтвердить",
    status: { active: "Активен", paused: "Приостановлен", cancelled: "Отменён" },
    success: { created: "Инструкция аллокации успешно создана!", paused: "Инструкция приостановлена", resumed: "Инструкция возобновлена", deleted: "Инструкция удалена" },
    confirmMessages: { pause: "Вы уверены, что хотите приостановить эту инструкцию?", resume: "Вы уверены, что хотите возобновить эту инструкцию?", delete: "Вы уверены, что хотите удалить эту инструкцию?" },
    metalBalance: "Баланс Металла",
    nextExecution: "Следующее Выполнение",
  },
};

const TOKENS = [
  { symbol: "AUXG", name: "Gold", icon: "/auxg_icon.png" },
  { symbol: "AUXS", name: "Silver", icon: "/silver-icon.png" },
  { symbol: "AUXPT", name: "Platinum", icon: "/platinum-icon.png" },
  { symbol: "AUXPD", name: "Palladium", icon: "/palladium-icon.png" },
];

export function RecurringStakeManager({
  walletAddress,
  lang: propLang,
  metalBalances = {},
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
  const [plans, setPlans] = useState<RecurringStake[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    type: "pause" | "resume" | "delete";
    planId: string;
    planToken: string;
  } | null>(null);

  // Form state
  const [selectedToken, setSelectedToken] = useState("AUXG");
  const [amount, setAmount] = useState("1");
  const [frequency, setFrequency] = useState<"weekly" | "biweekly" | "monthly">("monthly");
  const [stakeDuration, setStakeDuration] = useState<3 | 6 | 12>(6);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [paymentSource, setPaymentSource] = useState("metal_balance");

  useEffect(() => {
    if (walletAddress) fetchPlans();
  }, [walletAddress]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const fetchPlans = async () => {
    try {
      const res = await fetch("/api/recurring-stake", {
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
      const res = await fetch("/api/recurring-stake", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({
          token: selectedToken,
          amount: parseFloat(amount),
          frequency,
          stakeDuration,
          paymentSource,
          dayOfWeek: frequency === "weekly" || frequency === "biweekly" ? dayOfWeek : undefined,
          dayOfMonth: frequency === "monthly" ? dayOfMonth : undefined,
          hour: 9,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setShowCreate(false);
        setSuccessMessage(labels.success.created);
        fetchPlans();
        setAmount("1");
        setSelectedToken("AUXG");
        setFrequency("monthly");
        setStakeDuration(6);
        setPaymentSource("metal_balance");
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
        await fetch(`/api/recurring-stake?id=${planId}`, {
          method: "DELETE",
          headers: { "x-wallet-address": walletAddress },
        });
        setSuccessMessage(labels.success.deleted);
      } else {
        await fetch("/api/recurring-stake", {
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

  const getMetalBalance = (symbol: string) => {
    return metalBalances[symbol as keyof typeof metalBalances] || 0;
  };

  if (!walletAddress) {
    return <div className="text-center text-slate-600 dark:text-slate-400 py-8">Cüzdan bağlantısı gerekli</div>;
  }

  return (
    <div className="space-y-4">
      {/* Success Message */}
      {successMessage && (
        <div className="p-4 bg-[#2F6F62]/20 border border-[#2F6F62]/50 rounded-xl text-[#2F6F62] dark:text-[#2F6F62] flex items-center gap-3">
          <span className="text-xl">✅</span>
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-600 dark:text-red-400 flex items-center gap-3">
          <span className="text-xl">❌</span>
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage("")} className="ml-auto">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white">{labels.title}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">{labels.subtitle}</p>
        </div>
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#2F6F62] text-white rounded-lg hover:bg-[#2F6F62]"
          >
            <span>📅</span> {labels.createPlan}
          </button>
        )}
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-stone-100 dark:bg-slate-800/50 rounded-xl p-4 border border-stone-300 dark:border-slate-700 space-y-4">
          {/* Token Selection */}
          <div>
            <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">{labels.token}</label>
            <div className="grid grid-cols-4 gap-2">
              {TOKENS.map((token) => (
                <button
                  key={token.symbol}
                  onClick={() => setSelectedToken(token.symbol)}
                  className={`p-3 rounded-xl border transition-colors ${
                    selectedToken === token.symbol
                      ? "border-[#2F6F62] bg-[#2F6F62]/10"
                      : "border-stone-300 dark:border-slate-700 hover:border-stone-400 dark:hover:border-slate-600"
                  }`}
                >
                  <img src={token.icon} alt={token.symbol} className="w-6 h-6 mx-auto" />
                  <div className="text-xs text-center text-slate-600 dark:text-slate-400 mt-1">{token.symbol}</div>
                  <div className="text-xs text-center text-slate-500 dark:text-slate-500">{getMetalBalance(token.symbol).toFixed(2)}g</div>
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">{labels.amount}</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 bg-white dark:bg-slate-900 border border-stone-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-white"
                min="0.1"
                step="0.1"
              />
              <span className="text-slate-600 dark:text-slate-400">gram</span>
            </div>
            <div className="flex gap-2 mt-2">
              {["0.5", "1", "2", "5", "10"].map((val) => (
                <button
                  key={val}
                  onClick={() => setAmount(val)}
                  className="px-3 py-1 bg-stone-200 dark:bg-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-stone-300 dark:hover:bg-slate-600"
                >
                  {val}g
                </button>
              ))}
            </div>
          </div>

          {/* Stake Duration */}
          <div>
            <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">{labels.stakeDuration}</label>
            <div className="grid grid-cols-3 gap-2">
              {([3, 6, 12] as const).map((months) => (
                <button
                  key={months}
                  onClick={() => setStakeDuration(months)}
                  className={`p-3 rounded-xl border transition-colors ${
                    stakeDuration === months
                      ? "border-[#2F6F62] bg-[#2F6F62]/10 text-[#BFA181] dark:text-[#BFA181]"
                      : "border-stone-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-stone-400 dark:hover:border-slate-600"
                  }`}
                >
                  <div className="font-medium">{labels.durations[months]}</div>
                  <div className="text-xs opacity-70">{labels.apyRates[months]} APY</div>
                </button>
              ))}
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">{labels.frequency}</label>
            <div className="grid grid-cols-3 gap-2">
              {(["weekly", "biweekly", "monthly"] as const).map((freq) => (
                <button
                  key={freq}
                  onClick={() => setFrequency(freq)}
                  className={`p-3 rounded-xl border transition-colors ${
                    frequency === freq
                      ? "border-[#2F6F62] bg-[#2F6F62]/10 text-[#BFA181] dark:text-[#BFA181]"
                      : "border-stone-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-stone-400 dark:hover:border-slate-600"
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
              <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">Gün</label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
                className="w-full bg-white dark:bg-slate-900 border border-stone-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-white"
              >
                {labels.days.map((day: string, i: number) => (
                  <option key={i} value={i}>{day}</option>
                ))}
              </select>
            </div>
          )}

          {frequency === "monthly" && (
            <div>
              <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">{labels.dayOfMonth}</label>
              <select
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(parseInt(e.target.value))}
                className="w-full bg-white dark:bg-slate-900 border border-stone-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-white"
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>
          )}

          {/* Payment Source */}
          <div>
            <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">{labels.paymentSource}</label>
            <p className="text-xs text-slate-500 dark:text-slate-500 mb-2">{labels.paymentSourceDesc}</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setPaymentSource("metal_balance")}
                className={`p-3 rounded-xl border transition-colors ${
                  paymentSource === "metal_balance"
                    ? "border-[#2F6F62] bg-[#2F6F62]/10"
                    : "border-stone-300 dark:border-slate-700 hover:border-stone-400 dark:hover:border-slate-600"
                }`}
              >
                <div className="text-slate-800 dark:text-white font-medium">🪙 Metal</div>
                <div className="text-xs text-slate-500 dark:text-slate-500">{getMetalBalance(selectedToken).toFixed(2)}g</div>
              </button>
              <button
                onClick={() => setPaymentSource("usd_balance")}
                className={`p-3 rounded-xl border transition-colors ${
                  paymentSource === "usd_balance"
                    ? "border-[#2F6F62] bg-[#2F6F62]/10"
                    : "border-stone-300 dark:border-slate-700 hover:border-stone-400 dark:hover:border-slate-600"
                }`}
              >
                <div className="text-slate-800 dark:text-white font-medium">USD</div>
                <div className="text-xs text-slate-500 dark:text-slate-500">${usdBalance.toFixed(2)}</div>
              </button>
              <button
                onClick={() => setPaymentSource("usdt_balance")}
                className={`p-3 rounded-xl border transition-colors ${
                  paymentSource === "usdt_balance"
                    ? "border-[#2F6F62] bg-[#2F6F62]/10"
                    : "border-stone-300 dark:border-slate-700 hover:border-stone-400 dark:hover:border-slate-600"
                }`}
              >
                <div className="text-slate-800 dark:text-white font-medium">USDT</div>
                <div className="text-xs text-slate-500 dark:text-slate-500">${usdtBalance.toFixed(2)}</div>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowCreate(false)}
              className="flex-1 py-3 bg-stone-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-stone-300 dark:hover:bg-slate-600"
            >
              {labels.cancel}
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !amount || parseFloat(amount) <= 0}
              className="flex-1 py-3 bg-[#2F6F62] text-white rounded-xl hover:bg-[#2F6F62] disabled:opacity-50"
            >
              {creating ? "..." : labels.create}
            </button>
          </div>
        </div>
      )}

      {/* Plans List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin w-8 h-8 border-2 border-stone-300 dark:border-slate-600 border-t-[#BFA181] rounded-full"></div>
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-8 text-slate-600 dark:text-slate-500">
          <p className="text-4xl mb-2">📋</p>
          <p>{labels.noPlans}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => {
            const token = TOKENS.find((t) => t.symbol === plan.token);
            return (
              <div key={plan.id} className="bg-stone-100 dark:bg-slate-800/50 rounded-xl p-4 border border-stone-300 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={token?.icon} alt={plan.token} className="w-10 h-10" />
                    <div>
                      <div className="font-medium text-slate-800 dark:text-white">
                        {plan.amount}g {plan.token} → {labels.durations[plan.stakeDuration]}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {labels.frequencies[plan.frequency]} • {labels.apyRates[plan.stakeDuration]} APY
                      </div>
                      {plan.stats.nextExecutionAt && (
                        <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                          {labels.nextExecution}: {new Date(plan.stats.nextExecutionAt).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US")}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    plan.status === "active" ? "bg-[#2F6F62]/20 text-[#2F6F62]" :
                    plan.status === "paused" ? "bg-[#BFA181]/20 text-[#BFA181]" :
                    "bg-slate-500/20 text-slate-400"
                  }`}>
                    {labels.status[plan.status]}
                  </span>
                </div>
                <div className="flex gap-2 mt-3">
                  {plan.status === "active" && (
                    <button
                      onClick={() => setConfirmModal({ show: true, type: "pause", planId: plan.id, planToken: plan.token })}
                      className="flex-1 py-2 bg-[#BFA181]/10 text-[#BFA181] rounded-lg text-sm hover:bg-[#BFA181]/20"
                    >
                      {labels.pause}
                    </button>
                  )}
                  {plan.status === "paused" && (
                    <button
                      onClick={() => setConfirmModal({ show: true, type: "resume", planId: plan.id, planToken: plan.token })}
                      className="flex-1 py-2 bg-[#2F6F62]/10 text-[#2F6F62] rounded-lg text-sm hover:bg-[#2F6F62]/20"
                    >
                      {labels.resume}
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmModal({ show: true, type: "delete", planId: plan.id, planToken: plan.token })}
                    className="py-2 px-4 bg-red-500/10 text-red-400 rounded-lg text-sm hover:bg-red-500/20"
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
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-300 dark:border-slate-700 max-w-sm w-full p-6">
            <div className="text-center mb-6">
              <div className="text-4xl mb-4">
                {confirmModal.type === "delete" ? "🗑️" : confirmModal.type === "pause" ? "⏸️" : "▶️"}
              </div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
                {confirmModal.planToken}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                {labels.confirmMessages[confirmModal.type]}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-3 bg-stone-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-stone-300 dark:hover:bg-slate-600"
              >
                {labels.cancel}
              </button>
              <button
                onClick={handleConfirmAction}
                className={`flex-1 py-3 rounded-xl text-white ${
                  confirmModal.type === "delete"
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-[#2F6F62] hover:bg-[#2F6F62]"
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

export default RecurringStakeManager;
