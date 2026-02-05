"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import AdvancedChart from "@/components/AdvancedChart";
import { AddFundsModal } from "@/components/AddFundsModal";
import { useAccount } from "wagmi";

type AssetType = "metals" | "crypto";
type MetalSymbol = "AUXG" | "AUXS" | "AUXPT" | "AUXPD";
type CryptoSymbol = "BTC" | "ETH" | "SOL" | "XRP";

interface Asset {
  symbol: string;
  name: string;
  nameEn: string;
  price: number;
  change: number;
  volume: string;
  icon: string;
  color: string;
}

const metals: Asset[] = [
  { symbol: "AUXG", name: "Altın", nameEn: "Gold", price: 2648.50, change: 1.24, volume: "2.4B", icon: "🥇", color: "from-amber-500 to-yellow-600" },
  { symbol: "AUXS", name: "Gümüş", nameEn: "Silver", price: 31.25, change: -0.58, volume: "890M", icon: "🥈", color: "from-slate-400 to-slate-500" },
  { symbol: "AUXPT", name: "Platin", nameEn: "Platinum", price: 985.00, change: 0.82, volume: "320M", icon: "💎", color: "from-cyan-400 to-cyan-600" },
  { symbol: "AUXPD", name: "Paladyum", nameEn: "Palladium", price: 1025.00, change: -1.15, volume: "180M", icon: "⚪", color: "from-indigo-400 to-indigo-600" },
];

const cryptos: Asset[] = [
  { symbol: "BTC", name: "Bitcoin", nameEn: "Bitcoin", price: 104250, change: 2.35, volume: "28.5B", icon: "₿", color: "from-orange-500 to-orange-600" },
  { symbol: "ETH", name: "Ethereum", nameEn: "Ethereum", price: 3920, change: 1.82, volume: "12.8B", icon: "Ξ", color: "from-purple-500 to-purple-600" },
  { symbol: "SOL", name: "Solana", nameEn: "Solana", price: 185.50, change: 4.25, volume: "3.2B", icon: "◎", color: "from-gradient-to-r from-purple-400 to-cyan-400" },
  { symbol: "XRP", name: "Ripple", nameEn: "Ripple", price: 2.45, change: -0.92, volume: "2.1B", icon: "✕", color: "from-blue-500 to-blue-600" },
];

// Demo veri üreteci
function generateChartData(basePrice: number, days: number = 90) {
  const data = [];
  let price = basePrice * 0.85;
  const now = Math.floor(Date.now() / 1000);
  const dayInSeconds = 86400;

  for (let i = days; i >= 0; i--) {
    const volatility = basePrice * 0.02;
    const change = (Math.random() - 0.48) * volatility;
    price = Math.max(price + change, basePrice * 0.7);
    
    const open = price;
    const close = price + (Math.random() - 0.5) * volatility;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    const volume = Math.floor(Math.random() * 1000000) + 100000;

    data.push({
      time: now - (i * dayInSeconds),
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
    });

    price = close;
  }

  return data;
}

