"use client";

import { useState, useEffect, memo } from "react";
import { useWallet } from "@/components/WalletContext";
import { useMetalsPrices } from "@/hooks/useMetalsPrices";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";

type AssetCategory = "metal" | "platform" | "crypto" | "fiat";

type AssetType = 
  | "AUXG" | "AUXS" | "AUXPT" | "AUXPD"
  | "AUXM"
  | "ETH" | "BTC" | "XRP" | "SOL" | "USDT"
  | "USD";

interface AssetInfo {
  name: Record<string, string>;
  icon: string;
  iconType: "image" | "symbol";
  category: AssetCategory;
  color: string;
  unit: string;
}

// Spread Config Interface
interface SpreadConfig {
  metals: {
    gold: { buy: number; sell: number };
    silver: { buy: number; sell: number };
    platinum: { buy: number; sell: number };
    palladium: { buy: number; sell: number };
  };
  crypto: {
    btc: { buy: number; sell: number };
    eth: { buy: number; sell: number };
    xrp: { buy: number; sell: number };
    sol: { buy: number; sell: number };
    usdt: { buy: number; sell: number };
  };
}

const DEFAULT_SPREAD: SpreadConfig = {
  metals: {
    gold: { buy: 1.5, sell: 1.5 },
    silver: { buy: 2.0, sell: 2.0 },
    platinum: { buy: 2.0, sell: 2.0 },
    palladium: { buy: 2.5, sell: 2.5 },
  },
  crypto: {
    btc: { buy: 1.0, sell: 1.0 },
    eth: { buy: 1.0, sell: 1.0 },
    xrp: { buy: 1.5, sell: 1.5 },
    sol: { buy: 1.5, sell: 1.5 },
    usdt: { buy: 0.1, sell: 0.1 },
  },
};

const ASSETS: Record<AssetType, AssetInfo> = {
  USD: { name: { tr: "Amerikan Doları", en: "US Dollar", de: "US-Dollar", fr: "Dollar US", ar: "دولار أمريكي", ru: "Доллар США" }, icon: "$", iconType: "symbol", category: "fiat", color: "#22C55E", unit: "USD" },
  AUXG: { name: { tr: "Altın", en: "Gold", de: "Gold", fr: "Or", ar: "ذهب", ru: "Золото" }, icon: "/gold-favicon-32x32.png", iconType: "image", category: "metal", color: "#F59E0B", unit: "gram" },
  AUXS: { name: { tr: "Gümüş", en: "Silver", de: "Silber", fr: "Argent", ar: "فضة", ru: "Серебро" }, icon: "/silver-favicon-32x32.png", iconType: "image", category: "metal", color: "#94A3B8", unit: "gram" },
  AUXPT: { name: { tr: "Platin", en: "Platinum", de: "Platin", fr: "Platine", ar: "بلاتين", ru: "Платина" }, icon: "/platinum-favicon-32x32.png", iconType: "image", category: "metal", color: "#CBD5E1", unit: "gram" },
  AUXPD: { name: { tr: "Paladyum", en: "Palladium", de: "Palladium", fr: "Palladium", ar: "بالاديوم", ru: "Палладий" }, icon: "/palladium-favicon-32x32.png", iconType: "image", category: "metal", color: "#64748B", unit: "gram" },
  AUXM: { name: { tr: "Auxite Para", en: "Auxite Money", de: "Auxite Geld", fr: "Auxite Monnaie", ar: "أموال أوكسايت", ru: "Деньги Auxite" }, icon: "◈", iconType: "symbol", category: "platform", color: "#A855F7", unit: "AUXM" },
  ETH: { name: { tr: "Ethereum", en: "Ethereum", de: "Ethereum", fr: "Ethereum", ar: "إيثريوم", ru: "Эфириум" }, icon: "Ξ", iconType: "symbol", category: "crypto", color: "#627EEA", unit: "ETH" },
  BTC: { name: { tr: "Bitcoin", en: "Bitcoin", de: "Bitcoin", fr: "Bitcoin", ar: "بيتكوين", ru: "Биткоин" }, icon: "₿", iconType: "symbol", category: "crypto", color: "#F7931A", unit: "BTC" },
  XRP: { name: { tr: "Ripple", en: "Ripple", de: "Ripple", fr: "Ripple", ar: "ريبل", ru: "Рипл" }, icon: "✕", iconType: "symbol", category: "crypto", color: "#23292F", unit: "XRP" },
  SOL: { name: { tr: "Solana", en: "Solana", de: "Solana", fr: "Solana", ar: "سولانا", ru: "Солана" }, icon: "◎", iconType: "symbol", category: "crypto", color: "#9945FF", unit: "SOL" },
  USDT: { name: { tr: "Tether", en: "Tether", de: "Tether", fr: "Tether", ar: "تيثر", ru: "Тезер" }, icon: "₮", iconType: "symbol", category: "crypto", color: "#26A17B", unit: "USDT" },
};

