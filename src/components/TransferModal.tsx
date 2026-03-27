"use client";

import { useState, useEffect } from "react";
import { formatAmount, getDecimalPlaces } from '@/lib/format';
import { useWallet } from "@/components/WalletContext";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSendTransaction } from "wagmi";
import { parseUnits, parseEther } from "viem";
import { useAllocations } from "@/hooks/useAllocations";
import { METAL_TOKENS as METAL_TOKEN_ADDRESSES, USDT_ADDRESS } from "@/config/contracts-v8";
import { TwoFactorGate } from "@/components/TwoFactorGate";
import { useLanguage } from "@/components/LanguageContext";

type TokenType = "AUXG" | "AUXS" | "AUXPT" | "AUXPD" | "ETH" | "USDT" | "BTC" | "XRP" | "SOL";

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: string;
}

const TOKEN_INFO: Record<TokenType, { 
  name: string; icon: string; iconType: "image" | "symbol"; color: string; 
  onChain: boolean; decimals: number; address?: string; isMetal?: boolean;
}> = {
  AUXG: { name: "Gold", icon: "/auxg_icon.png", iconType: "image", color: "#F59E0B", onChain: true, decimals: 3, address: METAL_TOKEN_ADDRESSES.AUXG, isMetal: true },
  AUXS: { name: "Silver", icon: "/auxs_icon.png", iconType: "image", color: "#94A3B8", onChain: true, decimals: 3, address: METAL_TOKEN_ADDRESSES.AUXS, isMetal: true },
  AUXPT: { name: "Platinum", icon: "/auxpt_icon.png", iconType: "image", color: "#CBD5E1", onChain: true, decimals: 3, address: METAL_TOKEN_ADDRESSES.AUXPT, isMetal: true },
  AUXPD: { name: "Palladium", icon: "/auxpd_icon.png", iconType: "image", color: "#64748B", onChain: true, decimals: 3, address: METAL_TOKEN_ADDRESSES.AUXPD, isMetal: true },
  ETH: { name: "Ethereum", icon: "Ξ", iconType: "symbol", color: "#627EEA", onChain: true, decimals: 18 },
  USDT: { name: "Tether", icon: "₮", iconType: "symbol", color: "#26A17B", onChain: true, decimals: 6, address: USDT_ADDRESS },
  BTC: { name: "Bitcoin", icon: "₿", iconType: "symbol", color: "#F7931A", onChain: false, decimals: 8 },
  XRP: { name: "Ripple", icon: "✕", iconType: "symbol", color: "#23292F", onChain: false, decimals: 6 },
  SOL: { name: "Solana", icon: "◎", iconType: "symbol", color: "#9945FF", onChain: false, decimals: 9 },
};

const TRANSFERABLE_TOKENS: TokenType[] = ["AUXG", "AUXS", "AUXPT", "AUXPD", "ETH", "USDT", "BTC", "XRP", "SOL"];
const METAL_TOKENS: TokenType[] = ["AUXG", "AUXS", "AUXPT", "AUXPD"];

const ERC20_ABI = [
  { name: "transfer", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ type: "bool" }] }
] as const;

