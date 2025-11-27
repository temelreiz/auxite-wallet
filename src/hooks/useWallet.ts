"use client";

import { useEffect, useState } from "react";

type WalletState = {
  address: string | null;
  isConnected: boolean;
  connecting: boolean;
  error: string | null;
};

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnected: false,
    connecting: false,
    error: null,
  });

  const isClient = typeof window !== "undefined";

  useEffect(() => {
    if (!isClient) return;
    const eth = (window as any).ethereum;
    if (!eth) return;

    // Sayfa açılırken mevcut hesapları oku
    eth
      .request({ method: "eth_accounts" })
      .then((accounts: string[]) => {
        if (accounts && accounts.length > 0) {
          setState((s) => ({
            ...s,
            address: accounts[0],
            isConnected: true,
            error: null,
          }));
        }
      })
      .catch((err: any) => {
        console.warn("eth_accounts error:", err);
      });

    const handleAccountsChanged = (accounts: string[]) => {
      if (!accounts || accounts.length === 0) {
        setState({
          address: null,
          isConnected: false,
          connecting: false,
          error: null,
        });
      } else {
        setState((s) => ({
          ...s,
          address: accounts[0],
          isConnected: true,
          connecting: false,
          error: null,
        }));
      }
    };

    const handleChainChanged = () => {
      eth
        .request({ method: "eth_accounts" })
        .then((accounts: string[]) => handleAccountsChanged(accounts))
        .catch((err: any) =>
          console.error("eth_accounts on chainChanged error:", err),
        );
    };

    eth.on?.("accountsChanged", handleAccountsChanged);
    eth.on?.("chainChanged", handleChainChanged);

    return () => {
      eth.removeListener?.("accountsChanged", handleAccountsChanged);
      eth.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [isClient]);

  const connect = async () => {
    if (!isClient) return;
    const eth = (window as any).ethereum;
    if (!eth) {
      setState((s) => ({
        ...s,
        error: "Tarayıcı cüzdanı (MetaMask vb.) bulunamadı.",
      }));
      return;
    }

    try {
      setState((s) => ({ ...s, connecting: true, error: null }));
      const accounts: string[] = await eth.request({
        method: "eth_requestAccounts",
      });
      if (accounts && accounts.length > 0) {
        setState({
          address: accounts[0],
          isConnected: true,
          connecting: false,
          error: null,
        });
      } else {
        setState({
          address: null,
          isConnected: false,
          connecting: false,
          error: "Herhangi bir hesap seçilmedi.",
        });
      }
    } catch (err: any) {
      console.error("eth_requestAccounts error:", err);
      setState((s) => ({
        ...s,
        connecting: false,
        error:
          err?.message || "Cüzdana bağlanmaya çalışırken bir hata oluştu.",
      }));
    }
  };

  const disconnect = () => {
    setState({
      address: null,
      isConnected: false,
      connecting: false,
      error: null,
    });
  };

  return {
    address: state.address,
    isConnected: state.isConnected,
    connecting: state.connecting,
    error: state.error,
    connect,
    disconnect,
  };
}
