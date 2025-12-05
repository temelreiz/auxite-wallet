"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { ConnectKitButton } from "connectkit";
import Link from "next/link";
import Image from "next/image";
import { AllocationFinder } from "@/components/AllocationFinder";
import { TransactionHistory } from "@/components/TransactionHistory";
import { ExchangeModal } from "@/components/ExchangeModal";
import { BuyMetalModal } from "@/components/BuyMetalModal";
import { DepositAddressModal } from "@/components/DepositAddressModal";
import { CryptoConvertModal } from "@/components/CryptoConvertModal";
import { MetalConvertModal } from "@/components/MetalConvertModal";
import { WithdrawModal } from "@/components/WithdrawModal";
import { UsdDepositModal } from "@/components/UsdDepositModal";
import { BuyWithUsdModal } from "@/components/BuyWithUsdModal";
import { UsdConvertModal } from "@/components/UsdConvertModal";
import { SecuritySettings } from "@/components/Security/SecuritySettings";
import { AdvancedSecurityModal } from "@/components/Security/AdvancedSecurityModal";
import { PriceAlertManager } from "@/components/PriceAlertManager";
import { RecurringBuyManager } from "@/components/RecurringBuyManager";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { useMetalsPrices } from "@/hooks/useMetalsPrices";

import { useWallet } from "@/components/WalletContext";
// Storage keys
const STORAGE_KEYS = {
  HAS_WALLET: "auxite_has_wallet",
  WALLET_ADDRESS: "auxite_wallet_address",
  WALLET_MODE: "auxite_wallet_mode",
  SESSION_UNLOCKED: "auxite_session_unlocked",
  LANGUAGE: "auxite_language",
};

