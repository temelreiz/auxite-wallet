"use client";

import { useState } from "react";
import { useLeasingPositions } from "@/hooks/useLeasingPositions";
import { useLeasing } from "@/hooks/useLeasing";
import { LEASING_CONTRACTS, METAL_TOKENS } from "@/contracts/leasingContracts";

interface PositionsTabProps {
  lang: "tr" | "en";
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
    })),
    ...auxsPositions.activePositions.map((p, idx) => ({ 
      ...p, 
      metal: "AUXS", 
      icon: "/silver-favicon-32x32.png",
      contractAddress: LEASING_CONTRACTS.AUXS["90"],
      leasing: auxsLeasing,
      positionKey: `AUXS-${idx}`,
    })),
    ...auxptPositions.activePositions.map((p, idx) => ({ 
      ...p, 
      metal: "AUXPT", 
      icon: "/platinum-favicon-32x32.png",
      contractAddress: LEASING_CONTRACTS.AUXPT["90"],
      leasing: auxptLeasing,
      positionKey: `AUXPT-${idx}`,
    })),
    ...auxpdPositions.activePositions.map((p, idx) => ({ 
      ...p, 
      metal: "AUXPD", 
      icon: "/palladium-favicon-32x32.png",
      contractAddress: LEASING_CONTRACTS.AUXPD["90"],
      leasing: auxpdLeasing,
      positionKey: `AUXPD-${idx}`,
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

  if (!hasAnyPositions) {
    return (
      <div>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-200 mb-2">
            {lang === "tr" ? "Aktif Pozisyonlarım" : "My Active Positions"}
          </h3>
          <p className="text-sm text-slate-400">
            {lang === "tr"
              ? "Tahsis edilmiş pozisyonlarınızı görüntüleyin ve yönetin"
              : "View and manage your allocated positions"}
          </p>
        </div>

        <div className="text-center py-12">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-slate-400">
            {lang === "tr" ? "Henüz aktif pozisyonunuz yok" : "No active positions yet"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-200 mb-2">
          {lang === "tr" ? "Aktif Pozisyonlarım" : "My Active Positions"}
        </h3>
        <p className="text-sm text-slate-400">
          {lang === "tr"
            ? "Tahsis edilmiş pozisyonlarınızı görüntüleyin ve yönetin"
            : "View and manage your allocated positions"}
        </p>
      </div>

      <div className="space-y-4">
        {allPositions.map((position) => {
          const unlockDate = new Date(position.endTime * 1000);
          const isUnlocked = position.isUnlocked;
          const isWithdrawing = withdrawingPosition === position.positionKey;
          const isWithdrawSuccess = position.leasing.isWithdrawSuccess;

          return (
            <div
              key={position.positionKey}
              className="rounded-xl border border-slate-800 bg-slate-900/50 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <img src={position.icon} alt={position.metal} className="w-10 h-10" />
                  <div>
                    <div className="font-semibold text-slate-200">{position.metal}</div>
                    <div className="text-xs text-slate-500">
                      {lang === "tr" ? "Pozisyon" : "Position"} #{position.index}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-emerald-400">
                    {parseFloat(position.amount).toFixed(2)}g
                  </div>
                  <div className="text-xs text-slate-500">
                    {lang === "tr" ? "Tahsis Edilmiş" : "Allocated"}
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">
                    {lang === "tr" ? "Durum" : "Status"}
                  </span>
                  <span
                    className={`font-medium ${
                      isUnlocked ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {isUnlocked
                      ? lang === "tr"
                        ? "Kilit Açıldı"
                        : "Unlocked"
                      : lang === "tr"
                      ? "Kilitli"
                      : "Locked"}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">
                    {lang === "tr" ? "Açılış Tarihi" : "Unlock Date"}
                  </span>
                  <span className="text-slate-300">
                    {unlockDate.toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US")}
                  </span>
                </div>

                {!isUnlocked && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">
                      {lang === "tr" ? "Kalan Süre" : "Time Remaining"}
                    </span>
                    <span className="text-slate-300">
                      {position.daysRemaining} {lang === "tr" ? "gün" : "days"}
                    </span>
                  </div>
                )}
              </div>

              {isWithdrawSuccess && (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <div className="text-emerald-400 text-sm">✓</div>
                    <div className="text-xs text-emerald-300">
                      {lang === "tr"
                        ? "Geri çekme işlemi başarılı!"
                        : "Withdrawal successful!"}
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() => handleWithdraw(position)}
                disabled={!isUnlocked || isWithdrawing || isWithdrawSuccess}
                className={`w-full px-4 py-3 rounded-lg font-semibold transition-colors ${
                  isUnlocked && !isWithdrawSuccess
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                }`}
              >
                {isWithdrawing ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {lang === "tr" ? "Çekiliyor..." : "Withdrawing..."}
                  </span>
                ) : isWithdrawSuccess ? (
                  <span className="flex items-center justify-center gap-2">
                    <span>✓</span>
                    {lang === "tr" ? "Çekildi" : "Withdrawn"}
                  </span>
                ) : isUnlocked ? (
                  lang === "tr" ? "Geri Çek" : "Withdraw"
                ) : (
                  `${lang === "tr" ? "Çekme: " : "Available in "}${position.daysRemaining} ${lang === "tr" ? "gün sonra" : "days"}`
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}