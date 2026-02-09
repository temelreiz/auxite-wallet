"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/components/LanguageContext";
import { useAccount } from "wagmi";

// ============================================
// AUXITEER TIER TYPES
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

// ============================================
// TIER STYLING CONFIG
// ============================================
// INSTITUTIONAL TIER NAMING (Standard, Prime, Private, Institutional)
const TIER_STYLES: Record<string, { color: string; bgColor: string; borderColor: string }> = {
  standard: { color: "#64748b", bgColor: "rgba(100, 116, 139, 0.1)", borderColor: "rgba(100, 116, 139, 0.3)" },
  prime: { color: "#10b981", bgColor: "rgba(16, 185, 129, 0.1)", borderColor: "rgba(16, 185, 129, 0.3)" },
  private: { color: "#fbbf24", bgColor: "rgba(251, 191, 36, 0.1)", borderColor: "rgba(251, 191, 36, 0.3)" },
  institutional: { color: "#8b5cf6", bgColor: "rgba(139, 92, 246, 0.1)", borderColor: "rgba(139, 92, 246, 0.3)" },
  // Legacy mappings
  regular: { color: "#64748b", bgColor: "rgba(100, 116, 139, 0.1)", borderColor: "rgba(100, 116, 139, 0.3)" },
  core: { color: "#10b981", bgColor: "rgba(16, 185, 129, 0.1)", borderColor: "rgba(16, 185, 129, 0.3)" },
  reserve: { color: "#3b82f6", bgColor: "rgba(59, 130, 246, 0.1)", borderColor: "rgba(59, 130, 246, 0.3)" },
  vault: { color: "#8b5cf6", bgColor: "rgba(139, 92, 246, 0.1)", borderColor: "rgba(139, 92, 246, 0.3)" },
  sovereign: { color: "#0f172a", bgColor: "rgba(15, 23, 42, 0.1)", borderColor: "rgba(15, 23, 42, 0.5)" },
};

const TIER_BENEFITS: Record<string, { benefits: string[]; extras?: string[] }> = {
  regular: { benefits: ["basicAccess", "standardPricing"] },
  core: { benefits: ["preferentialPricing", "reducedFees", "prioritySupport"] },
  reserve: { benefits: ["preferentialPricing", "reducedFees", "prioritySupport", "enhancedPriority"] },
  vault: { benefits: ["preferentialPricing", "reducedFees", "prioritySupport", "enhancedPriority"], extras: ["priorityExecution", "otcQuote"] },
  sovereign: { benefits: ["preferentialPricing", "reducedFees", "prioritySupport", "enhancedPriority"], extras: ["dedicatedManager", "customCustody", "priorityExecution", "otcQuote"] },
};

const TIER_ICONS: Record<string, React.ReactNode> = {
  regular: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  core: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  reserve: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  vault: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  sovereign: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
    </svg>
  ),
};

// ============================================
// DEFAULT TIERS (Fallback)
// ============================================
const DEFAULT_TIERS: AuxiteerTier[] = [
  {
    id: "regular", name: "Regular", spread: "1.00%", fee: "0.35%",
    ...TIER_STYLES.regular, icon: TIER_ICONS.regular,
    requirements: { kyc: false, minBalance: 0, minDays: 0 },
    ...TIER_BENEFITS.regular,
  },
  {
    id: "core", name: "Core", spread: "0.80%", fee: "0.25%",
    ...TIER_STYLES.core, icon: TIER_ICONS.core,
    requirements: { kyc: true, minBalance: 10000, minDays: 7 },
    ...TIER_BENEFITS.core,
  },
  {
    id: "reserve", name: "Reserve", spread: "0.65%", fee: "0.18%",
    ...TIER_STYLES.reserve, icon: TIER_ICONS.reserve,
    requirements: { kyc: true, minBalance: 100000, minDays: 30, metalAsset: true },
    ...TIER_BENEFITS.reserve,
  },
  {
    id: "vault", name: "Vault", spread: "0.50%", fee: "0.12%",
    ...TIER_STYLES.vault, icon: TIER_ICONS.vault,
    requirements: { kyc: true, minBalance: 500000, minDays: 90, activeEarnLease: true },
    ...TIER_BENEFITS.vault,
  },
  {
    id: "sovereign", name: "Sovereign", spread: "Custom", fee: "Custom",
    ...TIER_STYLES.sovereign, icon: TIER_ICONS.sovereign,
    requirements: { kyc: true, minBalance: 1000000, minDays: 180, invitation: true },
    ...TIER_BENEFITS.sovereign,
  },
];

