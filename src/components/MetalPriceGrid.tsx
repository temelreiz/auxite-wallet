"use client";
import { useState } from "react";
import Link from "next/link";
import { useMetalsPrices } from "@/hooks/useMetalsPrices";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import MetalPriceCard from "./MetalPriceCard";
import { ExchangeModal } from "./ExchangeModal";

interface MetalPriceGridProps {
  lang?: "tr" | "en";
}

// Metal icon mapping
const metalIcons: Record<string, string> = {
  AUXG: "/gold-favicon-32x32.png",
  AUXS: "/silver-favicon-32x32.png",
  AUXPT: "/platinum-favicon-32x32.png",
  AUXPD: "/palladium-favicon-32x32.png",
};

const metals = [
  {
    id: "gold" as const,
    symbol: "AUXG",
    priceKey: "AUXG",
    icon: metalIcons.AUXG,
  },
  {
    id: "silver" as const,
    symbol: "AUXS",
    priceKey: "AUXS",
    icon: metalIcons.AUXS,
  },
  {
    id: "platinum" as const,
    symbol: "AUXPT",
    priceKey: "AUXPT",
    icon: metalIcons.AUXPT,
  },
  {
    id: "palladium" as const,
    symbol: "AUXPD",
    priceKey: "AUXPD",
    icon: metalIcons.AUXPD,
  },
];

