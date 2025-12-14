"use client";
import { ReactNode, useState, useEffect } from "react";
import { WagmiProvider, createConfig, http, createStorage } from "wagmi";
import { sepolia, mainnet, baseSepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";
import { WalletProvider } from "@/components/WalletContext";

const queryClient = new QueryClient();

// Memory storage (fallback)
const memoryStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

// Config'i client-side'da oluştur
function createWagmiConfig() {
  let storage;
  
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const test = '__storage_test__';
      window.localStorage.setItem(test, test);
      window.localStorage.removeItem(test);
      storage = createStorage({ storage: localStorage });
    } else {
      storage = createStorage({ storage: memoryStorage as any });
    }
  } catch {
    storage = createStorage({ storage: memoryStorage as any });
  }

  return createConfig(
    getDefaultConfig({
      chains: [baseSepolia, sepolia, mainnet],
      transports: {
        [baseSepolia.id]: http(),
        [sepolia.id]: http(),
        [mainnet.id]: http(),
      },
      walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",
      appName: "Auxite Wallet",
      appDescription: "RWA Metal Token Wallet",
      storage,
    })
  );
}

export default function Web3Provider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [config, setConfig] = useState<ReturnType<typeof createWagmiConfig> | null>(null);

  useEffect(() => {
    try {
      const cfg = createWagmiConfig();
      setConfig(cfg);
    } catch (e) {
      console.error("Web3Provider config error:", e);
    }
    setMounted(true);
  }, []);

  // Server-side veya yüklenmeden önce loading göster
  if (!mounted || !config) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-slate-600 border-t-emerald-500 rounded-full"></div>
      </div>
    );
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider theme="midnight">
          <WalletProvider>
            {children}
          </WalletProvider>
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
