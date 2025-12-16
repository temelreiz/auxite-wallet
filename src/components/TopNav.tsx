"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useLanguage, LANGUAGES, getLanguageData } from "@/components/LanguageContext";

// ============================================
// 6-LANGUAGE TRANSLATIONS
// ============================================
const translations: Record<string, Record<string, string>> = {
  tr: {
    markets: "Piyasalar",
    stake: "Biriktir",
    wallet: "Cüzdan",
    profile: "Profil",
    actions: "İşlemler",
    autoInvest: "Otomatik Yatırım",
    physicalDelivery: "Fiziksel Teslimat",
    priceAlerts: "Fiyat Uyarıları",
    security: "Güvenlik",
    advancedSecurity: "Gelişmiş Güvenlik",
    lightMode: "Aydınlık Mod",
    darkMode: "Karanlık Mod",
  },
  en: {
    markets: "Markets",
    stake: "Stake",
    wallet: "Wallet",
    profile: "Profile",
    actions: "Actions",
    autoInvest: "Auto-Invest",
    physicalDelivery: "Physical Delivery",
    priceAlerts: "Price Alerts",
    security: "Security",
    advancedSecurity: "Advanced Security",
    lightMode: "Light Mode",
    darkMode: "Dark Mode",
  },
  de: {
    markets: "Märkte",
    stake: "Staken",
    wallet: "Wallet",
    profile: "Profil",
    actions: "Aktionen",
    autoInvest: "Auto-Invest",
    physicalDelivery: "Physische Lieferung",
    priceAlerts: "Preisalarme",
    security: "Sicherheit",
    advancedSecurity: "Erweiterte Sicherheit",
    lightMode: "Heller Modus",
    darkMode: "Dunkler Modus",
  },
  fr: {
    markets: "Marchés",
    stake: "Staker",
    wallet: "Portefeuille",
    profile: "Profil",
    actions: "Actions",
    autoInvest: "Auto-Invest",
    physicalDelivery: "Livraison Physique",
    priceAlerts: "Alertes de Prix",
    security: "Sécurité",
    advancedSecurity: "Sécurité Avancée",
    lightMode: "Mode Clair",
    darkMode: "Mode Sombre",
  },
  ar: {
    markets: "الأسواق",
    stake: "الإيداع",
    wallet: "المحفظة",
    profile: "الملف الشخصي",
    actions: "الإجراءات",
    autoInvest: "الاستثمار التلقائي",
    physicalDelivery: "التسليم الفعلي",
    priceAlerts: "تنبيهات الأسعار",
    security: "الأمان",
    advancedSecurity: "الأمان المتقدم",
    lightMode: "الوضع الفاتح",
    darkMode: "الوضع الداكن",
  },
  ru: {
    markets: "Рынки",
    stake: "Стейкинг",
    wallet: "Кошелек",
    profile: "Профиль",
    actions: "Действия",
    autoInvest: "Авто-инвест",
    physicalDelivery: "Физическая доставка",
    priceAlerts: "Ценовые оповещения",
    security: "Безопасность",
    advancedSecurity: "Расширенная безопасность",
    lightMode: "Светлый режим",
    darkMode: "Темный режим",
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
  
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const actionsDropdownRef = useRef<HTMLDivElement>(null);

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
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navLinks = [
    { href: "/", label: t.markets, key: "markets" },
    { href: "/stake", label: t.stake, key: "stake" },
    { href: "/wallet", label: t.wallet, key: "wallet" },
    { href: "/profile", label: t.profile, key: "profile" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      <header className="border-b border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left Side - Logo + Navigation */}
            <div className="flex items-center gap-5">
              {/* Hamburger Menu - Mobile */}
              <button
                className="sm:hidden p-2 rounded-lg hover:bg-stone-200 dark:hover:bg-slate-800"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <svg className="w-6 h-6 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>

              {/* Logo */}
              <Link href="/">
                <Image
                  src="/auxite-wallet-logo.png"
                  alt="Auxite"
                  width={160}
                  height={40}
                  className="h-8 sm:h-10 md:h-12 w-auto"
                />
              </Link>

              {/* Navigation Links */}
              <div className="hidden md:flex gap-1 sm:gap-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.key}
                    href={link.href}
                    className={`px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 rounded-lg font-medium text-xs sm:text-sm transition-colors ${
                      isActive(link.href)
                        ? "bg-emerald-500 text-white"
                        : "bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-1.5 sm:p-2 rounded-lg bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 border border-stone-300 dark:border-slate-700 transition-all"
                title={theme === "dark" ? t.lightMode : t.darkMode}
              >
                {theme === "dark" ? (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              {/* Actions Dropdown - Only on wallet page or when explicitly enabled */}
              {shouldShowWalletActions && (
                <div className="relative hidden sm:block" ref={actionsDropdownRef}>
                  <button
                    onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 border border-stone-300 dark:border-slate-700 transition-all"
                  >
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.actions}</span>
                    <svg className={`w-4 h-4 text-slate-600 dark:text-slate-400 transition-transform ${showActionsDropdown ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showActionsDropdown && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                      <button
                        onClick={() => { onShowRecurringBuy?.(); setShowActionsDropdown(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <span className="text-purple-500">🔄</span>
                        <span className="text-sm text-slate-700 dark:text-slate-300">{t.autoInvest}</span>
                      </button>
                      <button
                        onClick={() => { onShowPhysicalDelivery?.(); setShowActionsDropdown(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <span className="text-amber-500">📦</span>
                        <span className="text-sm text-slate-700 dark:text-slate-300">{t.physicalDelivery}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Language Selector - Responsive */}
              <div className="relative" ref={langDropdownRef}>
                <button
                  onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 border border-stone-300 dark:border-slate-700 rounded-lg transition-colors"
                >
                  <span className="text-base sm:text-lg">{currentLangData.flag}</span>
                  <span className="hidden sm:inline text-sm text-slate-700 dark:text-slate-300">{currentLangData.nativeName}</span>
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-slate-600 dark:text-slate-400 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {langDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-44 sm:w-52 bg-white dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                    {LANGUAGES.map((language) => (
                      <button
                        key={language.code}
                        onClick={() => handleLanguageSelect(language.code)}
                        className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-stone-100 dark:hover:bg-slate-700 transition-colors ${
                          lang === language.code ? "bg-stone-100 dark:bg-slate-700/50" : ""
                        }`}
                      >
                        <span className="text-lg sm:text-xl">{language.flag}</span>
                        <div className="text-left flex-1">
                          <p className="text-xs sm:text-sm text-slate-800 dark:text-white font-medium">{language.nativeName}</p>
                          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">{language.name}</p>
                        </div>
                        {lang === language.code && (
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                  const connected = ready && account && chain;

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
                            {account.ensAvatar ? (
                              <img
                                src={account.ensAvatar}
                                alt=""
                                className="w-6 h-6 md:w-6 md:h-6 rounded-full"
                              />
                            ) : (
                              <div className="w-6 h-6 md:w-6 md:h-6 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500" />
                            )}
                            <span className="hidden md:inline text-sm font-medium text-slate-700 dark:text-slate-300">
                              {account.displayName}
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
