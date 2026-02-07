"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useLanguage, LANGUAGES, getLanguageData } from "@/components/LanguageContext";
import { GlobalTrustBar } from "@/components/GlobalTrustBar";

// ============================================
// 6-LANGUAGE TRANSLATIONS
// ============================================
// ============================================
// INSTITUTIONAL NAVIGATION - MASTER BLUEPRINT
// Menu: Vault | Allocate | Yield | Transfers | Ledger | Documents | Trust Center | Client Center
// ============================================
const translations: Record<string, Record<string, string>> = {
  tr: {
    // Core Navigation - Institutional
    vault: "Kasa",
    allocate: "Tahsis",
    yield: "Getiri",
    transfers: "Transferler",
    ledger: "Sermaye Defteri",
    documents: "Belgeler",
    trustCenter: "Güven Merkezi",
    clientCenter: "Müşteri Merkezi",

    // Trust dropdown
    trust: "Güven",
    verify: "Sertifika Doğrula",
    legal: "Yasal",
    reserves: "Rezervler",
    audits: "Denetimler",
    custody: "Saklama",
    supply: "Arz",

    // Actions
    actions: "İşlemler",
    autoInvest: "Otomatik Yatırım",
    physicalDelivery: "Fiziksel Teslimat",
    priceAlerts: "Fiyat Uyarıları",
    security: "Güvenlik",
    advancedSecurity: "Gelişmiş Güvenlik",

    // UI
    lightMode: "Aydınlık Mod",
    darkMode: "Karanlık Mod",
    backed: "Destekli",

    // Deprecated
    markets: "Piyasalar",
    stake: "Yapılandırılmış Getiri",
    wallet: "Kasa",
    profile: "Profil",
  },
  en: {
    // Core Navigation - Institutional
    vault: "Vault",
    allocate: "Allocate",
    yield: "Yield",
    transfers: "Transfers",
    ledger: "Capital Ledger",
    documents: "Documents",
    trustCenter: "Trust Center",
    clientCenter: "Client Center",

    // Trust dropdown
    trust: "Trust",
    verify: "Verify Certificate",
    legal: "Legal",
    reserves: "Reserves",
    audits: "Audits",
    custody: "Custody",
    supply: "Supply",

    // Actions
    actions: "Actions",
    autoInvest: "Auto-Invest",
    physicalDelivery: "Physical Delivery",
    priceAlerts: "Price Alerts",
    security: "Security",
    advancedSecurity: "Advanced Security",

    // UI
    lightMode: "Light Mode",
    darkMode: "Dark Mode",
    backed: "Backed",

    // Deprecated
    markets: "Markets",
    stake: "Structured Yield",
    wallet: "Vault",
    profile: "Profile",
  },
  de: {
    vault: "Tresor",
    allocate: "Zuweisung",
    yield: "Rendite",
    transfers: "Überweisungen",
    ledger: "Kapitalhauptbuch",
    documents: "Dokumente",
    trustCenter: "Vertrauenszentrum",
    clientCenter: "Kundenzentrum",
    trust: "Vertrauen",
    verify: "Zertifikat Prüfen",
    legal: "Rechtliches",
    reserves: "Reserven",
    audits: "Prüfungen",
    custody: "Verwahrung",
    supply: "Angebot",
    actions: "Aktionen",
    autoInvest: "Auto-Invest",
    physicalDelivery: "Physische Lieferung",
    priceAlerts: "Preisalarme",
    security: "Sicherheit",
    advancedSecurity: "Erweiterte Sicherheit",
    lightMode: "Heller Modus",
    darkMode: "Dunkler Modus",
    backed: "Gedeckt",
    markets: "Märkte",
    stake: "Strukturierte Rendite",
    wallet: "Tresor",
    profile: "Profil",
  },
  fr: {
    vault: "Coffre",
    allocate: "Allouer",
    yield: "Rendement",
    transfers: "Transferts",
    ledger: "Grand Livre Capital",
    documents: "Documents",
    trustCenter: "Centre de Confiance",
    clientCenter: "Centre Client",
    trust: "Confiance",
    verify: "Vérifier Certificat",
    legal: "Juridique",
    reserves: "Réserves",
    audits: "Audits",
    custody: "Garde",
    supply: "Offre",
    actions: "Actions",
    autoInvest: "Auto-Invest",
    physicalDelivery: "Livraison Physique",
    priceAlerts: "Alertes de Prix",
    security: "Sécurité",
    advancedSecurity: "Sécurité Avancée",
    lightMode: "Mode Clair",
    darkMode: "Mode Sombre",
    backed: "Soutenu",
    markets: "Marchés",
    stake: "Rendement Structuré",
    wallet: "Coffre",
    profile: "Profil",
  },
  ar: {
    vault: "الخزنة",
    allocate: "تخصيص",
    yield: "العائد",
    transfers: "التحويلات",
    ledger: "دفتر رأس المال",
    documents: "المستندات",
    trustCenter: "مركز الثقة",
    clientCenter: "مركز العملاء",
    trust: "الثقة",
    verify: "تحقق من الشهادة",
    legal: "قانوني",
    reserves: "الاحتياطيات",
    audits: "التدقيق",
    custody: "الحفظ",
    supply: "العرض",
    actions: "الإجراءات",
    autoInvest: "الاستثمار التلقائي",
    physicalDelivery: "التسليم الفعلي",
    priceAlerts: "تنبيهات الأسعار",
    security: "الأمان",
    advancedSecurity: "الأمان المتقدم",
    lightMode: "الوضع الفاتح",
    darkMode: "الوضع الداكن",
    backed: "مدعوم",
    markets: "الأسواق",
    stake: "العائد المنظم",
    wallet: "الخزنة",
    profile: "الملف الشخصي",
  },
  ru: {
    vault: "Хранилище",
    allocate: "Распределить",
    yield: "Доходность",
    transfers: "Переводы",
    ledger: "Книга Капитала",
    documents: "Документы",
    trustCenter: "Центр Доверия",
    clientCenter: "Клиентский Центр",
    trust: "Доверие",
    verify: "Проверить Сертификат",
    legal: "Правовая",
    reserves: "Резервы",
    audits: "Аудиты",
    custody: "Хранение",
    supply: "Предложение",
    actions: "Действия",
    autoInvest: "Авто-инвест",
    physicalDelivery: "Физическая доставка",
    priceAlerts: "Ценовые оповещения",
    security: "Безопасность",
    advancedSecurity: "Расширенная безопасность",
    lightMode: "Светлый режим",
    darkMode: "Темный режим",
    backed: "Обеспечено",
    markets: "Рынки",
    stake: "Структурированная Доходность",
    wallet: "Хранилище",
    profile: "Профиль",
  },
};

