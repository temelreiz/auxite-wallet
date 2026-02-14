"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/components/WalletContext";
import { useLanguage } from "@/components/LanguageContext";

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  metal: {
    symbol: string;
    name: string;
    price: number;
    icon: string;
  };
  mode: "buy" | "sell";
}

const paymentMethods = [
  { id: "AUXM", name: "AUXM", icon: "💵" },
  { id: "USDT", name: "USDT", icon: "₮" },
  { id: "ETH", name: "ETH", icon: "Ξ" },
  { id: "BTC", name: "BTC", icon: "₿" },
];

const translations: Record<string, Record<string, string>> = {
  tr: {
    buy: "Satın Al",
    sell: "Sat",
    youPay: "Ödeyeceğiniz",
    youReceive: "Alacağınız",
    balance: "Bakiye",
    bonus: "Bonus",
    insufficientBalance: "Yetersiz bakiye",
    connectWallet: "Cüzdan bağlayın",
    processing: "İşleniyor...",
  },
  en: {
    buy: "Buy",
    sell: "Sell",
    youPay: "You Pay",
    youReceive: "You Receive",
    balance: "Balance",
    bonus: "Bonus",
    insufficientBalance: "Insufficient balance",
    connectWallet: "Connect wallet",
    processing: "Processing...",
  },
  de: {
    buy: "Kaufen",
    sell: "Verkaufen",
    youPay: "Sie zahlen",
    youReceive: "Sie erhalten",
    balance: "Guthaben",
    bonus: "Bonus",
    insufficientBalance: "Unzureichendes Guthaben",
    connectWallet: "Wallet verbinden",
    processing: "Wird verarbeitet...",
  },
  fr: {
    buy: "Acheter",
    sell: "Vendre",
    youPay: "Vous payez",
    youReceive: "Vous recevez",
    balance: "Solde",
    bonus: "Bonus",
    insufficientBalance: "Solde insuffisant",
    connectWallet: "Connecter le portefeuille",
    processing: "Traitement...",
  },
  ar: {
    buy: "شراء",
    sell: "بيع",
    youPay: "ستدفع",
    youReceive: "ستحصل على",
    balance: "الرصيد",
    bonus: "مكافأة",
    insufficientBalance: "رصيد غير كافٍ",
    connectWallet: "ربط المحفظة",
    processing: "جاري المعالجة...",
  },
  ru: {
    buy: "Купить",
    sell: "Продать",
    youPay: "Вы платите",
    youReceive: "Вы получите",
    balance: "Баланс",
    bonus: "Бонус",
    insufficientBalance: "Недостаточный баланс",
    connectWallet: "Подключить кошелек",
    processing: "Обработка...",
  },
};

export function TradeModal({ isOpen, onClose, metal, mode }: TradeModalProps) {
  // Gerçek bakiyeler - useWallet hook'undan
  const { balances, isConnected } = useWallet();
  const { lang } = useLanguage();
  
  const auxmBalance = balances?.auxm ?? 0;
  const totalAuxm = auxmBalance;
  
  const [amount, setAmount] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("AUXM");
  const [isProcessing, setIsProcessing] = useState(false);

  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;

  useEffect(() => {
    if (isOpen) {
      setAmount("");
      setSelectedCurrency("AUXM");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const amountNum = parseFloat(amount) || 0;
  const metalAmount = mode === "buy" 
    ? amountNum / metal.price 
    : amountNum * metal.price;

  const getAvailableBalance = () => {
    if (!balances) return 0;
    switch (selectedCurrency) {
      case "AUXM": return totalAuxm;
      case "ETH": return balances.eth;
      case "BTC": return balances.btc;
      default: return 0;
    }
  };

  const availableBalance = getAvailableBalance();
  const hasInsufficientBalance = mode === "buy" && amountNum > availableBalance;


  const handleTrade = async () => {
    if (!isConnected || amountNum <= 0 || hasInsufficientBalance) return;
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      onClose();
    } catch (error) {
      console.error("Trade error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-slate-800 shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
            {mode === "buy" ? t("buy") : t("sell")} {metal.name}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400">
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-sm text-slate-500 dark:text-slate-400 mb-2 block">
              {mode === "buy" ? t("youPay") : t("youReceive")}
            </label>
            <div className="flex gap-2 mb-3">
              {paymentMethods.map((pm) => (
                <button
                  key={pm.id}
                  onClick={() => setSelectedCurrency(pm.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCurrency === pm.id
                      ? "bg-[#2F6F62]/20 text-[#2F6F62] dark:text-[#2F6F62] border border-[#2F6F62]"
                      : "bg-stone-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-stone-200 dark:border-slate-700"
                  }`}
                >
                  {pm.icon} {pm.name}
                </button>
              ))}
            </div>
            
            {selectedCurrency === "AUXM" && (
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-400 dark:text-slate-500">{t("balance")}:</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-700 dark:text-white font-mono">{auxmBalance.toFixed(2)} AUXM</span>
                </div>
              </div>
            )}

            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className={`w-full px-4 py-3 bg-stone-50 dark:bg-slate-800 border rounded-xl text-slate-800 dark:text-white text-lg font-mono focus:outline-none ${
                hasInsufficientBalance ? "border-red-500" : "border-stone-200 dark:border-slate-700"
              }`}
            />
            {hasInsufficientBalance && (
              <p className="text-red-500 dark:text-red-400 text-xs mt-1">{t("insufficientBalance")}</p>
            )}
          </div>

          <div className="flex justify-center">
            <div className="p-2 bg-stone-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400">
              ↓
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-500 dark:text-slate-400 mb-2 block">
              {mode === "buy" ? t("youReceive") : t("youPay")}
            </label>
            <div className="flex items-center gap-3 p-4 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl">
              <span className="text-2xl">{metal.icon}</span>
              <div>
                <div className="text-slate-800 dark:text-white text-lg font-mono">
                  {metalAmount.toFixed(4)} {metal.symbol}
                </div>
                <div className="text-slate-500 dark:text-slate-400 text-sm">@ ${metal.price.toFixed(2)}/g</div>
              </div>
            </div>
          </div>


          <button
            onClick={handleTrade}
            disabled={!isConnected || amountNum <= 0 || hasInsufficientBalance || isProcessing}
            className={`w-full py-4 rounded-xl font-semibold text-white transition-colors ${
              !isConnected || amountNum <= 0 || hasInsufficientBalance || isProcessing
                ? "bg-slate-300 dark:bg-slate-700 cursor-not-allowed"
                : mode === "buy" ? "bg-[#2F6F62] hover:bg-[#2F6F62]" : "bg-red-500 hover:bg-red-600"
            }`}
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                ⏳ {t("processing")}
              </span>
            ) : !isConnected ? t("connectWallet") : `${mode === "buy" ? t("buy") : t("sell")} ${metal.symbol}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TradeModal;
