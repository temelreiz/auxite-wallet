"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { ConnectKitButton } from "connectkit";
import Link from "next/link";
import Image from "next/image";
import { LeasingDashboard } from "@/components/LeasingDashboard";

// Storage keys (page.tsx ile aynı)
const STORAGE_KEYS = {
  HAS_WALLET: "auxite_has_wallet",
  WALLET_ADDRESS: "auxite_wallet_address",
  WALLET_MODE: "auxite_wallet_mode",
  SESSION_UNLOCKED: "auxite_session_unlocked",
  LANGUAGE: "auxite_language",
};

export default function EarnPage() {
  const [lang, setLang] = useState<"tr" | "en">("tr");
  
  // External wallet (wagmi)
  const { isConnected: isExternalConnected, address: externalAddress } = useAccount();
  
  // Local wallet state
  const [localWalletAddress, setLocalWalletAddress] = useState<string | null>(null);
  const [walletMode, setWalletMode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSessionUnlocked, setIsSessionUnlocked] = useState(false);

  // Check wallet state on mount
  useEffect(() => {
    const savedMode = localStorage.getItem(STORAGE_KEYS.WALLET_MODE);
    const hasLocalWallet = localStorage.getItem(STORAGE_KEYS.HAS_WALLET);
    const localAddress = localStorage.getItem(STORAGE_KEYS.WALLET_ADDRESS);
    const sessionUnlocked = sessionStorage.getItem(STORAGE_KEYS.SESSION_UNLOCKED);
    const savedLang = localStorage.getItem(STORAGE_KEYS.LANGUAGE) as "tr" | "en" | null;

    if (savedLang) {
      setLang(savedLang);
    }

    setWalletMode(savedMode);
    
    if (savedMode === "local" && hasLocalWallet === "true" && localAddress) {
      setLocalWalletAddress(localAddress);
      // Session'da unlock edilmişse, cüzdan bağlı say
      if (sessionUnlocked === "true") {
        setIsSessionUnlocked(true);
      }
    }
    
    setIsLoading(false);
  }, []);

  // Handle language change
  const handleLanguageChange = (newLang: "tr" | "en") => {
    setLang(newLang);
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, newLang);
  };

  // Determine if wallet is connected
  const isWalletConnected = 
    (walletMode === "local" && !!localWalletAddress && isSessionUnlocked) || 
    (walletMode === "external" && isExternalConnected);

  const currentAddress = 
    walletMode === "local" ? localWalletAddress : externalAddress;

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-slate-600 border-t-emerald-500 rounded-full"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Top Navigation */}
      <div className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left Side - Logo + Navigation */}
            <div className="flex items-center gap-5">
              {/* Logo - Auxite Earn */}
              <Link href="/earn">
                <Image
                  src="/auxite-earn-logo.png"
                  alt="Auxite Earn"
                  width={220}
                  height={60}
                  className="h-14 w-auto"
                />
              </Link>

              {/* Navigation - Sıra: Piyasalar, Earn, Cüzdan */}
              <div className="flex gap-2">
                <Link
                  href="/"
                  className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm transition-colors"
                >
                  {lang === "tr" ? "Piyasalar" : "Markets"}
                </Link>
                <Link
                  href="/earn"
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 text-white font-medium text-sm"
                >
                  {lang === "tr" ? "Kazan" : "Earn"}
                </Link>
                <Link
                  href="/wallet"
                  className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm transition-colors"
                >
                  {lang === "tr" ? "Cüzdan" : "Wallet"}
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
              {walletMode === "local" && localWalletAddress && isSessionUnlocked ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg border border-slate-700">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-sm text-slate-300 font-mono">
                    {localWalletAddress.slice(0, 6)}...{localWalletAddress.slice(-4)}
                  </span>
                </div>
              ) : (
                <ConnectKitButton />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <LeasingDashboard 
          lang={lang} 
          onLanguageChange={handleLanguageChange}
          walletAddress={currentAddress || undefined}
          isWalletConnected={isWalletConnected}
        />
      </div>
    </main>
  );
}