// 6-Language translations
const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "Dönüştür",
    subtitle: "Varlıklarınızı anında dönüştürün",
    conversionRules: "Dönüşüm Kuralları",
    rule1: "USD → AUXM, Metaller, USDT dönüşümü yapılabilir",
    rule2: "USD → Crypto (BTC, ETH vb.) YAPILAMAZ",
    rule3: "Kripto → AUXM veya Metal dönüşümü yapılabilir",
    rule4: "Kripto ↔ Kripto dönüşümü desteklenmiyor",
    from: "Gönder",
    to: "Al",
    balance: "Bakiye",
    youWillReceive: "Alacağınız",
    rate: "Dönüşüm Oranı",
    cryptoToCrypto: "Kripto-kripto dönüşümü desteklenmiyor",
    auxmToCrypto: "AUXM → Kripto için Çekim bölümünü kullanın",
    usdToCrypto: "USD ile kripto alınamaz",
    insufficientBalance: "Yetersiz bakiye",
    processing: "İşleniyor...",
    exchange: "Dönüştür",
    success: "Dönüşüm Başarılı!",
    metals: "Metaller",
    crypto: "Kripto",
  },
  en: {
    title: "Exchange",
    subtitle: "Convert your assets instantly",
    conversionRules: "Conversion Rules",
    rule1: "USD → AUXM, Metals, USDT conversions allowed",
    rule2: "USD → Crypto (BTC, ETH etc.) NOT allowed",
    rule3: "Crypto → AUXM or Metal conversions allowed",
    rule4: "Crypto ↔ Crypto not supported",
    from: "From",
    to: "To",
    balance: "Balance",
    youWillReceive: "You will receive",
    rate: "Rate",
    cryptoToCrypto: "Crypto-to-crypto conversion not supported",
    auxmToCrypto: "Use Withdraw section for AUXM → Crypto",
    usdToCrypto: "Cannot buy crypto with USD",
    insufficientBalance: "Insufficient balance",
    processing: "Processing...",
    exchange: "Exchange",
    success: "Exchange Successful!",
    metals: "Metals",
    crypto: "Crypto",
  },
  de: {
    title: "Umtauschen",
    subtitle: "Tauschen Sie Ihre Vermögenswerte sofort um",
    conversionRules: "Umtauschregeln",
    rule1: "USD → AUXM, Metalle, USDT Umtausch erlaubt",
    rule2: "USD → Krypto (BTC, ETH usw.) NICHT erlaubt",
    rule3: "Krypto → AUXM oder Metall Umtausch erlaubt",
    rule4: "Krypto ↔ Krypto nicht unterstützt",
    from: "Von",
    to: "Nach",
    balance: "Guthaben",
    youWillReceive: "Sie erhalten",
    rate: "Kurs",
    cryptoToCrypto: "Krypto-zu-Krypto Umtausch nicht unterstützt",
    auxmToCrypto: "Verwenden Sie Auszahlung für AUXM → Krypto",
    usdToCrypto: "Krypto kann nicht mit USD gekauft werden",
    insufficientBalance: "Unzureichendes Guthaben",
    processing: "Wird verarbeitet...",
    exchange: "Umtauschen",
    success: "Umtausch erfolgreich!",
    metals: "Metalle",
    crypto: "Krypto",
  },
  fr: {
    title: "Échanger",
    subtitle: "Convertissez vos actifs instantanément",
    conversionRules: "Règles de Conversion",
    rule1: "USD → AUXM, Métaux, USDT autorisés",
    rule2: "USD → Crypto (BTC, ETH etc.) NON autorisé",
    rule3: "Crypto → AUXM ou Métal autorisé",
    rule4: "Crypto ↔ Crypto non supporté",
    from: "De",
    to: "Vers",
    balance: "Solde",
    youWillReceive: "Vous recevrez",
    rate: "Taux",
    cryptoToCrypto: "Conversion crypto-crypto non supportée",
    auxmToCrypto: "Utilisez Retrait pour AUXM → Crypto",
    usdToCrypto: "Impossible d'acheter du crypto avec USD",
    insufficientBalance: "Solde insuffisant",
    processing: "Traitement...",
    exchange: "Échanger",
    success: "Échange Réussi!",
    metals: "Métaux",
    crypto: "Crypto",
  },
  ar: {
    title: "تبادل",
    subtitle: "حوّل أصولك فوراً",
    conversionRules: "قواعد التحويل",
    rule1: "USD → AUXM، المعادن، USDT مسموح",
    rule2: "USD → العملات المشفرة (BTC، ETH إلخ) غير مسموح",
    rule3: "العملات المشفرة → AUXM أو المعادن مسموح",
    rule4: "العملات المشفرة ↔ العملات المشفرة غير مدعوم",
    from: "من",
    to: "إلى",
    balance: "الرصيد",
    youWillReceive: "ستحصل على",
    rate: "السعر",
    cryptoToCrypto: "تحويل العملات المشفرة إلى العملات المشفرة غير مدعوم",
    auxmToCrypto: "استخدم قسم السحب لـ AUXM → العملات المشفرة",
    usdToCrypto: "لا يمكن شراء العملات المشفرة بالدولار",
    insufficientBalance: "رصيد غير كافٍ",
    processing: "جاري المعالجة...",
    exchange: "تبادل",
    success: "تم التبادل بنجاح!",
    metals: "المعادن",
    crypto: "العملات المشفرة",
  },
  ru: {
    title: "Обмен",
    subtitle: "Конвертируйте активы мгновенно",
    conversionRules: "Правила Конвертации",
    rule1: "USD → AUXM, Металлы, USDT разрешено",
    rule2: "USD → Крипто (BTC, ETH и т.д.) НЕ разрешено",
    rule3: "Крипто → AUXM или Металл разрешено",
    rule4: "Крипто ↔ Крипто не поддерживается",
    from: "От",
    to: "К",
    balance: "Баланс",
    youWillReceive: "Вы получите",
    rate: "Курс",
    cryptoToCrypto: "Конвертация крипто-крипто не поддерживается",
    auxmToCrypto: "Используйте Вывод для AUXM → Крипто",
    usdToCrypto: "Нельзя купить крипто за USD",
    insufficientBalance: "Недостаточный баланс",
    processing: "Обработка...",
    exchange: "Обменять",
    success: "Обмен Успешен!",
    metals: "Металлы",
    crypto: "Крипто",
  },
};

