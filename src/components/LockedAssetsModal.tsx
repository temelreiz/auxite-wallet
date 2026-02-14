"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageContext";
import { useAllocations, FormattedAllocation as Allocation } from "@/hooks/useAllocations";
import { useStaking, FormattedStake } from "@/hooks/useStaking";
import { formatUnits } from "viem";
import { formatAmount } from "@/lib/format";

interface LockedAssetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  metalPrices?: {
    AUXG: number;
    AUXS: number;
    AUXPT: number;
    AUXPD: number;
  };
}

// 6-language translations
const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "Tahsisli Varlıklar",
    subtitle: "Fiziksel metal tahsisleri ve getiri pozisyonları",
    allocations: "Fiziksel Tahsisler",
    allocationsDesc: "Kasa lokasyonlarına göre tahsis edilmiş metalleriniz",
    stakingPositions: "Getiri Pozisyonları",
    stakingDesc: "Aktif getiri pozisyonlarınız",
    noAllocations: "Henüz tahsis bulunmuyor",
    noPositions: "Henüz getiri pozisyonu bulunmuyor",
    totalLocked: "Toplam",
    estValue: "Tahmini Değer",
    vault: "Kasa",
    amount: "Miktar",
    date: "Tarih",
    status: "Durum",
    active: "Aktif",
    unlocking: "Açılıyor",
    completed: "Tamamlandı",
    daysLeft: "gün kaldı",
    allocated: "Tahsis Edildi",
    close: "Kapat",
    gold: "Altın",
    silver: "Gümüş",
    platinum: "Platin",
    palladium: "Paladyum",
    grams: "gram",
    viewOnChain: "Zincirde Görüntüle",
    allocationId: "Tahsis ID",
    custodian: "Saklayıcı",
    zurich: "Zürih Kasası",
    istanbul: "İstanbul Kasası",
    london: "Londra Kasası",
    dubai: "Dubai Kasası",
    staked: "stake",
    months: "ay",
    progress: "İlerleme",
    reward: "ödül",
    noPositionsHint: "Stake pozisyonlarınızı Biriktir sekmesinden oluşturabilirsiniz.",
  },
  en: {
    title: "Allocated Assets",
    subtitle: "Physical metal allocations and yield positions",
    allocations: "Physical Allocations",
    allocationsDesc: "Your metals allocated to vault locations",
    stakingPositions: "Yield Positions",
    stakingDesc: "Your active yield positions",
    noAllocations: "No allocations yet",
    noPositions: "No yield positions yet",
    totalLocked: "Total",
    estValue: "Est. Value",
    vault: "Vault",
    amount: "Amount",
    date: "Date",
    status: "Status",
    active: "Active",
    unlocking: "Unlocking",
    completed: "Completed",
    daysLeft: "days left",
    allocated: "Allocated",
    close: "Close",
    gold: "Gold",
    silver: "Silver",
    platinum: "Platinum",
    palladium: "Palladium",
    grams: "grams",
    viewOnChain: "View on Chain",
    allocationId: "Allocation ID",
    custodian: "Custodian",
    zurich: "Zurich Vault",
    istanbul: "Istanbul Vault",
    london: "London Vault",
    dubai: "Dubai Vault",
    staked: "staked",
    months: "months",
    progress: "Progress",
    reward: "reward",
    noPositionsHint: "You can create staking positions from the Earn tab.",
  },
  de: {
    title: "Zugewiesene Vermögenswerte",
    subtitle: "Physische Metallzuweisungen und Rendite-Positionen",
    allocations: "Physische Zuweisungen",
    allocationsDesc: "Ihre Metalle, die Tresorstandorten zugewiesen sind",
    stakingPositions: "Rendite-Positionen",
    stakingDesc: "Ihre aktiven Rendite-Positionen",
    noAllocations: "Noch keine Zuweisungen",
    noPositions: "Noch keine Rendite-Positionen",
    totalLocked: "Gesamt",
    estValue: "Gesch. Wert",
    vault: "Tresor",
    amount: "Betrag",
    date: "Datum",
    status: "Status",
    active: "Aktiv",
    unlocking: "Entsperrung",
    completed: "Abgeschlossen",
    daysLeft: "Tage übrig",
    allocated: "Zugewiesen",
    close: "Schließen",
    gold: "Gold",
    silver: "Silber",
    platinum: "Platin",
    palladium: "Palladium",
    grams: "Gramm",
    viewOnChain: "Auf Chain anzeigen",
    allocationId: "Zuweisung-ID",
    custodian: "Verwahrer",
    zurich: "Zürich Tresor",
    istanbul: "Istanbul Tresor",
    london: "London Tresor",
    dubai: "Dubai Tresor",
    staked: "gestaked",
    months: "Monate",
    progress: "Fortschritt",
    reward: "Belohnung",
    noPositionsHint: "Sie können Staking-Positionen im Verdienen-Tab erstellen.",
  },
  fr: {
    title: "Actifs Alloués",
    subtitle: "Allocations de métaux physiques et positions de rendement",
    allocations: "Allocations Physiques",
    allocationsDesc: "Vos métaux alloués aux emplacements de coffre",
    stakingPositions: "Positions de Rendement",
    stakingDesc: "Vos positions de rendement actives",
    noAllocations: "Aucune allocation pour le moment",
    noPositions: "Aucune position de rendement pour le moment",
    totalLocked: "Total",
    estValue: "Valeur Est.",
    vault: "Coffre",
    amount: "Montant",
    date: "Date",
    status: "Statut",
    active: "Actif",
    unlocking: "Déverrouillage",
    completed: "Terminé",
    daysLeft: "jours restants",
    allocated: "Alloué",
    close: "Fermer",
    gold: "Or",
    silver: "Argent",
    platinum: "Platine",
    palladium: "Palladium",
    grams: "grammes",
    viewOnChain: "Voir sur la chaîne",
    allocationId: "ID d'allocation",
    custodian: "Dépositaire",
    zurich: "Coffre Zurich",
    istanbul: "Coffre Istanbul",
    london: "Coffre Londres",
    dubai: "Coffre Dubaï",
    staked: "staké",
    months: "mois",
    progress: "Progression",
    reward: "récompense",
    noPositionsHint: "Vous pouvez créer des positions de staking depuis l'onglet Gagner.",
  },
  ar: {
    title: "الأصول المخصصة",
    subtitle: "تخصيصات المعادن الفعلية ومراكز العائد",
    allocations: "التخصيصات الفعلية",
    allocationsDesc: "معادنك المخصصة لمواقع الخزائن",
    stakingPositions: "مراكز العائد",
    stakingDesc: "مراكز العائد النشطة الخاصة بك",
    noAllocations: "لا توجد تخصيصات بعد",
    noPositions: "لا توجد مراكز عائد بعد",
    totalLocked: "الإجمالي",
    estValue: "القيمة المقدرة",
    vault: "الخزنة",
    amount: "المبلغ",
    date: "التاريخ",
    status: "الحالة",
    active: "نشط",
    unlocking: "جاري الفتح",
    completed: "مكتمل",
    daysLeft: "يوم متبقي",
    allocated: "مخصص",
    close: "إغلاق",
    gold: "ذهب",
    silver: "فضة",
    platinum: "بلاتين",
    palladium: "بالاديوم",
    grams: "غرام",
    viewOnChain: "عرض على السلسلة",
    allocationId: "معرف التخصيص",
    custodian: "الحافظ",
    zurich: "خزنة زيورخ",
    istanbul: "خزنة إسطنبول",
    london: "خزنة لندن",
    dubai: "خزنة دبي",
    staked: "مراهن",
    months: "أشهر",
    progress: "التقدم",
    reward: "مكافأة",
    noPositionsHint: "يمكنك إنشاء مراكز ستيكنج من علامة تبويب اكسب.",
  },
  ru: {
    title: "Распределённые Активы",
    subtitle: "Физические распределения металлов и позиции доходности",
    allocations: "Физические Распределения",
    allocationsDesc: "Ваши металлы, распределённые по хранилищам",
    stakingPositions: "Позиции Доходности",
    stakingDesc: "Ваши активные позиции доходности",
    noAllocations: "Распределений пока нет",
    noPositions: "Позиций доходности пока нет",
    totalLocked: "Всего",
    estValue: "Оценочная стоимость",
    vault: "Хранилище",
    amount: "Сумма",
    date: "Дата",
    status: "Статус",
    active: "Активна",
    unlocking: "Разблокировка",
    completed: "Завершена",
    daysLeft: "дней осталось",
    allocated: "Распределено",
    close: "Закрыть",
    gold: "Золото",
    silver: "Серебро",
    platinum: "Платина",
    palladium: "Палладий",
    grams: "грамм",
    viewOnChain: "Посмотреть в сети",
    allocationId: "ID распределения",
    custodian: "Хранитель",
    zurich: "Хранилище Цюрих",
    istanbul: "Хранилище Стамбул",
    london: "Хранилище Лондон",
    dubai: "Хранилище Дубай",
    staked: "в стейкинге",
    months: "месяцев",
    progress: "Прогресс",
    reward: "награда",
    noPositionsHint: "Вы можете создать позиции стейкинга на вкладке Заработок.",
  },
};

