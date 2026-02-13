// src/components/WalletContext.tsx
"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAccount } from "wagmi";

export type WalletType = "metamask" | "walletconnect" | "coinbase" | "ledger" | "trezor" | null;

interface UserBalances {
  auxm: number;
  totalAuxm: number;
  auxg: number;
  auxs: number;
  auxpt: number;
  auxpd: number;
  eth: number;
  btc: number;
  xrp: number;
  sol: number;
  usdt: number;
  usdc: number;
  usd: number;
}

interface BalanceSummary {
  totalAuxm: number;
  withdrawableAuxm: number;
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
  totalAuxm: 0,
  auxg: 0,
  auxs: 0,
  auxpt: 0,
  auxpd: 0,
  eth: 0,
  btc: 0,
  xrp: 0,
  sol: 0,
  usdt: 0,
  usdc: 0,
  usd: 0,
};

export function WalletProvider({ children }: { children: ReactNode }) {
  // Wagmi'den bağlantı bilgilerini al
  const { address: wagmiAddress, isConnected: wagmiConnected, chainId: wagmiChainId } = useAccount();
  
  const [balances, setBalances] = useState<UserBalances | null>(null);
  const [summary, setSummary] = useState<BalanceSummary | null>(null);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [balancesError, setBalancesError] = useState<string | null>(null);

  // Bakiye çekme fonksiyonu
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

  // Manuel bakiye yenileme
  const refreshBalances = useCallback(async () => {
    if (wagmiAddress) {
      await fetchBalances(wagmiAddress);
    }
  }, [wagmiAddress, fetchBalances]);

  // Wagmi bağlantı durumu değiştiğinde bakiyeleri çek
  useEffect(() => {
    console.log("📍 Wagmi state:", { isConnected: wagmiConnected, address: wagmiAddress, chainId: wagmiChainId });
    
    if (wagmiConnected && wagmiAddress) {
      console.log("✅ Wagmi connected! Fetching balances...");
      fetchBalances(wagmiAddress);

      // Her 30 saniyede bakiyeleri yenile
      const interval = setInterval(() => {
        console.log("⏰ Auto-refresh balances");
        fetchBalances(wagmiAddress);
      }, 30000);

      return () => clearInterval(interval);
    } else {
      console.log("❌ Wagmi not connected, clearing balances");
      setBalances(null);
      setSummary(null);
    }
  }, [wagmiConnected, wagmiAddress, wagmiChainId, fetchBalances]);

  return (
    <WalletContext.Provider
      value={{
        isConnected: wagmiConnected,
        address: wagmiAddress || null,
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
  };
}