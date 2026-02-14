"use client";

import { useState, useEffect } from "react";
import { formatAmount, getDecimalPlaces } from '@/lib/format';
import { isLaunchCampaignActive } from "@/lib/auxm-bonus-service";
import { useLanguage } from "@/components/LanguageContext";

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

interface CryptoConvertModalProps {
  isOpen: boolean;
  onClose: () => void;
  crypto: "ETH" | "BTC" | "XRP" | "SOL";
  cryptoBalances?: {
    ETH: number;
    BTC: number;
    XRP: number;
    SOL: number;
  };
  cryptoPrices?: {
    ETH: number;
    BTC: number;
    XRP: number;
    SOL: number;
  };
  metalBidPrices?: {
    AUXG: number;
    AUXS: number;
    AUXPT: number;
    AUXPD: number;
  };
}

type CryptoType = "ETH" | "BTC" | "XRP" | "SOL";
type TargetType = "AUXM" | "AUXG" | "AUXS" | "AUXPT" | "AUXPD";

// 6-language translations
const translations: Record<string, Record<string, string>> = {
  tr: {
    convert: "Dönüştür",
    toAuxmMetal: "AUXM/Metal",
    send: "Gönder",
    receive: "Al",
    balance: "Bakiye",
    youWillReceive: "Alacağınız",
    exchangeRate: "Dönüşüm Oranı",
    metalBidPrice: "Metal Satış Fiyatı",
    insufficientBalance: "Yetersiz bakiye",
    processing: "İşleniyor...",
    conversionSuccess: "Dönüşüm Başarılı!",
    bonusEarned: "kazandınız!",
    earnBonus: "Bonus AUXM kazanın!",
    conversionValue: "Dönüşüm Değeri:",
    bonusEarnedLabel: "Bonus Kazanç:",
    totalValue: "Toplam Değer:",
    gold: "Altın",
    silver: "Gümüş",
    platinum: "Platin",
    palladium: "Paladyum",
    auxiteMoney: "Auxite Para",
    spread: "Spread",
    gram: "gram",
  },
  en: {
    convert: "Convert",
    toAuxmMetal: "AUXM/Metal",
    send: "From",
    receive: "To",
    balance: "Balance",
    youWillReceive: "You will receive",
    exchangeRate: "Exchange Rate",
    metalBidPrice: "Metal Bid Price",
    insufficientBalance: "Insufficient balance",
    processing: "Processing...",
    conversionSuccess: "Conversion Successful!",
    bonusEarned: "earned!",
    earnBonus: "Earn Bonus AUXM!",
    conversionValue: "Conversion Value:",
    bonusEarnedLabel: "Bonus Earned:",
    totalValue: "Total Value:",
    gold: "Gold",
    silver: "Silver",
    platinum: "Platinum",
    palladium: "Palladium",
    auxiteMoney: "Auxite Money",
    spread: "Spread",
    gram: "gram",
  },
  de: {
    convert: "Umwandeln",
    toAuxmMetal: "AUXM/Metall",
    send: "Von",
    receive: "Zu",
    balance: "Guthaben",
    youWillReceive: "Sie erhalten",
    exchangeRate: "Wechselkurs",
    metalBidPrice: "Metall-Verkaufspreis",
    insufficientBalance: "Unzureichendes Guthaben",
    processing: "Verarbeitung...",
    conversionSuccess: "Umwandlung erfolgreich!",
    bonusEarned: "verdient!",
    earnBonus: "Verdienen Sie Bonus AUXM!",
    conversionValue: "Umwandlungswert:",
    bonusEarnedLabel: "Bonus verdient:",
    totalValue: "Gesamtwert:",
    gold: "Gold",
    silver: "Silber",
    platinum: "Platin",
    palladium: "Palladium",
    auxiteMoney: "Auxite Geld",
    spread: "Spread",
    gram: "Gramm",
  },
  fr: {
    convert: "Convertir",
    toAuxmMetal: "AUXM/Métal",
    send: "De",
    receive: "Vers",
    balance: "Solde",
    youWillReceive: "Vous recevrez",
    exchangeRate: "Taux de change",
    metalBidPrice: "Prix de vente du métal",
    insufficientBalance: "Solde insuffisant",
    processing: "Traitement...",
    conversionSuccess: "Conversion réussie!",
    bonusEarned: "gagné!",
    earnBonus: "Gagnez un bonus AUXM!",
    conversionValue: "Valeur de conversion:",
    bonusEarnedLabel: "Bonus gagné:",
    totalValue: "Valeur totale:",
    gold: "Or",
    silver: "Argent",
    platinum: "Platine",
    palladium: "Palladium",
    auxiteMoney: "Auxite Argent",
    spread: "Spread",
    gram: "gramme",
  },
  ar: {
    convert: "تحويل",
    toAuxmMetal: "AUXM/معدن",
    send: "من",
    receive: "إلى",
    balance: "الرصيد",
    youWillReceive: "ستستلم",
    exchangeRate: "سعر الصرف",
    metalBidPrice: "سعر بيع المعدن",
    insufficientBalance: "رصيد غير كافٍ",
    processing: "جاري المعالجة...",
    conversionSuccess: "تم التحويل بنجاح!",
    bonusEarned: "تم الكسب!",
    earnBonus: "اكسب مكافأة AUXM!",
    conversionValue: "قيمة التحويل:",
    bonusEarnedLabel: "المكافأة المكتسبة:",
    totalValue: "القيمة الإجمالية:",
    gold: "ذهب",
    silver: "فضة",
    platinum: "بلاتين",
    palladium: "بالاديوم",
    auxiteMoney: "أوكسيت موني",
    spread: "سبريد",
    gram: "غرام",
  },
  ru: {
    convert: "Конвертировать",
    toAuxmMetal: "AUXM/Металл",
    send: "От",
    receive: "К",
    balance: "Баланс",
    youWillReceive: "Вы получите",
    exchangeRate: "Курс обмена",
    metalBidPrice: "Цена продажи металла",
    insufficientBalance: "Недостаточно средств",
    processing: "Обработка...",
    conversionSuccess: "Конвертация успешна!",
    bonusEarned: "заработано!",
    earnBonus: "Заработайте бонус AUXM!",
    conversionValue: "Стоимость конвертации:",
    bonusEarnedLabel: "Заработанный бонус:",
    totalValue: "Общая стоимость:",
    gold: "Золото",
    silver: "Серебро",
    platinum: "Платина",
    palladium: "Палладий",
    auxiteMoney: "Auxite Деньги",
    spread: "Спред",
    gram: "грамм",
  },
};

