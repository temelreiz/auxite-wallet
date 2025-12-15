"use client";

import { useState } from "react";
import { useAllocations, FormattedAllocation as Allocation } from "@/hooks/useAllocations";
import { useStaking, FormattedStake } from "@/hooks/useStaking";
import { formatUnits } from "viem";

interface LockedAssetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: "tr" | "en" | "de" | "fr" | "ar" | "ru";
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
    title: "Kilitli Varlıklar",
    subtitle: "Fiziksel metal tahsisleri ve stake pozisyonları",
    allocations: "Fiziksel Tahsisler",
    allocationsDesc: "Kasa lokasyonlarına göre tahsis edilmiş metalleriniz",
    stakingPositions: "Stake Pozisyonları",
    stakingDesc: "Aktif stake pozisyonlarınız",
    noAllocations: "Henüz tahsis bulunmuyor",
    noPositions: "Henüz stake pozisyonu bulunmuyor",
    totalLocked: "Toplam Kilitli",
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
    singapore: "Singapur Kasası",
    london: "Londra Kasası",
    dubai: "Dubai Kasası",
  },
  en: {
    title: "Locked Assets",
    subtitle: "Physical metal allocations and staking positions",
    allocations: "Physical Allocations",
    allocationsDesc: "Your metals allocated to vault locations",
    stakingPositions: "Staking Positions",
    stakingDesc: "Your active staking positions",
    noAllocations: "No allocations yet",
    noPositions: "No staking positions yet",
    totalLocked: "Total Locked",
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
    singapore: "Singapore Vault",
    london: "London Vault",
    dubai: "Dubai Vault",
  },
  de: {
    title: "Gesperrte Vermögenswerte",
    subtitle: "Physische Metallzuweisungen und Staking-Positionen",
    allocations: "Physische Zuweisungen",
    allocationsDesc: "Ihre Metalle, die Tresorstandorten zugewiesen sind",
    stakingPositions: "Staking-Positionen",
    stakingDesc: "Ihre aktiven Staking-Positionen",
    noAllocations: "Noch keine Zuweisungen",
    noPositions: "Noch keine Staking-Positionen",
    totalLocked: "Gesamt Gesperrt",
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
    singapore: "Singapur Tresor",
    london: "London Tresor",
    dubai: "Dubai Tresor",
  },
  fr: {
    title: "Actifs Verrouillés",
    subtitle: "Allocations de métaux physiques et positions de staking",
    allocations: "Allocations Physiques",
    allocationsDesc: "Vos métaux alloués aux emplacements de coffre",
    stakingPositions: "Positions de Staking",
    stakingDesc: "Vos positions de staking actives",
    noAllocations: "Aucune allocation pour le moment",
    noPositions: "Aucune position de staking pour le moment",
    totalLocked: "Total Verrouillé",
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
    singapore: "Coffre Singapour",
    london: "Coffre Londres",
    dubai: "Coffre Dubaï",
  },
  ar: {
    title: "الأصول المقفلة",
    subtitle: "تخصيصات المعادن الفعلية ومراكز التخزين",
    allocations: "التخصيصات الفعلية",
    allocationsDesc: "معادنك المخصصة لمواقع الخزائن",
    stakingPositions: "مراكز التخزين",
    stakingDesc: "مراكز التخزين النشطة الخاصة بك",
    noAllocations: "لا توجد تخصيصات بعد",
    noPositions: "لا توجد مراكز تخزين بعد",
    totalLocked: "إجمالي المقفل",
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
    singapore: "خزنة سنغافورة",
    london: "خزنة لندن",
    dubai: "خزنة دبي",
  },
  ru: {
    title: "Заблокированные Активы",
    subtitle: "Физические распределения металлов и позиции стейкинга",
    allocations: "Физические Распределения",
    allocationsDesc: "Ваши металлы, распределённые по хранилищам",
    stakingPositions: "Позиции Стейкинга",
    stakingDesc: "Ваши активные позиции стейкинга",
    noAllocations: "Распределений пока нет",
    noPositions: "Позиций стейкинга пока нет",
    totalLocked: "Всего Заблокировано",
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
    singapore: "Хранилище Сингапур",
    london: "Хранилище Лондон",
    dubai: "Хранилище Дубай",
  },
};

const METAL_INFO: Record<string, { nameKey: string; icon: string; color: string }> = {
  AUXG: { nameKey: "gold", icon: "/gold-favicon-32x32.png", color: "text-amber-500" },
  AUXS: { nameKey: "silver", icon: "/silver-favicon-32x32.png", color: "text-slate-400" },
  AUXPT: { nameKey: "platinum", icon: "/platinum-favicon-32x32.png", color: "text-cyan-400" },
  AUXPD: { nameKey: "palladium", icon: "/palladium-favicon-32x32.png", color: "text-rose-400" },
};

const CUSTODIAN_MAP: Record<string, string> = {
  "0x1234": "zurich",
  "0x5678": "singapore",
  "0x9abc": "london",
  "0xdef0": "dubai",
};