interface TopNavProps {
  onShowRecurringBuy?: () => void;
  onShowPhysicalDelivery?: () => void;
  onShowPriceAlerts?: () => void;
  onShowSecurity?: () => void;
  onShowAdvancedSecurity?: () => void;
  showWalletActions?: boolean;
}

export default function TopNav({
  onShowRecurringBuy,
  onShowPhysicalDelivery,
  onShowPriceAlerts,
  onShowSecurity,
  onShowAdvancedSecurity,
  showWalletActions = false,
}: TopNavProps) {
  const { lang, setLang } = useLanguage();
  const pathname = usePathname();
  const t = translations[lang] || translations.en;
  const currentLangData = getLanguageData(lang);

  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [trustDropdownOpen, setTrustDropdownOpen] = useState(false);

  // QR Login state - check localStorage
  const [localWalletAddress, setLocalWalletAddress] = useState<string | null>(null);
  const [walletMode, setWalletMode] = useState<string | null>(null);

  const langDropdownRef = useRef<HTMLDivElement>(null);
  const actionsDropdownRef = useRef<HTMLDivElement>(null);
  const trustDropdownRef = useRef<HTMLDivElement>(null);

  // Load QR login wallet from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem("auxite_wallet_mode");
    const savedAddress = localStorage.getItem("auxite_wallet_address");
    if (savedMode) setWalletMode(savedMode);
    if (savedAddress) setLocalWalletAddress(savedAddress);

    // Listen for storage changes (when QR login happens)
    const handleStorageChange = () => {
      const mode = localStorage.getItem("auxite_wallet_mode");
      const address = localStorage.getItem("auxite_wallet_address");
      setWalletMode(mode);
      setLocalWalletAddress(address);
    };

    window.addEventListener("storage", handleStorageChange);
    // Also listen for custom event for same-tab updates
    window.addEventListener("walletChanged", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("walletChanged", handleStorageChange);
    };
  }, []);

  // Detect if we're on wallet page
  const isWalletPage = pathname === "/wallet";
  const shouldShowWalletActions = showWalletActions || isWalletPage;

  // Theme initialization
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    window.dispatchEvent(new Event("themeChange"));
  };

  const handleLanguageSelect = (code: string) => {
    setLang(code as any);
    localStorage.setItem("auxite_language", code);
    setLangDropdownOpen(false);
    window.dispatchEvent(new Event("languageChange"));
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setLangDropdownOpen(false);
      }
      if (actionsDropdownRef.current && !actionsDropdownRef.current.contains(event.target as Node)) {
        setShowActionsDropdown(false);
      }
      if (trustDropdownRef.current && !trustDropdownRef.current.contains(event.target as Node)) {
        setTrustDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // INSTITUTIONAL NAVIGATION - Digital Asset Custody Console
  // No "wallet" word anywhere - only institutional terminology
  const navLinks = [
    { href: "/wallet", label: t.vault, key: "vault" },
    { href: "/allocate", label: t.allocate, key: "allocate" },
    { href: "/stake", label: t.yield, key: "yield" },
    { href: "/transfers", label: t.transfers, key: "transfers" },
    { href: "/ledger", label: t.ledger, key: "ledger" },
    { href: "/documents", label: t.documents, key: "documents" },
  ];

  // Trust Center dropdown items
  const trustLinks = [
    { href: "/trust-center", label: t.trustCenter, icon: "shield" },
    { href: "/trust/reserves", label: t.reserves, icon: "chart" },
    { href: "/trust/audits", label: t.audits, icon: "document" },
    { href: "/trust/custody", label: t.custody, icon: "lock" },
    { href: "/trust/supply", label: t.supply, icon: "analytics" },
    { href: "/verify", label: t.verify, icon: "checkmark" },
    { href: "/legal", label: t.legal, icon: "document-text" },
  ];

  // Client Center link (Profile replacement)
  const clientCenterLink = { href: "/client-center", label: t.clientCenter, key: "clientCenter" };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const isTrustActive = pathname?.startsWith("/trust");

  // SVG Icons for Trust dropdown
  const TrustIcon = ({ type }: { type: string }) => {
    switch (type) {
      case "shield":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      case "chart":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case "document":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case "lock":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        );
      case "analytics":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* Global Trust Bar - PRIORITY 3 */}
      <GlobalTrustBar />

      <header className="border-b border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Left: Logo + Nav */}
            <div className="flex items-center gap-1 sm:gap-6">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-1.5 sm:gap-2 mr-2 sm:mr-0 flex-shrink-0">
                <Image
                 src="/auxite-wallet-logo.png"
                  alt="Auxite"
                  width={160}
                  height={40}
                  className="h-8 sm:h-10 md:h-12 w-auto"
                />
                <span className="hidden xs:inline font-semibold text-base sm:text-lg text-slate-800 dark:text-white">
                  Auxite
                </span>
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden sm:flex items-center gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.key}
                    href={link.href}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive(link.href)
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                        : "text-slate-600 dark:text-slate-400 hover:bg-stone-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}

                {/* Trust Dropdown */}
                <div className="relative" ref={trustDropdownRef}>
                  <button
                    onClick={() => setTrustDropdownOpen(!trustDropdownOpen)}
                    onMouseEnter={() => setTrustDropdownOpen(true)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isTrustActive
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                        : "text-slate-600 dark:text-slate-400 hover:bg-stone-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    {t.trust}
                    {/* 100% Badge */}
                    <span className="ml-0.5 px-1.5 py-0.5 text-[10px] bg-emerald-500 text-white rounded font-bold">
                      100%
                    </span>
                    <svg
                      className={`w-3.5 h-3.5 transition-transform ${trustDropdownOpen ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Trust Dropdown Menu */}
                  {trustDropdownOpen && (
                    <div
                      className="absolute top-full left-0 mt-1 w-52 py-2 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl shadow-xl z-50"
                      onMouseLeave={() => setTrustDropdownOpen(false)}
                    >
                      {/* Header */}
                      <div className="px-3 py-2 border-b border-stone-200 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-white">100% {t.backed}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">1:1 Physical Assets</p>
                          </div>
                          <div className="ml-auto w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                      </div>

                      {/* Links */}
                      {trustLinks.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setTrustDropdownOpen(false)}
                          className={`flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${
                            pathname === link.href
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "text-slate-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-700"
                          }`}
                        >
                          <span className={pathname === link.href ? "text-emerald-500" : "text-slate-400 dark:text-slate-500"}>
                            <TrustIcon type={link.icon} />
                          </span>
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Client Center Link - Profile replacement */}
                <Link
                  href={clientCenterLink.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === clientCenterLink.href || pathname?.startsWith('/profile')
                      ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      : "text-slate-600 dark:text-slate-400 hover:bg-stone-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {clientCenterLink.label}
                </Link>
              </nav>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="sm:hidden p-2 rounded-lg bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 transition-colors"
              >
                {mobileMenuOpen ? (
                  <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="hidden sm:flex p-2 rounded-lg bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 border border-stone-300 dark:border-slate-700 transition-colors"
                title={theme === "dark" ? t.lightMode : t.darkMode}
              >
                {theme === "dark" ? (
                  <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              {/* Language Dropdown */}
              <div className="relative" ref={langDropdownRef}>
                <button
                  onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 border border-stone-300 dark:border-slate-700 transition-colors"
                >
                  <span className="text-base">{currentLangData.flag}</span>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    {lang.toUpperCase()}
                  </span>
                  <svg
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform ${langDropdownOpen ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {langDropdownOpen && (
                  <div className="absolute top-full right-0 mt-1 w-40 py-1 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl shadow-xl z-50">
                    {LANGUAGES.map((language) => (
                      <button
                        key={language.code}
                        onClick={() => handleLanguageSelect(language.code)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                          lang === language.code
                            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                            : "text-slate-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-700"
                        }`}
                      >
                        <span className="text-lg">{language.flag}</span>
                        <span>{language.name}</span>
                        {lang === language.code && (
                          <svg className="w-4 h-4 ml-auto text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Security Buttons - Only on wallet page */}
              {shouldShowWalletActions && (
                <>
                  <button
                    onClick={onShowSecurity}
                    className="hidden sm:flex p-2 rounded-lg bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 border border-stone-300 dark:border-slate-700 hover:border-emerald-500 transition-all group"
                    title={t.security}
                  >
                    <svg className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-emerald-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </button>
                  <button
                    onClick={onShowAdvancedSecurity}
                    className="hidden sm:flex p-2 rounded-lg bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 border border-stone-300 dark:border-slate-700 hover:border-amber-500 transition-all group"
                    title={t.advancedSecurity}
                  >
                    <svg className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-amber-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </button>
                  <button
                    onClick={onShowPriceAlerts}
                    className="hidden sm:flex p-2 rounded-lg bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 border border-stone-300 dark:border-slate-700 hover:border-blue-500 transition-all group"
                    title={t.priceAlerts}
                  >
                    <svg className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </button>
                </>
              )}

              {/* Connect Button - Responsive */}
              <ConnectButton.Custom>
                {({
                  account,
                  chain,
                  openAccountModal,
                  openChainModal,
                  openConnectModal,
                  mounted,
                }) => {
                  const ready = mounted;
                  const externalConnected = ready && account && chain;
                  // Check for QR login (local wallet)
                  const isLocalWallet = walletMode === "local" && localWalletAddress;
                  const connected = externalConnected || isLocalWallet;

                  return (
                    <div
                      {...(!ready && {
                        'aria-hidden': true,
                        style: {
                          opacity: 0,
                          pointerEvents: 'none',
                          userSelect: 'none',
                        },
                      })}
                    >
                      {(() => {
                        // Show local wallet if QR logged in
                        if (isLocalWallet) {
                          const shortAddress = `${localWalletAddress.slice(0, 6)}...${localWalletAddress.slice(-4)}`;
                          return (
                            <Link
                              href="/profile"
                              className="flex items-center gap-1.5 md:gap-2 p-1.5 md:px-3 md:py-2 rounded-full md:rounded-lg bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 border border-emerald-500/50 transition-all"
                            >
                              <div className="w-6 h-6 md:w-6 md:h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                              </div>
                              <span className="hidden md:inline text-sm font-medium text-slate-700 dark:text-slate-300">
                                {shortAddress}
                              </span>
                            </Link>
                          );
                        }

                        if (!connected) {
                          return (
                            <button
                              onClick={openConnectModal}
                              className="flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-xs sm:text-sm transition-all"
                            >
                              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                              </svg>
                              <span className="hidden xs:inline">{lang === "tr" ? "Bağlan" : "Connect"}</span>
                            </button>
                          );
                        }

                        return (
                          <button
                            onClick={openAccountModal}
                            className="flex items-center gap-1.5 md:gap-2 p-1.5 md:px-3 md:py-2 rounded-full md:rounded-lg bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 border border-stone-300 dark:border-slate-700 transition-all"
                          >
                            {account?.ensAvatar ? (
                              <img
                                src={account.ensAvatar}
                                alt=""
                                className="w-6 h-6 md:w-6 md:h-6 rounded-full"
                              />
                            ) : (
                              <div className="w-6 h-6 md:w-6 md:h-6 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500" />
                            )}
                            <span className="hidden md:inline text-sm font-medium text-slate-700 dark:text-slate-300">
                              {account?.displayName}
                            </span>
                          </button>
                        );
                      })()}
                    </div>
                  );
                }}
              </ConnectButton.Custom>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-b border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="max-w-7xl mx-auto px-4 py-3 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-lg font-medium text-sm ${
                  isActive(link.href)
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                    : "bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                {link.label}
              </Link>
            ))}

            {/* Mobile Trust Section */}
            <div className="pt-2">
              <Link
                href="/trust"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-4 py-3 rounded-lg font-medium text-sm ${
                  isTrustActive
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                    : "bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  {t.trustCenter}
                </div>
                <span className="px-2 py-0.5 text-xs bg-emerald-500 text-white rounded-full font-bold">
                  100% {t.backed}
                </span>
              </Link>
              
              {/* Trust Sub-links */}
              <div className="mt-2 ml-4 space-y-1">
                {trustLinks.slice(1).map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm ${
                      pathname === link.href
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "text-slate-600 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <TrustIcon type={link.icon} />
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Mobile Language Selector */}
            <div className="pt-3 mt-3 border-t border-stone-300 dark:border-slate-700">
              <p className="text-xs text-slate-500 mb-2 px-1">{lang === "tr" ? "Dil Seçimi" : "Language"}</p>
              <div className="grid grid-cols-3 gap-2">
                {LANGUAGES.map((language) => (
                  <button
                    key={language.code}
                    onClick={() => {
                      handleLanguageSelect(language.code);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg transition-colors ${
                      lang === language.code
                        ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                        : "bg-stone-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-stone-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span className="text-lg">{language.flag}</span>
                    <span className="text-xs font-medium">{language.code.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Theme Toggle */}
            <div className="pt-3 border-t border-stone-300 dark:border-slate-700">
              <button
                onClick={() => {
                  toggleTheme();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-stone-200 dark:bg-slate-800 rounded-lg hover:bg-stone-300 dark:hover:bg-slate-700 transition-colors"
              >
                {theme === "dark" ? (
                  <>
                    <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span className="text-slate-700 dark:text-slate-300">{t.lightMode}</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                    <span className="text-slate-700 dark:text-slate-300">{t.darkMode}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