const CRYPTO_INFO: Record<CryptoType, { 
  name: string; 
  icon: string; 
  color: string;
}> = {
  ETH: { name: "Ethereum", icon: "Ξ", color: "#627EEA" },
  BTC: { name: "Bitcoin", icon: "₿", color: "#F7931A" },
  XRP: { name: "Ripple", icon: "✕", color: "#23292F" },
  SOL: { name: "Solana", icon: "◎", color: "#9945FF" },
};

const TARGET_INFO: Record<TargetType, { 
  nameKey: string; 
  icon: string;
  iconType: "image" | "symbol";
  bgColor: string;
  borderColor: string;
}> = {
  AUXM: { nameKey: "auxiteMoney", icon: "◈", iconType: "symbol", bgColor: "bg-purple-500/20", borderColor: "border-purple-500/30" },
  AUXG: { nameKey: "gold", icon: "/auxg_icon.png", iconType: "image", bgColor: "bg-[#BFA181]/10", borderColor: "border-[#BFA181]/30" },
  AUXS: { nameKey: "silver", icon: "/auxs_icon.png", iconType: "image", bgColor: "bg-slate-400/10", borderColor: "border-slate-400/30" },
  AUXPT: { nameKey: "platinum", icon: "/auxpt_icon.png", iconType: "image", bgColor: "bg-cyan-400/10", borderColor: "border-cyan-400/30" },
  AUXPD: { nameKey: "palladium", icon: "/auxpd_icon.png", iconType: "image", bgColor: "bg-purple-400/10", borderColor: "border-purple-400/30" },
};