const METAL_INFO: Record<string, { nameKey: string; icon: string; color: string }> = {
  AUXG: { nameKey: "gold", icon: "/auxg_icon.png", color: "text-[#BFA181]" },
  AUXS: { nameKey: "silver", icon: "/auxs_icon.png", color: "text-slate-400" },
  AUXPT: { nameKey: "platinum", icon: "/auxpt_icon.png", color: "text-cyan-400" },
  AUXPD: { nameKey: "palladium", icon: "/auxpd_icon.png", color: "text-rose-400" },
};

const CUSTODIAN_MAP: Record<string, string> = {
  "0x1234": "zurich",
  "0x5678": "istanbul",
  "0x9abc": "london",
  "0xdef0": "dubai",
};

export function LockedAssetsModal({
  isOpen,
  onClose,
  metalPrices = { AUXG: 95, AUXS: 1.15, AUXPT: 32, AUXPD: 35 },
}: LockedAssetsModalProps) {
  const [activeTab, setActiveTab] = useState<"allocations" | "staking">("allocations");
  const { lang } = useLanguage();
  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;
  
  const { allocations, allocationsByMetal, totalGrams, isLoading } = useAllocations();
  const { activeStakes, loading: stakingLoading } = useStaking();

  // Calculate staking totals
  const stakingTotalGrams: Record<string, number> = { AUXG: 0, AUXS: 0, AUXPT: 0, AUXPD: 0 };
  activeStakes.forEach((stake) => {
    if (stakingTotalGrams[stake.metalSymbol] !== undefined) {
      stakingTotalGrams[stake.metalSymbol] += stake.amountGrams;
    }
  });

  // Calculate staking value
  const stakingTotalValue = Object.entries(stakingTotalGrams).reduce((sum, [metal, grams]) => {
    const price = metalPrices[metal as keyof typeof metalPrices] || 0;
    return sum + (grams * price);
  }, 0);

  if (!isOpen) return null;

  // Calculate total USD value (allocations + staking)
  const allocationValue = Object.entries(totalGrams || {}).reduce((sum, [metal, grams]) => {
    const price = metalPrices[metal as keyof typeof metalPrices] || 0;
    return sum + ((grams || 0) * price);
  }, 0);
  
  const totalValue = allocationValue + stakingTotalValue;

  const getCustodianName = (custodian: string): string => {
    const key = CUSTODIAN_MAP[custodian.toLowerCase().slice(0, 6)] || "zurich";
    return t(key) || custodian;
  };

  const formatDate = (timestamp: bigint): string => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString(lang === "tr" ? "tr-TR" : lang === "de" ? "de-DE" : lang === "fr" ? "fr-FR" : lang === "ar" ? "ar-SA" : lang === "ru" ? "ru-RU" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-1.5 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-stone-200 dark:border-slate-700 w-full max-w-2xl max-h-[98vh] sm:max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
        {/* Header - Responsive */}
        <div className="p-2.5 sm:p-4 border-b border-stone-200 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-[#BFA181]/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 sm:w-6 sm:h-6 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-lg font-bold text-slate-800 dark:text-white truncate">{t("title")}</h2>
              <p className="text-[10px] sm:text-sm text-slate-500 dark:text-slate-400 truncate hidden sm:block">{t("subtitle")}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0 ml-2"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Summary Card - Responsive */}
        <div className="p-2.5 sm:p-4 border-b border-stone-200 dark:border-slate-800 bg-gradient-to-r from-[#BFA181]/10 to-orange-500/10 dark:from-[#BFA181]/20 dark:to-orange-500/20 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-sm text-slate-600 dark:text-slate-400">{t("totalLocked")}</p>
              <div className="flex items-center gap-1.5 sm:gap-4 mt-1 flex-wrap">
                {/* Allocation totals */}
                {Object.entries(totalGrams || {}).map(([metal, grams]) => (
                  grams > 0 && (
                    <div key={`alloc-${metal}`} className="flex items-center gap-0.5 sm:gap-1">
                      <img src={METAL_INFO[metal]?.icon} alt={metal} className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                      <span className={`font-semibold text-[10px] sm:text-sm ${METAL_INFO[metal]?.color}`}>{grams.toFixed(2)}g</span>
                    </div>
                  )
                ))}
                {/* Staking totals */}
                {Object.entries(stakingTotalGrams).map(([metal, grams]) => (
                  grams > 0 && (
                    <div key={`stake-${metal}`} className="flex items-center gap-0.5 sm:gap-1 px-1 sm:px-2 py-0.5 rounded-full bg-[#2F6F62]/20">
                      <img src={METAL_INFO[metal]?.icon} alt={metal} className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className={`font-semibold text-[#2F6F62] dark:text-[#2F6F62] text-[9px] sm:text-sm`}>{grams.toFixed(2)}g</span>
                      <span className="text-[8px] sm:text-xs text-[#2F6F62] hidden sm:inline">{t("staked")}</span>
                    </div>
                  )
                ))}
              </div>
            </div>
            <div className="text-left sm:text-right flex-shrink-0">
              <p className="text-[9px] sm:text-xs text-slate-500 dark:text-slate-400">{t("estValue")}</p>
              <p className="text-lg sm:text-2xl font-bold text-[#BFA181]">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>

        {/* Tabs - Responsive */}
        <div className="flex border-b border-stone-200 dark:border-slate-800 flex-shrink-0">
          <button
            onClick={() => setActiveTab("allocations")}
            className={`flex-1 px-1.5 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm font-medium transition-colors relative ${
              activeTab === "allocations"
                ? "text-[#BFA181] dark:text-[#BFA181]"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <span className="flex items-center justify-center gap-1 sm:gap-2">
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span className="truncate">{t("allocations")}</span>
            </span>
            {activeTab === "allocations" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#BFA181]"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab("staking")}
            className={`flex-1 px-1.5 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm font-medium transition-colors relative ${
              activeTab === "staking"
                ? "text-[#BFA181] dark:text-[#BFA181]"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <span className="flex items-center justify-center gap-1 sm:gap-2">
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="truncate">{t("stakingPositions")}</span>
              {activeStakes.length > 0 && (
                <span className="px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-xs rounded-full bg-[#2F6F62] text-white ml-0.5">{activeStakes.length}</span>
              )}
            </span>
            {activeTab === "staking" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#BFA181]"></div>
            )}
          </button>
        </div>

        {/* Content - Responsive with scroll */}
        <div className="p-2.5 sm:p-4 overflow-y-auto flex-1 min-h-0">
          {activeTab === "allocations" && (
            <div className="space-y-2 sm:space-y-4">
              <p className="text-[10px] sm:text-sm text-slate-500 dark:text-slate-400">{t("allocationsDesc")}</p>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-6 sm:py-12">
                  <div className="animate-spin rounded-full h-5 w-5 sm:h-8 sm:w-8 border-b-2 border-[#BFA181]"></div>
                </div>
              ) : allocations.length === 0 ? (
                <div className="text-center py-6 sm:py-12">
                  <div className="w-10 h-10 sm:w-16 sm:h-16 mx-auto mb-2 sm:mb-4 rounded-full bg-stone-100 dark:bg-slate-800 flex items-center justify-center">
                    <svg className="w-5 h-5 sm:w-8 sm:h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">{t("noAllocations")}</p>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {allocations.map((allocation) => {
                    const metalInfo = METAL_INFO[allocation.metalSymbol] || { icon: "/auxg_icon.png", color: "text-[#BFA181]" };
                    const grams = Number(allocation.grams);
                    const price = metalPrices[allocation.metalSymbol as keyof typeof metalPrices] || 0;
                    const value = grams * price;

                    return (
                      <div
                        key={`${allocation.metal}-${allocation.id.toString()}`}
                        className="p-2.5 sm:p-4 rounded-lg sm:rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/50 hover:border-[#BFA181]/50 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                            <img src={metalInfo.icon} alt={allocation.metal} className="w-7 h-7 sm:w-10 sm:h-10 flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                                <span className={`font-semibold text-xs sm:text-base ${metalInfo.color}`}>{allocation.metal}</span>
                                <span className="text-[9px] sm:text-xs px-1 sm:px-2 py-0.5 rounded-full bg-[#2F6F62]/20 text-[#2F6F62] dark:text-[#2F6F62]">
                                  {t("allocated")}
                                </span>
                              </div>
                              <div className="text-[10px] sm:text-sm text-slate-500 dark:text-slate-400 truncate">
                                {getCustodianName(allocation.custodian)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-semibold text-slate-800 dark:text-white text-xs sm:text-base">
                              {grams.toFixed(2)}g
                            </div>
                            <div className="text-[10px] sm:text-sm text-slate-500 dark:text-slate-400">
                              ≈ ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-stone-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 text-[9px] sm:text-xs">
                          <div className="flex items-center gap-2 sm:gap-4 text-slate-500 dark:text-slate-400 flex-wrap">
                            <span>{t("allocationId")}: #{allocation.id.toString()}</span>
                            <span className="hidden sm:inline">{t("date")}: {new Date(Number(allocation.timestamp)).toLocaleDateString()}</span>
                          </div>
                          <a
                            href={`https://basescan.org/tx/${allocation.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#BFA181] dark:text-[#BFA181] hover:underline flex items-center gap-1"
                          >
                            {t("viewOnChain")}
                            <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "staking" && (
            <div className="space-y-2 sm:space-y-4">
              <p className="text-[10px] sm:text-sm text-slate-500 dark:text-slate-400">{t("stakingDesc")}</p>
              
              {stakingLoading ? (
                <div className="flex items-center justify-center py-6 sm:py-12">
                  <div className="animate-spin rounded-full h-5 w-5 sm:h-8 sm:w-8 border-b-2 border-[#BFA181]"></div>
                </div>
              ) : activeStakes.length === 0 ? (
                <div className="text-center py-6 sm:py-12">
                  <div className="w-10 h-10 sm:w-16 sm:h-16 mx-auto mb-2 sm:mb-4 rounded-full bg-stone-100 dark:bg-slate-800 flex items-center justify-center">
                    <svg className="w-5 h-5 sm:w-8 sm:h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">{t("noPositions")}</p>
                  <p className="text-[9px] sm:text-xs text-slate-400 dark:text-slate-500 mt-1 sm:mt-2">
                    {t("noPositionsHint")}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {activeStakes.map((stake) => {
                    const metalInfo = METAL_INFO[stake.metalSymbol];
                    const price = metalPrices[stake.metalSymbol as keyof typeof metalPrices] || 0;
                    const value = stake.amountGrams * price;

                    return (
                      <div
                        key={stake.id}
                        className="p-2.5 sm:p-4 rounded-lg sm:rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/50 hover:border-[#2F6F62]/50 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                            <img src={metalInfo?.icon || "/auxg_icon.png"} alt={stake.metalSymbol} className="w-7 h-7 sm:w-10 sm:h-10 flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                                <span className={`font-semibold text-xs sm:text-base ${metalInfo?.color || "text-[#BFA181]"}`}>{stake.metalSymbol}</span>
                                <span className={`text-[9px] sm:text-xs px-1 sm:px-2 py-0.5 rounded-full ${stake.isMatured ? "bg-[#2F6F62]/20 text-[#2F6F62] dark:text-[#2F6F62]" : "bg-blue-500/20 text-blue-600 dark:text-blue-400"}`}>
                                  {stake.isMatured ? t("completed") : t("active")}
                                </span>
                              </div>
                              <div className="text-[10px] sm:text-sm text-slate-500 dark:text-slate-400">
                                {stake.durationMonths} {t("months")} • {stake.apyPercent.toFixed(2)}% APY
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-semibold text-slate-800 dark:text-white text-xs sm:text-base">
                              {stake.amountGrams.toFixed(2)}g
                            </div>
                            <div className="text-[10px] sm:text-sm text-slate-500 dark:text-slate-400">
                              ≈ ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-stone-200 dark:border-slate-700">
                          <div className="flex items-center justify-between text-[9px] sm:text-xs text-slate-500 dark:text-slate-400 mb-1">
                            <span>{t("progress")}</span>
                            <span>{stake.progress.toFixed(1)}%</span>
                          </div>
                          <div className="h-1 sm:h-1.5 bg-stone-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${stake.isMatured ? "bg-[#2F6F62]" : "bg-blue-500"}`}
                              style={{ width: `${Math.min(100, stake.progress)}%` }}
                            />
                          </div>
                          {!stake.isMatured && stake.timeRemaining && (
                            <div className="text-[9px] sm:text-xs text-slate-400 mt-1 text-right">
                              {stake.timeRemaining} {t("daysLeft")}
                            </div>
                          )}
                        </div>

                        <div className="mt-2 sm:mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 text-[9px] sm:text-xs">
                          <div className="flex items-center gap-2 sm:gap-3 text-slate-500 dark:text-slate-400 flex-wrap">
                            <span>Code: {stake.shortCode}</span>
                            <span className="text-[#2F6F62]">+{formatAmount(stake.expectedRewardGrams, stake.metalSymbol)}g {t("reward")}</span>
                          </div>
                          <a
                            href={`https://sepolia.etherscan.io/address/${process.env.NEXT_PUBLIC_STAKING_CONTRACT}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#BFA181] dark:text-[#BFA181] hover:underline flex items-center gap-1"
                          >
                            {t("viewOnChain")}
                            <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer - Responsive */}
        <div className="p-2.5 sm:p-4 border-t border-stone-200 dark:border-slate-800 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2 sm:py-3 rounded-lg sm:rounded-xl bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-medium transition-colors text-xs sm:text-base"
          >
            {t("close")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LockedAssetsModal;
