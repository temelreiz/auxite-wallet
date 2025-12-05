// src/components/UsdConvertModal.tsx
// USD'yi USDT'ye veya diğer tokenlara dönüştürme modal'ı

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
  const [targetToken, setTargetToken] = useState<"usdt">("usdt");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const usdBalance = balances?.usd ?? 0;
  const parsedAmount = parseFloat(amount) || 0;

  // 1:1 dönüşüm (USD → USDT)
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
          targetToken: targetToken,
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
      <div className="bg-slate-900 rounded-2xl border border-slate-700 ma