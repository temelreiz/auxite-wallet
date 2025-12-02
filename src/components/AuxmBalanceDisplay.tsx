"use client";

import { useState } from "react";
import { UserBalance, formatUserBalance } from "@/lib/auxm-bonus-service";

interface AuxmBalanceDisplayProps {
  balance: UserBalance;
  lang?: "tr" | "en";
  size?: "sm" | "md" | "lg";
  showBreakdown?: boolean;
}

export function AuxmBalanceDisplay({ 
  balance, 
  lang = "en", 
  size = "md",
  showBreakdown = true 
}: AuxmBalanceDisplayProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const formatted = formatUserBalance(balance, lang);

  const sizeClasses = {
    sm: { total: "text-lg", label: "text-xs", breakdown: "text-xs" },
    md: { total: "text-2xl", label: "text-sm", breakdown: "text-sm" },
    lg: { total: "text-4xl", label: "text-base", breakdown: "text-base" },
  };

  return (
    <div className="relative">
      {/* Ana Bakiye */}
      <div className="flex items-baseline gap-2">
        <span className={`font-bold text-white ${sizeClasses[size].total}`}>
          {formatted.displayTotal}
        </span>
        <span className={`text-slate-400 ${sizeClasses[size].label}`}>AUXM</span>
        
        {/* Bonus İndikatörü */}
        {formatted.hasBonusAuxm && (
          <div 
            className="relative"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-400 text-xs font-medium cursor-help">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
              +{formatted.bonusDisplay}
            </span>
            
            {/* Tooltip */}
            {showTooltip && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
                <div className="text-xs text-slate-300">
                  <p className="font-semibold text-purple-400 mb-1">
                    {lang === "tr" ? "🎁 Bonus AUXM" : "🎁 Bonus AUXM"}
                  </p>
                  <p className="text-slate-400">
                    {lang === "tr" 
                      ? "Bu bonus sadece metal alımında (AUXG, AUXS, AUXPT, AUXPD) kullanılabilir. Çekim veya transfer için kullanılamaz."
                      : "This bonus can only be used for metal purchases (AUXG, AUXS, AUXPT, AUXPD). Cannot be withdrawn or transferred."}
                  </p>
                </div>
                {/* Arrow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                  <div className="border-8 border-transparent border-t-slate-800" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bakiye Detayı */}
      {showBreakdown && formatted.hasBonusAuxm && (
        <div className={`mt-2 flex items-center gap-4 ${sizeClasses[size].breakdown}`}>
          {/* Normal AUXM */}
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-400">
              {lang === "tr" ? "Kullanılabilir:" : "Available:"}
            </span>
            <span className="text-white font-medium">{formatted.auxmDisplay}</span>
          </div>
          
          {/* Bonus AUXM */}
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="text-slate-400">
              {lang === "tr" ? "Bonus:" : "Bonus:"}
            </span>
            <span className="text-purple-400 font-medium">{formatted.bonusDisplay}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuxmBalanceDisplay;