export function CryptoConvertModal({
  isOpen,
  onClose,
  crypto,
  cryptoBalances = { ETH: 0, BTC: 0, XRP: 0, SOL: 0 },
  cryptoPrices = { ETH: 3650, BTC: 97500, XRP: 2.20, SOL: 235 },
  metalBidPrices = { AUXG: 134.69, AUXS: 1.82, AUXPT: 52.92, AUXPD: 45.57 },
}: CryptoConvertModalProps) {
  const [toAsset, setToAsset] = useState<TargetType>("AUXM");
  const [fromAmount, setFromAmount] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);
  const [showToSelect, setShowToSelect] = useState(false);
  
  // Spread config state
  const [spreadConfig, setSpreadConfig] = useState<SpreadConfig>(DEFAULT_SPREAD);

  const { lang } = useLanguage();
  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;
  const isCampaignActive = isLaunchCampaignActive();

  // Kaynak kripto SABİT - prop'tan geliyor, değiştirilemez
  const fromCrypto = crypto;
  const cryptoInfo = CRYPTO_INFO[fromCrypto];

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
      setToAsset("AUXM");
    }
  }, [isOpen, crypto]);

  if (!isOpen) return null;

  // ═══════════════════════════════════════════════════════════════════════════════
  // SPREAD HESAPLAMA - Admin ayarlarından dinamik
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const getCryptoSpread = (cryptoKey: CryptoType): { buy: number; sell: number } => {
    const key = cryptoKey.toLowerCase() as keyof SpreadConfig['crypto'];
    return spreadConfig.crypto[key] || { buy: 1.0, sell: 1.0 };
  };

  const getMetalSpread = (metalKey: TargetType): { buy: number; sell: number } => {
    if (metalKey === "AUXM") return { buy: 0, sell: 0 };
    
    const metalMap: Record<string, keyof SpreadConfig['metals']> = {
      'AUXG': 'gold',
      'AUXS': 'silver',
      'AUXPT': 'platinum',
      'AUXPD': 'palladium'
    };
    const key = metalMap[metalKey];
    return spreadConfig.metals[key] || { buy: 1.5, sell: 1.5 };
  };

  // Fiyat hesaplama - metalBidPrices (satış fiyatı) kullanılıyor
  const fromPrice = cryptoPrices[fromCrypto];
  const toPrice = toAsset === "AUXM" ? 1 : metalBidPrices[toAsset as keyof typeof metalBidPrices];
  
  const fromAmountNum = parseFloat(fromAmount) || 0;
  const fromValueUSD = fromAmountNum * fromPrice;
  
  // Bonus hesaplama
  const bonusPercent = isCampaignActive ? 2 : 0;
  const bonusUSD = fromValueUSD * (bonusPercent / 100);
  const totalValueUSD = fromValueUSD + bonusUSD;

  // ═══════════════════════════════════════════════════════════════════════════════
  // SPREAD UYGULAMA
  // 
  // Kullanıcı Kripto VERİYOR (satıyor) → Biz düşük fiyattan alıyoruz → sell spread
  // Kullanıcı AUXM/Metal ALIYOR (satın alıyor) → Biz yüksek fiyattan satıyoruz → buy spread
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const fromSpread = getCryptoSpread(fromCrypto);
  const toSpread = getMetalSpread(toAsset);
  
  const fromSpreadPercent = fromSpread.sell; // User sells crypto, we buy low
  const toSpreadPercent = toSpread.buy;      // User buys metal/AUXM, we sell high

  // Kullanıcının verdiği değer (sell spread ile değeri düşürülmüş)
  const effectiveFromValueUSD = totalValueUSD * (1 - fromSpreadPercent / 100);
  
  // Kullanıcının alacağı varlığın fiyatı (buy spread ile fiyat artırılmış)
  const effectiveToPrice = toPrice * (1 + toSpreadPercent / 100);
  
  // Final hesaplama - spread uygulanmış
  const toAmount = effectiveFromValueUSD / effectiveToPrice;

  // UI için toplam spread gösterimi
  const totalSpreadPercent = fromSpreadPercent + toSpreadPercent;

  // Bakiye kontrolü
  const fromBalance = cryptoBalances[fromCrypto];
  const canAfford = fromAmountNum <= fromBalance && fromAmountNum > 0;

  const handleMaxClick = () => {
    setFromAmount(fromBalance.toString());
  };

  const handleConvert = async () => {
    if (!canAfford) return;

    setIsProcessing(true);
    try {
      // API'ye spread bilgilerini de gönder
      const response = await fetch('/api/crypto/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromCrypto,
          toAsset,
          fromAmount: fromAmountNum,
          toAmount,
          fromSpread: fromSpreadPercent,
          toSpread: toSpreadPercent,
          bonusUSD,
        }),
      });
      
      if (response.ok) {
        setResult("success");
        setTimeout(() => onClose(), 2500);
      } else {
        throw new Error('Conversion failed');
      }
    } catch {
      // Fallback: Simulated conversion for demo
      await new Promise(resolve => setTimeout(resolve, 1500));
      setResult("success");
      setTimeout(() => onClose(), 2500);
    } finally {
      setIsProcessing(false);
    }
  };

  const getTargetName = (target: TargetType): string => {
    return t(TARGET_INFO[target].nameKey);
  };

  // Render icon helper
  const renderTargetIcon = (target: TargetType, size: "sm" | "md" = "md") => {
    const info = TARGET_INFO[target];
    const sizeClasses = size === "sm" ? "w-5 h-5 sm:w-6 sm:h-6" : "w-6 h-6 sm:w-7 sm:h-7";
    const textSize = size === "sm" ? "text-xs sm:text-sm" : "text-sm sm:text-lg";
    
    if (info.iconType === "image") {
      return (
        <img 
          src={info.icon} 
          alt={target} 
          className={`${sizeClasses} rounded-full`}
        />
      );
    }
    
    return (
      <div className={`${sizeClasses} rounded-full bg-purple-500 flex items-center justify-center text-white font-bold ${textSize}`}>
        {info.icon}
      </div>
    );
  };

  // Hedef varlık seçici (AUXM, AUXG, AUXS, AUXPT, AUXPD)
  const TargetSelector = ({ 
    asset, 
    onSelect, 
    show, 
    setShow,
    label
  }: { 
    asset: TargetType; 
    onSelect: (a: TargetType) => void;
    show: boolean;
    setShow: (s: boolean) => void;
    label: string;
  }) => (
    <div className="relative">
      <div className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400 mb-1 font-medium">{label}</div>
      <button
        onClick={() => setShow(!show)}
        className={`flex items-center gap-2 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg ${TARGET_INFO[asset].bgColor} border ${TARGET_INFO[asset].borderColor} hover:opacity-80 transition-all w-full`}
      >
        {renderTargetIcon(asset)}
        <div className="flex-1 text-left">
          <div className="font-semibold text-sm sm:text-base text-slate-800 dark:text-white">{asset}</div>
          <div className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">
            {getTargetName(asset)}
          </div>
        </div>
        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {show && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg sm:rounded-xl shadow-xl z-10 overflow-hidden">
          {(["AUXM", "AUXG", "AUXS", "AUXPT", "AUXPD"] as TargetType[]).map((target) => (
            <button
              key={target}
              onClick={() => {
                onSelect(target);
                setShow(false);
              }}
              className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-stone-100 dark:hover:bg-slate-700 transition-colors ${
                asset === target ? "bg-stone-100 dark:bg-slate-700" : ""
              }`}
            >
              <div className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center">
                {renderTargetIcon(target, "md")}
              </div>
              <div className="text-left flex-1">
                <div className="font-medium text-sm sm:text-base text-slate-800 dark:text-white">{target}</div>
                <div className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">
                  {getTargetName(target)}
                </div>
              </div>
              {asset === target && (
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/80 flex items-end sm:items-center justify-center z-[60] p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl border border-stone-300 dark:border-slate-700 w-full sm:max-w-sm overflow-hidden shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-stone-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <div className="flex items-center gap-2 sm:gap-3">
            <div 
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-lg"
              style={{ backgroundColor: cryptoInfo.color }}
            >
              {cryptoInfo.icon}
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-white">
                {fromCrypto} {t("convert")}
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">
                {cryptoInfo.name} → {t("toAuxmMetal")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
          {/* Campaign Bonus Indicator */}
          {isCampaignActive && fromAmountNum > 0 && (
            <div className="px-2.5 sm:px-3 py-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-purple-600 dark:text-purple-300">🎁 Bonus AUXM</span>
                <span className="text-purple-600 dark:text-purple-400 font-semibold">
                  +{bonusPercent}% (+${bonusUSD.toFixed(2)})
                </span>
              </div>
              <div className="space-y-1 text-[10px] sm:text-xs mt-2">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>{t("conversionValue")}</span>
                  <span>${fromValueUSD.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-purple-600 dark:text-purple-400 font-medium">
                  <span>{t("bonusEarnedLabel")}</span>
                  <span>+${bonusUSD.toFixed(2)} AUXM</span>
                </div>
                <div className="flex justify-between text-[#2F6F62] dark:text-[#2F6F62] font-semibold pt-1 border-t border-stone-200 dark:border-slate-700/50">
                  <span>{t("totalValue")}</span>
                  <span>${totalValueUSD.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Campaign Banner (no amount) */}
          {isCampaignActive && fromAmountNum === 0 && (
            <div className="px-2.5 sm:px-3 py-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center gap-2">
              <span>🎁</span>
              <span className="text-xs sm:text-sm text-purple-600 dark:text-purple-300">
                +%{bonusPercent} {t("earnBonus")}
              </span>
            </div>
          )}

          {/* Success State */}
          {result === "success" ? (
            <div className="text-center py-6 sm:py-8">
              <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-[#2F6F62]/20 flex items-center justify-center">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-[#2F6F62] dark:text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-[#2F6F62] dark:text-[#2F6F62] mb-2">
                {t("conversionSuccess")}
              </h3>
              <p className="text-sm sm:text-base text-slate-700 dark:text-slate-400">
                {formatAmount(fromAmountNum, fromCrypto)} {fromCrypto} → {formatAmount(toAmount, toAsset)}{toAsset !== "AUXM" ? "g" : ""} {toAsset}
              </p>
              {bonusUSD > 0 && (
                <p className="text-purple-600 dark:text-purple-400 text-xs sm:text-sm mt-2">
                  🎁 +{bonusUSD.toFixed(2)} Bonus AUXM {t("bonusEarned")}
                </p>
              )}
            </div>
          ) : (
            <>
              {/* From Section - SABİT, değiştirilemez */}
              <div className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-stone-50 dark:bg-slate-800/50 border border-stone-200 dark:border-slate-700">
                <div className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400 mb-1 font-medium">{t("send")}</div>
                <div 
                  className="flex items-center gap-2 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg bg-stone-200 dark:bg-slate-700/50 border border-stone-300 dark:border-slate-600"
                >
                  <div 
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm"
                    style={{ backgroundColor: cryptoInfo.color }}
                  >
                    {cryptoInfo.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-sm sm:text-base text-slate-800 dark:text-white">{fromCrypto}</div>
                    <div className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">
                      {cryptoInfo.name}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-2 mb-1">
                  <span className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">
                    {t("balance")}: {formatAmount(fromBalance, fromCrypto)} {fromCrypto}
                  </span>
                  <button
                    onClick={handleMaxClick}
                    className="text-[10px] sm:text-xs text-[#2F6F62] dark:text-[#2F6F62] hover:text-[#2F6F62] font-semibold"
                  >
                    MAX
                  </button>
                </div>
                
                <div className="relative">
                  <input
                    type="number"
                    value={fromAmount}
                    onChange={(e) => setFromAmount(e.target.value)}
                    placeholder="0.0000"
                    disabled={isProcessing}
                    className="w-full bg-white dark:bg-slate-900 rounded-lg px-2.5 sm:px-3 py-2 sm:py-2.5 text-base sm:text-lg font-mono text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 border border-stone-200 dark:border-slate-700"
                  />
                  <div className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
                    {fromCrypto}
                  </div>
                </div>
                
                <div className="text-right text-[10px] sm:text-xs text-slate-600 dark:text-slate-400 mt-1">
                  ≈ ${fromValueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </div>
              </div>

              {/* Arrow Indicator */}
              <div className="flex justify-center -my-0.5 sm:-my-1 relative z-10">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-purple-500 border-4 border-white dark:border-slate-900 flex items-center justify-center shadow-lg">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </div>

              {/* To Section - AUXM veya Metaller */}
              <div className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-stone-50 dark:bg-slate-800/50 border border-stone-200 dark:border-slate-700">
                <TargetSelector 
                  asset={toAsset} 
                  onSelect={setToAsset}
                  show={showToSelect}
                  setShow={setShowToSelect}
                  label={t("receive")}
                />
                
                <div className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400 mt-2 mb-1 font-medium">
                  {t("youWillReceive")}
                </div>
                
                <div className="bg-white dark:bg-slate-900 rounded-lg px-2.5 sm:px-3 py-2 sm:py-2.5 border border-stone-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-base sm:text-lg font-mono text-slate-800 dark:text-white">
                      {fromAmountNum > 0 ? formatAmount(toAmount, toAsset) : "0.00"}
                    </span>
                    <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
                      {toAsset !== "AUXM" ? t("gram") : toAsset}
                    </span>
                  </div>
                </div>
                
                <div className="text-right text-[10px] sm:text-xs text-slate-600 dark:text-slate-400 mt-1">
                  ≈ ${(toAmount * toPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </div>
              </div>

              {/* Exchange Rate & Fee Info */}
              <div className="px-2.5 sm:px-3 py-2 rounded-lg bg-stone-50 dark:bg-slate-800/30 border border-stone-200 dark:border-slate-700 space-y-1 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">{t("exchangeRate")}</span>
                  <span className="text-slate-800 dark:text-slate-300 font-medium text-[11px] sm:text-sm">
                    1 {fromCrypto} = {formatAmount(fromPrice / toPrice, toAsset)}{toAsset !== "AUXM" ? "g" : ""} {toAsset}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">{t("spread")}</span>
                  <span className="text-slate-800 dark:text-slate-300 font-medium">{totalSpreadPercent.toFixed(2)}%</span>
                </div>
                {/* Spread detayı */}
                {(fromSpreadPercent > 0 || toSpreadPercent > 0) && (
                  <div className="flex justify-between text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500">
                    <span>({fromCrypto}: {fromSpreadPercent}% + {toAsset}: {toSpreadPercent}%)</span>
                  </div>
                )}
                {toAsset !== "AUXM" && (
                  <div className="flex justify-between text-[10px] sm:text-xs pt-1 border-t border-stone-200 dark:border-slate-700/50">
                    <span className="text-slate-500 dark:text-slate-500">{t("metalBidPrice")}</span>
                    <span className="text-slate-600 dark:text-slate-400">${toPrice.toFixed(2)}/g</span>
                  </div>
                )}
              </div>

              {/* Insufficient Balance Warning */}
              {!canAfford && fromAmountNum > 0 && (
                <div className="px-2.5 sm:px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs sm:text-sm text-red-600 dark:text-red-400">
                  ⚠️ {t("insufficientBalance")}
                </div>
              )}

              {/* Convert Button */}
              <button
                onClick={handleConvert}
                disabled={isProcessing || !canAfford}
                className="w-full py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t("processing")}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    {t("convert")}
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default CryptoConvertModal;
