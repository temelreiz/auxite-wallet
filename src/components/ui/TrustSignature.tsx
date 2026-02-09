"use client";

/**
 * Trust Signature Component
 * Kurumsal güven sinyalleri - Her platformda gösterilmeli
 *
 * Locations to display:
 * - Header altı (strip)
 * - Dashboard
 * - Allocate ekranı
 * - Confirmation ekranı
 */

import { Shield, Building, Lock, MapPin, CheckCircle } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSLATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const translations = {
  tr: {
    fullyAllocated: "Tam Tahsisli",
    independentCustody: "Bağımsız Saklama",
    bankruptcyRemote: "İflas Korumalı",
    vaultRegion: "Kasa Bölgesi",
    custodian: "Saklayıcı",
    structure: "Yapı",
    segregated: "Ayrılmış",
    zurich: "Zürih",
    independent: "Bağımsız",
    preciselyAllocated: "Adınıza hassas şekilde tahsis edildi.",
    assetsHeldUnder: "Varlıklar bağımsız saklama yapılarında güvenle muhafaza edilmektedir.",
  },
  en: {
    fullyAllocated: "Fully Allocated",
    independentCustody: "Independent Custody",
    bankruptcyRemote: "Bankruptcy Remote",
    vaultRegion: "Vault Region",
    custodian: "Custodian",
    structure: "Structure",
    segregated: "Segregated",
    zurich: "Zurich",
    independent: "Independent",
    preciselyAllocated: "Precisely allocated in your name.",
    assetsHeldUnder: "Assets safeguarded under independent custody.",
  },
  de: {
    fullyAllocated: "Vollständig Zugewiesen",
    independentCustody: "Unabhängige Verwahrung",
    bankruptcyRemote: "Insolvenzgeschützt",
    vaultRegion: "Tresor Region",
    custodian: "Verwahrstelle",
    structure: "Struktur",
    segregated: "Getrennt",
    zurich: "Zürich",
    independent: "Unabhängig",
    preciselyAllocated: "Präzise auf Ihren Namen zugewiesen.",
    assetsHeldUnder: "Vermögenswerte unter unabhängiger Verwahrung gesichert.",
  },
  fr: {
    fullyAllocated: "Entièrement Alloué",
    independentCustody: "Garde Indépendante",
    bankruptcyRemote: "Protection Faillite",
    vaultRegion: "Région du Coffre",
    custodian: "Dépositaire",
    structure: "Structure",
    segregated: "Ségrégé",
    zurich: "Zurich",
    independent: "Indépendant",
    preciselyAllocated: "Précisément alloué à votre nom.",
    assetsHeldUnder: "Actifs sécurisés sous garde indépendante.",
  },
  ar: {
    fullyAllocated: "مخصص بالكامل",
    independentCustody: "حفظ مستقل",
    bankruptcyRemote: "محمي من الإفلاس",
    vaultRegion: "منطقة الخزنة",
    custodian: "الحارس",
    structure: "الهيكل",
    segregated: "منفصل",
    zurich: "زيوريخ",
    independent: "مستقل",
    preciselyAllocated: "مخصص بدقة باسمك.",
    assetsHeldUnder: "الأصول محمية تحت حراسة مستقلة.",
  },
  ru: {
    fullyAllocated: "Полностью Распределено",
    independentCustody: "Независимое Хранение",
    bankruptcyRemote: "Защита от Банкротства",
    vaultRegion: "Регион Хранилища",
    custodian: "Хранитель",
    structure: "Структура",
    segregated: "Сегрегированный",
    zurich: "Цюрих",
    independent: "Независимый",
    preciselyAllocated: "Точно распределено на ваше имя.",
    assetsHeldUnder: "Активы защищены под независимым хранением.",
  },
};

type Language = keyof typeof translations;

// ═══════════════════════════════════════════════════════════════════════════════
// TRUST SIGNATURE STRIP - Header altında görünen ince şerit
// ═══════════════════════════════════════════════════════════════════════════════

interface TrustStripProps {
  lang?: Language;
  className?: string;
}

