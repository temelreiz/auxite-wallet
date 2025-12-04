"use client";
import { ReactNode, useState, useEffect } from "react";
import { WagmiProvider, createConfig, http, createStorage } from "wagmi";
import { sepolia, mainnet, baseSepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";
import { WalletProvider } from "@/components/WalletContext";

const queryClient = new QueryClient();

// localStorage kullanılabilir mi kontrol et
function isLocalStorageAvailable() {
  try {
    const test = '__storage_test__';
    window.localStorage.setItem(test, test);
    window.localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

// Memory storage (fallback)
const memoryStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export default function Web3Provider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    try {
      const storageAvailable = isLocalStorageAvailable();
      
      const cfg = createConfig(
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
          // localStorage yoksa memory storage kullan
          storage: storageAvailable 
            ? createStorage({ storage: localStorage })
            : createStorage({ storage: memoryStorage as any }),
        })
      );
      
      setConfig(cfg);
    } catch (e) {
      console.error("Web3Provider error:", e);
    }
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-slate-950" />;
  }

  if (!config) {
    return <>{children}</>;
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
