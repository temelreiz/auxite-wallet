"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/Toast";
import { useWallet } from "@/components/WalletContext";
import { useAccount } from "wagmi";
import type { MetalId } from "@/lib/metals";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { useTrade } from "@/hooks/useTrade";
import { isLaunchCampaignActive, calculateAuxmBonus } from "@/lib/auxm-bonus-service";
import { LimitOrdersList } from "./LimitOrdersList";

interface TradePanelProps {
  metalId: MetalId;
  metalSymbol: string;
  metalName: string;
  currentPrice: number;
  bidPrice?: number;
  onClose: () => void;
  lang?: string;
  initialMode?: "buy" | "sell";
}

type Currency = "AUXM" | "USDT" | "BTC" | "ETH" | "XRP" | "SOL";
type OrderType = "market" | "limit";

// Currency conversion helper
function convertToCurrency(
  usdAmount: number, 
  cryptoPrices: { eth: number; btc: number; xrp?: number; sol?: number } | null, 
  currency: Currency
): number {
  if (!cryptoPrices) return usdAmount;
  
  switch (currency) {
    case "ETH":
      return cryptoPrices.eth > 0 ? usdAmount / cryptoPrices.eth : 0;
    case "BTC":
      return cryptoPrices.btc > 0 ? usdAmount / cryptoPrices.btc : 0;
    case "XRP":
      return (cryptoPrices.xrp || 2.20) > 0 ? usdAmount / (cryptoPrices.xrp || 2.20) : 0;
    case "SOL":
      return (cryptoPrices.sol || 235) > 0 ? usdAmount / (cryptoPrices.sol || 235) : 0;
    case "AUXM":
    case "USDT":
    default:
      return usdAmount;
  }
}

