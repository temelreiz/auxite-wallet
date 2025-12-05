// src/components/BuyWithUsdModal.tsx
"use client";

import { useState, useEffect } from "react";
import { useWallet } from "./WalletContext";

interface BuyWithUsdModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: "tr" | "en";
  walletAddress: string;
}

// Sadece AUXM ve Metaller (Crypto YOK)
const TOKENS = [
  {
    id: "auxm",
    name: "Auxite Token",
    symbol: "AUXM",
    price: 0.1,
    icon: "◆",
    color: "#10B981",
  },
  {
    id: "auxg",
    name: "Dijital Altın",
    symbol: "AUXG",
    price: 90,
    icon: "🥇",
    color: "#F59E0B",
  },
  {
    id: "auxs",
    name: "Dijital Gümüş",
    symbol: "AUXS",
    price: 1.1,
    icon: "🥈",
    color: "#9CA3AF",
  },
  {
    id: "auxpt",
    name: "Dijital Platin",
    symbol: "AUXPT",
    price: 35,
    icon: "⬡",
    color: "#E5E7EB",
  },
  {
    id: "auxpd",
    name: "Dijital Paladyum",
    symbol: "AUXPD",
    price: 32,
    icon: "⬢",
    color: "#F472B6",
  },
];

export function BuyWithUsdModal({
  isOpen,
  onClose,
  lang,
  walletAddress,
}: BuyWithUsdModalProps) {
  const { balances, refreshBalances } = useWallet();
  const [selectedToken, setSelectedToken] = useState(TOKENS[0]);
  const [usdAmount, setUsdAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const usdBalance = balances?.usd ?? 0;
  const parsedAmount = parseFloat(usdAmount) || 0;
  const tokenAmount = parsedAmount / selectedToken.price;
  const hasInsufficientBalance = parsedAmount > usdBalance;

  const texts = {
    tr: {
      title: "USD ile Satın Al",
      selectToken: "Token Seç",
      amount: "Miktar",
      usdBalance: "USD Bakiye",
      youWillReceive: "Alacağınız",
      rate: "Kur",
      buyButton: "Satın Al",
      processing: "İşleniyor...",
      insufficientBalance: "Yetersiz USD bakiyesi",
      minAmount: "Minimum: $1",
      maxAmount: "Maksimum: $100,000",
      success: "Başarılı! Token bakiyenize eklendi.",
      error: "İşlem başarısız oldu",
      depositFirst: "USD Yatır",
    },
    en: {
      title: "Buy with USD",
      selectToken: "Select Token",
      amount: "Amount",
      usdBalance: "USD Balance",
      youWillReceive: "You will receive",
      rate: "Rate",
      buyButton: "Buy",
      processing: "Processing...",
      insufficientBalance: "Insufficient USD balance",
      minAmount: "Minimum: $1",
      maxAmount: "Maximum: $100,000",
      success: "Success! Tokens added to your balance.",
      error: "Transaction failed",
      depositFirst: "Deposit USD",
    },
  };

  const t = texts[lang];

  useEffect(() => {
    if (isOpen) {
      setUsdAmount("");
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  const handleBuy = async () => {
    if (!parsedAmount || parsedAmount < 1) {
      setError(t.minAmount);
      return;
    }

    if (parsedAmount > 100000) {
      setError(t.maxAmount);
      return;
    }

    if (hasInsufficientBalance) {
      setError(t.insufficientBalance);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/user/buy-with-usd", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({
          targetToken: selectedToken.id,
          usdAmount: parsedAmount,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(t.success);
        setUsdAmount("");
        if (refreshBalances) {
          await refreshBalances();
        }
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError(data.error || t.error);
      }
    } catch (err) {
      console.error("Buy with USD error:", err);
      setError(t.error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMaxClick = () => {
    setUsdAmount(usdBalance.toString());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">{t.title}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* USD Balance Display */}
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">{t.usdBalance}</span>
            <span className="text-lg font-bold text-green-400">
              ${usdBalance.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>

        {/* Token Selection */}
        <div className="mb-5">
          <label className="text-sm text-slate-400 mb-2 block">
            {t.selectToken}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {TOKENS.map((token) => (
              <button
                key={token.id}
                onClick={() => setSelectedToken(token)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                  selectedToken.id === token.id
                    ? "bg-emerald-500/20 border-emerald-500"
                    : "bg-slate-800 border-slate-700 hover:border-slate-600"
                }`}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: token.color + "30" }}
                >
                  <span style={{ color: token.color }}>{token.icon}</span>
                </div>
                <span className="text-xs text-slate-300">{token.symbol}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Amount Input */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-slate-400">{t.amount} (USD)</label>
            <button
              onClick={handleMaxClick}
              className="text-xs text-emerald-500 hover:text-emerald-400"
            >
              MAX
            </button>
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              $
            </span>
            <input
              type="number"
              value={usdAmount}
              onChange={(e) => setUsdAmount(e.target.value)}
              placeholder="0.00"
              className={`w-full bg-slate-800 border rounded-xl pl-8 pr-4 py-3 text-white placeholder-slate-500 ${
                hasInsufficientBalance ? "border-red-500" : "border-slate-700"
              }`}
            />
          </div>
          {hasInsufficientBalance && (
            <p className="text-xs text-red-400 mt-1">{t.insufficientBalance}</p>
          )}
        </div>

        {/* You Will Receive */}
        {parsedAmount > 0 && (
          <div className="bg-slate-800/50 rounded-xl p-4 mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">{t.youWillReceive}</span>
              <span className="text-lg font-bold text-white">
                {tokenAmount.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 6,
                })}{" "}
                {selectedToken.symbol}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">{t.rate}</span>
              <span className="text-slate-400">
                1 {selectedToken.symbol} = ${selectedToken.price}
              </span>
            </div>
          </div>
        )}

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-5">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 mb-5">
            <p className="text-sm text-green-400">{success}</p>
          </div>
        )}

        {/* Buy Button */}
        <button
          onClick={handleBuy}
          disabled={isLoading || !parsedAmount || hasInsufficientBalance}
          className={`w-full py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
            isLoading || !parsedAmount || hasInsufficientBalance
              ? "bg-slate-700 text-slate-400 cursor-not-allowed"
              : "bg-green-500 hover:bg-green-600 text-white"
          }`}
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {t.processing}
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {t.buyButton} {parsedAmount > 0 && `$${parsedAmount}`}
            </>
          )}
        </button>
      </div>
    </div>
  );
}