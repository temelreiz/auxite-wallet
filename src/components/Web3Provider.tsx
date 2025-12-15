"use client";
import { WagmiProvider, createConfig, http } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider } from "connectkit";
import { ReactNode, useState, useEffect } from "react";
import { injected, walletConnect } from "wagmi/connectors";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

const config = createConfig({
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
  connectors: [
    injected(),
    walletConnect({
      projectId,
      showQrModal: false,
      metadata: {
        name: "Auxite",
        description: "Tokenized Precious Metals Platform",
        url: "https://auxite.io",
        icons: ["https://auxite.io/icon.png"],
      },
    }),
  ],
});

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider
          theme="midnight"
          mode="dark"
          options={{
            initialChainId: sepolia.id,
          }}
        >
          {mounted ? children : null}
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default Web3Provider;