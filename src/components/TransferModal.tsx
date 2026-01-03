"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/components/WalletContext";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { useAllocations } from "@/hooks/useAllocations";

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
  AUXG: { name: "Gold", icon: "/gold-favicon-32x32.png", iconType: "image", color: "#F59E0B", onChain: true, decimals: 3, address: "0xD14D32B1e03B3027D1f8381EeeC567e147De9CCe" },
  AUXS: { name: "Silver", icon: "/silver-favicon-32x32.png", iconType: "image", color: "#94A3B8", onChain: true, decimals: 3, address: "0xc924EE950BF5A5Fbe3c26eECB27D99031B441caD" },
  AUXPT: { name: "Platinum", icon: "/platinum-favicon-32x32.png", iconType: "image", color: "#CBD5E1", onChain: true, decimals: 3, address: "0x37402EA435a91567223C132414C3A50C6bBc7200" },
  AUXPD: { name: "Palladium", icon: "/palladium-favicon-32x32.png", iconType: "image", color: "#64748B", onChain: true, decimals: 3, address: "0x6026338B9Bfd94fed07EA61cbE60b15e300911DC" },
  AUXM: { name: "Auxite Money", icon: "◈", iconType: "symbol", color: "#A855F7", onChain: false, decimals: 2 },
  ETH: { name: "Ethereum", icon: "Ξ", iconType: "symbol", color: "#627EEA", onChain: true, decimals: 18 },
  USDT: { name: "Tether", icon: "₮", iconType: "symbol", color: "#26A17B", onChain: true, decimals: 6, address: "0x7169D38820dfd117C3FA1f22a697dBA58d90BA06" },
  BTC: { name: "Bitcoin", icon: "₿", iconType: "symbol", color: "#F7931A", onChain: false, decimals: 8 },
  XRP: { name: "Ripple", icon: "✕", iconType: "symbol", color: "#23292F", onChain: false, decimals: 6 },
  SOL: { name: "Solana", icon: "◎", iconType: "symbol", color: "#9945FF", onChain: false, decimals: 9 },
};

const METAL_TOKENS: TokenType[] = ["AUXG", "AUXS", "AUXPT", "AUXPD"];
const TRANSFERABLE_TOKENS: TokenType[] = ["ETH", "USDT", "BTC", "XRP", "SOL"];

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
    networkFee: "Ağ Ücreti",
    send: "Gönder",
    sending: "Gönderiliyor...",
    confirming: "Onay bekleniyor...",
    success: "Transfer Başarılı!",
    error: "Transfer Başarısız",
    insufficientBalance: "Yetersiz bakiye",
    invalidAddress: "Geçersiz adres",
    cancel: "İptal",
    walletNotConnected: "Cüzdan bağlı değil",
    signTransaction: "Cüzdanınızda işlemi onaylayın",
    onChainNote: "On-chain transfer - Cüzdanınızda imzalamanız gerekecek",
    unlockRequired: "Transfer için önce varlıklarınızı kiltten çıkarmanız gerekiyor",
    unlock: "Kilidi Aç",
    unlocking: "Kilit açılıyor...",
    unlockSuccess: "Kilit açıldı!",
    unlockAmount: "Açılacak Miktar",
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
    networkFee: "Network Fee",
    send: "Send",
    sending: "Sending...",
    confirming: "Confirming...",
    success: "Transfer Successful!",
    error: "Transfer Failed",
    insufficientBalance: "Insufficient balance",
    invalidAddress: "Invalid address",
    cancel: "Cancel",
    walletNotConnected: "Wallet not connected",
    signTransaction: "Please confirm the transaction in your wallet",
    onChainNote: "On-chain transfer - You will need to sign in your wallet",
    unlockRequired: "You need to unlock your assets before transferring",
    unlock: "Unlock",
    unlocking: "Unlocking...",
    unlockSuccess: "Unlocked!",
    unlockAmount: "Amount to Unlock",
  },
};