export function LockedAssetsModal({
  isOpen,
  onClose,
  lang = "en",
  metalPrices = { AUXG: 95, AUXS: 1.15, AUXPT: 32, AUXPD: 35 },
}: LockedAssetsModalProps) {
  const [activeTab, setActiveTab] = useState<"allocations" | "staking">("allocations");
  const t = translations[lang] || translations.en;
  
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
    return t[key] || custodian;
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
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-xl">
        {/* Header */}
        <div className="p-4 border-b border-stone-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">{t.title}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Summary Card */}
        <div className="p-4 border-b border-stone-200 dark:border-slate-800 bg-gradient-to-r from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">{t.totalLocked}</p>
              <div className="flex items-center gap-4 mt-1 flex-wrap">
                {/* Allocation totals */}
                {Object.entries(totalGrams || {}).map(([metal, grams]) => (
                  grams > 0 && (
                    <div key={`alloc-${metal}`} className="flex items-center gap-1">
                      <img src={METAL_INFO[metal]?.icon} alt={metal} className="w-5 h-5" />
                      <span className={`font-semibold ${METAL_INFO[metal]?.color}`}>{grams}g</span>
                    </div>
                  )
                ))}
                {/* Staking totals */}
                {Object.entries(stakingTotalGrams).map(([metal, grams]) => (
                  grams > 0 && (
                    <div key={`stake-${metal}`} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20">
                      <img src={METAL_INFO[metal]?.icon} alt={metal} className="w-4 h-4" />
                      <span className={`font-semibold text-emerald-600 dark:text-emerald-400 text-sm`}>{grams.toFixed(2)}g</span>
                      <span className="text-xs text-emerald-500">staked</span>
                    </div>
                  )
                ))}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 dark:text-slate-400">{t.estValue}</p>
              <p className="text-2xl font-bold text-amber-500">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab("allocations")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === "allocations"
                ? "text-amber-600 dark:text-amber-400"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              {t.allocations}
            </span>
            {activeTab === "allocations" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab("staking")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === "staking"
                ? "text-amber-600 dark:text-amber-400"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t.stakingPositions}
              {activeStakes.length > 0 && (
                <span className="px-1.5 py-0.5 text-xs rounded-full bg-emerald-500 text-white">{activeStakes.length}</span>
              )}
            </span>
            {activeTab === "staking" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500"></div>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-320px)]">
          {activeTab === "allocations" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.allocationsDesc}</p>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
                </div>
              ) : allocations.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-stone-100 dark:bg-slate-800 flex items-center justify-center">
                    <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400">{t.noAllocations}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allocations.map((allocation) => {
                    const metalInfo = METAL_INFO[allocation.metal];
                    const grams = Number(allocation.grams);
                    const price = metalPrices[allocation.metal as keyof typeof metalPrices] || 0;
                    const value = grams * price;

                    return (
                      <div
                        key={`${allocation.metal}-${allocation.id.toString()}`}
                        className="p-4 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/50 hover:border-amber-500/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img src={metalInfo.icon} alt={allocation.metal} className="w-10 h-10" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`font-semibold ${metalInfo.color}`}>{allocation.metal}</span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                                  {t.allocated}
                                </span>
                              </div>
                              <div className="text-sm text-slate-500 dark:text-slate-400">
                                {getCustodianName(allocation.custodian)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-slate-800 dark:text-white">
                              {grams}g
                            </div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">
                              ≈ ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-3 pt-3 border-t border-stone-200 dark:border-slate-700 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
                            <span>{t.allocationId}: #{allocation.id.toString()}</span>
                            <span>{t.date}: {formatDate(allocation.timestamp)}</span>
                          </div>
                          <a
                            href={`https://basescan.org/tx/${allocation.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                          >
                            {t.viewOnChain}
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            <div className="space-y-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.stakingDesc}</p>
              
              {stakingLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
                </div>
              ) : activeStakes.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-stone-100 dark:bg-slate-800 flex items-center justify-center">
                    <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400">{t.noPositions}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                    {lang === "tr" ? "Stake pozisyonlarınızı Biriktir sekmesinden oluşturabilirsiniz." : "You can create staking positions from the Earn tab."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeStakes.map((stake) => {
                    const metalInfo = METAL_INFO[stake.metalSymbol];
                    const price = metalPrices[stake.metalSymbol as keyof typeof metalPrices] || 0;
                    const value = stake.amountGrams * price;

                    return (
                      <div
                        key={stake.id}
                        className="p-4 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/50 hover:border-emerald-500/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img src={metalInfo?.icon || "/gold-favicon-32x32.png"} alt={stake.metalSymbol} className="w-10 h-10" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`font-semibold ${metalInfo?.color || "text-amber-500"}`}>{stake.metalSymbol}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${stake.isMatured ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-blue-500/20 text-blue-600 dark:text-blue-400"}`}>
                                  {stake.isMatured ? t.completed : t.active}
                                </span>
                              </div>
                              <div className="text-sm text-slate-500 dark:text-slate-400">
                                {stake.durationMonths} {lang === "tr" ? "ay" : "months"} • {stake.apyPercent.toFixed(2)}% APY
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-slate-800 dark:text-white">
                              {stake.amountGrams.toFixed(2)}g
                            </div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">
                              ≈ ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="mt-3 pt-3 border-t border-stone-200 dark:border-slate-700">
                          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                            <span>{lang === "tr" ? "İlerleme" : "Progress"}</span>
                            <span>{stake.progress.toFixed(1)}%</span>
                          </div>
                          <div className="h-1.5 bg-stone-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${stake.isMatured ? "bg-emerald-500" : "bg-blue-500"}`}
                              style={{ width: `${Math.min(100, stake.progress)}%` }}
                            />
                          </div>
                          {!stake.isMatured && stake.timeRemaining && (
                            <div className="text-xs text-slate-400 mt-1 text-right">
                              {stake.timeRemaining} {t.daysLeft}
                            </div>
                          )}
                        </div>

                        <div className="mt-3 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                            <span>Code: {stake.shortCode}</span>
                            <span className="text-emerald-500">+{stake.expectedRewardGrams.toFixed(4)}g {lang === "tr" ? "ödül" : "reward"}</span>
                          </div>
                          <a
                            href={`https://sepolia.etherscan.io/address/${process.env.NEXT_PUBLIC_STAKING_CONTRACT}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                          >
                            {t.viewOnChain}
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-medium transition-colors"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LockedAssetsModal;
