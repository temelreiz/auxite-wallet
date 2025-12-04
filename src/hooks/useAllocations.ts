"use client";

import { useAccount, useReadContracts, useReadContract } from "wagmi";
import { METAL_TOKENS } from "@/contracts/leasingContracts";
import { ALLOCATION_ABI } from "@/contracts/AllocationABI";

export interface Allocation {
  id: bigint;
  buyer: string;
  grams: bigint;
  custodian: string;
  timestamp: bigint;
  metal: string;
}

export function useAllocations() {
  const { address } = useAccount();

  // Her metal için allocation ID'lerini çek
  const { data: allocationIds, isLoading: idsLoading } = useReadContracts({
    contracts: address ? [
      {
        address: METAL_TOKENS.AUXG as `0x${string}`,
        abi: ALLOCATION_ABI,
        functionName: "getAllocationsByAddress",
        args: [address],
      },
      {
        address: METAL_TOKENS.AUXS as `0x${string}`,
        abi: ALLOCATION_ABI,
        functionName: "getAllocationsByAddress",
        args: [address],
      },
      {
        address: METAL_TOKENS.AUXPT as `0x${string}`,
        abi: ALLOCATION_ABI,
        functionName: "getAllocationsByAddress",
        args: [address],
      },
      {
        address: METAL_TOKENS.AUXPD as `0x${string}`,
        abi: ALLOCATION_ABI,
        functionName: "getAllocationsByAddress",
        args: [address],
      },
    ] : [],
  });

  // ID'leri ve metal tiplerini birleştir
  const metals = ["AUXG", "AUXS", "AUXPT", "AUXPD"];
  const allIds: { metal: string; ids: bigint[]; contract: string }[] = [];

  if (allocationIds) {
    allocationIds.forEach((result, index) => {
      if (result.status === "success" && result.result) {
        const ids = result.result as bigint[];
        if (ids.length > 0) {
          allIds.push({
            metal: metals[index],
            ids,
            contract: METAL_TOKENS[metals[index] as keyof typeof METAL_TOKENS],
          });
        }
      }
    });
  }

  // Her ID için allocation detayını çek
  const allocationContracts = allIds.flatMap(({ metal, ids, contract }) =>
    ids.map((id) => ({
      address: contract as `0x${string}`,
      abi: ALLOCATION_ABI,
      functionName: "allocations" as const,
      args: [id],
      metal,
    }))
  );

  const { data: allocationDetails, isLoading: detailsLoading } = useReadContracts({
    contracts: allocationContracts.map(({ address, abi, functionName, args }) => ({
      address,
      abi,
      functionName,
      args,
    })),
  });

  // Allocation'ları parse et
  const allocations: Allocation[] = [];

  if (allocationDetails) {
    allocationDetails.forEach((result, index) => {
      if (result.status === "success" && result.result) {
        const [id, buyer, grams, custodian, timestamp] = result.result as [bigint, string, bigint, string, bigint];
        allocations.push({
          id,
          buyer,
          grams,
          custodian,
          timestamp,
          metal: allocationContracts[index].metal,
        });
      }
    });
  }

  // Metal bazında grupla
  const allocationsByMetal: Record<string, Allocation[]> = {
    AUXG: [],
    AUXS: [],
    AUXPT: [],
    AUXPD: [],
  };

  allocations.forEach((alloc) => {
    allocationsByMetal[alloc.metal].push(alloc);
  });

  // Toplam gram hesapla
  const totalGrams: Record<string, number> = {
    AUXG: 0,
    AUXS: 0,
    AUXPT: 0,
    AUXPD: 0,
  };

  Object.entries(allocationsByMetal).forEach(([metal, allocs]) => {
    totalGrams[metal] = allocs.reduce((sum, a) => sum + Number(a.grams), 0);
  });

  return {
    allocations,
    allocationsByMetal,
    totalGrams,
    isLoading: idsLoading || detailsLoading,
  };
}
