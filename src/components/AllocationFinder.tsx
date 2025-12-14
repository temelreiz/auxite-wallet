"use client";

import { useState, useEffect, useMemo } from "react";
import { useAccount } from "wagmi";
import { useAllocations } from "@/hooks/useAllocations";

interface AllocationFinderProps {
  lang?: "tr" | "en" | "de" | "fr" | "ar" | "ru";
}

interface DisplayAllocation {
  id: string;
  metal: string;
  symbol: string;
  grams: number;
  custodian: string;
  timestamp: number;
  serialNumber: string;
}

const metalIcons: Record<string, string> = {
  AUXG: "/gold-favicon-32x32.png",
  AUXS: "/silver-favicon-32x32.png",
  AUXPT: "/platinum-favicon-32x32.png",
  AUXPD: "/palladium-favicon-32x32.png",
};

const metalColors: Record<string, string> = {
  AUXG: "text-amber-600 dark:text-amber-400",
  AUXS: "text-slate-600 dark:text-slate-300",
  AUXPT: "text-blue-600 dark:text-blue-400",
  AUXPD: "text-purple-600 dark:text-purple-400",
};

// 6-Language translations
const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "Varlıklarım Nerede?",
    subtitle: "Smart contract'tan kayıtlı fiziksel metal varlıklarınızı görüntüleyin",
    wallet: "Cüzdan",
    connectWallet: "Varlıklarınızı görmek için cüzdanınızı bağlayın",
    loading: "Contract'tan yükleniyor...",
    noRecords: "Henüz varlık kaydı yok",
    records: "kayıt",
    allocationRecords: "Varlık Kayıtları",
    verified: "Onaylandı",
    howItWorks: "Nasıl Çalışır",
    point1: "Her varlık tahsisi blockchain'de kayıtlıdır",
    point2: "Fiziksel metaller lisanslı vault'larda saklanır",
    point3: "Her kayıt benzersiz bir seri numarasına sahiptir",
    point4: "Veriler doğrudan smart contract'tan okunur",
    gold: "Altın",
    silver: "Gümüş",
    platinum: "Platin",
    palladium: "Paladyum",
  },
  en: {
    title: "Where Are My Assets?",
    subtitle: "View your registered physical metal assets from smart contract",
    wallet: "Wallet",
    connectWallet: "Connect your wallet to view your assets",
    loading: "Loading from contract...",
    noRecords: "No asset records yet",
    records: "records",
    allocationRecords: "Asset Records",
    verified: "Verified",
    howItWorks: "How It Works",
    point1: "Each asset allocation is recorded on blockchain",
    point2: "Physical metals are stored in licensed vaults",
    point3: "Each record has a unique serial number",
    point4: "Data is read directly from smart contract",
    gold: "Gold",
    silver: "Silver",
    platinum: "Platinum",
    palladium: "Palladium",
  },
  de: {
    title: "Wo sind meine Vermögenswerte?",
    subtitle: "Zeigen Sie Ihre registrierten physischen Metallbestände vom Smart Contract an",
    wallet: "Wallet",
    connectWallet: "Verbinden Sie Ihre Wallet, um Ihre Vermögenswerte zu sehen",
    loading: "Wird vom Contract geladen...",
    noRecords: "Noch keine Vermögensaufzeichnungen",
    records: "Einträge",
    allocationRecords: "Vermögensaufzeichnungen",
    verified: "Verifiziert",
    howItWorks: "So funktioniert's",
    point1: "Jede Vermögenszuweisung wird auf der Blockchain aufgezeichnet",
    point2: "Physische Metalle werden in lizenzierten Tresoren gelagert",
    point3: "Jeder Eintrag hat eine eindeutige Seriennummer",
    point4: "Daten werden direkt vom Smart Contract gelesen",
    gold: "Gold",
    silver: "Silber",
    platinum: "Platin",
    palladium: "Palladium",
  },
  fr: {
    title: "Où sont mes actifs?",
    subtitle: "Consultez vos actifs métalliques physiques enregistrés depuis le smart contract",
    wallet: "Portefeuille",
    connectWallet: "Connectez votre portefeuille pour voir vos actifs",
    loading: "Chargement depuis le contrat...",
    noRecords: "Aucun enregistrement d'actif",
    records: "enregistrements",
    allocationRecords: "Enregistrements d'Actifs",
    verified: "Vérifié",
    howItWorks: "Comment ça marche",
    point1: "Chaque allocation d'actif est enregistrée sur la blockchain",
    point2: "Les métaux physiques sont stockés dans des coffres agréés",
    point3: "Chaque enregistrement a un numéro de série unique",
    point4: "Les données sont lues directement depuis le smart contract",
    gold: "Or",
    silver: "Argent",
    platinum: "Platine",
    palladium: "Palladium",
  },
  ar: {
    title: "أين أصولي؟",
    subtitle: "عرض أصولك المعدنية الفعلية المسجلة من العقد الذكي",
    wallet: "المحفظة",
    connectWallet: "اربط محفظتك لعرض أصولك",
    loading: "جاري التحميل من العقد...",
    noRecords: "لا توجد سجلات أصول بعد",
    records: "سجلات",
    allocationRecords: "سجلات الأصول",
    verified: "موثق",
    howItWorks: "كيف يعمل",
    point1: "كل تخصيص أصول مسجل على البلوكشين",
    point2: "المعادن الفعلية مخزنة في خزائن مرخصة",
    point3: "كل سجل له رقم تسلسلي فريد",
    point4: "البيانات تُقرأ مباشرة من العقد الذكي",
    gold: "ذهب",
    silver: "فضة",
    platinum: "بلاتين",
    palladium: "بالاديوم",
  },
  ru: {
    title: "Где мои активы?",
    subtitle: "Просмотр зарегистрированных физических металлических активов из смарт-контракта",
    wallet: "Кошелёк",
    connectWallet: "Подключите кошелёк для просмотра ваших активов",
    loading: "Загрузка из контракта...",
    noRecords: "Записей об активах пока нет",
    records: "записей",
    allocationRecords: "Записи об Активах",
    verified: "Подтверждено",
    howItWorks: "Как это работает",
    point1: "Каждое распределение активов записывается в блокчейн",
    point2: "Физические металлы хранятся в лицензированных хранилищах",
    point3: "Каждая запись имеет уникальный серийный номер",
    point4: "Данные читаются напрямую из смарт-контракта",
    gold: "Золото",
    silver: "Серебро",
    platinum: "Платина",
    palladium: "Палладий",
  },
};

