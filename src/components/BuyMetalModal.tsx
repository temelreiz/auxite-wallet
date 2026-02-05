"use client";
import { useState, useEffect, useCallback } from "react";
import { useWallet } from "./WalletContext";

interface BuyMetalModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: "tr" | "en" | "de" | "fr" | "ar" | "ru";
  onSuccess?: () => void;
}

const translations: Record<string, Record<string, string>> = {
  tr: { buyMetal: "Metal Satın Al", selectMetal: "Metal Seçin", youPay: "Ödeme", youReceive: "Alacağınız", balance: "Bakiye", transactionFee: "İşlem Ücreti", spread: "Spread", confirm: "Onayla", processing: "İşleniyor...", success: "Başarılı!", insufficientBalance: "Yetersiz bakiye", enterAmount: "Miktar girin", loading: "Yükleniyor...", error: "Hata oluştu", partialAllocation: "Kısmi Allocation", vaultAllocated: "Kasada Allocate", nonAllocated: "Non-Allocated", continueAnyway: "Devam Et", addMore: "Ekle", allocationNote: "Sadece tam gramlar fiziksel metale allocate edilebilir." },
  en: { buyMetal: "Buy Metal", selectMetal: "Select Metal", youPay: "You Pay", youReceive: "You Receive", balance: "Balance", transactionFee: "Transaction Fee", spread: "Spread", confirm: "Confirm", processing: "Processing...", success: "Success!", insufficientBalance: "Insufficient balance", enterAmount: "Enter amount", loading: "Loading...", error: "Error occurred", partialAllocation: "Partial Allocation", vaultAllocated: "Vault Allocated", nonAllocated: "Non-Allocated", continueAnyway: "Continue", addMore: "Add", allocationNote: "Only whole grams can be allocated to physical metal." },
  de: { buyMetal: "Metall kaufen", selectMetal: "Metall auswählen", youPay: "Sie zahlen", youReceive: "Sie erhalten", balance: "Guthaben", transactionFee: "Transaktionsgebühr", spread: "Spread", confirm: "Bestätigen", processing: "Verarbeitung...", success: "Erfolgreich!", insufficientBalance: "Unzureichendes Guthaben", enterAmount: "Betrag eingeben", loading: "Laden...", error: "Fehler" },
  fr: { buyMetal: "Acheter du Métal", selectMetal: "Sélectionner", youPay: "Vous payez", youReceive: "Vous recevez", balance: "Solde", transactionFee: "Frais", spread: "Spread", confirm: "Confirmer", processing: "Traitement...", success: "Succès!", insufficientBalance: "Solde insuffisant", enterAmount: "Montant", loading: "Chargement...", error: "Erreur" },
  ar: { buyMetal: "شراء المعدن", selectMetal: "اختر المعدن", youPay: "تدفع", youReceive: "تستلم", balance: "الرصيد", transactionFee: "رسوم", spread: "السبريد", confirm: "تأكيد", processing: "جاري...", success: "نجاح!", insufficientBalance: "رصيد غير كافٍ", enterAmount: "المبلغ", loading: "تحميل...", error: "خطأ" },
  ru: { buyMetal: "Купить металл", selectMetal: "Выберите", youPay: "Вы платите", youReceive: "Вы получите", balance: "Баланс", transactionFee: "Комиссия", spread: "Спред", confirm: "Подтвердить", processing: "Обработка...", success: "Успешно!", insufficientBalance: "Недостаточно", enterAmount: "Сумма", loading: "Загрузка...", error: "Ошибка" },
};

interface MetalInfo { symbol: string; name: string; icon: string; price: number; spread: number; }
interface TradePreview { toAmount: number; price: number; fee: number; feePercent: number; spread: string; tier?: { id: string; name: string; }; allocationPreview?: { totalGrams: number; allocatedGrams: number; nonAllocatedGrams: number; hasPartialAllocation: boolean; suggestion?: { gramsToAdd: number; auxmToAdd: number; targetGrams: number; }; }; }

