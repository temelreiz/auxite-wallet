"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/components/LanguageContext";
import { useAccount } from "wagmi";
import { 
  useAuxiteerTier as useAuxiteerTierHook, 
  getTierColor, 
  getTierBgColor, 
  getTierBorderColor,
  formatSpread,
  formatFee,
  type UseAuxiteerTierReturn 
} from "@/hooks/useAuxiteerTier";

// ============================================
// AUXITEER TIER CONFIGURATION
// ============================================
export interface AuxiteerTier {
  id: string;
  name: string;
  spread: string;
  fee: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
  requirements: {
    kyc: boolean;
    minBalance: number;
    minDays: number;
    metalAsset?: boolean;
    activeEarnLease?: boolean;
    invitation?: boolean;
  };
  benefits: string[];
  extras?: string[];
}

export const AUXITEER_TIERS: AuxiteerTier[] = [
  {
    id: "regular",
    name: "Regular",
    spread: "1.00%",
    fee: "0.35%",
    color: "#64748b",
    bgColor: "rgba(100, 116, 139, 0.1)",
    borderColor: "rgba(100, 116, 139, 0.3)",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    requirements: {
      kyc: false,
      minBalance: 0,
      minDays: 0,
    },
    benefits: ["basicAccess", "standardPricing"],
  },
  {
    id: "core",
    name: "Core",
    spread: "0.80%",
    fee: "0.25%",
    color: "#10b981",
    bgColor: "rgba(16, 185, 129, 0.1)",
    borderColor: "rgba(16, 185, 129, 0.3)",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    requirements: {
      kyc: true,
      minBalance: 10000,
      minDays: 7,
    },
    benefits: ["preferentialPricing", "reducedFees", "prioritySupport"],
  },
  {
    id: "reserve",
    name: "Reserve",
    spread: "0.65%",
    fee: "0.18%",
    color: "#3b82f6",
    bgColor: "rgba(59, 130, 246, 0.1)",
    borderColor: "rgba(59, 130, 246, 0.3)",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    requirements: {
      kyc: true,
      minBalance: 100000,
      minDays: 30,
      metalAsset: true,
    },
    benefits: ["preferentialPricing", "reducedFees", "prioritySupport", "enhancedPriority"],
  },
  {
    id: "vault",
    name: "Vault",
    spread: "0.50%",
    fee: "0.12%",
    color: "#8b5cf6",
    bgColor: "rgba(139, 92, 246, 0.1)",
    borderColor: "rgba(139, 92, 246, 0.3)",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    requirements: {
      kyc: true,
      minBalance: 500000,
      minDays: 90,
      activeEarnLease: true,
    },
    benefits: ["preferentialPricing", "reducedFees", "prioritySupport", "enhancedPriority"],
    extras: ["priorityExecution", "otcQuote"],
  },
  {
    id: "sovereign",
    name: "Sovereign",
    spread: "Custom",
    fee: "Custom",
    color: "#0f172a",
    bgColor: "rgba(15, 23, 42, 0.1)",
    borderColor: "rgba(15, 23, 42, 0.5)",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
      </svg>
    ),
    requirements: {
      kyc: true,
      minBalance: 1000000,
      minDays: 180,
      invitation: true,
    },
    benefits: ["preferentialPricing", "reducedFees", "prioritySupport", "enhancedPriority"],
    extras: ["dedicatedManager", "customCustody", "priorityExecution", "otcQuote"],
  },
];

