// hooks/useAllocations.ts
// React hook for Auxite metal allocations (from AuxiteGoldV6, etc.)

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';

// Allocation ABI (from AuxiteGoldV6, etc.)
const ALLOCATION_ABI = [
  {
    name: 'allocations',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'allocId', type: 'uint256' }],
    outputs: [{
      type: 'tuple',
      components: [
        { name: 'buyer', type: 'address' },
        { name: 'grams', type: 'uint256' },
        { name: 'custodian', type: 'string' },
        { name: 'timestamp', type: 'uint256' },
        { name: 'active', type: 'bool' },
      ]
    }]
  },
  {
    name: 'getUserAllocations',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{
      type: 'tuple[]',
      components: [
        { name: 'buyer', type: 'address' },
        { name: 'grams', type: 'uint256' },
        { name: 'custodian', type: 'string' },
        { name: 'timestamp', type: 'uint256' },
        { name: 'active', type: 'bool' },
      ]
    }]
  },
  {
    name: 'getUserActiveAllocations',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{
      type: 'tuple[]',
      components: [
        { name: 'buyer', type: 'address' },
        { name: 'grams', type: 'uint256' },
        { name: 'custodian', type: 'string' },
        { name: 'timestamp', type: 'uint256' },
        { name: 'active', type: 'bool' },
      ]
    }]
  },
  {
    name: 'nextAllocId',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }]
  },
  {
    name: 'getCollateralizationRatio',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'ratio', type: 'uint256' },
      { name: 'supplyGrams', type: 'uint256' },
      { name: 'reserveGrams', type: 'uint256' },
    ]
  },
] as const;

// Contract addresses - update with deployed addresses
const METAL_CONTRACTS: Record<string, `0x${string}`> = {
  AUXG: process.env.NEXT_PUBLIC_AUXG_CONTRACT as `0x${string}`,
  AUXS: process.env.NEXT_PUBLIC_AUXS_CONTRACT as `0x${string}`,
  AUXPT: process.env.NEXT_PUBLIC_AUXPT_CONTRACT as `0x${string}`,
  AUXPD: process.env.NEXT_PUBLIC_AUXPD_CONTRACT as `0x${string}`,
};

// Metal info
const METAL_INFO: Record<string, { name: string; icon: string; color: string }> = {
  AUXG: { name: 'Gold', icon: '/gold-favicon-32x32.png', color: '#FFD700' },
  AUXS: { name: 'Silver', icon: '/silver-favicon-32x32.png', color: '#C0C0C0' },
  AUXPT: { name: 'Platinum', icon: '/platinum-favicon-32x32.png', color: '#E5E4E2' },
  AUXPD: { name: 'Palladium', icon: '/palladium-favicon-32x32.png', color: '#CED0DD' },
};

// Types
export interface AllocationData {
  buyer: `0x${string}`;
  grams: bigint;
  custodian: string;
  timestamp: bigint;
  active: boolean;
}

export interface FormattedAllocation {
  id: number;
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
}

export interface CollateralizationInfo {
  metal: string;
  ratio: number; // percentage (100 = 100%)
  supplyGrams: number;
  reserveGrams: number;
  isFullyBacked: boolean;
}

// Helper function to format allocation
function formatAllocation(
  alloc: AllocationData,
  id: number,
  metalSymbol: string,
  pricePerGram?: number
): FormattedAllocation {
  const metalInfo = METAL_INFO[metalSymbol] || { name: 'Unknown', icon: '', color: '#888' };
  const grams = Number(alloc.grams);

  return {
    id,
    buyer: alloc.buyer,
    metal: metalInfo.name,
    metalSymbol,
    metalIcon: metalInfo.icon,
    metalColor: metalInfo.color,
    grams,
    custodian: alloc.custodian,
    timestamp: new Date(Number(alloc.timestamp) * 1000),
    active: alloc.active,
    valueUSD: pricePerGram ? grams * pricePerGram : undefined,
    allocationCode: `ALC-${metalSymbol}-${id.toString().padStart(6, '0')}`,
  };
}

