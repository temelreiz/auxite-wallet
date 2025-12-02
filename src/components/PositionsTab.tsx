"use client";

import { useState, useEffect } from "react";
import { useLeasingPositions } from "@/hooks/useLeasingPositions";
import { useLeasing } from "@/hooks/useLeasing";
import { LEASING_CONTRACTS, METAL_TOKENS } from "@/contracts/leasingContracts";

interface PositionsTabProps {
  lang: "tr" | "en";
}

// Circular Progress Component
function CircularProgress({ 
  percentage, 
  size = 60, 
  strokeWidth = 4,
  color = "emerald"
}: { 
  percentage: number; 
  size?: number; 
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const colorClasses: Record<string, string> = {
    emerald: "stroke-emerald-400",
    amber: "stroke-amber-400",
    blue: "stroke-blue-400",
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-slate-800"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${colorClasses[color]} transition-all duration-1000 ease-out`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-slate-200">{Math.round(percentage)}%</span>
      </div>
    </div>
  );
}

// Linear Progress Bar
function ProgressBar({ 
  percentage, 
  color = "emerald",
  animated = true
}: { 
  percentage: number; 
  color?: string;
  animated?: boolean;
}) {
  const [width, setWidth] = useState(0);
  
  useEffect(() => {
    if (animated) {
      setTimeout(() => setWidth(percentage), 100);
    } else {
      setWidth(percentage);
    }
  }, [percentage, animated]);

  const gradients: Record<string, string> = {
    emerald: "from-emerald-500 to-emerald-400",
    amber: "from-amber-500 to-amber-400",
    blue: "from-blue-500 to-blue-400",
    red: "from-red-500 to-red-400",
  };

  return (
    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
      <div 
        className={`h-full bg-gradient-to-r ${gradients[color]} rounded-full transition-all duration-1000 ease-out`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

// Position Card Component
function PositionCard({
  position,
  onWithdraw,
  isWithdrawing,
  lang
}: {
  position: any;
  onWithdraw: () => void;
  isWithdrawing: boolean;
  lang: "tr" | "en";
}) {
  const unlockDate = new Date(position.endTime * 1000);
  const startDate = new Date((position.endTime - position.lockPeriod) * 1000);
  const now = new Date();
  
  const totalDays = position.lockPeriod / 86400; // seconds to days
  const elapsedDays = Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const progressPercentage = Math.min(100, (elapsedDays / totalDays) * 100);
  
  const isUnlocked = position.isUnlocked;
  const isWithdrawSuccess = position.leasing.isWithdrawSuccess;
  
  // Calculate estimated earnings
  const amount = parseFloat(position.amount);
  const apy = position.apy || 4; // Default 4% APY if not provided
  const estimatedEarnings = (amount * apy / 100) * (totalDays / 365);

  const metalColors: Record<string, { bg: string; border: string; text: string }> = {
    AUXG: { bg: "from-amber-500/10", border: "border-amber-500/30", text: "text-amber-400" },
    AUXS: { bg: "from-slate-400/10", border: "border-slate-400/30", text: "text-slate-300" },
    AUXPT: { bg: "from-cyan-400/10", border: "border-cyan-400/30", text: "text-cyan-400" },
    AUXPD: { bg: "from-rose-400/10", border: "border-rose-400/30", text: "text-rose-400" },
  };

  const colors = metalColors[position.metal] || metalColors.AUXG;

  return (
    <div className={`rounded-xl border ${isUnlocked ? 'border-emerald-500/50' : 'border-slate-800'} bg-gradient-to-br ${colors.bg} to-slate-900/50 p-6 transition-all hover:border-slate-700`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img src={position.icon} alt={position.metal} className="w-12 h-12" />
            {isUnlocked && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>
          <div>
            <div className="font-semibold text-slate-200 text-lg">{position.metal}</div>
            <div className="text-xs text-slate-500">
              {lang === "tr" ? "Pozisyon" : "Position"} #{position.index}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-emerald-400">
            {amount.toFixed(2)}g
          </div>
          <div className="text-xs text-slate-500">
            {lang === "tr" ? "Tahsis Edilmiş" : "Allocated"}
          </div>
        </div>
      </div>

      {/* Progress Section */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-500">
            {lang === "tr" ? "İlerleme" : "Progress"}
          </span>
          <span className={`text-xs font-medium ${isUnlocked ? 'text-emerald-400' : 'text-slate-400'}`}>
            {isUnlocked ? (lang === "tr" ? "Tamamlandı" : "Completed") : `${position.daysRemaining} ${lang === "tr" ? "gün kaldı" : "days left"}`}
          </span>
        </div>
        <ProgressBar 
          percentage={progressPercentage} 
          color={isUnlocked ? "emerald" : "amber"}
        />
        <div className="flex justify-between mt-2 text-xs text-slate-500">
          <span>{startDate.toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US", { month: 'short', day: 'numeric' })}</span>
          <span>{unlockDate.toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US", { month: 'short', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="px-3 py-2 rounded-lg bg-slate-800/50">
          <div className="text-xs text-slate-500">{lang === "tr" ? "Süre" : "Period"}</div>
          <div className="text-sm font-medium text-slate-200">{Math.round(totalDays)} {lang === "tr" ? "gün" : "days"}</div>
        </div>
        <div className="px-3 py-2 rounded-lg bg-slate-800/50">
          <div className="text-xs text-slate-500">APY</div>
          <div className="text-sm font-medium text-emerald-400">{apy}%</div>
        </div>
        <div className="px-3 py-2 rounded-lg bg-slate-800/50">
          <div className="text-xs text-slate-500">{lang === "tr" ? "Kazanç" : "Earnings"}</div>
          <div className="text-sm font-medium text-amber-400">+{estimatedEarnings.toFixed(3)}g</div>
        </div>
      </div>

      {/* Status Badge */}
      <div className={`flex items-center justify-between px-4 py-3 rounded-lg mb-4 ${
        isUnlocked 
          ? 'bg-emerald-500/10 border border-emerald-500/30' 
          : 'bg-amber-500/10 border border-amber-500/30'
      }`}>
        <div className="flex items-center gap-2">
          {isUnlocked ? (
            <>
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium text-emerald-400">
                {lang === "tr" ? "Çekime Hazır" : "Ready to Withdraw"}
              </span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-sm font-medium text-amber-400">
                {lang === "tr" ? "Kilitli" : "Locked"}
              </span>
            </>
          )}
        </div>
        <span className="text-xs text-slate-500">
          {unlockDate.toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US")}
        </span>
      </div>

      {/* Success Message */}
      {isWithdrawSuccess && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-emerald-300">
                {lang === "tr" ? "Çekim Başarılı!" : "Withdrawal Successful!"}
              </div>
              <div className="text-xs text-emerald-400/70">
                {amount.toFixed(2)}g + {estimatedEarnings.toFixed(3)}g {lang === "tr" ? "kazanç" : "earnings"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={onWithdraw}
        disabled={!isUnlocked || isWithdrawing || isWithdrawSuccess}
        className={`w-full px-4 py-3.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
          isUnlocked && !isWithdrawSuccess
            ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-lg shadow-emerald-500/20"
            : "bg-slate-800 text-slate-500 cursor-not-allowed"
        }`}
      >
        {isWithdrawing ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {lang === "tr" ? "Çekiliyor..." : "Withdrawing..."}
          </>
        ) : isWithdrawSuccess ? (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {lang === "tr" ? "Çekildi" : "Withdrawn"}
          </>
        ) : isUnlocked ? (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {lang === "tr" ? "Geri Çek" : "Withdraw"}
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {position.daysRemaining} {lang === "tr" ? "gün sonra" : "days remaining"}
          </>
        )}
      </button>
    </div>
  );
}

export function PositionsTab({ lang }: PositionsTabProps) {
  const [withdrawingPosition, setWithdrawingPosition] = useState<string | null>(null);

  // Read positions from all metals (90 days contract for now)
  const auxgPositions = useLeasingPositions({
    offerAddress: LEASING_CONTRACTS.AUXG["90"],
    metalSymbol: "AUXG",
  });

  const auxsPositions = useLeasingPositions({
    offerAddress: LEASING_CONTRACTS.AUXS["90"],
    metalSymbol: "AUXS",
  });

  const auxptPositions = useLeasingPositions({
    offerAddress: LEASING_CONTRACTS.AUXPT["90"],
    metalSymbol: "AUXPT",
  });

  const auxpdPositions = useLeasingPositions({
    offerAddress: LEASING_CONTRACTS.AUXPD["90"],
    metalSymbol: "AUXPD",
  });

  // Leasing hooks for withdraw
  const auxgLeasing = useLeasing({
    offerAddress: LEASING_CONTRACTS.AUXG["90"],
    metalTokenAddress: METAL_TOKENS.AUXG,
    metalSymbol: "AUXG",
  });

  const auxsLeasing = useLeasing({
    offerAddress: LEASING_CONTRACTS.AUXS["90"],
    metalTokenAddress: METAL_TOKENS.AUXS,
    metalSymbol: "AUXS",
  });

  const auxptLeasing = useLeasing({
    offerAddress: LEASING_CONTRACTS.AUXPT["90"],
    metalTokenAddress: METAL_TOKENS.AUXPT,
    metalSymbol: "AUXPT",
  });

  const auxpdLeasing = useLeasing({
    offerAddress: LEASING_CONTRACTS.AUXPD["90"],
    metalTokenAddress: METAL_TOKENS.AUXPD,
    metalSymbol: "AUXPD",
  });

  // Combine all positions
  const allPositions = [
    ...auxgPositions.activePositions.map((p, idx) => ({ 
      ...p, 
      metal: "AUXG", 
      icon: "/gold-favicon-32x32.png",
      contractAddress: LEASING_CONTRACTS.AUXG["90"],
      leasing: auxgLeasing,
      positionKey: `AUXG-${idx}`,
      apy: 4.5,
      lockPeriod: 90 * 86400,
    })),
    ...auxsPositions.activePositions.map((p, idx) => ({ 
      ...p, 
      metal: "AUXS", 
      icon: "/silver-favicon-32x32.png",
      contractAddress: LEASING_CONTRACTS.AUXS["90"],
      leasing: auxsLeasing,
      positionKey: `AUXS-${idx}`,
      apy: 5.0,
      lockPeriod: 90 * 86400,
    })),
    ...auxptPositions.activePositions.map((p, idx) => ({ 
      ...p, 
      metal: "AUXPT", 
      icon: "/platinum-favicon-32x32.png",
      contractAddress: LEASING_CONTRACTS.AUXPT["90"],
      leasing: auxptLeasing,
      positionKey: `AUXPT-${idx}`,
      apy: 3.5,
      lockPeriod: 90 * 86400,
    })),
    ...auxpdPositions.activePositions.map((p, idx) => ({ 
      ...p, 
      metal: "AUXPD", 
      icon: "/palladium-favicon-32x32.png",
      contractAddress: LEASING_CONTRACTS.AUXPD["90"],
      leasing: auxpdLeasing,
      positionKey: `AUXPD-${idx}`,
      apy: 3.0,
      lockPeriod: 90 * 86400,
    })),
  ];

  const hasAnyPositions = allPositions.length > 0;

  const handleWithdraw = async (position: any) => {
    if (!position.isUnlocked) return;
    
    setWithdrawingPosition(position.positionKey);
    try {
      await position.leasing.withdraw(position.index);
      
      // Refetch positions after withdrawal
      setTimeout(() => {
        auxgPositions.refetchPositions();
        auxsPositions.refetchPositions();
        auxptPositions.refetchPositions();
        auxpdPositions.refetchPositions();
      }, 2000);
    } catch (error) {
      console.error("Withdrawal failed:", error);
    } finally {
      setWithdrawingPosition(null);
    }
  };

  // Calculate total stats
  const totalAllocated = allPositions.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const totalEarnings = allPositions.reduce((sum, p) => {
    const amount = parseFloat(p.amount);
    const days = p.lockPeriod / 86400;
    return sum + (amount * (p.apy || 4) / 100) * (days / 365);
  }, 0);

  if (!hasAnyPositions) {
    return (
      <div>
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-slate-200 mb-2">
            {lang === "tr" ? "Aktif Pozisyonlarım" : "My Active Positions"}
          </h3>
          <p className="text-sm text-slate-400">
            {lang === "tr"
              ? "Tahsis edilmiş pozisyonlarınızı görüntüleyin ve yönetin"
              : "View and manage your allocated positions"}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8">
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-slate-800 flex items-center justify-center">
              <svg className="w-10 h-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-slate-300 mb-2">
              {lang === "tr" ? "Henüz pozisyonunuz yok" : "No positions yet"}
            </h4>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              {lang === "tr"
                ? "Metal tokenlerinizi tahsis ederek getiri kazanmaya başlayın"
                : "Start earning yield by allocating your metal tokens"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header with Summary */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-200 mb-2">
            {lang === "tr" ? "Aktif Pozisyonlarım" : "My Active Positions"}
          </h3>
          <p className="text-sm text-slate-400">
            {lang === "tr"
              ? "Tahsis edilmiş pozisyonlarınızı görüntüleyin ve yönetin"
              : "View and manage your allocated positions"}
          </p>
        </div>
        <div className="flex gap-4">
          <div className="text-right">
            <div className="text-xs text-slate-500">{lang === "tr" ? "Toplam Tahsis" : "Total Allocated"}</div>
            <div className="text-lg font-bold text-emerald-400">{totalAllocated.toFixed(2)}g</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">{lang === "tr" ? "Beklenen Kazanç" : "Expected Earnings"}</div>
            <div className="text-lg font-bold text-amber-400">+{totalEarnings.toFixed(3)}g</div>
          </div>
        </div>
      </div>

      {/* Positions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {allPositions.map((position) => (
          <PositionCard
            key={position.positionKey}
            position={position}
            onWithdraw={() => handleWithdraw(position)}
            isWithdrawing={withdrawingPosition === position.positionKey}
            lang={lang}
          />
        ))}
      </div>
    </div>
  );
}

export default PositionsTab;