// ============================================
// TRANSLATIONS
// ============================================
const translations: Record<string, Record<string, string>> = {
  tr: {
    auxiteerProgram: "Auxiteer Programı",
    currentTier: "Mevcut Seviyeniz",
    spread: "Spread",
    fee: "İşlem Ücreti",
    requirements: "Gereksinimler",
    benefits: "Avantajlar",
    kycRequired: "KYC Doğrulaması",
    minBalance: "Min. Bakiye",
    minDays: "Min. Gün",
    metalAsset: "Metal Varlık",
    activeEarnLease: "Aktif Earn/Lease",
    invitationOnly: "Sadece Davetiye",
    basicAccess: "Temel erişim",
    standardPricing: "Standart fiyatlandırma",
    preferentialPricing: "Tercihli fiyatlandırma (spread)",
    reducedFees: "Düşük işlem ücretleri",
    prioritySupport: "Öncelikli destek",
    enhancedPriority: "Gelişmiş işlem önceliği",
    priorityExecution: "Öncelikli işlem penceresi",
    otcQuote: "OTC teklif talebi",
    dedicatedManager: "Özel hesap yöneticisi",
    customCustody: "Özel saklama seçenekleri",
    viewAllTiers: "Tüm Seviyeleri Görüntüle",
    close: "Kapat",
    yourTier: "Seviyeniz",
    notEligible: "Bu seviye için henüz uygun değilsiniz.",
    auxiteerNote: "Auxiteer programı, herhangi bir finansal getiri veya ödül vaadi içermez. Spread ve ücret oranları piyasa koşullarına göre değişebilir.",
    nextTierHint: "Bir sonraki seviye için bakiyenizi koruyun",
    upgradeHint: "Yükseltme için gereksinimleri karşılayın",
  },
  en: {
    auxiteerProgram: "Auxiteer Program",
    currentTier: "Your Current Tier",
    spread: "Spread",
    fee: "Trading Fee",
    requirements: "Requirements",
    benefits: "Benefits",
    kycRequired: "KYC Verification",
    minBalance: "Min. Balance",
    minDays: "Min. Days",
    metalAsset: "Metal Asset",
    activeEarnLease: "Active Earn/Lease",
    invitationOnly: "Invitation Only",
    basicAccess: "Basic access",
    standardPricing: "Standard pricing",
    preferentialPricing: "Preferential pricing (spread)",
    reducedFees: "Reduced trading fees",
    prioritySupport: "Priority support",
    enhancedPriority: "Enhanced execution priority",
    priorityExecution: "Priority execution window",
    otcQuote: "OTC quote request",
    dedicatedManager: "Dedicated account manager",
    customCustody: "Custom custody options",
    viewAllTiers: "View All Tiers",
    close: "Close",
    yourTier: "Your Tier",
    notEligible: "You are not yet eligible for this tier.",
    auxiteerNote: "The Auxiteer program does not constitute a promise of financial returns or rewards. Spread and fee rates may vary based on market conditions.",
    nextTierHint: "Maintain your balance for the next tier",
    upgradeHint: "Meet the requirements to upgrade",
  },
  de: {
    auxiteerProgram: "Auxiteer Programm",
    currentTier: "Ihre aktuelle Stufe",
    spread: "Spread",
    fee: "Handelsgebühr",
    requirements: "Anforderungen",
    benefits: "Vorteile",
    kycRequired: "KYC-Verifizierung",
    minBalance: "Min. Guthaben",
    minDays: "Min. Tage",
    metalAsset: "Metallvermögen",
    activeEarnLease: "Aktives Earn/Lease",
    invitationOnly: "Nur auf Einladung",
    basicAccess: "Grundzugang",
    standardPricing: "Standardpreise",
    preferentialPricing: "Vorzugspreise (Spread)",
    reducedFees: "Reduzierte Handelsgebühren",
    prioritySupport: "Prioritätsunterstützung",
    enhancedPriority: "Verbesserte Ausführungspriorität",
    priorityExecution: "Prioritäts-Ausführungsfenster",
    otcQuote: "OTC-Angebotsanfrage",
    dedicatedManager: "Dedizierter Account-Manager",
    customCustody: "Individuelle Verwahrungsoptionen",
    viewAllTiers: "Alle Stufen anzeigen",
    close: "Schließen",
    yourTier: "Ihre Stufe",
    notEligible: "Sie sind noch nicht für diese Stufe berechtigt.",
    auxiteerNote: "Das Auxiteer-Programm stellt kein Versprechen auf finanzielle Renditen oder Belohnungen dar.",
    nextTierHint: "Halten Sie Ihr Guthaben für die nächste Stufe",
    upgradeHint: "Erfüllen Sie die Anforderungen für ein Upgrade",
  },
  fr: {
    auxiteerProgram: "Programme Auxiteer",
    currentTier: "Votre niveau actuel",
    spread: "Spread",
    fee: "Frais de trading",
    requirements: "Exigences",
    benefits: "Avantages",
    kycRequired: "Vérification KYC",
    minBalance: "Solde min.",
    minDays: "Jours min.",
    metalAsset: "Actif métallique",
    activeEarnLease: "Earn/Lease actif",
    invitationOnly: "Sur invitation uniquement",
    basicAccess: "Accès de base",
    standardPricing: "Tarification standard",
    preferentialPricing: "Tarification préférentielle (spread)",
    reducedFees: "Frais de trading réduits",
    prioritySupport: "Support prioritaire",
    enhancedPriority: "Priorité d'exécution améliorée",
    priorityExecution: "Fenêtre d'exécution prioritaire",
    otcQuote: "Demande de cotation OTC",
    dedicatedManager: "Gestionnaire de compte dédié",
    customCustody: "Options de garde personnalisées",
    viewAllTiers: "Voir tous les niveaux",
    close: "Fermer",
    yourTier: "Votre niveau",
    notEligible: "Vous n'êtes pas encore éligible pour ce niveau.",
    auxiteerNote: "Le programme Auxiteer ne constitue pas une promesse de rendements financiers ou de récompenses.",
    nextTierHint: "Maintenez votre solde pour le niveau suivant",
    upgradeHint: "Remplissez les conditions pour passer au niveau supérieur",
  },
  ar: {
    auxiteerProgram: "برنامج Auxiteer",
    currentTier: "مستواك الحالي",
    spread: "السبريد",
    fee: "رسوم التداول",
    requirements: "المتطلبات",
    benefits: "المزايا",
    kycRequired: "التحقق من الهوية",
    minBalance: "الحد الأدنى للرصيد",
    minDays: "الحد الأدنى للأيام",
    metalAsset: "أصل معدني",
    activeEarnLease: "Earn/Lease نشط",
    invitationOnly: "بالدعوة فقط",
    basicAccess: "الوصول الأساسي",
    standardPricing: "التسعير القياسي",
    preferentialPricing: "تسعير تفضيلي (السبريد)",
    reducedFees: "رسوم تداول مخفضة",
    prioritySupport: "دعم ذو أولوية",
    enhancedPriority: "أولوية تنفيذ محسنة",
    priorityExecution: "نافذة تنفيذ ذات أولوية",
    otcQuote: "طلب عرض OTC",
    dedicatedManager: "مدير حساب مخصص",
    customCustody: "خيارات حفظ مخصصة",
    viewAllTiers: "عرض جميع المستويات",
    close: "إغلاق",
    yourTier: "مستواك",
    notEligible: "أنت غير مؤهل لهذا المستوى بعد.",
    auxiteerNote: "برنامج Auxiteer لا يشكل وعداً بعوائد مالية أو مكافآت.",
    nextTierHint: "حافظ على رصيدك للمستوى التالي",
    upgradeHint: "استوفِ المتطلبات للترقية",
  },
  ru: {
    auxiteerProgram: "Программа Auxiteer",
    currentTier: "Ваш текущий уровень",
    spread: "Спред",
    fee: "Торговая комиссия",
    requirements: "Требования",
    benefits: "Преимущества",
    kycRequired: "KYC верификация",
    minBalance: "Мин. баланс",
    minDays: "Мин. дней",
    metalAsset: "Металлический актив",
    activeEarnLease: "Активный Earn/Lease",
    invitationOnly: "Только по приглашению",
    basicAccess: "Базовый доступ",
    standardPricing: "Стандартные цены",
    preferentialPricing: "Льготное ценообразование (спред)",
    reducedFees: "Сниженные торговые комиссии",
    prioritySupport: "Приоритетная поддержка",
    enhancedPriority: "Улучшенный приоритет исполнения",
    priorityExecution: "Приоритетное окно исполнения",
    otcQuote: "Запрос OTC котировки",
    dedicatedManager: "Персональный менеджер",
    customCustody: "Индивидуальные варианты хранения",
    viewAllTiers: "Показать все уровни",
    close: "Закрыть",
    yourTier: "Ваш уровень",
    notEligible: "Вы пока не соответствуете требованиям этого уровня.",
    auxiteerNote: "Программа Auxiteer не является обещанием финансовой прибыли или вознаграждений.",
    nextTierHint: "Поддерживайте баланс для следующего уровня",
    upgradeHint: "Выполните требования для повышения",
  },
};

