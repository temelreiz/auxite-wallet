"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import Image from "next/image";
import MetalPriceGrid from "@/components/MetalPriceGrid";
import { RiskCorrelation } from "@/components/RiskCorrelation";
import WalletOnboarding from "@/components/WalletOnboarding";
import TopNav from "@/components/TopNav";
import { useLanguage } from "@/components/LanguageContext";

// ============================================
// STORAGE KEYS
// ============================================
const STORAGE_KEYS = {
  HAS_WALLET: "auxite_has_wallet",
  WALLET_ADDRESS: "auxite_wallet_address",
  WALLET_MODE: "auxite_wallet_mode",
  SESSION_UNLOCKED: "auxite_session_unlocked",
  AUTH_TOKEN: "authToken",
  USER: "user",
};

export default function Home() {
  const { t, lang } = useLanguage();
  const router = useRouter();
  
  // External wallet (MetaMask, etc.)
  const { isConnected: isExternalConnected } = useAccount();
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<any>(null);
  
  // Local wallet state
  const [walletMode, setWalletMode] = useState<"choosing" | "local" | "external" | null>(null);
  const [localWalletReady, setLocalWalletReady] = useState(false);
  const [localWalletAddress, setLocalWalletAddress] = useState<string | null>(null);
  
  // UI state
  const [isLoading, setIsLoading] = useState(true);

  // Check auth state on mount
  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    const storedUser = localStorage.getItem(STORAGE_KEYS.USER);

    // No token = not authenticated
    if (!token) {
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }

    // Parse user
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        
        // If user has wallet address from auth, use it
        if (parsedUser.walletAddress) {
          setLocalWalletAddress(parsedUser.walletAddress);
        }
      } catch (e) {
        console.error("Failed to parse user:", e);
      }
    }

    // Verify token with API (optional but recommended)
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
          
          if (data.user.walletAddress) {
            setLocalWalletAddress(data.user.walletAddress);
          }
        }
        setIsAuthenticated(true);
      } else {
        // Token invalid
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
        setIsAuthenticated(false);
      }
    } catch (error) {
      // Network error - use cached auth
      setIsAuthenticated(true);
    }

    // Check wallet state
    checkWalletState();
  };

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
  const handleLocalWalletReady = async (address: string) => {
    setLocalWalletAddress(address);
    setLocalWalletReady(true);
    localStorage.setItem(STORAGE_KEYS.WALLET_MODE, "local");
    sessionStorage.setItem(STORAGE_KEYS.SESSION_UNLOCKED, "true");

    // Link wallet to auth account
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (token) {
      try {
        const response = await fetch('/api/auth/link-wallet', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ walletAddress: address }),
        });

        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
        }
      } catch (error) {
        console.error("Failed to link wallet:", error);
      }
    }
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
    // Clear auth
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    
    // Clear wallet
    localStorage.removeItem(STORAGE_KEYS.WALLET_MODE);
    sessionStorage.removeItem(STORAGE_KEYS.SESSION_UNLOCKED);
    
    setWalletMode("choosing");
    setLocalWalletReady(false);
    setLocalWalletAddress(null);
    setIsAuthenticated(false);
    setUser(null);
    
    // Redirect to login
    router.push('/auth/login');
  };

  // Determine if wallet is connected
  const isWalletConnected = 
    (walletMode === "local" && localWalletReady) || 
    (walletMode === "external" && isExternalConnected);

  // Loading state
  if (isLoading || isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div className="animate-spin w-6 h-6 border-2 border-stone-300 dark:border-zinc-600 border-t-emerald-500 rounded-full mx-auto"></div>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    router.push('/auth/login');
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-6 h-6 border-2 border-stone-300 dark:border-zinc-600 border-t-emerald-500 rounded-full mx-auto"></div>
          <p className="text-slate-500 dark:text-zinc-400 mt-4">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Wallet choice screen
  if (walletMode === "choosing") {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-zinc-950 flex items-center justify-center p-6">
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
            {user && (
              <p className="text-sm text-emerald-500 mb-4">
                👋 {t("welcome")}, {user.name || user.email}
              </p>
            )}
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
              {t("chooseWallet")}
            </h1>
            <p className="text-slate-500 dark:text-zinc-400">
              {t("chooseHowConnect")}
            </p>
          </div>

          {/* Wallet Options */}
          <div className="space-y-4">
            {/* Local Wallet Option */}
            <button
              onClick={handleChooseLocal}
              className="w-full p-5 bg-white dark:bg-zinc-800 hover:bg-stone-50 dark:hover:bg-zinc-700 border border-stone-200 dark:border-zinc-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl transition-all group shadow-sm dark:shadow-none"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                  <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-semibold text-slate-800 dark:text-white mb-1">
                    {t("auxiteWallet")}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-zinc-400">
                    {t("createOrImport")}
                  </p>
                </div>
                <span className="text-xs bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-full">
                  {t("recommended")}
                </span>
              </div>
            </button>

            {/* External Wallet Option */}
            <button
              onClick={handleChooseExternal}
              className="w-full p-5 bg-white dark:bg-zinc-800 hover:bg-stone-50 dark:hover:bg-zinc-700 border border-stone-200 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl transition-all group shadow-sm dark:shadow-none"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                  <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-semibold text-slate-800 dark:text-white mb-1">
                    {t("externalWallet")}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-zinc-400">
                    {t("connectMetamask")}
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* Info */}
          <p className="text-xs text-slate-400 dark:text-zinc-500 text-center mt-6">
            {t("keysStayWithYou")}
          </p>

          {/* Logout link */}
          <button
            onClick={handleLogout}
            className="w-full mt-4 text-sm text-slate-400 hover:text-red-500 transition-colors"
          >
            {t("logout") || "Çıkış Yap"}
          </button>
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
    <main className="min-h-screen bg-stone-100 dark:bg-zinc-950 text-slate-900 dark:text-white">
      {/* TopNav */}
      <TopNav />

      {/* Markets Description */}
      <div className="border-b border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-zinc-100 mb-1">
            {t("auxiteMarkets")}
          </h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400">
            {t("marketsDesc")}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Metal Prices Grid */}
        <MetalPriceGrid />

        {/* Risk & Correlation - Show if wallet connected */}
        {isWalletConnected && <RiskCorrelation lang={lang} />}
      </div>
    </main>
  );
}