export default function WalletPage() {
  const [lang, setLang] = useState<"tr" | "en">("tr");
  
  // External wallet (wagmi)
  const { isConnected: isExternalConnected, address: externalAddress } = useAccount();
  

  // Bakiyeler - useWallet hook
  const { balances } = useWallet();
  const auxmBalance = balances?.auxm ?? 0;
  const bonusAuxm = balances?.bonusAuxm ?? 0;
  const auxgBalance = balances?.auxg ?? 0;
  const auxsBalance = balances?.auxs ?? 0;
  const auxptBalance = balances?.auxpt ?? 0;
  const auxpdBalance = balances?.auxpd ?? 0;
  const ethBalance = balances?.eth ?? 0;
  const btcBalance = balances?.btc ?? 0;
  const xrpBalance = balances?.xrp ?? 0;
  const solBalance = balances?.sol ?? 0;
  const usdBalance = balances?.usd ?? 0;
  const usdtBalance = balances?.usdt ?? 0;

  // Local wallet state
  const [localWalletAddress, setLocalWalletAddress] = useState<string | null>(null);
  const [walletMode, setWalletMode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSessionUnlocked, setIsSessionUnlocked] = useState(false);
  
  // Modal states
  const [showExchange, setShowExchange] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showOnChainDeposit, setShowOnChainDeposit] = useState(false);
  const [showFiatDeposit, setShowFiatDeposit] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showReceive, setShowReceive] = useState(false);
  const [showBuyMetal, setShowBuyMetal] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [depositSearchQuery, setDepositSearchQuery] = useState("");
  const [showUsdDeposit, setShowUsdDeposit] = useState(false);
  const [showBuyWithUsd, setShowBuyWithUsd] = useState(false);
  const [showUsdConvert, setShowUsdConvert] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);
  const [showAdvancedSecurity, setShowAdvancedSecurity] = useState(false);
  const [showPriceAlerts, setShowPriceAlerts] = useState(false);
  const [showRecurringBuy, setShowRecurringBuy] = useState(false);
  
  // New modal states for portfolio clicks
  const [selectedMetal, setSelectedMetal] = useState<"AUXG" | "AUXS" | "AUXPT" | "AUXPD" | null>(null);
  const [selectedDepositCoin, setSelectedDepositCoin] = useState<string | null>(null);
  const [selectedCrypto, setSelectedCrypto] = useState<"ETH" | "BTC" | "XRP" | "SOL" | null>(null);
  
  // Get prices for modals
  const { prices: cryptoPrices } = useCryptoPrices();
  const { prices: metalAskPrices, bidPrices } = useMetalsPrices();
  
  // USDT/USD fiyatı
  const [usdtPrice, setUsdtPrice] = useState<number>(1);
  
  // USDT/USD fiyatını çek (Binance API - daha güvenilir)
  useEffect(() => {
    const fetchUsdtPrice = async () => {
      try {
        // Binance USDT/USDC pair - USDC is 1:1 with USD
        const res = await fetch(
          "https://api.binance.com/api/v3/ticker/price?symbol=USDCUSDT"
        );
        const data = await res.json();
        if (data?.price) {
          // USDC/USDT fiyatı = 1 USDC kaç USDT
          // USDT/USD için tersini al: 1 / price
          const usdtUsdPrice = 1 / parseFloat(data.price);
          setUsdtPrice(usdtUsdPrice);
          console.log("USDT/USD fiyatı:", usdtUsdPrice);
        }
      } catch (err) {
        console.error("USDT price fetch error:", err);
        // Fallback: CoinGecko dene
        try {
          const res2 = await fetch(
            "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd"
          );
          const data2 = await res2.json();
          if (data2?.tether?.usd) {
            setUsdtPrice(data2.tether.usd);
            console.log("USDT/USD (CoinGecko):", data2.tether.usd);
          }
        } catch {
          setUsdtPrice(1);
        }
      }
    };
    
    fetchUsdtPrice();
    const interval = setInterval(fetchUsdtPrice, 30000);
    return () => clearInterval(interval);
  }, []);

  // Toplam varlık değeri hesapla (USDT cinsinden)
  const totalEstimatedValue = 
    (auxgBalance * (metalAskPrices?.AUXG || 0)) +
    (auxsBalance * (metalAskPrices?.AUXS || 0)) +
    (auxptBalance * (metalAskPrices?.AUXPT || 0)) +
    (auxpdBalance * (metalAskPrices?.AUXPD || 0)) +
    (ethBalance * (cryptoPrices?.eth || 0)) +
    (btcBalance * (cryptoPrices?.btc || 0)) +
    (xrpBalance * (cryptoPrices?.xrp || 0)) +
    (solBalance * (cryptoPrices?.sol || 0)) +
    (balances?.usdt || 0) +
    (balances?.usd || 0);
  
  // USD cinsinden toplam değer (USDT * USDT/USD kuru)
  const totalEstimatedUsd = totalEstimatedValue * usdtPrice;
  
  // Deposit coins list
  const depositCoins = [
    { id: "BTC", name: "Bitcoin", icon: "₿", color: "#F7931A" },
    { id: "ETH", name: "Ethereum", icon: "Ξ", color: "#627EEA" },
    { id: "XRP", name: "Ripple", icon: "✕", color: "#23292F" },
    { id: "SOL", name: "Solana", icon: "◎", color: "#9945FF" },
  ];
  
  const filteredDepositCoins = depositCoins.filter(coin => 
    coin.id.toLowerCase().includes(depositSearchQuery.toLowerCase()) ||
    coin.name.toLowerCase().includes(depositSearchQuery.toLowerCase())
  );

  // Check wallet state on mount
  useEffect(() => {
    const savedMode = localStorage.getItem(STORAGE_KEYS.WALLET_MODE);
    const hasLocalWallet = localStorage.getItem(STORAGE_KEYS.HAS_WALLET);
    const localAddress = localStorage.getItem(STORAGE_KEYS.WALLET_ADDRESS);
    const sessionUnlocked = sessionStorage.getItem(STORAGE_KEYS.SESSION_UNLOCKED);
    const savedLang = localStorage.getItem(STORAGE_KEYS.LANGUAGE) as "tr" | "en" | null;

    if (savedLang) {
      setLang(savedLang);
    }

    setWalletMode(savedMode);
    
    if (savedMode === "local" && hasLocalWallet === "true" && localAddress) {
      setLocalWalletAddress(localAddress);
      if (sessionUnlocked === "true") {
        setIsSessionUnlocked(true);
      }
    }
    
    setIsLoading(false);
  }, []);

  // Handle language change
  const handleLanguageChange = (newLang: "tr" | "en") => {
    setLang(newLang);
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, newLang);
  };

  // Determine if wallet is connected
  const isWalletConnected = 
    (walletMode === "local" && !!localWalletAddress && isSessionUnlocked) || 
    (walletMode === "external" && isExternalConnected);

  const currentAddress = 
    walletMode === "local" ? localWalletAddress : externalAddress;

  // Current prices for alerts
  const currentPrices: Record<string, number> = {
    BTC: cryptoPrices?.btc || 0,
    ETH: cryptoPrices?.eth || 0,
    XRP: cryptoPrices?.xrp || 0,
    SOL: cryptoPrices?.sol || 0,
    AUXG: metalAskPrices?.AUXG || 0,
    AUXS: metalAskPrices?.AUXS || 0,
    AUXPT: metalAskPrices?.AUXPT || 0,
    AUXPD: metalAskPrices?.AUXPD || 0,
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-slate-600 border-t-emerald-500 rounded-full"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Top Navigation */}
      <div className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left Side - Logo + Navigation */}
            <div className="flex items-center gap-5">
              {/* Logo */}
              <Link href="/">
                <Image
                  src="/auxite-wallet-logo.png"
                  alt="Auxite"
                  width={160}
                  height={40}
                  className="h-12 w-auto"
                />
              </Link>

              {/* Navigation - Sıra: Piyasalar, Earn, Cüzdan */}
              <div className="flex gap-2">
                <Link
                  href="/"
                  className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm transition-colors"
                >
                  {lang === "tr" ? "Piyasalar" : "Markets"}
                </Link>
                <Link
                  href="/earn"
                  className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm transition-colors"
                >
                  {lang === "tr" ? "Kazan" : "Earn"}
                </Link>
                <Link
                  href="/wallet"
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 text-white font-medium text-sm"
                >
                  {lang === "tr" ? "Cüzdan" : "Wallet"}
                </Link>
              </div>
            </div>

            {/* Right Side - Language + Wallet */}
            <div className="flex items-center gap-3">
              {/* Language Toggle */}
              <div className="flex gap-0.5 bg-slate-800 rounded-lg p-0.5">
                <button
                  onClick={() => handleLanguageChange("tr")}
                  className={`px-2.5 py-1 rounded text-sm font-medium transition-colors ${
                    lang === "tr"
                      ? "bg-emerald-500 text-white"
                      : "text-slate-400 hover:text-slate-300"
                  }`}
                >
                  TR
                </button>
                <button
                  onClick={() => handleLanguageChange("en")}
                  className={`px-2.5 py-1 rounded text-sm font-medium transition-colors ${
                    lang === "en"
                      ? "bg-emerald-500 text-white"
                      : "text-slate-400 hover:text-slate-300"
                  }`}
                >
                  EN
                </button>
              </div>

              {/* Security Button */}
              <button
                onClick={() => setShowSecurity(true)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-emerald-500 transition-all group"
                title={lang === "tr" ? "Güvenlik Ayarları" : "Security Settings"}
              >
                <svg className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </button>

              {/* Advanced Security Button */}
              <button
                onClick={() => setShowAdvancedSecurity(true)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-500 transition-all group"
                title={lang === "tr" ? "Gelişmiş Güvenlik" : "Advanced Security"}
              >
                <svg className="w-5 h-5 text-slate-400 group-hover:text-amber-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </button>

              {/* Price Alert Button */}
              <button
                onClick={() => setShowPriceAlerts(true)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-500 transition-all group"
                title={lang === "tr" ? "Fiyat Uyarıları" : "Price Alerts"}
              >
                <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>

              {/* Recurring Buy Button */}
              <button
                onClick={() => setShowRecurringBuy(true)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-purple-500 transition-all group"
                title={lang === "tr" ? "Otomatik Alım" : "Auto Buy (DCA)"}
              >
                <svg className="w-5 h-5 text-slate-400 group-hover:text-purple-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>

              {/* Wallet Display */}
              {walletMode === "local" && localWalletAddress && isSessionUnlocked ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg border border-slate-700">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-sm text-slate-300 font-mono">
                    {localWalletAddress.slice(0, 6)}...{localWalletAddress.slice(-4)}
                  </span>
                </div>
              ) : (
                <ConnectKitButton />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Description */}
      <div className="border-b border-slate-800 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h2 className="text-lg font-semibold text-slate-100 mb-1">
            {lang === "tr" ? "Cüzdanım" : "My Wallet"}
          </h2>
          <p className="text-sm text-slate-400">
            {lang === "tr"
              ? "Varlıklarınızı görüntüleyin, transfer edin ve yönetin."
              : "View, transfer and manage your assets."}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {isWalletConnected ? (
          <>
            {/* 6 Action Buttons Row - EN ÜSTTE */}
            <div className="grid grid-cols-6 gap-3">
              {/* Yatır / Add Funds */}
              <button
                onClick={() => setShowDeposit(true)}
                className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-emerald-500 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                  {lang === "tr" ? "Yatır" : "Add Funds"}
                </span>
              </button>

              {/* Gönder / Transfer */}
              <button
                onClick={() => setShowTransfer(true)}
                className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-500 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                  <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                  {lang === "tr" ? "Gönder" : "Transfer"}
                </span>
              </button>

              {/* Hızlı Al / Quick Buy */}
              <button
                onClick={() => setShowBuyMetal(true)}
                className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-purple-500 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                  <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                  {lang === "tr" ? "Hızlı Al" : "Quick Buy"}
                </span>
              </button>

              {/* Dönüştür / Exchange */}
              <button
                onClick={() => setShowExchange(true)}
                className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-orange-500 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center group-hover:bg-orange-500/30 transition-colors">
                  <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                  {lang === "tr" ? "Dönüştür" : "Exchange"}
                </span>
              </button>

              {/* Kazan / Earn - Goes to Earn Page */}
              <Link
                href="/earn"
                className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-500 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/30 transition-colors">
                  <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                  {lang === "tr" ? "Kazan" : "Earn"}
                </span>
              </Link>

              {/* Çek / Withdraw */}
              <button
                onClick={() => setShowWithdraw(true)}
                className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-red-500 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center group-hover:bg-red-500/30 transition-colors">
                  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 14l-4-4m4 4l4-4" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                  {lang === "tr" ? "Çek" : "Withdraw"}
                </span>
              </button>
            </div>

            {/* Total Asset Value Card */}
            <div className="rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-6">
              <div className="text-center mb-4">
                <p className="text-sm text-slate-400 mb-1">
                  {lang === "tr" ? "Toplam Varlık Değeri (tahmini)" : "Total Asset Value (est.)"}
                </p>
                <h2 className="text-4xl font-bold text-white">
                  ${totalEstimatedValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </h2>
              </div>
              <div className="flex justify-center gap-8 pt-4 border-t border-slate-700">
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-1">
                    {lang === "tr" ? "Auxite ve Crypto Varlıklar" : "Auxite and Crypto Assets"}
                  </p>
                  <p className="text-lg font-semibold text-emerald-400">$125,456.78</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-1">
                    {lang === "tr" ? "Kilitli Varlıklar" : "Locked Assets"}
                  </p>
                  <p className="text-lg font-semibold text-amber-400">$13,000.00</p>
                </div>
              </div>
            </div>

            {/* USDT & AUXM Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* USDT & USD Balance Card */}
              <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center">
                      <span className="text-white text-xl font-bold">₮</span>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Estimated Total Value</p>
                      <p className="text-2xl font-bold text-white">
                        {totalEstimatedValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} 
                        <span className="text-emerald-400 text-lg ml-1">USDT</span>
                      </p>
                      <p className="text-sm text-green-400 mt-0.5">
                        ≈ ${totalEstimatedUsd.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD
                      </p>
                    </div>
                  </div>
                  {/* USD Actions */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setShowUsdDeposit(true)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                    >
                      {lang === "tr" ? "+ USD Yatır" : "+ Deposit USD"}
                    </button>
                    {usdBalance > 0 && (
                      <button
                        onClick={() => setShowBuyWithUsd(true)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
                      >
                        {lang === "tr" ? "USD ile Al" : "Buy with USD"}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* AUXM Balance Card */}
              <div className="rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center">
                      <span className="text-white text-xl font-bold">◈</span>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">AUXM Balance</p>
                      <p className="text-2xl font-bold text-white">{auxmBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} <span className="text-purple-400 text-lg">AUXM</span></p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-purple-400">🎁 Bonus</p>
                    <p className="text-lg font-semibold text-purple-400">+{bonusAuxm.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
            {/* Auxite ve Crypto Varlıklarım Section */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                {lang === "tr" ? "Auxite ve Crypto Varlıklarım" : "My Auxite and Crypto Assets"}
              </h3>
              
              {/* Metal Assets */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {/* AUXG */}
                <button
                  onClick={() => setSelectedMetal("AUXG")}
                  className="p-4 rounded-xl bg-slate-800 border border-slate-700 hover:border-yellow-500/50 transition-all text-left group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <img src="/gold-favicon-32x32.png" alt="AUXG" className="w-8 h-8" />
                    <div>
                      <p className="text-sm font-medium text-white">AUXG</p>
                      <p className="text-xs text-slate-400">{lang === "tr" ? "Altın" : "Gold"}</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-yellow-500">{auxgBalance.toFixed(2)}g</p>
                  <p className="text-xs text-slate-400">≈ ${(auxgBalance * (metalAskPrices?.AUXG || 0)).toFixed(2)}</p>
                </button>

                {/* AUXS */}
                <button
                  onClick={() => setSelectedMetal("AUXS")}
                  className="p-4 rounded-xl bg-slate-800 border border-slate-700 hover:border-gray-400/50 transition-all text-left group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">Ag</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">AUXS</p>
                      <p className="text-xs text-slate-400">{lang === "tr" ? "Gümüş" : "Silver"}</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-gray-300">{auxsBalance.toFixed(2)}g</p>
                  <p className="text-xs text-slate-400">≈ ${(auxsBalance * (metalAskPrices?.AUXS || 0)).toFixed(2)}</p>
                </button>

                {/* AUXPT */}
                <button
                  onClick={() => setSelectedMetal("AUXPT")}
                  className="p-4 rounded-xl bg-slate-800 border border-slate-700 hover:border-cyan-400/50 transition-all text-left group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-200 to-cyan-400 flex items-center justify-center">
                      <span className="text-slate-800 text-xs font-bold">Pt</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">AUXPT</p>
                      <p className="text-xs text-slate-400">{lang === "tr" ? "Platin" : "Platinum"}</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-cyan-300">{auxptBalance.toFixed(2)}g</p>
                  <p className="text-xs text-slate-400">≈ ${(auxptBalance * (metalAskPrices?.AUXPT || 0)).toFixed(2)}</p>
                </button>

                {/* AUXPD */}
                <button
                  onClick={() => setSelectedMetal("AUXPD")}
                  className="p-4 rounded-xl bg-slate-800 border border-slate-700 hover:border-orange-400/50 transition-all text-left group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">Pd</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">AUXPD</p>
                      <p className="text-xs text-slate-400">{lang === "tr" ? "Paladyum" : "Palladium"}</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-orange-400">{auxpdBalance.toFixed(2)}g</p>
                  <p className="text-xs text-slate-400">≈ ${(auxpdBalance * (metalAskPrices?.AUXPD || 0)).toFixed(2)}</p>
                </button>
              </div>

              {/* Crypto Assets */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* ETH */}
                <button
                  onClick={() => setSelectedCrypto("ETH")}
                  className="p-4 rounded-xl bg-slate-800 border border-slate-700 hover:border-[#627EEA]/50 transition-all text-left"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-[#627EEA] flex items-center justify-center">
                      <span className="text-white font-bold">Ξ</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">ETH</p>
                      <p className="text-xs text-slate-400">Ethereum</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-[#627EEA]">{ethBalance.toFixed(4)} ETH</p>
                  <p className="text-xs text-slate-400">≈ ${(ethBalance * (cryptoPrices?.eth || 3500)).toFixed(2)}</p>
                </button>

                {/* BTC */}
                <button
                  onClick={() => setSelectedCrypto("BTC")}
                  className="p-4 rounded-xl bg-slate-800 border border-slate-700 hover:border-[#F7931A]/50 transition-all text-left"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-[#F7931A] flex items-center justify-center">
                      <span className="text-white font-bold">₿</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">BTC</p>
                      <p className="text-xs text-slate-400">Bitcoin</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-[#F7931A]">{btcBalance.toFixed(6)} BTC</p>
                  <p className="text-xs text-slate-400">≈ ${(btcBalance * (cryptoPrices?.btc || 95000)).toFixed(2)}</p>
                </button>

                {/* XRP */}
                <button
                  onClick={() => setSelectedCrypto("XRP")}
                  className="p-4 rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-400/50 transition-all text-left"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-[#23292F] flex items-center justify-center border border-slate-600">
                      <span className="text-white font-bold">✕</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">XRP</p>
                      <p className="text-xs text-slate-400">Ripple</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-slate-300">{xrpBalance.toFixed(2)} XRP</p>
                  <p className="text-xs text-slate-400">≈ ${(xrpBalance * (cryptoPrices?.xrp || 2.2)).toFixed(2)}</p>
                </button>

                {/* SOL */}
                <button
                  onClick={() => setSelectedCrypto("SOL")}
                  className="p-4 rounded-xl bg-slate-800 border border-slate-700 hover:border-[#9945FF]/50 transition-all text-left"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-[#9945FF] flex items-center justify-center">
                      <span className="text-white font-bold">◎</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">SOL</p>
                      <p className="text-xs text-slate-400">Solana</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-[#9945FF]">{solBalance.toFixed(3)} SOL</p>
                  <p className="text-xs text-slate-400">≈ ${(solBalance * (cryptoPrices?.sol || 200)).toFixed(2)}</p>
                </button>
              </div>
            </div>

            {/* Ecosystem Description */}
            <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700">
              <p className="text-sm text-slate-300 leading-relaxed">
                {lang === "tr"
                  ? "Auxite ekosistemindeki tüm tokenlar, temsil ettikleri metal türüne karşılık gelen fiziksel değer üzerine yapılandırılmıştır; ilgili varlıklar, dünya genelindeki yetkili ve denetimli depolama tesisleri üzerinden muhafaza edilir."
                  : "All tokens in the Auxite ecosystem are structured on physical value corresponding to the metal type they represent; related assets are stored through authorized and audited storage facilities worldwide."}
              </p>
            </div>

            {/* Kilitli Varlıklar Section */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                {lang === "tr" ? "Kilitli Varlıklar" : "Locked Assets"}
              </h3>
              
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">{lang === "tr" ? "Toplam Kilitli" : "Total Locked"}</p>
                      <p className="text-xl font-bold text-white">100g AUXG</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">{lang === "tr" ? "Tahmini Değer" : "Est. Value"}</p>
                    <p className="text-lg font-semibold text-amber-400">$13,000.00</p>
                    <p className="text-xs text-emerald-400">+2.5% APY</p>
                  </div>
                </div>
                
                {/* Locked Items */}
                <div className="mt-4 pt-4 border-t border-amber-500/20 space-y-2">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
                    <div className="flex items-center gap-2">
                      <img src="/gold-favicon-32x32.png" alt="AUXG" className="w-6 h-6" />
                      <span className="text-sm text-white">AUXG - Zürich Vault</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-white">50g</span>
                      <span className="text-xs text-slate-400 ml-2">≈ $6,500</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
                    <div className="flex items-center gap-2">
                      <img src="/gold-favicon-32x32.png" alt="AUXG" className="w-6 h-6" />
                      <span className="text-sm text-white">AUXG - Singapore Vault</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-white">50g</span>
                      <span className="text-xs text-slate-400 ml-2">≈ $6,500</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Allocation Finder */}
            <AllocationFinder lang={lang} />

            {/* Transaction History */}
            <TransactionHistory lang={lang} />
          </>
        ) : (
          /* Connect Wallet Message */
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-800 flex items-center justify-center">
                <svg className="w-10 h-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-200 mb-2">
                {lang === "tr" ? "Cüzdan Bağlantısı Gerekli" : "Wallet Connection Required"}
              </h3>
              <p className="text-sm text-slate-400 mb-6">
                {lang === "tr"
                  ? "Varlıklarınızı görmek ve yönetmek için cüzdanınızı bağlayın"
                  : "Connect your wallet to view and manage your assets"}
              </p>
              <div className="flex justify-center">
                <ConnectKitButton />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Exchange Modal */}
      {showExchange && (
        <ExchangeModal 
          isOpen={showExchange}
          onClose={() => setShowExchange(false)}
          lang={lang}
        />
      )}

      {/* Buy Metal Modal (Hızlı Al) */}
      {showBuyMetal && (
        <BuyMetalModal
          isOpen={showBuyMetal}
          onClose={() => setShowBuyMetal(false)}
          lang={lang}
        />
      )}

      {selectedMetal && (
        <MetalConvertModal
          isOpen={!!selectedMetal}
          onClose={() => setSelectedMetal(null)}
          metal={selectedMetal}
          lang={lang}
        />
      )}

      {selectedCrypto && (
        <CryptoConvertModal
          isOpen={!!selectedCrypto}
          onClose={() => setSelectedCrypto(null)}
          crypto={selectedCrypto}
          lang={lang}
          cryptoBalances={{
            ETH: ethBalance,
            BTC: btcBalance,
            XRP: xrpBalance,
            SOL: solBalance,
          }}
          cryptoPrices={{
            ETH: cryptoPrices?.eth || 3500,
            BTC: cryptoPrices?.btc || 95000,
            XRP: cryptoPrices?.xrp || 2.2,
            SOL: cryptoPrices?.sol || 200,
          }}
          metalBidPrices={{
            AUXG: bidPrices?.AUXG || 90,
            AUXS: bidPrices?.AUXS || 1,
            AUXPT: bidPrices?.AUXPT || 30,
            AUXPD: bidPrices?.AUXPD || 30,
          }}
        />
      )}

      {/* Deposit Modal - Select Method */}
      {showDeposit && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50">
          <div className="bg-slate-900 rounded-t-2xl sm:rounded-2xl border-t sm:border border-slate-700 w-full sm:max-w-md p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                {lang === "tr" ? "Yatırma Yöntemi Seçin" : "Select Deposit Method"}
              </h3>
              <button
                onClick={() => setShowDeposit(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-3">
              {/* On-Chain Deposit */}
              <button
                onClick={() => {
                  setShowDeposit(false);
                  setShowOnChainDeposit(true);
                }}
                className="w-full p-4 rounded-xl border border-slate-700 hover:border-slate-600 hover:bg-slate-800/50 transition-all text-left flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-semibold mb-1">On-Chain Deposit</h4>
                  <p className="text-sm text-slate-400">
                    {lang === "tr" 
                      ? "Diğer borsalardan/cüzdanlardan kripto yatırın" 
                      : "Deposit crypto from other exchanges/wallets"}
                  </p>
                </div>
                <svg className="w-5 h-5 text-slate-500 flex-shrink-0 mt-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Deposit Fiat - USD */}
              <button
                onClick={() => {
                  setShowDeposit(false);
                  setShowUsdDeposit(true);
                }}
                className="w-full p-4 rounded-xl border border-green-500/30 hover:border-green-500/50 hover:bg-green-500/5 transition-all text-left flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-green-400 font-bold text-lg">$</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-semibold mb-1">
                    {lang === "tr" ? "USD Yatır" : "Deposit USD"}
                  </h4>
                  <p className="text-sm text-slate-400">
                    {lang === "tr" 
                      ? "Kredi kartı ile USD yatırın (MoonPay)" 
                      : "Deposit USD via credit card (MoonPay)"}
                  </p>
                </div>
                <svg className="w-5 h-5 text-slate-500 flex-shrink-0 mt-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* On-Chain Deposit - Select Coin Modal */}
      {showOnChainDeposit && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-sm">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white">
                {lang === "tr" ? "Yatırılacak Coin Seç" : "Select Coin to Deposit"}
              </h2>
              <button onClick={() => setShowOnChainDeposit(false)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 text-xl">✕</button>
            </div>
            {/* Coin List */}
            <div className="p-4 space-y-2">
              {[{ id: "BTC", name: "Bitcoin", icon: "₿", color: "#F7931A" },
                { id: "ETH", name: "Ethereum", icon: "Ξ", color: "#627EEA" },
                { id: "XRP", name: "Ripple", icon: "✕", color: "#23292F" },
                { id: "SOL", name: "Solana", icon: "◎", color: "#9945FF" },
                { id: "USDT", name: "Tether", icon: "₮", color: "#26A17B" }].map((coin) => (
                <button
                  key={coin.id}
                  onClick={() => { setShowOnChainDeposit(false); setSelectedDepositCoin(coin.id); }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-slate-500 transition-all"
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: coin.color }}>
                    {coin.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-white font-semibold">{coin.id}</div>
                    <div className="text-sm text-slate-400">{coin.name}</div>
                  </div>
                  <span className="text-slate-500">→</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransfer && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                {lang === "tr" ? "Gönder" : "Transfer"}
              </h3>
              <button
                onClick={() => setShowTransfer(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Token Selection with Icons */}
            <div className="mb-4">
              <label className="text-sm text-slate-400 mb-2 block">{lang === "tr" ? "Token" : "Token"}</label>
              <div className="relative">
                <select className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white appearance-none pl-12">
                  <option value="AUXG">AUXG - {lang === "tr" ? "Altın" : "Gold"}</option>
                  <option value="AUXS">AUXS - {lang === "tr" ? "Gümüş" : "Silver"}</option>
                  <option value="AUXPT">AUXPT - {lang === "tr" ? "Platin" : "Platinum"}</option>
                  <option value="AUXPD">AUXPD - {lang === "tr" ? "Paladyum" : "Palladium"}</option>
                  <option value="ETH">ETH - Ethereum</option>
                  <option value="BTC">BTC - Bitcoin</option>
                  <option value="XRP">XRP - Ripple</option>
                  <option value="SOL">SOL - Solana</option>
                  <option value="USDT">USDT - Tether</option>
                </select>
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <img src="/gold-favicon-32x32.png" alt="" className="w-6 h-6" />
                </div>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Recipient Address */}
            <div className="mb-4">
              <label className="text-sm text-slate-400 mb-2 block">{lang === "tr" ? "Alıcı Adresi" : "Recipient Address"}</label>
              <input
                type="text"
                placeholder="0x..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500"
              />
            </div>

            {/* Amount */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-slate-400">{lang === "tr" ? "Miktar" : "Amount"}</label>
                <span className="text-xs text-slate-500">{lang === "tr" ? "Bakiye" : "Balance"}: {auxgBalance.toFixed(2)} AUXG</span>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    placeholder="0.00"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500"
                  />
                </div>
                <button className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-emerald-500 font-medium hover:bg-slate-700 transition-colors">
                  MAX
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">≈ $0.00 USD</p>
            </div>

            {/* Fee Info */}
            <div className="bg-slate-800/50 rounded-xl p-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">{lang === "tr" ? "Ağ Ücreti" : "Network Fee"}</span>
                <span className="text-slate-300">~$0.50</span>
              </div>
            </div>

            <button className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-colors flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              {lang === "tr" ? "Gönder" : "Send"}
            </button>
          </div>
        </div>
      )}

      {/* Receive Modal */}
      {showReceive && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                {lang === "tr" ? "Al" : "Receive"}
              </h3>
              <button
                onClick={() => setShowReceive(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-slate-400 mb-4">
              {lang === "tr" 
                ? "Bu adresi paylaşarak token alabilirsiniz." 
                : "Share this address to receive tokens."}
            </p>

            {/* Token Selection with Icons */}
            <div className="mb-4">
              <label className="text-sm text-slate-400 mb-2 block">{lang === "tr" ? "Token Seç" : "Select Token"}</label>
              <div className="grid grid-cols-4 gap-2">
                <button className="flex flex-col items-center gap-1 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500 transition-all">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                    <span className="text-xs text-white">All</span>
                  </div>
                  <span className="text-xs text-slate-300">{lang === "tr" ? "Tümü" : "All"}</span>
                </button>
                <button className="flex flex-col items-center gap-1 p-3 rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-600 transition-all">
                  <img src="/gold-favicon-32x32.png" alt="AUXG" className="w-8 h-8" />
                  <span className="text-xs text-slate-300">AUXG</span>
                </button>
                <button className="flex flex-col items-center gap-1 p-3 rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-600 transition-all">
                  <div className="w-8 h-8 rounded-full bg-[#627EEA] flex items-center justify-center">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
                      <path d="M12 1.5l-6.5 11L12 17l6.5-4.5L12 1.5z"/>
                    </svg>
                  </div>
                  <span className="text-xs text-slate-300">ETH</span>
                </button>
                <button className="flex flex-col items-center gap-1 p-3 rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-600 transition-all">
                  <div className="w-8 h-8 rounded-full bg-[#F7931A] flex items-center justify-center">
                    <span className="text-white text-sm font-bold">₿</span>
                  </div>
                  <span className="text-xs text-slate-300">BTC</span>
                </button>
              </div>
            </div>

            {/* QR Code */}
            <div className="bg-white p-4 rounded-xl mb-4 flex items-center justify-center">
              <div className="w-40 h-40 bg-slate-100 rounded-lg flex items-center justify-center">
                <svg className="w-32 h-32" viewBox="0 0 100 100" fill="none">
                  <rect x="10" y="10" width="25" height="25" fill="#000"/>
                  <rect x="65" y="10" width="25" height="25" fill="#000"/>
                  <rect x="10" y="65" width="25" height="25" fill="#000"/>
                  <rect x="15" y="15" width="15" height="15" fill="#fff"/>
                  <rect x="70" y="15" width="15" height="15" fill="#fff"/>
                  <rect x="15" y="70" width="15" height="15" fill="#fff"/>
                  <rect x="20" y="20" width="5" height="5" fill="#000"/>
                  <rect x="75" y="20" width="5" height="5" fill="#000"/>
                  <rect x="20" y="75" width="5" height="5" fill="#000"/>
                  <rect x="45" y="45" width="10" height="10" fill="#000"/>
                  <rect x="65" y="65" width="25" height="25" fill="#000"/>
                  <rect x="70" y="70" width="15" height="15" fill="#fff"/>
                  <rect x="75" y="75" width="5" height="5" fill="#000"/>
                </svg>
              </div>
            </div>

            {/* Address */}
            <div className="bg-slate-800 rounded-xl p-4 mb-4">
              <p className="text-xs text-slate-500 mb-1">{lang === "tr" ? "Cüzdan Adresi" : "Wallet Address"}</p>
              <p className="text-sm text-slate-200 font-mono break-all">{currentAddress || "0xe6df1234567890abcdef1234567890abcdef3ba3"}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigator.clipboard.writeText(currentAddress || "0xe6df1234567890abcdef1234567890abcdef3ba3")}
                className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-medium transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {lang === "tr" ? "Kopyala" : "Copy"}
              </button>
              <button className="py-3 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-semibold transition-colors flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                {lang === "tr" ? "Paylaş" : "Share"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deposit Address Modal */}
      {selectedDepositCoin && (
        <DepositAddressModal
          isOpen={!!selectedDepositCoin}
          onClose={() => setSelectedDepositCoin(null)}
          coin={selectedDepositCoin}
          lang={lang}
        />
      )}

      {/* Withdraw Modal */}
      {showWithdraw && (
        <WithdrawModal
          isOpen={showWithdraw}
          onClose={() => setShowWithdraw(false)}
          lang={lang}
        />
      )}

      {/* USD Deposit Modal */}
      {showUsdDeposit && (
        <UsdDepositModal
          isOpen={showUsdDeposit}
          onClose={() => setShowUsdDeposit(false)}
          lang={lang}
          walletAddress={currentAddress || ""}
        />
      )}

      {/* Buy with USD Modal */}
      {showBuyWithUsd && (
        <BuyWithUsdModal
          isOpen={showBuyWithUsd}
          onClose={() => setShowBuyWithUsd(false)}
          lang={lang}
          walletAddress={currentAddress || ""}
        />
      )}

      {/* USD Convert Modal */}
      {showUsdConvert && (
        <UsdConvertModal
          isOpen={showUsdConvert}
          onClose={() => setShowUsdConvert(false)}
          lang={lang}
          walletAddress={currentAddress || ""}
        />
      )}

      {/* Security Settings Modal */}
      {showSecurity && (
        <SecuritySettings
          walletAddress={currentAddress || ""}
          lang={lang}
          onClose={() => setShowSecurity(false)}
        />
      )}

      {/* Advanced Security Modal */}
      {showAdvancedSecurity && (
        <AdvancedSecurityModal
          walletAddress={currentAddress || ""}
          lang={lang}
          onClose={() => setShowAdvancedSecurity(false)}
        />
      )}

      {/* Price Alerts Modal */}
      {showPriceAlerts && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">
                {lang === "tr" ? "Fiyat Uyarıları" : "Price Alerts"}
              </h3>
              <button onClick={() => setShowPriceAlerts(false)} className="p-2 hover:bg-slate-800 rounded-lg">
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
              <PriceAlertManager walletAddress={currentAddress || ""} lang={lang} currentPrices={currentPrices} />
            </div>
          </div>
        </div>
      )}

      {/* Recurring Buy Modal */}
      {showRecurringBuy && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">
                {lang === "tr" ? "Otomatik Alım (DCA)" : "Auto Buy (DCA)"}
              </h3>
              <button onClick={() => setShowRecurringBuy(false)} className="p-2 hover:bg-slate-800 rounded-lg">
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
              <RecurringBuyManager walletAddress={currentAddress || ""} lang={lang} usdBalance={usdBalance} usdtBalance={usdtBalance} />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
