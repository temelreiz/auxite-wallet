"use client";
import { WagmiProvider, createConfig, http } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, getDefaultConfig, darkTheme } from "@rainbow-me/rainbowkit";
import type { Locale } from "@rainbow-me/rainbowkit";
import { ReactNode, useState, useEffect } from "react";

const config = getDefaultConfig({
  appName: "Auxite",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
  ssr: true,
});

const queryClient = new QueryClient();

const getLocale = (): Locale => {
  if (typeof window === "undefined") return "en";
  const storedLang = localStorage.getItem("auxite_language") || "en";
  const supported: Record<string, Locale> = {
    tr: "tr",
    en: "en",
    fr: "fr",
    ar: "ar",
    ru: "ru",
    de: "en",
  };
  return supported[storedLang] || "en";
};

export function Web3Provider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    setMounted(true);
    setLocale(getLocale());
    
    // Dil değişikliğini dinle
    const handleStorageChange = () => {
      setLocale(getLocale());
    };
    
    window.addEventListener("storage", handleStorageChange);
    
    // Custom event dinle (aynı tab için)
    window.addEventListener("languageChange", handleStorageChange);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("languageChange", handleStorageChange);
    };
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          key={locale} // Locale değişince yeniden render
          theme={darkTheme({
            accentColor: "#10b981",
            accentColorForeground: "white",
            borderRadius: "medium",
          })}
          initialChain={sepolia}
          locale={locale}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default Web3Provider;