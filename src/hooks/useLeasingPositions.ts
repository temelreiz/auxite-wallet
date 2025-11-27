import { useAccount, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import LeasingOfferABI from "@/contracts/AuxiteLeasingOffer.json";

interface Position {
  index: number;
  amount: string;
  amountRaw: bigint;
  startTime: number;
  endTime: number;
  closed: boolean;
  rewardClaimed: boolean;
  isUnlocked: boolean;
  daysRemaining: number;
}

interface UseLeasingPositionsProps {
  offerAddress: `0x${string}`;
  metalSymbol: string;
}

export function useLeasingPositions({ offerAddress, metalSymbol }: UseLeasingPositionsProps) {
  const { address } = useAccount();

  // Read all positions
  const { data: positionsData, refetch: refetchPositions } = useReadContract({
    address: offerAddress,
    abi: LeasingOfferABI.abi,
    functionName: "getAllPositions",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Parse positions data
  const positions: Position[] = positionsData
    ? (() => {
        const [amounts, startTimes, closeds, rewardClaimeds] = positionsData as [
          bigint[],
          bigint[],
          boolean[],
          boolean[]
        ];

        const now = Math.floor(Date.now() / 1000);

        return amounts.map((amount, index) => {
          const startTime = Number(startTimes[index]);
          const lockDuration = 90 * 24 * 60 * 60; // Bu contract'tan okunmalı, şimdilik 90 gün varsayımı
          const endTime = startTime + lockDuration;
          const isUnlocked = now >= endTime;
          const secondsRemaining = Math.max(0, endTime - now);
          const daysRemaining = Math.ceil(secondsRemaining / (24 * 60 * 60));

          return {
            index,
            amount: formatUnits(amount, 18),
            amountRaw: amount,
            startTime,
            endTime,
            closed: closeds[index],
            rewardClaimed: rewardClaimeds[index],
            isUnlocked,
            daysRemaining,
          };
        });
      })()
    : [];

  // Filter active (non-closed) positions
  const activePositions = positions.filter((p) => !p.closed);

  // Filter closed positions
  const closedPositions = positions.filter((p) => p.closed);

  // Calculate total locked amount
  const totalLocked = activePositions.reduce((sum, p) => {
    return sum + parseFloat(p.amount);
  }, 0);

  // Calculate total withdrawn amount
  const totalWithdrawn = closedPositions.reduce((sum, p) => {
    return sum + parseFloat(p.amount);
  }, 0);

  return {
    positions,
    activePositions,
    closedPositions,
    totalLocked,
    totalWithdrawn,
    hasPositions: positions.length > 0,
    hasActivePositions: activePositions.length > 0,
    refetchPositions,
  };
}