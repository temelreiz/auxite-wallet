// hooks/useStaking.ts
// React hook for Auxite Staking contract integration

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits, keccak256, toHex } from 'viem';

// Contract ABI (simplified - include full ABI in production)
const STAKING_ABI = [
  // Read functions
  {
    name: 'stakes',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'stakeId', type: 'uint256' }],
    outputs: [{
      type: 'tuple',
      components: [
        { name: 'id', type: 'uint256' },
        { name: 'stakeCode', type: 'bytes32' },
        { name: 'staker', type: 'address' },
        { name: 'metalId', type: 'bytes32' },
        { name: 'amount', type: 'uint256' },
        { name: 'startTime', type: 'uint256' },
        { name: 'endTime', type: 'uint256' },
        { name: 'duration', type: 'uint256' },
        { name: 'apyBps', type: 'uint256' },
        { name: 'expectedReward', type: 'uint256' },
        { name: 'claimedReward', type: 'uint256' },
        { name: 'active', type: 'bool' },
        { name: 'compounding', type: 'bool' },
        { name: 'allocationId', type: 'uint256' },
      ]
    }]
  },
  {
    name: 'getUserStakes',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{
      type: 'tuple[]',
      components: [
        { name: 'id', type: 'uint256' },
        { name: 'stakeCode', type: 'bytes32' },
        { name: 'staker', type: 'address' },
        { name: 'metalId', type: 'bytes32' },
        { name: 'amount', type: 'uint256' },
        { name: 'startTime', type: 'uint256' },
        { name: 'endTime', type: 'uint256' },
        { name: 'duration', type: 'uint256' },
        { name: 'apyBps', type: 'uint256' },
        { name: 'expectedReward', type: 'uint256' },
        { name: 'claimedReward', type: 'uint256' },
        { name: 'active', type: 'bool' },
        { name: 'compounding', type: 'bool' },
        { name: 'allocationId', type: 'uint256' },
      ]
    }]
  },
  {
    name: 'getUserActiveStakes',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{
      type: 'tuple[]',
      components: [
        { name: 'id', type: 'uint256' },
        { name: 'stakeCode', type: 'bytes32' },
        { name: 'staker', type: 'address' },
        { name: 'metalId', type: 'bytes32' },
        { name: 'amount', type: 'uint256' },
        { name: 'startTime', type: 'uint256' },
        { name: 'endTime', type: 'uint256' },
        { name: 'duration', type: 'uint256' },
        { name: 'apyBps', type: 'uint256' },
        { name: 'expectedReward', type: 'uint256' },
        { name: 'claimedReward', type: 'uint256' },
        { name: 'active', type: 'bool' },
        { name: 'compounding', type: 'bool' },
        { name: 'allocationId', type: 'uint256' },
      ]
    }]
  },
  {
    name: 'getClaimableRewards',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'stakeId', type: 'uint256' }],
    outputs: [{ type: 'uint256' }]
  },
  {
    name: 'getAllAPYs',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'metalId', type: 'bytes32' }],
    outputs: [
      { name: 'apy3m', type: 'uint256' },
      { name: 'apy6m', type: 'uint256' },
      { name: 'apy12m', type: 'uint256' },
    ]
  },
  {
    name: 'previewReward',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'metalId', type: 'bytes32' },
      { name: 'amount', type: 'uint256' },
      { name: 'durationMonths', type: 'uint256' },
    ],
    outputs: [
      { name: 'expectedReward', type: 'uint256' },
      { name: 'apyBps', type: 'uint256' },
    ]
  },
  {
    name: 'getShortStakeCode',
    type: 'function',
    stateMutability: 'pure',
    inputs: [{ name: 'stakeCode', type: 'bytes32' }],
    outputs: [{ type: 'string' }]
  },
  {
    name: 'getStakeByCode',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'stakeCode', type: 'bytes32' }],
    outputs: [{
      type: 'tuple',
      components: [
        { name: 'id', type: 'uint256' },
        { name: 'stakeCode', type: 'bytes32' },
        { name: 'staker', type: 'address' },
        { name: 'metalId', type: 'bytes32' },
        { name: 'amount', type: 'uint256' },
        { name: 'startTime', type: 'uint256' },
        { name: 'endTime', type: 'uint256' },
        { name: 'duration', type: 'uint256' },
        { name: 'apyBps', type: 'uint256' },
        { name: 'expectedReward', type: 'uint256' },
        { name: 'claimedReward', type: 'uint256' },
        { name: 'active', type: 'bool' },
        { name: 'compounding', type: 'bool' },
        { name: 'allocationId', type: 'uint256' },
      ]
    }]
  },
  {
    name: 'minStakeAmount',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'metalId', type: 'bytes32' }],
    outputs: [{ type: 'uint256' }]
  },
  {
    name: 'rewardPool',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'metalId', type: 'bytes32' }],
    outputs: [{ type: 'uint256' }]
  },
  {
    name: 'earlyWithdrawalPenaltyBps',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }]
  },
  // Write functions
  {
    name: 'stake',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'metalId', type: 'bytes32' },
      { name: 'amount', type: 'uint256' },
      { name: 'durationMonths', type: 'uint256' },
      { name: 'compounding', type: 'bool' },
      { name: 'allocationId', type: 'uint256' },
    ],
    outputs: [
      { name: 'stakeId', type: 'uint256' },
      { name: 'stakeCode', type: 'bytes32' },
    ]
  },
  {
    name: 'unstake',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'stakeId', type: 'uint256' }],
    outputs: []
  },
  {
    name: 'claimRewards',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'stakeId', type: 'uint256' }],
    outputs: []
  },
  {
    name: 'compoundRewards',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'stakeId', type: 'uint256' }],
    outputs: []
  },
] as const;

