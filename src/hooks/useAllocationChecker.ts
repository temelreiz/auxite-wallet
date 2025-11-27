// src/hooks/useAllocationChecker.ts
"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { METALS, MetalId } from "@/lib/metals";

const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;

// Auxite V2 tokenlar için allocation ABI'si
const ALLOC_ABI = [
  "function getAllocationsByAddress(address user) view returns (uint256[])",
  "function allocations(uint256 id) view returns (uint256 id,address buyer,uint256 grams,string custodian,uint256 timestamp)"
];

export type AllocationRecord = {
  id: bigint;
  buyer: string;
  grams: bigint;
  custodian: string;
  timestamp: bigint;
  metalId: MetalId;
};

type Result = {
  loading: boolean;
  error?: string;
  records: AllocationRecord[];
};

export function useAllocationChecker(address?: string): Result {
  const [records, setRecords] = useState<AllocationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    // adres yoksa temizle
    if (!address || address.trim() === "") {
      setRecords([]);
      setError(undefined);
      setLoading(false);
      return;
    }

    if (!rpcUrl) {
      setError("NEXT_PUBLIC_RPC_URL is not set.");
      setRecords([]);
      setLoading(false);
      return;
    }

    const addr = address.trim();

    // Basit validasyon
    if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) {
      setError("Invalid address format.");
      setRecords([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    async function fetchAllocations() {
      try {
        setLoading(true);
        setError(undefined);

        const all: AllocationRecord[] = [];

        for (const meta of METALS) {
          if (!meta.tokenAddress) continue;

          const contract = new ethers.Contract(
            meta.tokenAddress,
            ALLOC_ABI,
            provider
          );

          // 1) Kullanıcının allocation ID listesi
          const ids: bigint[] = await contract.getAllocationsByAddress(addr);

          // 2) Her ID için Allocation struct'ını çek
          for (const id of ids) {
            const alloc = await contract.allocations(id);

            const rec: AllocationRecord = {
              id: alloc.id,
              buyer: alloc.buyer,
              grams: alloc.grams,
              custodian: alloc.custodian,
              timestamp: alloc.timestamp,
              metalId: meta.id,
            };

            all.push(rec);
          }
        }

        if (cancelled) return;

        // Tarihe göre sıralayalım (yeniden eskiye)
        all.sort((a, b) => Number(b.timestamp - a.timestamp));

        setRecords(all);
        setLoading(false);
      } catch (err: any) {
        if (cancelled) return;
        setLoading(false);
        setError(err?.message || "Allocation verileri okunurken hata oluştu.");
        setRecords([]);
      }
    }

    fetchAllocations();

    return () => {
      cancelled = true;
    };
  }, [address]);

  return { loading, error, records };
}
