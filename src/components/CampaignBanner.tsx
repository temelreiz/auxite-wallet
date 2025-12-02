"use client";

import { useState, useEffect } from "react";
import { getActiveCampaignInfo, getLaunchCampaignTimeLeft } from "@/lib/auxm-bonus-service";

interface CampaignBannerProps {
  lang?: "tr" | "en";
  variant?: "full" | "compact";
}

export function CampaignBanner({ lang = "en", variant = "full" }: CampaignBannerProps) {
  const [campaign, setCampaign] = useState<ReturnType<typeof getActiveCampaignInfo>>(null);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number } | null>(null);

  useEffect(() => {
    // İlk yükleme
    const campaignInfo = getActiveCampaignInfo();
    setCampaign(campaignInfo);
    setTimeLeft(getLaunchCampaignTimeLeft());

    // Her dakika güncelle
    const interval = setInterval(() => {
      const newCampaign = getActiveCampaignInfo();
      setCampaign(newCampaign);
      setTimeLeft(getLaunchCampaignTimeLeft());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  if (!campaign || !campaign.isActive) return null;

  // Compact versiyon (header için)
  if (variant === "compact") {
    return (
      <div className="bg-gradient-to-r from-purple-600 to-pink-500 text-white text-center py-1.5 px-4 text-sm">
        <span className="font-medium">
          🚀 {lang === "tr" ? "Lansman Kampanyası" : "Launch Campaign"}:
        </span>
        <span className="ml-1">
          {lang === "tr" 
            ? `Tüm yatırımlarda %${campaign.bonusPercent} bonus!`
            : `${campaign.bonusPercent}% bonus on all deposits!`}
        </span>
        {timeLeft && (
          <span className="ml-2 opacity-80">
            ({timeLeft.days}g {timeLeft.hours}s kaldı)
          </span>
        )}
      </div>
    );
  }

  // Full versiyon (sayfa içi)
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 p-[1px]">
      <div className="relative rounded-xl bg-slate-900/95 px-4 py-4 sm:py-3">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-pink-500/10 to-orange-500/10 animate-pulse" />
        
        <div className="relative">
          {/* Main Content */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Left - Campaign Info */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500">
                <span className="text-2xl animate-bounce">🚀</span>
              </div>
              <div>
                <h3 className="text-white font-bold text-base sm:text-lg">
                  {lang === "tr" ? "Lansman Kampanyası!" : "Launch Campaign!"}
                </h3>
                <p className="text-slate-300 text-sm">
                  {lang === "tr" 
                    ? `Tüm yatırımlarda %${campaign.bonusPercent} AUXM bonus kazanın!`
                    : `Earn ${campaign.bonusPercent}% AUXM bonus on all deposits!`}
                </p>
              </div>
            </div>

            {/* Right - Countdown */}
            {timeLeft && (
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-xs hidden sm:inline">
                  {lang === "tr" ? "Kalan süre:" : "Time left:"}
                </span>
                <div className="flex items-center gap-1">
                  {/* Days */}
                  <div className="flex flex-col items-center bg-slate-800 rounded-lg px-2 py-1 min-w-[44px]">
                    <span className="text-white font-bold text-sm sm:text-base">{timeLeft.days}</span>
                    <span className="text-slate-500 text-[10px]">{lang === "tr" ? "GÜN" : "DAY"}</span>
                  </div>
                  <span className="text-slate-500">:</span>
                  {/* Hours */}
                  <div className="flex flex-col items-center bg-slate-800 rounded-lg px-2 py-1 min-w-[44px]">
                    <span className="text-white font-bold text-sm sm:text-base">{timeLeft.hours.toString().padStart(2, '0')}</span>
                    <span className="text-slate-500 text-[10px]">{lang === "tr" ? "SAAT" : "HR"}</span>
                  </div>
                  <span className="text-slate-500">:</span>
                  {/* Minutes */}
                  <div className="flex flex-col items-center bg-slate-800 rounded-lg px-2 py-1 min-w-[44px]">
                    <span className="text-white font-bold text-sm sm:text-base">{timeLeft.minutes.toString().padStart(2, '0')}</span>
                    <span className="text-slate-500 text-[10px]">{lang === "tr" ? "DK" : "MIN"}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bonus Usage Note */}
          <div className="mt-3 pt-3 border-t border-slate-700/50">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <svg className="w-4 h-4 text-purple-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                {lang === "tr" 
                  ? "Bonus AUXM sadece metal alımında (Altın, Gümüş, Platin, Paladyum) kullanılabilir."
                  : "Bonus AUXM can only be used for metal purchases (Gold, Silver, Platinum, Palladium)."}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CampaignBanner;