// Contract address - update with deployed address
const STAKING_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_STAKING_CONTRACT as `0x${string}`;

// Metal ID constants
export const METAL_IDS = {
  AUXG: keccak256(toHex('AUXG')),
  AUXS: keccak256(toHex('AUXS')),
  AUXPT: keccak256(toHex('AUXPT')),
  AUXPD: keccak256(toHex('AUXPD')),
} as const;

// Types
export interface StakeData {
  id: bigint;
  stakeCode: `0x${string}`;
  staker: `0x${string}`;
  metalId: `0x${string}`;
  amount: bigint;
  startTime: bigint;
  endTime: bigint;
  duration: bigint;
  apyBps: bigint;
  expectedReward: bigint;
  claimedReward: bigint;
  active: boolean;
  compounding: boolean;
  allocationId: bigint;
}

export interface FormattedStake {
  id: number;
  stakeCode: string;
  shortCode: string;
  staker: string;
  metal: string;
  metalSymbol: string;
  amountGrams: number;
  startDate: Date;
  endDate: Date;
  durationMonths: number;
  apyPercent: number;
  expectedRewardGrams: number;
  claimedRewardGrams: number;
  claimableRewardGrams: number;
  active: boolean;
  compounding: boolean;
  allocationId: number;
  progress: number; // 0-100
  timeRemaining: string;
  isMatured: boolean;
}

// Helper function to format stake data
function formatStake(stake: StakeData, claimable: bigint = 0n): FormattedStake {
  const metalMap: Record<string, { name: string; symbol: string }> = {
    [METAL_IDS.AUXG]: { name: 'Gold', symbol: 'AUXG' },
    [METAL_IDS.AUXS]: { name: 'Silver', symbol: 'AUXS' },
    [METAL_IDS.AUXPT]: { name: 'Platinum', symbol: 'AUXPT' },
    [METAL_IDS.AUXPD]: { name: 'Palladium', symbol: 'AUXPD' },
  };

  const metal = metalMap[stake.metalId] || { name: 'Unknown', symbol: '???' };
  const startDate = new Date(Number(stake.startTime) * 1000);
  const endDate = new Date(Number(stake.endTime) * 1000);
  const now = Date.now();
  const durationMs = Number(stake.endTime - stake.startTime) * 1000;
  const elapsedMs = now - startDate.getTime();
  const progress = Math.min(100, Math.max(0, (elapsedMs / durationMs) * 100));
  const isMatured = now >= endDate.getTime();

  // Calculate time remaining
  let timeRemaining = '';
  if (!isMatured) {
    const remainingMs = endDate.getTime() - now;
    const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) {
      timeRemaining = `${days}d ${hours}h`;
    } else {
      timeRemaining = `${hours}h`;
    }
  }

  // Duration in months
  const durationSeconds = Number(stake.duration);
  let durationMonths = 3;
  if (durationSeconds >= 365 * 24 * 60 * 60 - 86400) durationMonths = 12;
  else if (durationSeconds >= 180 * 24 * 60 * 60 - 86400) durationMonths = 6;

  return {
    id: Number(stake.id),
    stakeCode: stake.stakeCode,
    shortCode: `STK-${stake.stakeCode.slice(2, 10).toUpperCase()}`,
    staker: stake.staker,
    metal: metal.name,
    metalSymbol: metal.symbol,
    amountGrams: Number(stake.amount) / 1000, // 3 decimals
    startDate,
    endDate,
    durationMonths,
    apyPercent: Number(stake.apyBps) / 100,
    expectedRewardGrams: Number(stake.expectedReward) / 1000,
    claimedRewardGrams: Number(stake.claimedReward) / 1000,
    claimableRewardGrams: Number(claimable) / 1000,
    active: stake.active,
    compounding: stake.compounding,
    allocationId: Number(stake.allocationId),
    progress,
    timeRemaining,
    isMatured,
  };
}