export function TrustStrip({ lang = "en", className = "" }: TrustStripProps) {
  const t = translations[lang] || translations.en;

  return (
    <div className={`bg-slate-900/50 border-b border-slate-800/50 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-center gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#2F6F62]" />
            <span>{t.fullyAllocated}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-[#2F6F62]" />
            <span>{t.independentCustody}</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[#2F6F62]" />
            <span>{t.bankruptcyRemote}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRUST SIGNATURE BADGES - 3 badge yan yana
// ═══════════════════════════════════════════════════════════════════════════════

interface TrustBadgesProps {
  lang?: Language;
  size?: "sm" | "md" | "lg";
  className?: string;
  variant?: "horizontal" | "vertical";
}

export function TrustBadges({
  lang = "en",
  size = "md",
  className = "",
  variant = "horizontal"
}: TrustBadgesProps) {
  const t = translations[lang] || translations.en;

  const sizeClasses = {
    sm: "text-xs gap-3",
    md: "text-sm gap-4",
    lg: "text-base gap-6",
  };

  const iconSize = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const badges = [
    { icon: Shield, label: t.fullyAllocated },
    { icon: Building, label: t.independentCustody },
    { icon: Lock, label: t.bankruptcyRemote },
  ];

  return (
    <div className={`flex ${variant === "vertical" ? "flex-col" : "flex-wrap"} items-center ${sizeClasses[size]} ${className}`}>
      {badges.map(({ icon: Icon, label }, index) => (
        <div
          key={index}
          className="flex items-center gap-2 text-slate-300"
        >
          <div className="p-1.5 rounded-full bg-[#2F6F62]/10">
            <Icon className={`${iconSize[size]} text-[#2F6F62]`} />
          </div>
          <span className="font-medium">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VAULT VISIBILITY - Allocation preview'da gösterilecek
// ═══════════════════════════════════════════════════════════════════════════════

interface VaultVisibilityProps {
  lang?: Language;
  className?: string;
  compact?: boolean;
}

export function VaultVisibility({ lang = "en", className = "", compact = false }: VaultVisibilityProps) {
  const t = translations[lang] || translations.en;

  if (compact) {
    return (
      <div className={`flex flex-wrap gap-3 text-xs ${className}`}>
        <div className="flex items-center gap-1.5 text-slate-400">
          <MapPin className="w-3.5 h-3.5 text-[#2F6F62]" />
          <span>{t.vaultRegion}: <span className="text-white">{t.zurich}</span></span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <Building className="w-3.5 h-3.5 text-[#2F6F62]" />
          <span>{t.custodian}: <span className="text-white">{t.independent}</span></span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <Shield className="w-3.5 h-3.5 text-[#2F6F62]" />
          <span>{t.structure}: <span className="text-white">{t.segregated}</span></span>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 ${className}`}>
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <MapPin className="w-5 h-5 text-[#2F6F62]" />
          </div>
          <div className="text-xs text-slate-400 mb-1">{t.vaultRegion}</div>
          <div className="text-sm font-semibold text-white">{t.zurich}</div>
        </div>
        <div className="text-center border-x border-slate-700/50">
          <div className="flex items-center justify-center mb-2">
            <Building className="w-5 h-5 text-[#2F6F62]" />
          </div>
          <div className="text-xs text-slate-400 mb-1">{t.custodian}</div>
          <div className="text-sm font-semibold text-white">{t.independent}</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Shield className="w-5 h-5 text-[#2F6F62]" />
          </div>
          <div className="text-xs text-slate-400 mb-1">{t.structure}</div>
          <div className="text-sm font-semibold text-white">{t.segregated}</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALLOCATION CONFIRMATION MESSAGE
// ═══════════════════════════════════════════════════════════════════════════════

interface AllocationMessageProps {
  lang?: Language;
  className?: string;
}

export function AllocationMessage({ lang = "en", className = "" }: AllocationMessageProps) {
  const t = translations[lang] || translations.en;

  return (
    <div className={`flex items-center gap-2 text-sm text-slate-400 ${className}`}>
      <CheckCircle className="w-4 h-4 text-[#2F6F62] flex-shrink-0" />
      <span>{t.preciselyAllocated}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRUST CARD - Dashboard'da gösterilecek büyük kart
// ═══════════════════════════════════════════════════════════════════════════════

interface TrustCardProps {
  lang?: Language;
  className?: string;
}

export function TrustCard({ lang = "en", className = "" }: TrustCardProps) {
  const t = translations[lang] || translations.en;

  return (
    <div className={`rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-[#2F6F62]/10">
          <Shield className="w-6 h-6 text-[#2F6F62]" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Capital Protection</h3>
          <p className="text-sm text-slate-400">{t.assetsHeldUnder}</p>
        </div>
      </div>

      <TrustBadges lang={lang} size="sm" variant="vertical" className="gap-3" />

      <div className="mt-4 pt-4 border-t border-slate-700/50">
        <VaultVisibility lang={lang} compact />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRICING DISPLAY - Institutional pricing görünümü
// ═══════════════════════════════════════════════════════════════════════════════

interface PricingDisplayProps {
  referencePrice: number;
  executionSpread: number;
  finalPrice: number;
  currency?: string;
  lang?: Language;
  className?: string;
}

const pricingTranslations = {
  tr: {
    pricingOverview: "Fiyatlandırma Genel Bakış",
    referencePrice: "Referans Fiyat",
    executionSpread: "İşlem Farkı",
    finalPrice: "Nihai Tahsis Fiyatı",
    transparentPricing: "Şeffaf kurumsal fiyatlandırma.",
  },
  en: {
    pricingOverview: "Pricing Overview",
    referencePrice: "Reference Price",
    executionSpread: "Execution Spread",
    finalPrice: "Final Allocation Price",
    transparentPricing: "Transparent institutional pricing.",
  },
  de: {
    pricingOverview: "Preisübersicht",
    referencePrice: "Referenzpreis",
    executionSpread: "Ausführungsspread",
    finalPrice: "Endgültiger Zuteilungspreis",
    transparentPricing: "Transparente institutionelle Preisgestaltung.",
  },
  fr: {
    pricingOverview: "Aperçu des Prix",
    referencePrice: "Prix de Référence",
    executionSpread: "Écart d'Exécution",
    finalPrice: "Prix Final d'Allocation",
    transparentPricing: "Tarification institutionnelle transparente.",
  },
  ar: {
    pricingOverview: "نظرة عامة على الأسعار",
    referencePrice: "السعر المرجعي",
    executionSpread: "فارق التنفيذ",
    finalPrice: "سعر التخصيص النهائي",
    transparentPricing: "تسعير مؤسسي شفاف.",
  },
  ru: {
    pricingOverview: "Обзор Цен",
    referencePrice: "Справочная Цена",
    executionSpread: "Спред Исполнения",
    finalPrice: "Итоговая Цена Распределения",
    transparentPricing: "Прозрачное институциональное ценообразование.",
  },
};

export function PricingDisplay({
  referencePrice,
  executionSpread,
  finalPrice,
  currency = "USD",
  lang = "en",
  className = "",
}: PricingDisplayProps) {
  const t = pricingTranslations[lang] || pricingTranslations.en;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  return (
    <div className={`rounded-xl border border-slate-700/50 bg-slate-800/30 ${className}`}>
      <div className="px-4 py-3 border-b border-slate-700/50">
        <h4 className="text-sm font-medium text-white">{t.pricingOverview}</h4>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-400">{t.referencePrice}</span>
          <span className="text-sm text-white font-medium">{formatPrice(referencePrice)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-400">{t.executionSpread}</span>
          <span className="text-sm text-amber-400 font-medium">+{executionSpread.toFixed(2)}%</span>
        </div>
        <div className="h-px bg-slate-700/50" />
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-white">{t.finalPrice}</span>
          <span className="text-base font-semibold text-[#2F6F62]">{formatPrice(finalPrice)}</span>
        </div>
      </div>

      <div className="px-4 py-2 bg-slate-900/30 rounded-b-xl">
        <p className="text-xs text-slate-500 text-center">{t.transparentPricing}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  TrustStrip,
  TrustBadges,
  VaultVisibility,
  AllocationMessage,
  TrustCard,
  PricingDisplay,
};
