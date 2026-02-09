"use client";

import { getTierList, isLaunchCampaignActive, CAMPAIGN_CONFIG } from "@/lib/auxm-bonus-service";
import { useLanguage } from "@/components/LanguageContext";

interface BonusTierInfoProps {
  lang?: string;
  showTitle?: boolean;
  showUsageNote?: boolean;
}

// ============================================
// LOCAL TRANSLATIONS - 6 Language Support
// ============================================
const translations: Record<string, Record<string, string>> = {
  tr: {
    bonusSystem: "AUXM Bonus Sistemi",
    launchActive: "Lansman Kampanyası Aktif!",
    launchBonus: "Tüm yatırımlarda bonus kazanın!",
    postCampaign: "Kampanya sonrası tier sistemi:",
    byDeposit: "Yatırım miktarına göre bonus:",
    minDeposit: "* Minimum yatırım gereklidir",
    usageTerms: "Bonus Kullanım Koşulu",
    usageDesc: "Bonus AUXM sadece metal alımında kullanılabilir. Çekim veya transfer için kullanılamaz.",
  },
  en: {
    bonusSystem: "AUXM Bonus System",
    launchActive: "Launch Campaign Active!",
    launchBonus: "Earn bonus on all deposits!",
    postCampaign: "Post-campaign tier system:",
    byDeposit: "Bonus by deposit amount:",
    minDeposit: "* Minimum deposit required",
    usageTerms: "Bonus Usage Terms",
    usageDesc: "Bonus AUXM can only be used for metal purchases. Cannot be withdrawn or transferred.",
  },
  de: {
    bonusSystem: "AUXM Bonus System",
    launchActive: "Launch-Kampagne Aktiv!",
    launchBonus: "Verdienen Sie Bonus auf alle Einzahlungen!",
    postCampaign: "Tier-System nach der Kampagne:",
    byDeposit: "Bonus nach Einzahlungsbetrag:",
    minDeposit: "* Mindesteinzahlung erforderlich",
    usageTerms: "Bonus Nutzungsbedingungen",
    usageDesc: "Bonus AUXM kann nur für Metallkäufe verwendet werden. Kann nicht abgehoben oder übertragen werden.",
  },
  fr: {
    bonusSystem: "Système de Bonus AUXM",
    launchActive: "Campagne de Lancement Active!",
    launchBonus: "Gagnez un bonus sur tous les dépôts!",
    postCampaign: "Système de niveaux après campagne:",
    byDeposit: "Bonus par montant de dépôt:",
    minDeposit: "* Dépôt minimum requis",
    usageTerms: "Conditions d'Utilisation du Bonus",
    usageDesc: "Le bonus AUXM ne peut être utilisé que pour les achats de métaux. Ne peut pas être retiré ou transféré.",
  },
  ar: {
    bonusSystem: "نظام مكافآت AUXM",
    launchActive: "حملة الإطلاق نشطة!",
    launchBonus: "اكسب مكافأة على جميع الإيداعات!",
    postCampaign: "نظام المستويات بعد الحملة:",
    byDeposit: "المكافأة حسب مبلغ الإيداع:",
    minDeposit: "* الحد الأدنى للإيداع مطلوب",
    usageTerms: "شروط استخدام المكافأة",
    usageDesc: "يمكن استخدام مكافأة AUXM فقط لشراء المعادن. لا يمكن سحبها أو تحويلها.",
  },
  ru: {
    bonusSystem: "Бонусная Система AUXM",
    launchActive: "Акция Запуска Активна!",
    launchBonus: "Получайте бонус на все депозиты!",
    postCampaign: "Система уровней после акции:",
    byDeposit: "Бонус по сумме депозита:",
    minDeposit: "* Требуется минимальный депозит",
    usageTerms: "Условия Использования Бонуса",
    usageDesc: "Бонус AUXM можно использовать только для покупки металлов. Нельзя вывести или перевести.",
  },
};

const tierNames: Record<string, Record<string, string>> = {
  Bronze: { tr: "Bronz", en: "Bronze", de: "Bronze", fr: "Bronze", ar: "برونزي", ru: "Бронза" },
  Silver: { tr: "Gümüş", en: "Silver", de: "Silber", fr: "Argent", ar: "فضي", ru: "Серебро" },
  Gold: { tr: "Altın", en: "Gold", de: "Gold", fr: "Or", ar: "ذهبي", ru: "Золото" },
  Platinum: { tr: "Platin", en: "Platinum", de: "Platin", fr: "Platine", ar: "بلاتيني", ru: "Платина" },
};

export function BonusTierInfo({ lang: propLang, showTitle = true, showUsageNote = true }: BonusTierInfoProps) {
  const { lang: contextLang } = useLanguage();
  const lang = propLang || contextLang || "en";
  const t = translations[lang] || translations.en;
  
  const tiers = getTierList();
  const isLaunchActive = isLaunchCampaignActive();

  const getTierName = (name: string) => {
    return tierNames[name]?.[lang] || name;
  };

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
      {showTitle && (
        <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
          <span>🎁</span>
          {t.bonusSystem}
        </h4>
      )}

      {/* Launch Campaign Alert */}
      {isLaunchActive && (
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🚀</span>
            <span className="text-purple-300 font-semibold text-sm">
              {t.launchActive}
            </span>
          </div>
          <p className="text-purple-200/80 text-xs">
            {`${CAMPAIGN_CONFIG.launch.bonusPercent}% ${t.launchBonus}`}
          </p>
        </div>
      )}

      {/* Tier List */}
      <div className="space-y-2">
        <p className="text-xs text-slate-400 mb-2">
          {isLaunchActive ? t.postCampaign : t.byDeposit}
        </p>
        
        {tiers.map((tier, index) => (
          <div 
            key={tier.name}
            className={`flex items-center justify-between p-2 rounded-lg ${
              index === tiers.length - 1 
                ? "bg-[#BFA181]/10 border border-[#BFA181]/30" 
                : "bg-slate-700/50"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                tier.name === "Bronze" ? "bg-orange-400" :
                tier.name === "Silver" ? "bg-slate-300" :
                tier.name === "Gold" ? "bg-yellow-400" :
                "bg-purple-400"
              }`} />
              <span className="text-slate-300 text-sm">{getTierName(tier.name)}</span>
            </div>
            <span className={`font-bold text-sm ${
              tier.name === "Platinum" ? "text-[#BFA181]" : "text-[#2F6F62]"
            }`}>
              +%{tier.bonusPercent}
            </span>
          </div>
        ))}
      </div>

      {/* Min deposit note */}
      <p className="text-xs text-slate-500 mt-3">
        {t.minDeposit} (${CAMPAIGN_CONFIG.minDepositForBonus})
      </p>

      {/* Bonus Usage Note */}
      {showUsageNote && (
        <div className="mt-3 pt-3 border-t border-slate-700">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-xs text-slate-300 font-medium mb-1">
                {t.usageTerms}
              </p>
              <p className="text-xs text-slate-400">
                {t.usageDesc}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Supported Metals */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {["AUXG", "AUXS", "AUXPT", "AUXPD"].map((metal) => (
          <span 
            key={metal}
            className="px-2 py-0.5 rounded-md bg-slate-700/50 text-slate-400 text-xs"
          >
            {metal === "AUXG" && "🥇"} 
            {metal === "AUXS" && "🥈"} 
            {metal === "AUXPT" && "⚪"} 
            {metal === "AUXPD" && "🔘"} 
            {metal}
          </span>
        ))}
      </div>
    </div>
  );
}

export default BonusTierInfo;
