// src/components/AuxiteYieldPanel.tsx
"use client";

import { useState, useMemo } from "react";
import { METALS, MetalId } from "@/lib/metals";
import { useLanguage } from "@/components/LanguageContext";

type Duration = 3 | 6 | 12;

// ============================================
// LOCAL TRANSLATIONS - 6 Language Support
// ============================================
const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "Kiralama Projeksiyonu — Çoklu Metal",
    subtitle: "AUXG, AUXS, AUXPT ve AUXPD için kurumsal kiralama projeksiyonu.",
    metalSelection: "Metal seçimi",
    initialAmount: "Tahsis miktarı (gram)",
    duration: "Vade",
    month: "Ay",
    metal: "Metal",
    annualRate: "Öngörülen Kiralama Oranı",
    selectedDuration: "Seçilen Vade",
    totalYield: "Öngörülen Kiralama Getirisi",
    endTotal: "Vade Sonu Toplam",
    disclaimer: "Bu sadece örnek hesaplama ekranıdır; yatırım tavsiyesi değildir. Getiriler garanti değildir.",
  },
  en: {
    title: "Leasing Projection — Multi Metal",
    subtitle: "Institutional leasing projection for AUXG, AUXS, AUXPT and AUXPD.",
    metalSelection: "Metal selection",
    initialAmount: "Allocation amount (grams)",
    duration: "Term Length",
    month: "Month",
    metal: "Metal",
    annualRate: "Projected Lease Rate",
    selectedDuration: "Selected Term",
    totalYield: "Projected Leasing Returns",
    endTotal: "At Maturity",
    disclaimer: "This is a projection only; not investment advice. Returns are not guaranteed.",
  },
  de: {
    title: "Leasing-Projektion — Multi Metall",
    subtitle: "Institutionelle Leasing-Projektion für AUXG, AUXS, AUXPT und AUXPD.",
    metalSelection: "Metallauswahl",
    initialAmount: "Allokationsbetrag (Gramm)",
    duration: "Laufzeit",
    month: "Mo",
    metal: "Metall",
    annualRate: "Prognostizierte Leasingrate",
    selectedDuration: "Gewählte Laufzeit",
    totalYield: "Prognostizierte Leasing-Erträge",
    endTotal: "Bei Fälligkeit",
    disclaimer: "Dies ist nur eine Projektion; keine Anlageberatung. Erträge sind nicht garantiert.",
  },
  fr: {
    title: "Projection de Leasing — Multi Métal",
    subtitle: "Projection de leasing institutionnel pour AUXG, AUXS, AUXPT et AUXPD.",
    metalSelection: "Sélection du métal",
    initialAmount: "Montant d'allocation (grammes)",
    duration: "Durée du Terme",
    month: "Mois",
    metal: "Métal",
    annualRate: "Taux de Location Projeté",
    selectedDuration: "Terme Sélectionné",
    totalYield: "Rendements de Leasing Projetés",
    endTotal: "À Maturité",
    disclaimer: "Ceci est uniquement une projection; pas un conseil d'investissement. Les retours ne sont pas garantis.",
  },
  ar: {
    title: "إسقاط التأجير — متعدد المعادن",
    subtitle: "إسقاط التأجير المؤسسي لـ AUXG و AUXS و AUXPT و AUXPD.",
    metalSelection: "اختيار المعدن",
    initialAmount: "مبلغ التخصيص (جرام)",
    duration: "مدة الاستثمار",
    month: "شهر",
    metal: "المعدن",
    annualRate: "معدل التأجير المتوقع",
    selectedDuration: "المدة المختارة",
    totalYield: "عوائد التأجير المتوقعة",
    endTotal: "عند الاستحقاق",
    disclaimer: "هذا مجرد إسقاط؛ ليس نصيحة استثمارية. العوائد غير مضمونة.",
  },
  ru: {
    title: "Проекция Лизинга — Мульти Металл",
    subtitle: "Институциональная проекция лизинга для AUXG, AUXS, AUXPT и AUXPD.",
    metalSelection: "Выбор металла",
    initialAmount: "Сумма аллокации (грамм)",
    duration: "Срок",
    month: "Мес",
    metal: "Металл",
    annualRate: "Прогнозируемая Ставка Лизинга",
    selectedDuration: "Выбранный Срок",
    totalYield: "Прогнозируемый Доход от Лизинга",
    endTotal: "При Погашении",
    disclaimer: "Это только проекция; не является инвестиционной рекомендацией. Доходность не гарантирована.",
  },
};

