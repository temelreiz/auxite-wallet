"use client";
import { useState, useEffect, useCallback } from "react";
import { LeasingDashboard } from "@/components/LeasingDashboard";
import TopNav from "@/components/TopNav";
import { useLanguage } from "@/components/LanguageContext";
import { useLeaseRates } from "@/hooks/useLeaseRates";
import { useDemoMode } from "@/hooks/useDemoMode";
import type { DemoLease } from "@/hooks/useDemoMode";
import Link from "next/link";

const STORAGE_KEYS = {
  HAS_WALLET: "auxite_has_wallet",
  WALLET_ADDRESS: "auxite_wallet_address",
  WALLET_MODE: "auxite_wallet_mode",
  SESSION_UNLOCKED: "auxite_session_unlocked",
};

const translations: Record<string, Record<string, string>> = {
  tr: {
    pageTitle: "Kıymetli Maden Yapılandırılmış Getiri Programı",
    pageDesc: "Kurumsal kıymetli maden getiri programlarına katılın",
    walletRequired: "Giriş Gerekli",
    connectWalletDesc: "Getiri programına katılmak için hesabınıza giriş yapın",
    yieldBadge: "SOFR + GOFO Tabanlı",
    signIn: "Giriş Yap",
    createAccount: "Hesap Oluştur",
    yieldFormula: "Getiri = SOFR - GOFO + Platform Marjı",
    institutionalGrade: "Kurumsal Seviye Yapılandırılmış Getiri",
    howItWorks: "Nasıl Çalışır?",
    step1Title: "Varlık Tahsis Et",
    step1Desc: "Metal tokenlarınızı getiri programına tahsis edin",
    step2Title: "Vade Seçin",
    step2Desc: "3, 6 veya 12 aylık vade seçeneklerinden birini seçin",
    step3Title: "Getiri Elde Edin",
    step3Desc: "SOFR + GOFO bazlı kurumsal yapılandırılmış getiri elde edin",
    securedBy: "NY Fed SOFR ile Desteklenir",
    realTimeRates: "Gerçek Zamanlı Oranlar",
  },
  en: {
    pageTitle: "Precious Metals Structured Yield Program",
    pageDesc: "Participate in institutional precious metals yield programs",
    walletRequired: "Sign In Required",
    connectWalletDesc: "Sign in to your account to access yield programs",
    yieldBadge: "SOFR + GOFO Based",
    signIn: "Sign In",
    createAccount: "Create Account",
    yieldFormula: "Yield = SOFR - GOFO + Platform Margin",
    institutionalGrade: "Institutional-Grade Structured Yield",
    howItWorks: "How It Works",
    step1Title: "Allocate Assets",
    step1Desc: "Allocate your metal tokens to the yield program",
    step2Title: "Choose Term",
    step2Desc: "Select from 3, 6, or 12 month term options",
    step3Title: "Earn Returns",
    step3Desc: "Earn institutional yield returns based on SOFR + GOFO",
    securedBy: "Secured by NY Fed SOFR",
    realTimeRates: "Real-Time Rates",
  },
  de: {
    pageTitle: "Edelmetall-Strukturierte Rendite",
    pageDesc: "Nehmen Sie an institutionellen Edelmetall-Rendite-Programmen teil",
    walletRequired: "Anmeldung erforderlich",
    connectWalletDesc: "Melden Sie sich an, um auf Rendite-Programme zuzugreifen",
    yieldBadge: "SOFR + GOFO Basiert",
    signIn: "Anmelden",
    createAccount: "Konto erstellen",
    yieldFormula: "Rendite = SOFR - GOFO + Plattformmarge",
    institutionalGrade: "Institutionelle Strukturierte Rendite",
    howItWorks: "So funktioniert es",
    step1Title: "Vermögen zuweisen",
    step1Desc: "Weisen Sie Ihre Metalltoken dem Rendite-Programm zu",
    step2Title: "Laufzeit wählen",
    step2Desc: "Wählen Sie aus 3, 6 oder 12 Monaten Laufzeit",
    step3Title: "Erträge erhalten",
    step3Desc: "Erhalten Sie institutionelle Rendite-Erträge basierend auf SOFR + GOFO",
    securedBy: "Gesichert durch NY Fed SOFR",
    realTimeRates: "Echtzeit-Kurse",
  },
  fr: {
    pageTitle: "Rendement Structuré des Métaux Précieux",
    pageDesc: "Participez aux programmes institutionnels de rendement structuré des métaux précieux",
    walletRequired: "Connexion requise",
    connectWalletDesc: "Connectez-vous pour accéder aux programmes de rendement",
    yieldBadge: "Basé sur SOFR + GOFO",
    signIn: "Se connecter",
    createAccount: "Créer un compte",
    yieldFormula: "Rendement = SOFR - GOFO + Marge Plateforme",
    institutionalGrade: "Rendement Structuré Institutionnel",
    howItWorks: "Comment ça marche",
    step1Title: "Allouer des actifs",
    step1Desc: "Allouez vos tokens métalliques au programme de rendement",
    step2Title: "Choisir la durée",
    step2Desc: "Sélectionnez parmi les options de 3, 6 ou 12 mois",
    step3Title: "Obtenir des rendements",
    step3Desc: "Obtenez des rendements structurés institutionnels basés sur SOFR + GOFO",
    securedBy: "Sécurisé par NY Fed SOFR",
    realTimeRates: "Taux en temps réel",
  },
  ar: {
    pageTitle: "العائد المهيكل للمعادن الثمينة",
    pageDesc: "شارك في برامج العائد المهيكل للمعادن الثمينة المؤسسية",
    walletRequired: "تسجيل الدخول مطلوب",
    connectWalletDesc: "سجل دخولك للوصول إلى برامج العائد",
    yieldBadge: "مبني على SOFR + GOFO",
    signIn: "تسجيل الدخول",
    createAccount: "إنشاء حساب",
    yieldFormula: "العائد = SOFR - GOFO + هامش المنصة",
    institutionalGrade: "العائد المهيكل المؤسسي",
    howItWorks: "كيف يعمل",
    step1Title: "تخصيص الأصول",
    step1Desc: "خصص رموز المعادن الخاصة بك لبرنامج العائد",
    step2Title: "اختر المدة",
    step2Desc: "اختر من خيارات 3 أو 6 أو 12 شهرًا",
    step3Title: "احصل على العوائد",
    step3Desc: "احصل على عوائد مهيكلة مؤسسية بناءً على SOFR + GOFO",
    securedBy: "مؤمن بواسطة NY Fed SOFR",
    realTimeRates: "أسعار في الوقت الفعلي",
  },
  ru: {
    pageTitle: "Структурированная Доходность Драгоценных Металлов",
    pageDesc: "Участвуйте в институциональных программах доходности драгоценных металлов",
    walletRequired: "Требуется вход",
    connectWalletDesc: "Войдите в аккаунт для доступа к программам доходности",
    yieldBadge: "На базе SOFR + GOFO",
    signIn: "Войти",
    createAccount: "Создать аккаунт",
    yieldFormula: "Доход = SOFR - GOFO + Маржа Платформы",
    institutionalGrade: "Институциональная Структурированная Доходность",
    howItWorks: "Как это работает",
    step1Title: "Распределить активы",
    step1Desc: "Распределите ваши металлические токены в программу доходности",
    step2Title: "Выбрать срок",
    step2Desc: "Выберите из вариантов на 3, 6 или 12 месяцев",
    step3Title: "Получить доходы",
    step3Desc: "Получайте институциональные доходы от структурированной доходности на основе SOFR + GOFO",
    securedBy: "Обеспечено NY Fed SOFR",
    realTimeRates: "Котировки в реальном времени",
  },
};