const metalNames: Record<string, Record<string, string>> = {
  AUXG: { tr: "Altın", en: "Gold", de: "Gold", fr: "Or", ar: "ذهب", ru: "Золото" },
  AUXS: { tr: "Gümüş", en: "Silver", de: "Silber", fr: "Argent", ar: "فضة", ru: "Серебро" },
  AUXPT: { tr: "Platin", en: "Platinum", de: "Platin", fr: "Platine", ar: "بلاتين", ru: "Платина" },
  AUXPD: { tr: "Paladyum", en: "Palladium", de: "Palladium", fr: "Palladium", ar: "بالاديوم", ru: "Палладий" },
};

const custodianToLocation: Record<string, { flag: string; city: string }> = {
  "Auxite Custodian": { flag: "🇹🇷", city: "Istanbul" },
  "Auxite Istanbul": { flag: "🇹🇷", city: "Istanbul" },
  "Auxite Switzerland": { flag: "🇨🇭", city: "Zurich" },
  "Auxite Dubai": { flag: "🇦🇪", city: "Dubai" },
  "Auxite Singapore": { flag: "🇸🇬", city: "Singapore" },
  "Auxite London": { flag: "🇬🇧", city: "London" },
};

export function AllocationFinder({ lang = "en" }: AllocationFinderProps) {
  const { address, isConnected } = useAccount();
  const { allocations, allocationsByMetal, totalGrams, isLoading } = useAllocations();
  const [mounted, setMounted] = useState(false);
  const [selectedMetal, setSelectedMetal] = useState<string>("all");

  const t = translations[lang] || translations.en;

  useEffect(() => {
    setMounted(true);
  }, []);

  const displayAllocations: DisplayAllocation[] = useMemo(() => {
    return allocations.map((alloc) => {
      const timestamp = Number(alloc.timestamp);
      const date = new Date(timestamp * 1000);
      const year = date.getFullYear();
      const serialNum = String(alloc.id).padStart(6, "0");
      
      return {
        id: `${alloc.metal}-${alloc.id}`,
        metal: alloc.metal,
        symbol: alloc.metal,
        grams: Number(alloc.grams),
        custodian: alloc.custodian,
        timestamp,
        serialNumber: `${alloc.metal}-${year}-${serialNum}`,
      };
    });
  }, [allocations]);

  const filteredAllocations = useMemo(() => {
    if (selectedMetal === "all") return displayAllocations;
    return displayAllocations.filter((a) => a.metal === selectedMetal);
  }, [displayAllocations, selectedMetal]);

  const totals = useMemo(() => {
    const total = { grams: 0, count: 0 };
    filteredAllocations.forEach((a) => {
      total.grams += a.grams;
      total.count += 1;
    });
    return total;
  }, [filteredAllocations]);

  if (!mounted) return null;

  return (
    <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 shadow-sm dark:shadow-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            📍 {t.title}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {t.subtitle}
          </p>
        </div>
        {isConnected && address && (
          <div className="text-right">
            <div className="text-xs text-slate-500">{t.wallet}</div>
            <div className="text-sm font-mono text-slate-700 dark:text-slate-300">
              {address.slice(0, 6)}...{address.slice(-4)}
            </div>
          </div>
        )}
      </div>

      {!isConnected ? (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          {t.connectWallet}
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          <span className="ml-3 text-slate-500 dark:text-slate-400">
            {t.loading}
          </span>
        </div>
      ) : (
        <>
          {/* Metal Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {(["AUXG", "AUXS", "AUXPT", "AUXPD"] as const).map((metal) => (
              <button
                key={metal}
                onClick={() => setSelectedMetal(selectedMetal === metal ? "all" : metal)}
                className={`p-4 rounded-lg border transition-colors ${
                  selectedMetal === metal
                    ? "bg-stone-100 dark:bg-slate-800 border-emerald-500"
                    : "bg-stone-50 dark:bg-slate-800/30 border-stone-200 dark:border-slate-700 hover:border-stone-300 dark:hover:border-slate-600"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <img src={metalIcons[metal]} alt={metal} className="w-5 h-5" />
                  <div className="text-xs text-slate-600 dark:text-slate-400">{metalNames[metal][lang]}</div>
                </div>
                <div className={`text-lg font-bold ${metalColors[metal]}`}>
                  {totalGrams[metal].toLocaleString()} g
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {allocationsByMetal[metal].length} {t.records}
                </div>
              </button>
            ))}
          </div>

          {/* Allocation List */}
          {filteredAllocations.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              {t.noRecords}
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {t.allocationRecords}
                </h3>
                <span className="px-2 py-1 rounded bg-stone-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs">
                  {totals.count} {t.records} • {totals.grams.toLocaleString()}g
                </span>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {filteredAllocations.map((alloc) => {
                  const location = custodianToLocation[alloc.custodian] || { flag: "🏦", city: alloc.custodian };
                  const date = new Date(alloc.timestamp * 1000);
                  const localeMap: Record<string, string> = {
                    tr: "tr-TR", en: "en-US", de: "de-DE", fr: "fr-FR", ar: "ar-SA", ru: "ru-RU"
                  };
                  
                  return (
                    <div
                      key={alloc.id}
                      className="p-4 rounded-lg bg-stone-50 dark:bg-slate-800/50 border border-stone-200 dark:border-slate-700 hover:border-stone-300 dark:hover:border-slate-600 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img src={metalIcons[alloc.metal]} alt={alloc.metal} className="w-8 h-8" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold ${metalColors[alloc.metal]}`}>
                                {alloc.grams.toLocaleString()}g {alloc.metal}
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                                {t.verified}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                              {alloc.serialNumber}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-sm text-slate-700 dark:text-slate-300">
                            <span>{location.flag}</span>
                            <span>{location.city}</span>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {date.toLocaleDateString(localeMap[lang] || "en-US")}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Info Footer */}
          <div className="mt-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
              ℹ️ {t.howItWorks}
            </div>
            <ul className="text-xs text-blue-600 dark:text-blue-200 space-y-1">
              <li>• {t.point1}</li>
              <li>• {t.point2}</li>
              <li>• {t.point3}</li>
              <li>• {t.point4}</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

export default AllocationFinder;
