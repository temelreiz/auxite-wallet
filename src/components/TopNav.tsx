"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
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
  showWalletActions?: boolean;
}

export default function TopNav({
  onShowRecurringBuy,
  onShowPhysicalDelivery,
  showWalletActions = false,
}: TopNavProps) {
  const { lang, setLang } = useLanguage();
  const pathname = usePathname();
  const t = translations[lang] || translations.en;
  const currentLangData = getLanguageData(lang);

  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  // QR Login state - check localStorage
  const [localWalletAddress, setLocalWalletAddress] = useState<string | null>(null);
  const [walletMode, setWalletMode] = useState<string | null>(null);

  const langDropdownRef = useRef<HTMLDivElement>(null);

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

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
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

                {/* Trust Center Link - Simple link like mobile */}
                <Link
                  href="/trust-center"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname?.startsWith("/trust")
                      ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      : "text-slate-600 dark:text-slate-400 hover:bg-stone-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {t.trustCenter}
                </Link>

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


              {/* Vault Wallet Display - Auxite Custody Model */}
              {localWalletAddress ? (
                <Link
                  href="/client-center"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 dark:bg-amber-500/10 hover:bg-amber-500/20 dark:hover:bg-amber-500/20 border border-amber-500/30 transition-all"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    {`${localWalletAddress.slice(0, 6)}...${localWalletAddress.slice(-4)}`}
                  </span>
                </Link>
              ) : (
                <Link
                  href="/auth/login"
                  className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium text-sm transition-all shadow-lg shadow-amber-500/20"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>{lang === "tr" ? "Giriş Yap" : "Sign In"}</span>
                </Link>
              )}
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

            {/* Mobile Trust Center Link */}
            <Link
              href="/trust-center"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-3 rounded-lg font-medium text-sm ${
                pathname?.startsWith("/trust")
                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                  : "bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              }`}
            >
              {t.trustCenter}
            </Link>

            {/* Mobile Client Center Link */}
            <Link
              href="/client-center"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-3 rounded-lg font-medium text-sm ${
                pathname === "/client-center"
                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                  : "bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              }`}
            >
              {t.clientCenter}
            </Link>

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
