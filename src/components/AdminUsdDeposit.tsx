// src/components/AdminUsdDeposit.tsx
// Admin panelinde USD yatırma formu

"use client";

import { useState } from "react";

interface AdminUsdDepositProps {
  adminAddress: string;
  lang?: "tr" | "en";
}

export function AdminUsdDeposit({ adminAddress, lang = "tr" }: AdminUsdDepositProps) {
  const [targetAddress, setTargetAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const [recentDeposits, setRecentDeposits] = useState<Array<{
    address: string;
    amount: number;
    timestamp: string;
  }>>([]);

  const [checkedBalance, setCheckedBalance] = useState<{
    usd: number;
    usdt: number;
  } | null>(null);

  const texts = {
    tr: {
      title: "USD Yatırma (Admin)",
      targetAddress: "Hedef Cüzdan Adresi",
      amount: "Miktar (USD)",
      note: "Not (Opsiyonel)",
      deposit: "USD Yatır",
      processing: "İşleniyor...",
      success: "başarıyla yatırıldı",
      error: "Hata",
      recentDeposits: "Son İşlemler",
      addressPlaceholder: "0x...",
      notePlaceholder: "Yatırma nedeni...",
      checkBalance: "Bakiye Sorgula",
      currentBalance: "Mevcut Bakiye",
    },
    en: {
      title: "USD Deposit (Admin)",
      targetAddress: "Target Wallet Address",
      amount: "Amount (USD)",
      note: "Note (Optional)",
      deposit: "Deposit USD",
      processing: "Processing...",
      success: "successfully deposited",
      error: "Error",
      recentDeposits: "Recent Deposits",
      addressPlaceholder: "0x...",
      notePlaceholder: "Reason for deposit...",
      checkBalance: "Check Balance",
      currentBalance: "Current Balance",
    },
  };

  const t = texts[lang];

  const handleCheckBalance = async () => {
    if (!targetAddress) return;

    try {
      const response = await fetch(
        `/api/admin/usd-deposit?address=${targetAddress}`,
        {
          headers: {
            "x-wallet-address": adminAddress,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setCheckedBalance({
          usd: data.data.usd,
          usdt: data.data.usdt,
        });
      }
    } catch (err) {
      console.error("Balance check error:", err);
    }
  };

  const handleDeposit = async () => {
    if (!targetAddress || !/^0x[a-fA-F0-9]{40}$/.test(targetAddress)) {
      setResult({ success: false, message: "Invalid wallet address" });
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setResult({ success: false, message: "Invalid amount" });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/admin/usd-deposit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": adminAddress,
        },
        body: JSON.stringify({
          targetAddress,
          amount: parsedAmount,
          note,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          message: `$${parsedAmount.toFixed(2)} ${t.success}`,
        });

        setRecentDeposits((prev) => [
          {
            address: targetAddress,
            amount: parsedAmount,
            timestamp: new Date().toLocaleString(lang === "tr" ? "tr-TR" : "en-US"),
          },
          ...prev.slice(0, 4),
        ]);

        setAmount("");
        setNote("");
        setCheckedBalance(null);
      } else {
        setResult({ success: false, message: data.error || t.error });
      }
    } catch (err) {
      console.error("Deposit error:", err);
      setResult({ success: false, message: "Network error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
          <svg
            className="w-4 h-4 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        {t.title}
      </h2>

      {/* Target Address */}
      <div className="mb-4">
        <label className="text-sm text-slate-400 mb-2 block">
          {t.targetAddress}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={targetAddress}
            onChange={(e) => {
              setTargetAddress(e.target.value);
              setCheckedBalance(null);
            }}
            placeholder={t.addressPlaceholder}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 font-mono text-sm"
          />
          <button
            onClick={handleCheckBalance}
            className="px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-slate-300 text-sm transition-colors"
          >
            {t.checkBalance}
          </button>
        </div>
      </div>

      {/* Current Balance Display */}
      {checkedBalance && (
        <div className="mb-4 bg-slate-800/50 rounded-xl p-3">
          <p className="text-xs text-slate-400 mb-2">{t.currentBalance}</p>
          <div className="flex gap-4">
            <div>
              <span className="text-sm text-slate-300">USD: </span>
              <span className="text-sm font-medium text-green-400">
                ${checkedBalance.usd.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-sm text-slate-300">USDT: </span>
              <span className="text-sm font-medium text-[#26A17B]">
                ${checkedBalance.usdt.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Amount */}
      <div className="mb-4">
        <label className="text-sm text-slate-400 mb-2 block">{t.amount}</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            $
          </span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-4 py-3 text-white placeholder-slate-500"
          />
        </div>
      </div>

      {/* Note */}
      <div className="mb-6">
        <label className="text-sm text-slate-400 mb-2 block">{t.note}</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t.notePlaceholder}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500"
        />
      </div>

      {/* Result Message */}
      {result && (
        <div
          className={`mb-4 p-3 rounded-xl ${
            result.success
              ? "bg-green-500/10 border border-green-500/30"
              : "bg-red-500/10 border border-red-500/30"
          }`}
        >
          <p
            className={`text-sm ${
              result.success ? "text-green-400" : "text-red-400"
            }`}
          >
            {result.message}
          </p>
        </div>
      )}

      {/* Deposit Button */}
      <button
        onClick={handleDeposit}
        disabled={isLoading || !targetAddress || !amount}
        className={`w-full py-3 rounded-xl font-semibold transition-colors ${
          isLoading || !targetAddress || !amount
            ? "bg-slate-700 text-slate-400 cursor-not-allowed"
            : "bg-green-500 hover:bg-green-600 text-white"
        }`}
      >
        {isLoading ? t.processing : t.deposit}
      </button>

      {/* Recent Deposits */}
      {recentDeposits.length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-700">
          <h3 className="text-sm font-medium text-slate-400 mb-3">
            {t.recentDeposits}
          </h3>
          <div className="space-y-2">
            {recentDeposits.map((deposit, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-sm bg-slate-800/50 rounded-lg p-2"
              >
                <span className="text-slate-400 font-mono text-xs">
                  {deposit.address.slice(0, 6)}...{deposit.address.slice(-4)}
                </span>
                <span className="text-green-400 font-medium">
                  +${deposit.amount.toFixed(2)}
                </span>
                <span className="text-slate-500 text-xs">{deposit.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}