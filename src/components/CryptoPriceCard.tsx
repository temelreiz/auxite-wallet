"use client";

import { useState, useEffect, useRef } from "react";
import { CryptoConvertModal } from "./CryptoConvertModal";
import { useCryptoChart } from "@/hooks/useCryptoChart";

interface CryptoPriceCardProps {
  cryptoId: "ETH" | "BTC" | "XRP" | "SOL";
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  balance?: number;
  icon?: string;
  color?: string;
  lang?: "tr" | "en";
  metalPrices?: {
    AUXG: number;
    AUXS: number;
    AUXPT: number;
    AUXPD: number;
  };
}

const CRYPTO_COLORS: Record<string, string> = {
  ETH: "#627EEA",
  BTC: "#F7931A",
  XRP: "#23292F",
  SOL: "#9945FF",
};

const CRYPTO_ICONS: Record<string, string> = {
  ETH: "Ξ",
  BTC: "₿",
  XRP: "✕",
  SOL: "◎",
};

// Mini Sparkline Chart Component
function SparklineChart({
  data,
  color,
  isPositive,
}: {
  data: number[];
  color: string;
  isPositive: boolean;
}) {
  if (data.length < 2) return null;

  const width = 120;
  const height = 40;
  const padding = 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(" ");

  // Gradient fill
  const fillPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`gradient-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={isPositive ? "#22c55e" : "#ef4444"} stopOpacity="0.3" />
          <stop offset="100%" stopColor={isPositive ? "#22c55e" : "#ef4444"} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={fillPoints}
        fill={`url(#gradient-${color.replace("#", "")})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={isPositive ? "#22c55e" : "#ef4444"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CryptoPriceCard({
  cryptoId,
  symbol,
  name,
  price,
  change24h,
  balance = 0,
  icon,
  color,
  lang = "en",
  metalPrices = { AUXG: 139.31, AUXS: 1.79, AUXPT: 54.14, AUXPD: 48.16 },
}: CryptoPriceCardProps) {
  const [showConvertModal, setShowConvertModal] = useState(false);
  
  // Binance'den chart verisi çek
  const { sparklineData, loading: chartLoading } = useCryptoChart({
    symbol: cryptoId,
    interval: "1h",
    limit: 24,
    autoRefresh: true,
    refreshInterval: 60000, // 1 dakika
  });

  // Önceki fiyatı sakla ve karşılaştır
  const prevPriceRef = useRef<number>(price);
  const [priceDirection, setPriceDirection] = useState<"up" | "down" | "neutral">("neutral");

  useEffect(() => {
    if (price > prevPriceRef.current) {
      setPriceDirection("up");
    } else if (price < prevPriceRef.current) {
      setPriceDirection("down");
    } else {
      setPriceDirection("neutral");
    }
    prevPriceRef.current = price;
  }, [price]);

  const cryptoColor = color || CRYPTO_COLORS[cryptoId] || "#627EEA";
  const cryptoIcon = CRYPTO_ICONS[cryptoId] || "◆";
  const isPositive = change24h >= 0;

  // Direction-based styling
  const getDirectionStyles = () => {
    if (change24h > 0) {
      return {
        badgeBg: "bg-emerald-500/20",
        badgeText: "text-emerald-400",
        priceColor: priceDirection === "up" ? "text-emerald-400" : priceDirection === "down" ? "text-red-400" : "text-slate-100",
        arrow: "↑",
      };
    } else if (change24h < 0) {
      return {
        badgeBg: "bg-red-500/20",
        badgeText: "text-red-400",
        priceColor: priceDirection === "up" ? "text-emerald-400" : priceDirection === "down" ? "text-red-400" : "text-slate-100",
        arrow: "↓",
      };
    } else {
      return {
        badgeBg: "bg-slate-500/20",
        badgeText: "text-slate-300",
        priceColor: "text-slate-100",
        arrow: "~",
      };
    }
  };

  const directionStyles = getDirectionStyles();

  const handleConvert = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConvertModal(true);
  };

  // Format price based on value
  const formatPrice = (p: number) => {
    if (p >= 1000) return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 1) return p.toFixed(2);
    return p.toFixed(4);
  };

  return (
    <>
      <div
        className="relative rounded-xl border border-slate-800 bg-slate-900/80 p-4 hover:border-slate-600 hover:bg-slate-900 transition-all cursor-pointer group"
        onClick={handleConvert}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            {/* Crypto Icon */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: cryptoColor }}
            >
              {cryptoIcon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-200">{symbol}</h3>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded ${directionStyles.badgeBg} ${directionStyles.badgeText}`}
                >
                  {directionStyles.arrow} {Math.abs(change24h).toFixed(2)}%
                </span>
              </div>
              <p className="text-xs text-slate-500">{name}</p>
            </div>
          </div>

          {/* Balance */}
          {balance > 0 && (
            <div className="text-right">
              <div className="text-xs text-slate-500">{lang === "tr" ? "Bakiye" : "Balance"}</div>
              <div className="text-sm text-slate-300 font-mono font-medium">{balance.toFixed(6)}</div>
            </div>
          )}
        </div>

        {/* Price & Chart Row */}
        <div className="flex items-end justify-between mb-3">
          {/* Price */}
          <div>
            <div
              className={`text-2xl font-bold font-mono tracking-tight transition-colors duration-300 ${directionStyles.priceColor}`}
            >
              ${formatPrice(price)}
            </div>
            {balance > 0 && (
              <div className="text-xs text-slate-500 mt-0.5">
                ≈ ${formatPrice(balance * price)}
              </div>
            )}
          </div>

          {/* Mini Sparkline Chart */}
          <div className="opacity-80 group-hover:opacity-100 transition-opacity">
            {!chartLoading && sparklineData.length > 0 ? (
              <SparklineChart data={sparklineData} color={cryptoColor} isPositive={isPositive} />
            ) : (
              <div className="w-[120px] h-[40px] bg-slate-800/50 rounded animate-pulse" />
            )}
          </div>
        </div>

        {/* Convert Button */}
        <button
          onClick={handleConvert}
          className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 active:from-purple-700 active:to-pink-700 text-white text-sm font-semibold transition-all duration-150 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            />
          </svg>
          {lang === "tr" ? "Dönüştür" : "Convert"}
        </button>

        {/* Click hint */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      {/* Convert Modal */}
      {showConvertModal && (
        <CryptoConvertModal
          isOpen={showConvertModal}
          onClose={() => setShowConvertModal(false)}
          crypto={cryptoId}
          lang={lang}
          cryptoBalances={{
            ETH: cryptoId === "ETH" ? balance : 0,
            BTC: cryptoId === "BTC" ? balance : 0,
            XRP: cryptoId === "XRP" ? balance : 0,
            SOL: cryptoId === "SOL" ? balance : 0,
          }}
          cryptoPrices={{
            ETH: cryptoId === "ETH" ? price : 0,
            BTC: cryptoId === "BTC" ? price : 0,
            XRP: cryptoId === "XRP" ? price : 0,
            SOL: cryptoId === "SOL" ? price : 0,
          }}
          metalBidPrices={metalPrices}
        />
      )}
    </>
  );
}

export { CryptoPriceCard };