export function TransferModal({ isOpen, onClose, lang = "en" }: TransferModalProps) {
  const t = translations[lang] || translations.en;
  const { balances, refreshBalances, address } = useWallet();
  const { isConnected } = useAccount();
  const { allocations, totalGrams, refresh: refreshAllocations } = useAllocations();
  
  const [selectedToken, setSelectedToken] = useState<TokenType>("ETH");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [onChainBalances, setOnChainBalances] = useState<Record<string, number>>({});
  
  // Unlock states
  const [showUnlockFlow, setShowUnlockFlow] = useState(false);
  const [unlockAmount, setUnlockAmount] = useState("");
  const [selectedAllocationId, setSelectedAllocationId] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isCheckingRecipient, setIsCheckingRecipient] = useState(false);
  const [recipientValid, setRecipientValid] = useState<boolean | null>(null);

  const { writeContract, isPending: isWritePending, data: writeData } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Fetch on-chain balances
  useEffect(() => {
    const fetchOnChainBalances = async () => {
      if (!address) return;
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
      setShowUnlockFlow(false);
      setUnlockAmount("");
    }
  }, [isOpen]);

  // Auto-select allocation and check recipient
  useEffect(() => {
    if (!isOpen) return;
    
    // Auto-select first allocation for metals
    const currentIsMetal = METAL_TOKENS.includes(selectedToken);
    if (currentIsMetal && allocations.length > 0) {
      const metalAllocs = allocations.filter(a => a.metalSymbol === selectedToken && a.active === true);
      if (metalAllocs.length > 0 && !selectedAllocationId) {
        setSelectedAllocationId(metalAllocs[0].id);
      }
    }
    if (!currentIsMetal) {
      setSelectedAllocationId(null);
    }
  }, [isOpen, selectedToken, allocations, selectedAllocationId]);

  // Check if recipient is Auxite user (for metals)
  useEffect(() => {
    if (!isOpen) return;
    
    const currentIsMetal = METAL_TOKENS.includes(selectedToken);
    const validAddress = recipientAddress.length >= 42 && recipientAddress.startsWith("0x");
    
    if (!currentIsMetal || !validAddress) {
      setRecipientValid(null);
      return;
    }
    
    const checkRecipient = async () => {
      setIsCheckingRecipient(true);
      try {
        const res = await fetch(`/api/user/check?address=${recipientAddress}`);
        const data = await res.json();
        setRecipientValid(data.exists === true);
      } catch {
        setRecipientValid(false);
      }
      setIsCheckingRecipient(false);
    };
    
    const timeout = setTimeout(checkRecipient, 500);
    return () => clearTimeout(timeout);
  }, [isOpen, recipientAddress, selectedToken]);

  if (!isOpen) return null;

  const tokenInfo = TOKEN_INFO[selectedToken];
  const amountNum = parseFloat(amount) || 0;
  const isMetal = METAL_TOKENS.includes(selectedToken);
  
  // Get locked amount for metals
  const getLockedAmount = (token: TokenType): number => {
    if (!isMetal) return 0;
    return totalGrams[token] || 0;
  };

  // Get on-chain balance
  const getOnChainBalance = (token: TokenType): number => {
    const key = token.toLowerCase();
    return onChainBalances[key] || 0;
  };

  // Get available (unlocked) balance for transfer
  const getAvailableBalance = (token: TokenType): number => {
    const info = TOKEN_INFO[token];
    if (info.onChain && info.address) {
      const onChain = getOnChainBalance(token);
      const locked = getLockedAmount(token);
      return Math.max(0, onChain - locked);
    }
    if (!balances) return 0;
    const key = token.toLowerCase() as keyof typeof balances;
    return parseFloat(String(balances[key] || 0));
  };

  const lockedAmount = getLockedAmount(selectedToken);
  const onChainBalance = getOnChainBalance(selectedToken);
  const availableBalance = getAvailableBalance(selectedToken);
  const canAfford = amountNum > 0 && amountNum <= availableBalance;
  const isValidAddress = recipientAddress.length >= 42 && recipientAddress.startsWith("0x");
  
  const canSend = canAfford && isValidAddress && amountNum > 0 && !!address && (!isMetal || recipientValid === true) && (!isMetal || selectedAllocationId);
  const needsUnlock = isMetal && amountNum > availableBalance && amountNum <= onChainBalance;

  // Get allocations for selected metal
  const metalAllocations = allocations.filter(a => a.metalSymbol === selectedToken && a.active === true);
  
    setAmount(availableBalance.toString());
  };

  const handleUnlock = async () => {
    if (!address || !unlockAmount) return;
    
    const unlockAmountNum = parseFloat(unlockAmount);
    if (unlockAmountNum <= 0 || unlockAmountNum > lockedAmount) return;
    
    setIsUnlocking(true);
    
    try {
      // Find allocations to release
      const metalAllocations = allocations.filter(a => a.metalSymbol === selectedToken);
      let remainingToUnlock = unlockAmountNum;
      
      for (const alloc of metalAllocations) {
        if (remainingToUnlock <= 0) break;
        
        const releaseAmount = Math.min(alloc.grams, remainingToUnlock);
        
        const res = await fetch(`/api/allocations?address=${address}&id=${alloc.id}&grams=${releaseAmount}`, {
          method: "DELETE",
        });
        
        const data = await res.json();
        if (data.success) {
          remainingToUnlock -= releaseAmount;
        }
      }
      
      // Refresh allocations and balances
      await refreshAllocations();
      if (refreshBalances) await refreshBalances();
      
      // Refetch on-chain balances
      const res = await fetch(`/api/user/balance?address=${address}`);
      const data = await res.json();
      if (data.onChainBalances) {
        setOnChainBalances(data.onChainBalances);
      }
      
      setShowUnlockFlow(false);
      setUnlockAmount("");
      
    } catch (error: any) {
      console.error("Unlock error:", error);
      setErrorMessage(error.message || "Unlock failed");
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleTransfer = async () => {
    if (!canSend || !address) return;
    
    setIsProcessing(true);
    setErrorMessage("");
    
    try {
      // Metal transfer için: önce alıcının Auxite kullanıcısı olup olmadığını kontrol et
      if (isMetal) {
        // Allocation transfer et
        const allocResponse = await fetch("/api/allocations", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fromAddress: address,
            toAddress: recipientAddress,
            allocationId: selectedAllocationId, // Transfer edilecek allocation
            grams: amountNum,
          }),
        });
        const allocData = await allocResponse.json();
        
        if (!allocData.success) {
          if (allocData.code === 'RECIPIENT_NOT_REGISTERED') {
            throw new Error(lang === 'tr' 
              ? 'Alıcı Auxite kullanıcısı değil. Metaller sadece kayıtlı Auxite kullanıcılarına transfer edilebilir.'
              : 'Recipient is not an Auxite user. Metals can only be transferred to registered Auxite users.');
          }
          throw new Error(allocData.error || "Allocation transfer failed");
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
      } else if (tokenInfo.onChain && tokenInfo.address) {
        // Kripto transfer (sadece on-chain)
        const amountInUnits = parseUnits(amount, tokenInfo.decimals);
        writeContract({
          address: tokenInfo.address as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "transfer",
          args: [recipientAddress as `0x${string}`, amountInUnits],
          gas: BigInt(200000),
        });
      } else {
        // Off-chain transfer (BTC, XRP, SOL)
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
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: info.color }}>
        {info.icon}
      </div>
    );
  };

  // Unlock Flow Screen
  if (showUnlockFlow) {
    return (
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-300 dark:border-slate-700 max-w-md w-full p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">{t.unlock} {selectedToken}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.unlockRequired}</p>
            </div>
            <button onClick={() => setShowUnlockFlow(false)} className="p-2 hover:bg-stone-200 dark:hover:bg-slate-800 rounded-lg">
              <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m5.657-9.657a8 8 0 11-14.142 0m14.142 0A8 8 0 0012 3v0m0 10.243V9" />
              </svg>
              <span className="text-sm font-medium">{t.locked}: {lockedAmount.toFixed(4)} {selectedToken}</span>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">{t.unlockAmount}</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={unlockAmount}
                onChange={(e) => setUnlockAmount(e.target.value)}
                placeholder="0.00"
                max={lockedAmount}
                className="flex-1 bg-stone-100 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-white"
              />
              <button
                onClick={() => setUnlockAmount(lockedAmount.toString())}
                className="px-4 py-3 bg-stone-100 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-xl text-emerald-600 dark:text-emerald-500 font-medium"
              >
                MAX
              </button>
            </div>
          </div>
          
          <button
            onClick={handleUnlock}
            disabled={isUnlocking || !unlockAmount || parseFloat(unlockAmount) <= 0}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2"
          >
            {isUnlocking ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t.unlocking}
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
                {t.unlock}
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

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
            <a href={"https://sepolia.etherscan.io/tx/" + txHash} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-sm">
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
          <div className={"w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center " + (result === "success" ? "bg-emerald-500" : "bg-red-500")}>
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
          <h3 className={"text-xl font-bold mb-2 " + (result === "success" ? "text-emerald-500" : "text-red-500")}>
            {result === "success" ? t.success : t.error}
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-2">{amountNum.toFixed(4)} {selectedToken}</p>
          {errorMessage && <p className="text-red-500 text-sm mb-4">{errorMessage}</p>}
          {txHash && result === "success" && (
            <a href={"https://sepolia.etherscan.io/tx/" + txHash} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-sm block mb-4">
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

        <div className="mb-4">
          <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">{t.selectToken}</label>
          <div className="grid grid-cols-5 gap-2">
            {(TRANSFERABLE_TOKENS).map((token) => (
              <button
                key={token}
                onClick={() => setSelectedToken(token)}
                className={"p-2 rounded-lg border flex flex-col items-center gap-1 transition-all " + (selectedToken === token ? "border-blue-500 bg-blue-50 dark:bg-blue-500/20" : "border-stone-300 dark:border-slate-700 hover:border-stone-400 dark:hover:border-slate-600")}
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

        {/* Locked/Available Balance for Metals */}
        {isMetal && lockedAmount > 0 && (
          <div className="mb-4 p-3 bg-stone-100 dark:bg-slate-800 rounded-xl border border-stone-200 dark:border-slate-700">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-600 dark:text-slate-400">{t.balance}:</span>
              <span className="text-slate-800 dark:text-white">{onChainBalance.toFixed(4)} {selectedToken}</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                {t.locked}:
              </span>
              <span className="text-amber-600 dark:text-amber-400">{lockedAmount.toFixed(4)} {selectedToken}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-emerald-600 dark:text-emerald-400">{t.available}:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">{availableBalance.toFixed(4)} {selectedToken}</span>
            </div>
            {availableBalance < onChainBalance && (
              <button
                onClick={() => setShowUnlockFlow(true)}
                className="mt-2 w-full py-2 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-600 dark:text-amber-400 text-sm font-medium hover:bg-amber-500/30 transition-colors flex items-center justify-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
                {t.unlock}
              </button>
            )}
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
          {recipientAddress && !isValidAddress && <p className="text-xs text-red-500 mt-1">{t.invalidAddress}</p>}
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-slate-600 dark:text-slate-400">{t.amount}</label>
            {!isMetal && (
              <span className="text-xs text-slate-500">{t.balance}: {availableBalance.toFixed(4)} {selectedToken}</span>
            )}
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
          {amountNum > 0 && !canAfford && !needsUnlock && (
            <p className="text-xs text-red-500 mt-1">{t.insufficientBalance}</p>
          )}
          {needsUnlock && (
            <p className="text-xs text-amber-500 mt-1">{t.unlockRequired}</p>
          )}
        </div>

        <div className="bg-stone-100 dark:bg-slate-800/50 rounded-xl p-3 mb-4 border border-stone-200 dark:border-slate-700">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">{t.networkFee}</span>
            <span className="text-slate-700 dark:text-slate-300">{tokenInfo.onChain ? "~$0.50 (gas)" : "0 (Off-chain)"}</span>
          </div>
        </div>

        {!address && (
          <div className="bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/50 rounded-xl p-3 mb-4">
            <p className="text-amber-700 dark:text-amber-400 text-sm">{t.walletNotConnected}</p>
          </div>
        )}

        <button
          onClick={needsUnlock ? () => setShowUnlockFlow(true) : handleTransfer}
          disabled={(!canSend && !needsUnlock) || isProcessing}
          className={"w-full py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 " + 
            (needsUnlock 
              ? "bg-amber-500 hover:bg-amber-600 text-white" 
              : "bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white"
            )}
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {t.sending}
            </span>
          ) : needsUnlock ? (
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
              {t.unlock}
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
