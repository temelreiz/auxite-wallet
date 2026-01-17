"use client";

import { useAccount, useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { METAL_TOKENS } from "@/config/contracts-v8";
import { ERC20_ABI } from "@/contracts/ERC20";

export function useTokenBalances() {
  const { address } = useAccount();

  const { data: balancesData, isLoading, refetch } = useReadContracts({
    contracts: address ? [
      {
        address: METAL_TOKENS.AUXG as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address],
      },
      {
        address: METAL_TOKENS.AUXS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address],
      },
      {
        address: METAL_TOKENS.AUXPT as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address],
      },
      {
        address: METAL_TOKENS.AUXPD as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address],
      },
    ] : [],
  });

  const balances = {
    AUXG: "0",
    AUXS: "0",
    AUXPT: "0",
    AUXPD: "0",
  };

  if (balancesData) {
    const metals = ["AUXG", "AUXS", "AUXPT", "AUXPD"];
    balancesData.forEach((result, index) => {
      if (result.status === "success" && result.result) {
        balances[metals[index] as keyof typeof balances] = formatUnits(result.result as bigint, 18);
      }
    });
  }

  // Calculate total value (will need prices)
  const getTotalValue = (prices: Record<string, number>) => {
    let total = 0;
    Object.entries(balances).forEach(([metal, balance]) => {
      const balanceNum = parseFloat(balance);
      const price = prices[metal] || 0;
      total += balanceNum * price;
    });
    return total;
  };

  return {
    balances,
    isLoading,
    refetch,
    getTotalValue,
  };
}