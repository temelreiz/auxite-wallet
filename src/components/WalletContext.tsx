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
  metals?: {
    auxg: number;
    auxs: number;
    auxpt: number;
    auxpd: number;
  };
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

  const STORAGE_KEYS = {
    HAS_WALLET: "auxite_has_wallet",
    WALLET_ADDRESS: "auxite_wallet_address",
    WALLET_MODE: "auxite_wallet_mode",
    SESSION_UNLOCKED: "auxite_session_unlocked",
  };

  const [localWalletAddress, setLocalWalletAddress] = useState<string | null>(null);
  const [walletMode, setWalletMode] = useState<string | null>(null);
  const [isSessionUnlocked, setIsSessionUnlocked] = useState(false);
  const [balances, setBalances] = useState<UserBalances | null>(null);
  const [summary, setSummary] = useState<BalanceSummary | null>(null);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [balancesError, setBalancesError] = useState<string | null>(null);

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

  const isConnected = walletMode === "local"
    ? isSessionUnlocked && !!localWalletAddress
    : wagmiConnected;

  const address = walletMode === "local" ? localWalletAddress : wagmiAddress ?? null;
  const chainId = wagmiChainId ?? null;

  const fetchBalances = useCallback(async (walletAddress: string) => {
    console.log("🔄 fetchBalances called:", walletAddress);

    if (!walletAddress) {
      console.log("❌ No wallet address");
      return;
    }
    setBalancesLoading(true);
    setBalancesError(null);
    try {
      // Fetch both Redis and blockchain balances
      const [redisRes, blockchainRes] = await Promise.all([
        fetch(`/api/user/balance?address=${walletAddress}`),
        fetch(`/api/user/blockchain-balance?address=${walletAddress}`),
      ]);

      const redisData = await redisRes.json();
      const blockchainData = await blockchainRes.json();

      console.log("✅ Redis data:", redisData);
      console.log("✅ Blockchain data:", blockchainData);

      // Merge: use Redis for AUXM/bonus, blockchain for metals/ETH/USDT
      const mergedBalances = {
        ...redisData.balances,
        auxg: blockchainData.balances?.auxg ?? redisData.balances?.auxg ?? 0,
        auxs: blockchainData.balances?.auxs ?? redisData.balances?.auxs ?? 0,
        auxpt: blockchainData.balances?.auxpt ?? redisData.balances?.auxpt ?? 0,
        auxpd: blockchainData.balances?.auxpd ?? redisData.balances?.auxpd ?? 0,
        eth: blockchainData.balances?.eth ?? redisData.balances?.eth ?? 0,
        usdt: blockchainData.balances?.usdt ?? redisData.balances?.usdt ?? 0,
      };

      setBalances(mergedBalances);
      setSummary({
        ...redisData.summary,
        metals: {
          auxg: mergedBalances.auxg,
          auxs: mergedBalances.auxs,
          auxpt: mergedBalances.auxpt,
          auxpd: mergedBalances.auxpd,
        },
      });
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
    if (isConnected && address) {
      fetchBalances(address);
      const interval = setInterval(() => {
        fetchBalances(address);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isConnected, address, fetchBalances]);

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        address,
        chainId,
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
