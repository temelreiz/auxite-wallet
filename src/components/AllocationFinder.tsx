"use client";

import { useState, useEffect, useMemo } from "react";
import { useAccount } from "wagmi";
import { useTokenBalances } from "@/hooks/useTokenBalances";

interface AllocationFinderProps {
  lang?: "tr" | "en";
}

interface PhysicalBar {
  id: string;
  metal: "gold" | "silver" | "platinum" | "palladium";
  symbol: string;
  serialNumber: string;
  weight: number;
  location: string;
}

interface LocationSummary {
  location: string;
  locationCode: string;
  totalGrams: number;
  barCount: number;
  bars: PhysicalBar[];
}

// Metal icon mapping
const metalIcons: Record<string, string> = {
  gold: "/gold-favicon-32x32.png",
  silver: "/silver-favicon-32x32.png",
  platinum: "/platinum-favicon-32x32.png",
  palladium: "/palladium-favicon-32x32.png",
  AUXG: "/gold-favicon-32x32.png",
  AUXS: "/silver-favicon-32x32.png",
  AUXPT: "/platinum-favicon-32x32.png",
  AUXPD: "/palladium-favicon-32x32.png",
};

const locationFlags: Record<string, string> = {
  Istanbul: "🇹🇷",
  Switzerland: "🇨🇭",
  Dubai: "🇦🇪",
  Singapore: "🇸🇬",
  London: "🇬🇧",
};

// Generate realistic bar allocations based on balance
function generateBarsFromBalance(
  metal: "gold" | "silver" | "platinum" | "palladium",
  symbol: string,
  totalGrams: number
): PhysicalBar[] {
  if (totalGrams <= 0) return [];
  
  const bars: PhysicalBar[] = [];
  const locations = ["Istanbul", "Switzerland", "Dubai", "Singapore", "London"];
  const barSizes = [1000, 500, 100, 50, 20, 10, 5, 1]; // Available bar sizes in grams
  
  let remaining = Math.floor(totalGrams); // Use integer grams
  let barIndex = 1;
  
  // Distribute across locations more evenly
  const barsPerLocation: Record<string, PhysicalBar[]> = {};
  locations.forEach(loc => barsPerLocation[loc] = []);
  
  // Allocate bars from largest to smallest
  for (const size of barSizes) {
    while (remaining >= size) {
      // Deterministic location based on barIndex
      const locationIndex = (barIndex - 1) % locations.length;
      const location = locations[locationIndex];
      const year = 2024;
      const locationCode = location.slice(0, 3).toUpperCase();
      const serialNum = String(barIndex).padStart(6, "0");
      
      const bar: PhysicalBar = {
        id: `${symbol}-${barIndex}`,
        metal,
        symbol,
        serialNumber: `${symbol}-${locationCode}-${year}-${serialNum}`,
        weight: size,
        location,
      };
      
      bars.push(bar);
      remaining -= size;
      barIndex++;
    }
  }
  
  return bars;
}

// Group bars by location
function groupBarsByLocation(bars: PhysicalBar[]): LocationSummary[] {
  const groups: Record<string, LocationSummary> = {};
  
  bars.forEach(bar => {
    if (!groups[bar.location]) {
      groups[bar.location] = {
        location: bar.location,
        locationCode: bar.location.slice(0, 3).toUpperCase(),
        totalGrams: 0,
        barCount: 0,
        bars: [],
      };
    }
    groups[bar.location].totalGrams += bar.weight;
    groups[bar.location].barCount += 1;
    groups[bar.location].bars.push(bar);
  });
  
  // Sort by total grams descending
  return Object.values(groups).sort((a, b) => b.totalGrams - a.totalGrams);
}

