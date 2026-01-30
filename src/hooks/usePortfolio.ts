// hooks/usePortfolio.ts
// Unified portfolio hook - single source of truth for asset values

import { useState, useEffect, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface PortfolioItem {
  symbol: string;
  name: string;
  balance: number;
  price: number;
  value: number;
  change24h: number;
}

export interface AllocationItem {
  id: string;
  metal: string;
  metalSymbol: string;
  grams: number;
  price: number;
  value: number;
  vault: string;
  status: string;
}

export interface StakingItem {
  id: string;
  metal: string;
  metalSymbol: string;
  amount: number;
  price: number;
  value: number;
  apy: number;
  duration: number;
  startDate: string;
  endDate: string;
  status: string;
}

export interface PortfolioBreakdown {
  metals: {
    value: number;
    items: PortfolioItem[];
  };
  crypto: {
    value: number;
    items: PortfolioItem[];
  };
  allocations: {
    value: number;
    totalGrams: Record<string, number>;
    items: AllocationItem[];
  };
  staking: {
    value: number;
    totalGrams: Record<string, number>;
    items: StakingItem[];
  };
}

export interface PortfolioPrices {
  metals: Record<string, { ask: number; bid: number; spot: number; change24h: number }>;
  crypto: Record<string, number>;
  usdt: number;
}

export interface PortfolioData {
  success: boolean;
  address: string;
  totalValue: number;
  availableValue: number;
  lockedValue: number;
  pendingValue: number;
  breakdown: PortfolioBreakdown;
  prices: PortfolioPrices;
  balances: {
    metals: Record<string, number>;
    crypto: Record<string, number>;
    auxm: number;
    bonusAuxm: number;
  };
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function usePortfolio(address: string | null | undefined) {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolio = useCallback(async () => {
    if (!address) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/user/portfolio?address=${address}`);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || "Failed to fetch portfolio");
      }

      setData(json);
    } catch (e) {
      console.error("Portfolio fetch error:", e);
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [address]);

  // Initial fetch
  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!address) return;

    const interval = setInterval(fetchPortfolio, 30000);
    return () => clearInterval(interval);
  }, [address, fetchPortfolio]);

  // Convenience getters
  const totalValue = data?.totalValue ?? 0;
  const availableValue = data?.availableValue ?? 0;
  const lockedValue = data?.lockedValue ?? 0;
  const pendingValue = data?.pendingValue ?? 0;

  const metals = data?.breakdown.metals ?? { value: 0, items: [] };
  const crypto = data?.breakdown.crypto ?? { value: 0, items: [] };
  const allocations = data?.breakdown.allocations ?? { value: 0, totalGrams: {}, items: [] };
  const staking = data?.breakdown.staking ?? { value: 0, totalGrams: {}, items: [] };

  const prices = data?.prices ?? {
    metals: {},
    crypto: {},
    usdt: 1,
  };

  const balances = data?.balances ?? {
    metals: {},
    crypto: {},
    auxm: 0,
    bonusAuxm: 0,
  };

  return {
    // Raw data
    data,
    loading,
    error,

    // Actions
    refresh: fetchPortfolio,

    // Main values
    totalValue,
    availableValue,
    lockedValue,
    pendingValue,

    // Breakdown
    metals,
    crypto,
    allocations,
    staking,

    // Prices (single source)
    prices,
    metalPrices: prices.metals,
    cryptoPrices: prices.crypto,

    // Raw balances
    balances,

    // Helpers
    isLoaded: !loading && data !== null,
    isEmpty: totalValue === 0,
  };
}

export default usePortfolio;
