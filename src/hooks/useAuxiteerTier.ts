/**
 * useAuxiteerTier Hook
 * Kullanıcının Auxiteer tier bilgisini API'den çeker
 */

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';

export interface AuxiteerTierData {
  id: string;
  name: string;
  spread: number;
  fee: number;
}

export interface AuxiteerStats {
  balanceUsd: number;
  daysSinceRegistration: number;
  registeredAt: string | null;
  isKycVerified: boolean;
  kycLevel: string;
  hasMetalAsset: boolean;
  hasActiveLease: boolean;
}

export interface AuxiteerProgress {
  nextTier: string;
  nextTierName: string;
  requirements: {
    balanceUsd: { current: number; required: number; met: boolean };
    days: { current: number; required: number; met: boolean };
    kyc: { current: boolean; required: boolean; met: boolean };
    metalAsset: { current: boolean; required: boolean; met: boolean };
    activeLease: { current: boolean; required: boolean; met: boolean };
  };
}

export interface AuxiteerTierInfo {
  id: string;
  name: string;
  spread: number;
  fee: number;
  requirements: {
    kyc: boolean;
    minBalanceUsd: number;
    minDays: number;
    metalAsset: boolean;
    activeEarnLease: boolean;
    invitation: boolean;
  };
  isCurrent: boolean;
}

export interface UseAuxiteerTierReturn {
  tier: AuxiteerTierData | null;
  stats: AuxiteerStats | null;
  progress: AuxiteerProgress | null;
  allTiers: AuxiteerTierInfo[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAuxiteerTier(): UseAuxiteerTierReturn {
  const { address, isConnected } = useAccount();
  const [tier, setTier] = useState<AuxiteerTierData | null>(null);
  const [stats, setStats] = useState<AuxiteerStats | null>(null);
  const [progress, setProgress] = useState<AuxiteerProgress | null>(null);
  const [allTiers, setAllTiers] = useState<AuxiteerTierInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTierData = useCallback(async () => {
    if (!address || !isConnected) {
      setTier(null);
      setStats(null);
      setProgress(null);
      setAllTiers([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auxiteer', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setTier(data.tier);
      setStats(data.stats);
      setProgress(data.progress);
      setAllTiers(data.allTiers || []);
    } catch (err) {
      console.error('Failed to fetch Auxiteer tier:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tier data');
      
      // Fallback to default tier
      setTier({
        id: 'regular',
        name: 'Regular',
        spread: 1.0,
        fee: 0.35,
      });
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected]);

  useEffect(() => {
    fetchTierData();
  }, [fetchTierData]);

  // Her 5 dakikada bir güncelle
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(fetchTierData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isConnected, fetchTierData]);

  return {
    tier,
    stats,
    progress,
    allTiers,
    isLoading,
    error,
    refetch: fetchTierData,
  };
}

// Spread/Fee formatters
export function formatSpread(spread: number): string {
  if (spread === 0) return 'Custom';
  return `${spread.toFixed(2)}%`;
}

export function formatFee(fee: number): string {
  if (fee === 0) return 'Custom';
  return `${fee.toFixed(2)}%`;
}

// Tier color helpers
export function getTierColor(tierId: string): string {
  const colors: Record<string, string> = {
    regular: '#64748b',
    core: '#10b981',
    reserve: '#3b82f6',
    vault: '#8b5cf6',
    sovereign: '#0f172a',
  };
  return colors[tierId] || colors.regular;
}

export function getTierBgColor(tierId: string): string {
  const colors: Record<string, string> = {
    regular: 'rgba(100, 116, 139, 0.1)',
    core: 'rgba(16, 185, 129, 0.1)',
    reserve: 'rgba(59, 130, 246, 0.1)',
    vault: 'rgba(139, 92, 246, 0.1)',
    sovereign: 'rgba(15, 23, 42, 0.1)',
  };
  return colors[tierId] || colors.regular;
}

export function getTierBorderColor(tierId: string): string {
  const colors: Record<string, string> = {
    regular: 'rgba(100, 116, 139, 0.3)',
    core: 'rgba(16, 185, 129, 0.3)',
    reserve: 'rgba(59, 130, 246, 0.3)',
    vault: 'rgba(139, 92, 246, 0.3)',
    sovereign: 'rgba(15, 23, 42, 0.5)',
  };
  return colors[tierId] || colors.regular;
}

export default useAuxiteerTier;
