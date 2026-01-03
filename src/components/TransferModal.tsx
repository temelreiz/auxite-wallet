"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/components/WalletContext";
import { useAccount } from "wagmi";

type TokenType = "AUXG" | "AUXS" | "AUXPT" | "AUXPD" | "AUXM" | "ETH" | "USDT" | "BTC" | "XRP" | "SOL";

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: string;
}

const TOKEN_INFO: Record<TokenType, { name: string; icon: string; iconType: "image" | "symbol"; color: string }> = {
  AUXG: { name: "Gold", icon: "/gold-favicon-32x32.png", iconType: "image", color: "#F59E0B" },
  AUXS: { name: "Silver", icon: "/silver-favicon-32x32.png", iconType: "image", color: "#94A3B8" },
  AUXPT: { name: "Platinum", icon: "/platinum-favicon-32x32.png", iconType: "image", color: "#CBD5E1" },
  AUXPD: { name: "Palladium", icon: "/palladium-favicon-32x32.png", iconType: "image", color: "#64748B" },
  AUXM: { name: "Auxite Money", icon: "◈", iconType: "symbol", color: "#A855F7" },
  ETH: { name: "Ethereum", icon: "Ξ", iconType: "symbol", color: "#627EEA" },
  USDT: { name: "Tether", icon: "₮", iconType: "symbol", color: "#26A17B" },
  BTC: { name: "Bitcoin", icon: "₿", iconType: "symbol", color: "#F7931A" },
  XRP: { name: "Ripple", icon: "✕", iconType: "symbol", color: "#23292F" },
  SOL: { name: "Solana", icon: "◎", iconType: "symbol", color: "#9945FF" },
};

const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "Transfer",
    subtitle: "Varlıklarınızı başka bir cüzdana gönderin",
    selectToken: "Token Seç",
    recipientAddress: "Alıcı Adresi",
    amount: "Miktar",
    balance: "Bakiye",
    networkFee: "Ağ Ücreti",
    send: "Gönder",
    sending: "Gönderiliyor...",
    success: "Transfer Başarılı!",
    error: "Transfer Başarısız",
    insufficientBalance: "Yetersiz bakiye",
    invalidAddress: "Geçersiz adres",
    enterAmount: "Miktar girin",
    cancel: "İptal",
  },
  en: {
    title: "Transfer",
    subtitle: "Send assets to another wallet",
    selectToken: "Select Token",
    recipientAddress: "Recipient Address",
    amount: "Amount",
    balance: "Balance",
    networkFee: "Network Fee",
    send: "Send",
    sending: "Sending...",
    success: "Transfer Successful!",
    error: "Transfer Failed",
    insufficientBalance: "Insufficient balance",
    invalidAddress: "Invalid address",
    enterAmount: "Enter amount",
    cancel: "Cancel",
  },
};

