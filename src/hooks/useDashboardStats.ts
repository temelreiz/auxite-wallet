import { useMemo } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { LEASING_CONTRACTS } from "@/contracts/leasingContracts";
import LeasingOfferABI from "@/contracts/AuxiteLeasingOffer.json";

// Approximate metal prices in USD per gram
const METAL_PRICES_USD: Record<string, number> = {
  AUXG: 75,    // Gold ~$75/gram
  AUXS: 0.85,  // Silver ~$0.85/gram
  AUXPT: 32,   // Platinum ~$32/gram
  AUXPD: 35,   // Palladium ~$35/gram
};

// APY rates per period
const APY_RATES: Record<string, number> = {
  AUXG: 7.5,
  AUXS: 6.2,
  AUXPT: 8.1,
  AUXPD: 7.8,
};

export function useDashboardStats() {
  const { address } = useAccount();

  // Read positions from all contracts - using getAllPositions (correct function name)
  const { data: positionsData } = useReadContracts({
    contracts: address ? [
      {
        address: LEASING_CONTRACTS.AUXG["90"] as `0x${string}`,
        abi: LeasingOfferABI.abi as any,
        functionName: "getAllPositions",
        args: [address],
      },
      {
        address: LEASING_CONTRACTS.AUXS["90"] as `0x${string}`,
        abi: LeasingOfferABI.abi as any,
        functionName: "getAllPositions",
        args: [address],
      },
      {
        address: LEASING_CONTRACTS.AUXPT["90"] as `0x${string}`,
        abi: LeasingOfferABI.abi as any,
        functionName: "getAllPositions",
        args: [address],
      },
      {
        address: LEASING_CONTRACTS.AUXPD["90"] as `0x${string}`,
        abi: LeasingOfferABI.abi as any,
        functionName: "getAllPositions",
        args: [address],
      },
    ] : [],
  });

  // Calculate stats
  const stats = useMemo(() => {
    if (!positionsData || !address) {
      return {
        totalLocked: 0,
        activePositions: 0,
        totalEarnings: 0,
        avgAPY: 0,
      };
    }

    const metals = ["AUXG", "AUXS", "AUXPT", "AUXPD"];
    let totalLockedUSD = 0;
    let totalPositions = 0;
    let weightedAPYSum = 0;

    positionsData.forEach((result, index) => {
      if (result.status !== "success" || !result.result) return;
      
      // Result format: [amounts[], startTimes[], closeds[], rewardClaimeds[]]
      const [amounts, startTimes, closeds, rewardClaimeds] = result.result as [
        bigint[],
        bigint[],
        boolean[],
        boolean[]
      ];
      
      const metal = metals[index];
      const price = METAL_PRICES_USD[metal];
      const apy = APY_RATES[metal];

      amounts.forEach((amount, posIndex) => {
        // Only count non-closed positions
        if (!closeds[posIndex]) {
          const grams = parseFloat(formatUnits(amount, 18));
          const valueUSD = grams * price;
          totalLockedUSD += valueUSD;
          totalPositions++;
          weightedAPYSum += valueUSD * apy;
        }
      });
    });

    const avgAPY = totalLockedUSD > 0 ? weightedAPYSum / totalLockedUSD : 0;
    const totalEarnings = totalLockedUSD * (avgAPY / 100);

    return {
      totalLocked: Math.round(totalLockedUSD),
      activePositions: totalPositions,
      totalEarnings: Math.round(totalEarnings),
      avgAPY: parseFloat(avgAPY.toFixed(1)),
    };
  }, [positionsData, address]);

  return stats;
}