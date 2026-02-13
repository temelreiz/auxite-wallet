"use client";

import { useLanguage } from "@/components/LanguageContext";

const translations: Record<string, Record<string, string>> = {
  tr: {
    feeBreakdown: "ÜCRET DÖKÜMÜ",
    networkFee: "Takas Ağı Ücreti",
    platformFee: "Platform Ücreti",
    settlementFee: "Takas Ücreti (Dahili)",
    totalDeducted: "Toplam Kesinti",
    netSettlementAmount: "Net Takas Tutarı",
    estimatedSettlement: "Tahmini Takas Süresi",
    free: "Ücretsiz",
    noFees: "Ücret yok",
    minutes: "dakika",
    instant: "Anında",
  },
  en: {
    feeBreakdown: "FEE BREAKDOWN",
    networkFee: "Settlement Network Fee",
    platformFee: "Platform Fee",
    settlementFee: "Settlement Fee (Internal)",
    totalDeducted: "Total Deducted",
    netSettlementAmount: "Net Settlement Amount",
    estimatedSettlement: "Estimated Settlement Window",
    free: "Free",
    noFees: "No fees",
    minutes: "minutes",
    instant: "Instant",
  },
  de: {
    feeBreakdown: "GEBÜHRENAUFSCHLÜSSELUNG",
    networkFee: "Abwicklungsnetzwerkgebühr",
    platformFee: "Plattformgebühr",
    settlementFee: "Abwicklungsgebühr (Intern)",
    totalDeducted: "Gesamt Abgezogen",
    netSettlementAmount: "Nettoabwicklungsbetrag",
    estimatedSettlement: "Geschätztes Abwicklungsfenster",
    free: "Kostenlos",
    noFees: "Keine Gebühren",
    minutes: "Minuten",
    instant: "Sofort",
  },
  fr: {
    feeBreakdown: "DÉTAIL DES FRAIS",
    networkFee: "Frais du Réseau de Règlement",
    platformFee: "Frais de Plateforme",
    settlementFee: "Frais de Règlement (Interne)",
    totalDeducted: "Total Déduit",
    netSettlementAmount: "Montant Net de Règlement",
    estimatedSettlement: "Fenêtre de Règlement Estimée",
    free: "Gratuit",
    noFees: "Pas de frais",
    minutes: "minutes",
    instant: "Instantané",
  },
  ar: {
    feeBreakdown: "تفصيل الرسوم",
    networkFee: "رسوم شبكة التسوية",
    platformFee: "رسوم المنصة",
    settlementFee: "رسوم التسوية (داخلي)",
    totalDeducted: "إجمالي الخصم",
    netSettlementAmount: "صافي مبلغ التسوية",
    estimatedSettlement: "نافذة التسوية المقدرة",
    free: "مجاني",
    noFees: "بدون رسوم",
    minutes: "دقائق",
    instant: "فوري",
  },
  ru: {
    feeBreakdown: "Разбивка Комиссий",
    networkFee: "Комиссия Расчетной Сети",
    platformFee: "Комиссия Платформы",
    settlementFee: "Комиссия Расчета (Внутр.)",
    totalDeducted: "Всего Удержано",
    netSettlementAmount: "Чистая Сумма Расчета",
    estimatedSettlement: "Расчетное Окно",
    free: "Бесплатно",
    noFees: "Без комиссий",
    minutes: "минут",
    instant: "Мгновенно",
  },
};

// Fee structure from /api/withdraw
const NETWORK_FEES: Record<string, { fee: number; eta: string }> = {
  USDT: { fee: 1, eta: "15-30" },
  ETH: { fee: 0.001, eta: "15-30" },
  BTC: { fee: 0.0001, eta: "30-60" },
  XRP: { fee: 0.1, eta: "< 5" },
  SOL: { fee: 0.01, eta: "< 5" },
};

interface FeePreviewPanelProps {
  crypto: string;
  amount: number;
  isInternal?: boolean;
}

export function FeePreviewPanel({ crypto, amount, isInternal = false }: FeePreviewPanelProps) {
  const { lang } = useLanguage();
  const t = translations[lang] || translations.en;

  if (isInternal) {
    return (
      <div className="p-4 rounded-xl bg-[#2F6F62]/5 border border-[#2F6F62]/20">
        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider mb-3">
          {t.feeBreakdown}
        </h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">{t.settlementFee}</span>
            <span className="text-sm font-medium text-[#2F6F62]">{t.free}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">{t.platformFee}</span>
            <span className="text-sm font-medium text-[#2F6F62]">{t.free}</span>
          </div>
          <div className="border-t border-[#2F6F62]/20 pt-2 mt-2">
            <div className="flex justify-between">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.netSettlementAmount}</span>
              <span className="text-sm font-bold text-[#2F6F62]">
                {amount > 0 ? `${amount} ${crypto}` : "—"}
              </span>
            </div>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">{t.estimatedSettlement}</span>
            <span className="text-sm font-medium text-[#2F6F62]">{t.instant}</span>
          </div>
        </div>
      </div>
    );
  }

  const feeData = NETWORK_FEES[crypto] || { fee: 0, eta: "15-30" };
  const networkFee = feeData.fee;
  const platformFee = 0; // Currently no platform fee
  const totalDeducted = networkFee + platformFee;
  const netSettlement = Math.max(0, amount - totalDeducted);

  return (
    <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800">
      <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider mb-3">
        {t.feeBreakdown}
      </h4>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-slate-600 dark:text-slate-400">{t.networkFee}</span>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {networkFee} {crypto}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-slate-600 dark:text-slate-400">{t.platformFee}</span>
          <span className="text-sm font-medium text-[#2F6F62]">{t.free}</span>
        </div>
        {totalDeducted > 0 && (
          <div className="flex justify-between pt-1 border-t border-stone-100 dark:border-slate-800">
            <span className="text-sm text-slate-600 dark:text-slate-400">{t.totalDeducted}</span>
            <span className="text-sm font-medium text-[#BFA181]">
              {totalDeducted} {crypto}
            </span>
          </div>
        )}
        <div className="border-t border-stone-200 dark:border-slate-700 pt-2 mt-1">
          <div className="flex justify-between">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.netSettlementAmount}</span>
            <span className="text-sm font-bold text-slate-800 dark:text-white">
              {amount > 0 ? `${netSettlement.toFixed(6)} ${crypto}` : "—"}
            </span>
          </div>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-slate-600 dark:text-slate-400">{t.estimatedSettlement}</span>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {"< "}{feeData.eta} {t.minutes}
          </span>
        </div>
      </div>
    </div>
  );
}

export default FeePreviewPanel;
