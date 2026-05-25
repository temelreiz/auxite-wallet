"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { isPublicMarketingPath } from "@/lib/public-routes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, http, createConfig } from "wagmi";
import { mainnet, sepolia, baseSepolia } from "wagmi/chains";
import { RainbowKitProvider, darkTheme, connectorsForWallets } from "@rainbow-me/rainbowkit";
import { metaMaskWallet, coinbaseWallet, walletConnectWallet, rainbowWallet } from "@rainbow-me/rainbowkit/wallets";
import { WalletProvider } from "@/components/WalletContext";
import { APP_CHAIN } from "@/config/chains";

const queryClient = new QueryClient();

const projectId = (process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo-project-id").trim();

// Manuel connector tanimlama - getDefaultConfig kullanmiyoruz
const connectors = connectorsForWallets(
  [
    {
      groupName: "Popular",
      wallets: [
        metaMaskWallet,
        coinbaseWallet,
        walletConnectWallet,
        rainbowWallet,
      ],
    },
  ],
  {
    appName: "Auxite Wallet",
    projectId,
  }
);

const config = createConfig({
  connectors,
  chains: [mainnet, sepolia, baseSepolia],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [baseSepolia.id]: http(),
  },
  ssr: true,
});

export function Web3Provider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    // localStorage erisimini test et
    try {
      const test = "__storage_test__";
      window.localStorage.setItem(test, test);
      window.localStorage.removeItem(test);
      setMounted(true);
    } catch (e) {
      console.warn("localStorage not available:", e);
      setStorageError(true);
      setMounted(true);
    }
  }, []);

  // Authenticated app waits for client mount before rendering (avoids
  // wallet-related SSR/hydration issues). Public marketing pages skip this
  // gate so their content is server-rendered and indexable — they still get
  // the provider tree below, so shared components (e.g. TopNav) that read
  // wallet context keep working.
  const isPublic = isPublicMarketingPath(pathname);

  if (!mounted && !isPublic) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-stone-300 dark:border-zinc-600 border-t-[#BFA181] rounded-full"></div>
      </div>
    );
  }

  if (storageError && !isPublic) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 max-w-md text-center shadow-lg">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
            Storage Access Required
          </h2>
          <p className="text-slate-600 dark:text-zinc-400 mb-4">
            This app requires access to browser storage. Please:
          </p>
          <ul className="text-left text-sm text-slate-600 dark:text-zinc-400 space-y-2 mb-4">
            <li>• Disable private/incognito mode</li>
            <li>• Allow 3rd party cookies in browser settings</li>
            <li>• If using Brave, disable Shields for this site</li>
            <li>• Try a different browser (Chrome, Firefox)</li>
          </ul>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-[#2F6F62] hover:bg-[#2F6F62] text-white px-4 py-2 rounded-lg transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#10b981",
            accentColorForeground: "white",
            borderRadius: "medium",
          })}
          initialChain={APP_CHAIN.chainId === mainnet.id ? mainnet : sepolia}
          modalSize="compact"
          appInfo={{
            appName: "Auxite Wallet",
            learnMoreUrl: undefined,
          }}
        >
          <WalletProvider>{children}</WalletProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default Web3Provider;