export default function TradePanel({
  metalId,
  metalSymbol,
  metalName,
  currentPrice,
  bidPrice,
  onClose,
  lang = "en",
  initialMode = "buy",
}: TradePanelProps) {
  const { address, refreshBalances, balances, isConnected } = useWallet();
  const toast = useToast();
  const [quote, setQuote] = useState<{ id: string; pricePerGram: number; spreadPercent: number; expiresAt: number } | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [tradeSuccess, setTradeSuccess] = useState(false);
  const [showAllocationWarning, setShowAllocationWarning] = useState(false);
  const [allocationPreview, setAllocationPreview] = useState<{
    totalGrams: number;
    allocatedGrams: number;
    nonAllocatedGrams: number;
    hasPartialAllocation: boolean;
    suggestion?: { gramsToAdd: number; auxmToAdd: number; targetGrams: number; };
  } | null>(null);
  const [mode, setMode] = useState<"buy" | "sell">(initialMode);
  const [orderType, setOrderType] = useState<OrderType>("market");
  const [amount, setAmount] = useState<string>("1");
  const [limitPrice, setLimitPrice] = useState<string>("");
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("AUXM");
  const [limitOrderSuccess, setLimitOrderSuccess] = useState(false);
  const [isPlacingLimitOrder, setIsPlacingLimitOrder] = useState(false);
  const [isAuxmTrading, setIsAuxmTrading] = useState(false);
  const { prices: cryptoPrices, loading: pricesLoading } = useCryptoPrices();
  
  const {
    buy,
    sell,
    reset,
    step,
    errorMessage,
    isApproving,
    isTrading,
    isSuccess,
    tradeHash,
    metalBalance,
  } = useTrade({ metalSymbol });


  // Use WalletContext balance instead of mock data
  const auxmBalance = { 
    auxm: balances?.auxm || 0, 
    bonusAuxm: balances?.bonusAuxm || 0 
  };
  const totalAuxm = auxmBalance.auxm + auxmBalance.bonusAuxm;

  // WalletContext balance
  const getMetalBalance = () => {
    if (!balances) return 0;
    const key = metalId.toLowerCase() as keyof typeof balances;
    return balances[key] as number || 0;
  };
  const walletMetalBalance = getMetalBalance();
  
  // Price calculations
  const marketPrice = mode === "sell" ? (bidPrice || currentPrice * 0.99) : currentPrice;
  const limitPriceNum = parseFloat(limitPrice) || 0;
  const effectivePrice = orderType === "limit" ? limitPriceNum : marketPrice;
  
  const amountNum = parseFloat(amount) || 0;
  const totalUSD = effectivePrice * amountNum;
  
  // Bonus hesaplama (buy mode için)
  const bonusCalculation = mode === "buy" && selectedCurrency === "AUXM" 
    ? calculateAuxmBonus(totalUSD) 
    : null;

  // Bonus kullanımı hesaplama
  const calculateBonusUsage = () => {
    if (mode !== "buy" || selectedCurrency !== "AUXM") return { usedBonus: 0, usedRegular: totalUSD };
    
    if (auxmBalance.bonusAuxm >= totalUSD) {
      return { usedBonus: totalUSD, usedRegular: 0 };
    } else {
      return { 
        usedBonus: auxmBalance.bonusAuxm, 
        usedRegular: totalUSD - auxmBalance.bonusAuxm 
      };
    }
  };

  const bonusUsage = calculateBonusUsage();
  const canAffordAuxm = mode === "buy" && selectedCurrency === "AUXM" ? totalUSD <= totalAuxm : true;
  const totalInCurrency = convertToCurrency(totalUSD, cryptoPrices, selectedCurrency);

  const currencies: Currency[] = ["AUXM", "USDT", "BTC", "ETH", "XRP", "SOL"];

  const getCurrencySymbol = (curr: Currency) => {
    const symbols: Record<Currency, string> = { 
      AUXM: "◈", 
      USDT: "₮", 
      BTC: "₿", 
      ETH: "Ξ", 
      XRP: "✕", 
      SOL: "◎" 
    };
    return symbols[curr];
  };

  const getCurrencyColor = (curr: Currency) => {
    const colors: Record<Currency, string> = { 
      AUXM: "#A855F7", 
      USDT: "#26A17B", 
      BTC: "#F7931A", 
      ETH: "#627EEA", 
      XRP: "#23292F", 
      SOL: "#9945FF" 
    };
    return colors[curr];
  };

  // Multi-language translations
  const translations: Record<string, Record<string, string>> = {
    tr: {
      market: "Piyasa",
      limit: "Limit",
      orderType: "Emir Tipi",
      marketDesc: "Anlık piyasa fiyatından",
      limitDesc: "Belirlediğin fiyattan",
      limitPrice: "Limit Fiyat",
      currentPrice: "Güncel Fiyat",
      placeOrder: "Emir Ver",
      orderPlaced: "Limit Emir Verildi!",
      limitOrderInfo: "Limit emriniz piyasa fiyatı belirlediğiniz seviyeye ulaştığında otomatik gerçekleşecektir.",
      buy: "Tahsis Et",
      sell: "Geri Al",
      buyNow: "Tahsisi Onayla",
      sellNow: "Geri Almayı Onayla",
      acquire: "Tahsis Et",
      redeem: "Geri Al",
      cancel: "İptal",
      confirm: "Onayla",
      confirmAllocation: "Tahsisi Onayla",
      approving: "Onaylanıyor...",
      processing: "İşleniyor...",
      placingOrder: "Tahsis Veriliyor...",
      tradeSuccess: "Tahsis Tamamlandı!",
      allocationComplete: "Tahsis Tamamlandı!",
      viewTransaction: "İşlemi Görüntüle",
      priceLocked: "Fiyat Kilitlendi",
      priceExpired: "Fiyat süresi doldu",
      getNewPrice: "Yeni fiyat alın",
      totalPayment: "Toplam Ödeme",
      totalReceive: "Toplam Alacak",
      amount: "Miktar",
      gram: "gram",
      balance: "Varlıklar",
      holdings: "Varlıklar",
      availableBalance: "Kullanılabilir Varlıklar",
      insufficientBalance: "Yetersiz bakiye",
      insufficientAuxm: "Yetersiz AUXM bakiyesi",
      connectWallet: "Lütfen cüzdanınızı bağlayın",
      enterValidAmount: "Geçerli bir miktar girin",
      enterValidPrice: "Geçerli miktar ve fiyat girin",
      tokenApproval: "Token onayı bekleniyor...",
      waitingTransaction: "İşlem onayı bekleniyor...",
      bonusUsage: "Bonus Kullanımı",
      regularAuxm: "Normal AUXM",
      priceFailed: "Fiyat alınamadı",
      tradeFailed: "İşlem başarısız",
      orderFailed: "Emir verilemedi",
      orderCreated: "Limit emriniz başarıyla oluşturuldu",
      seconds: "saniye",
      close: "Kapat",
      tryAgain: "Tekrar Dene",
      campaignActive: "Lansman Kampanyası Aktif!",
      campaignDesc: "Metal tahsis et, bonus AUXM kazan!",
      askPrice: "Satış Fiyatı",
      bidPrice: "Alış Fiyatı",
      amountGrams: "Miktar",
      paymentMethod: "Ödeme Yöntemi",
      receiveAs: "Alınacak Para Birimi",
      pleaseWait: "Lütfen bekleyin",
      sec: "sn",
      total: "Toplam",
      bonus: "Bonus",
    },
    en: {
      market: "Market",
      limit: "Limit",
      orderType: "Order Type",
      marketDesc: "At current market price",
      limitDesc: "At your specified price",
      limitPrice: "Limit Price",
      currentPrice: "Current Price",
      placeOrder: "Place Order",
      orderPlaced: "Limit Order Placed!",
      limitOrderInfo: "Your limit order will automatically execute when market price reaches your specified level.",
      buy: "Allocate",
      sell: "Redeem",
      buyNow: "Confirm Allocation",
      sellNow: "Confirm Redemption",
      acquire: "Allocate",
      redeem: "Redeem",
      cancel: "Cancel",
      confirm: "Confirm",
      confirmAllocation: "Confirm Allocation",
      approving: "Approving...",
      processing: "Processing...",
      placingOrder: "Placing Allocation...",
      tradeSuccess: "Allocation Complete!",
      allocationComplete: "Allocation Complete!",
      viewTransaction: "View Transaction",
      priceLocked: "Price Locked",
      priceExpired: "Price expired",
      getNewPrice: "Get new price",
      totalPayment: "Total Payment",
      totalReceive: "Total Receive",
      amount: "Amount",
      gram: "gram",
      balance: "Holdings",
      holdings: "Holdings",
      availableBalance: "Available Holdings",
      insufficientBalance: "Insufficient balance",
      insufficientAuxm: "Insufficient AUXM balance",
      connectWallet: "Please connect your wallet",
      enterValidAmount: "Enter a valid amount",
      enterValidPrice: "Enter valid amount and price",
      tokenApproval: "Waiting for token approval...",
      waitingTransaction: "Waiting for transaction...",
      bonusUsage: "Bonus Usage",
      regularAuxm: "Regular AUXM",
      priceFailed: "Failed to get price",
      tradeFailed: "Trade failed",
      orderFailed: "Order failed",
      orderCreated: "Your limit order has been created",
      seconds: "seconds",
      close: "Close",
      tryAgain: "Try Again",
      campaignActive: "Launch Campaign Active!",
      campaignDesc: "Allocate metals and earn bonus AUXM!",
      askPrice: "Ask Price",
      bidPrice: "Bid Price",
      amountGrams: "Amount",
      paymentMethod: "Payment Method",
      receiveAs: "Receive As",
      pleaseWait: "Please wait",
      sec: "s",
      total: "Total",
      bonus: "Bonus",
    },
    de: {
      market: "Markt",
      limit: "Limit",
      orderType: "Auftragstyp",
      marketDesc: "Zum aktuellen Marktpreis",
      limitDesc: "Zu Ihrem angegebenen Preis",
      limitPrice: "Limitpreis",
      currentPrice: "Aktueller Preis",
      placeOrder: "Auftrag erteilen",
      orderPlaced: "Limitauftrag erteilt!",
      limitOrderInfo: "Ihr Limitauftrag wird automatisch ausgeführt, wenn der Marktpreis Ihr angegebenes Niveau erreicht.",
      buy: "Kaufen",
      sell: "Verkaufen",
      buyNow: "Jetzt kaufen",
      sellNow: "Jetzt verkaufen",
      cancel: "Abbrechen",
      confirm: "Bestätigen",
      approving: "Genehmigung...",
      processing: "Verarbeitung...",
      placingOrder: "Auftrag wird erteilt...",
      tradeSuccess: "Handel erfolgreich!",
      viewTransaction: "Transaktion anzeigen",
      priceLocked: "Preis gesperrt",
      priceExpired: "Preis abgelaufen",
      getNewPrice: "Neuen Preis abrufen",
      totalPayment: "Gesamtzahlung",
      totalReceive: "Gesamterhalt",
      amount: "Menge",
      gram: "Gramm",
      balance: "Guthaben",
      availableBalance: "Verfügbares Guthaben",
      insufficientBalance: "Unzureichendes Guthaben",
      insufficientAuxm: "Unzureichendes AUXM-Guthaben",
      connectWallet: "Bitte verbinden Sie Ihre Wallet",
      enterValidAmount: "Geben Sie einen gültigen Betrag ein",
      enterValidPrice: "Geben Sie gültigen Betrag und Preis ein",
      tokenApproval: "Warten auf Token-Genehmigung...",
      waitingTransaction: "Warten auf Transaktion...",
      bonusUsage: "Bonusnutzung",
      regularAuxm: "Reguläres AUXM",
      priceFailed: "Preis konnte nicht abgerufen werden",
      tradeFailed: "Handel fehlgeschlagen",
      orderFailed: "Auftrag fehlgeschlagen",
      orderCreated: "Ihr Limitauftrag wurde erstellt",
      seconds: "Sekunden",
      close: "Schließen",
      tryAgain: "Erneut versuchen",
      campaignActive: "Startkampagne aktiv!",
      campaignDesc: "Metalle kaufen und Bonus-AUXM verdienen!",
      askPrice: "Verkaufspreis",
      bidPrice: "Kaufpreis",
      amountGrams: "Menge",
      paymentMethod: "Zahlungsmethode",
      receiveAs: "Erhalten als",
      pleaseWait: "Bitte warten",
      sec: "s",
      total: "Gesamt",
      bonus: "Bonus",
    },
    fr: {
      market: "Marché",
      limit: "Limite",
      orderType: "Type d'ordre",
      marketDesc: "Au prix actuel du marché",
      limitDesc: "À votre prix spécifié",
      limitPrice: "Prix limite",
      currentPrice: "Prix actuel",
      placeOrder: "Passer l'ordre",
      orderPlaced: "Ordre limite passé!",
      limitOrderInfo: "Votre ordre limite sera exécuté automatiquement lorsque le prix du marché atteindra votre niveau spécifié.",
      buy: "Acheter",
      sell: "Vendre",
      buyNow: "Acheter maintenant",
      sellNow: "Vendre maintenant",
      cancel: "Annuler",
      confirm: "Confirmer",
      approving: "Approbation...",
      processing: "Traitement...",
      placingOrder: "Passage de l'ordre...",
      tradeSuccess: "Transaction réussie!",
      viewTransaction: "Voir la transaction",
      priceLocked: "Prix verrouillé",
      priceExpired: "Prix expiré",
      getNewPrice: "Obtenir un nouveau prix",
      totalPayment: "Paiement total",
      totalReceive: "Réception totale",
      amount: "Montant",
      gram: "gramme",
      balance: "Solde",
      availableBalance: "Solde disponible",
      insufficientBalance: "Solde insuffisant",
      insufficientAuxm: "Solde AUXM insuffisant",
      connectWallet: "Veuillez connecter votre portefeuille",
      enterValidAmount: "Entrez un montant valide",
      enterValidPrice: "Entrez un montant et un prix valides",
      tokenApproval: "En attente d'approbation du token...",
      waitingTransaction: "En attente de la transaction...",
      bonusUsage: "Utilisation du bonus",
      regularAuxm: "AUXM régulier",
      priceFailed: "Échec de l'obtention du prix",
      tradeFailed: "Transaction échouée",
      orderFailed: "Ordre échoué",
      orderCreated: "Votre ordre limite a été créé",
      seconds: "secondes",
      close: "Fermer",
      tryAgain: "Réessayer",
      campaignActive: "Campagne de lancement active!",
      campaignDesc: "Achetez des métaux et gagnez des AUXM bonus!",
      askPrice: "Prix de vente",
      bidPrice: "Prix d'achat",
      amountGrams: "Montant",
      paymentMethod: "Méthode de paiement",
      receiveAs: "Recevoir en",
      pleaseWait: "Veuillez patienter",
      sec: "s",
      total: "Total",
      bonus: "Bonus",
    },
    ar: {
      market: "السوق",
      limit: "محدد",
      orderType: "نوع الأمر",
      marketDesc: "بسعر السوق الحالي",
      limitDesc: "بالسعر المحدد",
      limitPrice: "السعر المحدد",
      currentPrice: "السعر الحالي",
      placeOrder: "تقديم الأمر",
      orderPlaced: "تم تقديم الأمر المحدد!",
      limitOrderInfo: "سيتم تنفيذ أمرك المحدد تلقائياً عندما يصل سعر السوق إلى المستوى المحدد.",
      buy: "شراء",
      sell: "بيع",
      buyNow: "اشترِ الآن",
      sellNow: "بع الآن",
      cancel: "إلغاء",
      confirm: "تأكيد",
      approving: "جاري الموافقة...",
      processing: "جاري المعالجة...",
      placingOrder: "جاري تقديم الأمر...",
      tradeSuccess: "نجحت الصفقة!",
      viewTransaction: "عرض المعاملة",
      priceLocked: "السعر مقفل",
      priceExpired: "انتهت صلاحية السعر",
      getNewPrice: "احصل على سعر جديد",
      totalPayment: "إجمالي الدفع",
      totalReceive: "إجمالي الاستلام",
      amount: "المبلغ",
      gram: "غرام",
      balance: "الرصيد",
      availableBalance: "الرصيد المتاح",
      insufficientBalance: "رصيد غير كافٍ",
      insufficientAuxm: "رصيد AUXM غير كافٍ",
      connectWallet: "يرجى توصيل محفظتك",
      enterValidAmount: "أدخل مبلغاً صالحاً",
      enterValidPrice: "أدخل مبلغاً وسعراً صالحين",
      tokenApproval: "في انتظار موافقة الرمز...",
      waitingTransaction: "في انتظار المعاملة...",
      bonusUsage: "استخدام المكافأة",
      regularAuxm: "AUXM العادي",
      priceFailed: "فشل الحصول على السعر",
      tradeFailed: "فشلت الصفقة",
      orderFailed: "فشل الأمر",
      orderCreated: "تم إنشاء أمرك المحدد",
      seconds: "ثواني",
      close: "إغلاق",
      tryAgain: "حاول مرة أخرى",
      campaignActive: "حملة الإطلاق نشطة!",
      campaignDesc: "اشترِ المعادن واكسب مكافأة AUXM!",
      askPrice: "سعر البيع",
      bidPrice: "سعر الشراء",
      amountGrams: "الكمية",
      paymentMethod: "طريقة الدفع",
      receiveAs: "استلام كـ",
      pleaseWait: "يرجى الانتظار",
      sec: "ث",
      total: "المجموع",
      bonus: "مكافأة",
    },
    ru: {
      market: "Рынок",
      limit: "Лимит",
      orderType: "Тип ордера",
      marketDesc: "По текущей рыночной цене",
      limitDesc: "По указанной вами цене",
      limitPrice: "Лимитная цена",
      currentPrice: "Текущая цена",
      placeOrder: "Разместить ордер",
      orderPlaced: "Лимитный ордер размещён!",
      limitOrderInfo: "Ваш лимитный ордер будет автоматически исполнен, когда рыночная цена достигнет указанного уровня.",
      buy: "Купить",
      sell: "Продать",
      buyNow: "Купить сейчас",
      sellNow: "Продать сейчас",
      cancel: "Отмена",
      confirm: "Подтвердить",
      approving: "Одобрение...",
      processing: "Обработка...",
      placingOrder: "Размещение ордера...",
      tradeSuccess: "Сделка успешна!",
      viewTransaction: "Просмотр транзакции",
      priceLocked: "Цена зафиксирована",
      priceExpired: "Срок цены истёк",
      getNewPrice: "Получить новую цену",
      totalPayment: "Общая оплата",
      totalReceive: "Общее получение",
      amount: "Сумма",
      gram: "грамм",
      balance: "Баланс",
      availableBalance: "Доступный баланс",
      insufficientBalance: "Недостаточный баланс",
      insufficientAuxm: "Недостаточный баланс AUXM",
      connectWallet: "Пожалуйста, подключите кошелёк",
      enterValidAmount: "Введите корректную сумму",
      enterValidPrice: "Введите корректную сумму и цену",
      tokenApproval: "Ожидание одобрения токена...",
      waitingTransaction: "Ожидание транзакции...",
      bonusUsage: "Использование бонуса",
      regularAuxm: "Обычный AUXM",
      priceFailed: "Не удалось получить цену",
      tradeFailed: "Сделка не удалась",
      orderFailed: "Ордер не удался",
      orderCreated: "Ваш лимитный ордер создан",
      seconds: "секунд",
      close: "Закрыть",
      tryAgain: "Повторить",
      campaignActive: "Стартовая кампания активна!",
      campaignDesc: "Покупайте металлы и зарабатывайте бонус AUXM!",
      askPrice: "Цена продажи",
      bidPrice: "Цена покупки",
      amountGrams: "Количество",
      paymentMethod: "Способ оплаты",
      receiveAs: "Получить как",
      pleaseWait: "Пожалуйста, подождите",
      sec: "с",
      total: "Всего",
      bonus: "Бонус",
    },
  };

  const t = translations[lang] || translations.en;

  // Set default limit price when switching to limit mode
  useEffect(() => {
    if (orderType === "limit" && !limitPrice && marketPrice > 0) {
      setLimitPrice(marketPrice.toFixed(2));
    }
  }, [orderType, marketPrice, limitPrice]);

  // Auto close on success after 2 seconds + Allocation API call
  useEffect(() => {
    if (isSuccess && tradeHash) {
      // Call allocation API for buy orders
      if (mode === "buy" && amountNum > 0) {
        const callAllocationAPI = async () => {
          try {
            // Get user email from user meta API
            let userEmail = "";
            try {
              const metaRes = await fetch(`/api/user/balance?address=${address}`);
              const metaData = await metaRes.json();
              userEmail = metaData.email || metaData.user?.email || "";
            } catch (e) {
              console.warn("Could not fetch user email:", e);
            }
            
            const allocRes = await fetch("/api/allocations", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                address: address,
                metal: metalSymbol,
                grams: amountNum,
                txHash: tradeHash,
                email: userEmail,
              }),
            });
            const allocData = await allocRes.json();
            if (allocData.success) {
              console.log("📜 Allocation created:", allocData.certificateNumber);
            }
          } catch (e) {
            console.warn("Allocation API call failed:", e);
          }
        };
        callAllocationAPI();
      }
      
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, tradeHash, mode, amountNum, address, metalSymbol, onClose]);

  // Countdown timer
  // Countdown timer - simple local countdown
  useEffect(() => {
    if (!quote || countdown <= 0) return;
    
    const timer = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1));
    }, 1000);
    
    return () => clearInterval(timer);
  }, [quote?.id]); // Only restart timer when new quote arrives

  // Handle countdown expiry
  useEffect(() => {
    if (quote && countdown === 0) {
      toast.error(t.priceExpired, t.getNewPrice);
      setQuote(null);
      setShowConfirmation(false);
    }
  }, [countdown, quote, t.priceExpired, t.getNewPrice]);

  // Handle Market Trade
  const handleAllocationConfirm = () => {
    setShowAllocationWarning(false);
    proceedWithMarketTrade();
  };

  const handleAddMoreForAllocation = () => {
    if (allocationPreview?.suggestion) {
      setAmount(allocationPreview.suggestion.targetGrams.toString());
    }
    setShowAllocationWarning(false);
    setAllocationPreview(null);
  };


  const handleMarketTrade = async () => {
    console.log("🔵 handleMarketTrade", { isConnected, address, amountNum, mode });
    if (!isConnected || !address) {
      alert(t.connectWallet);
      return;
    }
    if (amountNum <= 0) {
      alert(t.enterValidAmount);
      return;
    }
    
    // Allocation preview kontrolü (sadece buy modunda ve kesirli gram girildiğinde)
    // Tam gram girildiğinde (1, 2, 3...) uyarı gösterme - fee düzeltmesi API'de yapılacak
    const isWholeGram = Number.isInteger(amountNum);
    
    if (mode === "buy" && !showAllocationWarning && !showConfirmation && !isWholeGram) {
      try {
        const auxmAmount = amountNum * currentPrice;
        const previewRes = await fetch(
          `/api/trade?type=buy&fromToken=AUXM&toToken=${metalSymbol}&amount=${auxmAmount}&address=${address}`
        );
        const previewData = await previewRes.json();
        
        if (previewData.preview?.allocationPreview?.hasPartialAllocation) {
          setAllocationPreview(previewData.preview.allocationPreview);
          setShowAllocationWarning(true);
          return;
        }
      } catch (e) {
        console.warn("Allocation preview check failed:", e);
      }
    }
    
    console.log("🟡 Calling proceedWithMarketTrade");
    proceedWithMarketTrade();
  };

  const proceedWithMarketTrade = async () => {
    console.log("🟢 proceedWithMarketTrade", { quote, countdown, showConfirmation, canAffordAuxm, selectedCurrency });
    setShowAllocationWarning(false);
    
    if (!isConnected || !address) {
      alert(t.connectWallet);
      return;
    }
    if (amountNum <= 0) {
      alert(t.enterValidAmount);
      return;
    }
    if (mode === "buy" && selectedCurrency === "AUXM" && !canAffordAuxm) {
      alert(t.insufficientAuxm);
      return;
    }
    if (mode === "sell" && walletMetalBalance < amountNum) {
      alert(t.insufficientBalance);
      return;
    }

    // Eğer quote yoksa veya süresi dolduysa, yeni quote al
    if (!quote || countdown <= 0) {
      try {
        const quoteRes = await fetch("/api/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: mode,
            metal: metalSymbol,
            grams: amountNum,
            address,
          }),
        });
        const quoteData = await quoteRes.json();
        if (!quoteRes.ok) throw new Error(quoteData.error || "Quote failed");
        
        // API returns { success, quote: {...}, message }
        const quoteObj = quoteData.quote || quoteData;
        setQuote(quoteObj);
        setCountdown(quoteObj.timeRemaining || 30);
        setShowConfirmation(true);
        return;
      } catch (error: any) {
        toast.error(t.priceFailed, error.message);
        return;
      }
    }

    // Quote varsa ve onay modundaysa, işlemi gerçekleştir
    if (showConfirmation && quote) {
      try {
        if (mode === "buy") {
          // All buy operations use API for custodial wallets
          setIsAuxmTrading(true);
          console.log(`🟣 ${selectedCurrency} Buy via API`, { amountNum, metalSymbol, address, selectedCurrency });

          // Calculate fromAmount based on currency
          const fromAmount = selectedCurrency === "AUXM"
            ? amountNum * quote.pricePerGram
            : convertToCurrency(amountNum * quote.pricePerGram, cryptoPrices, selectedCurrency);

          const res = await fetch("/api/trade", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "buy",
              fromToken: selectedCurrency,
              toToken: metalSymbol,
              fromAmount,
              address,
              executeOnChain: true,
            }),
          });
          const data = await res.json();
          console.log("🟣 API Response:", data);
          if (!data.success) throw new Error(data.error || "Trade failed");
          toast.success(t.tradeSuccess || "Trade successful!");
          setShowConfirmation(false);
          setQuote(null);
          setIsAuxmTrading(false);
        } else {
          // Sell mode - use API for custodial wallets
          setIsAuxmTrading(true);
          console.log("🟣 Sell via API", { amountNum, metalSymbol, address });
          const res = await fetch("/api/trade", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "sell",
              fromToken: metalSymbol,
              toToken: "AUXM",
              fromAmount: amountNum,
              address,
              executeOnChain: true,
            }),
          });
          const data = await res.json();
          console.log("🟣 Sell API Response:", data);
          if (!data.success) throw new Error(data.error || "Trade failed");
          toast.success(t.tradeSuccess || "Trade successful!");
          setShowConfirmation(false);
          setQuote(null);
          setIsAuxmTrading(false);
        }
        await refreshBalances();
      } catch (error: any) {
        toast.error(t.tradeFailed, error.message);
        setIsAuxmTrading(false);
      }
    }
  };
  // Handle Limit Order
  const handleLimitOrder = async () => {
    if (!isConnected || !address) {
      alert(t.connectWallet);
      return;
    }
    if (amountNum <= 0 || limitPriceNum <= 0) {
      alert(t.enterValidPrice);
      return;
    }
    if (mode === "buy" && selectedCurrency === "AUXM" && !canAffordAuxm) {
      alert(t.insufficientAuxm);
      return;
    }
    if (mode === "sell" && walletMetalBalance < amountNum) {
      alert(t.insufficientBalance);
      return;
    }

    setIsPlacingLimitOrder(true);

    try {
      const response = await fetch("/api/orders/limit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: mode,
          metal: metalSymbol,
          grams: amountNum,
          limitPrice: limitPriceNum,
          paymentMethod: selectedCurrency,
          address,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to place order");
      }

      setLimitOrderSuccess(true);
      toast.success(t.orderPlaced, t.orderCreated);
      
    } catch (error: any) {
      toast.error(t.orderFailed, error.message);
    } finally {
      setIsPlacingLimitOrder(false);
    }
  };

  // Handle Trade Click
  const handleTrade = () => {
    if (orderType === "market") {
      handleMarketTrade();
    } else {
      handleLimitOrder();
    }
  };

  const isProcessing = isApproving || isTrading || isPlacingLimitOrder || isAuxmTrading;

  const getStepText = () => {
    if (isApproving) return t.tokenApproval;
    if (isTrading) return t.waitingTransaction;
    if (isPlacingLimitOrder) return t.placingOrder;
    if (isAuxmTrading) return t.processing || "İşlem yapılıyor...";
    return "";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {mode === "buy" ? t.buy : t.sell} {metalSymbol}
            </h2>
            <p className="text-xs text-slate-400">{metalName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-2">
          {/* Allocation Warning */}
          {showAllocationWarning && allocationPreview && (
            <div className="py-4">
              <div className="flex items-center justify-center mb-4">
                <div className="w-14 h-14 bg-amber-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center mb-2">
                {lang === "tr" ? "Kısmi Allocation" : "Partial Allocation"}
              </h3>
              
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-4">
                {lang === "tr" 
                  ? `${allocationPreview.totalGrams.toFixed(4)}g ${metalSymbol} satın alıyorsunuz:`
                  : `You are buying ${allocationPreview.totalGrams.toFixed(4)}g ${metalSymbol}:`}
              </p>
              
              <div className="bg-stone-100 dark:bg-slate-800/50 rounded-xl p-4 space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      {lang === "tr" ? "Kasada Allocate" : "Vault Allocated"}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    {allocationPreview.allocatedGrams}g
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <span className="text-amber-500 text-xs">○</span>
                    </div>
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      {lang === "tr" ? "Non-Allocated" : "Non-Allocated"}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                    {allocationPreview.nonAllocatedGrams.toFixed(4)}g
                  </span>
                </div>
              </div>
              
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center mb-4">
                {lang === "tr" 
                  ? "Sadece tam gramlar fiziksel metale allocate edilebilir. Kesirli kısım bakiyenizde non-allocated olarak kalır."
                  : "Only whole grams can be allocated to physical metal. Fractional amounts remain non-allocated in your balance."}
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                {allocationPreview.suggestion && (
                  <button
                    onClick={handleAddMoreForAllocation}
                    className="px-4 py-3 rounded-xl bg-stone-200 dark:bg-slate-800 border border-stone-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-stone-300 dark:hover:bg-slate-700 transition-colors text-sm font-medium"
                  >
                    <span className="block text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                      {lang === "tr" ? "Ekle" : "Add"}
                    </span>
                    +{allocationPreview.suggestion.gramsToAdd.toFixed(4)}g → {allocationPreview.suggestion.targetGrams}g
                  </button>
                )}
                <button
                  onClick={handleAllocationConfirm}
                  className="px-4 py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors text-sm"
                >
                  {lang === "tr" ? "Devam Et" : "Continue"}
                </button>
              </div>
            </div>
          )}

          {/* Success State - Market */}
          {isSuccess && orderType === "market" && (
            <div className="text-center py-6">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                {t.tradeSuccess}
              </h3>
              {tradeHash && (
                <a
                  href={`https://sepolia.etherscan.io/tx/${tradeHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-emerald-400 hover:underline"
                >
                  {t.viewTransaction} ↗
                </a>
              )}
            </div>
          )}

          {/* Success State - Limit Order */}
          {limitOrderSuccess && orderType === "limit" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t.orderPlaced}</h3>
              <p className="text-sm text-slate-400 mb-4 px-4">{t.limitOrderInfo}</p>
              <div className="p-3 bg-stone-50 dark:bg-slate-800 rounded-xl mx-4 text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">{mode === "buy" ? "Buy" : "Sell"}</span>
                  <span className="text-slate-900 dark:text-white font-mono">{amountNum}g {metalSymbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">@ {t.limitPrice}</span>
                  <span className="text-blue-400 font-mono">${limitPriceNum.toFixed(2)}/g</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="mt-4 px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded-xl text-white font-medium"
              >
                {t.close}
              </button>
            </div>
          )}

          {/* Error State */}
          {errorMessage && !isSuccess && !limitOrderSuccess && (
            <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
              <p className="text-sm text-red-400">{errorMessage}</p>
              <button onClick={reset} className="mt-2 text-sm text-red-400 hover:text-red-300 underline">
                {t.tryAgain}
              </button>
            </div>
          )}

          {/* Normal State */}
          {!isSuccess && !limitOrderSuccess && !showAllocationWarning && (
            <>
              {/* Launch Campaign Banner */}
              {isLaunchCampaignActive() && mode === "buy" && (
                <div className="mb-2 p-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🚀</span>
                    <div>
                      <div className="text-sm font-semibold text-purple-700 dark:text-purple-200">{t.campaignActive}</div>
                      <div className="text-[10px] text-purple-600 dark:text-purple-300">{t.campaignDesc}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Buy/Sell Toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 dark:bg-slate-800 rounded-lg mb-2">
                <button
                  onClick={() => { setMode("buy"); setQuote(null); setShowConfirmation(false); setLimitPrice(""); }}
                  disabled={isProcessing}
                  className={`py-2 rounded-md font-semibold text-sm transition-all ${
                    mode === "buy"
                      ? "bg-emerald-500 text-white shadow-lg"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {t.buy}
                </button>
                <button
                  onClick={() => { setMode("sell"); setQuote(null); setShowConfirmation(false); setLimitPrice(""); }}
                  disabled={isProcessing}
                  className={`py-2 rounded-md font-semibold text-sm transition-all ${
                    mode === "sell"
                      ? "bg-red-500 text-white shadow-lg"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {t.sell}
                </button>
              </div>

              {/* Order Type Toggle */}
              <div className="mb-2">
                <label className="text-xs text-slate-400 mb-1 block">{t.orderType}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setOrderType("market"); setQuote(null); setShowConfirmation(false); }}
                    disabled={isProcessing}
                    className={`p-2 rounded-lg border transition-all ${
                      orderType === "market"
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/50 hover:border-stone-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <div className={`text-sm font-semibold ${orderType === "market" ? "text-emerald-500 dark:text-emerald-400" : "text-slate-600 dark:text-slate-300"}`}>
                      {t.market}
                    </div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-500">{t.marketDesc}</div>
                  </button>
                  <button
                    onClick={() => { setOrderType("limit"); setQuote(null); setShowConfirmation(false); }}
                    disabled={isProcessing}
                    className={`p-2 rounded-lg border transition-all ${
                      orderType === "limit"
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/50 hover:border-stone-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <div className={`text-sm font-semibold ${orderType === "limit" ? "text-blue-500 dark:text-blue-400" : "text-slate-600 dark:text-slate-300"}`}>
                      {t.limit}
                    </div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-500">{t.limitDesc}</div>
                  </button>
                </div>
              </div>

              {/* Balance Display */}
              <div className="mb-2 p-2 rounded-lg bg-stone-50 dark:bg-slate-800/50 border border-stone-200 dark:border-slate-700">
                {mode === "buy" ? (
                  <>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">{selectedCurrency} {t.balance}</span>
                      <span className="text-slate-900 dark:text-white font-mono">
                        {selectedCurrency === "AUXM" 
                          ? `${auxmBalance.auxm.toFixed(2)} AUXM`
                          : `${(balances?.[selectedCurrency.toLowerCase() as keyof typeof balances] as number || 0).toFixed(selectedCurrency === "BTC" ? 6 : 2)} ${selectedCurrency}`
                        }
                      </span>
                    </div>
                    {selectedCurrency === "AUXM" && auxmBalance.bonusAuxm > 0 && (
                      <>
                        <div className="flex justify-between text-xs">
                          <span className="text-purple-400">🎁 {t.bonus} AUXM</span>
                          <span className="text-purple-400 font-mono">+{auxmBalance.bonusAuxm.toFixed(2)} AUXM</span>
                        </div>
                        <div className="flex justify-between text-xs border-t border-stone-200 dark:border-slate-700 pt-1 mt-1">
                          <span className="text-slate-400">{t.total}</span>
                          <span className="text-slate-900 dark:text-white font-mono font-medium">{totalAuxm.toFixed(2)} AUXM</span>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">{metalSymbol} {t.balance}</span>
                    <span className="text-slate-900 dark:text-white font-mono">{walletMetalBalance.toFixed(4)} {metalSymbol}</span>
                  </div>
                )}
              </div>

              {/* Current Price Display */}
              <div className="mb-2 p-2 rounded-lg bg-stone-50 dark:bg-slate-800/50 border border-stone-200 dark:border-slate-700">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">
                    {orderType === "market" 
                      ? (mode === "buy" ? t.askPrice : t.bidPrice)
                      : t.currentPrice
                    }
                  </span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">
                    ${marketPrice.toFixed(2)} <span className="text-xs text-slate-400">/g</span>
                  </span>
                </div>
              </div>

              {/* Quote Timer (Market Orders Only) */}
              {orderType === "market" && quote && countdown > 0 && (
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg mb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400">🔒</span>
                      <span className="text-emerald-300 text-xs font-medium">{t.priceLocked}</span>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded ${countdown <= 5 ? "bg-red-500/20 text-red-400 animate-pulse" : "bg-emerald-500/20 text-emerald-400"}`}>
                      <span className="text-lg font-bold font-mono">{countdown}</span>
                      <span className="text-[10px]">{t.sec}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Amount Input */}
              <div className="mb-2">
                <label className="block text-xs text-slate-400 mb-1">{t.amountGrams} ({metalSymbol})</label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setQuote(null); setShowConfirmation(false); }}
                    placeholder="1"
                    min="0"
                    step="0.01"
                    disabled={isProcessing}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                  />
                  <button
                    onClick={() => {
                      const maxBalance = mode === "sell" ? walletMetalBalance : (totalAuxm / effectivePrice);
                      setAmount(maxBalance.toFixed(4));
                      setQuote(null);
                      setShowConfirmation(false);
                    }}
                    disabled={isProcessing}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[10px] bg-stone-200 dark:bg-slate-700 hover:bg-stone-300 dark:hover:bg-slate-600 rounded text-emerald-600 dark:text-emerald-400 font-semibold"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Limit Price Input (Limit Orders Only) */}
              {orderType === "limit" && (
                <div className="mb-2">
                  <label className="block text-xs text-slate-400 mb-1">{t.limitPrice}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <input
                      type="number"
                      value={limitPrice}
                      onChange={(e) => setLimitPrice(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      disabled={isProcessing}
                      className="w-full pl-7 pr-12 py-2 rounded-lg bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">/g</span>
                  </div>
                  
                  {/* Quick price adjustment buttons */}
                  <div className="flex gap-1 mt-1">
                    {[-5, -2, -1, 0, 1, 2, 5].map((percent) => {
                      const adjustedPrice = marketPrice * (1 + percent / 100);
                      return (
                        <button
                          key={percent}
                          onClick={() => setLimitPrice(adjustedPrice.toFixed(2))}
                          disabled={isProcessing || marketPrice === 0}
                          className={`flex-1 py-1 text-[10px] rounded transition-colors disabled:opacity-50 ${
                            percent === 0 
                              ? "bg-stone-200 dark:bg-slate-700 text-slate-900 dark:text-white" 
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

              {/* Currency Selection - Both Buy and Sell */}
              <div className="mb-2">
                <label className="block text-xs text-slate-400 mb-1">
                  {mode === "buy" ? t.paymentMethod : t.receiveAs}
                </label>
                <div className="grid grid-cols-6 gap-1">
                  {currencies.map((curr) => (
                    <button
                      key={curr}
                      onClick={() => !isProcessing && setSelectedCurrency(curr)}
                      disabled={isProcessing}
                      className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg border transition-all ${
                        selectedCurrency === curr
                          ? orderType === "limit"
                            ? "bg-blue-500/20 border-blue-500"
                            : mode === "buy" 
                              ? "bg-purple-500/20 border-purple-500"
                              : "bg-red-500/20 border-red-500"
                          : "bg-stone-50 dark:bg-slate-800 border-stone-200 dark:border-slate-700 hover:border-stone-300 dark:hover:border-slate-600"
                      }`}
                    >
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs"
                        style={{ backgroundColor: getCurrencyColor(curr) }}
                      >
                        {getCurrencySymbol(curr)}
                      </div>
                      <span className="text-[10px] text-slate-600 dark:text-slate-300">{curr}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className={`mb-2 p-2 rounded-lg border ${
                orderType === "limit"
                  ? "bg-blue-500/10 border-blue-500/30"
                  : mode === "buy" 
                    ? selectedCurrency === "AUXM" 
                      ? "bg-purple-500/10 border-purple-500/30"
                      : "bg-emerald-500/10 border-emerald-500/30" 
                    : "bg-red-500/10 border-red-500/30"
              }`}>
                <div className={`text-xs ${
                  orderType === "limit"
                    ? "text-blue-600 dark:text-blue-300"
                    : mode === "buy" 
                      ? selectedCurrency === "AUXM" ? "text-purple-600 dark:text-purple-300" : "text-emerald-600 dark:text-emerald-300" 
                      : "text-red-600 dark:text-red-300"
                }`}>
                  {mode === "buy" ? t.totalPayment : t.totalReceive}
                </div>
                <div className={`text-2xl font-bold ${
                  orderType === "limit"
                    ? "text-blue-400"
                    : mode === "buy" 
                      ? selectedCurrency === "AUXM" ? "text-purple-400" : "text-emerald-400" 
                      : "text-red-400"
                }`}>
                  {pricesLoading && selectedCurrency !== "AUXM" ? (
                    <span className="text-slate-400">...</span>
                  ) : (
                    <>
                      {getCurrencySymbol(selectedCurrency)}{" "}
                      {selectedCurrency === "AUXM" || selectedCurrency === "USDT"
                        ? totalUSD.toFixed(2)
                        : totalInCurrency.toFixed(selectedCurrency === "BTC" || selectedCurrency === "ETH" ? 6 : 4)
                      }
                    </>
                  )}
                </div>
                <div className={`text-[10px] ${
                  orderType === "limit"
                    ? "text-blue-600 dark:text-blue-300"
                    : mode === "buy" 
                      ? selectedCurrency === "AUXM" ? "text-purple-600 dark:text-purple-300" : "text-emerald-600 dark:text-emerald-300" 
                      : "text-red-600 dark:text-red-300"
                }`}>
                  ≈ ${totalUSD.toFixed(2)} USD
                  {orderType === "limit" && limitPriceNum > 0 && (
                    <span className="ml-2">@ ${limitPriceNum.toFixed(2)}/g</span>
                  )}
                </div>
              </div>

              {/* Bonus Usage Info (buy + AUXM) */}
              {mode === "buy" && selectedCurrency === "AUXM" && auxmBalance.bonusAuxm > 0 && amountNum > 0 && (
                <div className="mb-2 p-2 rounded-lg bg-purple-500/10 border border-purple-500/30">
                  <div className="text-xs text-purple-600 dark:text-purple-300">
                    <div className="flex justify-between">
                      <span>🎁 {t.bonusUsage}:</span>
                      <span className="font-mono">{bonusUsage.usedBonus.toFixed(2)} AUXM</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t.regularAuxm}:</span>
                      <span className="font-mono">{bonusUsage.usedRegular.toFixed(2)} AUXM</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Insufficient Balance Warning */}
              {mode === "buy" && selectedCurrency === "AUXM" && !canAffordAuxm && amountNum > 0 && (
                <div className="mb-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <p className="text-xs text-amber-400">⚠️ {t.insufficientAuxm}</p>
                </div>
              )}

              {/* Processing Status */}
              {isProcessing && (
                <div className="mb-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-blue-400" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <div>
                      <div className="text-sm font-medium text-blue-300">{getStepText()}</div>
                      <div className="text-[10px] text-blue-200">{t.pleaseWait}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Pending Limit Orders - Mini List */}
              {orderType === "limit" && address && (
                <div className="mb-2 p-2 bg-stone-50 dark:bg-slate-800/50 rounded-lg border border-stone-200 dark:border-slate-700">
                  <LimitOrdersList
                    address={address}
                    metal={metalSymbol}
                    compact={true}
                    lang={lang as 'tr' | 'en' | 'de' | 'fr' | 'ar' | 'ru'}
                    onOrderCancelled={refreshBalances}
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={onClose}
                  disabled={isProcessing}
                  className="px-3 py-2 rounded-lg bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  {t.cancel}
                </button>
                
                {orderType === "market" ? (
                  // Market Order Button - Institutional solid color, no gradient
                  <button
                    onClick={handleTrade}
                    disabled={isProcessing || amountNum <= 0 || (mode === "buy" && selectedCurrency === "AUXM" && !canAffordAuxm)}
                    className={`px-3 py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 ${
                      mode === "buy"
                        ? "bg-emerald-500 text-white hover:bg-emerald-600"
                        : "bg-slate-600 text-white hover:bg-slate-500"
                    }`}
                  >
                    {isProcessing ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        {step === "approving" ? t.approving : t.processing}
                      </span>
                    ) : showConfirmation && quote && countdown > 0 ? (
                      `✓ ${t.confirm} (${countdown}s)`
                    ) : mode === "buy" ? (
                      t.buyNow
                    ) : (
                      t.sellNow
                    )}
                  </button>
                ) : (
                  // Limit Order Button - Institutional styling
                  <button
                    onClick={handleTrade}
                    disabled={isProcessing || amountNum <= 0 || limitPriceNum <= 0 || (mode === "buy" && selectedCurrency === "AUXM" && !canAffordAuxm)}
                    className="px-3 py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 bg-slate-600 text-white hover:bg-slate-500"
                  >
                    {isProcessing ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        {t.placingOrder}
                      </span>
                    ) : (
                      t.placeOrder
                    )}
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