// ============================================
// AUXITEER TIER BADGE COMPONENT
// ============================================
interface AuxiteerBadgeProps {
  tier: AuxiteerTier;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  onClick?: () => void;
}

export function AuxiteerBadge({ tier, size = "md", showLabel = true, onClick }: AuxiteerBadgeProps) {
  const sizeClasses = {
    sm: "px-2 py-1 text-xs gap-1",
    md: "px-3 py-1.5 text-sm gap-1.5",
    lg: "px-4 py-2 text-base gap-2",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center ${sizeClasses[size]} rounded-full font-medium transition-all hover:scale-105 active:scale-95`}
      style={{
        backgroundColor: tier.bgColor,
        color: tier.color,
        border: `1px solid ${tier.borderColor}`,
      }}
    >
      <span className={iconSizes[size]} style={{ color: tier.color }}>
        {tier.icon}
      </span>
      {showLabel && <span>{tier.name}</span>}
    </button>
  );
}

// ============================================
// AUXITEER TIER MODAL COMPONENT
// ============================================
interface AuxiteerTierModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTierId?: string;
  userBalance?: number;
  userDays?: number;
  isKycVerified?: boolean;
  hasMetalAsset?: boolean;
  hasActiveEarnLease?: boolean;
}

export default function AuxiteerTierModal({
  isOpen,
  onClose,
  currentTierId = "regular",
  userBalance = 0,
  userDays = 0,
  isKycVerified = false,
  hasMetalAsset = false,
  hasActiveEarnLease = false,
}: AuxiteerTierModalProps) {
  const { lang } = useLanguage();
  const { address } = useAccount();
  const t = translations[lang] || translations.en;

  const currentTier = AUXITEER_TIERS.find((tier) => tier.id === currentTierId) || AUXITEER_TIERS[0];
  const [selectedTier, setSelectedTier] = useState<AuxiteerTier>(currentTier);

  useEffect(() => {
    if (isOpen) {
      setSelectedTier(currentTier);
    }
  }, [isOpen, currentTier]);

  if (!isOpen) return null;

  const formatBalance = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    return `$${amount}`;
  };

  const checkEligibility = (tier: AuxiteerTier) => {
    const req = tier.requirements;
    if (req.kyc && !isKycVerified) return false;
    if (userBalance < req.minBalance) return false;
    if (userDays < req.minDays) return false;
    if (req.metalAsset && !hasMetalAsset) return false;
    if (req.activeEarnLease && !hasActiveEarnLease) return false;
    if (req.invitation) return false; // Can't auto-qualify for invitation-only
    return true;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: currentTier.bgColor }}
            >
              <span style={{ color: currentTier.color }}>{currentTier.icon}</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {t.auxiteerProgram}
              </h2>
              <p className="text-sm text-slate-500 dark:text-zinc-400">
                {t.currentTier}: <span style={{ color: currentTier.color }} className="font-medium">{currentTier.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-5 h-5 text-slate-500 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col lg:flex-row overflow-hidden" style={{ maxHeight: "calc(90vh - 140px)" }}>
          {/* Tier List */}
          <div className="lg:w-64 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-stone-200 dark:border-zinc-800 overflow-x-auto lg:overflow-y-auto">
            <div className="flex lg:flex-col p-3 gap-2">
              {AUXITEER_TIERS.map((tier) => {
                const isCurrentTier = tier.id === currentTierId;
                const isSelected = tier.id === selectedTier.id;
                const isEligible = checkEligibility(tier);

                return (
                  <button
                    key={tier.id}
                    onClick={() => setSelectedTier(tier)}
                    className={`flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      isSelected
                        ? "bg-stone-100 dark:bg-zinc-800 shadow-sm"
                        : "hover:bg-stone-50 dark:hover:bg-zinc-800/50"
                    }`}
                    style={{
                      borderLeft: isSelected ? `3px solid ${tier.color}` : "3px solid transparent",
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: tier.bgColor }}
                    >
                      <span style={{ color: tier.color }}>{tier.icon}</span>
                    </div>
                    <div className="text-left hidden lg:block">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900 dark:text-white">{tier.name}</span>
                        {isCurrentTier && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                            {t.yourTier}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 dark:text-zinc-400">
                        {tier.spread} / {tier.fee}
                      </span>
                    </div>
                    <span className="lg:hidden text-xs font-medium" style={{ color: tier.color }}>
                      {tier.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tier Details */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Selected Tier Header */}
            <div 
              className="p-5 rounded-xl mb-6"
              style={{ 
                backgroundColor: selectedTier.bgColor,
                border: `1px solid ${selectedTier.borderColor}`,
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${selectedTier.color}20` }}
                  >
                    <span className="w-6 h-6" style={{ color: selectedTier.color }}>
                      {selectedTier.icon}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold" style={{ color: selectedTier.color }}>
                      {selectedTier.name}
                    </h3>
                    {selectedTier.id === currentTierId && (
                      <span className="text-sm text-slate-600 dark:text-zinc-400">{t.currentTier}</span>
                    )}
                  </div>
                </div>
                {checkEligibility(selectedTier) && selectedTier.id !== currentTierId && (
                  <span className="px-3 py-1 text-sm font-medium rounded-full bg-emerald-500/20 text-emerald-600 border border-emerald-500/30">
                    ✓ Eligible
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-white/50 dark:bg-black/20">
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mb-1">{t.spread}</p>
                  <p className="text-lg font-bold" style={{ color: selectedTier.color }}>
                    {selectedTier.spread}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-white/50 dark:bg-black/20">
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mb-1">{t.fee}</p>
                  <p className="text-lg font-bold" style={{ color: selectedTier.color }}>
                    {selectedTier.fee}
                  </p>
                </div>
              </div>
            </div>

            {/* Requirements */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                {t.requirements}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {selectedTier.requirements.kyc && (
                  <div className={`p-3 rounded-lg border ${isKycVerified ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30" : "bg-stone-50 dark:bg-zinc-800 border-stone-200 dark:border-zinc-700"}`}>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">{t.kycRequired}</p>
                    <p className={`text-sm font-medium ${isKycVerified ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-zinc-300"}`}>
                      {isKycVerified ? "✓" : "Required"}
                    </p>
                  </div>
                )}
                {selectedTier.requirements.minBalance > 0 && (
                  <div className={`p-3 rounded-lg border ${userBalance >= selectedTier.requirements.minBalance ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30" : "bg-stone-50 dark:bg-zinc-800 border-stone-200 dark:border-zinc-700"}`}>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">{t.minBalance}</p>
                    <p className={`text-sm font-medium ${userBalance >= selectedTier.requirements.minBalance ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-zinc-300"}`}>
                      {formatBalance(selectedTier.requirements.minBalance)}
                    </p>
                  </div>
                )}
                {selectedTier.requirements.minDays > 0 && (
                  <div className={`p-3 rounded-lg border ${userDays >= selectedTier.requirements.minDays ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30" : "bg-stone-50 dark:bg-zinc-800 border-stone-200 dark:border-zinc-700"}`}>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">{t.minDays}</p>
                    <p className={`text-sm font-medium ${userDays >= selectedTier.requirements.minDays ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-zinc-300"}`}>
                      {selectedTier.requirements.minDays}
                    </p>
                  </div>
                )}
                {selectedTier.requirements.metalAsset && (
                  <div className={`p-3 rounded-lg border ${hasMetalAsset ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30" : "bg-stone-50 dark:bg-zinc-800 border-stone-200 dark:border-zinc-700"}`}>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">{t.metalAsset}</p>
                    <p className={`text-sm font-medium ${hasMetalAsset ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-zinc-300"}`}>
                      {hasMetalAsset ? "✓" : "Required"}
                    </p>
                  </div>
                )}
                {selectedTier.requirements.activeEarnLease && (
                  <div className={`p-3 rounded-lg border ${hasActiveEarnLease ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30" : "bg-stone-50 dark:bg-zinc-800 border-stone-200 dark:border-zinc-700"}`}>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">{t.activeEarnLease}</p>
                    <p className={`text-sm font-medium ${hasActiveEarnLease ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-zinc-300"}`}>
                      {hasActiveEarnLease ? "✓" : "Required"}
                    </p>
                  </div>
                )}
                {selectedTier.requirements.invitation && (
                  <div className="p-3 rounded-lg border bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30">
                    <p className="text-xs text-slate-500 dark:text-zinc-400">{t.invitationOnly}</p>
                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400">★</p>
                  </div>
                )}
              </div>
            </div>

            {/* Benefits */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {t.benefits}
              </h4>
              <div className="space-y-2">
                {selectedTier.benefits.map((benefit, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg bg-stone-50 dark:bg-zinc-800/50"
                  >
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: selectedTier.bgColor }}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke={selectedTier.color}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm text-slate-700 dark:text-zinc-300">
                      {t[benefit as keyof typeof t] || benefit}
                    </span>
                  </div>
                ))}
                {selectedTier.extras?.map((extra, index) => (
                  <div 
                    key={`extra-${index}`}
                    className="flex items-center gap-3 p-3 rounded-lg"
                    style={{ backgroundColor: selectedTier.bgColor }}
                  >
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${selectedTier.color}30` }}
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={selectedTier.color}>
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium" style={{ color: selectedTier.color }}>
                      {t[extra as keyof typeof t] || extra}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Note */}
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
              <p className="text-xs text-amber-700 dark:text-amber-300">
                ⚠️ {t.auxiteerNote}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-stone-200 dark:border-zinc-800">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-stone-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-medium hover:bg-stone-300 dark:hover:bg-zinc-600 transition-colors"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// HOOK: useAuxiteerTier (Legacy - local calculation)
// For API-based tier, use: import { useAuxiteerTier } from '@/hooks/useAuxiteerTier'
// ============================================
export function useAuxiteerTierLocal(
  userBalance: number = 0,
  userDays: number = 0,
  isKycVerified: boolean = false,
  hasMetalAsset: boolean = false,
  hasActiveEarnLease: boolean = false
): AuxiteerTier {
  // Calculate user's tier based on their stats
  const tiers = [...AUXITEER_TIERS].reverse(); // Start from highest tier

  for (const tier of tiers) {
    const req = tier.requirements;
    
    // Skip sovereign (invitation only)
    if (req.invitation) continue;
    
    // Check all requirements
    if (req.kyc && !isKycVerified) continue;
    if (userBalance < req.minBalance) continue;
    if (userDays < req.minDays) continue;
    if (req.metalAsset && !hasMetalAsset) continue;
    if (req.activeEarnLease && !hasActiveEarnLease) continue;
    
    // All requirements met
    return tier;
  }

  // Default to regular
  return AUXITEER_TIERS[0];
}

// Re-export API-based hook as primary
export { useAuxiteerTierHook as useAuxiteerTier } from "@/hooks/useAuxiteerTier";
