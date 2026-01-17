"use client";

import { ReactNode, useMemo } from "react";
import { APP_CHAIN, isAllowedChain } from "@/config/chains";
import { useWalletContext } from "@/components/WalletContext";
import { useSwitchChain } from "wagmi";

export function RequireAllowedChain({ children }: { children: ReactNode }) {
  const { isConnected, chainId, chainName } = useWalletContext();
  const { switchChain, isPending } = useSwitchChain();

  const blocked = useMemo(() => {
    return isConnected && !isAllowedChain(chainId);
  }, [isConnected, chainId]);

  if (!blocked) return <>{children}</>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
        <div className="text-lg font-semibold">Wrong network</div>
        <div className="mt-1 text-sm opacity-90">
          Connected to <b>{chainName ?? chainId}</b>. Please switch to{" "}
          <b>{APP_CHAIN.name}</b> to continue.
        </div>

        <button
          onClick={() => switchChain({ chainId: APP_CHAIN.chainId })}
          disabled={isPending}
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-white disabled:opacity-60"
        >
          {isPending ? "Switching..." : `Switch to ${APP_CHAIN.name}`}
        </button>

        <div className="mt-3 text-xs opacity-70">
          Actions are blocked on unsupported networks to protect your funds.
        </div>
      </div>
    </div>
  );
}
