"use client";
import React from "react";

import { useState, useEffect } from "react";
import { useAccount, useBalance } from "wagmi";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { useMetalsPrices } from "@/hooks/useMetalsPrices";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";

interface PortfolioOverviewProps {
  lang?: "tr" | "en";
  onExchangeClick?: () => void;
  walletAddress?: string;
  showActionButtons?: boolean;
}

const metalIcons: Record<string, string> = {
  AUXG: "/gold-favicon-32x32.png",
  AUXS: "/silver-favicon-32x32.png",
  AUXPT: "/platinum-favicon-32x32.png",
  AUXPD: "/palladium-favicon-32x32.png",
};

// Crypto icon components
const CryptoIcons: Record<string, React.ReactNode> = {
  ETH: (
    <svg className="w-5 h-5" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#627EEA"/>
      <path d="M16.498 4v8.87l7.497 3.35L16.498 4z" fill="#fff" fillOpacity=".6"/>
      <path d="M16.498 4L9 16.22l7.498-3.35V4z" fill="#fff"/>
      <path d="M16.498 21.968v6.027L24 17.616l-7.502 4.352z" fill="#fff" fillOpacity=".6"/>
      <path d="M16.498 27.995v-6.028L9 17.616l7.498 10.379z" fill="#fff"/>
      <path d="M16.498 20.573l7.497-4.353-7.497-3.348v7.701z" fill="#fff" fillOpacity=".2"/>
      <path d="M9 16.22l7.498 4.353v-7.701L9 16.22z" fill="#fff" fillOpacity=".6"/>
    </svg>
  ),
  BTC: (
    <svg className="w-5 h-5" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#F7931A"/>
      <path d="M22.5 14.1c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.7-.4-.7 2.6c-.4-.1-.9-.2-1.4-.3l.7-2.7-1.7-.4-.7 2.7c-.4-.1-.7-.2-1-.2v-.1l-2.3-.6-.4 1.8s1.2.3 1.2.3c.7.2.8.6.8 1l-.8 3.2c0 0 .1 0 .2.1h-.2l-1.1 4.5c-.1.2-.3.5-.8.4 0 0-1.2-.3-1.2-.3l-.8 1.9 2.2.5c.4.1.8.2 1.2.3l-.7 2.8 1.7.4.7-2.7c.5.1.9.2 1.4.3l-.7 2.7 1.7.4.7-2.8c2.9.5 5.1.3 6-2.3.7-2.1 0-3.3-1.5-4.1 1.1-.3 1.9-1 2.1-2.5zm-3.8 5.3c-.5 2.1-4 1-5.1.7l.9-3.7c1.1.3 4.7.8 4.2 3zm.5-5.4c-.5 1.9-3.4.9-4.3.7l.8-3.4c.9.2 4 .6 3.5 2.7z" fill="#fff"/>
    </svg>
  ),
  USDT: (
    <svg className="w-5 h-5" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#26A17B"/>
      <path d="M17.9 17.9v-.1c-.1 0-.7 0-2 0-1 0-1.7 0-1.9.1v.1c-3.7.2-6.5.8-6.5 1.5 0 .8 3.5 1.5 7.8 1.5s7.8-.7 7.8-1.5c.1-.8-2.5-1.4-5.2-1.6zm-2-1.3c1.4 0 2.5 0 3-.1v-2.3h4.5V11H8.6v3.2h4.5v2.3c.6.1 1.7.1 2.8.1z" fill="#fff"/>
    </svg>
  ),
  TRY: (
    <svg className="w-5 h-5" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#E30A17"/>
      <path d="M16 8c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 14c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6z" fill="#fff"/>
      <text x="16" y="20" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">₺</text>
    </svg>
  ),
};