const METALS_BASE = [
  { symbol: "AUXG", name: "gold", icon: "/gold-favicon-32x32.png" },
  { symbol: "AUXS", name: "silver", icon: "/silver-favicon-32x32.png" },
  { symbol: "AUXPT", name: "platinum", icon: "/platinum-favicon-32x32.png" },
  { symbol: "AUXPD", name: "palladium", icon: "/palladium-favicon-32x32.png" },
];

const PAYMENT_METHODS = [
  { symbol: "AUXM", icon: "💵", name: "AUXM" },
  { symbol: "ETH", icon: "Ξ", name: "ETH" },
  { symbol: "BTC", icon: "₿", name: "BTC" },
  { symbol: "XRP", icon: "✕", name: "XRP" },
  { symbol: "SOL", icon: "◎", name: "SOL" },
  { symbol: "USDT", icon: "₮", name: "USDT" },
];

function BuyMetalModal({ isOpen, onClose, lang = "en", onSuccess }: BuyMetalModalProps) {
  const t = translations[lang] || translations.en;
  // Use WalletContext for both custodial and external wallets
  const { address, balances: walletBalances, refreshBalances } = useWallet();
  
  // Debug: Component mount
  useEffect(() => {
    console.log("🟢 BuyMetalModal MOUNTED", { isOpen, address });
    return () => console.log("🔴 BuyMetalModal UNMOUNTED");
  }, []);

  // Debug: Props/state changes
  useEffect(() => {
    console.log("🔄 BuyMetalModal state change", { isOpen, address, walletBalances });
  }, [isOpen, address, walletBalances]);
  
  const [metals, setMetals] = useState<MetalInfo[]>([]);
  const [selectedMetal, setSelectedMetal] = useState<MetalInfo | null>(null);
  const [selectedPayment, setSelectedPayment] = useState(PAYMENT_METHODS[0]);
  const [amount, setAmount] = useState("");
  const [preview, setPreview] = useState<TradePreview | null>(null);
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showAllocationWarning, setShowAllocationWarning] = useState(false);
  const [allocationPreview, setAllocationPreview] = useState<{
    totalGrams: number;
    allocatedGrams: number;
    nonAllocatedGrams: number;
    hasPartialAllocation: boolean;
    suggestion?: { gramsToAdd: number; auxmToAdd: number; targetGrams: number; };
  } | null>(null);

  // Calculate balance from WalletContext
  const getBalance = useCallback(() => {
    if (!walletBalances) return 0;
    
    switch (selectedPayment.symbol) {
      case 'AUXM':
        return (walletBalances.auxm || 0) + (walletBalances.bonusAuxm || 0);
      case 'ETH':
        return walletBalances.eth || 0;
      case 'BTC':
        return walletBalances.btc || 0;
      case 'XRP':
        return walletBalances.xrp || 0;
      case 'SOL':
        return walletBalances.sol || 0;
      case 'USDT':
        return walletBalances.usdt || 0;
      default:
        return 0;
    }
  }, [walletBalances, selectedPayment.symbol]);

  const fetchPrices = useCallback(async () => {
    console.log("📊 BuyMetalModal fetchPrices called");
    setIsLoadingPrices(true);
    try {
      const res = await fetch('/api/prices');
      const data = await res.json();
      console.log("📊 BuyMetalModal prices received:", data);
      const metalsWithPrices = METALS_BASE.map(metal => ({
        ...metal,
        price: data.prices?.[metal.symbol] || data[metal.name]?.askPerGram || 0,
        spread: data[metal.name]?.spreadPercent?.buy || 0,
      }));
      setMetals(metalsWithPrices);
      if (!selectedMetal && metalsWithPrices.length > 0) setSelectedMetal(metalsWithPrices[0]);
    } catch (err: any) { 
      console.error('❌ BuyMetalModal fetchPrices error:', err); 
      setError(err?.message || t.error); 
    }
    finally { setIsLoadingPrices(false); }
  }, [selectedMetal, t.error]);

  const fetchPreview = useCallback(async () => {
    if (!selectedMetal || !amount || parseFloat(amount) <= 0 || !address) { 
      setPreview(null); 
      return; 
    }
    console.log("🔍 BuyMetalModal fetchPreview called", { selectedMetal: selectedMetal.symbol, amount, address });
    setIsLoadingPreview(true);
    setError(null);
    try {
      const url = `/api/trade?type=buy&fromToken=${selectedPayment.symbol}&toToken=${selectedMetal.symbol}&amount=${amount}&address=${address}`;
      console.log("🔍 BuyMetalModal fetchPreview URL:", url);
      const res = await fetch(url);
      const data = await res.json();
      console.log("🔍 BuyMetalModal preview received:", data);
      if (data.success && data.preview) {
        setPreview({ 
          toAmount: data.preview.toAmount, 
          price: data.preview.price, 
          fee: data.preview.fee, 
          feePercent: data.preview.feePercent, 
          spread: data.preview.spread, 
          tier: data.preview.tier, 
          allocationPreview: data.preview.allocationPreview 
        });
        if (data.preview.allocationPreview) setAllocationPreview(data.preview.allocationPreview);
      } else { 
        console.log("❌ BuyMetalModal preview error:", data.error);
        setError(data.error || t.error); 
      }
    } catch (err: any) { 
      console.error('❌ BuyMetalModal fetchPreview error:', err); 
      setError(err?.message || t.error); 
    }
    finally { setIsLoadingPreview(false); }
  }, [selectedMetal, selectedPayment, amount, address, t.error]);

  const handleConfirmWithAllocation = () => {
    console.log("✅ handleConfirmWithAllocation called");
    setShowAllocationWarning(false);
    executeTradeNow();
  };

  const handleAddMoreForAllocation = () => {
    if (allocationPreview?.suggestion && selectedMetal) {
      const targetGrams = allocationPreview.suggestion.targetGrams;
      const pricePerGram = preview?.price || selectedMetal.price;
      const feePercent = preview?.feePercent || 0.35;
      const newAmount = (targetGrams * pricePerGram) / (1 - feePercent / 100);
      setAmount(newAmount.toFixed(2));
    }
    setShowAllocationWarning(false);
  };

  const executeTrade = async () => {
    console.log('🔵 executeTrade called', { preview: !!preview, address, selectedMetal: selectedMetal?.symbol, allocationPreview, showAllocationWarning });
    if (!preview || !address || !selectedMetal) {
      console.log('❌ executeTrade early return - missing data', { preview: !!preview, address, selectedMetal: !!selectedMetal });
      return;
    }
    
    // Allocation warning kontrolü - sadece 1 gram ve üzeri için göster
    if (allocationPreview?.hasPartialAllocation && !showAllocationWarning && (preview?.toAmount || 0) >= 1) {
      console.log('⚠️ Showing allocation warning');
      setShowAllocationWarning(true);
      return;
    }
    
    console.log('✅ Calling executeTradeNow');
    executeTradeNow();
  };

  const executeTradeNow = async () => {
    console.log('🔵 executeTradeNow called');
    if (!preview || !address || !selectedMetal) {
      console.log('❌ executeTradeNow early return');
      return;
    }
    setShowAllocationWarning(false);
    setIsProcessing(true);
    setError(null);
    try {
      const payload = { 
        address, 
        type: 'buy', 
        fromToken: selectedPayment.symbol, 
        toToken: selectedMetal.symbol, 
        fromAmount: parseFloat(amount), 
        executeOnChain: true 
      };
      console.log('📤 Sending trade request...', payload);
      const res = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      console.log('📥 Trade response:', data);
      if (data.success) {
        console.log('✅ Trade successful!');
        setSuccess(true);
        // Refresh balances from WalletContext
        await refreshBalances();
        setTimeout(() => { 
          setSuccess(false); 
          setAmount(""); 
          setPreview(null); 
          onSuccess?.(); 
          onClose(); 
        }, 2000);
      } else { 
        console.log('❌ Trade failed:', data.error);
        setError(data.error || t.error); 
      }
    } catch (err: any) { 
      console.error('❌ Trade error:', err); 
      setError(err?.message || t.error); 
    }
    finally { setIsProcessing(false); }
  };

  // Effect: Modal açıldığında fiyatları getir
  useEffect(() => { 
    console.log("🔄 BuyMetalModal useEffect[isOpen] triggered", { isOpen });
    if (isOpen) { 
      console.log("🟢 Modal is OPEN - fetching prices");
      fetchPrices(); 
    } 
  }, [isOpen, fetchPrices]);
  
  // Effect: Preview için debounce
  useEffect(() => { 
    const timer = setTimeout(() => fetchPreview(), 500); 
    return () => clearTimeout(timer); 
  }, [fetchPreview]);
  
  // Effect: Fiyat güncelleme interval
  useEffect(() => { 
    if (!isOpen) return; 
    const interval = setInterval(fetchPrices, 30000); 
    return () => clearInterval(interval); 
  }, [isOpen, fetchPrices]);

  // Debug: Render check
  console.log("🟢 BuyMetalModal RENDER", { isOpen, address, metalsCount: metals.length, walletBalances });

  if (!isOpen) {
    console.log("🔴 BuyMetalModal returning null (isOpen=false)");
    return null;
  }

  const balance = getBalance();
  const amountNum = parseFloat(amount) || 0;
  const isInsufficientBalance = amountNum > balance;
  const canTrade = amountNum > 0 && !isInsufficientBalance && preview && !isProcessing;

  console.log("🟢 BuyMetalModal rendering UI", { balance, amountNum, isInsufficientBalance, canTrade });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-700 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">{t.buyMetal}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 flex items-center justify-center">
            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2 block">{t.selectMetal}</label>
            {isLoadingPrices ? (
              <div className="flex justify-center py-4"><svg className="animate-spin h-6 w-6 text-emerald-500" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg></div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {metals.map((metal) => (
                  <button key={metal.symbol} onClick={() => setSelectedMetal(metal)} className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${selectedMetal?.symbol === metal.symbol ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/20" : "border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/50"}`}>
                    <img src={metal.icon} alt={metal.symbol} className="w-8 h-8" />
                    <span className={`text-xs font-semibold ${selectedMetal?.symbol === metal.symbol ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-300"}`}>{metal.symbol}</span>
                    <span className="text-[10px] text-slate-500">${metal.price.toFixed(2)}/g</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2 block">{t.youPay}</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
              {PAYMENT_METHODS.map((method) => (
                <button key={method.symbol} onClick={() => setSelectedPayment(method)} className={`p-2 sm:p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${selectedPayment.symbol === method.symbol ? "border-purple-500 bg-purple-50 dark:bg-purple-500/20" : "border-stone-200 dark:border-slate-700"}`}>
                  <span className="text-lg sm:text-xl">{method.icon}</span>
                  <span className={`text-[10px] sm:text-xs font-semibold ${selectedPayment.symbol === method.symbol ? "text-purple-600 dark:text-purple-400" : "text-slate-700 dark:text-slate-300"}`}>{method.name}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-between text-sm mb-3">
              <span className="text-slate-500">{t.balance}:</span>
              <span className={`font-medium ${isInsufficientBalance ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>{balance.toFixed(['BTC', 'ETH', 'SOL'].includes(selectedPayment.symbol) ? 6 : 2)} {selectedPayment.symbol}</span>
            </div>
            <div className="relative">
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full px-4 py-4 pr-20 rounded-xl bg-stone-100 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 text-lg font-medium" />
              <button onClick={() => setAmount(balance.toString())} className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-stone-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium">MAX</button>
            </div>
            {isInsufficientBalance && <p className="text-red-500 text-xs mt-1">{t.insufficientBalance}</p>}
          </div>

          <div className="flex justify-center">
            <div className="w-10 h-10 rounded-full bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 flex items-center justify-center">
              {isLoadingPreview ? <svg className="animate-spin h-4 w-4 text-emerald-500" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /></svg> : <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2 block">{t.youReceive}</label>
            <div className="p-4 rounded-xl bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                {selectedMetal && <img src={selectedMetal.icon} alt={selectedMetal.symbol} className="w-10 h-10" />}
                <div>
                  <span className="text-xl font-bold text-slate-800 dark:text-white">{preview ? preview.toAmount.toFixed(4) : '0.0000'}g</span>
                  <span className="text-lg text-slate-600 dark:text-slate-400 ml-2">{selectedMetal?.symbol}</span>
                  <p className="text-xs text-slate-500">@ ${preview ? preview.price.toFixed(2) : selectedMetal?.price.toFixed(2)}/gram</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm p-3 rounded-lg bg-stone-50 dark:bg-slate-800/50 border border-stone-200 dark:border-slate-700">
              <span className="text-slate-500">{t.transactionFee}:</span>
              <span className="text-slate-700 dark:text-slate-300 font-medium">{preview ? `${preview.feePercent}% ($${preview.fee.toFixed(2)})` : '0.35%'}</span>
            </div>
            <div className="flex justify-between text-sm p-3 rounded-lg bg-stone-50 dark:bg-slate-800/50 border border-stone-200 dark:border-slate-700">
              <span className="text-slate-500">{t.spread}:</span>
              <span className="text-slate-700 dark:text-slate-300 font-medium">{preview?.spread || `${selectedMetal?.spread || 0}%`}</span>
            </div>
            {preview?.tier && (
              <div className="flex justify-between text-sm p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
                <span className="text-amber-600 dark:text-amber-400">Auxiteer Tier:</span>
                <span className="text-amber-700 dark:text-amber-300 font-medium">{preview.tier.name}</span>
              </div>
            )}
          </div>

          {/* Allocation Warning */}
          {showAllocationWarning && allocationPreview && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-300 dark:border-amber-500/40">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h4 className="font-bold text-amber-700 dark:text-amber-400">{t.partialAllocation || "Partial Allocation"}</h4>
              </div>
              
              <div className="space-y-2 mb-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <span className="text-emerald-500">✓</span> {t.vaultAllocated || "Vault Allocated"}
                  </span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{allocationPreview.allocatedGrams}g</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <span className="text-amber-500">○</span> {t.nonAllocated || "Non-Allocated"}
                  </span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">{allocationPreview.nonAllocatedGrams.toFixed(4)}g</span>
                </div>
              </div>
              
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{t.allocationNote || "Only whole grams can be allocated to physical metal."}</p>
              
              <div className="grid grid-cols-2 gap-2">
                {allocationPreview.suggestion && (
                  <button onClick={handleAddMoreForAllocation} className="py-2.5 px-3 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                    <span className="block text-xs text-slate-500 dark:text-slate-400">{t.addMore || "Add"}</span>
                    +{allocationPreview.suggestion.gramsToAdd.toFixed(4)}g → {allocationPreview.suggestion.targetGrams}g
                  </button>
                )}
                <button onClick={handleConfirmWithAllocation} className="py-2.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors">
                  {t.continueAnyway || "Continue"}
                </button>
              </div>
            </div>
          )}

          {error && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30"><p className="text-red-600 dark:text-red-400 text-sm">{error}</p></div>}
          {success && <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30"><p className="text-emerald-600 dark:text-emerald-400 text-sm font-medium text-center">✅ {t.success}</p></div>}
        </div>

        <div className="p-4 border-t border-stone-200 dark:border-slate-800">
          <button onClick={executeTrade} disabled={!canTrade} className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:from-slate-300 disabled:to-slate-300 dark:disabled:from-slate-700 dark:disabled:to-slate-700 text-white disabled:text-slate-500 font-semibold text-base transition-all flex items-center justify-center gap-2">
            {isProcessing ? (<><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /></svg>{t.processing}</>) : success ? (<><span>✅</span>{t.success}</>) : (<><span>🔒</span>{t.confirm}</>)}
          </button>
        </div>
      </div>
    </div>
  );
}

export { BuyMetalModal };
