"use client";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { LeasingDashboard } from "@/components/LeasingDashboard";
import TopNav from "@/components/TopNav";
import { useLanguage } from "@/components/LanguageContext";

const STORAGE_KEYS = {
  HAS_WALLET: "auxite_has_wallet",
  WALLET_ADDRESS: "auxite_wallet_address",
  WALLET_MODE: "auxite_wallet_mode",
  SESSION_UNLOCKED: "auxite_session_unlocked",
};

const translations: Record<string, Record<string, string>> = {
  tr: {
    pageTitle: "Biriktir",
    pageDesc: "Metallerinizi stake edin ve getiri kazanın",
    walletRequired: "Cüzdan Gerekli",
    connectWalletDesc: "Biriktirme özelliğini kullanmak için cüzdanınızı bağlayın",
  },
  en: {
    pageTitle: "Stake",
    pageDesc: "Stake your metals and earn yield",
    walletRequired: "Wallet Required",
    connectWalletDesc: "Connect your wallet to use staking features",
  },
  de: {
    pageTitle: "Staken",
    pageDesc: "Staken Sie Ihre Metalle und verdienen Sie Rendite",
    walletRequired: "Wallet erforderlich",
    connectWalletDesc: "Verbinden Sie Ihre Wallet, um Staking-Funktionen zu nutzen",
  },
  fr: {
    pageTitle: "Staker",
    pageDesc: "Stakez vos métaux et gagnez des rendements",
    walletRequired: "Portefeuille requis",
    connectWalletDesc: "Connectez votre portefeuille pour utiliser les fonctions de staking",
  },
  ar: {
    pageTitle: "الإيداع",
    pageDesc: "قم بإيداع معادنك واكسب العوائد",
    walletRequired: "المحفظة مطلوبة",
    connectWalletDesc: "قم بتوصيل محفظتك لاستخدام ميزات الإيداع",
  },
  ru: {
    pageTitle: "Стейкинг",
    pageDesc: "Стейкайте металлы и получайте доход",
    walletRequired: "Требуется кошелек",
    connectWalletDesc: "Подключите кошелек для использования функций стейкинга",
  },
};

export default function EarnPage() {
  const { lang } = useLanguage();
  const t = translations[lang] || translations.en;
  
  const { isConnected: isExternalConnected, address: externalAddress } = useAccount();
  
  const [localWalletAddress, setLocalWalletAddress] = useState<string | null>(null);
  const [walletMode, setWalletMode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSessionUnlocked, setIsSessionUnlocked] = useState(false);

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
    
    setIsLoading(false);
  }, []);

  const isWalletConnected = 
    (walletMode === "local" && !!localWalletAddress && isSessionUnlocked) || 
    (walletMode === "external" && isExternalConnected);

  const currentAddress = walletMode === "local" ? localWalletAddress : externalAddress;

  if (isLoading) {
    return (
      <main className="min-h-screen bg-stone-100 dark:bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-stone-300 dark:border-zinc-600 border-t-emerald-500 rounded-full"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-100 dark:bg-zinc-950 text-zinc-900 dark:text-white">
      <TopNav />

      {/* Page Header */}
      <div className="border-b border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            {t.pageTitle}
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {t.pageDesc}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {isWalletConnected && currentAddress ? (
          <LeasingDashboard walletAddress={currentAddress} />
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-stone-200 dark:bg-zinc-800/50 flex items-center justify-center">
              <svg className="w-10 h-10 text-stone-400 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
              {t.walletRequired}
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6 max-w-md mx-auto">
              {t.connectWalletDesc}
            </p>
            <ConnectButton />
          </div>
        )}
      </div>
    </main>
  );
}