// Export for backwards compatibility
export const AUXITEER_TIERS = DEFAULT_TIERS;

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
    reducedFees: "Reduced transaction fees",
    prioritySupport: "Priority support",
    enhancedPriority: "Enhanced transaction priority",
    priorityExecution: "Priority execution window",
    otcQuote: "OTC quote request",
    dedicatedManager: "Dedicated account manager",
    customCustody: "Custom custody options",
    viewAllTiers: "View All Tiers",
    close: "Close",
    yourTier: "Your Tier",
    notEligible: "You are not yet eligible for this tier.",
    auxiteerNote: "The Auxiteer program does not constitute a promise of financial returns or rewards. Spread and fee rates may vary based on market conditions.",
    nextTierHint: "Maintain your balance for next tier",
    upgradeHint: "Meet requirements to upgrade",
  },
  de: {
    auxiteerProgram: "Auxiteer Programm",
    currentTier: "Ihr aktuelles Level",
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
    basicAccess: "Basiszugang",
    standardPricing: "Standardpreise",
    preferentialPricing: "Vorzugspreise (Spread)",
    reducedFees: "Reduzierte Gebühren",
    prioritySupport: "Prioritäts-Support",
    enhancedPriority: "Erhöhte Transaktionspriorität",
    priorityExecution: "Prioritäts-Ausführungsfenster",
    otcQuote: "OTC-Angebotsanfrage",
    dedicatedManager: "Dedizierter Account Manager",
    customCustody: "Individuelle Verwahrungsoptionen",
    viewAllTiers: "Alle Level anzeigen",
    close: "Schließen",
    yourTier: "Ihr Level",
    notEligible: "Sie sind noch nicht für dieses Level berechtigt.",
    auxiteerNote: "Das Auxiteer-Programm stellt kein Versprechen auf finanzielle Erträge dar. Spread und Gebühren können je nach Marktbedingungen variieren.",
    nextTierHint: "Halten Sie Ihr Guthaben für das nächste Level",
    upgradeHint: "Erfüllen Sie die Anforderungen für ein Upgrade",
  },
  fr: {
    auxiteerProgram: "Programme Auxiteer",
    currentTier: "Votre Niveau Actuel",
    spread: "Spread",
    fee: "Frais de Trading",
    requirements: "Exigences",
    benefits: "Avantages",
    kycRequired: "Vérification KYC",
    minBalance: "Solde Min.",
    minDays: "Jours Min.",
    metalAsset: "Actif Métallique",
    activeEarnLease: "Earn/Lease Actif",
    invitationOnly: "Sur Invitation",
    basicAccess: "Accès de base",
    standardPricing: "Tarification standard",
    preferentialPricing: "Tarification préférentielle (spread)",
    reducedFees: "Frais réduits",
    prioritySupport: "Support prioritaire",
    enhancedPriority: "Priorité de transaction améliorée",
    priorityExecution: "Fenêtre d'exécution prioritaire",
    otcQuote: "Demande de cotation OTC",
    dedicatedManager: "Gestionnaire de compte dédié",
    customCustody: "Options de garde personnalisées",
    viewAllTiers: "Voir Tous les Niveaux",
    close: "Fermer",
    yourTier: "Votre Niveau",
    notEligible: "Vous n'êtes pas encore éligible pour ce niveau.",
    auxiteerNote: "Le programme Auxiteer ne constitue pas une promesse de rendements financiers. Les spreads et frais peuvent varier selon les conditions du marché.",
    nextTierHint: "Maintenez votre solde pour le niveau suivant",
    upgradeHint: "Remplissez les conditions pour évoluer",
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
    metalAsset: "أصول معدنية",
    activeEarnLease: "Earn/Lease نشط",
    invitationOnly: "بدعوة فقط",
    basicAccess: "وصول أساسي",
    standardPricing: "تسعير قياسي",
    preferentialPricing: "تسعير تفضيلي (سبريد)",
    reducedFees: "رسوم مخفضة",
    prioritySupport: "دعم ذو أولوية",
    enhancedPriority: "أولوية معاملات محسنة",
    priorityExecution: "نافذة تنفيذ ذات أولوية",
    otcQuote: "طلب عرض OTC",
    dedicatedManager: "مدير حساب مخصص",
    customCustody: "خيارات حفظ مخصصة",
    viewAllTiers: "عرض جميع المستويات",
    close: "إغلاق",
    yourTier: "مستواك",
    notEligible: "لست مؤهلاً لهذا المستوى بعد.",
    auxiteerNote: "برنامج Auxiteer لا يشكل وعداً بعوائد مالية. قد تختلف معدلات السبريد والرسوم حسب ظروف السوق.",
    nextTierHint: "حافظ على رصيدك للمستوى التالي",
    upgradeHint: "استوفِ المتطلبات للترقية",
  },
  ru: {
    auxiteerProgram: "Программа Auxiteer",
    currentTier: "Ваш Текущий Уровень",
    spread: "Спред",
    fee: "Комиссия",
    requirements: "Требования",
    benefits: "Преимущества",
    kycRequired: "KYC Верификация",
    minBalance: "Мин. Баланс",
    minDays: "Мин. Дней",
    metalAsset: "Металлические Активы",
    activeEarnLease: "Активный Earn/Lease",
    invitationOnly: "Только по Приглашению",
    basicAccess: "Базовый доступ",
    standardPricing: "Стандартные цены",
    preferentialPricing: "Льготные цены (спред)",
    reducedFees: "Сниженные комиссии",
    prioritySupport: "Приоритетная поддержка",
    enhancedPriority: "Повышенный приоритет транзакций",
    priorityExecution: "Приоритетное окно исполнения",
    otcQuote: "Запрос OTC котировки",
    dedicatedManager: "Персональный менеджер",
    customCustody: "Индивидуальное хранение",
    viewAllTiers: "Все Уровни",
    close: "Закрыть",
    yourTier: "Ваш Уровень",
    notEligible: "Вы пока не соответствуете требованиям этого уровня.",
    auxiteerNote: "Программа Auxiteer не является обещанием финансовой прибыли. Спреды и комиссии могут меняться в зависимости от рыночных условий.",
    nextTierHint: "Поддерживайте баланс для следующего уровня",
    upgradeHint: "Выполните требования для повышения",
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================
function formatBalance(amount: number): string {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
  return `$${amount}`;
}

function formatSpread(spread: number): string {
  if (spread === 0) return "Custom";
  return `${spread.toFixed(2)}%`;
}

function formatFee(fee: number): string {
  if (fee === 0) return "Custom";
  return `${fee.toFixed(2)}%`;
}

// ============================================
// COMPONENT PROPS
// ============================================
interface AuxiteerTierModalProps {
  currentTierId?: string;
  isOpen: boolean;
  onClose: () => void;
  userBalance?: number;
  userDays?: number;
  isKycVerified?: boolean;
  hasMetalAsset?: boolean;
  hasActiveEarnLease?: boolean;
}

// ============================================
// MAIN COMPONENT
// ============================================
export function AuxiteerTierModal({
  isOpen,
  onClose,
  userBalance = 0,
  userDays = 0,
  isKycVerified = false,
  hasMetalAsset = false,
  hasActiveEarnLease = false,
  currentTierId,
}: AuxiteerTierModalProps) {
  const { lang } = useLanguage();
  const { address } = useAccount();
  const t = translations[lang] || translations.en;

  // ✅ Dynamic tiers from API
  const [tiers, setTiers] = useState<AuxiteerTier[]>(DEFAULT_TIERS);
  const [selectedTier, setSelectedTier] = useState<AuxiteerTier>(DEFAULT_TIERS[0]);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ Fetch tiers from API on mount
  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    fetch('/api/tiers')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.tiers) {
          // Merge API data with UI config
          const updatedTiers = DEFAULT_TIERS.map(defaultTier => {
            const apiTier = data.tiers.find((t: any) => t.id === defaultTier.id);
            if (apiTier) {
              return {
                ...defaultTier,
                spread: formatSpread(apiTier.spread),
                fee: formatFee(apiTier.fee),
                requirements: {
                  ...defaultTier.requirements,
                  minBalance: apiTier.requirements?.minBalanceUsd || defaultTier.requirements.minBalance,
                  minDays: apiTier.requirements?.minDays || defaultTier.requirements.minDays,
                },
              };
            }
            return defaultTier;
          });
          setTiers(updatedTiers);
          
          // Set current tier
          const currentTier = calculateUserTier(updatedTiers, userBalance, userDays, isKycVerified, hasMetalAsset, hasActiveEarnLease);
          setSelectedTier(currentTier);
        }
      })
      .catch(err => {
        console.error('Failed to fetch tiers:', err);
        const currentTier = calculateUserTier(DEFAULT_TIERS, userBalance, userDays, isKycVerified, hasMetalAsset, hasActiveEarnLease);
        setSelectedTier(currentTier);
      })
      .finally(() => setIsLoading(false));
  }, [isOpen, userBalance, userDays, isKycVerified, hasMetalAsset, hasActiveEarnLease]);

  // Calculate user's tier based on requirements
  function calculateUserTier(
    tierList: AuxiteerTier[],
    balance: number,
    days: number,
    kyc: boolean,
    metal: boolean,
    lease: boolean
  ): AuxiteerTier {
    const reversedTiers = [...tierList].reverse();
    
    for (const tier of reversedTiers) {
      const req = tier.requirements;
      if (req.invitation) continue;
      if (req.kyc && !kyc) continue;
      if (balance < req.minBalance) continue;
      if (days < req.minDays) continue;
      if (req.metalAsset && !metal) continue;
      if (req.activeEarnLease && !lease) continue;
      return tier;
    }
    
    return tierList[0]; // Regular
  }

  const currentTier = calculateUserTier(tiers, userBalance, userDays, isKycVerified, hasMetalAsset, hasActiveEarnLease);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-zinc-800 w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#BFA181] to-[#BFA181]/80 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">{t.auxiteerProgram}</h3>
              <p className="text-sm text-slate-500 dark:text-zinc-400">
                {t.currentTier}: <span style={{ color: currentTier.color }}>{currentTier.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-zinc-800 hover:bg-stone-200 dark:hover:bg-zinc-700 flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col md:flex-row max-h-[calc(90vh-180px)] overflow-hidden">
          {/* Tier List - Left Side */}
          <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-stone-200 dark:border-zinc-800 p-4 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <svg className="animate-spin h-6 w-6 text-[#BFA181]" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : (
              <div className="space-y-2">
                {tiers.map((tier) => (
                  <button
                    key={tier.id}
                    onClick={() => setSelectedTier(tier)}
                    className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
                      selectedTier.id === tier.id
                        ? "border-[#BFA181] bg-[#BFA181]/10 dark:bg-[#BFA181]/10"
                        : "border-transparent bg-stone-50 dark:bg-zinc-800/50 hover:bg-stone-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: tier.bgColor, color: tier.color }}
                      >
                        {tier.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800 dark:text-white">{tier.name}</span>
                          {currentTier.id === tier.id && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[#BFA181]/15 dark:bg-[#BFA181]/20 text-[#BFA181] dark:text-[#BFA181]">
                              {t.yourTier}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-zinc-400">
                          {tier.spread} / {tier.fee}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tier Details - Right Side */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Tier Header */}
            <div
              className="p-4 rounded-xl mb-6"
              style={{ backgroundColor: selectedTier.bgColor, borderColor: selectedTier.borderColor, borderWidth: 1 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: selectedTier.color + '20', color: selectedTier.color }}
                >
                  {selectedTier.icon}
                </div>
                <div>
                  <h3 className="text-xl font-bold" style={{ color: selectedTier.color }}>
                    {selectedTier.name}
                  </h3>
                  {currentTier.id === selectedTier.id && (
                    <p className="text-sm text-slate-500 dark:text-zinc-400">{t.currentTier}</p>
                  )}
                </div>
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
                  <div className={`p-3 rounded-lg border ${isKycVerified ? "bg-[#2F6F62]/10 dark:bg-[#2F6F62]/10 border-[#2F6F62]/30 dark:border-[#2F6F62]/30" : "bg-stone-50 dark:bg-zinc-800 border-stone-200 dark:border-zinc-700"}`}>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">{t.kycRequired}</p>
                    <p className={`text-sm font-medium ${isKycVerified ? "text-[#2F6F62] dark:text-[#2F6F62]" : "text-slate-700 dark:text-zinc-300"}`}>
                      {isKycVerified ? "✓" : "Required"}
                    </p>
                  </div>
                )}
                {selectedTier.requirements.minBalance > 0 && (
                  <div className={`p-3 rounded-lg border ${userBalance >= selectedTier.requirements.minBalance ? "bg-[#2F6F62]/10 dark:bg-[#2F6F62]/10 border-[#2F6F62]/30 dark:border-[#2F6F62]/30" : "bg-stone-50 dark:bg-zinc-800 border-stone-200 dark:border-zinc-700"}`}>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">{t.minBalance}</p>
                    <p className={`text-sm font-medium ${userBalance >= selectedTier.requirements.minBalance ? "text-[#2F6F62] dark:text-[#2F6F62]" : "text-slate-700 dark:text-zinc-300"}`}>
                      {formatBalance(selectedTier.requirements.minBalance)}
                    </p>
                  </div>
                )}
                {selectedTier.requirements.minDays > 0 && (
                  <div className={`p-3 rounded-lg border ${userDays >= selectedTier.requirements.minDays ? "bg-[#2F6F62]/10 dark:bg-[#2F6F62]/10 border-[#2F6F62]/30 dark:border-[#2F6F62]/30" : "bg-stone-50 dark:bg-zinc-800 border-stone-200 dark:border-zinc-700"}`}>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">{t.minDays}</p>
                    <p className={`text-sm font-medium ${userDays >= selectedTier.requirements.minDays ? "text-[#2F6F62] dark:text-[#2F6F62]" : "text-slate-700 dark:text-zinc-300"}`}>
                      {selectedTier.requirements.minDays}
                    </p>
                  </div>
                )}
                {selectedTier.requirements.metalAsset && (
                  <div className={`p-3 rounded-lg border ${hasMetalAsset ? "bg-[#2F6F62]/10 dark:bg-[#2F6F62]/10 border-[#2F6F62]/30 dark:border-[#2F6F62]/30" : "bg-stone-50 dark:bg-zinc-800 border-stone-200 dark:border-zinc-700"}`}>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">{t.metalAsset}</p>
                    <p className={`text-sm font-medium ${hasMetalAsset ? "text-[#2F6F62] dark:text-[#2F6F62]" : "text-slate-700 dark:text-zinc-300"}`}>
                      {hasMetalAsset ? "✓" : "Required"}
                    </p>
                  </div>
                )}
                {selectedTier.requirements.activeEarnLease && (
                  <div className={`p-3 rounded-lg border ${hasActiveEarnLease ? "bg-[#2F6F62]/10 dark:bg-[#2F6F62]/10 border-[#2F6F62]/30 dark:border-[#2F6F62]/30" : "bg-stone-50 dark:bg-zinc-800 border-stone-200 dark:border-zinc-700"}`}>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">{t.activeEarnLease}</p>
                    <p className={`text-sm font-medium ${hasActiveEarnLease ? "text-[#2F6F62] dark:text-[#2F6F62]" : "text-slate-700 dark:text-zinc-300"}`}>
                      {hasActiveEarnLease ? "✓" : "Required"}
                    </p>
                  </div>
                )}
                {selectedTier.requirements.invitation && (
                  <div className="p-3 rounded-lg border bg-[#BFA181]/10 dark:bg-[#BFA181]/10 border-[#BFA181]/30 dark:border-[#BFA181]/30">
                    <p className="text-xs text-slate-500 dark:text-zinc-400">{t.invitationOnly}</p>
                    <p className="text-sm font-medium text-[#BFA181] dark:text-[#BFA181]">★</p>
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
            <div className="p-4 rounded-xl bg-[#BFA181]/10 dark:bg-[#BFA181]/10 border border-[#BFA181]/30 dark:border-[#BFA181]/20">
              <p className="text-xs text-[#BFA181] dark:text-[#BFA181]">
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
// LEGACY HOOK (for backwards compatibility)
// ============================================
export function useAuxiteerTierLocal(
  userBalance: number = 0,
  userDays: number = 0,
  isKycVerified: boolean = false,
  hasMetalAsset: boolean = false,
  hasActiveEarnLease: boolean = false
): AuxiteerTier {
  const tiers = [...DEFAULT_TIERS].reverse();

  for (const tier of tiers) {
    const req = tier.requirements;
    if (req.invitation) continue;
    if (req.kyc && !isKycVerified) continue;
    if (userBalance < req.minBalance) continue;
    if (userDays < req.minDays) continue;
    if (req.metalAsset && !hasMetalAsset) continue;
    if (req.activeEarnLease && !hasActiveEarnLease) continue;
    return tier;
  }

  return DEFAULT_TIERS[0];
}

export default AuxiteerTierModal;

// ============================================
// AUXITEER BADGE COMPONENT
// ============================================
interface AuxiteerBadgeProps {
  tier: AuxiteerTier;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function AuxiteerBadge({ tier, size = "md", showLabel = true }: AuxiteerBadgeProps) {
  const sizeClasses = {
    sm: "w-5 h-5 text-xs",
    md: "w-7 h-7 text-sm",
    lg: "w-10 h-10 text-base",
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={`${sizeClasses[size]} rounded-lg flex items-center justify-center`}
        style={{ backgroundColor: tier.bgColor, color: tier.color }}
      >
        {tier.icon}
      </div>
      {showLabel && (
        <span className="font-medium" style={{ color: tier.color }}>
          {tier.name}
        </span>
      )}
    </div>
  );
}
