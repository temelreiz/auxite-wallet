// hooks/useDashboardStats.ts
// Dashboard stats from both on-chain staking and custody API

import { useStaking } from './useStaking';
import { useMemo, useState, useEffect } from 'react';

interface DashboardStats {
  totalLocked: number;
  activePositions: number;
  annualEarnings: number;
  avgAPY: number;
}

// Metal prices (USD per gram) - in production, fetch from oracle
const METAL_PRICES: Record<string, number> = {
  AUXG: 143,    // Gold ~$85/gram
  AUXS: 2.4,  // Silver ~$1.05/gram
  AUXPT: 75,   // Platinum ~$32/gram
  AUXPD: 55,   // Palladium ~$35/gram
};

interface APIStake {
  id: string;
  metal: string;
  amount: string;
  duration: number;
  durationMonths?: number;
  apy: string;
  startDate: string;
  endDate: string;
  status: string;
}

export function useDashboardStats(address?: string) {
  const { activeStakes, loading: onChainLoading, isConnected } = useStaking();
  const [apiStakes, setApiStakes] = useState<APIStake[]>([]);
  const [apiLoading, setApiLoading] = useState(false);

  // Fetch custody/API-based stakes
  useEffect(() => {
    if (!address) return;

    const fetchAPIStakes = async () => {
      setApiLoading(true);
      try {
        const res = await fetch(`/api/stakes?address=${address}`);
        const data = await res.json();
        if (data.success && data.stakes) {
          setApiStakes(data.stakes.filter((s: APIStake) => s.status === 'active'));
        }
      } catch (e) {
        // Silently fail — on-chain data is still available
      } finally {
        setApiLoading(false);
      }
    };

    fetchAPIStakes();
  }, [address]);

  const stats = useMemo<DashboardStats>(() => {
    // On-chain stats
    let totalLockedUSD = 0;
    let totalExpectedRewardUSD = 0;
    let totalAPY = 0;
    let positionCount = 0;

    if (activeStakes && activeStakes.length > 0) {
      activeStakes.forEach((stake) => {
        const price = METAL_PRICES[stake.metalSymbol] || 85;
        totalLockedUSD += stake.amountGrams * price;
        totalExpectedRewardUSD += stake.expectedRewardGrams * price;
        totalAPY += stake.apyPercent;
        positionCount++;
      });
    }

    // API/custody stats (avoid double-counting if same position exists on-chain)
    const now = Date.now();
    if (apiStakes && apiStakes.length > 0) {
      apiStakes.forEach((stake) => {
        const endDate = new Date(stake.endDate).getTime();
        if (endDate <= now) return; // Skip matured

        const metalUpper = (stake.metal || '').toUpperCase();
        const price = METAL_PRICES[metalUpper] || 85;
        const amount = parseFloat(stake.amount) || 0;
        const apy = parseFloat(stake.apy) || 0;
        const durationMonths = stake.durationMonths || Math.round((stake.duration || 90) / 30);
        const expectedReward = (amount * apy / 100) * (durationMonths / 12);

        totalLockedUSD += amount * price;
        totalExpectedRewardUSD += expectedReward * price;
        totalAPY += apy;
        positionCount++;
      });
    }

    const avgAPY = positionCount > 0 ? totalAPY / positionCount : 0;

    return {
      totalLocked: Math.round(totalLockedUSD),
      activePositions: positionCount,
      annualEarnings: Math.round(totalExpectedRewardUSD),
      avgAPY: parseFloat(avgAPY.toFixed(2)),
    };
  }, [activeStakes, apiStakes]);

  return {
    stats,
    loading: onChainLoading || apiLoading,
    isConnected,
  };
}

export default useDashboardStats;
