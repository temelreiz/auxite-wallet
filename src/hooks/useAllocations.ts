// hooks/useAllocations.ts
// React hook for Auxite metal allocations (from Redis API)

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';

// Metal info
const METAL_INFO: Record<string, { name: string; icon: string; color: string }> = {
  AUXG: { name: 'Gold', icon: '/gold-favicon-32x32.png', color: '#FFD700' },
  AUXS: { name: 'Silver', icon: '/silver-favicon-32x32.png', color: '#C0C0C0' },
  AUXPT: { name: 'Platinum', icon: '/platinum-favicon-32x32.png', color: '#E5E4E2' },
  AUXPD: { name: 'Palladium', icon: '/palladium-favicon-32x32.png', color: '#CED0DD' },
};

// Types
export interface FormattedAllocation {
  id: string;
  buyer: string;
  metal: string;
  metalSymbol: string;
  metalIcon: string;
  metalColor: string;
  grams: number;
  custodian: string;
  timestamp: Date;
  active: boolean;
  valueUSD?: number;
  allocationCode: string;
  txHash?: string;
  certificateNumber?: string;
}

export interface AllocationData {
  buyer: `0x${string}`;
  grams: bigint;
  custodian: string;
  timestamp: bigint;
  active: boolean;
}

export interface CollateralizationInfo {
  metal: string;
  ratio: number;
  supplyGrams: number;
  reserveGrams: number;
  isFullyBacked: boolean;
}

// Main hook for user allocations
export function useAllocations(metalSymbol?: 'AUXG' | 'AUXS' | 'AUXPT' | 'AUXPD') {
  const { address, isConnected } = useAccount();
  const [allocations, setAllocations] = useState<FormattedAllocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllocations = useCallback(async () => {
    if (!address) {
      setAllocations([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/allocations?address=${address}`);
      const data = await res.json();

      if (data.success && data.allocations) {
        const formatted: FormattedAllocation[] = data.allocations
          .filter((a: any) => a.status === 'active')
          .filter((a: any) => !metalSymbol || a.metal === metalSymbol)
          .map((a: any) => {
            const metalInfo = METAL_INFO[a.metal] || { name: 'Unknown', icon: '', color: '#888' };
            return {
              id: a.id,
              buyer: address,
              metal: metalInfo.name,
              metalSymbol: a.metal,
              metalIcon: metalInfo.icon,
              metalColor: metalInfo.color,
              grams: parseFloat(a.grams) || 0,
              custodian: a.vaultName || a.vault || '',
              timestamp: new Date(a.allocatedAt),
              active: a.status === 'active',
              allocationCode: a.serialNumber || a.id,
              txHash: a.txHash,
              certificateNumber: a.certificateNumber,
            };
          });

        // Sort by timestamp descending
        formatted.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setAllocations(formatted);
      }
    } catch (err: any) {
      console.error('Failed to fetch allocations:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [address, metalSymbol]);

  useEffect(() => {
    fetchAllocations();
  }, [fetchAllocations]);

  // Group allocations by metal
  const allocationsByMetal: Record<string, FormattedAllocation[]> = {
    AUXG: [],
    AUXS: [],
    AUXPT: [],
    AUXPD: [],
  };

  allocations.forEach((alloc) => {
    if (allocationsByMetal[alloc.metalSymbol]) {
      allocationsByMetal[alloc.metalSymbol].push(alloc);
    }
  });

  // Calculate total grams per metal
  const totalGrams: Record<string, number> = {
    AUXG: 0,
    AUXS: 0,
    AUXPT: 0,
    AUXPD: 0,
  };

  Object.entries(allocationsByMetal).forEach(([metal, allocs]) => {
    totalGrams[metal] = allocs.reduce((sum, a) => sum + a.grams, 0);
  });

  // Summary stats
  const summary = {
    totalAllocations: allocations.length,
    activeAllocations: allocations.filter(a => a.active).length,
    byMetal: Object.keys(METAL_INFO).reduce((acc, symbol) => {
      const metalAllocs = allocations.filter(a => a.metalSymbol === symbol && a.active);
      acc[symbol] = {
        count: metalAllocs.length,
        totalGrams: metalAllocs.reduce((sum, a) => sum + a.grams, 0),
      };
      return acc;
    }, {} as Record<string, { count: number; totalGrams: number }>),
  };

  return {
    allocations,
    activeAllocations: allocations.filter(a => a.active),
    allocationsByMetal,
    totalGrams,
    summary,
    loading: isLoading,
    isLoading,
    error,
    isConnected,
    refresh: fetchAllocations,
  };
}

// Hook for single allocation by ID - not used with Redis
export function useAllocation(metalSymbol: 'AUXG' | 'AUXS' | 'AUXPT' | 'AUXPD', allocId: number) {
  return {
    allocation: null,
    loading: false,
    error: null,
    refetch: () => {},
  };
}

// Hook for collateralization ratio - placeholder
export function useCollateralization(metalSymbol: 'AUXG' | 'AUXS' | 'AUXPT' | 'AUXPD') {
  return {
    info: null,
    loading: false,
    error: null,
    refetch: () => {},
  };
}

// Hook for all collateralization ratios - placeholder
export function useAllCollateralization() {
  return {
    ratios: [],
    loading: false,
    refetch: () => {},
    averageRatio: 0,
    allFullyBacked: false,
  };
}

export default useAllocations;