// Main hook for user allocations
export function useAllocations(metalSymbol?: 'AUXG' | 'AUXS' | 'AUXPT' | 'AUXPD') {
  const { address, isConnected } = useAccount();
  const [allocations, setAllocations] = useState<FormattedAllocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine which contracts to query
  const contractsToQuery = metalSymbol 
    ? [{ symbol: metalSymbol, address: METAL_CONTRACTS[metalSymbol] }]
    : Object.entries(METAL_CONTRACTS).map(([symbol, addr]) => ({ symbol, address: addr }));

  // Query all metal contracts for user allocations
  const { data: allocationsData, refetch, isLoading } = useReadContracts({
    contracts: contractsToQuery.map(({ address: contractAddress }) => ({
      address: contractAddress,
      abi: ALLOCATION_ABI,
      functionName: 'getUserActiveAllocations',
      args: address ? [address] : undefined,
    })),
    query: { enabled: !!address },
  });

  // Process allocation data
  useEffect(() => {
    if (!allocationsData || !address) {
      setAllocations([]);
      return;
    }

    const allAllocations: FormattedAllocation[] = [];
    
    allocationsData.forEach((result, index) => {
      if (result.status === 'success' && result.result) {
        const metalSymbol = contractsToQuery[index].symbol;
        const allocList = result.result as unknown as AllocationData[];
        
        allocList.forEach((alloc, allocIndex) => {
          allAllocations.push(formatAllocation(alloc, allocIndex + 1, metalSymbol));
        });
      }
    });

    // Sort by timestamp descending
    allAllocations.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    setAllocations(allAllocations);
  }, [allocationsData, address]);

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
    refresh: refetch,
  };
}

// Hook for single allocation by ID
export function useAllocation(metalSymbol: 'AUXG' | 'AUXS' | 'AUXPT' | 'AUXPD', allocId: number) {
  const contractAddress = METAL_CONTRACTS[metalSymbol];

  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi: ALLOCATION_ABI,
    functionName: 'allocations',
    args: [BigInt(allocId)],
    query: { enabled: !!contractAddress && allocId > 0 },
  });

  const allocation = data 
    ? formatAllocation(data as AllocationData, allocId, metalSymbol)
    : null;

  return {
    allocation,
    loading: isLoading,
    error: error?.message || null,
    refetch,
  };
}

// Hook for collateralization ratio
export function useCollateralization(metalSymbol: 'AUXG' | 'AUXS' | 'AUXPT' | 'AUXPD') {
  const contractAddress = METAL_CONTRACTS[metalSymbol];
  const metalInfo = METAL_INFO[metalSymbol];

  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi: ALLOCATION_ABI,
    functionName: 'getCollateralizationRatio',
    query: { enabled: !!contractAddress },
  });

  const info: CollateralizationInfo | null = data ? {
    metal: metalInfo.name,
    ratio: Number(data[0]) / 100, // Convert from basis points
    supplyGrams: Number(data[1]),
    reserveGrams: Number(data[2]),
    isFullyBacked: Number(data[0]) >= 10000, // 100% = 10000 basis points
  } : null;

  return {
    info,
    loading: isLoading,
    error: error?.message || null,
    refetch,
  };
}

// Hook for all collateralization ratios
export function useAllCollateralization() {
  const metals = ['AUXG', 'AUXS', 'AUXPT', 'AUXPD'] as const;

  const { data, isLoading, refetch } = useReadContracts({
    contracts: metals.map(symbol => ({
      address: METAL_CONTRACTS[symbol],
      abi: ALLOCATION_ABI,
      functionName: 'getCollateralizationRatio',
    })),
  });

  const ratios: CollateralizationInfo[] = data ? metals.map((symbol, index) => {
    const result = data[index];
    if (result.status !== 'success' || !result.result) {
      return {
        metal: METAL_INFO[symbol].name,
        ratio: 0,
        supplyGrams: 0,
        reserveGrams: 0,
        isFullyBacked: false,
      };
    }

    const [ratio, supplyGrams, reserveGrams] = result.result as [bigint, bigint, bigint];
    return {
      metal: METAL_INFO[symbol].name,
      ratio: Number(ratio) / 100,
      supplyGrams: Number(supplyGrams),
      reserveGrams: Number(reserveGrams),
      isFullyBacked: Number(ratio) >= 10000,
    };
  }) : [];

  return {
    ratios,
    loading: isLoading,
    refetch,
    averageRatio: ratios.length > 0 
      ? ratios.reduce((sum, r) => sum + r.ratio, 0) / ratios.length 
      : 0,
    allFullyBacked: ratios.every(r => r.isFullyBacked),
  };
}

export default useAllocations;
