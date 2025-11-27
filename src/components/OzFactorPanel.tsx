"use client";

import { useState, useEffect } from "react";
type UiLang = "tr" | "en";
type UiTheme = "dark" | "light";
import { useMetalsPrices } from "@/hooks/useMetalsPrices";

type Props = {
  lang: UiLang;
  theme: UiTheme;
};

export default function OzFactorPanel({ lang, theme }: Props) {
  const isDark = theme === "dark";
  const { ozFactor, setOzFactor } = useMetalsPrices();
  const [inputValue, setInputValue] = useState(ozFactor.toString());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setInputValue(ozFactor.toString());
  }, [ozFactor]);

  const handleApply = () => {
    const newFactor = parseFloat(inputValue);
    if (!isNaN(newFactor) && newFactor > 0) {
      setOzFactor(newFactor);
      setIsOpen(false);
    }
  };

  const handleReset = () => {
    const defaultFactor = 31.1034768;
    setInputValue(defaultFactor.toString());
    setOzFactor(defaultFactor);
  };

  const cardCls = isDark
    ? "rounded-2xl border border-amber-500/40 bg-amber-950/20 px-4 py-3 shadow-sm"
    : "rounded-2xl border border-amber-400 bg-amber-50 px-4 py-3 shadow-sm";

  const buttonCls = isDark
    ? "rounded-lg border border-amber-500/60 bg-amber-900/40 px-3 py-1.5 text-xs text-amber-300 hover:bg-amber-900/60 transition"
    : "rounded-lg border border-amber-400 bg-amber-100 px-3 py-1.5 text-xs text-amber-900 hover:bg-amber-200 transition";

  const inputCls = isDark
    ? "w-full rounded-lg border border-amber-700 bg-amber-950/60 px-3 py-2 text-sm text-amber-100 outline-none focus:border-amber-500"
    : "w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-amber-900 outline-none focus:border-amber-500";

  return (
    <section className="mt-6">
      <div className={cardCls}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-amber-400">
              ⚖️ {lang === "tr" ? "Oz Faktörü Ayarı" : "Oz Factor Setting"}
            </div>
            <div className="mt-1 text-[11px] text-amber-300/80">
              {lang === "tr"
                ? `Mevcut: ${ozFactor.toFixed(4)} (1 oz = ${ozFactor.toFixed(4)} gram)`
                : `Current: ${ozFactor.toFixed(4)} (1 oz = ${ozFactor.toFixed(4)} grams)`}
            </div>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className={buttonCls}
          >
            {isOpen 
              ? (lang === "tr" ? "Kapat" : "Close")
              : (lang === "tr" ? "Değiştir" : "Change")}
          </button>
        </div>

        {isOpen && (
          <div className="mt-4 space-y-3 border-t border-amber-500/30 pt-4">
            <div>
              <label className="block text-xs text-amber-300/80 mb-1">
                {lang === "tr" 
                  ? "Yeni Oz Faktörü (gram)" 
                  : "New Oz Factor (grams)"}
              </label>
              <input
                type="number"
                step="0.0001"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className={inputCls}
                placeholder="31.1034768"
              />
              <div className="mt-1 text-[10px] text-amber-300/60">
                {lang === "tr"
                  ? "Örnek: 30.15 yazarsanız, tüm fiyatlar bu oz faktörüne göre yeniden hesaplanır"
                  : "Example: If you enter 30.15, all prices will be recalculated with this oz factor"}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleApply}
                className="flex-1 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-400 transition"
              >
                {lang === "tr" ? "Uygula" : "Apply"}
              </button>
              
              <button
                onClick={handleReset}
                className={buttonCls}
              >
                {lang === "tr" ? "Sıfırla" : "Reset"}
              </button>
            </div>

            <div className="rounded-lg border border-amber-500/30 bg-amber-950/40 p-3 text-[11px] text-amber-200/80">
              <div className="font-semibold mb-1">
                💡 {lang === "tr" ? "Nasıl Çalışır?" : "How It Works?"}
              </div>
              <div>
                {lang === "tr"
                  ? "Oz faktörü değiştiğinde, Oracle'dan gelen USD/oz fiyatı bu faktöre göre USD/gram'a çevrilir. Örneğin: 4060 USD/oz ÷ 30.15 = 134.73 USD/g"
                  : "When oz factor changes, the USD/oz price from Oracle is converted to USD/gram using this factor. Example: 4060 USD/oz ÷ 30.15 = 134.73 USD/g"}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