// Main hook
export function useStaking() {
  const { address, isConnected } = useAccount();
  const [stakes, setStakes] = useState<FormattedStake[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read user stakes
  const { data: userStakesData, refetch: refetchStakes } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS,
    abi: STAKING_ABI,
    functionName: 'getUserStakes',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Read active stakes
  const { data: activeStakesData, refetch: refetchActiveStakes } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS,
    abi: STAKING_ABI,
    functionName: 'getUserActiveStakes',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Write functions
  const { writeContract: writeStake, data: stakeHash, isPending: isStaking } = useWriteContract();
  const { writeContract: writeUnstake, data: unstakeHash, isPending: isUnstaking } = useWriteContract();
  const { writeContract: writeClaim, data: claimHash, isPending: isClaiming } = useWriteContract();
  const { writeContract: writeCompound, data: compoundHash, isPending: isCompounding } = useWriteContract();

  // Transaction receipts
  const { isLoading: isStakeConfirming, isSuccess: isStakeSuccess } = useWaitForTransactionReceipt({ hash: stakeHash });
  const { isLoading: isUnstakeConfirming, isSuccess: isUnstakeSuccess } = useWaitForTransactionReceipt({ hash: unstakeHash });
  const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({ hash: claimHash });
  const { isLoading: isCompoundConfirming, isSuccess: isCompoundSuccess } = useWaitForTransactionReceipt({ hash: compoundHash });

  // Format stakes when data changes
  useEffect(() => {
    if (userStakesData) {
      const formatted = (userStakesData as StakeData[]).map(s => formatStake(s));
      setStakes(formatted);
    }
  }, [userStakesData]);

  // Refetch on successful transactions
  useEffect(() => {
    if (isStakeSuccess || isUnstakeSuccess || isClaimSuccess || isCompoundSuccess) {
      refetchStakes();
      refetchActiveStakes();
    }
  }, [isStakeSuccess, isUnstakeSuccess, isClaimSuccess, isCompoundSuccess]);

  // Stake function
  const stake = useCallback(async (
    metalSymbol: 'AUXG' | 'AUXS' | 'AUXPT' | 'AUXPD',
    amountGrams: number,
    durationMonths: 3 | 6 | 12,
    compounding: boolean = false,
    allocationId: number = 0
  ) => {
    if (!address) throw new Error('Wallet not connected');

    const metalId = METAL_IDS[metalSymbol];
    const amount = BigInt(Math.floor(amountGrams * 1000)); // Convert to token units (3 decimals)

    writeStake({
      address: STAKING_CONTRACT_ADDRESS,
      abi: STAKING_ABI,
      functionName: 'stake',
      args: [metalId, amount, BigInt(durationMonths), compounding, BigInt(allocationId)],
    });
  }, [address, writeStake]);

  // Unstake function
  const unstake = useCallback(async (stakeId: number) => {
    if (!address) throw new Error('Wallet not connected');

    writeUnstake({
      address: STAKING_CONTRACT_ADDRESS,
      abi: STAKING_ABI,
      functionName: 'unstake',
      args: [BigInt(stakeId)],
    });
  }, [address, writeUnstake]);

  // Claim rewards function
  const claimRewards = useCallback(async (stakeId: number) => {
    if (!address) throw new Error('Wallet not connected');

    writeClaim({
      address: STAKING_CONTRACT_ADDRESS,
      abi: STAKING_ABI,
      functionName: 'claimRewards',
      args: [BigInt(stakeId)],
    });
  }, [address, writeClaim]);

  // Compound rewards function
  const compoundRewards = useCallback(async (stakeId: number) => {
    if (!address) throw new Error('Wallet not connected');

    writeCompound({
      address: STAKING_CONTRACT_ADDRESS,
      abi: STAKING_ABI,
      functionName: 'compoundRewards',
      args: [BigInt(stakeId)],
    });
  }, [address, writeCompound]);

  // Preview reward
  const previewReward = useCallback(async (
    metalSymbol: 'AUXG' | 'AUXS' | 'AUXPT' | 'AUXPD',
    amountGrams: number,
    durationMonths: 3 | 6 | 12
  ): Promise<{ expectedRewardGrams: number; apyPercent: number }> => {
    // This would need to be implemented with a read call
    // For now, return a calculated estimate
    const apyMap: Record<string, Record<number, number>> = {
      AUXG: { 3: 1.53, 6: 2.03, 12: 2.53 },
      AUXS: { 3: 1.23, 6: 1.73, 12: 2.23 },
      AUXPT: { 3: 1.83, 6: 2.33, 12: 2.83 },
      AUXPD: { 3: 1.93, 6: 2.43, 12: 2.93 },
    };

    const apyPercent = apyMap[metalSymbol]?.[durationMonths] || 0;
    const durationDays = durationMonths === 3 ? 90 : durationMonths === 6 ? 180 : 365;
    const expectedRewardGrams = (amountGrams * apyPercent * durationDays) / (100 * 365);

    return { expectedRewardGrams, apyPercent };
  }, []);

  // Refresh data
  const refresh = useCallback(() => {
    refetchStakes();
    refetchActiveStakes();
  }, [refetchStakes, refetchActiveStakes]);

  return {
    // State
    stakes,
    activeStakes: stakes.filter(s => s.active),
    loading: loading || isStaking || isUnstaking || isClaiming || isCompounding,
    confirming: isStakeConfirming || isUnstakeConfirming || isClaimConfirming || isCompoundConfirming,
    error,
    isConnected,

    // Actions
    stake,
    unstake,
    claimRewards,
    compoundRewards,
    previewReward,
    refresh,

    // Transaction states
    isStaking: isStaking || isStakeConfirming,
    isUnstaking: isUnstaking || isUnstakeConfirming,
    isClaiming: isClaiming || isClaimConfirming,
    isCompounding: isCompounding || isCompoundConfirming,

    // Success states
    isStakeSuccess,
    isUnstakeSuccess,
    isClaimSuccess,
    isCompoundSuccess,

    // Transaction hashes
    stakeHash,
    unstakeHash,
    claimHash,
    compoundHash,
  };
}

// Hook for getting APY rates
export function useStakingAPY(metalSymbol: 'AUXG' | 'AUXS' | 'AUXPT' | 'AUXPD') {
  const metalId = METAL_IDS[metalSymbol];

  const { data, isLoading, refetch } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS,
    abi: STAKING_ABI,
    functionName: 'getAllAPYs',
    args: [metalId],
  });

  return {
    apy3m: data ? Number(data[0]) / 100 : 0,
    apy6m: data ? Number(data[1]) / 100 : 0,
    apy12m: data ? Number(data[2]) / 100 : 0,
    loading: isLoading,
    refetch,
  };
}

// Hook for getting stake by code
export function useStakeByCode(stakeCode: string) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS,
    abi: STAKING_ABI,
    functionName: 'getStakeByCode',
    args: [stakeCode as `0x${string}`],
    query: { enabled: !!stakeCode && stakeCode.startsWith('0x') },
  });

  return {
    stake: data ? formatStake(data as StakeData) : null,
    loading: isLoading,
    error: error?.message || null,
    refetch,
  };
}

export default useStaking;