export default function AuxiteYieldPanel() {
  const { lang } = useLanguage();
  const t = translations[lang] || translations.en;
  
  const [selectedMetal, setSelectedMetal] = useState<MetalId>("AUXG");
  const [amountGrams, setAmountGrams] = useState<string>("100");
  const [duration, setDuration] = useState<Duration>(12);

  const annualRates: Record<MetalId, number> = {
    AUXG: 0.06,
    AUXS: 0.03,
    AUXPT: 0.045,
    AUXPD: 0.05,
  };

  const activeRate = annualRates[selectedMetal];

  const result = useMemo(() => {
    const amt = parseFloat(amountGrams.replace(",", "."));
    if (isNaN(amt) || amt <= 0) return null;

    const years = duration / 12;
    const yieldGrams = amt * activeRate * years;
    const totalGrams = amt + yieldGrams;

    return { yieldGrams, totalGrams };
  }, [amountGrams, duration, activeRate]);

  return (
    <div className="rounded-xl sm:rounded-2xl border border-slate-700 bg-slate-900 p-3 sm:p-4 flex flex-col gap-3 sm:gap-4">
      <h2 className="text-base sm:text-lg font-semibold text-slate-50">
        {t.title}
      </h2>

      <p className="text-[10px] sm:text-xs text-slate-400">
        {t.subtitle}
      </p>

      {/* Metal seçimi */}
      <div>
        <p className="text-[10px] sm:text-xs font-medium text-slate-300 mb-1">{t.metalSelection}</p>
        <div className="inline-flex rounded-full bg-slate-800 p-0.5 sm:p-1 flex-wrap gap-0.5 sm:gap-1">
          {METALS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedMetal(m.id)}
              className={
                "px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold rounded-full " +
                (selectedMetal === m.id
                  ? "bg-yellow-400 text-black"
                  : "text-slate-200 hover:bg-slate-700")
              }
            >
              {m.id}
            </button>
          ))}
        </div>
      </div>

      {/* Başlangıç miktarı */}
      <div>
        <label className="block text-[10px] sm:text-xs font-medium text-slate-300 mb-1">
          {t.initialAmount}
        </label>
        <input
          type="number"
          min={0}
          step="0.01"
          value={amountGrams}
          onChange={(e) => setAmountGrams(e.target.value)}
          className="w-full rounded-lg sm:rounded-xl border border-slate-700 bg-slate-950 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#BFA181]"
        />
      </div>

      {/* Süre seçimi */}
      <div>
        <p className="text-[10px] sm:text-xs font-medium text-slate-300 mb-1">{t.duration}</p>
        <div className="inline-flex rounded-full bg-slate-800 p-0.5 sm:p-1">
          {[3, 6, 12].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setDuration(m as Duration)}
              className={
                "px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold rounded-full " +
                (duration === m
                  ? "bg-[#2F6F62] text-white"
                  : "text-slate-200 hover:bg-slate-700")
              }
            >
              {m} {t.month}
            </button>
          ))}
        </div>
      </div>

      {/* Hesaplama özeti */}
      <div className="mt-1 sm:mt-2 text-xs sm:text-sm">
        <p className="flex justify-between text-slate-300">
          <span>{t.metal}</span>
          <span>{selectedMetal}</span>
        </p>
        <p className="flex justify-between text-slate-300">
          <span>{t.annualRate}</span>
          <span>%{(activeRate * 100).toFixed(1)}</span>
        </p>
        <p className="flex justify-between text-slate-300">
          <span>{t.selectedDuration}</span>
          <span>{duration} {t.month}</span>
        </p>

        {result && (
          <>
            <p className="flex justify-between mt-1.5 sm:mt-2 font-medium text-slate-50">
              <span>{t.totalYield}</span>
              <span>{result.yieldGrams.toFixed(2)} g</span>
            </p>
            <p className="flex justify-between text-slate-50">
              <span>{t.endTotal}</span>
              <span>{result.totalGrams.toFixed(2)} g</span>
            </p>
          </>
        )}
      </div>

      <p className="mt-0.5 sm:mt-1 text-[9px] sm:text-[10px] text-slate-500">
        {t.disclaimer}
      </p>
    </div>
  );
}
