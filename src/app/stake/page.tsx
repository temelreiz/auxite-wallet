"use client";
import { useState, useEffect } from "react";
import { LeasingDashboard } from "@/components/LeasingDashboard";
import TopNav from "@/components/TopNav";
import { useLanguage } from "@/components/LanguageContext";
import { useLeaseRates } from "@/hooks/useLeaseRates";
import { useDemoMode } from "@/hooks/useDemoMode";
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
    demoYieldTitle: "Yield Programs in Demo Mode",
    demoYieldMessage: "Structured yield programs are available in real mode. Allocate metals first using your demo balance, then exit demo to enter yield programs.",
    demoMetalBalance: "Your Demo Metal Holdings",
    backToVault: "Back to Vault",
  },
  tr: {
    demoBadge: "Demo Modu",
    demoYieldTitle: "Demo Modunda Getiri Programları",
    demoYieldMessage: "Yapılandırılmış getiri programları gerçek modda kullanılabilir. Demo bakiyenizle metal tahsis edin, ardından getiri programlarına katılmak için demo modundan çıkın.",
    demoMetalBalance: "Demo Metal Varlıklarınız",
    backToVault: "Kasaya Dön",
  },
  de: {
    demoBadge: "Demo-Modus",
    demoYieldTitle: "Rendite im Demo-Modus",
    demoYieldMessage: "Strukturierte Rendite-Programme sind im Echtmodus verfügbar. Weisen Sie Metalle mit Ihrem Demo-Guthaben zu.",
    demoMetalBalance: "Demo-Metallbestände",
    backToVault: "Zurück zum Tresor",
  },
  fr: {
    demoBadge: "Mode Démo",
    demoYieldTitle: "Programmes de Rendement en Mode Démo",
    demoYieldMessage: "Les programmes de rendement structuré sont disponibles en mode réel.",
    demoMetalBalance: "Vos Métaux Démo",
    backToVault: "Retour au Coffre",
  },
  ar: {
    demoBadge: "الوضع التجريبي",
    demoYieldTitle: "برامج العائد في الوضع التجريبي",
    demoYieldMessage: "برامج العائد المهيكل متاحة في الوضع الحقيقي.",
    demoMetalBalance: "حيازاتك التجريبية",
    backToVault: "العودة إلى الخزنة",
  },
  ru: {
    demoBadge: "Демо-режим",
    demoYieldTitle: "Программы доходности в демо",
    demoYieldMessage: "Структурированные программы доходности доступны в реальном режиме.",
    demoMetalBalance: "Ваши демо-металлы",
    backToVault: "Назад к хранилищу",
  },
};

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

  const { demoActive, demoBalance } = useDemoMode(localWalletAddress);
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
          /* Demo Mode: Show informational card about yield programs */
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-purple-200 dark:border-purple-800 p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🎮</span>
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{dt.demoYieldTitle}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto mb-6">{dt.demoYieldMessage}</p>

              {/* Show demo metal balances if any */}
              {demoBalance && (demoBalance.auxg > 0 || demoBalance.auxs > 0 || demoBalance.auxpt > 0 || demoBalance.auxpd > 0) && (
                <div className="mb-6">
                  <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-3">{dt.demoMetalBalance}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-md mx-auto">
                    {demoBalance.auxg > 0 && (
                      <div className="p-3 rounded-xl bg-[#C6A15B]/10 border border-[#C6A15B]/20">
                        <p className="text-xs text-slate-500">AUXG</p>
                        <p className="text-sm font-bold text-[#C6A15B]">{demoBalance.auxg.toFixed(2)}g</p>
                      </div>
                    )}
                    {demoBalance.auxs > 0 && (
                      <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-slate-500">AUXS</p>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{demoBalance.auxs.toFixed(2)}g</p>
                      </div>
                    )}
                    {demoBalance.auxpt > 0 && (
                      <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-slate-500">AUXPT</p>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{demoBalance.auxpt.toFixed(2)}g</p>
                      </div>
                    )}
                    {demoBalance.auxpd > 0 && (
                      <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-slate-500">AUXPD</p>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{demoBalance.auxpd.toFixed(2)}g</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto">
                <Link
                  href="/allocate"
                  className="flex-1 px-6 py-3 rounded-xl bg-[#BFA181] text-white font-semibold text-sm transition-colors text-center"
                >
                  {t.step1Title}
                </Link>
                <Link
                  href="/vault"
                  className="flex-1 px-6 py-3 rounded-xl bg-stone-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm transition-colors text-center border border-stone-200 dark:border-slate-700"
                >
                  {dt.backToVault}
                </Link>
              </div>
            </div>
          </div>
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
