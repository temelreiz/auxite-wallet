import { useWallet } from "./WalletContext";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

interface MetalTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  metal: "AUXG" | "AUXS" | "AUXPT" | "AUXPD";
  metalName: string;
  currentPrice: number;
  bidPrice?: number;
  initialMode?: "buy" | "sell";
  lang?: "tr" | "en";
  userBalance?: {
    auxm: number;
    bonusAuxm: number;
    metals: Record<string, number>;
    crypto?: {
      USDT: number;
      BTC: number;
      ETH: number;
      XRP: number;
      SOL: number;
    };
  };
  cryptoPrices?: {
    BTC: number;
    ETH: number;
    XRP: number;
    SOL: number;
  };
  walletAddress?: string;
  onTradeComplete?: () => void;
}

interface Quote {
  id: string;
  type: "buy" | "sell";
  metal: string;
  grams: number;
  basePrice: number;
  pricePerGram: number;
  spreadPercent: number;
  totalUSD: number;
  totalAUXM: number;
  expiresAt: number;
  timeRemaining: number;
}

type PaymentMethod = "AUXM" | "USDT" | "BTC" | "ETH" | "XRP" | "SOL";
type OrderType = "market" | "limit";

const METAL_INFO = {
  AUXG: { name: "Gold", nameTr: "Altın", icon: "/images/metals/gold.png", color: "#FFD700" },
  AUXS: { name: "Silver", nameTr: "Gümüş", icon: "/images/metals/silver.png", color: "#C0C0C0" },
  AUXPT: { name: "Platinum", nameTr: "Platin", icon: "/images/metals/platinum.png", color: "#E5E4E2" },
  AUXPD: { name: "Palladium", nameTr: "Paladyum", icon: "/images/metals/palladium.png", color: "#CED0DD" },
};

const PAYMENT_METHODS: { id: PaymentMethod; name: string; icon: string; color: string }[] = [
  { id: "AUXM", name: "AUXM", icon: "◈", color: "#A855F7" },
  { id: "USDT", name: "USDT", icon: "₮", color: "#26A17B" },
  { id: "BTC", name: "BTC", icon: "₿", color: "#F7931A" },
  { id: "ETH", name: "ETH", icon: "Ξ", color: "#627EEA" },
  { id: "XRP", name: "XRP", icon: "✕", color: "#23292F" },
  { id: "SOL", name: "SOL", icon: "◎", color: "#9945FF" },
];

