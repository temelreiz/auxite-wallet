"use client";

import { useMemo } from "react";
import {
  useAccount,
  useDisconnect,
  useSwitchChain,
  useConnections,
} from "wagmi";
import { mainnet, sepolia, baseSepolia } from "wagmi/chains";
import type { Chain } from "wagmi/chains";

/**
 * Auxite Wallet - unified wallet hook
 * - Works with RainbowKit connectors (WalletConnect / MetaMask / Rabby / Coinbase)
 * - Provides: address, isConnected, connector info, chain info, disconnect, switchChain
 */
export type WalletInfo = {
  address: `0x${string}` | undefined;
  isConnected: boolean;
  isConnecting: boolean;
  isDisconnected: boolean;

  connectorId?: string;
  connectorName?: string;

  chainId: number;
  chain: Chain;

  // Actions
  disconnect: () => void;
  canSwitchChain: boolean;
  switchChain?: (targetChainId: number) => Promise<void>;

  // Optional: raw connections for debugging/UI
  connectionsCount: number;
};

const SUPPORTED_CHAINS: Chain[] = [mainnet, sepolia, baseSepolia];

/** Resolve chain object from chainId. Falls back to Sepolia. */
function resolveChain(chainId: number | undefined): Chain {
  if (!chainId) return sepolia;
  const found = SUPPORTED_CHAINS.find((c) => c.id === chainId);
  return found ?? sepolia;
}

export function useWallet(): WalletInfo {
  // useAccount'tan chain bilgisi alıyoruz - Metamask değişikliklerini reaktif olarak takip eder
  const account = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const connections = useConnections();

  // account.chainId Metamask'taki gerçek chain'i takip eder
  const chainId = account.chainId ?? 0;
  const chain = useMemo(() => resolveChain(account.chainId), [account.chainId]);

  const connectorId = account.connector?.id;
  const connectorName = account.connector?.name;

  const canSwitchChain = typeof switchChainAsync === "function";

  const switchChain = useMemo(() => {
    if (!canSwitchChain) return undefined;
    return async (targetChainId: number) => {
      // Avoid no-op calls
      if (targetChainId === chainId) return;
      await switchChainAsync({ chainId: targetChainId });
    };
  }, [canSwitchChain, chainId, switchChainAsync]);

  return {
    address: account.address as `0x${string}` | undefined,
    isConnected: account.isConnected,
    isConnecting: account.isConnecting || isSwitching,
    isDisconnected: account.isDisconnected,

    connectorId,
    connectorName,

    chainId,
    chain,

    disconnect: () => disconnect(),
    canSwitchChain,
    switchChain,

    connectionsCount: connections?.length ?? 0,
  };
}

export default useWallet;
