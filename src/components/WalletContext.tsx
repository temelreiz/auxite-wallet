// src/components/WalletContext.tsx
"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAccount } from "wagmi";

export type WalletType = "metamask" | "walletconnect" | "coinbase" | "ledger" | "trezor" | null;

interface UserBalances {
  auxm: number;
  bonusAuxm: number;
  totalAuxm: number;
  bonusExpiresAt: string | null;
  auxg: number;
  auxs: number;
  auxpt: number;
  auxpd: number;
  eth: number;
  btc: number;
  xrp: number;
  sol: number;
  usdt: number;
  usd: number;
}

interface BalanceSummary {
  totalAuxm: number;
  withdrawableAuxm: number;
  lockedBonusAuxm: number;
  bonusStatus: {
    amount: number;
    expiresAt: string | null;
    usableFor: string[];
    note: string;
  } | null;
  totalValueUsd: number;
}

interface WalletContextType {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  balances: UserBalances | null;
  summary: BalanceSummary | null;
  balancesLoading: boolean;
  balancesError: string | null;
  refreshBalances: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const DEFAULT_BALANCES: UserBalances = {
  auxm: 0,
  bonusAuxm: 0,
  totalAuxm: 0,
  bonusExpiresAt: null,
  auxg: 0,
  auxs: 0,
  auxpt: 0,
  auxpd: 0,
  eth: 0,
  btc: 0,
  xrp: 0,
  sol: 0,
  usdt: 0,
  usd: 0,
};

export function WalletProvider({ children }: { children: ReactNode }) {

  const { address: wagmiAddress, isConnected: wagmiConnected, chainId: wagmiChainId } = useAccount();
  // Storage keys
  const STORAGE_KEYS = {
    HAS_WALLET: "auxite_has_wallet",
    WALLET_ADDRESS: "auxite_wallet_address",
    WALLET_MODE: "auxite_wallet_mode",
    SESSION_UNLOCKED: "auxite_session_unlocked",
  };

  // Local wallet state
  const [localWalletAddress, setLocalWalletAddress] = useState<string | null>(null);
  const [walletMode, setWalletMode] = useState<string | null>(null);
  const [isSessionUnlocked, setIsSessionUnlocked] = useState(false);

  // Load local wallet on mount
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

  // Determine effective address and connection status
  const isConnected = 
    (walletMode === "local" && !!localWalletAddress && isSessionUnlocked) ||
    ((walletMode === "external" || !walletMode) && wagmiConnected);
  
  const address = walletMode === "local" ? localWalletAddress : wagmiAddress || null;

  
  const [balances, setBalances] = useState<UserBalances | null>(null);
  const [summary, setSummary] = useState<BalanceSummary | null>(null);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [balancesError, setBalancesError] = useState<string | null>(null);

  const fetchBalances = useCallback(async (walletAddress: string) => {
    console.log("🔄 fetchBalances called:", walletAddress);
    
    if (!walletAddress) {
      console.log("❌ No wallet address");
      return;
    }

    setBalancesLoading(true);
    setBalancesError(null);

    try {
      const url = `/api/user/balance?address=${walletAddress}`;
      console.log("📡 Fetching:", url);
      
      const response = await fetch(url);
      console.log("📥 Response status:", response.status);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Balance data:", data);

      if (data.error) {
        throw new Error(data.error);
      }

      setBalances(data.balances);
      setSummary(data.summary);
    } catch (error) {
      console.error("❌ Balance fetch error:", error);
      setBalancesError(error instanceof Error ? error.message : "Bakiye alınamadı");
      setBalances(DEFAULT_BALANCES);
    } finally {
      setBalancesLoading(false);
    }
  }, []);

  const refreshBalances = useCallback(async () => {
    if (address) {
      await fetchBalances(address);
    }
  }, [address, fetchBalances]);

  useEffect(() => {
    console.log("📍 Wagmi state:", { isConnected, address: address, chainId: wagmiChainId });
    
    if (isConnected && address) {
      console.log("✅ Wagmi connected! Fetching balances...");
      fetchBalances(address);

      const interval = setInterval(() => {
        console.log("⏰ Auto-refresh balances");
        fetchBalances(address);
      }, 30000);

      return () => clearInterval(interval);
    } else {
      console.log("❌ Wagmi not connected, clearing balances");
      setBalances(null);
      setSummary(null);
    }
  }, [isConnected, address, wagmiChainId, fetchBalances]);

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        address,
        chainId: wagmiChainId || null,
        balances,
        summary,
        balancesLoading,
        balancesError,
        refreshBalances,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}

export function useBalance(token: keyof UserBalances) {
  const { balances } = useWallet();
  return balances?.[token] ?? 0;
}

export function useMetalBalances() {
  const { balances } = useWallet();
  return {
    auxg: balances?.auxg ?? 0,
    auxs: balances?.auxs ?? 0,
    auxpt: balances?.auxpt ?? 0,
    auxpd: balances?.auxpd ?? 0,
  };
}

export function useAuxmBalance() {
  const { balances, summary } = useWallet();
  return {
    total: balances?.totalAuxm ?? 0,
    available: summary?.withdrawableAuxm ?? 0,
    bonus: balances?.bonusAuxm ?? 0,
    bonusExpiresAt: balances?.bonusExpiresAt ?? null,
  };
}