const demoStakeTranslations: Record<string, Record<string, string>> = {
  en: {
    demoBadge: "Demo Mode",
    demoYieldTitle: "Demo Yield Program",
    demoYieldMessage: "Lease your demo metals to earn simulated yield returns.",
    demoMetalBalance: "Your Demo Metal Holdings",
    backToVault: "Back to Vault",
    selectMetal: "Select Metal to Lease",
    amount: "Amount (grams)",
    selectTerm: "Select Term",
    months3: "3 Months",
    months6: "6 Months",
    months12: "12 Months",
    estimatedYield: "Estimated Yield",
    apy: "APY",
    startLease: "Start Lease",
    processing: "Processing...",
    leaseSuccess: "Lease Started",
    leaseSuccessMsg: "Your {amount}g {metal} has been leased for {term} at {apy}% APY. Estimated yield: {yield}g",
    leaseAnother: "Lease More",
    activeLeases: "Active Demo Leases",
    noLeases: "No active leases",
    maturityDate: "Maturity",
    insufficientBalance: "Insufficient demo balance",
    noMetalHoldings: "No metal holdings to lease. Go to Allocate to buy metals first.",
  },
  tr: {
    demoBadge: "Demo Modu",
    demoYieldTitle: "Demo Getiri Programi",
    demoYieldMessage: "Demo metallerinizi kiralayarak simule edilmis getiri elde edin.",
    demoMetalBalance: "Demo Metal Varliklariniz",
    backToVault: "Kasaya Don",
    selectMetal: "Kiralanacak Metali Secin",
    amount: "Miktar (gram)",
    selectTerm: "Vade Secin",
    months3: "3 Ay",
    months6: "6 Ay",
    months12: "12 Ay",
    estimatedYield: "Tahmini Getiri",
    apy: "APY",
    startLease: "Kirayi Baslat",
    processing: "Isleniyor...",
    leaseSuccess: "Kira Basladi",
    leaseSuccessMsg: "{amount}g {metal} metaliniz {term} sureyle %{apy} APY ile kiralanmistir. Tahmini getiri: {yield}g",
    leaseAnother: "Daha Fazla Kirala",
    activeLeases: "Aktif Demo Kiralari",
    noLeases: "Aktif kira yok",
    maturityDate: "Vade Tarihi",
    insufficientBalance: "Yetersiz demo bakiye",
    noMetalHoldings: "Kiralanacak metal yok. Once Tahsis sayfasindan metal alin.",
  },
  de: {
    demoBadge: "Demo-Modus",
    demoYieldTitle: "Demo-Rendite-Programm",
    demoYieldMessage: "Verleihen Sie Ihre Demo-Metalle fur simulierte Renditen.",
    demoMetalBalance: "Demo-Metallbestande",
    backToVault: "Zuruck zum Tresor",
    selectMetal: "Metall zum Verleihen wahlen",
    amount: "Betrag (Gramm)",
    selectTerm: "Laufzeit wahlen",
    months3: "3 Monate",
    months6: "6 Monate",
    months12: "12 Monate",
    estimatedYield: "Geschatzte Rendite",
    apy: "APY",
    startLease: "Leasing starten",
    processing: "Verarbeitung...",
    leaseSuccess: "Leasing gestartet",
    leaseSuccessMsg: "Ihre {amount}g {metal} wurden fur {term} bei {apy}% APY geleast.",
    leaseAnother: "Mehr leasen",
    activeLeases: "Aktive Demo-Leasings",
    noLeases: "Keine aktiven Leasings",
    maturityDate: "Falligkeit",
    insufficientBalance: "Unzureichendes Guthaben",
    noMetalHoldings: "Keine Metalle zum Leasen. Gehen Sie zu Zuweisen.",
  },
  fr: {
    demoBadge: "Mode Demo",
    demoYieldTitle: "Programme de rendement demo",
    demoYieldMessage: "Louez vos metaux demo pour obtenir des rendements simules.",
    demoMetalBalance: "Vos Metaux Demo",
    backToVault: "Retour au Coffre",
    selectMetal: "Selectionnez le metal a louer",
    amount: "Montant (grammes)",
    selectTerm: "Selectionnez la duree",
    months3: "3 Mois",
    months6: "6 Mois",
    months12: "12 Mois",
    estimatedYield: "Rendement estime",
    apy: "APY",
    startLease: "Demarrer le bail",
    processing: "Traitement...",
    leaseSuccess: "Bail demarre",
    leaseSuccessMsg: "Vos {amount}g {metal} ont ete loues pour {term} a {apy}% APY.",
    leaseAnother: "Louer plus",
    activeLeases: "Baux demo actifs",
    noLeases: "Aucun bail actif",
    maturityDate: "Echeance",
    insufficientBalance: "Solde insuffisant",
    noMetalHoldings: "Pas de metaux a louer. Allez a Allouer.",
  },
  ar: {
    demoBadge: "الوضع التجريبي",
    demoYieldTitle: "برنامج العائد التجريبي",
    demoYieldMessage: "قم بتاجير معادنك التجريبية لكسب عوائد محاكاة.",
    demoMetalBalance: "حيازاتك التجريبية",
    backToVault: "العودة الى الخزنة",
    selectMetal: "اختر المعدن للتاجير",
    amount: "الكمية (جرام)",
    selectTerm: "اختر المدة",
    months3: "3 اشهر",
    months6: "6 اشهر",
    months12: "12 شهر",
    estimatedYield: "العائد المقدر",
    apy: "APY",
    startLease: "بدء التاجير",
    processing: "جاري المعالجة...",
    leaseSuccess: "بدا التاجير",
    leaseSuccessMsg: "تم تاجير {amount}g {metal} لمدة {term} بنسبة {apy}% APY.",
    leaseAnother: "تاجير المزيد",
    activeLeases: "التاجيرات التجريبية النشطة",
    noLeases: "لا توجد تاجيرات نشطة",
    maturityDate: "تاريخ الاستحقاق",
    insufficientBalance: "رصيد غير كاف",
    noMetalHoldings: "لا توجد معادن للتاجير.",
  },
  ru: {
    demoBadge: "Демо-режим",
    demoYieldTitle: "Демо программа доходности",
    demoYieldMessage: "Сдайте демо-металлы в аренду для получения симулированной доходности.",
    demoMetalBalance: "Ваши демо-металлы",
    backToVault: "Назад к хранилищу",
    selectMetal: "Выберите металл для аренды",
    amount: "Количество (грамм)",
    selectTerm: "Выберите срок",
    months3: "3 месяца",
    months6: "6 месяцев",
    months12: "12 месяцев",
    estimatedYield: "Ожидаемая доходность",
    apy: "APY",
    startLease: "Начать аренду",
    processing: "Обработка...",
    leaseSuccess: "Аренда начата",
    leaseSuccessMsg: "Ваши {amount}г {metal} сданы в аренду на {term} под {apy}% APY.",
    leaseAnother: "Арендовать еще",
    activeLeases: "Активные демо-аренды",
    noLeases: "Нет активных аренд",
    maturityDate: "Дата погашения",
    insufficientBalance: "Недостаточный баланс",
    noMetalHoldings: "Нет металлов для аренды.",
  },
};

