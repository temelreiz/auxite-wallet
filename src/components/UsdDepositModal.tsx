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
      comingSoon: "Yakında Aktif",
      comingSoonDesc: "Kredi kartı ile USD yatırma özelliği çok yakında hizmetinizde olacak.",
      notifyMe: "Tamam",
      poweredBy: "Powered by MoonPay",
    },
    en: {
      title: "Deposit USD",
      subtitle: "Via Credit/Debit Card",
      comingSoon: "Coming Soon",
      comingSoonDesc: "Credit card USD deposit feature will be available very soon.",
      notifyMe: "OK",
      poweredBy: "Powered by MoonPay",
    },
  };

  const t = texts[lang];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-md w-full p-6">
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

          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-semibold transition-colors"
          >
            {t.notifyMe}
          </button>
        </div>
      </div>
    </div>
  );
}