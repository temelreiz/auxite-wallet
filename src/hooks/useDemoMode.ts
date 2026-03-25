"use client";

import { useState, useEffect, useCallback } from "react";

export interface DemoBalance {
  usdt: number;
  auxm: number;
  auxg: number;
  auxs: number;
  auxpt: number;
  auxpd: number;
  eth: number;
  btc: number;
  usdc: number;
  [key: string]: number;
}

export interface DemoLease {
  id: string;
  metal: string;
  amount: number;
  termDays: number;
  termLabel: string;
  apyPercent: number;
  estimatedYieldGrams: number;
  startDate: string;
  maturityDate: string;
  status: string;
}

export interface DemoWithdrawal {
  id: string;
  asset: string;
  amount: number;
  toAddress: string;
  status: string;
  estimatedArrival: string;
  timestamp: string;
}

interface UseDemoModeReturn {
  /** Whether demo mode is currently active */
  demoActive: boolean;
  /** Demo balances (null if demo not active) */
  demoBalance: DemoBalance | null;
  /** Whether the initial demo check has completed */
  demoChecked: boolean;
  /** Whether an activation/deactivation is in progress */
  demoLoading: boolean;
  /** Activate demo mode for this address */
  activateDemo: () => Promise<void>;
  /** Deactivate demo mode for this address */
  deactivateDemo: () => Promise<void>;
  /** Re-fetch demo status and balance from the server */
  refreshDemo: () => Promise<void>;
  /** Execute a demo trade via /api/demo/trade */
  executeDemoTrade: (params: {
    fromAsset: string;
    toAsset: string;
    fromAmount: number;
  }) => Promise<{ success: boolean; transaction?: any; error?: string }>;
  /** Execute a demo lease (lock metal for yield) */
  executeDemoLease: (params: {
    fromAsset: string;
    fromAmount: number;
    termDays: number;
  }) => Promise<{ success: boolean; lease?: DemoLease; transaction?: any; error?: string }>;
  /** Execute a demo withdrawal (simulation) */
  executeDemoWithdraw: (params: {
    fromAsset: string;
    fromAmount: number;
    toAddress?: string;
  }) => Promise<{ success: boolean; withdrawal?: DemoWithdrawal; transaction?: any; error?: string }>;
  /** Fetch demo leases */
  fetchDemoLeases: () => Promise<DemoLease[]>;
  /** Fetch demo withdrawals */
  fetchDemoWithdrawals: () => Promise<DemoWithdrawal[]>;
}

export function useDemoMode(address: string | null): UseDemoModeReturn {
  const [demoActive, setDemoActive] = useState(false);
  const [demoBalance, setDemoBalance] = useState<DemoBalance | null>(null);
  const [demoChecked, setDemoChecked] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  // Check demo status on mount / address change
  const checkDemoStatus = useCallback(async () => {
    if (!address) {
      setDemoChecked(true);
      return;
    }
    try {
      const res = await fetch(`/api/demo?address=${address}`);
      const data = await res.json();
      setDemoActive(data.active === true);
      if (data.active && data.balance) {
        setDemoBalance(data.balance as DemoBalance);
      } else {
        setDemoBalance(null);
      }
    } catch {
      // Demo check failed, continue normally
    } finally {
      setDemoChecked(true);
    }
  }, [address]);

  useEffect(() => {
    checkDemoStatus();
  }, [checkDemoStatus]);

  // Activate demo mode
  const activateDemo = useCallback(async () => {
    if (!address || demoLoading) return;
    setDemoLoading(true);
    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = await res.json();
      if (data.success) {
        setDemoActive(true);
        setDemoBalance(data.balance as DemoBalance);
      }
    } catch (e) {
      console.error("Failed to activate demo:", e);
    } finally {
      setDemoLoading(false);
    }
  }, [address, demoLoading]);

  // Deactivate demo mode
  const deactivateDemo = useCallback(async () => {
    if (!address || demoLoading) return;
    setDemoLoading(true);
    try {
      const res = await fetch(`/api/demo?address=${address}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setDemoActive(false);
        setDemoBalance(null);
      }
    } catch (e) {
      console.error("Failed to deactivate demo:", e);
    } finally {
      setDemoLoading(false);
    }
  }, [address, demoLoading]);

  // Execute a demo trade
  const executeDemoTrade = useCallback(
    async (params: { fromAsset: string; toAsset: string; fromAmount: number }) => {
      if (!address) return { success: false, error: "No address" };

      try {
        const res = await fetch("/api/demo/trade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...params, address }),
        });
        const data = await res.json();

        if (data.success && data.transaction?.newBalance) {
          // Update local demo balance with the new values from trade
          setDemoBalance((prev) => {
            if (!prev) return prev;
            return { ...prev, ...data.transaction.newBalance };
          });
        }

        return data;
      } catch (e) {
        console.error("Demo trade failed:", e);
        return { success: false, error: "Network error" };
      }
    },
    [address]
  );

  // Execute a demo lease
  const executeDemoLease = useCallback(
    async (params: { fromAsset: string; fromAmount: number; termDays: number }) => {
      if (!address) return { success: false, error: "No address" };

      try {
        const res = await fetch("/api/demo/trade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...params, address, type: "lease" }),
        });
        const data = await res.json();

        if (data.success && data.transaction?.newBalance) {
          setDemoBalance((prev) => {
            if (!prev) return prev;
            return { ...prev, ...data.transaction.newBalance };
          });
        }

        return data;
      } catch (e) {
        console.error("Demo lease failed:", e);
        return { success: false, error: "Network error" };
      }
    },
    [address]
  );

  // Execute a demo withdrawal (simulation)
  const executeDemoWithdraw = useCallback(
    async (params: { fromAsset: string; fromAmount: number; toAddress?: string }) => {
      if (!address) return { success: false, error: "No address" };

      try {
        const res = await fetch("/api/demo/trade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...params, address, type: "withdraw" }),
        });
        const data = await res.json();

        if (data.success && data.transaction?.newBalance) {
          setDemoBalance((prev) => {
            if (!prev) return prev;
            return { ...prev, ...data.transaction.newBalance };
          });
        }

        return data;
      } catch (e) {
        console.error("Demo withdraw failed:", e);
        return { success: false, error: "Network error" };
      }
    },
    [address]
  );

  // Fetch demo leases
  const fetchDemoLeases = useCallback(async (): Promise<DemoLease[]> => {
    if (!address) return [];
    try {
      const res = await fetch(`/api/demo/trade?address=${address}&type=leases`);
      const data = await res.json();
      return data.leases || [];
    } catch {
      return [];
    }
  }, [address]);

  // Fetch demo withdrawals
  const fetchDemoWithdrawals = useCallback(async (): Promise<DemoWithdrawal[]> => {
    if (!address) return [];
    try {
      const res = await fetch(`/api/demo/trade?address=${address}&type=withdrawals`);
      const data = await res.json();
      return data.withdrawals || [];
    } catch {
      return [];
    }
  }, [address]);

  return {
    demoActive,
    demoBalance,
    demoChecked,
    demoLoading,
    activateDemo,
    deactivateDemo,
    refreshDemo: checkDemoStatus,
    executeDemoTrade,
    executeDemoLease,
    executeDemoWithdraw,
    fetchDemoLeases,
    fetchDemoWithdrawals,
  };
}
