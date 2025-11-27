// src/components/AuxiteYieldPanel.tsx
"use client";

import { useState, useMemo } from "react";
import { METALS, MetalId } from "@/lib/metals";

type Duration = 3 | 6 | 12;

export default function AuxiteYieldPanel() {
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
        AuxiteYield – Çoklu Metal
      </h2>

      <p className="text-xs text-slate-400">
        AUXG, AUXS, AUXPT ve AUXPD için örnek getiri simülasyonu.
      </p>

      {/* Metal seçimi */}
      <div>
        <p className="text-xs font-medium text-slate-300 mb-1">Metal seçimi</p>
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
          Başlangıç miktarı (gram)
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
        <p className="text-xs font-medium text-slate-300 mb-1">Süre</p>
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
              {m} Ay
            </button>
          ))}
        </div>
      </div>

      {/* Hesaplama özeti */}
      <div className="mt-2 text-sm">
        <p className="flex justify-between text-slate-300">
          <span>Metal</span>
          <span>{selectedMetal}</span>
        </p>
        <p className="flex justify-between text-slate-300">
          <span>Varsayımsal Yıllık Oran</span>
          <span>%{(activeRate * 100).toFixed(1)}</span>
        </p>
        <p className="flex justify-between text-slate-300">
          <span>Seçilen Süre</span>
          <span>{duration} ay</span>
        </p>

        {result && (
          <>
            <p className="flex justify-between mt-2 font-medium text-slate-50">
              <span>Toplam Getiri</span>
              <span>{result.yieldGrams.toFixed(2)} g</span>
            </p>
            <p className="flex justify-between text-slate-50">
              <span>Vade Sonu Toplam</span>
              <span>{result.totalGrams.toFixed(2)} g</span>
            </p>
          </>
        )}
      </div>

      <p className="mt-1 text-[10px] text-slate-500">
        Bu sadece örnek hesaplama ekranıdır; yatırım tavsiyesi değildir.
      </p>
    </div>
  );
}