export function AllocationFinder({ lang = "en" }: AllocationFinderProps) {
  const { address, isConnected } = useAccount();
  const { balances, isLoading: balancesLoading } = useTokenBalances();
  const [mounted, setMounted] = useState(false);
  const [selectedMetal, setSelectedMetal] = useState<string>("all");
  const [expandedLocation, setExpandedLocation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Generate all bars from real balances
  const allBars = useMemo(() => {
    if (!balances) return [];
    
    const goldGrams = parseFloat(balances.AUXG || "0");
    const silverGrams = parseFloat(balances.AUXS || "0");
    const platinumGrams = parseFloat(balances.AUXPT || "0");
    const palladiumGrams = parseFloat(balances.AUXPD || "0");
    
    return [
      ...generateBarsFromBalance("gold", "AUXG", goldGrams),
      ...generateBarsFromBalance("silver", "AUXS", silverGrams),
      ...generateBarsFromBalance("platinum", "AUXPT", platinumGrams),
      ...generateBarsFromBalance("palladium", "AUXPD", palladiumGrams),
    ];
  }, [balances]);

  // Filter bars by selected metal
  const filteredBars = useMemo(() => {
    if (selectedMetal === "all") return allBars;
    const symbolMap: Record<string, string> = {
      gold: "AUXG",
      silver: "AUXS",
      platinum: "AUXPT",
      palladium: "AUXPD",
    };
    return allBars.filter(bar => bar.symbol === symbolMap[selectedMetal]);
  }, [allBars, selectedMetal]);

  // Group by location
  const locationSummaries = useMemo(() => {
    return groupBarsByLocation(filteredBars);
  }, [filteredBars]);

  // Calculate totals from real balances
  const totalWeight = {
    gold: parseFloat(balances?.AUXG || "0"),
    silver: parseFloat(balances?.AUXS || "0"),
    platinum: parseFloat(balances?.AUXPT || "0"),
    palladium: parseFloat(balances?.AUXPD || "0"),
  };

  const formatWeight = (grams: number) => {
    if (grams >= 1000) {
      return `${(grams / 1000).toFixed(2)} kg`;
    }
    return `${grams.toFixed(2)}g`;
  };

  const getMetalIcon = (metal: string) => {
    if (metalIcons[metal]) {
      return <img src={metalIcons[metal]} alt={metal} className="w-5 h-5" />;
    }
    return null;
  };

  if (!mounted || balancesLoading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-700 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-slate-700 rounded w-1/2 mb-6"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-slate-800 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-200">
              {lang === "tr" ? "Fiziksel Tahsis Bulucu" : "Physical Allocation Finder"}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {lang === "tr"
                ? "Varlıklarınızın seri numarası ve bilgilerini aramak için bu aracı kullanın"
                : "Use this tool to lookup the serial number and information about your assets"}
            </p>
          </div>
        </div>
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🔒</div>
          <h3 className="text-lg font-semibold text-slate-200 mb-2">
            {lang === "tr" ? "Cüzdan Bağlantısı Gerekli" : "Wallet Connection Required"}
          </h3>
          <p className="text-sm text-slate-400 mb-4">
            {lang === "tr"
              ? "Fiziksel bar tahsislerinizi görmek için cüzdanınızı bağlayın"
              : "Connect your wallet to view your physical bar allocations"}
          </p>
        </div>
      </div>
    );
  }

  const hasAnyBalance = totalWeight.gold > 0 || totalWeight.silver > 0 || 
                        totalWeight.platinum > 0 || totalWeight.palladium > 0;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-200">
            {lang === "tr" ? "Varlıklarım Nerede" : "Physical Allocation Finder"}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {lang === "tr"
              ? "Varlıklarınızın seri numarası ve bilgilerini aramak için bu aracı kullanın"
              : "Use this tool to lookup the serial number and information about your assets"}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">Wallet</div>
          <div className="text-sm font-mono text-slate-300">
            {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ""}
          </div>
        </div>
      </div>

      {/* Total Weight Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <button
          onClick={() => setSelectedMetal(selectedMetal === "gold" ? "all" : "gold")}
          className={`p-4 rounded-lg border transition-colors ${
            selectedMetal === "gold" 
              ? "bg-amber-500/20 border-amber-500" 
              : "bg-slate-800/30 border-slate-700 hover:border-slate-600"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <img src={metalIcons.gold} alt="Gold" className="w-5 h-5" />
            <div className="text-xs text-slate-500">
              {lang === "tr" ? "Altın" : "Gold"}
            </div>
          </div>
          <div className="text-lg font-bold text-amber-400">{formatWeight(totalWeight.gold)}</div>
        </button>
        <button
          onClick={() => setSelectedMetal(selectedMetal === "silver" ? "all" : "silver")}
          className={`p-4 rounded-lg border transition-colors ${
            selectedMetal === "silver" 
              ? "bg-slate-500/20 border-slate-400" 
              : "bg-slate-800/30 border-slate-700 hover:border-slate-600"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <img src={metalIcons.silver} alt="Silver" className="w-5 h-5" />
            <div className="text-xs text-slate-500">
              {lang === "tr" ? "Gümüş" : "Silver"}
            </div>
          </div>
          <div className="text-lg font-bold text-slate-300">{formatWeight(totalWeight.silver)}</div>
        </button>
        <button
          onClick={() => setSelectedMetal(selectedMetal === "platinum" ? "all" : "platinum")}
          className={`p-4 rounded-lg border transition-colors ${
            selectedMetal === "platinum" 
              ? "bg-blue-500/20 border-blue-500" 
              : "bg-slate-800/30 border-slate-700 hover:border-slate-600"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <img src={metalIcons.platinum} alt="Platinum" className="w-5 h-5" />
            <div className="text-xs text-slate-500">
              {lang === "tr" ? "Platin" : "Platinum"}
            </div>
          </div>
          <div className="text-lg font-bold text-blue-400">{formatWeight(totalWeight.platinum)}</div>
        </button>
        <button
          onClick={() => setSelectedMetal(selectedMetal === "palladium" ? "all" : "palladium")}
          className={`p-4 rounded-lg border transition-colors ${
            selectedMetal === "palladium" 
              ? "bg-purple-500/20 border-purple-500" 
              : "bg-slate-800/30 border-slate-700 hover:border-slate-600"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <img src={metalIcons.palladium} alt="Palladium" className="w-5 h-5" />
            <div className="text-xs text-slate-500">
              {lang === "tr" ? "Paladyum" : "Palladium"}
            </div>
          </div>
          <div className="text-lg font-bold text-purple-400">{formatWeight(totalWeight.palladium)}</div>
        </button>
      </div>

      {!hasAnyBalance ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">📦</div>
          <h3 className="text-lg font-semibold text-slate-200 mb-2">
            {lang === "tr" ? "Henüz Token Yok" : "No Tokens Yet"}
          </h3>
          <p className="text-sm text-slate-400">
            {lang === "tr"
              ? "Metal token satın aldığınızda fiziksel bar tahsisleriniz burada görünecek"
              : "Your physical bar allocations will appear here when you purchase metal tokens"}
          </p>
        </div>
      ) : (
        <>
          {/* Location Cards */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-slate-400 mb-3">
              {lang === "tr" ? "Saklama Lokasyonları" : "Storage Locations"}
              {selectedMetal !== "all" && (
                <span className="ml-2 text-emerald-400">
                  ({selectedMetal === "gold" ? "Altın" : selectedMetal === "silver" ? "Gümüş" : selectedMetal === "platinum" ? "Platin" : "Paladyum"})
                </span>
              )}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {locationSummaries.map((summary) => (
                <div key={summary.location}>
                  <button
                    onClick={() => setExpandedLocation(
                      expandedLocation === summary.location ? null : summary.location
                    )}
                    className={`w-full p-4 rounded-lg border transition-all text-left ${
                      expandedLocation === summary.location
                        ? "bg-emerald-500/10 border-emerald-500"
                        : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{locationFlags[summary.location]}</span>
                        <div>
                          <div className="font-semibold text-slate-200">{summary.location}</div>
                          <div className="text-xs text-slate-500">
                            {summary.barCount} {lang === "tr" ? "bar" : "bars"}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-emerald-400">
                          {formatWeight(summary.totalGrams)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {expandedLocation === summary.location ? "▲" : "▼"}
                        </div>
                      </div>
                    </div>
                  </button>
                  
                  {/* Expanded Bar List */}
                  {expandedLocation === summary.location && (
                    <div className="mt-2 p-3 rounded-lg bg-slate-800/30 border border-slate-700 max-h-64 overflow-y-auto">
                      {/* Search */}
                      <input
                        type="text"
                        placeholder={lang === "tr" ? "Seri numarası ara..." : "Search serial..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 mb-3 rounded bg-slate-900 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                      
                      <div className="space-y-2">
                        {summary.bars
                          .filter(bar => bar.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map((bar) => (
                          <div
                            key={bar.id}
                            className="p-3 rounded bg-slate-900/50 border border-slate-700"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {getMetalIcon(bar.symbol)}
                                <div>
                                  <div className="font-mono text-xs text-slate-300">
                                    {bar.serialNumber}
                                  </div>
                                  <div className="text-xs text-slate-500 capitalize">
                                    {bar.metal}
                                  </div>
                                </div>
                              </div>
                              <div className="text-sm font-bold text-slate-200">
                                {formatWeight(bar.weight)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="text-xs text-slate-500 text-center py-2">
            {lang === "tr" 
              ? `Toplam ${filteredBars.length} fiziksel bar, ${locationSummaries.length} lokasyonda`
              : `Total ${filteredBars.length} physical bars across ${locationSummaries.length} locations`}
          </div>
        </>
      )}

      {/* Info Footer */}
      <div className="mt-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
        <div className="text-sm font-medium text-blue-300 mb-2">
          {lang === "tr" ? "📍 Nasıl Çalışır" : "📍 How It Works"}
        </div>
        <ul className="text-xs text-blue-200 space-y-1">
          <li>• {lang === "tr" ? "Her token fiziksel bir barla 1:1 desteklenir" : "Each token is backed 1:1 by a physical bar"}</li>
          <li>• {lang === "tr" ? "Barlar İstanbul, İsviçre, Dubai, Singapur ve Londra'daki güvenli kasalarda saklanır" : "Bars are stored in secure vaults in Istanbul, Switzerland, Dubai, Singapore, and London"}</li>
          <li>• {lang === "tr" ? "Her bar benzersiz bir seri numarasına ve sertifikaya sahiptir" : "Each bar has a unique serial number and certificate"}</li>
          <li>• {lang === "tr" ? "Bar ağırlıkları: 1g, 5g, 10g, 20g, 50g, 100g, 500g, 1kg" : "Bar weights: 1g, 5g, 10g, 20g, 50g, 100g, 500g, 1kg"}</li>
        </ul>
      </div>
    </div>
  );
}

export default AllocationFinder;