const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "Transfer", subtitle: "Varlıklarınızı başka bir cüzdana gönderin", selectToken: "Token Seç",
    recipientAddress: "Alıcı Adresi", amount: "Miktar", balance: "Bakiye", send: "Gönder",
    sending: "Gönderiliyor...", success: "Transfer Başarılı!", error: "Transfer Başarısız",
    insufficientBalance: "Yetersiz bakiye", invalidAddress: "Geçersiz adres", cancel: "Kapat",
    onChainNote: "On-chain transfer - Cüzdanınızda imzalamanız gerekecek",
    metalNote: "Metal transferi sadece kayıtlı Auxite kullanıcılarına yapılabilir",
    checkingRecipient: "Kontrol ediliyor...", auxiteUser: "Auxite kullanıcısı ✓",
    notAuxiteUser: "Alıcı Auxite kullanıcısı değil",
    sent: "gönderildi",
    txRejected: "İşlem kullanıcı tarafından reddedildi",
    insufficientGas: "Yetersiz bakiye (gas dahil)",
    connectWallet: "Cüzdanınızı bağlayın",
    metalTransferFailed: "Metal transferi başarısız",
    allocationTransferFailed: "Tahsis transferi başarısız",
    ethTransferFailed: "ETH transferi başarısız",
    transferFailed: "Transfer başarısız",
  },
  en: {
    title: "Transfer", subtitle: "Send assets to another wallet", selectToken: "Select Token",
    recipientAddress: "Recipient Address", amount: "Amount", balance: "Balance", send: "Send",
    sending: "Sending...", success: "Transfer Successful!", error: "Transfer Failed",
    insufficientBalance: "Insufficient balance", invalidAddress: "Invalid address", cancel: "Close",
    onChainNote: "On-chain transfer - You will need to sign in your wallet",
    metalNote: "Metal transfers can only be made to registered Auxite users",
    checkingRecipient: "Checking...", auxiteUser: "Auxite user ✓",
    notAuxiteUser: "Recipient is not an Auxite user",
    sent: "sent",
    txRejected: "Transaction rejected by user",
    insufficientGas: "Insufficient funds (including gas)",
    connectWallet: "Please connect your wallet",
    metalTransferFailed: "Metal transfer failed",
    allocationTransferFailed: "Allocation transfer failed",
    ethTransferFailed: "ETH transfer failed",
    transferFailed: "Transfer failed",
  },
  de: {
    title: "Überweisung", subtitle: "Vermögenswerte an eine andere Wallet senden", selectToken: "Token Auswählen",
    recipientAddress: "Empfängeradresse", amount: "Betrag", balance: "Guthaben", send: "Senden",
    sending: "Wird gesendet...", success: "Überweisung Erfolgreich!", error: "Überweisung Fehlgeschlagen",
    insufficientBalance: "Unzureichendes Guthaben", invalidAddress: "Ungültige Adresse", cancel: "Schließen",
    onChainNote: "On-Chain-Überweisung - Sie müssen in Ihrer Wallet signieren",
    metalNote: "Metalltransfers können nur an registrierte Auxite-Benutzer erfolgen",
    checkingRecipient: "Wird überprüft...", auxiteUser: "Auxite-Benutzer ✓",
    notAuxiteUser: "Empfänger ist kein Auxite-Benutzer",
    sent: "gesendet",
    txRejected: "Transaktion vom Benutzer abgelehnt",
    insufficientGas: "Unzureichendes Guthaben (einschließlich Gas)",
    connectWallet: "Bitte verbinden Sie Ihre Wallet",
    metalTransferFailed: "Metalltransfer fehlgeschlagen",
    allocationTransferFailed: "Allokationstransfer fehlgeschlagen",
    ethTransferFailed: "ETH-Überweisung fehlgeschlagen",
    transferFailed: "Überweisung fehlgeschlagen",
  },
  fr: {
    title: "Transfert", subtitle: "Envoyer des actifs vers un autre portefeuille", selectToken: "Sélectionner un Token",
    recipientAddress: "Adresse du Destinataire", amount: "Montant", balance: "Solde", send: "Envoyer",
    sending: "Envoi en cours...", success: "Transfert Réussi!", error: "Transfert Échoué",
    insufficientBalance: "Solde insuffisant", invalidAddress: "Adresse invalide", cancel: "Fermer",
    onChainNote: "Transfert on-chain - Vous devrez signer dans votre portefeuille",
    metalNote: "Les transferts de métaux ne peuvent être effectués qu'aux utilisateurs Auxite enregistrés",
    checkingRecipient: "Vérification...", auxiteUser: "Utilisateur Auxite ✓",
    notAuxiteUser: "Le destinataire n'est pas un utilisateur Auxite",
    sent: "envoyé",
    txRejected: "Transaction rejetée par l'utilisateur",
    insufficientGas: "Fonds insuffisants (frais de gas inclus)",
    connectWallet: "Veuillez connecter votre portefeuille",
    metalTransferFailed: "Échec du transfert de métal",
    allocationTransferFailed: "Échec du transfert d'allocation",
    ethTransferFailed: "Échec du transfert ETH",
    transferFailed: "Échec du transfert",
  },
  ar: {
    title: "تحويل", subtitle: "إرسال الأصول إلى محفظة أخرى", selectToken: "اختر التوكن",
    recipientAddress: "عنوان المستلم", amount: "المبلغ", balance: "الرصيد", send: "إرسال",
    sending: "جارٍ الإرسال...", success: "تم التحويل بنجاح!", error: "فشل التحويل",
    insufficientBalance: "رصيد غير كافٍ", invalidAddress: "عنوان غير صالح", cancel: "إغلاق",
    onChainNote: "تحويل على السلسلة - ستحتاج إلى التوقيع في محفظتك",
    metalNote: "يمكن إجراء تحويلات المعادن فقط إلى مستخدمي Auxite المسجلين",
    checkingRecipient: "جارٍ التحقق...", auxiteUser: "مستخدم Auxite ✓",
    notAuxiteUser: "المستلم ليس مستخدم Auxite",
    sent: "تم الإرسال",
    txRejected: "تم رفض المعاملة من قبل المستخدم",
    insufficientGas: "رصيد غير كافٍ (بما في ذلك الغاز)",
    connectWallet: "يرجى توصيل محفظتك",
    metalTransferFailed: "فشل تحويل المعدن",
    allocationTransferFailed: "فشل تحويل التخصيص",
    ethTransferFailed: "فشل تحويل ETH",
    transferFailed: "فشل التحويل",
  },
  ru: {
    title: "Перевод", subtitle: "Отправить активы на другой кошелёк", selectToken: "Выбрать Токен",
    recipientAddress: "Адрес Получателя", amount: "Сумма", balance: "Баланс", send: "Отправить",
    sending: "Отправка...", success: "Перевод Выполнен!", error: "Перевод Не Удался",
    insufficientBalance: "Недостаточный баланс", invalidAddress: "Недействительный адрес", cancel: "Закрыть",
    onChainNote: "Перевод в блокчейне - Вам потребуется подписать в кошельке",
    metalNote: "Переводы металлов возможны только зарегистрированным пользователям Auxite",
    checkingRecipient: "Проверка...", auxiteUser: "Пользователь Auxite ✓",
    notAuxiteUser: "Получатель не является пользователем Auxite",
    sent: "отправлено",
    txRejected: "Транзакция отклонена пользователем",
    insufficientGas: "Недостаточно средств (включая газ)",
    connectWallet: "Пожалуйста, подключите ваш кошелёк",
    metalTransferFailed: "Ошибка перевода металла",
    allocationTransferFailed: "Ошибка перевода распределения",
    ethTransferFailed: "Ошибка перевода ETH",
    transferFailed: "Ошибка перевода",
  },
};

