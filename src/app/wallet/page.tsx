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
import { CryptoConvertModal } from "@/components/CryptoConvertModal";
import { MetalConvertModal } from "@/components/MetalConvertModal";
import { WithdrawModal } from "@/components/WithdrawModal";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { useMetalsPrices } from "@/hooks/useMetalsPrices";

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
  
  // New modal states for portfolio clicks
  const [selectedMetal, setSelectedMetal] = useState<"AUXG" | "AUXS" | "AUXPT" | "AUXPD" | null>(null);
  const [selectedCrypto, setSelectedCrypto] = useState<"ETH" | "BTC" | "XRP" | "SOL" | null>(null);
  
  // Get prices for modals
  const { prices: cryptoPrices } = useCryptoPrices();
  const { prices: metalAskPrices, bidPrices } = useMetalsPrices();
  
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
                  $138,456.78
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

            {/* AUXM Balance Card */}
            <div className="rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center">
                    <span className="text-white text-xl font-bold">◈</span>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">AUXM Balance</p>
                    <p className="text-2xl font-bold text-white">1,250.50 <span className="text-purple-400 text-lg">AUXM</span></p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-purple-400">🎁 Bonus AUXM</p>
                  <p className="text-lg font-semibold text-purple-400">+25.00 AUXM</p>
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
                  <p className="text-lg font-bold text-yellow-500">10.5g</p>
                  <p className="text-xs text-slate-400">≈ $1,458.45</p>
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
                  <p className="text-lg font-bold text-gray-300">250g</p>
                  <p className="text-xs text-slate-400">≈ $482.50</p>
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
                  <p className="text-lg font-bold text-cyan-300">5g</p>
                  <p className="text-xs text-slate-400">≈ $274.25</p>
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
                  <p className="text-lg font-bold text-orange-400">2g</p>
                  <p className="text-xs text-slate-400">≈ $94.18</p>
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
                  <p className="text-lg font-bold text-[#627EEA]">0.5 ETH</p>
                  <p className="text-xs text-slate-400">≈ $1,825.00</p>
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
                  <p className="text-lg font-bold text-[#F7931A]">0.001 BTC</p>
                  <p className="text-xs text-slate-400">≈ $97.50</p>
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
                  <p className="text-lg font-bold text-slate-300">1,000 XRP</p>
                  <p className="text-xs text-slate-400">≈ $2,450.00</p>
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
                  <p className="text-lg font-bold text-[#9945FF]">10 SOL</p>
                  <p className="text-xs text-slate-400">≈ $2,350.00</p>
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

      {/* Metal Dönüştür Modal (from Portfolio click) */}
      {selectedMetal && (
        <MetalConvertModal 
          isOpen={!!selectedMetal}
          onClose={() => setSelectedMetal(null)}
          metal={selectedMetal}
          lang={lang}
          metalBalances={{ 
            AUXG: 0, 
            AUXS: 0, 
            AUXPT: 0, 
            AUXPD: 0 
          }}
          cryptoBalances={{ ETH: 0, BTC: 0, XRP: 0, SOL: 0 }}
          auxmBalance={5000}
          metalPrices={{
            AUXG: { ask: metalAskPrices?.AUXG || 139.04, bid: bidPrices?.AUXG || 134.69 },
            AUXS: { ask: metalAskPrices?.AUXS || 1.93, bid: bidPrices?.AUXS || 1.82 },
            AUXPT: { ask: metalAskPrices?.AUXPT || 54.85, bid: bidPrices?.AUXPT || 52.92 },
            AUXPD: { ask: metalAskPrices?.AUXPD || 47.09, bid: bidPrices?.AUXPD || 45.57 },
          }}
          cryptoPrices={{
            ETH: cryptoPrices?.eth || 3650,
            BTC: cryptoPrices?.btc || 97500,
            XRP: cryptoPrices?.xrp || 2.20,
            SOL: cryptoPrices?.sol || 235,
          }}
        />
      )}

      {/* Crypto Dönüştür Modal (from Portfolio click) */}
      {selectedCrypto && (
        <CryptoConvertModal
          isOpen={!!selectedCrypto}
          onClose={() => setSelectedCrypto(null)}
          crypto={selectedCrypto}
          lang={lang}
          cryptoBalances={{ ETH: 0, BTC: 0, XRP: 0, SOL: 0 }}
          cryptoPrices={{
            ETH: cryptoPrices?.eth || 3650,
            BTC: cryptoPrices?.btc || 97500,
            XRP: cryptoPrices?.xrp || 2.20,
            SOL: cryptoPrices?.sol || 235,
          }}
          metalBidPrices={{
            AUXG: bidPrices?.AUXG || 134.69,
            AUXS: bidPrices?.AUXS || 1.82,
            AUXPT: bidPrices?.AUXPT || 52.92,
            AUXPD: bidPrices?.AUXPD || 45.57,
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

              {/* Deposit Fiat */}
              <button
                onClick={() => {
                  setShowDeposit(false);
                  setShowFiatDeposit(true);
                }}
                className="w-full p-4 rounded-xl border border-slate-700 hover:border-slate-600 hover:bg-slate-800/50 transition-all text-left flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-semibold mb-1">
                    {lang === "tr" ? "Fiat Yatır" : "Deposit Fiat"}
                  </h4>
                  <p className="text-sm text-slate-400">
                    {lang === "tr" 
                      ? "Kredi kartı, Apple/Google Pay ile USD/TRY yatırın" 
                      : "Deposit USD/TRY via card, Apple/Google Pay"}
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

      {/* Fiat Deposit Modal */}
      {showFiatDeposit && (
        <div className="fixed inset-0 bg-black/90 flex flex-col z-50">
          {/* Header */}
          <div className="flex items-center gap-4 p-4 border-b border-slate-800">
            <button
              onClick={() => setShowFiatDeposit(false)}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {lang === "tr" ? "Fiat Yatır" : "Deposit Fiat"}
              </h2>
              <p className="text-xs text-slate-400">
                {lang === "tr" ? "USD veya TRY yatırın" : "Deposit USD or TRY"}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="max-w-md mx-auto space-y-4">

              {/* MoonPay */}
              <button
                onClick={() => {
                  // TODO: MoonPay entegrasyonu
                  alert(lang === "tr" ? "MoonPay yakında aktif olacak" : "MoonPay coming soon");
                }}
                className="w-full p-4 rounded-xl border border-slate-700 hover:border-purple-500/50 hover:bg-slate-800/50 transition-all text-left flex items-start gap-4 group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-white font-semibold">MoonPay</h4>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                      {lang === "tr" ? "Anında" : "Instant"}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mb-2">
                    {lang === "tr" 
                      ? "Kart, Apple Pay veya Google Pay ile anında yatırın" 
                      : "Instant deposit via Card, Apple Pay or Google Pay"}
                  </p>
                  <div className="flex items-center gap-2 mb-2">
                    {/* Payment method icons */}
                    <div className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800/50 border border-slate-700">
                      <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
                      </svg>
                      <span className="text-xs text-slate-400">{lang === "tr" ? "Kart" : "Card"}</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800/50 border border-slate-700">
                      <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.05 11.97c-.03-2.76 2.25-4.08 2.35-4.15-1.28-1.87-3.27-2.13-3.98-2.16-1.69-.17-3.31 1-4.17 1-.86 0-2.18-.98-3.59-.95-1.84.03-3.55 1.08-4.5 2.73-1.93 3.34-.49 8.28 1.38 10.99.92 1.33 2.01 2.82 3.44 2.77 1.38-.05 1.91-.9 3.58-.9 1.67 0 2.15.9 3.61.87 1.49-.03 2.43-1.35 3.34-2.69 1.05-1.54 1.48-3.04 1.51-3.12-.03-.02-2.89-1.11-2.92-4.39h-.05z"/>
                      </svg>
                      <span className="text-xs text-slate-400">Apple Pay</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800/50 border border-slate-700">
                      <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                      </svg>
                      <span className="text-xs text-slate-400">Google Pay</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-500">
                      {lang === "tr" ? "Min: $30" : "Min: $30"}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-500">
                      {lang === "tr" ? "Anında" : "Instant"}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-amber-500">
                      {lang === "tr" ? "%3.5 komisyon" : "3.5% fee"}
                    </span>
                  </div>
                </div>
                <svg className="w-5 h-5 text-slate-500 group-hover:text-purple-400 flex-shrink-0 mt-3 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Info Notice */}
              <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h5 className="text-sm font-medium text-slate-300 mb-1">
                      {lang === "tr" ? "Güvenli Yatırım" : "Secure Deposit"}
                    </h5>
                    <p className="text-xs text-slate-500">
                      {lang === "tr" 
                        ? "Tüm işlemler SSL ile şifrelenir ve düzenleyici standartlara uygundur." 
                        : "All transactions are SSL encrypted and comply with regulatory standards."}
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* On-Chain Deposit - Select Coin Modal */}
      {showOnChainDeposit && (
        <div className="fixed inset-0 bg-black/90 flex flex-col z-50">
          {/* Header */}
          <div className="flex items-center gap-4 p-4 border-b border-slate-800">
            <button
              onClick={() => setShowOnChainDeposit(false)}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-xl font-bold text-white flex-1 text-center pr-10">
              {lang === "tr" ? "Coin Seç" : "Select Coin"}
            </h2>
          </div>

          {/* Search */}
          <div className="p-4">
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={lang === "tr" ? "Coin Ara" : "Search Coins"}
                value={depositSearchQuery}
                onChange={(e) => setDepositSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-slate-600"
              />
            </div>
          </div>

          {/* Trending Section */}
          <div className="px-4 pb-2">
            <h3 className="text-sm font-semibold text-slate-400 mb-3">
              {lang === "tr" ? "Popüler" : "Trending"}
            </h3>
          </div>

          {/* Coin List */}
          <div className="flex-1 overflow-y-auto px-4">
            <div className="space-y-1">
              {filteredDepositCoins.map((coin) => (
                <button
                  key={coin.id}
                  onClick={() => {
                    setShowOnChainDeposit(false);
                    // TODO: Seçilen coin için adres göster
                    alert(`${coin.name} (${coin.id}) ${lang === "tr" ? "deposit adresi yakında" : "deposit address coming soon"}`);
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-slate-800/70 transition-all"
                >
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: coin.color }}
                  >
                    {coin.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-white font-semibold">{coin.id}</div>
                    <div className="text-sm text-slate-400">{coin.name}</div>
                  </div>
                  <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          {/* Alphabet Index (right side) */}
          <div className="fixed right-2 top-1/2 -translate-y-1/2 flex flex-col items-center text-xs text-slate-500 gap-0.5">
            {['0', '1', '2', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X'].map((letter) => (
              <span key={letter} className="hover:text-white cursor-pointer">{letter}</span>
            ))}
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
                <span className="text-xs text-slate-500">{lang === "tr" ? "Bakiye" : "Balance"}: 998,953.91 AUXG</span>
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
                onClick={() => {
                  navigator.clipboard.writeText(currentAddress || "0xe6df1234567890abcdef1234567890abcdef3ba3");
                }}
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

      {/* Withdraw Modal */}
      {showWithdraw && (
        <WithdrawModal
          isOpen={showWithdraw}
          onClose={() => setShowWithdraw(false)}
          lang={lang}
          auxmBalance={{ auxm: 1250.50, bonusAuxm: 25.00 }}
          cryptoPrices={{
            BTC: cryptoPrices?.btc || 97500,
            ETH: cryptoPrices?.eth || 3650,
            XRP: cryptoPrices?.xrp || 2.45,
            SOL: cryptoPrices?.sol || 235,
            USDT: 1,
          }}
        />
      )}
    </main>
  );
}