export function PortfolioOverview({ 
  lang = "en", 
  onExchangeClick, 
  walletAddress,
  showActionButtons = true 
}: PortfolioOverviewProps) {
  const [mounted, setMounted] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const { address, isConnected } = useAccount();
  const { balances, isLoading: balancesLoading } = useTokenBalances();
  const { prices, loading: pricesLoading } = useMetalsPrices();
  const { prices: cryptoPrices } = useCryptoPrices();

  // Use provided walletAddress or connected address
  const displayAddress = walletAddress || address;

  // Get ETH balance
  const { data: ethBalance } = useBalance({
    address: address,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLoading = balancesLoading || pricesLoading;

  // Get real changes from API
  const { changes: metalChanges } = useMetalsPrices();

  // Calculate metal holdings
  const metalHoldings = Object.entries(balances).map(([metal, balance]) => {
    const balanceNum = parseFloat(balance);
    const price = prices[metal] || 0;
    const value = balanceNum * price;
    const change = metalChanges[metal] || 0;
    
    return {
      symbol: metal,
      name: metal === "AUXG" ? "Gold" : metal === "AUXS" ? "Silver" : metal === "AUXPT" ? "Platinum" : "Palladium",
      balance: balanceNum,
      balanceKg: balanceNum / 1000,
      price,
      value,
      change,
      icon: metalIcons[metal],
      type: "metal" as const,
    };
  });

  // Crypto holdings
  const ethBalanceNum = ethBalance ? parseFloat(ethBalance.formatted) : 0;
  const ethValue = ethBalanceNum * (cryptoPrices?.eth || 0);

  const cryptoHoldings = [
    {
      symbol: "ETH",
      name: "Ethereum",
      balance: ethBalanceNum,
      price: cryptoPrices?.eth || 0,
      value: ethValue,
      change: 0,
      type: "crypto" as const,
    },
    {
      symbol: "BTC",
      name: "Bitcoin",
      balance: 0,
      price: cryptoPrices?.btc || 0,
      value: 0,
      change: 0,
      type: "crypto" as const,
    },
    {
      symbol: "USDT",
      name: "Tether",
      balance: 0,
      price: 1,
      value: 0,
      change: 0,
      type: "crypto" as const,
    },
    {
      symbol: "TRY",
      name: "Turkish Lira",
      balance: 0,
      price: 1 / (cryptoPrices?.try || 34.5),
      value: 0,
      change: 0,
      type: "fiat" as const,
    },
  ];

  // Calculate totals
  const metalTotal = metalHoldings.reduce((sum, h) => sum + h.value, 0);
  const cryptoTotal = cryptoHoldings.reduce((sum, h) => sum + h.value, 0);
  const totalValue = metalTotal + cryptoTotal;

  if (!mounted || isLoading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-800 rounded w-1/3"></div>
          <div className="h-16 bg-slate-800 rounded"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-slate-800 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isConnected && !walletAddress) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="text-center py-8">
          <div className="text-4xl mb-4">💼</div>
          <p className="text-slate-400 text-sm">
            {lang === "tr" 
              ? "Portföyünüzü görmek için cüzdanınızı bağlayın" 
              : "Connect your wallet to view your portfolio"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Total Value Header with Wallet Address and Details Button */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm text-slate-400 mb-1">
              {lang === "tr" ? "Toplam Portföy Değeri" : "Total Portfolio Value"}
            </div>
            <div className="text-3xl font-bold text-slate-100">
              ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-sm text-slate-400 ml-2 font-normal">USDT</span>
            </div>
          </div>
          
          {/* Right side: Wallet Address + Details Button */}
          <div className="flex flex-col items-end gap-2">
            {/* Wallet Address */}
            {displayAddress && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="text-sm text-slate-300 font-mono">
                  {displayAddress.slice(0, 6)}...{displayAddress.slice(-4)}
                </span>
              </div>
            )}
            
            {/* Details Button */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors border border-slate-700"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              {lang === "tr" ? "Detaylar" : "Details"}
            </button>
          </div>
        </div>
      </div>

      {/* Metal Assets Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metalHoldings.map((holding) => (
          <div
            key={holding.symbol}
            className="rounded-xl border border-slate-800 bg-slate-900/50 p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <img src={holding.icon} alt={holding.symbol} className="w-5 h-5" />
                <span className="text-sm font-medium text-slate-200">{holding.symbol}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${
                holding.change >= 0 
                  ? "bg-emerald-500/20 text-emerald-400" 
                  : "bg-red-500/20 text-red-400"
              }`}>
                {holding.change >= 0 ? "↑" : "↓"} {Math.abs(holding.change).toFixed(2)}%
              </span>
            </div>
            <div className="text-xs text-slate-500 mb-2">{holding.name}</div>
            <div className="text-xl font-bold text-slate-100">
              {holding.balance.toFixed(2)}g
            </div>
            <div className="text-xs text-slate-500">
              {holding.balanceKg.toFixed(3)} kg
            </div>
            <div className="text-sm text-slate-300 mt-2">
              ${holding.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-xs text-slate-500">
              ${holding.price.toFixed(2)}/g
            </div>
          </div>
        ))}
      </div>

      {/* Crypto Assets Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cryptoHoldings.map((holding) => (
          <div
            key={holding.symbol}
            className="rounded-xl border border-slate-800 bg-slate-900/50 p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {CryptoIcons[holding.symbol]}
                <span className="text-sm font-medium text-slate-200">{holding.symbol}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${
                holding.change >= 0 
                  ? "bg-emerald-500/20 text-emerald-400" 
                  : "bg-red-500/20 text-red-400"
              }`}>
                {holding.change >= 0 ? "↑" : "↓"} {Math.abs(holding.change).toFixed(2)}%
              </span>
            </div>
            <div className="text-xs text-slate-500 mb-2">{holding.name}</div>
            <div className="text-xl font-bold text-slate-100">
              {holding.balance.toFixed(4)}
            </div>
            <div className="text-xs text-slate-500">
              {holding.symbol}
            </div>
            <div className="text-sm text-slate-300 mt-2">
              ${holding.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-xs text-slate-500">
              ${holding.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          </div>
        ))}
      </div>

      {/* Details Panel (conditionally shown) */}
      {showDetails && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">
            {lang === "tr" ? "Portföy Detayları" : "Portfolio Details"}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <div className="text-sm text-slate-400 mb-1">
                {lang === "tr" ? "Metal Varlıklar" : "Metal Assets"}
              </div>
              <div className="text-xl font-bold text-amber-400">
                ${metalTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {totalValue > 0 ? ((metalTotal / totalValue) * 100).toFixed(1) : '0'}% {lang === "tr" ? "portföy" : "of portfolio"}
              </div>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <div className="text-sm text-slate-400 mb-1">
                {lang === "tr" ? "Kripto Varlıklar" : "Crypto Assets"}
              </div>
              <div className="text-xl font-bold text-blue-400">
                ${cryptoTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {totalValue > 0 ? ((cryptoTotal / totalValue) * 100).toFixed(1) : '0'}% {lang === "tr" ? "portföy" : "of portfolio"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons - Only show if showActionButtons is true */}
      {showActionButtons && (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={onExchangeClick}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            {lang === "tr" ? "Dönüştür" : "Exchange"}
          </button>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors border border-slate-700"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {lang === "tr" ? "Detaylar" : "Details"}
          </button>
        </div>
      )}
    </div>
  );
}

export default PortfolioOverview;