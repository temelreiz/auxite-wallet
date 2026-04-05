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
  metals?: {
    auxg: number;
    auxs: number;
    auxpt: number;
    auxpd: number;
  };
}

// Staked amounts from balance API
export interface StakedAmounts {
  auxg: number;
  auxs: number;
  auxpt: number;
  auxpd: number;
}

// Allocation amounts (physical metal allocations)
export interface AllocationAmounts {
  auxg: number;
  auxs: number;
  auxpt: number;
  auxpd: number;
}

export interface DemoAllocations {
  auxg: number;
  auxs: number;
  auxpt: number;
  auxpd: number;
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
  stakedAmounts: StakedAmounts | null;
  allocationAmounts: AllocationAmounts | null;
  summary: BalanceSummary | null;
  balancesLoading: boolean;
  balancesError: string | null;
  refreshBalances: () => Promise<void>;

  // Demo Mode (Start With Gold)
  isDemoMode: boolean;
  demoBalance: number;
  demoAllocations: DemoAllocations;
  welcomeGoldStatus: 'none' | 'pending' | 'demo_unlocked' | 'unlocked' | 'activated';
  hasCompletedFirstDemoTrade: boolean;
  enterDemoMode: (email?: string) => void;
  exitDemoMode: () => void;
  demoTrade: (metal: string, action: 'buy' | 'sell', amountUsd: number, price: number) => void;
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
    } else if (savedMode === "custody" && savedAddress) {
      // Email/custody login — treat as local wallet (no external wallet needed)
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
      } else if (mode === "custody" && addr) {
        // Email/custody login — treat as local wallet
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

  // ─── Demo Mode State ───────────────────────────────────────────
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoBalance, setDemoBalance] = useState(1000);
  const [demoAllocations, setDemoAllocations] = useState<DemoAllocations>({ auxg: 0, auxs: 0, auxpt: 0, auxpd: 0 });
  const [welcomeGoldStatus, setWelcomeGoldStatus] = useState<'none' | 'pending' | 'demo_unlocked' | 'unlocked' | 'activated'>('none');
  const [hasCompletedFirstDemoTrade, setHasCompletedFirstDemoTrade] = useState(false);

  // Determine effective address and connection status
  const isLocalWallet = walletMode === "local" && !!localWalletAddress;
  const isConnected = isLocalWallet || isExternalConnected || isDemoMode;
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

  // Check localStorage for demo mode on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('auxite_demo_mode');
      if (saved === 'true') {
        setIsDemoMode(true);
        setWelcomeGoldStatus('pending');
        const savedBalance = localStorage.getItem('auxite_demo_balance');
        if (savedBalance) setDemoBalance(parseFloat(savedBalance));
        const savedAlloc = localStorage.getItem('auxite_demo_allocations');
        if (savedAlloc) {
          try { setDemoAllocations(JSON.parse(savedAlloc)); } catch {}
        }
        const savedFirstTrade = localStorage.getItem('auxite_demo_first_trade');
        if (savedFirstTrade === 'true') {
          setHasCompletedFirstDemoTrade(true);
          setWelcomeGoldStatus('demo_unlocked');
        }
      }
    }
  }, []);

  const enterDemoMode = useCallback((email?: string) => {
    setIsDemoMode(true);
    setDemoBalance(1000);
    setDemoAllocations({ auxg: 0, auxs: 0, auxpt: 0, auxpd: 0 });
    setWelcomeGoldStatus('pending');
    setHasCompletedFirstDemoTrade(false);
    localStorage.setItem('auxite_demo_mode', 'true');
    localStorage.removeItem('auxite_demo_balance');
    localStorage.removeItem('auxite_demo_allocations');
    localStorage.removeItem('auxite_demo_first_trade');
    // Save email for re-engagement
    if (email) {
      fetch('/api/demo-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      }).catch(() => {});
    }
  }, []);

  const exitDemoMode = useCallback(() => {
    setIsDemoMode(false);
    setDemoBalance(1000);
    setDemoAllocations({ auxg: 0, auxs: 0, auxpt: 0, auxpd: 0 });
    localStorage.removeItem('auxite_demo_mode');
    localStorage.removeItem('auxite_demo_balance');
    localStorage.removeItem('auxite_demo_allocations');
    localStorage.removeItem('auxite_demo_first_trade');
  }, []);

  const demoTrade = useCallback((metal: string, action: 'buy' | 'sell', amountUsd: number, price: number) => {
    const grams = amountUsd / price;
    const key = metal.toLowerCase() as keyof DemoAllocations;

    if (action === 'buy') {
      if (amountUsd > demoBalance) return;
      const newBalance = demoBalance - amountUsd;
      const newAlloc = { ...demoAllocations, [key]: demoAllocations[key] + grams };
      setDemoBalance(newBalance);
      setDemoAllocations(newAlloc);
      localStorage.setItem('auxite_demo_balance', newBalance.toString());
      localStorage.setItem('auxite_demo_allocations', JSON.stringify(newAlloc));
    } else {
      if (demoAllocations[key] < grams) return;
      const newBalance = demoBalance + amountUsd;
      const newAlloc = { ...demoAllocations, [key]: demoAllocations[key] - grams };
      setDemoBalance(newBalance);
      setDemoAllocations(newAlloc);
      localStorage.setItem('auxite_demo_balance', newBalance.toString());
      localStorage.setItem('auxite_demo_allocations', JSON.stringify(newAlloc));
    }

    // First trade detection
    if (!hasCompletedFirstDemoTrade) {
      setHasCompletedFirstDemoTrade(true);
      setWelcomeGoldStatus('demo_unlocked');
      localStorage.setItem('auxite_demo_first_trade', 'true');
    }
  }, [demoBalance, demoAllocations, hasCompletedFirstDemoTrade]);

  const [balances, setBalances] = useState<UserBalances | null>(null);
  const [stakedAmounts, setStakedAmounts] = useState<StakedAmounts | null>(null);
  const [allocationAmounts, setAllocationAmounts] = useState<AllocationAmounts | null>(null);
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
        totalAuxm: redisData.balances?.auxm ?? 0,
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
        usdc: redisData.balances?.usdc ?? 0,
        usd: redisData.balances?.usd ?? 0,
      };

      setBalances(merged);

      // Extract staked amounts from API response
      setStakedAmounts({
        auxg: redisData.stakedAmounts?.auxg ?? 0,
        auxs: redisData.stakedAmounts?.auxs ?? 0,
        auxpt: redisData.stakedAmounts?.auxpt ?? 0,
        auxpd: redisData.stakedAmounts?.auxpd ?? 0,
      });

      // Set allocation amounts (from /api/allocations response)
      setAllocationAmounts(allocTotals);

      setSummary({
        ...redisData.summary,
        metals: allocTotals,
      });
    } catch {
      setBalances(DEFAULT_BALANCES);
      setStakedAmounts({ auxg: 0, auxs: 0, auxpt: 0, auxpd: 0 });
      setAllocationAmounts({ auxg: 0, auxs: 0, auxpt: 0, auxpd: 0 });
      setBalancesError("Balances could not be loaded");
    } finally {
      setBalancesLoading(false);
    }
  }, []);

  const refreshBalances = useCallback(async () => {
    if (address) await fetchBalances(address);
  }, [address, fetchBalances]);

  useEffect(() => {
    if (!isConnected || !address || isDemoMode) return;

    fetchBalances(address);
    const interval = setInterval(() => fetchBalances(address), 30000);
    return () => clearInterval(interval);
  }, [isConnected, address, isDemoMode, fetchBalances]);

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
        stakedAmounts,
        allocationAmounts,
        summary,
        balancesLoading,
        balancesError,
        refreshBalances,

        // Demo Mode
        isDemoMode,
        demoBalance,
        demoAllocations,
        welcomeGoldStatus,
        hasCompletedFirstDemoTrade,
        enterDemoMode,
        exitDemoMode,
        demoTrade,
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
