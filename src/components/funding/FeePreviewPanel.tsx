"use client";

import { useLanguage } from "@/components/LanguageContext";

const translations: Record<string, Record<string, string>> = {
  tr: {
    feeBreakdown: "Ücret Dökümü",
    networkFee: "Ağ Ücreti",
    platformFee: "Platform Ücreti",
    totalDeducted: "Toplam Kesinti",
    netDelivered: "Net Teslimat",
    estimatedTime: "Tahmini Süre",
    free: "Ücretsiz",
    noFees: "Ücret yok",
    minutes: "dakika",
    instant: "Anında",
  },
  en: {
    feeBreakdown: "Fee Breakdown",
    networkFee: "Network Fee",
    platformFee: "Platform Fee",
    totalDeducted: "Total Deducted",
    netDelivered: "Net Delivered",
    estimatedTime: "Estimated Time",
    free: "Free",
    noFees: "No fees",
    minutes: "minutes",
    instant: "Instant",
  },
  de: {
    feeBreakdown: "Gebührenaufschlüsselung",
    networkFee: "Netzwerkgebühr",
    platformFee: "Plattformgebühr",
    totalDeducted: "Gesamt Abgezogen",
    netDelivered: "Netto Geliefert",
    estimatedTime: "Geschätzte Zeit",
    free: "Kostenlos",
    noFees: "Keine Gebühren",
    minutes: "Minuten",
    instant: "Sofort",
  },
  fr: {
    feeBreakdown: "Détail des Frais",
    networkFee: "Frais de Réseau",
    platformFee: "Frais de Plateforme",
    totalDeducted: "Total Déduit",
    netDelivered: "Net Livré",
    estimatedTime: "Temps Estimé",
    free: "Gratuit",
    noFees: "Pas de frais",
    minutes: "minutes",
    instant: "Instantané",
  },
  ar: {
    feeBreakdown: "تفصيل الرسوم",
    networkFee: "رسوم الشبكة",
    platformFee: "رسوم المنصة",
    totalDeducted: "إجمالي الخصم",
    netDelivered: "صافي التسليم",
    estimatedTime: "الوقت المقدر",
    free: "مجاني",
    noFees: "بدون رسوم",
    minutes: "دقائق",
    instant: "فوري",
  },
  ru: {
    feeBreakdown: "Разбивка Комиссий",
    networkFee: "Комиссия Сети",
    platformFee: "Комиссия Платформы",
    totalDeducted: "Всего Удержано",
    netDelivered: "Чистая Доставка",
    estimatedTime: "Ожидаемое Время",
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
        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-3">
          {t.feeBreakdown}
        </h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">{t.networkFee}</span>
            <span className="text-sm font-medium text-[#2F6F62]">{t.free}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">{t.platformFee}</span>
            <span className="text-sm font-medium text-[#2F6F62]">{t.free}</span>
          </div>
          <div className="border-t border-[#2F6F62]/20 pt-2 mt-2">
            <div className="flex justify-between">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.netDelivered}</span>
              <span className="text-sm font-bold text-[#2F6F62]">
                {amount > 0 ? `${amount} ${crypto}` : "—"}
              </span>
            </div>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">{t.estimatedTime}</span>
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
  const netDelivered = Math.max(0, amount - totalDeducted);

  return (
    <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800">
      <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-3">
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
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.netDelivered}</span>
            <span className="text-sm font-bold text-slate-800 dark:text-white">
              {amount > 0 ? `${netDelivered.toFixed(6)} ${crypto}` : "—"}
            </span>
          </div>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-slate-600 dark:text-slate-400">{t.estimatedTime}</span>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {"< "}{feeData.eta} {t.minutes}
          </span>
        </div>
      </div>
    </div>
  );
}

export default FeePreviewPanel;
