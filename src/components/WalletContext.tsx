"use client";

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useState,
  type ReactNode,
} from "react";

import useWalletHook from "@/hooks/useWallet";
import { APP_CHAIN, isAllowedChain } from "@/config/chains";

/** Backward-compatible wallet type used by WalletConnectModal, etc. */
export type WalletType =
  | "metamask"
  | "walletconnect"
  | "coinbase"
  | "ledger"
  | "trezor"
  | null;

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

export interface WalletContextType {
  // wallet
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  chainName: string | null;
  connectorName?: string;
  disconnect: () => void;

  // chain switching (optional)
  canSwitchChain?: boolean;
  switchChain?: (targetChainId: number) => Promise<void>;

  // optional (compat / UI)
  walletType?: WalletType;
  setWalletType?: (t: WalletType) => void;

  // balances
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
  const {
    address: externalAddress,
    isConnected: isExternalConnected,
    chain,
    chainId,
    connectorName,
    disconnect: externalDisconnect,
    canSwitchChain,
    switchChain,
  } = useWalletHook();

  // QR Login state - check localStorage
  const [localWalletAddress, setLocalWalletAddress] = useState<string | null>(null);
  const [walletMode, setWalletMode] = useState<string | null>(null);

  // Load QR login wallet from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem("auxite_wallet_mode");
    const savedAddress = localStorage.getItem("auxite_wallet_address");
    const hasWallet = localStorage.getItem("auxite_has_wallet");
    const sessionUnlocked = sessionStorage.getItem("auxite_session_unlocked");

    if (savedMode === "local" && hasWallet === "true" && savedAddress && sessionUnlocked === "true") {
      setWalletMode("local");
      setLocalWalletAddress(savedAddress);
    } else if (savedMode) {
      setWalletMode(savedMode);
    }

    // Listen for wallet changes (QR login)
    const handleWalletChange = () => {
      const mode = localStorage.getItem("auxite_wallet_mode");
      const addr = localStorage.getItem("auxite_wallet_address");
      const hasW = localStorage.getItem("auxite_has_wallet");
      const unlocked = sessionStorage.getItem("auxite_session_unlocked");

      if (mode === "local" && hasW === "true" && addr && unlocked === "true") {
        setWalletMode("local");
        setLocalWalletAddress(addr);
      } else {
        setWalletMode(mode);
        setLocalWalletAddress(null);
      }
    };

    window.addEventListener("storage", handleWalletChange);
    window.addEventListener("walletChanged", handleWalletChange);

