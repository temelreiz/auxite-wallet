"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAccount, useDisconnect } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useLanguage, LANGUAGES, getLanguageData, type LanguageCode } from "./LanguageContext";

// ============================================
// STORAGE KEYS
// ============================================
const STORAGE_KEYS = {
  HAS_WALLET: "auxite_has_wallet",
  WALLET_ADDRESS: "auxite_wallet_address",
  WALLET_MODE: "auxite_wallet_mode",
  SESSION_UNLOCKED: "auxite_session_unlocked",
};

// ============================================
// THEME MANAGEMENT
// ============================================
const applyTheme = (theme: "dark" | "light") => {
  const root = document.documentElement;
  const body = document.body;
  
  if (theme === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
    body.style.backgroundColor = "#09090b";
    body.style.color = "#ffffff";
  } else {
    root.classList.remove("dark");
    root.classList.add("light");
    body.style.backgroundColor = "#f5f5f4";
    body.style.color = "#0f172a";
  }
};

// ============================================
// TOPNAV COMPONENT
// ============================================
export default function TopNav() {
  const pathname = usePathname();
  const { lang, setLang, t } = useLanguage();
  
  // Wagmi hooks
  const { isConnected, address } = useAccount();
  const { disconnect: disconnectWallet } = useDisconnect();
  
  // Local state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);
  
  // Local wallet state
  const [localWalletAddress, setLocalWalletAddress] = useState<string | null>(null);
  const [walletMode, setWalletMode] = useState<string | null>(null);
  const [isSessionUnlocked, setIsSessionUnlocked] = useState(false);
  
  const langDropdownRef = useRef<HTMLDivElement>(null);

  // Page detection
  const isWalletPage = pathname === "/wallet";
  const isProfilePage = pathname === "/profile";
  const isStakePage = pathname === "/stake" || pathname === "/earn";
  const isHomePage = pathname === "/";

  // Check local wallet state on mount
  useEffect(() => {
    const savedMode = localStorage.getItem(STORAGE_KEYS.WALLET_MODE);
    const hasLocalWallet = localStorage.getItem(STORAGE_KEYS.HAS_WALLET);
    const localAddress = localStorage.getItem(STORAGE_KEYS.WALLET_ADDRESS);
    const sessionUnlocked = sessionStorage.getItem(STORAGE_KEYS.SESSION_UNLOCKED);

    setWalletMode(savedMode);
    
    if (savedMode === "local" && hasLocalWallet === "true" && localAddress) {
      setLocalWalletAddress(localAddress);
      if (sessionUnlocked === "true") {
        setIsSessionUnlocked(true);
      }
    }
  }, []);

  // Initialize theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("auxite_theme") as "dark" | "light";
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    } else {
      // Default to dark
      setTheme("dark");
      applyTheme("dark");
    }
    setMounted(true);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("auxite_theme", newTheme);
    applyTheme(newTheme);
  };

  const handleLanguageSelect = (code: LanguageCode) => {
    setLang(code);
    setLangDropdownOpen(false);
  };

  // Current language data
  const currentLangData = getLanguageData(lang);

  // Tab styles - FIXED: Light mode first, then dark:
  const tabCls = (active: boolean) =>
    `px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      active 
        ? "bg-emerald-500 text-white" 
        : "bg-stone-200 dark:bg-zinc-800 hover:bg-stone-300 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300"
    }`;

  const mobileTabCls = (active: boolean) =>
    `block w-full text-left px-4 py-3 rounded-lg transition ${
      active
        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
        : "text-slate-600 dark:text-zinc-400 hover:bg-stone-100 dark:hover:bg-zinc-800"
    }`;

  // Loading skeleton
  if (!mounted) {
    return (
      <header className="border-b border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-4">
              <div className="h-10 w-32 bg-stone-200 dark:bg-zinc-800 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      {/* HEADER - Light mode first, then dark: */}
      <header className="border-b border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            {/* Left Side - Logo + Navigation */}
            <div className="flex items-center gap-4">
              {/* Hamburger - Mobile */}
              <button
                className="sm:hidden p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-zinc-800"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <svg className="w-6 h-6 text-slate-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>

              {/* Logo */}
              <Link href="/" className="flex items-center">
                <Image
                  src="/auxite-wallet-logo.png"
                  alt="Auxite"
                  width={160}
                  height={40}
                  className="h-12 w-auto"
                  priority
                />
              </Link>

              {/* Navigation - Desktop */}
              <nav className="hidden sm:flex items-center gap-2">
                <Link href="/" className={tabCls(isHomePage)}>
                  {t("markets")}
                </Link>
                <Link href="/stake" className={tabCls(isStakePage)}>
                  {t("stakeNav")}
                </Link>
                <Link href="/wallet" className={tabCls(isWalletPage)}>
                  {t("wallet")}
                </Link>
                <Link href="/profile" className={tabCls(isProfilePage)}>
                  {t("profile")}
                </Link>
              </nav>
            </div>

            {/* Right Side - Theme + Language + Wallet */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Theme Toggle - FIXED colors */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full bg-stone-100 dark:bg-zinc-900/80 hover:bg-stone-200 dark:hover:bg-zinc-800 border border-stone-300 dark:border-zinc-700 transition-colors"
                title={theme === "dark" ? "Light Mode" : "Dark Mode"}
              >
                {theme === "dark" ? (
                  <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              {/* Language Selector - Desktop - FIXED colors */}
              <div className="hidden sm:block relative" ref={langDropdownRef}>
                <button
                  onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 bg-stone-100 dark:bg-zinc-900/80 hover:bg-stone-200 dark:hover:bg-zinc-800 border border-stone-300 dark:border-zinc-700 rounded-lg transition-colors"
                >
                  <span className="text-lg">{currentLangData.flag}</span>
                  <span className="text-sm text-slate-700 dark:text-zinc-300">{currentLangData.nativeName}</span>
                  <svg
                    className={`w-4 h-4 text-slate-500 dark:text-zinc-400 transition-transform ${langDropdownOpen ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {langDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden">
                    {LANGUAGES.map((language) => (
                      <button
                        key={language.code}
                        onClick={() => handleLanguageSelect(language.code)}
                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-100 dark:hover:bg-zinc-700 transition-colors ${
                          lang === language.code ? "bg-stone-50 dark:bg-zinc-700/50" : ""
                        }`}
                      >
                        <span className="text-xl">{language.flag}</span>
                        <div className="text-left flex-1">
                          <p className="text-sm text-slate-800 dark:text-white font-medium">{language.nativeName}</p>
                          <p className="text-xs text-slate-500 dark:text-zinc-400">{language.name}</p>
                        </div>
                        {lang === language.code && (
                          <svg className="w-4 h-4 text-emerald-500 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Wallet Display - FIXED colors */}
              {walletMode === "local" && localWalletAddress && isSessionUnlocked ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-stone-100 dark:bg-zinc-800 rounded-lg border border-stone-300 dark:border-zinc-700">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <span className="text-sm text-slate-700 dark:text-zinc-300 font-mono">
                    {localWalletAddress.slice(0, 6)}····{localWalletAddress.slice(-4)}
                  </span>
                </div>
              ) : isConnected && address ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-stone-100 dark:bg-zinc-800 rounded-lg border border-stone-300 dark:border-zinc-700">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <span className="text-sm text-slate-700 dark:text-zinc-300 font-mono">
                    {address.slice(0, 6)}····{address.slice(-4)}
                  </span>
                </div>
              ) : (
                <ConnectButton showBalance={false} chainStatus="none" accountStatus="avatar" />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu - FIXED colors */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-white/95 dark:bg-zinc-900/95 border-b border-stone-200 dark:border-zinc-800">
          <div className="max-w-7xl mx-auto px-4 py-4">
            {/* Navigation */}
            <nav className="space-y-2 mb-4">
              <Link href="/" className={mobileTabCls(isHomePage)} onClick={() => setMobileMenuOpen(false)}>
                {t("markets")}
              </Link>
              <Link href="/stake" className={mobileTabCls(isStakePage)} onClick={() => setMobileMenuOpen(false)}>
                {t("stakeNav")}
              </Link>
              <Link href="/wallet" className={mobileTabCls(isWalletPage)} onClick={() => setMobileMenuOpen(false)}>
                {t("wallet")}
              </Link>
              <Link href="/profile" className={mobileTabCls(isProfilePage)} onClick={() => setMobileMenuOpen(false)}>
                {t("profile")}
              </Link>
            </nav>

            {/* Language Selector - Mobile */}
            <div className="pt-4 border-t border-stone-200 dark:border-zinc-800">
              <p className="text-xs text-slate-500 dark:text-zinc-500 mb-3">{t("language")}</p>
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
                        : "bg-stone-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-stone-200 dark:hover:bg-zinc-700"
                    }`}
                  >
                    <span className="text-lg">{language.flag}</span>
                    <span className="text-xs font-medium">{language.code.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Theme Toggle - Mobile */}
            <div className="pt-4 mt-4 border-t border-stone-200 dark:border-zinc-800">
              <button
                onClick={() => {
                  toggleTheme();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-stone-100 dark:bg-zinc-800 rounded-lg hover:bg-stone-200 dark:hover:bg-zinc-700 transition-colors"
              >
                {theme === "dark" ? (
                  <>
                    <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span className="text-slate-700 dark:text-zinc-300">{t("lightMode")}</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                    <span className="text-slate-700 dark:text-zinc-300">{t("darkMode")}</span>
                  </>
                )}
              </button>
            </div>

            {/* Disconnect - Mobile */}
            {isConnected && address && (
              <button
                onClick={() => {
                  disconnectWallet();
                  setMobileMenuOpen(false);
                }}
                className="w-full mt-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm font-semibold text-red-500 dark:text-red-400 hover:bg-red-500/20"
              >
                {t("disconnect")}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
