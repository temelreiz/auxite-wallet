// src/components/UsdConvertModal.tsx
"use client";

import { useState, useEffect } from "react";
import { useWallet } from "./WalletContext";

interface UsdConvertModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: "tr" | "en";
  walletAddress: string;
}

export function UsdConvertModal({
  isOpen,
  onClose,
  lang,
  walletAddress,
}: UsdConvertModalProps) {
  const { balances, refreshBalances } = useWallet();
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const usdBalance = balances?.usd ?? 0;
  const parsedAmount = parseFloat(amount) || 0;
  const outputAmount = parsedAmount;

  const texts = {
    tr: {
      title: "USD → USDT Dönüştür",
      from: "Gönder",
      to: "Al",
      available: "Kullanılabilir",
      rate: "Dönüşüm Oranı",
      fee: "İşlem Ücreti",
      convert: "Dönüştür",
      processing: "İşleniyor...",
      success: "Dönüşüm başarılı!",
      insufficientBalance: "Yetersiz bakiye",
      minAmount: "Minimum: $1",
    },
    en: {
      title: "Convert USD → USDT",
      from: "From",
      to: "To",
      available: "Available",
      rate: "Exchange Rate",
      fee: "Fee",
      convert: "Convert",
      processing: "Processing...",
      success: "Conversion successful!",
      insufficientBalance: "Insufficient balance",
      minAmount: "Minimum: $1",
    },
  };

  const t = texts[lang];

  useEffect(() => {
    if (isOpen) {
      setAmount("");
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  const handleConvert = async () => {
    if (parsedAmount < 1) {
      setError(t.minAmount);
      return;
    }

    if (parsedAmount > usdBalance) {
      setError(t.insufficientBalance);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/user/buy-with-usd", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({
          targetToken: "usdt",
          usdAmount: parsedAmount,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(t.success);
        setAmount("");
        if (refreshBalances) {
          await refreshBalances();
        }
        setTimeout(() => onClose(), 2000);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Conversion failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">{t.title}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* From (USD) */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-slate-400">{t.from}</label>
            <span className="text-xs text-slate-500">
              {t.available}: ${usdBalance.toFixed(2)}
            </span>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="bg-transparent text-xl text-white outline-none w-full"
              />
              <div className="flex items-center gap-2 bg-slate-700 px-3 py-1.5 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">$</span>
                </div>
                <span className="text-white font-medium">USD</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setAmount(usdBalance.toString())}
            className="text-xs text-emerald-500 hover:text-emerald-400 mt-2"
          >
            MAX
          </button>
        </div>

        {/* Arrow */}
        <div className="flex justify-center my-3">
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>

        {/* To (USDT) */}
        <div className="mb-5">
          <label className="text-sm text-slate-400 mb-2 block">{t.to}</label>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-xl text-white">
                {outputAmount.toFixed(2)}
              </span>
              <div className="flex items-center gap-2 bg-slate-700 px-3 py-1.5 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-[#26A17B] flex items-center justify-center">
                  <span className="text-white text-xs font-bold">₮</span>
                </div>
                <span className="text-white font-medium">USDT</span>
              </div>
            </div>
          </div>
        </div>

        {/* Rate Info */}
        <div className="bg-slate-800/50 rounded-xl p-3 mb-5 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">{t.rate}</span>
            <span className="text-slate-300">1 USD = 1 USDT</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">{t.fee}</span>
            <span className="text-green-400">0%</span>
          </div>
        </div>

        {/* Error/Success */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 mb-4">
            <p className="text-sm text-green-400">{success}</p>
          </div>
        )}

        {/* Convert Button */}
        <button
          onClick={handleConvert}
          disabled={isLoading || !parsedAmount || parsedAmount > usdBalance}
          className={`w-full py-3 rounded-xl font-semibold transition-colors ${
            isLoading || !parsedAmount || parsedAmount > usdBalance
              ? "bg-slate-700 text-slate-400 cursor-not-allowed"
              : "bg-emerald-500 hover:bg-emerald-600 text-white"
          }`}
        >
          {isLoading ? t.processing : t.convert}
        </button>
      </div>
    </div>
  );
}