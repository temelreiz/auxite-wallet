"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/components/WalletContext";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";

type TokenType = "AUXG" | "AUXS" | "AUXPT" | "AUXPD" | "AUXM" | "ETH" | "USDT" | "BTC" | "XRP" | "SOL";

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: string;
}

const TOKEN_INFO: Record<TokenType, { 
  name: string; 
  icon: string; 
  iconType: "image" | "symbol"; 
  color: string; 
  onChain: boolean; 
  decimals: number; 
  address?: string;
}> = {
  AUXG: { name: "Gold", icon: "/gold-favicon-32x32.png", iconType: "image", color: "#F59E0B", onChain: true, decimals: 3, address: process.env.NEXT_PUBLIC_AUXG_V8 },
  AUXS: { name: "Silver", icon: "/silver-favicon-32x32.png", iconType: "image", color: "#94A3B8", onChain: true, decimals: 3, address: process.env.NEXT_PUBLIC_AUXS_V8 },
  AUXPT: { name: "Platinum", icon: "/platinum-favicon-32x32.png", iconType: "image", color: "#CBD5E1", onChain: true, decimals: 3, address: process.env.NEXT_PUBLIC_AUXPT_V8 },
  AUXPD: { name: "Palladium", icon: "/palladium-favicon-32x32.png", iconType: "image", color: "#64748B", onChain: true, decimals: 3, address: process.env.NEXT_PUBLIC_AUXPD_V8 },
  AUXM: { name: "Auxite Money", icon: "◈", iconType: "symbol", color: "#A855F7", onChain: false, decimals: 2 },
  ETH: { name: "Ethereum", icon: "Ξ", iconType: "symbol", color: "#627EEA", onChain: true, decimals: 18 },
  USDT: { name: "Tether", icon: "₮", iconType: "symbol", color: "#26A17B", onChain: true, decimals: 6, address: process.env.NEXT_PUBLIC_USDT_ADDRESS },
  BTC: { name: "Bitcoin", icon: "₿", iconType: "symbol", color: "#F7931A", onChain: false, decimals: 8 },
  XRP: { name: "Ripple", icon: "✕", iconType: "symbol", color: "#23292F", onChain: false, decimals: 6 },
  SOL: { name: "Solana", icon: "◎", iconType: "symbol", color: "#9945FF", onChain: false, decimals: 9 },
};

const ERC20_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ type: "bool" }]
  }
] as const;

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
    confirming: "Onay bekleniyor...",
    success: "Transfer Başarılı!",
    error: "Transfer Başarısız",
    insufficientBalance: "Yetersiz bakiye",
    invalidAddress: "Geçersiz adres",
    enterAmount: "Miktar girin",
    cancel: "İptal",
    walletNotConnected: "Cüzdan bağlı değil",
    signTransaction: "Cüzdanınızda işlemi onaylayın",
    onChainNote: "On-chain transfer - Cüzdanınızda imzalamanız gerekecek",
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
    confirming: "Confirming...",
    success: "Transfer Successful!",
    error: "Transfer Failed",
    insufficientBalance: "Insufficient balance",
    invalidAddress: "Invalid address",
    enterAmount: "Enter amount",
    cancel: "Cancel",
    walletNotConnected: "Wallet not connected",
    signTransaction: "Please confirm the transaction in your wallet",
    onChainNote: "On-chain transfer - You'll need to sign in your wallet",
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
  const [errorMessage, setErrorMessage] = useState("");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const { writeContract, isPending: isWritePending, data: writeData } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useEffect(() => {
    if (writeData) {
      setTxHash(writeData);
    }
  }, [writeData]);

  useEffect(() => {
    if (isConfirmed && txHash) {
      setResult("success");
      setIsProcessing(false);
      setTimeout(async () => {
        if (refreshBalances) await refreshBalances();
      }, 2000);
      setTimeout(() => onClose(), 3000);
    }
  }, [isConfirmed, txHash, refreshBalances, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedToken("AUXM");
      setRecipientAddress("");
      setAmount("");
      setResult(null);
      setErrorMessage("");
      setTxHash(undefined);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const tokenInfo = TOKEN_INFO[selectedToken];
  const amountNum = parseFloat(amount) || 0;
  
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
    setErrorMessage("");
    
    try {
      if (tokenInfo.onChain && tokenInfo.address) {
        const amountInUnits = parseUnits(amount, tokenInfo.decimals);
        
        writeContract({
          address: tokenInfo.address as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "transfer",
          args: [recipientAddress as `0x${string}`, amountInUnits],
        });
      } else {
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
          await new Promise(resolve => setTimeout(resolve, 2000));
          if (refreshBalances) await refreshBalances();
          setTimeout(() => onClose(), 2500);
        } else {
          throw new Error(data.error || "Transfer failed");
        }
        setIsProcessing(false);
      }
    } catch (error: any) {
      console.error("Transfer error:", error);
      setErrorMessage(error.message || "Transfer failed");
      setResult("error");
      setIsProcessing(false);
    }
  };

  const renderTokenIcon = (token: TokenType) => {
    const info = TOKEN_INFO[token];
    if (info.iconType === "image") {
      return <img src={info.icon} alt={token} className="w-6 h-6" />;
    }
    return (
      <div 
        className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-sm" 
        style={{ backgroundColor: info.color }}
      >
        {info.icon}
      </div>
    );
  };

  if ((isWritePending || isConfirming) && !result) {
    return (
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-300 dark:border-slate-700 max-w-md w-full p-6 shadow-xl text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500 flex items-center justify-center">
            <svg className="animate-spin h-8 w-8 text-white" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold mb-2 text-slate-800 dark:text-white">
            {isWritePending ? t.signTransaction : t.confirming}
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            {amountNum.toFixed(4)} {selectedToken}
          </p>
          {txHash && (
            
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline text-sm"
            >
              View on Etherscan
            </a>
          )}
        </div>
      </div>
    );
  }

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
          <p className="text-slate-600 dark:text-slate-400 mb-2">
            {amountNum.toFixed(4)} {selectedToken}
          </p>
          {errorMessage && <p className="text-red-500 text-sm mb-4">{errorMessage}</p>}
          {txHash && result === "success" && (
            
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline text-sm block mb-4"
            >
              View on Etherscan
            </a>
          )}
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

        <div className="mb-4">
          <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">{t.selectToken}</label>
          <div className="grid grid-cols-5 gap-2">
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

        {tokenInfo.onChain && (
          <div className="mb-4 p-2 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg">
            <p className="text-xs text-blue-700 dark:text-blue-400 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {t.onChainNote}
            </p>
          </div>
        )}

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

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-slate-600 dark:text-slate-400">{t.amount}</label>
            <span className="text-xs text-slate-500 dark:text-slate-500">
              {t.balance}: {tokenBalance.toFixed(4)} {selectedToken}
            </span>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 bg-stone-100 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
            />
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

        <div className="bg-stone-100 dark:bg-slate-800/50 rounded-xl p-3 mb-4 border border-stone-200 dark:border-slate-700">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">{t.networkFee}</span>
            <span className="text-slate-700 dark:text-slate-300">
              {tokenInfo.onChain ? "~$0.50 (gas)" : "0 (Off-chain)"}
            </span>
          </div>
        </div>

        {!address && (
          <div className="bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/50 rounded-xl p-3 mb-4">
            <p className="text-amber-700 dark:text-amber-400 text-sm">{t.walletNotConnected}</p>
          </div>
        )}

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
