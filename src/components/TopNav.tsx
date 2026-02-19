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
    fundingWithdrawals: "Fonlama",
    ledger: "Defter",
    documents: "Belgeler",
    trustCenter: "Güven",
    clientCenter: "Müşteri",

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
    fundingWithdrawals: "Transfers",
    ledger: "Ledger",
    documents: "Documents",
    trustCenter: "Trust",
    clientCenter: "Client",

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
    fundingWithdrawals: "Ein-/Auszahlung",
    ledger: "Kapitalbuch",
    documents: "Dokumente",
    trustCenter: "Vertrauen",
    clientCenter: "Kunden",
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
    fundingWithdrawals: "Transferts",
    ledger: "Grand Livre",
    documents: "Documents",
    trustCenter: "Confiance",
    clientCenter: "Client",
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
    fundingWithdrawals: "التمويل",
    ledger: "الدفتر",
    documents: "المستندات",
    trustCenter: "الثقة",
    clientCenter: "العميل",
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
    fundingWithdrawals: "Переводы",
    ledger: "Капитал",
    documents: "Документы",
    trustCenter: "Доверие",
    clientCenter: "Клиент",
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

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);

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

  // Always dark mode
  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
  }, []);

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
    { href: "/vault", label: t.vault, key: "vault" },
    { href: "/allocate", label: t.allocate, key: "allocate" },
    { href: "/stake", label: t.yield, key: "yield" },
    { href: "/transfers", label: t.fundingWithdrawals, key: "transfers" },
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
            <div className="flex items-center gap-1 sm:gap-4 min-w-0 flex-1">
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
              <nav className="hidden sm:flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
                {navLinks.map((link) => (
                  <Link
                    key={link.key}
                    href={link.href}
                    className={`px-2 lg:px-3 py-1.5 rounded-lg text-[12px] lg:text-[13px] font-medium whitespace-nowrap flex-shrink-0 transition-colors ${
                      isActive(link.href)
                        ? "bg-[#d4a574]/20 text-[#d4a574] dark:text-[#d4a574]"
                        : "text-slate-600 dark:text-slate-400 hover:bg-stone-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}

                {/* Trust Center Link */}
                <Link
                  href="/trust-center"
                  className={`px-2 lg:px-3 py-1.5 rounded-lg text-[12px] lg:text-[13px] font-medium whitespace-nowrap flex-shrink-0 transition-colors ${
                    pathname?.startsWith("/trust")
                      ? "bg-[#d4a574]/20 text-[#d4a574] dark:text-[#d4a574]"
                      : "text-slate-600 dark:text-slate-400 hover:bg-stone-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {t.trustCenter}
                </Link>

                {/* Client Center Link */}
                <Link
                  href="/client-center"
                  className={`px-2 lg:px-3 py-1.5 rounded-lg text-[12px] lg:text-[13px] font-medium whitespace-nowrap flex-shrink-0 transition-colors ${
                    pathname === "/client-center" || pathname?.startsWith('/profile')
                      ? "bg-[#d4a574]/20 text-[#d4a574] dark:text-[#d4a574]"
                      : "text-slate-600 dark:text-slate-400 hover:bg-stone-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {t.clientCenter}
                </Link>
              </nav>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
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
                            ? "bg-[#d4a574]/20 text-[#d4a574] dark:text-[#d4a574]"
                            : "text-slate-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-700"
                        }`}
                      >
                        <span className="text-lg">{language.flag}</span>
                        <span>{language.name}</span>
                        {lang === language.code && (
                          <svg className="w-4 h-4 ml-auto text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(localWalletAddress);
                    setAddressCopied(true);
                    setTimeout(() => setAddressCopied(false), 2000);
                  }}
                  title={localWalletAddress}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#d4a574]/10 hover:bg-[#d4a574]/20 border border-[#d4a574]/30 transition-all"
                >
                  <div className="w-7 h-7 rounded-full bg-[#d4a574] flex items-center justify-center">
                    {addressCopied ? (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm font-medium text-[#d4a574]">
                    {addressCopied
                      ? (lang === "tr" ? "Kopyalandı!" : "Copied!")
                      : `${localWalletAddress.slice(0, 6)}...${localWalletAddress.slice(-4)}`}
                  </span>
                </button>
              ) : (
                <Link
                  href="/auth/login"
                  className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-[#d4a574] hover:bg-[#c49464] text-white font-medium text-sm transition-all shadow-lg shadow-[#d4a574]/30"
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
                    ? "bg-[#d4a574]/20 text-[#d4a574] dark:text-[#d4a574] border border-[#2F6F62]/30"
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
                  ? "bg-[#d4a574]/20 text-[#d4a574] dark:text-[#d4a574] border border-[#2F6F62]/30"
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
                  ? "bg-[#d4a574]/20 text-[#d4a574] dark:text-[#d4a574] border border-[#2F6F62]/30"
                  : "bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              }`}
            >
              {t.clientCenter}
            </Link>

            {/* WhatsApp Support */}
            <a
              href="https://wa.me/905335062856"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm bg-green-600/15 hover:bg-green-600/25 text-green-500 border border-green-600/30 transition-colors"
            >
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <span>{lang === "tr" ? "WhatsApp Destek" : lang === "de" ? "WhatsApp Support" : lang === "fr" ? "Support WhatsApp" : lang === "ar" ? "دعم واتساب" : lang === "ru" ? "Поддержка WhatsApp" : "WhatsApp Support"}</span>
            </a>

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
                        ? "bg-[#2F6F62]/20 border border-[#2F6F62]/30 text-[#2F6F62] dark:text-[#2F6F62]"
                        : "bg-stone-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-stone-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span className="text-lg">{language.flag}</span>
                    <span className="text-xs font-medium">{language.code.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