export function TransferModal({ isOpen, onClose, lang: propLang }: TransferModalProps) {
  const { lang: contextLang } = useLanguage();
  const lang = propLang || contextLang || "en";
  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;
  const { balances, refreshBalances, address } = useWallet();
  const { isConnected } = useAccount();
  const { allocations, totalGrams, refresh: refreshAllocations } = useAllocations();
  
  // Flow: "form" -> "2fa" -> işlem
  const [flowStep, setFlowStep] = useState<"form" | "2fa" | "result">("form");
  
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
  const [verified2FACode, setVerified2FACode] = useState<string | undefined>();

  const { writeContract, data: writeData, error: writeError, isPending: isWritePending } = useWriteContract();
  const { sendTransaction, data: sendTxData, error: sendError, isPending: isSendPending } = useSendTransaction();
  const { isSuccess: isConfirmed, error: receiptError } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (!address || !isOpen) return;
    const fetchOnChainBalances = async () => {
      try {
        const res = await fetch(`/api/user/balance?address=${address}`);
        const data = await res.json();
        console.log('TransferModal - API response:', {
          balances: data.balances,
          onChainBalances: data.onChainBalances
        });
        // Use onChainBalances if available, otherwise fall back to balances
        if (data.onChainBalances) {
          setOnChainBalances(data.onChainBalances);
        } else if (data.balances) {
          // Fallback: use balances directly
          setOnChainBalances({
            eth: data.balances.eth || 0,
            auxg: data.balances.auxg || 0,
            auxs: data.balances.auxs || 0,
            auxpt: data.balances.auxpt || 0,
            auxpd: data.balances.auxpd || 0,
            usdt: data.balances.usdt || 0,
          });
        }
      } catch (e) {
        console.error('TransferModal - fetch error:', e);
      }
    };
    fetchOnChainBalances();
  }, [address, isOpen]);

  useEffect(() => {
    if (writeData) setTxHash(writeData);
    if (sendTxData) setTxHash(sendTxData);
  }, [writeData, sendTxData]);

  // Handle wallet errors (user rejection, etc.)
  useEffect(() => {
    const error = writeError || sendError || receiptError;
    if (error) {
      console.error('🔴 Wallet/Transaction error:', error);
      const errorMsg = error.message || t("transferFailed");
      // Check for common error types
      if (errorMsg.includes('User rejected') || errorMsg.includes('rejected')) {
        setErrorMessage(t("txRejected"));
      } else if (errorMsg.includes('insufficient funds')) {
        setErrorMessage(t("insufficientGas"));
      } else {
        setErrorMessage(errorMsg.slice(0, 200));
      }
      setResult("error");
      setFlowStep("result");
      setIsProcessing(false);
    }
  }, [writeError, sendError, receiptError]);

  useEffect(() => {
    if (isConfirmed && txHash) {
      setResult("success");
      setIsProcessing(false);
      setFlowStep("result");
      setTimeout(async () => {
        if (refreshBalances) await refreshBalances();
        if (refreshAllocations) await refreshAllocations();
      }, 2000);
    }
  }, [isConfirmed, txHash]);

  useEffect(() => {
    if (isOpen) {
      setFlowStep("form");
      setSelectedToken("ETH");
      setRecipientAddress("");
      setAmount("");
      setResult(null);
      setErrorMessage("");
      setTxHash(undefined);
      setRecipientValid(null);
    }
  }, [isOpen]);

  // Check recipient for metals
  useEffect(() => {
    if (!isOpen || flowStep !== "form") return;
    const isMetal = METAL_TOKENS.includes(selectedToken);
    const validAddress = recipientAddress.length >= 42 && recipientAddress.startsWith("0x");
    if (!isMetal || !validAddress) { setRecipientValid(null); return; }
    setIsCheckingRecipient(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/user/check?address=${recipientAddress}`);
        const data = await res.json();
        setRecipientValid(data.exists === true);
      } catch { setRecipientValid(false); }
      setIsCheckingRecipient(false);
    }, 500);
    return () => clearTimeout(timeout);
  }, [isOpen, flowStep, recipientAddress, selectedToken]);

  if (!isOpen) return null;

  const tokenInfo = TOKEN_INFO[selectedToken];
  const amountNum = parseFloat(amount) || 0;
  const isMetal = METAL_TOKENS.includes(selectedToken);
  
  const getAvailableBalance = (token: TokenType): number => {
    const key = token.toLowerCase();
    // All balances from Redis (custodial ledger)
    return balances ? parseFloat(String((balances as any)[key] || 0)) : 0;
  };

  const availableBalance = getAvailableBalance(selectedToken);
  const canAfford = amountNum > 0 && amountNum <= availableBalance;
  const isValidAddress = recipientAddress.length >= 42 && recipientAddress.startsWith("0x");
  const canSend = canAfford && isValidAddress && amountNum > 0 && !!address && (!isMetal || recipientValid === true);

  // Debug log
  console.log('TransferModal state:', {
    selectedToken,
    amount,
    amountNum,
    availableBalance,
    canAfford,
    isValidAddress,
    canSend,
    isMetal,
    recipientValid
  });

  // Gönder butonuna basıldı - 2FA'ya geç
  const handleSendClick = () => {
    if (canSend) {
      setFlowStep("2fa");
    }
  };

  // 2FA doğrulandı - transfer işlemini yap
  const handle2FAVerified = async (verifiedCode?: string) => {
    setVerified2FACode(verifiedCode); // Store for API calls
    setFlowStep("form");
    setIsProcessing(true);
    setErrorMessage("");

    // Debug log - hangi yol kullanılacak?
    console.log(`🔐 Transfer başlatılıyor:`, {
      selectedToken,
      isMetal,
      isConnected,
      willUseCustodialAPI: isMetal && !isConnected,
      willUseWagmi: isMetal && isConnected,
      amountNum,
      recipientAddress,
      fromAddress: address,
    });

    try {
      if (isMetal) {
        // Custodial wallet için API transfer
        if (!isConnected) {
          console.log(`📡 Custodial metal transfer: ${amountNum} ${selectedToken} to ${recipientAddress}`);
          const response = await fetch("/api/transfer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fromAddress: address,
              toAddress: recipientAddress,
              token: selectedToken,
              amount: amountNum,
              twoFactorCode: verified2FACode, // Include 2FA code for backend verification
            }),
          });
          const data = await response.json();

          if (data.success) {
            console.log(`✅ Metal transfer successful: ${data.transfer?.txHash}`);
            setTxHash(data.transfer?.txHash);
            setResult("success");
            setFlowStep("result");
            if (refreshBalances) await refreshBalances();
            if (refreshAllocations) await refreshAllocations();
          } else {
            throw new Error(data.error || t("metalTransferFailed"));
          }
          setIsProcessing(false);
          return;
        }

        // External wallet için wagmi transfer
        const metalAllocations = allocations.filter(a => a.metalSymbol === selectedToken && a.active);
        if (metalAllocations.length > 0) {
          const allocResponse = await fetch("/api/allocations", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fromAddress: address, toAddress: recipientAddress, allocationId: metalAllocations[0].id, grams: amountNum }),
          });
          const allocData = await allocResponse.json();
          if (!allocData.success) throw new Error(allocData.error || t("allocationTransferFailed"));
        }
        const amountInUnits = parseUnits(amount, tokenInfo.decimals);
        writeContract({ address: tokenInfo.address as `0x${string}`, abi: ERC20_ABI, functionName: "transfer", args: [recipientAddress as `0x${string}`, amountInUnits], gas: BigInt(200000) });
      } else if (selectedToken === "ETH") {
        // Native ETH transfer
        console.log(`🚀 Native ETH transfer starting...`);
        console.log(`   Amount: ${amount} ETH`);
        console.log(`   To: ${recipientAddress}`);
        console.log(`   From: ${address}`);
        console.log(`   Wallet connected: ${isConnected}`);

        // If wallet not connected, try API transfer (for custodial users)
        if (!isConnected) {
          console.log(`📡 Wallet not connected - trying API transfer (custodial)...`);
          const response = await fetch("/api/transfer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fromAddress: address,
              toAddress: recipientAddress,
              token: "ETH",
              amount: amountNum,
              twoFactorCode: verified2FACode, // Include 2FA code for backend verification
            }),
          });
          const data = await response.json();

          if (data.success) {
            console.log(`✅ Custodial ETH transfer successful: ${data.transfer?.txHash}`);
            setTxHash(data.transfer?.txHash);
            setResult("success");
            setFlowStep("result");
            if (refreshBalances) await refreshBalances();
          } else if (data.code === "USE_WALLET_SIGNING") {
            throw new Error(t("connectWallet"));
          } else {
            throw new Error(data.error || t("ethTransferFailed"));
          }
          setIsProcessing(false);
          return;
        }

        // Wallet connected - use native signing
        const amountInWei = parseEther(amount);
        console.log(`   Amount in Wei: ${amountInWei.toString()}`);
        console.log(`🔐 Wallet popup should appear now...`);

        sendTransaction({
          to: recipientAddress as `0x${string}`,
          value: amountInWei,
        });
      } else if (tokenInfo.onChain && tokenInfo.address) {
        // Other ERC20 token transfer
        const amountInUnits = parseUnits(amount, tokenInfo.decimals);
        writeContract({ address: tokenInfo.address as `0x${string}`, abi: ERC20_ABI, functionName: "transfer", args: [recipientAddress as `0x${string}`, amountInUnits], gas: BigInt(200000) });
      } else {
        // Off-chain transfer via API
        const response = await fetch("/api/transfer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fromAddress: address, toAddress: recipientAddress, token: selectedToken, amount: amountNum, twoFactorCode: verified2FACode }) });
        const data = await response.json();
        if (data.success) {
          setResult("success");
          setFlowStep("result");
          if (refreshBalances) await refreshBalances();
        } else {
          throw new Error(data.error || t("transferFailed"));
        }
        setIsProcessing(false);
      }
    } catch (error: any) {
      setErrorMessage(error.message || t("transferFailed")); 
      setResult("error"); 
      setFlowStep("result");
      setIsProcessing(false); 
    }
  };

  const renderTokenIcon = (token: TokenType) => {
    const info = TOKEN_INFO[token];
    if (info.iconType === "image") return <img src={info.icon} alt={token} className="w-5 h-5" />;
    return <span className="text-lg" style={{ color: info.color }}>{info.icon}</span>;
  };

  // 2FA Modal
  if (flowStep === "2fa") {
    return (
      <TwoFactorGate
        walletAddress={address || ""}
        isOpen={true}
        onClose={() => setFlowStep("form")}
        onVerified={handle2FAVerified}
      />
    );
  }

  // Result screens
  if (flowStep === "result" && result === "success") {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-slate-700 max-w-md w-full p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#2F6F62]/20 dark:bg-[#2F6F62]/20 flex items-center justify-center">
            <span className="text-3xl">✅</span>
          </div>
          <h3 className="text-xl font-bold text-[#2F6F62] dark:text-[#2F6F62] mb-2">{t("success")}</h3>
          <p className="text-slate-500 mb-4">{amountNum} {selectedToken} {t("sent")}</p>
          <button onClick={onClose} className="px-6 py-2 bg-[#2F6F62] text-white rounded-xl font-medium">{t("cancel")}</button>
        </div>
      </div>
    );
  }

  if (flowStep === "result" && result === "error") {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-slate-700 max-w-md w-full p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
            <span className="text-3xl">❌</span>
          </div>
          <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">{t("error")}</h3>
          <p className="text-slate-500 mb-4">{errorMessage}</p>
          <button onClick={onClose} className="px-6 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium">{t("cancel")}</button>
        </div>
      </div>
    );
  }

  // Form
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-slate-700 max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t("title")}</h2>
            <p className="text-sm text-slate-500">{t("subtitle")}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg text-slate-500">✕</button>
        </div>

        {/* Token Selection */}
        <div className="mb-4">
          <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">{t("selectToken")}</label>
          <div className="grid grid-cols-5 gap-2">
            {TRANSFERABLE_TOKENS.map((token) => (
              <button key={token} onClick={() => setSelectedToken(token)} className={`p-2 rounded-lg border flex flex-col items-center gap-1 ${selectedToken === token ? "border-blue-500 bg-blue-50 dark:bg-blue-500/20" : "border-stone-300 dark:border-slate-700"}`}>
                {renderTokenIcon(token)}
                <span className="text-[10px] text-slate-700 dark:text-slate-300">{token}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Notices */}
        {isMetal && (
          <div className="mb-4 p-2 bg-[#BFA181]/10 dark:bg-[#BFA181]/10 border border-[#BFA181]/30 dark:border-[#BFA181]/30 rounded-lg">
            <p className="text-xs text-[#BFA181] dark:text-[#BFA181]">⚠️ {t("metalNote")}</p>
          </div>
        )}
        {tokenInfo.onChain && !isMetal && (
          <div className="mb-4 p-2 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg">
            <p className="text-xs text-blue-700 dark:text-blue-400">⚡ {t("onChainNote")}</p>
          </div>
        )}

        {/* Recipient Address */}
        <div className="mb-4">
          <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">{t("recipientAddress")}</label>
          <input type="text" value={recipientAddress} onChange={(e) => setRecipientAddress(e.target.value)} placeholder="0x..." className="w-full bg-stone-100 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-white font-mono text-sm" />
          {recipientAddress && !isValidAddress && <p className="text-xs text-red-500 mt-1">{t("invalidAddress")}</p>}
          {isMetal && isValidAddress && (
            <div className="mt-2">
              {isCheckingRecipient ? <p className="text-xs text-slate-500">⏳ {t("checkingRecipient")}</p> : recipientValid === true ? <p className="text-xs text-[#2F6F62]">✓ {t("auxiteUser")}</p> : recipientValid === false ? <p className="text-xs text-red-500">✕ {t("notAuxiteUser")}</p> : null}
            </div>
          )}
        </div>

        {/* Amount */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-slate-600 dark:text-slate-400">{t("amount")}</label>
            <span className="text-xs text-slate-500">{t("balance")}: {formatAmount(availableBalance, selectedToken)} {selectedToken}</span>
          </div>
          <div className="flex gap-2">
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="flex-1 bg-stone-100 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-white" />
            <button onClick={() => setAmount(availableBalance.toString())} className="px-4 py-3 bg-stone-100 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-xl text-[#2F6F62] dark:text-[#2F6F62] font-medium">MAX</button>
          </div>
          {amountNum > 0 && !canAfford && <p className="text-xs text-red-500 mt-1">{t("insufficientBalance")}</p>}
        </div>

        {/* Send Button */}
        <button 
          onClick={handleSendClick} 
          disabled={!canSend || isProcessing} 
          className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> {t("sending")}</>
          ) : (
            <>🔐 {t("send")}</>
          )}
        </button>
      </div>
    </div>
  );
}

export default TransferModal;
