"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/components/WalletContext";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { useAllocations } from "@/hooks/useAllocations";
import { METAL_TOKENS as METAL_TOKEN_ADDRESSES, USDT_ADDRESS } from "@/config/contracts-v8";

type TokenType = "AUXG" | "AUXS" | "AUXPT" | "AUXPD" | "ETH" | "USDT" | "BTC" | "XRP" | "SOL";

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
  isMetal?: boolean;
}> = {
  AUXG: { name: "Gold", icon: "/gold-favicon-32x32.png", iconType: "image", color: "#F59E0B", onChain: true, decimals: 3, address: METAL_TOKEN_ADDRESSES.AUXG, isMetal: true },
  AUXS: { name: "Silver", icon: "/silver-favicon-32x32.png", iconType: "image", color: "#94A3B8", onChain: true, decimals: 3, address: METAL_TOKEN_ADDRESSES.AUXS, isMetal: true },
  AUXPT: { name: "Platinum", icon: "/platinum-favicon-32x32.png", iconType: "image", color: "#CBD5E1", onChain: true, decimals: 3, address: METAL_TOKEN_ADDRESSES.AUXPT, isMetal: true },
  AUXPD: { name: "Palladium", icon: "/palladium-favicon-32x32.png", iconType: "image", color: "#64748B", onChain: true, decimals: 3, address: METAL_TOKEN_ADDRESSES.AUXPD, isMetal: true },
  ETH: { name: "Ethereum", icon: "Ξ", iconType: "symbol", color: "#627EEA", onChain: true, decimals: 18 },
  USDT: { name: "Tether", icon: "₮", iconType: "symbol", color: "#26A17B", onChain: true, decimals: 6, address: USDT_ADDRESS },
  BTC: { name: "Bitcoin", icon: "₿", iconType: "symbol", color: "#F7931A", onChain: false, decimals: 8 },
  XRP: { name: "Ripple", icon: "✕", iconType: "symbol", color: "#23292F", onChain: false, decimals: 6 },
  SOL: { name: "Solana", icon: "◎", iconType: "symbol", color: "#9945FF", onChain: false, decimals: 9 },
};

const TRANSFERABLE_TOKENS: TokenType[] = ["AUXG", "AUXS", "AUXPT", "AUXPD", "ETH", "USDT", "BTC", "XRP", "SOL"];
const METAL_TOKENS: TokenType[] = ["AUXG", "AUXS", "AUXPT", "AUXPD"];

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
    available: "Kullanılabilir",
    locked: "Kilitli",
    send: "Gönder",
    sending: "Gönderiliyor...",
    confirming: "Onay bekleniyor...",
    success: "Transfer Başarılı!",
    error: "Transfer Başarısız",
    insufficientBalance: "Yetersiz bakiye",
    invalidAddress: "Geçersiz adres",
    cancel: "İptal",
    signTransaction: "Cüzdanınızda işlemi onaylayın",
    onChainNote: "On-chain transfer - Cüzdanınızda imzalamanız gerekecek",
    metalNote: "Metal transferi sadece kayıtlı Auxite kullanıcılarına yapılabilir",
    checkingRecipient: "Kontrol ediliyor...",
    auxiteUser: "Auxite kullanıcısı ✓",
    notAuxiteUser: "Alıcı Auxite kullanıcısı değil",
    twoFaCode: "2FA Doğrulama Kodu",
    twoFaRequired: "2FA kodu gerekli",
    twoFaNotEnabled: "Transfer için 2FA zorunludur. Lütfen Güvenlik ayarlarından 2FA'yı aktif edin.",
    enable2FA: "2FA'yı Aktif Et",
  },
  en: {
    title: "Transfer",
    subtitle: "Send assets to another wallet",
    selectToken: "Select Token",
    recipientAddress: "Recipient Address",
    amount: "Amount",
    balance: "Balance",
    available: "Available",
    locked: "Locked",
    send: "Send",
    sending: "Sending...",
    confirming: "Confirming...",
    success: "Transfer Successful!",
    error: "Transfer Failed",
    insufficientBalance: "Insufficient balance",
    invalidAddress: "Invalid address",
    cancel: "Cancel",
    signTransaction: "Please confirm the transaction in your wallet",
    onChainNote: "On-chain transfer - You will need to sign in your wallet",
    metalNote: "Metal transfers can only be made to registered Auxite users",
    checkingRecipient: "Checking...",
    auxiteUser: "Auxite user ✓",
    notAuxiteUser: "Recipient is not an Auxite user",
    twoFaCode: "2FA Verification Code",
    twoFaRequired: "2FA code required",
    twoFaNotEnabled: "2FA is required for transfers. Please enable 2FA in Security settings.",
    enable2FA: "Enable 2FA",
  },
};