export function TransferModal({ isOpen, onClose, lang = "en" }: TransferModalProps) {
  const t = translations[lang] || translations.en;
  const { balances, refreshBalances, address } = useWallet();
  const { isConnected } = useAccount();
  
  const [selectedToken, setSelectedToken] = useState<TokenType>("AUXM");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setSelectedToken("AUXM");
      setRecipientAddress("");
      setAmount("");
      setResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const amountNum = parseFloat(amount) || 0;
  
  // Get balance for selected token
  const getBalance = (token: TokenType): number => {
    if (!balances) return 0;
    const key = token.toLowerCase() as keyof typeof balances;
    return parseFloat(String(balances[key] || 0));
  };

  const tokenBalance = getBalance(selectedToken);
  const canAfford = amountNum > 0 && amountNum <= tokenBalance;
  const isValidAddress = recipientAddress.length >= 42 && recipientAddress.startsWith("0x");
  const canSend = canAfford && isValidAddress && amountNum > 0 && !!address;

  const handleMaxClick = () => {
    setAmount(tokenBalance.toString());
  };

  const handleTransfer = async () => {
    if (!canSend || !address) return;
    
    setIsProcessing(true);
    try {
      const response = await fetch("/api/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromAddress: address,
          toAddress: recipientAddress,
          token: selectedToken,
          amount: amountNum,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setResult("success");
        
        // Wait for blockchain confirmation then refresh
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (refreshBalances) await refreshBalances();
        setTimeout(() => onClose(), 2500);
      } else {
        throw new Error(data.error || "Transfer failed");
      }
    } catch (error: any) {
      console.error("Transfer error:", error);
      setResult("error");
      
    } finally {
      setIsProcessing(false);
    }
  };

  const renderTokenIcon = (token: TokenType) => {
    const info = TOKEN_INFO[token];
    if (info.iconType === "image") {
      return <img src={info.icon} alt={token} className="w-6 h-6" />;
    }
    return (
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: info.color }}>
        {info.icon}
      </div>
    );
  };

  // Success/Error Screen
  if (result) {
    return (
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-300 dark:border-slate-700 max-w-md w-full p-6 shadow-xl text-center">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${result === "success" ? "bg-emerald-500" : "bg-red-500"}`}>
            {result === "success" ? (
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <h3 className={`text-xl font-bold mb-2 ${result === "success" ? "text-emerald-500" : "text-red-500"}`}>
            {result === "success" ? t.success : t.error}
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            {amountNum.toFixed(4)} {selectedToken}
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
          >
            {t.cancel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-300 dark:border-slate-700 max-w-md w-full p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">{t.title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Token Selection */}
        <div className="mb-4">
          <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">{t.selectToken}</label>
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(TOKEN_INFO) as TokenType[]).map((token) => (
              <button
                key={token}
                onClick={() => setSelectedToken(token)}
                className={`p-2 rounded-lg border flex flex-col items-center gap-1 transition-all ${
                  selectedToken === token
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-500/20"
                    : "border-stone-300 dark:border-slate-700 hover:border-stone-400 dark:hover:border-slate-600"
                }`}
              >
                {renderTokenIcon(token)}
                <span className="text-[10px] text-slate-700 dark:text-slate-300">{token}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recipient Address */}
        <div className="mb-4">
          <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">{t.recipientAddress}</label>
          <input
            type="text"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            placeholder="0x..."
            className="w-full bg-stone-100 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-mono text-sm"
          />
          {recipientAddress && !isValidAddress && (
            <p className="text-xs text-red-500 mt-1">{t.invalidAddress}</p>
          )}
        </div>

        {/* Amount */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-slate-600 dark:text-slate-400">{t.amount}</label>
            <span className="text-xs text-slate-500 dark:text-slate-500">
              {t.balance}: {tokenBalance.toFixed(4)} {selectedToken}
            </span>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-stone-100 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
              />
            </div>
            <button
              onClick={handleMaxClick}
              className="px-4 py-3 bg-stone-100 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-xl text-emerald-600 dark:text-emerald-500 font-medium hover:bg-stone-200 dark:hover:bg-slate-700 transition-colors"
            >
              MAX
            </button>
          </div>
          {amountNum > 0 && !canAfford && (
            <p className="text-xs text-red-500 mt-1">{t.insufficientBalance}</p>
          )}
        </div>

        {/* Fee Info */}
        <div className="bg-stone-100 dark:bg-slate-800/50 rounded-xl p-3 mb-6 border border-stone-200 dark:border-slate-700">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">{t.networkFee}</span>
            <span className="text-slate-700 dark:text-slate-300">
              {selectedToken === "AUXM" ? "0 (Off-chain)" : "~$0.50"}
            </span>
          </div>
        </div>

        {/* Wallet Connection Warning */}
        {!address && (
          <div className="bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/50 rounded-xl p-3 mb-4">
            <p className="text-amber-700 dark:text-amber-400 text-sm">
              {lang === "tr" ? "Cüzdan bağlı değil" : "Wallet not connected"}
            </p>
          </div>
        )}

        {/* Send Button */}
        <button
          onClick={handleTransfer}
          disabled={!canSend || isProcessing}
          className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {t.sending}
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              {t.send}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default TransferModal;
