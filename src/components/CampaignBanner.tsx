"use client";

import { useState, useEffect } from "react";
import { getActiveCampaignInfo, getLaunchCampaignTimeLeft } from "@/lib/auxm-bonus-service";
import { useLanguage } from "@/components/LanguageContext";

interface CampaignBannerProps {
  lang?: string;
  variant?: "full" | "compact";
}

// ============================================
// LOCAL TRANSLATIONS - 6 Language Support
// ============================================
const translations: Record<string, Record<string, string>> = {
  tr: {
    launchCampaign: "Lansman Kampanyası",
    bonusOnDeposits: "Tüm yatırımlarda bonus!",
    launchActive: "Lansman Kampanyası!",
    earnBonus: "Tüm yatırımlarda AUXM bonus kazanın!",
    timeLeft: "Kalan süre:",
    day: "GÜN",
    hour: "SAAT",
    minute: "DK",
    bonusUsage: "Bonus AUXM sadece metal alımında (Altın, Gümüş, Platin, Paladyum) kullanılabilir.",
    remaining: "kaldı",
  },
  en: {
    launchCampaign: "Launch Campaign",
    bonusOnDeposits: "bonus on all deposits!",
    launchActive: "Launch Campaign!",
    earnBonus: "Earn AUXM bonus on all deposits!",
    timeLeft: "Time left:",
    day: "DAY",
    hour: "HR",
    minute: "MIN",
    bonusUsage: "Bonus AUXM can only be used for metal purchases (Gold, Silver, Platinum, Palladium).",
    remaining: "left",
  },
  de: {
    launchCampaign: "Launch-Kampagne",
    bonusOnDeposits: "Bonus auf alle Einzahlungen!",
    launchActive: "Launch-Kampagne!",
    earnBonus: "Verdienen Sie AUXM-Bonus auf alle Einzahlungen!",
    timeLeft: "Verbleibende Zeit:",
    day: "TAG",
    hour: "STD",
    minute: "MIN",
    bonusUsage: "Bonus AUXM kann nur für Metallkäufe (Gold, Silber, Platin, Palladium) verwendet werden.",
    remaining: "übrig",
  },
  fr: {
    launchCampaign: "Campagne de Lancement",
    bonusOnDeposits: "bonus sur tous les dépôts!",
    launchActive: "Campagne de Lancement!",
    earnBonus: "Gagnez un bonus AUXM sur tous les dépôts!",
    timeLeft: "Temps restant:",
    day: "JOUR",
    hour: "HR",
    minute: "MIN",
    bonusUsage: "Le bonus AUXM ne peut être utilisé que pour les achats de métaux (Or, Argent, Platine, Palladium).",
    remaining: "restant",
  },
  ar: {
    launchCampaign: "حملة الإطلاق",
    bonusOnDeposits: "مكافأة على جميع الإيداعات!",
    launchActive: "حملة الإطلاق!",
    earnBonus: "اكسب مكافأة AUXM على جميع الإيداعات!",
    timeLeft: "الوقت المتبقي:",
    day: "يوم",
    hour: "ساعة",
    minute: "دقيقة",
    bonusUsage: "يمكن استخدام مكافأة AUXM فقط لشراء المعادن (الذهب، الفضة، البلاتين، البالاديوم).",
    remaining: "متبقي",
  },
  ru: {
    launchCampaign: "Акция Запуска",
    bonusOnDeposits: "бонус на все депозиты!",
    launchActive: "Акция Запуска!",
    earnBonus: "Получайте бонус AUXM на все депозиты!",
    timeLeft: "Осталось времени:",
    day: "ДЕНЬ",
    hour: "ЧАС",
    minute: "МИН",
    bonusUsage: "Бонус AUXM можно использовать только для покупки металлов (Золото, Серебро, Платина, Палладий).",
    remaining: "осталось",
  },
};

export function CampaignBanner({ lang: propLang, variant = "full" }: CampaignBannerProps) {
  const { lang: contextLang } = useLanguage();
  const lang = propLang || contextLang || "en";
  const t = translations[lang] || translations.en;
  
  const [campaign, setCampaign] = useState<ReturnType<typeof getActiveCampaignInfo>>(null);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number } | null>(null);

  useEffect(() => {
    const campaignInfo = getActiveCampaignInfo();
    setCampaign(campaignInfo);
    setTimeLeft(getLaunchCampaignTimeLeft());

    const interval = setInterval(() => {
      const newCampaign = getActiveCampaignInfo();
      setCampaign(newCampaign);
      setTimeLeft(getLaunchCampaignTimeLeft());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  if (!campaign || !campaign.isActive) return null;

  // Compact version
  if (variant === "compact") {
    return (
      <div className="bg-gradient-to-r from-purple-600 to-pink-500 text-white text-center py-1.5 px-4 text-sm">
        <span className="font-medium">
          🚀 {t.launchCampaign}:
        </span>
        <span className="ml-1">
          {campaign.bonusPercent}% {t.bonusOnDeposits}
        </span>
        {timeLeft && (
          <span className="ml-2 opacity-80">
            ({timeLeft.days}{lang === "tr" ? "g" : "d"} {timeLeft.hours}{lang === "tr" ? "s" : "h"} {t.remaining})
          </span>
        )}
      </div>
    );
  }

  // Full version - with light/dark mode support
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 p-[1px]">
      <div className="relative rounded-xl bg-white dark:bg-slate-900/95 px-4 py-4 sm:py-3">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-pink-500/10 to-orange-500/10 animate-pulse" />
        
        <div className="relative">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500">
                <span className="text-2xl animate-bounce">🚀</span>
              </div>
              <div>
                <h3 className="text-slate-800 dark:text-white font-bold text-base sm:text-lg">
                  {t.launchActive}
                </h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm">
                  {campaign.bonusPercent}% {t.earnBonus}
                </p>
              </div>
            </div>

            {timeLeft && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400 text-xs hidden sm:inline">
                  {t.timeLeft}
                </span>
                <div className="flex items-center gap-1">
                  <div className="flex flex-col items-center bg-stone-100 dark:bg-slate-800 rounded-lg px-2 py-1 min-w-[44px]">
                    <span className="text-slate-800 dark:text-white font-bold text-sm sm:text-base">{timeLeft.days}</span>
                    <span className="text-slate-500 dark:text-slate-500 text-[10px]">{t.day}</span>
                  </div>
                  <span className="text-slate-400 dark:text-slate-500">:</span>
                  <div className="flex flex-col items-center bg-stone-100 dark:bg-slate-800 rounded-lg px-2 py-1 min-w-[44px]">
                    <span className="text-slate-800 dark:text-white font-bold text-sm sm:text-base">{timeLeft.hours.toString().padStart(2, '0')}</span>
                    <span className="text-slate-500 dark:text-slate-500 text-[10px]">{t.hour}</span>
                  </div>
                  <span className="text-slate-400 dark:text-slate-500">:</span>
                  <div className="flex flex-col items-center bg-stone-100 dark:bg-slate-800 rounded-lg px-2 py-1 min-w-[44px]">
                    <span className="text-slate-800 dark:text-white font-bold text-sm sm:text-base">{timeLeft.minutes.toString().padStart(2, '0')}</span>
                    <span className="text-slate-500 dark:text-slate-500 text-[10px]">{t.minute}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-stone-200 dark:border-slate-700/50">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <svg className="w-4 h-4 text-purple-500 dark:text-purple-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{t.bonusUsage}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CampaignBanner;
