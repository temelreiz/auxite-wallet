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

  // Son işlemler
  const [recentDeposits, setRecentDeposits] = useState<Array<{
    address: string;
    amount: number;
    timestamp: string;
  }>>([]);

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

  // Bakiye sorgulama
  const [checkedBalance, setCheckedBalance] = useState<{
    usd: number;
    usdt: number;
  } | null>(null);

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
    // Validasyon
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

        // Son işlemlere ekle
        setRecentDeposits((prev) => [
          {
            address: targetAddress,
            amount: parsedAmount,
            timestamp: new Date().toLocaleString(lang === "tr" ? "tr-TR" : "en-US"),
          },
          ...prev.slice(0, 4),
        ]);

        // Formu temizle
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
        <div className="w-8 h-8 rounded-f