interface ExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: string;
}

// Asset Dropdown Component
const AssetDropdown = memo(({ 
  isOpen, 
  onSelect, 
  allowedAssets, 
  currentAsset, 
  position,
  lang,
  getBalance,
}: { 
  isOpen: boolean; 
  onSelect: (asset: AssetType) => void; 
  allowedAssets: AssetType[];
  currentAsset: AssetType;
  position: "top" | "bottom";
  lang: string;
  getBalance: (asset: AssetType) => number;
}) => {
  if (!isOpen) return null;
  
  const posClass = position === "top" ? "bottom-full mb-2" : "top-full mt-2";
  
  return (
    <div className={`absolute left-0 right-0 ${posClass} bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl shadow-xl z-20 max-h-60 overflow-y-auto`}>
      {allowedAssets.map((asset) => {
        const info = ASSETS[asset];
        return (
          <button
            key={asset}
            onClick={() => onSelect(asset)}
            className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-stone-100 dark:hover:bg-slate-700 transition-colors ${currentAsset === asset ? "bg-stone-100 dark:bg-slate-700" : ""}`}
          >
            {info.iconType === "image" ? (
              <img src={info.icon} alt={asset} className="w-6 h-6" />
            ) : (
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: info.color }}>
                {info.icon}
              </div>
            )}
            <div className="flex-1 text-left">
              <div className="text-sm font-medium text-slate-800 dark:text-white">{asset}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{info.name[lang] || info.name.en}</div>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{getBalance(asset).toFixed(2)}</div>
          </button>
        );
      })}
    </div>
  );
});
AssetDropdown.displayName = "AssetDropdown";

export function ExchangeModal({ isOpen, onClose, lang = "en" }: ExchangeModalProps) {
  const t = translations[lang] || translations.en;
  const { balances, refreshBalances, address } = useWallet();
  const { prices: metalPrices } = useMetalsPrices();
  const { prices: cryptoPrices } = useCryptoPrices();

  const [fromAsset, setFromAsset] = useState<AssetType>("USD");
  const [toAsset, setToAsset] = useState<AssetType>("AUXG");
  const [fromAmount, setFromAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);
  const [showFromSelect, setShowFromSelect] = useState(false);
  const [showToSelect, setShowToSelect] = useState(false);
  const [showAllocationWarning, setShowAllocationWarning] = useState(false);
  
  // Spread config state
  const [spreadConfig, setSpreadConfig] = useState<SpreadConfig>(DEFAULT_SPREAD);

  // Fetch spread config from admin API
  useEffect(() => {
    fetch('/api/admin/spread')
      .then(res => res.json())
      .then(data => {
        if (data.config) {
          setSpreadConfig(data.config);
        }
      })
      .catch(err => console.error('Spread fetch error:', err));
  }, []);

  useEffect(() => {
    if (isOpen) {
      setFromAmount("");
      setResult(null);
      setFromAsset("USD");
      setToAsset("AUXG");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getPrice = (asset: AssetType): number => {
    if (asset === "USD") return 1;
    if (asset === "AUXM") return 1;
    if (asset === "USDT") return 1;
    if (["AUXG", "AUXS", "AUXPT", "AUXPD"].includes(asset)) {
      return metalPrices[asset as keyof typeof metalPrices] || 100;
    }
    if (asset === "ETH") return cryptoPrices.eth || 3500;
    if (asset === "BTC") return cryptoPrices.btc || 97000;
    if (asset === "XRP") return cryptoPrices.xrp || 2.2;
    if (asset === "SOL") return cryptoPrices.sol || 235;
    return 1;
  };

  const getBalance = (asset: AssetType): number => {
    if (!balances) return 0;
    const key = asset.toLowerCase() as keyof typeof balances;
    return (balances[key] as number) || 0;
  };

  const isConversionAllowed = (from: AssetType, to: AssetType): boolean => {
    const fromCat = ASSETS[from].category;
    const toCat = ASSETS[to].category;
    if (fromCat === "crypto" && toCat === "crypto") return false;
    if (from === "AUXM" && toCat === "crypto") return false;
    if (from === "USD" && toCat === "crypto" && to !== "USDT") return false;
    return true;
  };

  const getAllowedTargets = (from: AssetType): AssetType[] => {
    const all: AssetType[] = ["USD", "AUXG", "AUXS", "AUXPT", "AUXPD", "AUXM", "ETH", "BTC", "XRP", "SOL", "USDT"];
    return all.filter((t) => t !== from && isConversionAllowed(from, t));
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // SPREAD HESAPLAMA - Admin ayarlarından dinamik
  // ═══════════════════════════════════════════════════════════════════════════════
  
  /**
   * Get spread percentage for an asset
   * @param asset - Asset type (AUXG, BTC, etc.)
   * @param type - 'buy' or 'sell' from USER perspective
   *   - When user SELLS (gives) crypto/metal → we BUY from them → use 'sell' spread (lower price for us)
   *   - When user BUYS (receives) crypto/metal → we SELL to them → use 'buy' spread (higher price for us)
   */
  const getSpreadPercent = (asset: AssetType, type: 'buy' | 'sell'): number => {
    const category = ASSETS[asset].category;
    
    // USD ve AUXM için spread yok
    if (category === "fiat" || category === "platform") return 0;
    
    if (category === 'metal') {
      const metalMap: Record<string, keyof SpreadConfig['metals']> = {
        'AUXG': 'gold',
        'AUXS': 'silver', 
        'AUXPT': 'platinum',
        'AUXPD': 'palladium'
      };
      const key = metalMap[asset];
      if (key && spreadConfig.metals[key]) {
        return spreadConfig.metals[key][type];
      }
      return type === 'buy' ? 1.5 : 1.5; // Default
    }
    
    if (category === 'crypto') {
      const cryptoMap: Record<string, keyof SpreadConfig['crypto']> = {
        'BTC': 'btc',
        'ETH': 'eth',
        'XRP': 'xrp',
        'SOL': 'sol',
        'USDT': 'usdt'
      };
      const key = cryptoMap[asset];
      if (key && spreadConfig.crypto[key]) {
        return spreadConfig.crypto[key][type];
      }
      return type === 'buy' ? 1.0 : 1.0; // Default
    }
    
    return 0;
  };

  const fromPrice = getPrice(fromAsset);
  const toPrice = getPrice(toAsset);
  const fromAmountNum = parseFloat(fromAmount) || 0;
  const fromValueUSD = fromAmountNum * fromPrice;

  // ═══════════════════════════════════════════════════════════════════════════════
  // SPREAD UYGULAMA
  // 
  // Kullanıcı fromAsset VERİYOR (satıyor) → Biz düşük fiyattan alıyoruz → sell spread
  // Kullanıcı toAsset ALIYOR (satın alıyor) → Biz yüksek fiyattan satıyoruz → buy spread
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const fromSpreadPercent = getSpreadPercent(fromAsset, 'sell'); // User sells, we buy low
  const toSpreadPercent = getSpreadPercent(toAsset, 'buy');      // User buys, we sell high

  // Kullanıcının verdiği değer (sell spread ile değeri düşürülmüş)
  const effectiveFromValueUSD = fromValueUSD * (1 - fromSpreadPercent / 100);
  
  // Kullanıcının alacağı varlığın fiyatı (buy spread ile fiyat artırılmış)
  const effectiveToPrice = toPrice * (1 + toSpreadPercent / 100);
  
  // Final hesaplama
  const toAmount = effectiveFromValueUSD / effectiveToPrice;

  // UI için toplam spread gösterimi
  const totalSpreadPercent = fromSpreadPercent + toSpreadPercent;

  const fromBalance = getBalance(fromAsset);
  const canAfford = fromAmountNum > 0 && fromAmountNum <= fromBalance;

  const handleFromSelect = (asset: AssetType) => {
    setFromAsset(asset);
    setShowFromSelect(false);
    const allowed = getAllowedTargets(asset);
    if (!allowed.includes(toAsset)) setToAsset(allowed[0] || "AUXG");
  };

  const handleToSelect = (asset: AssetType) => {
    setToAsset(asset);
    setShowToSelect(false);
  };

  const handleSwap = () => {
    if (isConversionAllowed(toAsset, fromAsset)) {
      const temp = fromAsset;
      setFromAsset(toAsset);
      setToAsset(temp);
    }
  };

  // Check if toAsset is a metal
  const METALS = ["AUXG", "AUXS", "AUXPT", "AUXPD"];
  const isMetalPurchase = METALS.includes(toAsset);
  const isWholeGram = Math.abs(toAmount - Math.floor(toAmount)) < 0.0001;
  const allocatedGrams = Math.floor(toAmount);
  const nonAllocatedGrams = toAmount - allocatedGrams;

  const handleExchange = async () => {
    if (!canAfford) return;
    
    // Show allocation warning for metal purchases with fractional grams
    if (isMetalPurchase && !isWholeGram && !showAllocationWarning) {
      setShowAllocationWarning(true);
      return;
    }
    
    setShowAllocationWarning(false);
    setIsProcessing(true);
    try {
      // API'ye spread bilgilerini de gönder
      const response = await fetch('/api/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          fromAsset,
          toAsset,
          fromAmount: fromAmountNum,
          toAmount,
          fromSpread: fromSpreadPercent,
          toSpread: toSpreadPercent,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        console.error('Exchange failed:', data.error);
        setResult("error");
        return;
      }
      
      setResult("success");
      if (refreshBalances) await refreshBalances();
      setTimeout(() => onClose(), 2500);
    } catch (error) {
      console.error('Exchange error:', error);
      setResult("error");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatAmount = (amount: number, asset: AssetType): string => {
    if (ASSETS[asset].category === "metal") return amount.toFixed(4);
    if (["BTC", "ETH", "XRP", "SOL"].includes(asset)) return amount.toFixed(6);
    return amount.toFixed(2);
  };

  const formatBalance = (asset: AssetType): string => formatAmount(getBalance(asset), asset);
  const getAssetUnit = (asset: AssetType): string => ASSETS[asset].unit;

  const renderIcon = (asset: AssetType) => {
    const info = ASSETS[asset];
    if (info.iconType === "image") return <img src={info.icon} alt={asset} className="w-8 h-8" />;
    return <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: info.color }}>{info.icon}</div>;
  };

  const renderAssetButton = (asset: AssetType, onClick: () => void, label: string) => {
    const info = ASSETS[asset];
    return (
      <>
        <span className="text-xs text-slate-500 dark:text-slate-500 mb-1 block">{label}</span>
        <button type="button" onClick={onClick} className="w-full flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-lg bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-600 hover:border-stone-300 dark:hover:border-slate-500 transition-colors">
          {renderIcon(asset)}
          <div className="flex-1 text-left">
            <div className="font-semibold text-sm sm:text-base text-slate-800 dark:text-white">{asset}</div>
            <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">{info.name[lang] || info.name.en}</div>
          </div>
          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>
      </>
    );
  };

  const allAssets: AssetType[] = ["USD", "AUXG", "AUXS", "AUXPT", "AUXPD", "AUXM", "ETH", "BTC", "XRP", "SOL", "USDT"];
  const allowedToTargets = getAllowedTargets(fromAsset);
  const isCryptoToCrypto = ASSETS[fromAsset].category === "crypto" && ASSETS[toAsset].category === "crypto";
  const isAuxmToCrypto = fromAsset === "AUXM" && ASSETS[toAsset].category === "crypto";
  const isUsdToCrypto = fromAsset === "USD" && ASSETS[toAsset].category === "crypto" && toAsset !== "USDT";

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-stone-200 dark:border-slate-700 w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-stone-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">{t.title}</h2>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">{t.subtitle}</p>
          </div>
          <button onClick={onClose} className="p-1.5 sm:p-2 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 text-lg sm:text-xl">✕</button>
        </div>

        <div className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
          <div className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-[10px] sm:text-xs text-blue-600 dark:text-blue-300">
            <p className="font-medium mb-0.5 sm:mb-1">ℹ️ {t.conversionRules}</p>
            <ul className="space-y-0.5 text-blue-500 dark:text-blue-400/80">
              <li>• {t.rule1}</li>
              <li>• {t.rule2}</li>
              <li>• {t.rule3}</li>
              <li>• {t.rule4}</li>
            </ul>
          </div>

          {result === "success" ? (
            <div className="text-center py-6 sm:py-8">
              <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-500 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 mb-1.5 sm:mb-2">{t.success}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">{fromAsset === "USD" ? "$" : ""}{formatAmount(fromAmountNum, fromAsset)} {getAssetUnit(fromAsset)} → {formatAmount(toAmount, toAsset)} {getAssetUnit(toAsset)}</p>
            </div>
          ) : (
            <>
              <div className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-stone-50 dark:bg-slate-800/50 border border-stone-200 dark:border-slate-700">
                <div className="relative">
                  {renderAssetButton(fromAsset, () => { setShowFromSelect(!showFromSelect); setShowToSelect(false); }, t.from)}
                  <AssetDropdown isOpen={showFromSelect} onSelect={handleFromSelect} allowedAssets={allAssets.filter(a => a !== fromAsset)} currentAsset={fromAsset} position="bottom" lang={lang} getBalance={getBalance} />
                </div>
                <div className="flex items-center justify-between mt-2.5 sm:mt-3 mb-0.5 sm:mb-1">
                  <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-500">{t.balance}: {fromAsset === "USD" ? "$" : ""}{formatBalance(fromAsset)} {fromAsset !== "USD" ? getAssetUnit(fromAsset) : ""}</span>
                  <button onClick={() => setFromAmount(fromBalance.toString())} className="text-[10px] sm:text-xs text-emerald-500 dark:text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300 font-semibold">MAX</button>
                </div>
                <div className="relative">
                  <input type="number" value={fromAmount} onChange={(e) => setFromAmount(e.target.value)} placeholder="0.00" disabled={isProcessing} className="w-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-lg px-2.5 sm:px-3 py-2.5 sm:py-3 pr-14 sm:pr-16 text-base sm:text-lg font-mono text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
                  <span className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">{getAssetUnit(fromAsset)}</span>
                </div>
                <div className="text-right text-[10px] sm:text-xs text-slate-500 dark:text-slate-500 mt-1">≈ ${fromValueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</div>
              </div>

              <div className="flex justify-center -my-0.5 sm:-my-1 relative z-10">
                <button onClick={handleSwap} disabled={isProcessing || !isConversionAllowed(toAsset, fromAsset)} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-orange-500 hover:bg-orange-600 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed border-4 border-white dark:border-slate-900 flex items-center justify-center transition-colors shadow-lg">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
                </button>
              </div>

              <div className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-stone-50 dark:bg-slate-800/50 border border-stone-200 dark:border-slate-700 relative">
                {renderAssetButton(toAsset, () => { setShowToSelect(!showToSelect); setShowFromSelect(false); }, t.to)}
                <AssetDropdown isOpen={showToSelect} onSelect={handleToSelect} allowedAssets={allowedToTargets.filter(a => a !== toAsset)} currentAsset={toAsset} position="top" lang={lang} getBalance={getBalance} />
                <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-500 mt-2.5 sm:mt-3 mb-0.5 sm:mb-1">{t.youWillReceive}</div>
                <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-lg px-2.5 sm:px-3 py-2.5 sm:py-3 relative">
                  <span className="text-base sm:text-lg font-mono text-slate-800 dark:text-white">{fromAmountNum > 0 ? formatAmount(toAmount, toAsset) : "0.00"}</span>
                  <span className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">{getAssetUnit(toAsset)}</span>
                </div>
                <div className="text-right text-[10px] sm:text-xs text-slate-500 dark:text-slate-500 mt-1">≈ ${(toAmount * toPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</div>
              </div>

              <div className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-stone-50 dark:bg-slate-800/30 border border-stone-200 dark:border-slate-700 space-y-0.5 sm:space-y-1 text-[10px] sm:text-xs">
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">{t.rate}</span><span className="text-slate-700 dark:text-slate-300">1 {fromAsset} = {(fromPrice / toPrice).toFixed(ASSETS[toAsset].category === "metal" ? 4 : 2)} {toAsset}</span></div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Spread</span>
                  <span className="text-slate-700 dark:text-slate-300">{totalSpreadPercent.toFixed(2)}%</span>
                </div>
                {/* Spread detayı */}
                {(fromSpreadPercent > 0 || toSpreadPercent > 0) && (
                  <div className="flex justify-between text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500">
                    <span>({fromAsset}: {fromSpreadPercent}% + {toAsset}: {toSpreadPercent}%)</span>
                  </div>
                )}
              </div>

              {isCryptoToCrypto && <div className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-[10px] sm:text-xs text-red-500 dark:text-red-400">⚠️ {t.cryptoToCrypto}</div>}
              {isAuxmToCrypto && <div className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[10px] sm:text-xs text-amber-600 dark:text-amber-400">⚠️ {t.auxmToCrypto}</div>}
              {isUsdToCrypto && <div className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-[10px] sm:text-xs text-red-500 dark:text-red-400">⚠️ {t.usdToCrypto}</div>}
              {!canAfford && fromAmountNum > 0 && !isCryptoToCrypto && !isAuxmToCrypto && !isUsdToCrypto && <div className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-[10px] sm:text-xs text-red-500 dark:text-red-400">⚠️ {t.insufficientBalance}</div>}
              {showAllocationWarning && (
                <div className="px-3 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <span className="text-sm font-medium text-amber-600 dark:text-amber-400">{lang === "tr" ? "Kısmi Allocation" : "Partial Allocation"}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {lang === "tr" ? `${toAmount.toFixed(4)}g ${toAsset} alıyorsunuz. Sadece ${allocatedGrams}g fiziksel metale allocate edilecek, ${nonAllocatedGrams.toFixed(4)}g bakiyenizde kalacak.` : `You are buying ${toAmount.toFixed(4)}g ${toAsset}. Only ${allocatedGrams}g will be allocated to physical metal, ${nonAllocatedGrams.toFixed(4)}g will remain in your balance.`}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setShowAllocationWarning(false)} className="flex-1 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium">{lang === "tr" ? "İptal" : "Cancel"}</button>
                    <button onClick={() => { setShowAllocationWarning(false); handleExchange(); }} disabled={isProcessing} className="flex-1 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium">{lang === "tr" ? "Devam Et" : "Continue"}</button>
                  </div>
                </div>
              )}

              <button onClick={handleExchange} disabled={isProcessing || !canAfford || isCryptoToCrypto || isAuxmToCrypto || isUsdToCrypto} className="w-full py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-white text-sm sm:text-base bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 sm:gap-2">
                {isProcessing ? (
                  <><svg className="animate-spin h-3.5 w-3.5 sm:h-4 sm:w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>{t.processing}</>
                ) : (
                  <><svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>{t.exchange}</>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ExchangeModal;
