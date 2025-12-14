// hooks/useDashboardStats.ts
// Dashboard stats from staking contract

import { useStaking } from './useStaking';
import { useMemo } from 'react';

interface DashboardStats {
  totalLocked: number;
  activePositions: number;
  annualEarnings: number;
  avgAPY: number;
}

// Metal prices (USD per gram) - in production, fetch from oracle
const METAL_PRICES: Record<string, number> = {
  AUXG: 85,    // Gold ~$85/gram
  AUXS: 1.05,  // Silver ~$1.05/gram
  AUXPT: 32,   // Platinum ~$32/gram
  AUXPD: 35,   // Palladium ~$35/gram
};

export function useDashboardStats(address?: string) {
  const { activeStakes, loading, isConnected } = useStaking();

  const stats = useMemo<DashboardStats>(() => {
    if (!activeStakes || activeStakes.length === 0) {
      return {
        totalLocked: 0,
        activePositions: 0,
        annualEarnings: 0,
        avgAPY: 0,
      };
    }

    let totalLockedUSD = 0;
    let totalExpectedRewardUSD = 0;
    let totalAPY = 0;

    activeStakes.forEach((stake) => {
      const price = METAL_PRICES[stake.metalSymbol] || 85;
      
      // Total locked value in USD
      totalLockedUSD += stake.amountGrams * price;
      
      // Expected annual reward in USD
      totalExpectedRewardUSD += stake.expectedRewardGrams * price;
      
      // Sum APY for average calculation
      totalAPY += stake.apyPercent;
    });

    const avgAPY = activeStakes.length > 0 ? totalAPY / activeStakes.length : 0;

    return {
      totalLocked: Math.round(totalLockedUSD),
      activePositions: activeStakes.length,
      annualEarnings: Math.round(totalExpectedRewardUSD),
      avgAPY: parseFloat(avgAPY.toFixed(2)),
    };
  }, [activeStakes]);

  return {
    stats,
    loading,
    isConnected,
  };
}

export default useDashboardStats;
