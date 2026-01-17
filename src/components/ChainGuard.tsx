"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { APP_CHAIN } from "@/config/chains";

export function ChainGuard() {
  const { isConnected } = useAccount();
  const { switchChain, isPending } = useSwitchChain();
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkChain = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) return;
    
    try {
      const chainIdHex = await window.ethereum.request({ method: "eth_chainId" });
      const chainId = parseInt(chainIdHex as string, 16);
      
      setCurrentChainId(prev => {
        if (prev !== chainId) {
          console.log("Chain detected:", { chainId, appChainId: APP_CHAIN.chainId, isConnected });
        }
        return chainId;
      });
      
      if (isConnected && chainId !== APP_CHAIN.chainId) {
        setIsWrongNetwork(true);
      } else {
        setIsWrongNetwork(false);
      }
    } catch (err) {
      console.error("Failed to get chainId:", err);
    }
  }, [isConnected]);

  // Polling - her 1 saniyede chain kontrol et
  useEffect(() => {
    checkChain(); // ilk kontrol
    
    intervalRef.current = setInterval(checkChain, 1000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkChain]);

  // Event listener da ekleyelim (yedek olarak)
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;

    const handleChainChanged = () => {
      console.log("chainChanged event fired");
      checkChain();
    };

    const handleAccountsChanged = () => {
      console.log("accountsChanged event fired");
      checkChain();
    };

    window.ethereum.on("chainChanged", handleChainChanged);
    window.ethereum.on("accountsChanged", handleAccountsChanged);
    
    return () => {
      window.ethereum?.removeListener("chainChanged", handleChainChanged);
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, [checkChain]);

  if (!isWrongNetwork) return null;

  const chainName = currentChainId ? `Chain ${currentChainId}` : "Unknown";

  return (
    <div className="fixed inset-x-0 top-0 z-[9999]">
      <div className="mx-auto max-w-5xl px-4 py-3">
        <div className="rounded-xl border border-red-500/30 bg-red-900/90 px-4 py-3 text-sm backdrop-blur">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-white">
              <div className="font-semibold text-red-200">⚠️ Wrong Network</div>
              <div className="opacity-90">
                Connected to <b>{chainName}</b>. Please switch to{" "}
                <b>{APP_CHAIN.name}</b> to continue.
              </div>
            </div>

            <button
              onClick={() => switchChain?.({ chainId: APP_CHAIN.chainId })}
              disabled={isPending}
              className="inline-flex w-fit items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-white font-medium hover:bg-red-700 disabled:opacity-60 transition"
            >
              {isPending ? "Switching..." : `Switch to ${APP_CHAIN.name}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