// ============================================
// DEMO LEASE PANEL
// ============================================

const LEASE_METALS = [
  { symbol: "AUXG", name: "Gold", key: "auxg", color: "#C6A15B" },
  { symbol: "AUXS", name: "Silver", key: "auxs", color: "#94A3B8" },
  { symbol: "AUXPT", name: "Platinum", key: "auxpt", color: "#CBD5E1" },
  { symbol: "AUXPD", name: "Palladium", key: "auxpd", color: "#64748B" },
];

const LEASE_TERM_OPTIONS = [
  { days: 90, apyBase: 2.5 },
  { days: 180, apyBase: 3.2 },
  { days: 365, apyBase: 4.1 },
];

function DemoLeasePanel({
  dt,
  demoBalance,
  executeDemoLease,
  fetchDemoLeases,
  refreshDemo,
  allocateLabel,
  backToVaultLabel,
}: {
  dt: Record<string, string>;
  demoBalance: import("@/hooks/useDemoMode").DemoBalance | null;
  executeDemoLease: (params: { fromAsset: string; fromAmount: number; termDays: number }) => Promise<{ success: boolean; lease?: DemoLease; transaction?: any; error?: string }>;
  fetchDemoLeases: () => Promise<DemoLease[]>;
  refreshDemo: () => Promise<void>;
  allocateLabel: string;
  backToVaultLabel: string;
}) {
  const [selectedMetal, setSelectedMetal] = useState("AUXG");
  const [amount, setAmount] = useState("");
  const [termDays, setTermDays] = useState(90);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<DemoLease | null>(null);
  const [leases, setLeases] = useState<DemoLease[]>([]);

  useEffect(() => {
    fetchDemoLeases().then(setLeases);
  }, [fetchDemoLeases]);

  const metalKey = selectedMetal.toLowerCase();
  const available = demoBalance?.[metalKey] || 0;
  const hasAnyMetal = LEASE_METALS.some(m => (demoBalance?.[m.key] || 0) > 0);

  const termConfig = LEASE_TERM_OPTIONS.find(t => t.days === termDays) || LEASE_TERM_OPTIONS[0];
  const numAmount = parseFloat(amount) || 0;
  const estimatedYield = numAmount * (termConfig.apyBase / 100) * (termDays / 365);

  const termLabels: Record<number, string> = {
    90: dt.months3,
    180: dt.months6,
    365: dt.months12,
  };

  const handleLease = async () => {
    if (!numAmount || numAmount <= 0) return;
    if (numAmount > available) {
      setError(dt.insufficientBalance);
      return;
    }

    setLoading(true);
    setError(null);

    const result = await executeDemoLease({
      fromAsset: selectedMetal,
      fromAmount: numAmount,
      termDays,
    });

    setLoading(false);

    if (result.success && result.lease) {
      setSuccess(result.lease);
      setAmount("");
      await refreshDemo();
      const updated = await fetchDemoLeases();
      setLeases(updated);
    } else {
      setError(result.error || "Lease failed");
    }
  };

  if (success) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-green-200 dark:border-green-800 p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{dt.leaseSuccess}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
            {dt.leaseSuccessMsg
              .replace("{amount}", success.amount.toFixed(2))
              .replace("{metal}", success.metal)
              .replace("{term}", success.termLabel)
              .replace("{apy}", success.apyPercent.toString())
              .replace("{yield}", success.estimatedYieldGrams.toFixed(4))}
          </p>
          <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto mb-6 text-left">
            <div className="p-3 rounded-lg bg-stone-50 dark:bg-slate-800">
              <p className="text-xs text-slate-500">{dt.apy}</p>
              <p className="text-sm font-bold text-[#BFA181]">{success.apyPercent}%</p>
            </div>
            <div className="p-3 rounded-lg bg-stone-50 dark:bg-slate-800">
              <p className="text-xs text-slate-500">{dt.maturityDate}</p>
              <p className="text-sm font-bold text-slate-700 dark:text-white">{new Date(success.maturityDate).toLocaleDateString()}</p>
            </div>
          </div>
          <button
            onClick={() => setSuccess(null)}
            className="px-6 py-3 rounded-xl bg-[#BFA181] text-white font-semibold text-sm"
          >
            {dt.leaseAnother}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Lease Form */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-purple-200 dark:border-purple-800 p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🎮</span>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">{dt.demoYieldTitle}</h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">{dt.demoYieldMessage}</p>

        {!hasAnyMetal ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{dt.noMetalHoldings}</p>
            <Link
              href="/allocate"
              className="inline-block px-6 py-3 rounded-xl bg-[#BFA181] text-white font-semibold text-sm"
            >
              {allocateLabel}
            </Link>
          </div>
        ) : (
          <>
            {/* Metal Selection */}
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
              {dt.selectMetal}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {LEASE_METALS.filter(m => (demoBalance?.[m.key] || 0) > 0).map(metal => (
                <button
                  key={metal.symbol}
                  onClick={() => { setSelectedMetal(metal.symbol); setAmount(""); setError(null); }}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    selectedMetal === metal.symbol
                      ? `border-[${metal.color}] bg-[${metal.color}]/10`
                      : "border-stone-200 dark:border-slate-700"
                  }`}
                  style={selectedMetal === metal.symbol ? { borderColor: metal.color, backgroundColor: `${metal.color}15` } : {}}
                >
                  <div className="text-sm font-bold text-slate-800 dark:text-white">{metal.symbol}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{(demoBalance?.[metal.key] || 0).toFixed(2)}g</div>
                </button>
              ))}
            </div>

            {/* Amount */}
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
              {dt.amount}
            </label>
            <div className="flex items-center gap-2 mb-4">
              <input
                type="number"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setError(null); }}
                placeholder="0.00"
                className="flex-1 px-4 py-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 text-slate-800 dark:text-white text-sm font-mono"
              />
              <button
                onClick={() => setAmount(available.toString())}
                className="px-3 py-3 rounded-xl bg-stone-100 dark:bg-slate-800 text-xs font-semibold text-[#BFA181] border border-stone-200 dark:border-slate-700"
              >
                MAX
              </button>
            </div>

            {/* Term Selection */}
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
              {dt.selectTerm}
            </label>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {LEASE_TERM_OPTIONS.map(opt => (
                <button
                  key={opt.days}
                  onClick={() => setTermDays(opt.days)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    termDays === opt.days
                      ? "border-[#BFA181] bg-[#BFA181]/10"
                      : "border-stone-200 dark:border-slate-700"
                  }`}
                >
                  <div className="text-sm font-bold text-slate-800 dark:text-white">{termLabels[opt.days]}</div>
                  <div className="text-xs text-[#BFA181] font-semibold mt-0.5">{opt.apyBase}% {dt.apy}</div>
                </button>
              ))}
            </div>

            {/* Yield Preview */}
            {numAmount > 0 && (
              <div className="mb-4 p-4 rounded-xl bg-[#BFA181]/5 border border-[#BFA181]/20">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">{dt.estimatedYield}</span>
                  <span className="text-sm font-bold text-[#BFA181]">+{estimatedYield.toFixed(4)}g {selectedMetal}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-slate-500">{dt.apy}</span>
                  <span className="text-sm font-semibold text-slate-700 dark:text-white">{termConfig.apyBase}%</span>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <button
              onClick={handleLease}
              disabled={loading || !numAmount}
              className="w-full py-3 rounded-xl bg-[#BFA181] text-white font-semibold text-sm disabled:opacity-40 transition-all"
            >
              {loading ? dt.processing : dt.startLease}
            </button>
          </>
        )}
      </div>

      {/* Active Demo Leases */}
      {leases.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-slate-800 p-6">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">{dt.activeLeases}</h4>
          <div className="space-y-3">
            {leases.map((lease) => (
              <div key={lease.id} className="flex items-center justify-between py-3 px-4 rounded-xl bg-stone-50 dark:bg-slate-800/50 border border-stone-200 dark:border-slate-700">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-800 dark:text-white">{lease.amount}g {lease.metal}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">{lease.apyPercent}% APY</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {dt.estimatedYield}: +{lease.estimatedYieldGrams.toFixed(4)}g
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">{dt.maturityDate}</div>
                  <div className="text-sm font-mono text-slate-700 dark:text-slate-300">{new Date(lease.maturityDate).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto">
        <Link
          href="/allocate"
          className="flex-1 px-6 py-3 rounded-xl bg-[#BFA181] text-white font-semibold text-sm transition-colors text-center"
        >
          {allocateLabel}
        </Link>
        <Link
          href="/vault"
          className="flex-1 px-6 py-3 rounded-xl bg-stone-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm transition-colors text-center border border-stone-200 dark:border-slate-700"
        >
          {backToVaultLabel}
        </Link>
      </div>
    </div>
  );
}

export default function StakePage() {
  const { lang } = useLanguage();
  const t = translations[lang] || translations.en;
  const dt = demoStakeTranslations[lang] || demoStakeTranslations.en;

  const [localWalletAddress, setLocalWalletAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch real-time SOFR + GOFO rates
  const { sofr, gofo, leaseOffers, isLoading: ratesLoading, lastUpdated, source, formatAPYRange } = useLeaseRates({ lang: lang as "tr" | "en" });

  useEffect(() => {
    const localAddress = localStorage.getItem(STORAGE_KEYS.WALLET_ADDRESS);
    if (localAddress) {
      setLocalWalletAddress(localAddress);
    }
    setIsLoading(false);
  }, []);

  const { demoActive, demoBalance, executeDemoLease, fetchDemoLeases, refreshDemo } = useDemoMode(localWalletAddress);
  const isWalletConnected = !!localWalletAddress;

  if (isLoading) {
    return (
      <main className="min-h-screen bg-stone-100 dark:bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-stone-300 dark:border-slate-600 border-t-[#BFA181] rounded-full"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-100 dark:bg-slate-950 text-slate-900 dark:text-white pb-20 sm:pb-0">
      <TopNav />

      {/* Page Header - Mobile Optimized */}
      <div className="border-b border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-1">
                {t.pageTitle}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {t.pageDesc}
              </p>
            </div>
            {/* SOFR + GOFO Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#BFA181]/10 border border-[#BFA181]/20">
              <div className="w-2 h-2 rounded-full bg-[#BFA181] animate-pulse"></div>
              <span className="text-xs font-medium text-[#BFA181] dark:text-[#BFA181]">{t.yieldBadge}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Mode Banner */}
      {demoActive && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div className="flex items-center gap-2 px-4 py-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
            <span className="text-lg">🎮</span>
            <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">{dt.demoBadge}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
        {isWalletConnected && localWalletAddress && demoActive ? (
          /* Demo Mode: Functional lease form */
          <DemoLeasePanel
            dt={dt}
            demoBalance={demoBalance}
            executeDemoLease={executeDemoLease}
            fetchDemoLeases={fetchDemoLeases}
            refreshDemo={refreshDemo}
            allocateLabel={t.step1Title}
            backToVaultLabel={dt.backToVault}
          />
        ) : isWalletConnected && localWalletAddress ? (
          <LeasingDashboard walletAddress={localWalletAddress} />
        ) : (
          <div className="space-y-6">
            {/* Sign In Card - Mobile First */}
            <div className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 sm:p-8 text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-2xl bg-gradient-to-br from-[#BFA181]/20 to-[#BFA181]/80/20 flex items-center justify-center">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white mb-2">
                {t.walletRequired}
              </h2>
              <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
                {t.connectWalletDesc}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto">
                <Link
                  href="/auth/login"
                  className="flex-1 px-6 py-3 rounded-xl bg-[#BFA181] hover:bg-[#BFA181] text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  {t.signIn}
                </Link>
                <Link
                  href="/auth/register"
                  className="flex-1 px-6 py-3 rounded-xl bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm transition-colors flex items-center justify-center gap-2 border border-stone-200 dark:border-slate-700"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  {t.createAccount}
                </Link>
              </div>
            </div>

            {/* How It Works - Mobile Optimized */}
            <div className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <span className="text-sm">💡</span>
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-white">{t.howItWorks}</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { num: 1, title: t.step1Title, desc: t.step1Desc, icon: "📦" },
                  { num: 2, title: t.step2Title, desc: t.step2Desc, icon: "📅" },
                  { num: 3, title: t.step3Title, desc: t.step3Desc, icon: "💰" },
                ].map((step) => (
                  <div key={step.num} className="flex sm:flex-col items-start sm:items-center gap-3 sm:gap-2 p-3 sm:p-4 rounded-xl bg-stone-50 dark:bg-slate-800/50">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#BFA181]/10 flex items-center justify-center text-xl sm:text-2xl shrink-0">
                      {step.icon}
                    </div>
                    <div className="sm:text-center">
                      <div className="text-xs text-[#BFA181] font-semibold mb-0.5">Step {step.num}</div>
                      <div className="text-sm font-medium text-slate-800 dark:text-white mb-1">{step.title}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{step.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Yield Formula Info - Institutional Navy + Gold */}
            <div className="rounded-2xl border border-slate-700/30 bg-slate-900/50 dark:bg-slate-900/80 p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#d4a574]/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#d4a574]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-200">{t.institutionalGrade}</div>
                    <div className="text-xs text-slate-400">{t.securedBy}</div>
                  </div>
                </div>
                <div className="px-4 py-2 rounded-lg bg-slate-800 border border-[#d4a574]/20">
                  <code className="text-xs sm:text-sm font-mono text-[#E7D2A8]">
                    APY = SOFR - GOFO + Margin
                  </code>
                </div>
              </div>
            </div>

            {/* SOFR + GOFO Live Display */}
            <div className="rounded-2xl border border-[#BFA181]/20 bg-gradient-to-r from-[#BFA181]/10 to-orange-50 dark:from-[#BFA181]/5 dark:to-orange-500/5 p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#BFA181]/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#BFA181] dark:text-[#BFA181]">{t.realTimeRates}</div>
                    <div className="text-xs text-[#BFA181] dark:text-[#BFA181]">{source || "NY Fed + Calculated"}</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-[#BFA181]/20">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wide">SOFR</div>
                    <div className="text-lg font-bold text-[#BFA181] dark:text-[#BFA181]">{sofr?.toFixed(2) || "4.33"}%</div>
                  </div>
                  <div className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-[#BFA181]/20">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wide">GOFO</div>
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{gofo?.toFixed(2) || "1.50"}%</div>
                  </div>
                </div>
              </div>

              {/* APY Formula Display */}
              <div className="p-3 rounded-lg bg-white/50 dark:bg-slate-800/50 border border-[#BFA181]/10 mb-4">
                <code className="text-xs sm:text-sm font-mono text-slate-600 dark:text-slate-400">
                  Base Rate = {sofr?.toFixed(2) || "4.33"}% (SOFR) - {gofo?.toFixed(2) || "1.50"}% (GOFO) = <span className="text-[#D4B47A] font-bold">{((sofr || 4.33) - (gofo || 1.5)).toFixed(2)}%</span>
                </code>
              </div>
            </div>

            {/* Live Rates Preview */}
            <div className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#d4a574] animate-pulse"></div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{lang === "tr" ? "Metal APY Oranları" : "Metal APY Rates"}</span>
                </div>
                {lastUpdated && (
                  <span className="text-xs text-slate-500">
                    {lang === "tr" ? "Son güncelleme: " : "Updated: "}{new Date(lastUpdated).toLocaleTimeString()}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {leaseOffers.map((offer) => (
                  <div key={offer.metal} className="p-3 rounded-xl bg-stone-50 dark:bg-slate-800/50 border border-stone-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                      <img src={offer.icon} alt={offer.name} className="w-6 h-6" />
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{offer.symbol}</span>
                    </div>
                    <div className="text-lg font-bold text-[#D4B47A]">{formatAPYRange(offer)}</div>
                    <div className="text-xs text-slate-500">{offer.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
