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

  return {
    demoActive,
    demoBalance,
    demoChecked,
    demoLoading,
    activateDemo,
    deactivateDemo,
    refreshDemo: checkDemoStatus,
    executeDemoTrade,
  };
}