export default function MarketsPage() {
  const [lang, setLang] = useState<"tr" | "en">("tr");
  const [assetType, setAssetType] = useState<AssetType>("metals");
  const [selectedAsset, setSelectedAsset] = useState<Asset>(metals[0]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [addFundsDefaultTab, setAddFundsDefaultTab] = useState<"crypto" | "card" | "bank">("crypto");
  const { address } = useAccount();

  useEffect(() => {
    const savedLang = localStorage.getItem("auxite_language") as "tr" | "en" | null;
    if (savedLang) setLang(savedLang);
  }, []);

  useEffect(() => {
    // Seçilen varlık için chart verisi oluştur
    setChartData(generateChartData(selectedAsset.price));
  }, [selectedAsset]);

  const handleLanguageChange = (newLang: "tr" | "en") => {
    setLang(newLang);
    localStorage.setItem("auxite_language", newLang);
  };

  const assets = assetType === "metals" ? metals : cryptos;

  const t = {
    tr: {
      title: "Piyasalar",
      metals: "Değerli Metaller",
      crypto: "Kripto",
      price: "Fiyat",
      change: "Değişim (24s)",
      volume: "Hacim (24s)",
      trade: "İşlem Yap",
      allMarkets: "Tüm Piyasalar",
      addFunds: "Para Yatır",
    },
    en: {
      title: "Markets",
      metals: "Precious Metals",
      crypto: "Crypto",
      price: "Price",
      change: "Change (24h)",
      volume: "Volume (24h)",
      trade: "Trade",
      allMarkets: "All Markets",
      addFunds: "Add Funds",
    },
  };

  const labels = t[lang];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Top Navigation */}
      <div className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <button
                className="sm:hidden p-2 rounded-lg hover:bg-slate-800"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <Link href="/" className="flex items-center gap-2">
                <div className="relative w-8 h-8">
                  <Image src="/auxite-logo.png" alt="Auxite" fill className="object-contain" />
                </div>
                <span className="font-bold text-lg hidden sm:block">AUXITE</span>
              </Link>

              <nav className="hidden sm:flex items-center gap-1">
                {[
                  { href: "/markets", label: lang === "tr" ? "Piyasalar" : "Markets" },
                  { href: "/earn", label: lang === "tr" ? "Kazan" : "Earn" },
                  { href: "/wallet", label: lang === "tr" ? "Cüzdan" : "Wallet" },
                  { href: "/profile", label: lang === "tr" ? "Profil" : "Profile" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      item.href === "/markets"
                        ? "bg-emerald-500 text-white"
                        : "text-slate-300 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-slate-800 rounded-lg p-0.5">
                <button
                  onClick={() => handleLanguageChange("tr")}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    lang === "tr" ? "bg-emerald-500 text-white" : "text-slate-400"
                  }`}
                >
                  TR
                </button>
                <button
                  onClick={() => handleLanguageChange("en")}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    lang === "en" ? "bg-emerald-500 text-white" : "text-slate-400"
                  }`}
                >
                  EN
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{labels.title}</h1>
          
          {/* Asset Type Toggle */}
          <div className="flex bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => { setAssetType("metals"); setSelectedAsset(metals[0]); }}
              className={`px-4 py-2 text-sm rounded-md transition-colors ${
                assetType === "metals" ? "bg-emerald-500 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              🥇 {labels.metals}
            </button>
            <button
              onClick={() => { setAssetType("crypto"); setSelectedAsset(cryptos[0]); }}
              className={`px-4 py-2 text-sm rounded-md transition-colors ${
                assetType === "crypto" ? "bg-emerald-500 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              ₿ {labels.crypto}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Asset List - Left Sidebar */}
          <div className="lg:col-span-1 space-y-2">
            <h3 className="text-sm text-slate-400 mb-3">{labels.allMarkets}</h3>
            {assets.map((asset) => (
              <button
                key={asset.symbol}
                onClick={() => setSelectedAsset(asset)}
                className={`w-full p-4 rounded-xl border transition-all text-left ${
                  selectedAsset.symbol === asset.symbol
                    ? "bg-slate-800 border-emerald-500"
                    : "bg-slate-900 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${asset.color} flex items-center justify-center text-lg`}>
                      {asset.icon}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{asset.symbol}</div>
                      <div className="text-xs text-slate-500">{lang === "tr" ? asset.name : asset.nameEn}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-white">
                      ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-slate-400">
                      per {assetType === "metals" ? "gram" : "unit"}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Chart - Main Area */}
          <div className="lg:col-span-3">
            <AdvancedChart
              data={chartData}
              symbol={`${selectedAsset.symbol}/${assetType === "metals" ? "USD" : "USDT"}`}
              currentPrice={selectedAsset.price}
              priceChange={selectedAsset.change}
              lang={lang}
              height={500}
            />

            {/* Action Buttons */}
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setAddFundsDefaultTab("crypto");
                  setShowAddFunds(true);
                }}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-600 rounded-xl font-semibold transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {labels.addFunds}
              </button>
              <Link
                href={`/wallet?trade=${selectedAsset.symbol}`}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-600 rounded-xl font-semibold transition-colors"
              >
                {labels.trade} {selectedAsset.symbol}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Add Funds Modal */}
      {showAddFunds && (
        <AddFundsModal
          isOpen={showAddFunds}
          onClose={() => setShowAddFunds(false)}
          lang={lang}
          walletAddress={address || ""}
          defaultTab={addFundsDefaultTab}
          bankOnly={addFundsDefaultTab === "bank"}
        />
      )}
    </main>
  );
}
