"use client";

import { useState, useEffect, useMemo } from "react";
import { useAccount } from "wagmi";
import { useAllocations } from "@/hooks/useAllocations";

interface AllocationFinderProps {
  lang?: "tr" | "en";
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

// Metal icon mapping
const metalIcons: Record<string, string> = {
  AUXG: "/gold-favicon-32x32.png",
  AUXS: "/silver-favicon-32x32.png",
  AUXPT: "/platinum-favicon-32x32.png",
  AUXPD: "/palladium-favicon-32x32.png",
};

const metalNames: Record<string, { en: string; tr: string }> = {
  AUXG: { en: "Gold", tr: "Altın" },
  AUXS: { en: "Silver", tr: "Gümüş" },
  AUXPT: { en: "Platinum", tr: "Platin" },
  AUXPD: { en: "Palladium", tr: "Paladyum" },
};

const metalColors: Record<string, string> = {
  AUXG: "text-amber-400",
  AUXS: "text-slate-300",
  AUXPT: "text-blue-400",
  AUXPD: "text-purple-400",
};

// Custodian'a göre location mapping
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
  const [expandedAllocation, setExpandedAllocation] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Contract'tan gelen allocation'ları display formatına çevir
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

  // Metal'e göre filtrele
  const filteredAllocations = useMemo(() => {
    if (selectedMetal === "all") return displayAllocations;
    return displayAllocations.filter((a) => a.metal === selectedMetal);
  }, [displayAllocations, selectedMetal]);

  // Toplam değerleri hesapla
  const totals = useMemo(() => {
    const total = {
      grams: 0,
      count: 0,
    };
    
    filteredAllocations.forEach((a) => {
      total.grams += a.grams;
      total.count += 1;
    });
    
    return total;
  }, [filteredAllocations]);

  if (!mounted) return null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-200">
            {lang === "tr" ? "Fiziksel Allocation Bulucu" : "Physical Allocation Finder"}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {lang === "tr" 
              ? "Smart contract'tan kayıtlı varlıklarınızı görüntüleyin" 
              : "View your registered assets from smart contract"}
          </p>
        </div>
        {isConnected && address && (
          <div className="text-right">
            <div className="text-xs text-slate-500">{lang === "tr" ? "Cüzdan" : "Wallet"}</div>
            <div className="text-sm font-mono text-slate-300">
              {address.slice(0, 6)}...{address.slice(-4)}
            </div>
          </div>
        )}
      </div>

      {!isConnected ? (
        <div className="text-center py-12 text-slate-400">
          {lang === "tr" 
            ? "Allocation'larınızı görmek için cüzdanınızı bağlayın" 
            : "Connect your wallet to view your allocations"}
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          <span className="ml-3 text-slate-400">
            {lang === "tr" ? "Contract'tan yükleniyor..." : "Loading from contract..."}
          </span>
        </div>
      ) : (
        <>
          {/* Metal Özeti */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {(["AUXG", "AUXS", "AUXPT", "AUXPD"] as const).map((metal) => (
              <button
                key={metal}
                onClick={() => setSelectedMetal(selectedMetal === metal ? "all" : metal)}
                className={`p-4 rounded-lg border transition-colors ${
                  selectedMetal === metal
                    ? "bg-slate-800 border-emerald-500"
                    : "bg-slate-800/30 border-slate-700 hover:border-slate-600"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <img src={metalIcons[metal]} alt={metal} className="w-5 h-5" />
                  <div className="text-xs text-slate-500">{metalNames[metal][lang]}</div>
                </div>
                <div className={`text-lg font-bold ${metalColors[metal]}`}>
                  {totalGrams[metal].toLocaleString()} g
                </div>
                <div className="text-xs text-slate-500">
                  {allocationsByMetal[metal].length} {lang === "tr" ? "kayıt" : "records"}
                </div>
              </button>
            ))}
          </div>

          {/* Allocation Listesi */}
          {filteredAllocations.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              {lang === "tr" 
                ? "Henüz allocation kaydı yok" 
                : "No allocation records yet"}
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-400">
                  {lang === "tr" ? "Allocation Kayıtları" : "Allocation Records"}
                </h3>
                <span className="px-2 py-1 rounded bg-slate-700 text-slate-300 text-xs">
                  {totals.count} {lang === "tr" ? "kayıt" : "records"} • {totals.grams.toLocaleString()}g
                </span>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {filteredAllocations.map((alloc) => {
                  const location = custodianToLocation[alloc.custodian] || { flag: "🏦", city: alloc.custodian };
                  const date = new Date(alloc.timestamp * 1000);
                  
                  return (
                    <div
                      key={alloc.id}
                      className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img src={metalIcons[alloc.metal]} alt={alloc.metal} className="w-8 h-8" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold ${metalColors[alloc.metal]}`}>
                                {alloc.grams.toLocaleString()}g {alloc.metal}
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                                {lang === "tr" ? "Onaylandı" : "Verified"}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 mt-1 font-mono">
                              {alloc.serialNumber}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-sm text-slate-300">
                            <span>{location.flag}</span>
                            <span>{location.city}</span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {date.toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US")}
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
            <div className="text-sm font-medium text-blue-300 mb-2">
              {lang === "tr" ? "📍 Nasıl Çalışır" : "📍 How It Works"}
            </div>
            <ul className="text-xs text-blue-200 space-y-1">
              <li>• {lang === "tr" ? "Her allocation blockchain'de kayıtlıdır" : "Each allocation is recorded on blockchain"}</li>
              <li>• {lang === "tr" ? "Fiziksel metaller lisanslı vault'larda saklanır" : "Physical metals are stored in licensed vaults"}</li>
              <li>• {lang === "tr" ? "Her kayıt benzersiz bir seri numarasına sahiptir" : "Each record has a unique serial number"}</li>
              <li>• {lang === "tr" ? "Veriler doğrudan smart contract'tan okunur" : "Data is read directly from smart contract"}</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

export default AllocationFinder;
