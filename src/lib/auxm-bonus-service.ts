// AUXM Bonus Calculation Service v2
// Metal-Only Bonus System + Tier + Launch Campaign

// ===========================================
// KAMPANYA AYARLARI
// ===========================================

export const CAMPAIGN_CONFIG = {
  // Launch kampanyası
  launch: {
    enabled: true,
    bonusPercent: 2.0, // %2
    startDate: new Date("2025-12-01T00:00:00Z"),
    endDate: new Date("2026-01-01T00:00:00Z"), // 30 gün
    name: "Launch Bonus",
    description: {
      tr: "Lansman kampanyası: Tüm yatırımlarda %2 AUXM bonus!",
      en: "Launch campaign: 2% AUXM bonus on all deposits!"
    }
  },
  
  // Tier sistemi (launch bittikten sonra)
  tiers: [
    { minAmount: 0,     maxAmount: 99.99,   bonusPercent: 0,    name: "No Bonus" },
    { minAmount: 100,   maxAmount: 999.99,  bonusPercent: 0.5,  name: "Bronze" },
    { minAmount: 1000,  maxAmount: 4999.99, bonusPercent: 0.8,  name: "Silver" },
    { minAmount: 5000,  maxAmount: 9999.99, bonusPercent: 1.0,  name: "Gold" },
    { minAmount: 10000, maxAmount: Infinity, bonusPercent: 1.5, name: "Platinum" },
  ],

  // Minimum bonus alabilecek miktar
  minDepositForBonus: 100, // $100 altı bonus yok
  
  // Bonus kullanım kuralları
  bonusRules: {
    // Bonus AUXM sadece metal alımında kullanılabilir
    usableFor: ["AUXG", "AUXS", "AUXPT", "AUXPD"],
    // Bonus AUXM ile yapılamayacak işlemler
    notUsableFor: ["withdraw", "transfer", "crypto_buy"],
    // Bonus'un süresi (gün) - 0 = süresiz
    expirationDays: 90,
  }
};

// ===========================================
// TİPLER
// ===========================================

export interface UserBalance {
  // Normal AUXM - her yerde kullanılabilir
  auxm: number;
  // Bonus AUXM - sadece metal alımında kullanılabilir
  bonusAuxm: number;
  // Toplam görünen bakiye
  totalAuxm: number;
  // Metal bakiyeleri
  auxg: number;
  auxs: number;
  auxpt: number;
  auxpd: number;
}

export interface BonusCalculation {
  depositAmountUsd: number;
  auxmAmount: number;        // Normal AUXM
  bonusPercent: number;
  bonusAmount: number;       // Bonus AUXM (metal-only)
  totalAuxm: number;         // Görünen toplam
  tierName: string;
  campaignName: string | null;
  isLaunchCampaign: boolean;
  bonusExpiresAt: Date | null;
  message: {
    tr: string;
    en: string;
  };
  bonusNote: {
    tr: string;
    en: string;
  };
}

export interface MetalPurchaseCalculation {
  metalType: "AUXG" | "AUXS" | "AUXPT" | "AUXPD";
  metalAmount: number;       // gram
  metalPricePerGram: number;
  totalCost: number;         // toplam AUXM maliyeti
  usedAuxm: number;          // normal AUXM'den kullanılan
  usedBonusAuxm: number;     // bonus AUXM'den kullanılan
  remainingAuxm: number;     // kalan normal AUXM
  remainingBonusAuxm: number; // kalan bonus AUXM
}

// ===========================================
// YARDIMCI FONKSİYONLAR
// ===========================================

/**
 * Launch kampanyasının aktif olup olmadığını kontrol et
 */
export function isLaunchCampaignActive(): boolean {
  if (!CAMPAIGN_CONFIG.launch.enabled) return false;
  
  const now = new Date();
  return now >= CAMPAIGN_CONFIG.launch.startDate && now <= CAMPAIGN_CONFIG.launch.endDate;
}

/**
 * Launch kampanyasının kalan süresini hesapla
 */
export function getLaunchCampaignTimeLeft(): { days: number; hours: number; minutes: number } | null {
  if (!isLaunchCampaignActive()) return null;
  
  const now = new Date();
  const diff = CAMPAIGN_CONFIG.launch.endDate.getTime() - now.getTime();
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return { days, hours, minutes };
}

/**
 * Deposit miktarına göre tier bul
 */
export function getTierForAmount(amountUsd: number): typeof CAMPAIGN_CONFIG.tiers[0] {
  const tier = CAMPAIGN_CONFIG.tiers.find(
    t => amountUsd >= t.minAmount && amountUsd <= t.maxAmount
  );
  return tier || CAMPAIGN_CONFIG.tiers[0];
}

