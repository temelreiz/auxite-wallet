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
    title: "AuxiteYield — Çoklu Metal",
    subtitle: "AUXG, AUXS, AUXPT ve AUXPD için örnek getiri simülasyonu.",
    metalSelection: "Metal seçimi",
    initialAmount: "Başlangıç miktarı (gram)",
    duration: "Süre",
    month: "Ay",
    metal: "Metal",
    annualRate: "Varsayımsal Yıllık Oran",
    selectedDuration: "Seçilen Süre",
    totalYield: "Toplam Getiri",
    endTotal: "Vade Sonu Toplam",
    disclaimer: "Bu sadece örnek hesaplama ekranıdır; yatırım tavsiyesi değildir.",
  },
  en: {
    title: "AuxiteYield — Multi Metal",
    subtitle: "Example yield simulation for AUXG, AUXS, AUXPT and AUXPD.",
    metalSelection: "Metal selection",
    initialAmount: "Initial amount (grams)",
    duration: "Duration",
    month: "Mo",
    metal: "Metal",
    annualRate: "Assumed Annual Rate",
    selectedDuration: "Selected Duration",
    totalYield: "Total Yield",
    endTotal: "End of Term Total",
    disclaimer: "This is only a sample calculation screen; not investment advice.",
  },
  de: {
    title: "AuxiteYield — Multi Metall",
    subtitle: "Beispiel-Renditeberechnung für AUXG, AUXS, AUXPT und AUXPD.",
    metalSelection: "Metallauswahl",
    initialAmount: "Anfangsbetrag (Gramm)",
    duration: "Dauer",
    month: "Mo",
    metal: "Metall",
    annualRate: "Angenommene Jahresrate",
    selectedDuration: "Gewählte Dauer",
    totalYield: "Gesamtertrag",
    endTotal: "Endbetrag",
    disclaimer: "Dies ist nur ein Beispielrechner; keine Anlageberatung.",
  },
  fr: {
    title: "AuxiteYield — Multi Métal",
    subtitle: "Simulation de rendement exemple pour AUXG, AUXS, AUXPT et AUXPD.",
    metalSelection: "Sélection du métal",
    initialAmount: "Montant initial (grammes)",
    duration: "Durée",
    month: "Mois",
    metal: "Métal",
    annualRate: "Taux Annuel Supposé",
    selectedDuration: "Durée Sélectionnée",
    totalYield: "Rendement Total",
    endTotal: "Total Fin de Terme",
    disclaimer: "Ceci est uniquement un écran de calcul exemple; pas un conseil d'investissement.",
  },
  ar: {
    title: "AuxiteYield — متعدد المعادن",
    subtitle: "محاكاة عائد مثالية لـ AUXG و AUXS و AUXPT و AUXPD.",
    metalSelection: "اختيار المعدن",
    initialAmount: "المبلغ الأولي (جرام)",
    duration: "المدة",
    month: "شهر",
    metal: "المعدن",
    annualRate: "المعدل السنوي المفترض",
    selectedDuration: "المدة المختارة",
    totalYield: "إجمالي العائد",
    endTotal: "الإجمالي في نهاية المدة",
    disclaimer: "هذه مجرد شاشة حساب مثالية؛ ليست نصيحة استثمارية.",
  },
  ru: {
    title: "AuxiteYield — Мульти Металл",
    subtitle: "Пример расчёта доходности для AUXG, AUXS, AUXPT и AUXPD.",
    metalSelection: "Выбор металла",
    initialAmount: "Начальная сумма (грамм)",
    duration: "Срок",
    month: "Мес",
    metal: "Металл",
    annualRate: "Предполагаемая Годовая Ставка",
    selectedDuration: "Выбранный Срок",
    totalYield: "Общий Доход",
    endTotal: "Итого по Окончании",
    disclaimer: "Это только пример расчёта; не является инвестиционной рекомендацией.",
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
    <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4 flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-slate-50">
        {t.title}
      </h2>

      <p className="text-xs text-slate-400">
        {t.subtitle}
      </p>

      {/* Metal seçimi */}
      <div>
        <p className="text-xs font-medium text-slate-300 mb-1">{t.metalSelection}</p>
        <div className="inline-flex rounded-full bg-slate-800 p-1 flex-wrap gap-1">
          {METALS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedMetal(m.id)}
              className={
                "px-3 py-1 text-xs font-semibold rounded-full " +
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
        <label className="block text-xs font-medium text-slate-300 mb-1">
          {t.initialAmount}
        </label>
        <input
          type="number"
          min={0}
          step="0.01"
          value={amountGrams}
          onChange={(e) => setAmountGrams(e.target.value)}
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Süre seçimi */}
      <div>
        <p className="text-xs font-medium text-slate-300 mb-1">{t.duration}</p>
        <div className="inline-flex rounded-full bg-slate-800 p-1">
          {[3, 6, 12].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setDuration(m as Duration)}
              className={
                "px-3 py-1 text-xs font-semibold rounded-full " +
                (duration === m
                  ? "bg-emerald-500 text-white"
                  : "text-slate-200 hover:bg-slate-700")
              }
            >
              {m} {t.month}
            </button>
          ))}
        </div>
      </div>

      {/* Hesaplama özeti */}
      <div className="mt-2 text-sm">
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
            <p className="flex justify-between mt-2 font-medium text-slate-50">
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

      <p className="mt-1 text-[10px] text-slate-500">
        {t.disclaimer}
      </p>
    </div>
  );
}
