"use client";

import { getTierList, isLaunchCampaignActive, CAMPAIGN_CONFIG } from "@/lib/auxm-bonus-service";

interface BonusTierInfoProps {
  lang?: "tr" | "en";
  showTitle?: boolean;
  showUsageNote?: boolean;
}

export function BonusTierInfo({ lang = "en", showTitle = true, showUsageNote = true }: BonusTierInfoProps) {
  const tiers = getTierList();
  const isLaunchActive = isLaunchCampaignActive();

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
      {showTitle && (
        <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
          <span>🎁</span>
          {lang === "tr" ? "AUXM Bonus Sistemi" : "AUXM Bonus System"}
        </h4>
      )}

      {/* Launch Campaign Alert */}
      {isLaunchActive && (
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🚀</span>
            <span className="text-purple-300 font-semibold text-sm">
              {lang === "tr" ? "Lansman Kampanyası Aktif!" : "Launch Campaign Active!"}
            </span>
          </div>
          <p className="text-purple-200/80 text-xs">
            {lang === "tr" 
              ? `Tüm yatırımlarda %${CAMPAIGN_CONFIG.launch.bonusPercent} bonus kazanın!`
              : `Earn ${CAMPAIGN_CONFIG.launch.bonusPercent}% bonus on all deposits!`}
          </p>
        </div>
      )}

      {/* Tier List */}
      <div className="space-y-2">
        <p className="text-xs text-slate-400 mb-2">
          {isLaunchActive 
            ? (lang === "tr" ? "Kampanya sonrası tier sistemi:" : "Post-campaign tier system:")
            : (lang === "tr" ? "Yatırım miktarına göre bonus:" : "Bonus by deposit amount:")}
        </p>
        
        {tiers.map((tier, index) => (
          <div 
            key={tier.name}
            className={`flex items-center justify-between p-2 rounded-lg ${
              index === tiers.length - 1 
                ? "bg-amber-500/10 border border-amber-500/30" 
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
              <span className="text-slate-300 text-sm">{tier.label[lang]}</span>
            </div>
            <span className={`font-bold text-sm ${
              tier.name === "Platinum" ? "text-amber-400" : "text-emerald-400"
            }`}>
              +%{tier.bonusPercent}
            </span>
          </div>
        ))}
      </div>

      {/* Min deposit note */}
      <p className="text-xs text-slate-500 mt-3">
        {lang === "tr" 
          ? `* Minimum $${CAMPAIGN_CONFIG.minDepositForBonus} yatırım gereklidir`
          : `* Minimum $${CAMPAIGN_CONFIG.minDepositForBonus} deposit required`}
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
                {lang === "tr" ? "Bonus Kullanım Koşulu" : "Bonus Usage Terms"}
              </p>
              <p className="text-xs text-slate-400">
                {lang === "tr" 
                  ? "Bonus AUXM sadece metal alımında kullanılabilir. Çekim veya transfer için kullanılamaz."
                  : "Bonus AUXM can only be used for metal purchases. Cannot be withdrawn or transferred."}
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