export default function MetalPriceGrid({ lang = "en" }: MetalPriceGridProps) {
  const { prices, bidPrices, directions, changes, loading } = useMetalsPrices();
  const { prices: cryptoPrices, changes: cryptoChanges, loading: cryptoLoading } = useCryptoPrices();
  const [showExchange, setShowExchange] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showReceive, setShowReceive] = useState(false);
  const [showCryptoDetail, setShowCryptoDetail] = useState<"ETH" | "BTC" | null>(null);

  // Demo wallet address
  const walletAddress = "0xe6df...3ba3";

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 animate-pulse"
          >
            <div className="h-32"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-200">
            {lang === "tr" ? "Fiyatlar" : "Prices"}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {lang === "tr"
              ? "Canlı metal ve kripto fiyatları"
              : "Live metal and crypto prices"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span>{lang === "tr" ? "Canlı" : "Live"}</span>
          </div>
        </div>
      </div>

      {/* Metal Price Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metals.map((metal) => {
          const priceData = prices[metal.priceKey];
          const bidPrice = bidPrices[metal.priceKey];
          const direction = directions[metal.priceKey];
          const change = changes[metal.priceKey];

          if (!priceData || typeof priceData !== "number") {
            return null;
          }

          const metalName = lang === "tr" 
            ? `Auxite ${metal.priceKey === "AUXG" ? "Altın" : metal.priceKey === "AUXS" ? "Gümüş" : metal.priceKey === "AUXPT" ? "Platin" : "Paladyum"}`
            : `Auxite ${metal.priceKey === "AUXG" ? "Gold" : metal.priceKey === "AUXS" ? "Silver" : metal.priceKey === "AUXPT" ? "Platinum" : "Palladium"}`;

          return (
            <MetalPriceCard
              key={metal.id}
              metalId={metal.symbol}
              symbol={metal.symbol}
              name={metalName}
              pricePerGram={priceData}
              pricePerKg={priceData * 1000}
              change24h={change || 0}
              bidPrice={bidPrice}
              direction={direction || "neutral"}
              icon={metal.icon}
              lang={lang}
            />
          );
        })}
      </div>

      {/* Crypto Price Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* ETH */}
        <div 
          className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 hover:border-slate-600 cursor-pointer transition-all"
          onClick={() => setShowCryptoDetail("ETH")}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#627EEA] flex items-center justify-center">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="white">
                  <path d="M12 1.5l-6.5 11L12 17l6.5-4.5L12 1.5z"/>
                  <path d="M12 18.5l-6.5-4.5L12 22.5l6.5-8.5L12 18.5z" fillOpacity="0.6"/>
                </svg>
              </div>
              <span className="text-sm font-medium text-slate-200">ETH</span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded ${
              cryptoChanges.eth >= 0 
                ? "bg-emerald-500/20 text-emerald-400" 
                : "bg-red-500/20 text-red-400"
            }`}>
              {cryptoChanges.eth >= 0 ? "↑" : "↓"} {Math.abs(cryptoChanges.eth).toFixed(2)}%
            </span>
          </div>
          <div className="text-xs text-slate-500 mb-1">Ethereum</div>
          <div className="text-xl font-bold text-slate-100 font-mono mb-3">
            ${cryptoPrices.eth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold transition-all">
              {lang === "tr" ? "Al" : "Buy"}
            </button>
            <button className="px-3 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white text-xs font-semibold transition-all">
              {lang === "tr" ? "Sat" : "Sell"}
            </button>
          </div>
        </div>

        {/* BTC */}
        <div 
          className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 hover:border-slate-600 cursor-pointer transition-all"
          onClick={() => setShowCryptoDetail("BTC")}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#F7931A] flex items-center justify-center">
                <span className="text-white text-xs font-bold">₿</span>
              </div>
              <span className="text-sm font-medium text-slate-200">BTC</span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded ${
              cryptoChanges.btc >= 0 
                ? "bg-emerald-500/20 text-emerald-400" 
                : "bg-red-500/20 text-red-400"
            }`}>
              {cryptoChanges.btc >= 0 ? "↑" : "↓"} {Math.abs(cryptoChanges.btc).toFixed(2)}%
            </span>
          </div>
          <div className="text-xs text-slate-500 mb-1">Bitcoin</div>
          <div className="text-xl font-bold text-slate-100 font-mono mb-3">
            ${cryptoPrices.btc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold transition-all">
              {lang === "tr" ? "Al" : "Buy"}
            </button>
            <button className="px-3 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white text-xs font-semibold transition-all">
              {lang === "tr" ? "Sat" : "Sell"}
            </button>
          </div>
        </div>

        {/* USDT */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#26A17B] flex items-center justify-center">
                <span className="text-white text-xs font-bold">$</span>
              </div>
              <span className="text-sm font-medium text-slate-200">USDT</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-500/20 text-slate-400">
              ~ 0.00%
            </span>
          </div>
          <div className="text-xs text-slate-500 mb-1">Tether</div>
          <div className="text-xl font-bold text-slate-100 font-mono mb-3">
            $1.00
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold transition-all">
              {lang === "tr" ? "Al" : "Buy"}
            </button>
            <button className="px-3 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white text-xs font-semibold transition-all">
              {lang === "tr" ? "Sat" : "Sell"}
            </button>
          </div>
        </div>

        {/* TRY */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#E30A17] flex items-center justify-center">
                <span className="text-white text-xs font-bold">₺</span>
              </div>
              <span className="text-sm font-medium text-slate-200">TRY</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400">
              ↓ 0.00%
            </span>
          </div>
          <div className="text-xs text-slate-500 mb-1">Turkish Lira</div>
          <div className="text-xl font-bold text-slate-100 font-mono mb-3">
            ₺{cryptoPrices.try.toFixed(2)}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold transition-all">
              {lang === "tr" ? "Al" : "Buy"}
            </button>
            <button className="px-3 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white text-xs font-semibold transition-all">
              {lang === "tr" ? "Sat" : "Sell"}
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="grid grid-cols-5 gap-3">
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

        {/* Al / Receive */}
        <button
          onClick={() => setShowReceive(true)}
          className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-purple-500 transition-all group"
        >
          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
            <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
            {lang === "tr" ? "Al" : "Receive"}
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

        {/* Tahsis Et / Allocate - Link to Leasing */}
        <Link
          href="/leasing"
          className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-500 transition-all group"
        >
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/30 transition-colors">
            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
            {lang === "tr" ? "Tahsis Et" : "Allocate"}
          </span>
        </Link>
      </div>

      {/* Ecosystem Description */}
      <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700">
        <p className="text-sm text-slate-300 leading-relaxed">
          {lang === "tr"
            ? "Auxite ekosistemindeki tüm tokenlar, temsil ettikleri metal türüne karşılık gelen fiziksel değer üzerine yapılandırılmıştır; ilgili varlıklar, dünya genelindeki yetkili ve denetimli depolama tesisleri üzerinden muhafaza edilir."
            : "All tokens in the Auxite ecosystem are structured on physical value corresponding to the metal type they represent; related assets are stored through authorized and audited storage facilities worldwide."}
        </p>
      </div>

      {/* Exchange Modal */}
      {showExchange && (
        <ExchangeModal 
          isOpen={showExchange}
          onClose={() => setShowExchange(false)}
          lang={lang}
        />
      )}

      {/* Deposit Modal */}
      {showDeposit && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                {lang === "tr" ? "Yatır" : "Add Funds"}
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
            
            <p className="text-sm text-slate-400 mb-4">
              {lang === "tr" 
                ? "Aşağıdaki adrese kripto para göndererek bakiye yükleyebilirsiniz." 
                : "Send cryptocurrency to the address below to add funds."}
            </p>

            {/* QR Code Placeholder */}
            <div className="bg-white p-4 rounded-xl mb-4 flex items-center justify-center">
              <div className="w-40 h-40 bg-slate-200 rounded-lg flex items-center justify-center">
                <svg className="w-20 h-20 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
            </div>

            {/* Address */}
            <div className="bg-slate-800 rounded-xl p-4 mb-4">
              <p className="text-xs text-slate-500 mb-1">{lang === "tr" ? "Cüzdan Adresi" : "Wallet Address"}</p>
              <p className="text-sm text-slate-200 font-mono break-all">0xe6df1234567890abcdef1234567890abcdef3ba3</p>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText("0xe6df1234567890abcdef1234567890abcdef3ba3");
              }}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-colors"
            >
              {lang === "tr" ? "Adresi Kopyala" : "Copy Address"}
            </button>
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
                  <option value="USDT">USDT - Tether</option>
                </select>
                {/* Token Icon */}
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <img src="/gold-favicon-32x32.png" alt="" className="w-6 h-6" />
                </div>
                {/* Dropdown Arrow */}
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
                {/* All Tokens */}
                <button className="flex flex-col items-center gap-1 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500 transition-all">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                    <span className="text-xs text-white">All</span>
                  </div>
                  <span className="text-xs text-slate-300">{lang === "tr" ? "Tümü" : "All"}</span>
                </button>
                {/* AUXG */}
                <button className="flex flex-col items-center gap-1 p-3 rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-600 transition-all">
                  <img src="/gold-favicon-32x32.png" alt="AUXG" className="w-8 h-8" />
                  <span className="text-xs text-slate-300">AUXG</span>
                </button>
                {/* ETH */}
                <button className="flex flex-col items-center gap-1 p-3 rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-600 transition-all">
                  <div className="w-8 h-8 rounded-full bg-[#627EEA] flex items-center justify-center">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
                      <path d="M12 1.5l-6.5 11L12 17l6.5-4.5L12 1.5z"/>
                      <path d="M12 18.5l-6.5-4.5L12 22.5l6.5-8.5L12 18.5z" fillOpacity="0.6"/>
                    </svg>
                  </div>
                  <span className="text-xs text-slate-300">ETH</span>
                </button>
                {/* BTC */}
                <button className="flex flex-col items-center gap-1 p-3 rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-600 transition-all">
                  <div className="w-8 h-8 rounded-full bg-[#F7931A] flex items-center justify-center">
                    <span className="text-white text-sm font-bold">₿</span>
                  </div>
                  <span className="text-xs text-slate-300">BTC</span>
                </button>
              </div>
              {/* Second Row */}
              <div className="grid grid-cols-4 gap-2 mt-2">
                {/* AUXS */}
                <button className="flex flex-col items-center gap-1 p-3 rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-600 transition-all">
                  <img src="/silver-favicon-32x32.png" alt="AUXS" className="w-8 h-8" />
                  <span className="text-xs text-slate-300">AUXS</span>
                </button>
                {/* AUXPT */}
                <button className="flex flex-col items-center gap-1 p-3 rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-600 transition-all">
                  <img src="/platinum-favicon-32x32.png" alt="AUXPT" className="w-8 h-8" />
                  <span className="text-xs text-slate-300">AUXPT</span>
                </button>
                {/* USDT */}
                <button className="flex flex-col items-center gap-1 p-3 rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-600 transition-all">
                  <div className="w-8 h-8 rounded-full bg-[#26A17B] flex items-center justify-center">
                    <span className="text-white text-sm font-bold">$</span>
                  </div>
                  <span className="text-xs text-slate-300">USDT</span>
                </button>
                {/* TRY */}
                <button className="flex flex-col items-center gap-1 p-3 rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-600 transition-all">
                  <div className="w-8 h-8 rounded-full bg-[#E30A17] flex items-center justify-center">
                    <span className="text-white text-sm font-bold">₺</span>
                  </div>
                  <span className="text-xs text-slate-300">TRY</span>
                </button>
              </div>
            </div>

            {/* QR Code */}
            <div className="bg-white p-4 rounded-xl mb-4 flex items-center justify-center">
              <div className="w-40 h-40 bg-slate-100 rounded-lg flex items-center justify-center">
                {/* Simple QR pattern */}
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
                  <rect x="40" y="10" width="5" height="5" fill="#000"/>
                  <rect x="50" y="10" width="5" height="5" fill="#000"/>
                  <rect x="40" y="20" width="5" height="5" fill="#000"/>
                  <rect x="45" y="25" width="5" height="5" fill="#000"/>
                  <rect x="40" y="40" width="5" height="5" fill="#000"/>
                  <rect x="45" y="45" width="10" height="10" fill="#000"/>
                  <rect x="60" y="40" width="5" height="5" fill="#000"/>
                  <rect x="40" y="60" width="5" height="5" fill="#000"/>
                  <rect x="50" y="65" width="5" height="5" fill="#000"/>
                  <rect x="60" y="60" width="5" height="5" fill="#000"/>
                  <rect x="65" y="65" width="25" height="25" fill="#000"/>
                  <rect x="70" y="70" width="15" height="15" fill="#fff"/>
                  <rect x="75" y="75" width="5" height="5" fill="#000"/>
                </svg>
              </div>
            </div>

            {/* Address */}
            <div className="bg-slate-800 rounded-xl p-4 mb-4">
              <p className="text-xs text-slate-500 mb-1">{lang === "tr" ? "Cüzdan Adresi" : "Wallet Address"}</p>
              <p className="text-sm text-slate-200 font-mono break-all">0xe6df1234567890abcdef1234567890abcdef3ba3</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText("0xe6df1234567890abcdef1234567890abcdef3ba3");
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

      {/* Crypto Detail Modal (ETH/BTC) */}
      {showCryptoDetail && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full ${showCryptoDetail === "ETH" ? "bg-[#627EEA]" : "bg-[#F7931A]"} flex items-center justify-center`}>
                  {showCryptoDetail === "ETH" ? (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
                      <path d="M12 1.5l-6.5 11L12 17l6.5-4.5L12 1.5z"/>
                      <path d="M12 18.5l-6.5-4.5L12 22.5l6.5-8.5L12 18.5z" fillOpacity="0.6"/>
                    </svg>
                  ) : (
                    <span className="text-white text-sm font-bold">₿</span>
                  )}
                </div>
                <span className="text-xl font-bold text-white">{showCryptoDetail}/USDT</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  (showCryptoDetail === "ETH" ? cryptoChanges.eth : cryptoChanges.btc) >= 0 
                    ? "bg-emerald-500/20 text-emerald-400" 
                    : "bg-red-500/20 text-red-400"
                }`}>
                  {(showCryptoDetail === "ETH" ? cryptoChanges.eth : cryptoChanges.btc) >= 0 ? "↑" : "↓"} 
                  {Math.abs(showCryptoDetail === "ETH" ? cryptoChanges.eth : cryptoChanges.btc).toFixed(2)}%
                </span>
              </div>
              <button
                onClick={() => setShowCryptoDetail(null)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-6 px-4 border-b border-slate-800">
              <button className="py-3 text-sm font-medium text-amber-400 border-b-2 border-amber-400">Price</button>
              <button className="py-3 text-sm font-medium text-slate-500 hover:text-slate-300">{lang === "tr" ? "Bilgiler" : "Info"}</button>
              <button className="py-3 text-sm font-medium text-slate-500 hover:text-slate-300">{lang === "tr" ? "İşlem Verileri" : "Trade Data"}</button>
            </div>

            {/* Price Info */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold text-white font-mono">
                      ${(showCryptoDetail === "ETH" ? cryptoPrices.eth : cryptoPrices.btc).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                      LIVE
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    ₺{((showCryptoDetail === "ETH" ? cryptoPrices.eth : cryptoPrices.btc) * cryptoPrices.try).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <div className="flex justify-between gap-8 text-slate-400">
                    <span>24h High</span>
                    <span className="text-emerald-400 font-mono">
                      ${((showCryptoDetail === "ETH" ? cryptoPrices.eth : cryptoPrices.btc) * 1.02).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between gap-8 text-slate-400 mt-1">
                    <span>24h Low</span>
                    <span className="text-red-400 font-mono">
                      ${((showCryptoDetail === "ETH" ? cryptoPrices.eth : cryptoPrices.btc) * 0.98).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between gap-8 text-slate-400 mt-1">
                    <span>24h Vol</span>
                    <span className="text-slate-300 font-mono">
                      ${showCryptoDetail === "ETH" ? "12.5B" : "45.2B"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Time Frame Selector */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
                  <button className="px-3 py-1 text-xs text-slate-400 hover:text-white rounded">15m</button>
                  <button className="px-3 py-1 text-xs text-slate-400 hover:text-white rounded">1h</button>
                  <button className="px-3 py-1 text-xs bg-slate-700 text-white rounded">4h</button>
                  <button className="px-3 py-1 text-xs text-slate-400 hover:text-white rounded">1D</button>
                  <button className="px-3 py-1 text-xs text-slate-400 hover:text-white rounded">1W</button>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-1.5 bg-slate-800 rounded hover:bg-slate-700">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                    </svg>
                  </button>
                  <span className="text-xs text-slate-400">1.0x</span>
                  <button className="p-1.5 bg-slate-800 rounded hover:bg-slate-700">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Chart Area */}
              <div className="h-64 bg-slate-800/50 rounded-xl mb-4 relative overflow-hidden">
                {/* Price Line Chart Simulation */}
                <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
                  {/* Grid lines */}
                  <line x1="0" y1="50" x2="400" y2="50" stroke="#334155" strokeWidth="0.5" strokeDasharray="4"/>
                  <line x1="0" y1="100" x2="400" y2="100" stroke="#334155" strokeWidth="0.5" strokeDasharray="4"/>
                  <line x1="0" y1="150" x2="400" y2="150" stroke="#334155" strokeWidth="0.5" strokeDasharray="4"/>
                  
                  {/* Price line */}
                  <path 
                    d="M0,150 L20,145 L40,140 L60,142 L80,135 L100,130 L120,125 L140,120 L160,115 L180,110 L200,100 L220,95 L240,90 L260,85 L280,75 L300,70 L320,65 L340,60 L360,55 L380,50 L400,45" 
                    fill="none" 
                    stroke={showCryptoDetail === "ETH" ? "#627EEA" : "#F7931A"} 
                    strokeWidth="2"
                  />
                  
                  {/* Area fill */}
                  <path 
                    d="M0,150 L20,145 L40,140 L60,142 L80,135 L100,130 L120,125 L140,120 L160,115 L180,110 L200,100 L220,95 L240,90 L260,85 L280,75 L300,70 L320,65 L340,60 L360,55 L380,50 L400,45 L400,200 L0,200 Z" 
                    fill={`url(#gradient-${showCryptoDetail})`} 
                    opacity="0.3"
                  />
                  
                  <defs>
                    <linearGradient id="gradient-ETH" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#627EEA"/>
                      <stop offset="100%" stopColor="#627EEA" stopOpacity="0"/>
                    </linearGradient>
                    <linearGradient id="gradient-BTC" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F7931A"/>
                      <stop offset="100%" stopColor="#F7931A" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                </svg>
                
                {/* Current Price Indicator */}
                <div className="absolute right-0 top-[20%] transform translate-x-1/2">
                  <div className={`px-2 py-1 rounded text-xs font-mono text-white ${showCryptoDetail === "ETH" ? "bg-[#627EEA]" : "bg-[#F7931A]"}`}>
                    ${(showCryptoDetail === "ETH" ? cryptoPrices.eth : cryptoPrices.btc).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Indicators */}
              <div className="flex gap-2 mb-4">
                <div className="text-xs text-slate-500">Overlay:</div>
                <button className="px-2 py-1 text-xs bg-slate-800 border border-emerald-500 text-emerald-400 rounded">MA</button>
                <button className="px-2 py-1 text-xs bg-slate-800 border border-slate-700 text-slate-400 rounded hover:border-slate-600">EMA</button>
                <button className="px-2 py-1 text-xs bg-slate-800 border border-slate-700 text-slate-400 rounded hover:border-slate-600">BOLL</button>
              </div>

              {/* Period Returns */}
              <div className="grid grid-cols-6 gap-2 mb-6">
                <div className="text-center">
                  <div className="text-xs text-slate-500 mb-1">{lang === "tr" ? "Bugün" : "Today"}</div>
                  <div className="text-sm text-emerald-400">+2.34%</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-500 mb-1">7 {lang === "tr" ? "Gün" : "Day"}</div>
                  <div className="text-sm text-emerald-400">+5.67%</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-500 mb-1">30 {lang === "tr" ? "Gün" : "Day"}</div>
                  <div className="text-sm text-red-400">-1.23%</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-500 mb-1">90 {lang === "tr" ? "Gün" : "Day"}</div>
                  <div className="text-sm text-emerald-400">+12.45%</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-500 mb-1">180 {lang === "tr" ? "Gün" : "Day"}</div>
                  <div className="text-sm text-emerald-400">+25.89%</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-500 mb-1">1 {lang === "tr" ? "Yıl" : "Year"}</div>
                  <div className="text-sm text-emerald-400">+89.12%</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <button className="py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-colors">
                  {lang === "tr" ? "Al" : "Buy"}
                </button>
                <button className="py-4 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition-colors">
                  {lang === "tr" ? "Sat" : "Sell"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}