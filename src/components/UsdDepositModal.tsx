// src/components/UsdDepositModal.tsx
"use client";

import { useState } from "react";

interface UsdDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: "tr" | "en";
  walletAddress: string;
}

export function UsdDepositModal({
  isOpen,
  onClose,
  lang,
  walletAddress,
}: UsdDepositModalProps) {
  const [amount, setAmount] = useState("");

  const texts = {
    tr: {
      title: "USD Yatır",
      subtitle: "Kredi/Banka Kartı ile",
      amount: "Yatırılacak Miktar",
      minAmount: "Minimum: $10",
      maxAmount: "Maksimum: $10,000",
      fee: "İşlem Ücreti",
      feeAmount: "%2.5",
      total: "Toplam Ödeme",
      continueButton: "Ödemeye Devam Et",
      poweredBy: "Powered by MoonPay",
      comingSoon: "Yakında Aktif",
      comingSoonDesc: "Kredi kartı ile USD yatırma özelliği çok yakında hizmetinizde olacak.",
      notifyMe: "Beni Bilgilendir",
      securePayment: "256-bit SSL ile güvenli ödeme",
      cards: "Visa, Mastercard, Amex kabul edilir",
    },
    en: {
      title: "Deposit USD",
      subtitle: "Via Credit/Debit Card",
      amount: "Amount to Deposit",
      minAmount: "Minimum: $10",
      maxAmount: "Maximum: $10,000",
      fee: "Processing Fee",
      feeAmount: "2.5%",
      total: "Total Payment",
      continueButton: "Continue to Payment",
      poweredBy: "Powered by MoonPay",
      comingSoon: "Coming Soon",
      comingSoonDesc: "Credit card USD deposit feature will be available very soon.",
      notifyMe: "Notify Me",
      securePayment: "Secure payment with 256-bit SSL",
      cards: "Visa, Mastercard, Amex accepted",
    },
  };

  const t = texts[lang];

  const parsedAmount = parseFloat(amount) || 0;
  const fee = parsedAmount * 0.025;
  const total = parsedAmount + fee;

  // MoonPay henüz aktif değil
  const isMoonPayActive = false;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-white">{t.title}</h3>
            <p className="text-sm text-slate-400">{t.subtitle}</p>
          </div>
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

        {!isMoonPayActive ? (
          // Coming Soon State
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
              <svg
                className="w-10 h-10 text-purple-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h4 className="text-xl font-bold text-white mb-2">{t.comingSoon}</h4>
            <p className="text-slate-400 text-sm mb-6">{t.comingSoonDesc}</p>
            
            {/* MoonPay Logo Placeholder */}
            <div className="bg-slate-800 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-center gap-2 text-slate-300">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="10" fill="#7C3AED" />
                  <path d="M8 12a4 4 0 108 0 4 4 0 00-8 0z" fill="white" />
                </svg>
                <span className="font-semibold">MoonPay</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">{t.poweredBy}</p>
            </div>

            {/* Notify Button */}
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-semibold transition-colors"
            >
              {t.notifyMe}
            </button>
          </div>
        ) : (
          // Active State (MoonPay entegre olunca)
          <>
            {/* Amount Input */}
            <div className="mb-5">
              <label className="text-sm text-slate-400 mb-2 block">
                {t.amount}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  $
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="100.00"
                  min="10"
                  max="10000"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-4 py-3 text-white placeholder-slate-500"
                />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-xs text-slate-500">{t.minAmount}</span>
                <span className="text-xs text-slate-500">{t.maxAmount}</span>
              </div>
            </div>

            {/* Quick Amounts */}
            <div className="grid grid-cols-4 gap-2 mb-5">
              {[50, 100, 250, 500].map((value) => (
                <button
                  key={value}
                  onClick={() => setAmount(value.toString())}
                  className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                    parsedAmount === value
                      ? "bg-green-500 text-white"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  ${value}
                </button>
              ))}
            </div>

            {/* Fee Breakdown */}
            {parsedAmount > 0 && (
              <div className="bg-slate-800/50 rounded-xl p-4 mb-5 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">{t.amount}</span>
                  <span className="text-white">${parsedAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">{t.fee} ({t.feeAmount})</span>
                  <span className="text-slate-300">${fee.toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-700 pt-2 flex justify-between">
                  <span className="text-slate-400 font-medium">{t.total}</span>
                  <span className="text-white font-bold">${total.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Security Info */}
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <span>{t.securePayment}</span>
            </div>

            {/* Card Icons */}
            <div className="flex items-center justify-center gap-3 mb-5">
              <div className="w-12 h-8 bg-slate-800 rounded flex items-center justify-center text-xs font-bold text-blue-400">
                VISA
              </div>
              <div className="w-12 h-8 bg-slate-800 rounded flex items-center justify-center">
                <div className="flex">
                  <div className="w-3 h-3 rounded-full bg-red-500 -mr-1"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                </div>
              </div>
              <div className="w-12 h-8 bg-slate-800 rounded flex items-center justify-center text-xs font-bold text-blue-300">
                AMEX
              </div>
            </div>

            {/* Continue Button */}
            <button
              disabled={parsedAmount < 10}
              className={`w-full py-3 rounded-xl font-semibold transition-colors ${
                parsedAmount >= 10
                  ? "bg-green-500 hover:bg-green-600 text-white"
                  : "bg-slate-700 text-slate-400 cursor-not-allowed"
              }`}
            >
              {t.continueButton}
            </button>

            {/* MoonPay Branding */}
            <p className="text-center text-xs text-slate-500 mt-4">
              {t.poweredBy}
            </p>
          </>
        )}
      </div>