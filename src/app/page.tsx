"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { ConnectKitButton } from "connectkit";
import Link from "next/link";
import Image from "next/image";
import MetalPriceGrid from "@/components/MetalPriceGrid";
import { RiskCorrelation } from "@/components/RiskCorrelation";
import WalletOnboarding from "@/components/WalletOnboarding";

// ============================================
// STORAGE KEYS
// ============================================
const STORAGE_KEYS = {
  HAS_WALLET: "auxite_has_wallet",
  WALLET_ADDRESS: "auxite_wallet_address",
  WALLET_MODE: "auxite_wallet_mode",
  SESSION_UNLOCKED: "auxite_session_unlocked",
  LANGUAGE: "auxite_language",
};

export default function Home() {
  // External wallet (MetaMask, etc.)
  const { isConnected: isExternalConnected, address: externalAddress } = useAccount();
  
  // Local wallet state
  const [walletMode, setWalletMode] = useState<"choosing" | "local" | "external" | null>(null);
  const [localWalletReady, setLocalWalletReady] = useState(false);
  const [localWalletAddress, setLocalWalletAddress] = useState<string | null>(null);
  
  // UI state
  const [lang, setLang] = useState<"tr" | "en">("tr");
  const [isLoading, setIsLoading] = useState(true);

  // Load language preference on mount
  useEffect(() => {
    const savedLang = localStorage.getItem(STORAGE_KEYS.LANGUAGE) as "tr" | "en" | null;
    if (savedLang) {
      setLang(savedLang);
    }
  }, []);

  // Handle language change
  const handleLanguageChange = (newLang: "tr" | "en") => {
    setLang(newLang);
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, newLang);
  };

  // Check wallet state on mount
  useEffect(() => {
    checkWalletState();
  }, []);

  const checkWalletState = () => {
    const savedMode = localStorage.getItem(STORAGE_KEYS.WALLET_MODE);
    const hasLocalWallet = localStorage.getItem(STORAGE_KEYS.HAS_WALLET);
    const localAddress = localStorage.getItem(STORAGE_KEYS.WALLET_ADDRESS);
    const sessionUnlocked = sessionStorage.getItem(STORAGE_KEYS.SESSION_UNLOCKED);

    if (savedMode === "local" && hasLocalWallet === "true") {
      setWalletMode("local");
      setLocalWalletAddress(localAddress);
      
      if (sessionUnlocked === "true") {
        setLocalWalletReady(true);
      }
    } else if (savedMode === "external") {
      setWalletMode("external");
    } else {
      setWalletMode("choosing");
    }
    
    setIsLoading(false);
  };

  // Handle local wallet ready
  const handleLocalWalletReady = (address: string) => {
    setLocalWalletAddress(address);
    setLocalWalletReady(true);
    localStorage.setItem(STORAGE_KEYS.WALLET_MODE, "local");
    sessionStorage.setItem(STORAGE_KEYS.SESSION_UNLOCKED, "true");
  };

  // Handle external wallet choice
  const handleChooseExternal = () => {
    setWalletMode("external");
    localStorage.setItem(STORAGE_KEYS.WALLET_MODE, "external");
  };

  // Handle local wallet choice
  const handleChooseLocal = () => {
    setWalletMode("local");
  };

  // Logout / Switch wallet
  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEYS.WALLET_MODE);
    sessionStorage.removeItem(STORAGE_KEYS.SESSION_UNLOCKED);
    setWalletMode("choosing");
    setLocalWalletReady(false);
    setLocalWalletAddress(null);
  };

  // Determine if wallet is connected
  const isWalletConnected = 
    (walletMode === "local" && localWalletReady) || 
    (walletMode === "external" && isExternalConnected);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div className="animate-spin w-6 h-6 border-2 border-slate-600 border-t-emerald-500 rounded-full mx-auto"></div>
        </div>
      </div>
    );
  }

  // Wallet choice screen
  if (walletMode === "choosing") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          {/* Logo */}
          <div className="text-center mb-8">
            <Image
              src="/auxite-wallet-logo.png"
              alt="Auxite"
              width={200}
              height={50}
              className="h-14 w-auto mx-auto mb-6"
            />
            <h1 className="text-2xl font-bold text-white mb-2">
              {lang === "tr" ? "Cüzdan Seçin" : "Choose Wallet"}
            </h1>
            <p className="text-slate-400">
              {lang === "tr" 
                ? "Nasıl bağlanmak istediğinizi seçin" 
                : "Choose how you want to connect"}
            </p>
          </div>

          {/* Language Toggle */}
          <div className="flex justify-center mb-8">
            <div className="flex gap-0.5 bg-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => handleLanguageChange("tr")}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  lang === "tr"
                    ? "bg-emerald-500 text-white"
                    : "text-slate-400 hover:text-slate-300"
                }`}
              >
                TR
              </button>
              <button
                onClick={() => handleLanguageChange("en")}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  lang === "en"
                    ? "bg-emerald-500 text-white"
                    : "text-slate-400 hover:text-slate-300"
                }`}
              >
                EN
              </button>
            </div>
          </div>

          {/* Wallet Options */}
          <div className="space-y-4">
            {/* Local Wallet Option */}
            <button
              onClick={handleChooseLocal}
              className="w-full p-5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-emerald-500 rounded-xl transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                  <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-semibold text-white mb-1">
                    {lang === "tr" ? "Auxite Cüzdan" : "Auxite Wallet"}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {lang === "tr" 
                      ? "Yeni cüzdan oluştur veya içe aktar" 
                      : "Create new or import existing"}
                  </p>
                </div>
                <svg className="w-5 h-5 text-slate-500 group-hover:text-emerald-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <div className="mt-3 flex gap-2">
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs rounded">Non-custodial</span>
                <span className="px-2 py-0.5 bg-slate-700 text-slate-400 text-xs rounded">
                  {lang === "tr" ? "Tarayıcıda" : "In Browser"}
                </span>
              </div>
            </button>

            {/* External Wallet Option */}
            <button
              onClick={handleChooseExternal}
              className="w-full p-5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-orange-500 rounded-xl transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center group-hover:bg-orange-500/30 transition-colors">
                  <svg className="w-6 h-6 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21.8 12c0-1.1-.9-2-2-2h-2v-2c0-1.1-.9-2-2-2H5.2c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h10.6c1.1 0 2-.9 2-2v-2h2c1.1 0 2-.9 2-2zm-4 4H5.2V8h10.6v8zm2-4h-2v-2h2v2z"/>
                  </svg>
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-semibold text-white mb-1">
                    {lang === "tr" ? "Harici Cüzdan" : "External Wallet"}
                  </h3>
                  <p className="text-sm text-slate-400">
                    MetaMask, WalletConnect, Coinbase...
                  </p>
                </div>
                <svg className="w-5 h-5 text-slate-500 group-hover:text-orange-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <div className="mt-3 flex gap-2">
                <span className="px-2 py-0.5 bg-orange-500/10 text-orange-400 text-xs rounded">WalletConnect</span>
                <span className="px-2 py-0.5 bg-slate-700 text-slate-400 text-xs rounded">
                  {lang === "tr" ? "Mevcut cüzdan" : "Existing wallet"}
                </span>
              </div>
            </button>
          </div>

          {/* Info */}
          <p className="text-xs text-slate-500 text-center mt-6">
            {lang === "tr" 
              ? "Anahtarlarınız her zaman sizde kalır. Non-custodial." 
              : "Your keys always stay with you. Non-custodial."}
          </p>
        </div>
      </div>
    );
  }

  // Local wallet onboarding/unlock
  if (walletMode === "local" && !localWalletReady) {
    return (
      <WalletOnboarding
        lang={lang}
        onWalletReady={handleLocalWalletReady}
      />
    );
  }

  // Main Dashboard - Piyasalar
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Top Navigation */}
      <div className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left Side - Logo + Navigation */}
            <div className="flex items-center gap-5">
              {/* Logo */}
              <Link href="/">
                <Image
                  src="/auxite-wallet-logo.png"
                  alt="Auxite"
                  width={160}
                  height={40}
                  className="h-12 w-auto"
                />
              </Link>

              {/* Navigation - Sıra: Piyasalar, Earn, Cüzdan */}
              <div className="flex gap-2">
                <Link
                  href="/"
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 text-white font-medium text-sm"
                >
                  {lang === "tr" ? "Piyasalar" : "Markets"}
                </Link>
                <Link
                  href="/earn"
                  className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm transition-colors"
                >
                  {lang === "tr" ? "Kazan" : "Earn"}
                </Link>
                <Link
                  href="/wallet"
                  className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm transition-colors"
                >
                  {lang === "tr" ? "Cüzdan" : "Wallet"}
                </Link>
                <Link
                  href="/profile"
                  className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm transition-colors"
                >
                  {lang === "tr" ? "Profil" : "Profile"}
                </Link>
              </div>
            </div>

            {/* Right Side - Language + Wallet */}
            <div className="flex items-center gap-3">
              {/* Language Toggle */}
              <div className="flex gap-0.5 bg-slate-800 rounded-lg p-0.5">
                <button
                  onClick={() => handleLanguageChange("tr")}
                  className={`px-2.5 py-1 rounded text-sm font-medium transition-colors ${
                    lang === "tr"
                      ? "bg-emerald-500 text-white"
                      : "text-slate-400 hover:text-slate-300"
                  }`}
                >
                  TR
                </button>
                <button
                  onClick={() => handleLanguageChange("en")}
                  className={`px-2.5 py-1 rounded text-sm font-medium transition-colors ${
                    lang === "en"
                      ? "bg-emerald-500 text-white"
                      : "text-slate-400 hover:text-slate-300"
                  }`}
                >
                  EN
                </button>
              </div>

              {/* Wallet Display */}
              {walletMode === "local" ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg border border-slate-700">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-sm text-slate-300 font-mono">
                      {localWalletAddress?.slice(0, 6)}...{localWalletAddress?.slice(-4)}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                    title={lang === "tr" ? "Çıkış Yap" : "Log Out"}
                  >
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <ConnectKitButton />
                  {isExternalConnected && (
                    <button
                      onClick={handleLogout}
                      className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                      title={lang === "tr" ? "Cüzdan Değiştir" : "Switch Wallet"}
                    >
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Markets Description */}
      <div className="border-b border-slate-800 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h2 className="text-lg font-semibold text-slate-100 mb-1">
            {lang === "tr" ? "Auxite Piyasalar" : "Auxite Markets"}
          </h2>
          <p className="text-sm text-slate-400">
            {lang === "tr"
              ? "Fiziksel metallerle desteklenen dijital tokenleri alın ve satın. Gerçek zamanlı fiyatlar ve anlık işlemler."
              : "Trade digital tokens backed by physical metals. Real-time prices and instant transactions."}
          </p>
        </div>
      </div>

      {/* Main Content - Sadece MetalPriceGrid ve RiskCorrelation */}
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Metal Prices Grid (içinde crypto, dönüştür butonu ve açıklama var) */}
        <MetalPriceGrid lang={lang} />

        {/* Risk & Correlation - Cüzdan bağlıysa göster */}
        {isWalletConnected && <RiskCorrelation lang={lang} />}
      </div>
    </main>
  );
}
