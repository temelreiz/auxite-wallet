// src/hooks/useAuxiteBalances.ts
"use client";

import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { METALS } from "@/lib/metals";

export type AuxiteBalances = {
  AUXG: number;
  AUXS: number;
  AUXPT: number;
  AUXPD: number;
};

type BalancesState = {
  loading: boolean;
  error?: string;
  balances: AuxiteBalances;
};

const EMPTY: AuxiteBalances = {
  AUXG: 0,
  AUXS: 0,
  AUXPT: 0,
  AUXPD: 0,
};

// basit ERC20 arayüzü
const erc20Abi = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

const RPC_URL = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL!; // .env.local’da var

export function useAuxiteBalances(address?: string | null): BalancesState {
  const [state, setState] = useState<BalancesState>({
    loading: false,
    balances: EMPTY,
  });

  useEffect(() => {
    if (!address) {
      // cüzdan bağlı değilken sıfırla
      setState({ loading: false, balances: EMPTY });
      return;
    }
    if (!RPC_URL) {
      setState({
        loading: false,
        balances: EMPTY,
        error: "RPC URL tanımlı değil (NEXT_PUBLIC_SEPOLIA_RPC_URL).",
      });
      return;
    }

    let cancelled = false;

    async function run() {
      setState((s) => ({ ...s, loading: true, error: undefined }));

      try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);

        const entries = await Promise.all(
          METALS.map(async (m) => {
            const token = new ethers.Contract(m.tokenAddress, erc20Abi, provider);

            const [rawBal, dec]: [bigint, number] = await Promise.all([
              token.balanceOf(address),
              token.decimals(),
            ]);

            // 1 token = 1 gram ve decimals=3 olsa bile formatUnits işimizi görür
            const grams = Number(ethers.formatUnits(rawBal, dec));

            return [m.id, grams] as const;
          })
        );

        if (cancelled) return;

        const next: AuxiteBalances = { ...EMPTY };
        for (const [id, g] of entries) {
          // id: "AUXG" | "AUXS" | ...
          (next as any)[id] = g;
        }

        setState({ loading: false, balances: next });
      } catch (err: any) {
        console.error("[useAuxiteBalances] failed:", err);
        if (cancelled) return;
        setState((s) => ({
          ...s,
          loading: false,
          error: err?.message ?? "Balance okunamadı",
          balances: s.balances || EMPTY,
        }));
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [address]);

  // NaN oluşursa UI’de saçmalamasın diye temizle
  const safeBalances = useMemo<AuxiteBalances>(() => {
    const b = state.balances || EMPTY;
    return {
      AUXG: Number.isFinite(b.AUXG) ? b.AUXG : 0,
      AUXS: Number.isFinite(b.AUXS) ? b.AUXS : 0,
      AUXPT: Number.isFinite(b.AUXPT) ? b.AUXPT : 0,
      AUXPD: Number.isFinite(b.AUXPD) ? b.AUXPD : 0,
    };
  }, [state.balances]);

  return { ...state, balances: safeBalances };
}