/**
 * Bonus'un son kullanma tarihini hesapla
 */
export function calculateBonusExpiration(): Date | null {
  if (CAMPAIGN_CONFIG.bonusRules.expirationDays === 0) return null;
  
  const expDate = new Date();
  expDate.setDate(expDate.getDate() + CAMPAIGN_CONFIG.bonusRules.expirationDays);
  return expDate;
}

// ===========================================
// ANA FONKSİYONLAR
// ===========================================

/**
 * AUXM bonus hesapla (deposit için)
 */
export function calculateAuxmBonus(depositAmountUsd: number): BonusCalculation {
  const auxmAmount = depositAmountUsd; // 1 AUXM = 1 USD
  
  // Minimum kontrol
  if (depositAmountUsd < CAMPAIGN_CONFIG.minDepositForBonus) {
    return {
      depositAmountUsd,
      auxmAmount,
      bonusPercent: 0,
      bonusAmount: 0,
      totalAuxm: auxmAmount,
      tierName: "No Bonus",
      campaignName: null,
      isLaunchCampaign: false,
      bonusExpiresAt: null,
      message: {
        tr: `$${CAMPAIGN_CONFIG.minDepositForBonus} üzeri yatırımlarda bonus kazanın!`,
        en: `Deposit $${CAMPAIGN_CONFIG.minDepositForBonus}+ to earn bonus!`
      },
      bonusNote: {
        tr: "",
        en: ""
      }
    };
  }
  
  let bonusPercent: number;
  let tierName: string;
  let campaignName: string | null = null;
  let isLaunchCampaign = false;
  
  // Launch kampanyası aktif mi?
  if (isLaunchCampaignActive()) {
    bonusPercent = CAMPAIGN_CONFIG.launch.bonusPercent;
    tierName = "Launch";
    campaignName = CAMPAIGN_CONFIG.launch.name;
    isLaunchCampaign = true;
  } else {
    // Tier sistemini kullan
    const tier = getTierForAmount(depositAmountUsd);
    bonusPercent = tier.bonusPercent;
    tierName = tier.name;
  }
  
  const bonusAmount = (auxmAmount * bonusPercent) / 100;
  const totalAuxm = auxmAmount + bonusAmount;
  const bonusExpiresAt = bonusAmount > 0 ? calculateBonusExpiration() : null;
  
  // Mesaj oluştur
  let message: { tr: string; en: string };
  
  if (isLaunchCampaign) {
    message = {
      tr: `🚀 Lansman bonusu: +${bonusAmount.toFixed(2)} AUXM (%${bonusPercent})`,
      en: `🚀 Launch bonus: +${bonusAmount.toFixed(2)} AUXM (${bonusPercent}%)`
    };
  } else if (bonusPercent > 0) {
    message = {
      tr: `🎁 ${tierName} bonus: +${bonusAmount.toFixed(2)} AUXM (%${bonusPercent})`,
      en: `🎁 ${tierName} bonus: +${bonusAmount.toFixed(2)} AUXM (${bonusPercent}%)`
    };
  } else {
    message = {
      tr: `$${CAMPAIGN_CONFIG.minDepositForBonus}+ yatırımda bonus kazanın`,
      en: `Deposit $${CAMPAIGN_CONFIG.minDepositForBonus}+ to earn bonus`
    };
  }
  
  // Bonus kullanım notu
  const bonusNote = bonusAmount > 0 ? {
    tr: "⚠️ Bonus AUXM sadece metal alımında (AUXG, AUXS, AUXPT, AUXPD) kullanılabilir.",
    en: "⚠️ Bonus AUXM can only be used for metal purchases (AUXG, AUXS, AUXPT, AUXPD)."
  } : { tr: "", en: "" };
  
  return {
    depositAmountUsd,
    auxmAmount,
    bonusPercent,
    bonusAmount,
    totalAuxm,
    tierName,
    campaignName,
    isLaunchCampaign,
    bonusExpiresAt,
    message,
    bonusNote
  };
}

/**
 * Metal alımında AUXM kullanımını hesapla
 * Önce bonus AUXM kullanılır, sonra normal AUXM
 */