export function MetalTradeModal({
  isOpen,
  onClose,
  metal,
  metalName,
  currentPrice,
  bidPrice,
  initialMode = "buy",
  lang = "en",
  cryptoPrices = { BTC: 97500, ETH: 3650, XRP: 2.20, SOL: 235 },
  walletAddress,
  onTradeComplete,
}: MetalTradeModalProps) {
  const { balances: walletBalances } = useWallet();
  const [mode, setMode] = useState<"buy" | "sell">(initialMode);
  const userBalance = {
    auxm: walletBalances?.auxm || 0,
    bonusAuxm: walletBalances?.bonusAuxm || 0,
    metals: {
      AUXG: walletBalances?.auxg || 0,
      AUXS: walletBalances?.auxs || 0,
      AUXPT: walletBalances?.auxpt || 0,
      AUXPD: walletBalances?.auxpd || 0,
    },
    crypto: {
      USDT: walletBalances?.usdt || 0,
      BTC: walletBalances?.btc || 0,
      ETH: walletBalances?.eth || 0,
      XRP: walletBalances?.xrp || 0,
      SOL: walletBalances?.sol || 0,
    },
  };
  const [orderType, setOrderType] = useState<OrderType>("market");
  const [amount, setAmount] = useState<string>("1");
  const [limitPrice, setLimitPrice] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("AUXM");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  
  const [quote, setQuote] = useState<Quote | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showAllocationWarning, setShowAllocationWarning] = useState(false);
  const [allocationPreview, setAllocationPreview] = useState<{
    totalGrams: number;
    allocatedGrams: number;
    nonAllocatedGrams: number;
    hasPartialAllocation: boolean;
    suggestion?: {
      gramsToAdd: number;
      auxmToAdd: number;
      targetGrams: number;
    };
  } | null>(null);

  const metalInfo = METAL_INFO[metal];

  const t = lang === "tr" ? {
    buy: "Al",
    sell: "Sat",
    market: "Piyasa",
    limit: "Limit",
    orderType: "Emir Tipi",
    marketDesc: "Anlık piyasa fiyatından işlem",
    limitDesc: "Belirlediğin fiyattan işlem",
    amount: "Miktar",
    limitPrice: "Limit Fiyat",
    currentMarketPrice: "Güncel Piyasa Fiyatı",
    askPrice: "Satış Fiyatı (Ask)",
    bidPrice: "Alış Fiyatı (Bid)",
    balance: "Bakiye",
    bonus: "Bonus",
    total: "Toplam",
    totalPayment: "Toplam Ödeme",
    youReceive: "Alacağınız",
    paymentMethod: "Ödeme Yöntemi",
    processing: "İşleniyor...",
    cancel: "İptal",
    confirm: "Onayla",
    priceLocked: "Fiyat Sabitlendi",
    seconds: "sn",
    spread: "Spread",
    insufficientBalance: "Yetersiz bakiye",
    bonusUsage: "Bonus Kullanımı",
    normalAuxm: "Normal AUXM",
    newPrice: "Fiyat Güncellendi",
    success: "İşlem Başarılı!",
    orderPlaced: "Emir Verildi!",
    limitOrderInfo: "Limit emriniz piyasa fiyatı belirlediğiniz fiyata ulaştığında gerçekleşecektir.",
    pendingOrders: "Bekleyen Emirler",
    noOrders: "Bekleyen emir yok",
    close: "Kapat",
    placeOrder: "Emir Ver",
  } : {
    buy: "Buy",
    sell: "Sell",
    market: "Market",
    limit: "Limit",
    orderType: "Order Type",
    marketDesc: "Trade at current market price",
    limitDesc: "Trade at your specified price",
    amount: "Amount",
    limitPrice: "Limit Price",
    currentMarketPrice: "Current Market Price",
    askPrice: "Ask Price",
    bidPrice: "Bid Price",
    balance: "Balance",
    bonus: "Bonus",
    total: "Total",
    totalPayment: "Total Payment",
    youReceive: "You Receive",
    paymentMethod: "Payment Method",
    processing: "Processing...",
    cancel: "Cancel",
    confirm: "Confirm",
    priceLocked: "Price Locked",
    seconds: "sec",
    spread: "Spread",
    insufficientBalance: "Insufficient balance",
    bonusUsage: "Bonus Usage",
    normalAuxm: "Regular AUXM",
    newPrice: "Price Updated",
    success: "Trade Successful!",
    orderPlaced: "Order Placed!",
    limitOrderInfo: "Your limit order will execute when market price reaches your specified price.",
    pendingOrders: "Pending Orders",
    noOrders: "No pending orders",
    close: "Close",
    placeOrder: "Place Order",
  };

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setOrderType("market");
      setAmount("1");
      setLimitPrice("");
      setPaymentMethod("AUXM");
      setResult(null);
      setErrorMessage("");
      setQuote(null);
      setCountdown(0);
      setShowConfirmation(false);
    }
  }, [isOpen, initialMode]);

  useEffect(() => {
    if (orderType === "limit" && !limitPrice) {
      const defaultPrice = mode === "buy" ? currentPrice : (bidPrice || currentPrice * 0.98);
      setLimitPrice(defaultPrice.toFixed(2));
    }
  }, [orderType, mode, currentPrice, bidPrice, limitPrice]);

  useEffect(() => {
    if (!quote || countdown <= 0) return;
    
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.floor((quote.expiresAt - Date.now()) / 1000));
      setCountdown(remaining);
      
      if (remaining <= 0) {
        setQuote(null);
        setShowConfirmation(false);
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [quote]);

  const amountNum = parseFloat(amount) || 0;
  const limitPriceNum = parseFloat(limitPrice) || 0;
  
  const getDisplayPrice = () => {
    if (orderType === "limit") {
      return limitPriceNum;
    }
    return quote?.pricePerGram || (mode === "buy" ? currentPrice : (bidPrice || currentPrice * 0.98));
  };
  
  const displayPrice = getDisplayPrice();
  
  const getAvailableBalance = (pm: PaymentMethod): number => {
    if (pm === "AUXM") {
      return (userBalance?.auxm || 0) + (userBalance?.bonusAuxm || 0);
    }
    return userBalance?.crypto?.[pm] || 0;
  };

  const calculateTotal = () => {
    if (mode === "buy") {
      const totalUSD = amountNum * displayPrice;
      if (paymentMethod === "AUXM" || paymentMethod === "USDT") {
        return totalUSD;
      }
      const cryptoPrice = cryptoPrices[paymentMethod as keyof typeof cryptoPrices];
      return totalUSD / cryptoPrice;
    } else {
      return amountNum * displayPrice;
    }
  };

  const total = calculateTotal();
  const availableBalance = getAvailableBalance(paymentMethod);
  
  const hasInsufficientBalance = mode === "buy" 
    ? total > availableBalance 
    : amountNum > (userBalance?.metals?.[metal] || 0);

  const calculateBonusUsage = () => {
    if (mode !== "buy" || paymentMethod !== "AUXM") {
      return { usedBonus: 0, usedRegular: total };
    }
    const bonus = userBalance?.bonusAuxm || 0;
    if (bonus >= total) {
      return { usedBonus: total, usedRegular: 0 };
    }
    return { usedBonus: bonus, usedRegular: total - bonus };
  };

  const bonusUsage = calculateBonusUsage();

  const handleMarketOrder = async () => {
    if (!walletAddress || amountNum <= 0 || hasInsufficientBalance) return;
    
    setIsProcessing(true);
    setErrorMessage("");
    
    try {
      const quoteRes = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: mode,
          metal: metal,
          grams: amountNum,
          address: walletAddress,
        }),
      });
      
      const quoteData = await quoteRes.json();
      
      if (!quoteRes.ok) {
        throw new Error(quoteData.error || "Quote failed");
      }
      
      // API response: { success, quote: {...}, message }
      // Sadece quote objesini state'e set et
      setQuote(quoteData.quote);
      setCountdown(quoteData.quote?.timeRemaining || quoteData.timeRemaining || 15);
      setShowConfirmation(true);
      
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to get quote");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLimitOrder = async () => {
    if (!walletAddress || amountNum <= 0 || limitPriceNum <= 0 || hasInsufficientBalance) return;
    
    setIsProcessing(true);
    setErrorMessage("");
    
    try {
      const orderRes = await fetch("/api/orders/limit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: mode,
          metal: metal,
          grams: amountNum,
          limitPrice: limitPriceNum,
          paymentMethod: paymentMethod,
          address: walletAddress,
        }),
      });
      
      const orderData = await orderRes.json();
      
      if (!orderRes.ok) {
        throw new Error(orderData.error || "Order failed");
      }
      
      setResult("success");
      onTradeComplete?.();
      
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to place order");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTradeClick = async () => {
    if (orderType === "limit") {
      handleLimitOrder();
      return;
    }
    
    // Market order için önce allocation preview kontrol et
    console.log("🔍 handleTradeClick - mode:", mode, "showAllocationWarning:", showAllocationWarning);
    if (mode === "buy" && !showAllocationWarning) {
      try {
        // displayPrice = spread uygulanmış fiyat (askPerGram), currentPrice = ham fiyat
        const auxmAmount = amountNum * displayPrice;
        console.log("🔍 Checking allocation preview - amount:", amountNum, "displayPrice:", displayPrice, "auxm:", auxmAmount, "address:", walletAddress);
        const previewRes = await fetch(
          `/api/trade?type=buy&fromToken=AUXM&toToken=${metal}&amount=${auxmAmount}&address=${walletAddress}`
        );
        const previewData = await previewRes.json();
        console.log("🔍 Preview response:", previewData);
        
        if (previewData.preview?.allocationPreview?.hasPartialAllocation) {
          console.log("🔍 Has partial allocation, showing warning");
          setAllocationPreview(previewData.preview.allocationPreview);
          setShowAllocationWarning(true);
          return;
        }
        console.log("🔍 No partial allocation, proceeding");
      } catch (e) {
        console.warn("Preview check failed:", e);
      }
    }
    
    handleMarketOrder();
  };
  
  const handleAllocationConfirm = () => {
    setShowAllocationWarning(false);
    handleMarketOrder();
  };
  
  const handleAddMoreAuxm = () => {
    if (allocationPreview?.suggestion) {
      // Yeni miktarı hesapla (hedef gram * spread'li fiyat)
      const newAuxmAmount = allocationPreview.suggestion.targetGrams * displayPrice;
      setAmount(allocationPreview.suggestion.targetGrams.toString());
    }
    setShowAllocationWarning(false);
  };

  const handleConfirmTrade = async () => {
    if (!quote || !walletAddress || countdown <= 0) return;
    
    setIsProcessing(true);
    setErrorMessage("");
    
    try {
      // Quote'tan gelen değerleri kullan
      const tradePayload = {
        quoteId: quote.id,
        type: mode, // "buy" veya "sell"
        fromToken: mode === "buy" ? "AUXM" : metal,
        toToken: mode === "buy" ? metal : "AUXM",
        fromAmount: mode === "buy" ? quote.totalAUXM : quote.grams,
        address: walletAddress,
        executeOnChain: true,
      };
      
      console.log("🔷 Trade payload:", tradePayload);
      
      const tradeRes = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tradePayload),
      });
      
      const tradeData = await tradeRes.json();
      
      if (!tradeRes.ok) {
        throw new Error(tradeData.error || "Trade failed");
      }
      
      setResult("success");
      onTradeComplete?.();
      
    } catch (error: any) {
      setErrorMessage(error.message || "Trade failed");
      setResult("error");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header with Metal Icon */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: metalInfo.color + '30' }}>
              <Image 
                src={metalInfo.icon} 
                alt={metal} 
                width={28} 
                height={28}
                className="object-contain"
              />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{metalName}</h2>
              <p className="text-xs text-slate-400">{metal}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Allocation Warning Modal */}
          {showAllocationWarning && allocationPreview && (
            <div className="py-4">
              <div className="flex items-center justify-center mb-4">
                <div className="w-14 h-14 bg-amber-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-white text-center mb-2">
                {lang === "tr" ? "Kısmi Allocation" : "Partial Allocation"}
              </h3>
              
              <p className="text-sm text-slate-400 text-center mb-4">
                {lang === "tr" 
                  ? `${allocationPreview.totalGrams.toFixed(4)}g ${metal} satın alıyorsunuz:`
                  : `You are buying ${allocationPreview.totalGrams.toFixed(4)}g ${metal}:`}
              </p>
              
              <div className="bg-slate-800/50 rounded-xl p-4 space-y-3 mb-4">
                {/* Allocated */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm text-slate-300">
                      {lang === "tr" ? "Kasada Allocate" : "Vault Allocated"}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-emerald-400">
                    {allocationPreview.allocatedGrams}g
                  </span>
                </div>
                
                {/* Non-Allocated */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <span className="text-amber-500 text-xs">○</span>
                    </div>
                    <span className="text-sm text-slate-300">
                      {lang === "tr" ? "Non-Allocated" : "Non-Allocated"}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-amber-400">
                    {allocationPreview.nonAllocatedGrams.toFixed(4)}g
                  </span>
                </div>
              </div>
              
              <p className="text-xs text-slate-500 text-center mb-4">
                {lang === "tr" 
                  ? "Sadece tam gramlar fiziksel altına allocate edilebilir. Kesirli kısım bakiyenizde non-allocated olarak kalır."
                  : "Only whole grams can be allocated to physical metal. Fractional amounts remain non-allocated in your balance."}
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                {allocationPreview.suggestion && (
                  <button
                    onClick={handleAddMoreAuxm}
                    className="px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-slate-200 hover:bg-slate-700 transition-colors text-sm font-medium"
                  >
                    <span className="block text-xs text-slate-400 mb-0.5">
                      {lang === "tr" ? "Ekle" : "Add"}
                    </span>
                    +{allocationPreview.suggestion.gramsToAdd.toFixed(4)}g → {allocationPreview.suggestion.targetGrams}g
                  </button>
                )}
                <button
                  onClick={handleAllocationConfirm}
                  className="px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-semibold hover:from-amber-600 hover:to-yellow-600 transition-colors text-sm"
                >
                  {lang === "tr" ? "Devam Et" : "Continue"}
                </button>
              </div>
            </div>
          )}
          
          {result === "success" ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                {orderType === "limit" ? t.orderPlaced : t.success}
              </h3>
              {orderType === "limit" && (
                <p className="text-sm text-slate-400 mb-4">{t.limitOrderInfo}</p>
              )}
              <button
                onClick={onClose}
                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-white font-medium"
              >
                {t.close}
              </button>
            </div>
          ) : showAllocationWarning ? null : (
            <>
              {/* Buy/Sell Toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800 rounded-xl">
                <button
                  onClick={() => { setMode("buy"); setQuote(null); setShowConfirmation(false); }}
                  className={`py-2.5 rounded-lg font-semibold transition-all ${
                    mode === "buy"
                      ? "bg-emerald-500 text-white shadow-lg"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {t.buy}
                </button>
                <button
                  onClick={() => { setMode("sell"); setQuote(null); setShowConfirmation(false); }}
                  className={`py-2.5 rounded-lg font-semibold transition-all ${
                    mode === "sell"
                      ? "bg-red-500 text-white shadow-lg"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {t.sell}
                </button>
              </div>

              {/* Order Type Toggle */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">{t.orderType}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setOrderType("market"); setQuote(null); setShowConfirmation(false); }}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      orderType === "market"
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                    }`}
                  >
                    <div className={`font-semibold ${orderType === "market" ? "text-amber-400" : "text-slate-300"}`}>
                      {t.market}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{t.marketDesc}</div>
                  </button>
                  <button
                    onClick={() => { setOrderType("limit"); setQuote(null); setShowConfirmation(false); }}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      orderType === "limit"
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                    }`}
                  >
                    <div className={`font-semibold ${orderType === "limit" ? "text-blue-400" : "text-slate-300"}`}>
                      {t.limit}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{t.limitDesc}</div>
                  </button>
                </div>
              </div>

              {/* Balance Display */}
              <div className="p-3 bg-slate-800/50 rounded-xl space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">
                    {mode === "buy" ? `${t.balance} (${paymentMethod})` : `${t.balance} (${metal})`}
                  </span>
                  <span className="text-white font-mono">
                    {mode === "buy" 
                      ? `${availableBalance.toFixed(paymentMethod === "BTC" ? 6 : 2)} ${paymentMethod}`
                      : `${userBalance?.metals?.[metal]?.toFixed(4) || "0.0000"} ${metal}`
                    }
                  </span>
                </div>
                {mode === "buy" && paymentMethod === "AUXM" && userBalance?.bonusAuxm && userBalance.bonusAuxm > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-purple-400">🎁 {t.bonus} AUXM</span>
                      <span className="text-purple-400 font-mono">+{userBalance.bonusAuxm.toFixed(2)} AUXM</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-slate-700 pt-1">
                      <span className="text-slate-400">{t.total}</span>
                      <span className="text-white font-mono">{((userBalance?.auxm || 0) + (userBalance?.bonusAuxm || 0)).toFixed(2)} AUXM</span>
                    </div>
                  </>
                )}
              </div>

              {/* Price Display */}
              <div className="p-3 bg-slate-800/50 rounded-xl">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">{mode === "buy" ? t.askPrice : t.bidPrice}</span>
                  <span className="text-emerald-400 font-mono">${displayPrice.toFixed(2)}/g</span>
                </div>
                {quote && (
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-slate-400">{t.spread}</span>
                    <span className="text-amber-400 font-mono">{quote.spreadPercent.toFixed(2)}%</span>
                  </div>
                )}
              </div>

              {/* Amount Input */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">{t.amount}</label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setQuote(null); setShowConfirmation(false); }}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-lg font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-20"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <span className="text-slate-500">{metal}</span>
                    <button
                      onClick={() => {
                        const maxPrice = orderType === "limit" ? limitPriceNum : displayPrice;
                        const max = mode === "buy" 
                          ? maxPrice > 0 ? (availableBalance / maxPrice).toFixed(4) : "0"
                          : (userBalance?.metals?.[metal] || 0).toString();
                        setAmount(max);
                        setQuote(null);
                        setShowConfirmation(false);
                      }}
                      className="px-2 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30"
                    >
                      MAX
                    </button>
                  </div>
                </div>
              </div>

              {/* Limit Price Input */}
              {orderType === "limit" && (
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">{t.limitPrice}</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input
                      type="number"
                      value={limitPrice}
                      onChange={(e) => setLimitPrice(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full pl-8 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">/ gram</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {[-5, -2, -1, 0, 1, 2, 5].map((percent) => {
                      const basePrice = mode === "buy" ? currentPrice : (bidPrice || currentPrice * 0.98);
                      const adjustedPrice = basePrice * (1 + percent / 100);
                      return (
                        <button
                          key={percent}
                          onClick={() => setLimitPrice(adjustedPrice.toFixed(2))}
                          className={`flex-1 py-1.5 text-xs rounded-lg transition-colors ${
                            percent === 0 
                              ? "bg-slate-700 text-white" 
                              : percent < 0 
                                ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          }`}
                        >
                          {percent > 0 ? "+" : ""}{percent}%
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Payment Method */}
              {mode === "buy" && (
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">{t.paymentMethod}</label>
                  <div className="grid grid-cols-6 gap-2">
                    {PAYMENT_METHODS.map((pm) => (
                      <button
                        key={pm.id}
                        onClick={() => { setPaymentMethod(pm.id); setQuote(null); setShowConfirmation(false); }}
                        className={`p-2 rounded-xl text-center transition-all ${
                          paymentMethod === pm.id
                            ? "bg-purple-500/30 border-2 border-purple-500"
                            : "bg-slate-800 border-2 border-slate-700"
                        }`}
                      >
                        <div className="text-lg" style={{ color: pm.color }}>{pm.icon}</div>
                        <div className="text-xs text-slate-400 mt-1">{pm.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                <div className="text-sm text-slate-400 mb-1">
                  {mode === "buy" ? t.totalPayment : t.youReceive}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl" style={{ color: PAYMENT_METHODS.find(p => p.id === (mode === "buy" ? paymentMethod : "AUXM"))?.color }}>
                    {PAYMENT_METHODS.find(p => p.id === (mode === "buy" ? paymentMethod : "AUXM"))?.icon}
                  </span>
                  <span className="text-2xl font-bold text-white">
                    {total.toFixed(paymentMethod === "BTC" ? 6 : 2)}
                  </span>
                  <span className="text-slate-400">{mode === "buy" ? paymentMethod : "AUXM"}</span>
                </div>
                {mode === "buy" && paymentMethod !== "AUXM" && (
                  <div className="text-sm text-slate-400 mt-1">
                    ≈ ${(amountNum * displayPrice).toFixed(2)} USD
                  </div>
                )}
                {orderType === "limit" && (
                  <div className="text-xs text-blue-400 mt-2">
                    @ ${limitPriceNum.toFixed(2)} / gram
                  </div>
                )}
              </div>

              {/* Bonus Usage */}
              {mode === "buy" && paymentMethod === "AUXM" && bonusUsage.usedBonus > 0 && (
                <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-sm">
                  <div className="flex justify-between">
                    <span className="text-purple-300">🎁 {t.bonusUsage}:</span>
                    <span className="text-purple-400 font-mono">{bonusUsage.usedBonus.toFixed(2)} AUXM</span>
                  </div>
                  {bonusUsage.usedRegular > 0 && (
                    <div className="flex justify-between mt-1">
                      <span className="text-slate-400">{t.normalAuxm}:</span>
                      <span className="text-white font-mono">{bonusUsage.usedRegular.toFixed(2)} AUXM</span>
                    </div>
                  )}
                </div>
              )}

              {/* Insufficient Balance Warning */}
              {hasInsufficientBalance && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl">
                  <p className="text-red-400 text-sm">{t.insufficientBalance}</p>
                </div>
              )}

              {/* Error Message */}
              {errorMessage && !result && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl">
                  <p className="text-red-400 text-sm">{errorMessage}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium text-slate-300 transition-all"
                >
                  {t.cancel}
                </button>
                
                {orderType === "limit" ? (
                  <button
                    onClick={handleTradeClick}
                    disabled={isProcessing || amountNum <= 0 || limitPriceNum <= 0 || hasInsufficientBalance || !walletAddress}
                    className={`flex-1 py-3 rounded-xl font-semibold text-white transition-all ${
                      isProcessing || amountNum <= 0 || limitPriceNum <= 0 || hasInsufficientBalance || !walletAddress
                        ? "bg-slate-600 cursor-not-allowed"
                        : "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                    }`}
                  >
                    {isProcessing ? t.processing : t.placeOrder}
                  </button>
                ) : !showConfirmation ? (
                  <button
                    onClick={handleTradeClick}
                    disabled={isProcessing || amountNum <= 0 || hasInsufficientBalance || !walletAddress}
                    className={`flex-1 py-3 rounded-xl font-semibold text-white transition-all ${
                      isProcessing || amountNum <= 0 || hasInsufficientBalance || !walletAddress
                        ? "bg-slate-600 cursor-not-allowed"
                        : mode === "buy"
                          ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                          : "bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
                    }`}
                  >
                    {isProcessing ? t.processing : `${mode === "buy" ? t.buy : t.sell} ${metal}`}
                  </button>
                ) : (
                  <button
                    onClick={handleConfirmTrade}
                    disabled={isProcessing || countdown <= 0}
                    className={`flex-1 py-3 rounded-xl font-semibold text-white transition-all ${
                      isProcessing || countdown <= 0
                        ? "bg-slate-600 cursor-not-allowed"
                        : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 animate-pulse"
                    }`}
                  >
                    {isProcessing ? t.processing : countdown <= 0 ? t.newPrice : `✓ ${t.confirm} (${countdown}s)`}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default MetalTradeModal;
