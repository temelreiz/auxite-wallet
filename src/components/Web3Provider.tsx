"use client";

import { ReactNode, useEffect, useState } from "react";
import {
  RainbowKitProvider,
  getDefaultConfig,
  lightTheme,
  darkTheme,
  AvatarComponent,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider, http } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Sadece gerekli importlar
import "@rainbow-me/rainbowkit/styles.css";

// Query client
const queryClient = new QueryClient();

// Wagmi config
const config = getDefaultConfig({
  appName: "Auxite Wallet",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo-project-id",
  chains: [sepolia, mainnet],
  transports: {
    [sepolia.id]: http(),
    [mainnet.id]: http(),
  },
  ssr: true,
});

// Custom Avatar Component
const CustomAvatar: AvatarComponent = ({ address, ensImage, size }) => {
  if (ensImage) {
    return (
      <img
        src={ensImage}
        width={size}
        height={size}
        style={{ borderRadius: 999 }}
        alt="ENS Avatar"
      />
    );
  }

  // Generate deterministic gradient based on address
  const colors = [
    ['#10b981', '#059669'], // emerald
    ['#3b82f6', '#2563eb'], // blue
    ['#8b5cf6', '#7c3aed'], // violet
    ['#f59e0b', '#d97706'], // amber
    ['#ec4899', '#db2777'], // pink
    ['#06b6d4', '#0891b2'], // cyan
  ];

  const colorIndex = parseInt(address.slice(2, 4), 16) % colors.length;
  const [color1, color2] = colors[colorIndex];

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`,
        borderRadius: 999,
        height: size,
        width: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 'bold',
        fontSize: size * 0.4,
      }}
    >
      {address.slice(2, 4).toUpperCase()}
    </div>
  );
};

export function Web3Provider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Theme detection
  useEffect(() => {
    setMounted(true);

    const checkTheme = () => {
      if (typeof window === 'undefined') return;
      
      const html = document.documentElement;
      const hasDarkClass = html.classList.contains('dark');
      const hasLightClass = html.classList.contains('light');
      
      if (hasDarkClass) {
        setIsDark(true);
        return;
      }
      if (hasLightClass) {
        setIsDark(false);
        return;
      }
      
      // Check localStorage
      const stored = localStorage.getItem('theme');
      if (stored === 'dark') {
        setIsDark(true);
        return;
      }
      if (stored === 'light') {
        setIsDark(false);
        return;
      }
      
      // System preference
      setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
    };

    checkTheme();

    // Listen for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    window.addEventListener('storage', checkTheme);
    window.addEventListener('themeChange', checkTheme);

    // Fallback interval for edge cases
    const interval = setInterval(checkTheme, 500);

    return () => {
      observer.disconnect();
      window.removeEventListener('storage', checkTheme);
      window.removeEventListener('themeChange', checkTheme);
      clearInterval(interval);
    };
  }, []);

  // Create theme based on current mode
  const theme = isDark
    ? darkTheme({
        accentColor: '#10b981',
        accentColorForeground: 'white',
        borderRadius: 'medium',
        fontStack: 'system',
        overlayBlur: 'small',
      })
    : lightTheme({
        accentColor: '#10b981',
        accentColorForeground: 'white',
        borderRadius: 'medium',
        fontStack: 'system',
        overlayBlur: 'small',
      });

  // SSR hydration fix
  if (!mounted) {
    return (
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    );
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={theme}
          avatar={CustomAvatar}
          locale="en"
          showRecentTransactions={true}
          coolMode
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default Web3Provider;