export function TransferModal({ isOpen, onClose, lang = "en" }: TransferModalProps) {
  const t = translations[lang] || translations.en;
  const { balances, refreshBalances, address } = useWallet();
  const { isConnected } = useAccount();
  const { allocations, totalGrams, refresh: refreshAllocations } = useAllocations();
  
  // All useState hooks at the top
  const [selectedToken, setSelectedToken] = useState<TokenType>("ETH");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [onChainBalances, setOnChainBalances] = useState<Record<string, number>>({});
  const [isCheckingRecipient, setIsCheckingRecipient] = useState(false);
  const [recipientValid, setRecipientValid] = useState<boolean | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [requires2FA, setRequires2FA] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);

  const { writeContract, isPending: isWritePending, data: writeData } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  // Check if 2FA is enabled for user
  useEffect(() => {
    if (!address || !isOpen) return;
    setRequires2FA(false);
    fetch(`/api/security/2fa?address=${address}`)
      .then(res => res.json())
      .then(data => setIs2FAEnabled(data.enabled))
      .catch(() => setIs2FAEnabled(false));
  }, [address, isOpen]);

  // Fetch on-chain balances
  useEffect(() => {
    if (!address || !isOpen) return;
    const fetchOnChainBalances = async () => {
      try {
        const res = await fetch(`/api/user/balance?address=${address}`);
        const data = await res.json();
        if (data.onChainBalances) {
          setOnChainBalances(data.onChainBalances);
        }
      } catch (e) {
        console.error("Failed to fetch on-chain balances:", e);
      }
    };
    fetchOnChainBalances();
  }, [address, isOpen]);

  // Track write transaction
  useEffect(() => {
    if (writeData) setTxHash(writeData);
  }, [writeData]);

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed && txHash) {
      setResult("success");
      setIsProcessing(false);
      setTimeout(async () => {
        if (refreshBalances) await refreshBalances();
        if (refreshAllocations) await refreshAllocations();
      }, 2000);
    }
  }, [isConfirmed, txHash, refreshBalances, refreshAllocations]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setSelectedToken("ETH");
      setRecipientAddress("");
      setAmount("");
      setResult(null);
      setErrorMessage("");
      setTxHash(undefined);
      setRecipientValid(null);
      setTwoFactorCode("");
      setRequires2FA(false);
    }
  }, [isOpen]);

  // Check if recipient is Auxite user (for metals)
  useEffect(() => {
    if (!isOpen) return;
    
    const isMetal = METAL_TOKENS.includes(selectedToken);
    const validAddress = recipientAddress.length >= 42 && recipientAddress.startsWith("0x");
    
    if (!isMetal || !validAddress) {
      setRecipientValid(null);
      setIsCheckingRecipient(false);
      return;
    }
    
    setIsCheckingRecipient(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/user/check?address=${recipientAddress}`);
        const data = await res.json();
        setRecipientValid(data.exists === true);
      } catch {
        setRecipientValid(false);
      }
      setIsCheckingRecipient(false);
    }, 500);
    
    return () => clearTimeout(timeout);
  }, [isOpen, recipientAddress, selectedToken]);

  // Early return after all hooks
  if (!isOpen) return null;

  const tokenInfo = TOKEN_INFO[selectedToken];
  const amountNum = parseFloat(amount) || 0;
  const isMetal = METAL_TOKENS.includes(selectedToken);
  
  const getLockedAmount = (token: TokenType): number => {
    if (!METAL_TOKENS.includes(token)) return 0;
    return totalGrams[token] || 0;
  };

  const getOnChainBalance = (token: TokenType): number => {
    return onChainBalances[token.toLowerCase()] || 0;
  };

  const getAvailableBalance = (token: TokenType): number => {
    const info = TOKEN_INFO[token];
    if (info.onChain && info.address) {
      return getOnChainBalance(token);
    }
    if (!balances) return 0;
    const key = token.toLowerCase() as keyof typeof balances;
    return parseFloat(String(balances[key] || 0));
  };

  const availableBalance = getAvailableBalance(selectedToken);
  const lockedAmount = getLockedAmount(selectedToken);
  const canAfford = amountNum > 0 && amountNum <= availableBalance;
  const isValidAddress = recipientAddress.length >= 42 && recipientAddress.startsWith("0x");
  const canSend = canAfford && isValidAddress && amountNum > 0 && !!address && (!isMetal || recipientValid === true);

  const handleMaxClick = () => {
    setAmount(availableBalance.toString());
  };

  const handleTransfer = async () => {
    if (!canSend || !address) return;
    
    setIsProcessing(true);
    setErrorMessage("");
    
    try {
      // Metal transfer - allocation da transfer edilir
      if (isMetal) {
        // Önce allocation transfer
        const metalAllocations = allocations.filter(a => a.metalSymbol === selectedToken && a.active);
        if (metalAllocations.length > 0) {
          const allocResponse = await fetch("/api/allocations", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fromAddress: address,
              toAddress: recipientAddress,
              allocationId: metalAllocations[0].id,
              grams: amountNum,
            }),
          });
          const allocData = await allocResponse.json();
          
          if (!allocData.success) {
            throw new Error(allocData.error || "Allocation transfer failed");
          }
        }
        
        // Sonra on-chain token transfer
        const amountInUnits = parseUnits(amount, tokenInfo.decimals);
        writeContract({
          address: tokenInfo.address as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "transfer",
          args: [recipientAddress as `0x${string}`, amountInUnits],
          gas: BigInt(200000),
        });
      } 
      // On-chain kripto transfer
      else if (tokenInfo.onChain && tokenInfo.address) {
        const amountInUnits = parseUnits(amount, tokenInfo.decimals);
        writeContract({
          address: tokenInfo.address as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "transfer",
          args: [recipientAddress as `0x${string}`, amountInUnits],
          gas: BigInt(200000),
        });
      } 
      // Off-chain transfer (BTC, XRP, SOL)
      else {
        const response = await fetch("/api/transfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fromAddress: address,
            toAddress: recipientAddress,
            token: selectedToken,
            amount: amountNum,
            twoFactorCode: is2FAEnabled ? twoFactorCode : undefined,
          }),
        });
        const data = await response.json();
        
        if (data.requires2FA) {
          setRequires2FA(true);
          setIsProcessing(false);
          return;
        }
        
        if (data.success) {
          setResult("success");
          if (refreshBalances) await refreshBalances();
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
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: info.color }}>
        {info.icon}
      </div>
    );
  };

  // Processing screen
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
          <p className="text-slate-600 dark:text-slate-400 mb-4">{amountNum.toFixed(4)} {selectedToken}</p>
          {txHash && (
            <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-sm">
              View on Etherscan
            </a>
          )}
        </div>
      </div>
    );
  }

  // Result screen
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
          <p className="text-slate-600 dark:text-slate-400 mb-2">{amountNum.toFixed(4)} {selectedToken}</p>
          {errorMessage && <p className="text-red-500 text-sm mb-4">{errorMessage}</p>}
          {txHash && result === "success" && (
            <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-sm block mb-4">
              View on Etherscan
            </a>
          )}
          <button onClick={onClose} className="px-6 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
            {t.cancel}
          </button>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-300 dark:border-slate-700 max-w-md w-full p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">{t.title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t.subtitle}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-200 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Token Selection */}
        <div className="mb-4">
          <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">{t.selectToken}</label>
          <div className="grid grid-cols-5 gap-2">
            {TRANSFERABLE_TOKENS.map((token) => (
              <button
                key={token}
                onClick={() => setSelectedToken(token)}
                className={`p-2 rounded-lg border flex flex-col items-center gap-1 transition-all ${selectedToken === token ? "border-blue-500 bg-blue-50 dark:bg-blue-500/20" : "border-stone-300 dark:border-slate-700 hover:border-stone-400 dark:hover:border-slate-600"}`}
              >
                {renderTokenIcon(token)}
                <span className="text-[10px] text-slate-700 dark:text-slate-300">{token}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Metal Notice */}
        {isMetal && (
          <div className="mb-4 p-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg">
            <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t.metalNote}
            </p>
          </div>
        )}

        {/* On-chain Notice */}
        {tokenInfo.onChain && !isMetal && (
          <div className="mb-4 p-2 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg">
            <p className="text-xs text-blue-700 dark:text-blue-400 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {t.onChainNote}
            </p>
          </div>
        )}

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
          {isMetal && isValidAddress && (
            <div className="mt-2">
              {isCheckingRecipient ? (
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t.checkingRecipient}
                </p>
              ) : recipientValid === true ? (
                <p className="text-xs text-emerald-500 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t.auxiteUser}
                </p>
              ) : recipientValid === false ? (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {t.notAuxiteUser}
                </p>
              ) : null}
            </div>
          )}
        </div>

        {/* Amount */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-slate-600 dark:text-slate-400">{t.amount}</label>
            <span className="text-xs text-slate-500">{t.balance}: {availableBalance.toFixed(4)} {selectedToken}</span>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 bg-stone-100 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
            />
            <button onClick={handleMaxClick} className="px-4 py-3 bg-stone-100 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-xl text-emerald-600 dark:text-emerald-500 font-medium hover:bg-stone-200 dark:hover:bg-slate-700 transition-colors">
              MAX
            </button>
          </div>
          {amountNum > 0 && !canAfford && (
            <p className="text-xs text-red-500 mt-1">{t.insufficientBalance}</p>
          )}
        </div>

        {/* 2FA Section - Always show, required for transfers */}
        <div className="mb-4">
          {is2FAEnabled ? (
            <>
              <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">🔐 {t.twoFaCode}</label>
              <input
                type="text"
                inputMode="numeric"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full bg-stone-100 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-white text-center text-lg tracking-widest font-mono"
              />
              {requires2FA && (
                <p className="text-xs text-red-500 mt-2">{t.twoFaRequired}</p>
              )}
            </>
          ) : (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🔒</span>
                <div className="flex-1">
                  <p className="text-sm text-amber-800 dark:text-amber-200 font-medium mb-2">
                    {t.twoFaNotEnabled}
                  </p>
                  <a
                    href="/profile"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    🔐 {t.enable2FA}
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Send Button */}
        <button
          onClick={handleTransfer}
          disabled={!canSend || isProcessing || !is2FAEnabled || twoFactorCode.length !== 6}
          className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {t.sending}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              {t.send}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

export default TransferModal;