    return () => {
      window.removeEventListener("storage", handleWalletChange);
      window.removeEventListener("walletChanged", handleWalletChange);
    };
  }, []);

  // Determine effective address and connection status
  const isLocalWallet = walletMode === "local" && !!localWalletAddress;
  const isConnected = isLocalWallet || isExternalConnected;
  const address = isLocalWallet ? localWalletAddress : externalAddress;

  // Disconnect function - handles both local and external
  const disconnect = () => {
    if (isLocalWallet) {
      localStorage.removeItem("auxite_wallet_mode");
      localStorage.removeItem("auxite_wallet_address");
      localStorage.removeItem("auxite_has_wallet");
      sessionStorage.removeItem("auxite_session_unlocked");
      setWalletMode(null);
      setLocalWalletAddress(null);
      window.dispatchEvent(new Event("walletChanged"));
    } else {
      externalDisconnect();
    }
  };

  // WalletConnectModal gibi yerler seçilmiş wallet tipini tutmak istiyorsa (compat)
  const [walletType, setWalletType] = useState<WalletType>(null);

  const [balances, setBalances] = useState<UserBalances | null>(null);
  const [summary, setSummary] = useState<BalanceSummary | null>(null);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [balancesError, setBalancesError] = useState<string | null>(null);

  const fetchBalances = useCallback(async (walletAddress: string) => {
    if (!walletAddress) return;

    setBalancesLoading(true);
    setBalancesError(null);

    try {
      const [redisRes, blockchainRes, allocRes] = await Promise.all([
        fetch(`/api/user/balance?address=${walletAddress}`),
        fetch(`/api/user/blockchain-balance?address=${walletAddress}`),
        fetch(`/api/allocations?address=${walletAddress}`),
      ]);

      if (!redisRes.ok || !blockchainRes.ok || !allocRes.ok) {
        throw new Error("Balance API error");
      }

      const redisData = await redisRes.json();
      const blockchainData = await blockchainRes.json();
      const allocData = await allocRes.json();

      const allocTotals = { auxg: 0, auxs: 0, auxpt: 0, auxpd: 0 };
      if (Array.isArray(allocData.allocations)) {
        for (const a of allocData.allocations) {
          const metal = a.metal?.toLowerCase();
          const grams = Number(a.grams) || 0;
          if (metal && metal in allocTotals) {
            allocTotals[metal as keyof typeof allocTotals] += grams;
          }
        }
      }

      const merged: UserBalances = {
        auxm: redisData.balances?.auxm ?? 0,
        bonusAuxm: redisData.balances?.bonusAuxm ?? 0,
        totalAuxm:
          (redisData.balances?.auxm ?? 0) + (redisData.balances?.bonusAuxm ?? 0),
        bonusExpiresAt: redisData.balances?.bonusExpiresAt ?? null,
        // Metaller: Sadece Redis balance (allocations ayrı gösteriliyor)
        auxg: redisData.balances?.auxg ?? 0,
        auxs: redisData.balances?.auxs ?? 0,
        auxpt: redisData.balances?.auxpt ?? 0,
        auxpd: redisData.balances?.auxpd ?? 0,
        // Tüm crypto'lar Redis'ten (deposit edilmiş miktar)
        eth: redisData.balances?.eth ?? 0,
        btc: redisData.balances?.btc ?? 0,
        xrp: redisData.balances?.xrp ?? 0,
        sol: redisData.balances?.sol ?? 0,
        usdt: redisData.balances?.usdt ?? 0,
        usd: redisData.balances?.usd ?? 0,
      };

      setBalances(merged);
      setSummary({
        ...redisData.summary,
        metals: allocTotals,
      });
    } catch {
      setBalances(DEFAULT_BALANCES);
      setBalancesError("Balances could not be loaded");
    } finally {
      setBalancesLoading(false);
    }
  }, []);

  const refreshBalances = useCallback(async () => {
    if (address) await fetchBalances(address);
  }, [address, fetchBalances]);

  useEffect(() => {
    if (!isConnected || !address) return;

    fetchBalances(address);
    const interval = setInterval(() => fetchBalances(address), 30000);
    return () => clearInterval(interval);
  }, [isConnected, address, fetchBalances]);

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        address: address ?? null,
        // QR login (local wallet) has no chain - return null to skip chain checks
        chainId: isLocalWallet ? null : (chainId ?? null),
        chainName: isLocalWallet ? null : (chain?.name ?? null),
        connectorName: isLocalWallet ? "QR Login" : connectorName,
        disconnect,

        canSwitchChain: isLocalWallet ? false : canSwitchChain,
        switchChain: isLocalWallet ? undefined : switchChain,

        walletType,
        setWalletType,

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

/** Main public hook (keep name to avoid breaking imports) */
export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}

/** Backward-compat alias (some files import useWalletContext) */
export const useWalletContext = useWallet;

/**
 * Helper hook: use this for blocking critical actions on wrong chain.
 * Returns { blocked, reason, ctaLabel }.
 */
export function useWalletActionsGuard() {
  const { isConnected, chainId } = useWallet();
  const blocked = !!(isConnected && chainId !== null && !isAllowedChain(chainId));
  const reason = blocked ? `Wrong network. Switch to ${APP_CHAIN.name}.` : null;
  const ctaLabel = blocked ? `Switch to ${APP_CHAIN.name}` : null;
  return { blocked, reason, ctaLabel };
}