export function calculateMetalPurchase(
  metalType: "AUXG" | "AUXS" | "AUXPT" | "AUXPD",
  metalAmount: number,
  metalPricePerGram: number,
  userBalance: UserBalance
): MetalPurchaseCalculation | { error: string } {
  
  const totalCost = metalAmount * metalPricePerGram;
  const totalAvailable = userBalance.auxm + userBalance.bonusAuxm;
  
  // Yeterli bakiye var mı?
  if (totalCost > totalAvailable) {
    return {
      error: `Insufficient balance. Need ${totalCost.toFixed(2)} AUXM, have ${totalAvailable.toFixed(2)} AUXM`
    };
  }
  
  // Önce bonus AUXM kullan (metal alımında kullanılabilir)
  let usedBonusAuxm = 0;
  let usedAuxm = 0;
  
  if (userBalance.bonusAuxm >= totalCost) {
    // Tamamı bonus'tan karşılanabilir
    usedBonusAuxm = totalCost;
    usedAuxm = 0;
  } else {
    // Önce tüm bonus'u kullan, kalanı normal AUXM'den
    usedBonusAuxm = userBalance.bonusAuxm;
    usedAuxm = totalCost - usedBonusAuxm;
  }
  
  return {
    metalType,
    metalAmount,
    metalPricePerGram,
    totalCost,
    usedAuxm,
    usedBonusAuxm,
    remainingAuxm: userBalance.auxm - usedAuxm,
    remainingBonusAuxm: userBalance.bonusAuxm - usedBonusAuxm
  };
}

/**
 * Withdraw için kullanılabilir AUXM hesapla
 * Sadece normal AUXM withdraw edilebilir, bonus AUXM edilemez
 */
export function getWithdrawableAuxm(userBalance: UserBalance): {
  withdrawable: number;
  bonusLocked: number;
  message: { tr: string; en: string };
} {
  return {
    withdrawable: userBalance.auxm,
    bonusLocked: userBalance.bonusAuxm,
    message: userBalance.bonusAuxm > 0 ? {
      tr: `${userBalance.bonusAuxm.toFixed(2)} Bonus AUXM metal alımı için ayrılmıştır ve çekilemez.`,
      en: `${userBalance.bonusAuxm.toFixed(2)} Bonus AUXM is reserved for metal purchases and cannot be withdrawn.`
    } : {
      tr: "",
      en: ""
    }
  };
}

/**
 * Aktif kampanya bilgisini getir
 */
export function getActiveCampaignInfo(): {
  isActive: boolean;
  name: string;
  bonusPercent: number;
  timeLeft: { days: number; hours: number; minutes: number } | null;
  description: { tr: string; en: string };
  bonusUsageNote: { tr: string; en: string };
} | null {
  if (!isLaunchCampaignActive()) return null;
  
  return {
    isActive: true,
    name: CAMPAIGN_CONFIG.launch.name,
    bonusPercent: CAMPAIGN_CONFIG.launch.bonusPercent,
    timeLeft: getLaunchCampaignTimeLeft(),
    description: CAMPAIGN_CONFIG.launch.description,
    bonusUsageNote: {
      tr: "Bonus AUXM sadece metal alımında kullanılabilir",
      en: "Bonus AUXM can only be used for metal purchases"
    }
  };
}

/**
 * Tier listesini getir (UI için)
 */
export function getTierList(): Array<{
  name: string;
  minAmount: number;
  maxAmount: number;
  bonusPercent: number;
  label: { tr: string; en: string };
}> {
  return CAMPAIGN_CONFIG.tiers
    .filter(t => t.bonusPercent > 0)
    .map(t => ({
      name: t.name,
      minAmount: t.minAmount,
      maxAmount: t.maxAmount,
      bonusPercent: t.bonusPercent,
      label: {
        tr: t.maxAmount === Infinity 
          ? `$${t.minAmount.toLocaleString()}+` 
          : `$${t.minAmount.toLocaleString()} - $${t.maxAmount.toLocaleString()}`,
        en: t.maxAmount === Infinity 
          ? `$${t.minAmount.toLocaleString()}+` 
          : `$${t.minAmount.toLocaleString()} - $${t.maxAmount.toLocaleString()}`
      }
    }));
}

/**
 * Kullanıcı bakiyesini formatla (UI için)
 */
export function formatUserBalance(balance: UserBalance, lang: "tr" | "en" = "en"): {
  displayTotal: string;
  auxmDisplay: string;
  bonusDisplay: string;
  hasBonusAuxm: boolean;
  bonusTooltip: string;
} {
  const hasBonusAuxm = balance.bonusAuxm > 0;
  
  return {
    displayTotal: balance.totalAuxm.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    auxmDisplay: balance.auxm.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    bonusDisplay: balance.bonusAuxm.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    hasBonusAuxm,
    bonusTooltip: hasBonusAuxm 
      ? (lang === "tr" 
          ? `${balance.bonusAuxm.toFixed(2)} Bonus AUXM (sadece metal alımında)` 
          : `${balance.bonusAuxm.toFixed(2)} Bonus AUXM (metal purchases only)`)
      : ""
  };
}
