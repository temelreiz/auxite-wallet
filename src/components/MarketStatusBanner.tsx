"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/components/LanguageContext";

const translations: Record<string, Record<string, string>> = {
  en: {
    weekendPrices: "Weekend Prices Applied",
    holidayPrices: "Holiday Prices Applied",
    liveMarket: "Live Market Prices",
    weekendNote: "Markets are closed. Prices reflect last Friday's close. Orders placed now will execute at market open price.",
    holidayNote: "Markets are closed for holiday. Orders placed now will execute when markets reopen.",
    pendingOrders: "Weekend orders will execute at real market price on Monday.",
  },
  tr: {
    weekendPrices: "Hafta Sonu Fiyatları Uygulanıyor",
    holidayPrices: "Tatil Fiyatları Uygulanıyor",
    liveMarket: "Canlı Piyasa Fiyatları",
    weekendNote: "Piyasalar kapalı. Fiyatlar Cuma kapanışını yansıtır. Verilen emirler piyasa açıldığında işleme alınacaktır.",
    holidayNote: "Piyasalar tatil nedeniyle kapalı. Verilen emirler piyasalar açıldığında işleme alınacaktır.",
    pendingOrders: "Hafta sonu emirleri Pazartesi gerçek piyasa fiyatından işleme alınacaktır.",
  },
  de: {
    weekendPrices: "Wochenendpreise angewendet",
    holidayPrices: "Feiertagspreise angewendet",
    liveMarket: "Live-Marktpreise",
    weekendNote: "Märkte sind geschlossen. Preise spiegeln den Freitagsschluss wider. Aufträge werden bei Marktöffnung ausgeführt.",
    holidayNote: "Märkte sind feiertagsbedingt geschlossen. Aufträge werden bei Wiedereröffnung ausgeführt.",
    pendingOrders: "Wochenendaufträge werden am Montag zum realen Marktpreis ausgeführt.",
  },
  fr: {
    weekendPrices: "Prix du week-end appliqués",
    holidayPrices: "Prix des jours fériés appliqués",
    liveMarket: "Prix du marché en direct",
    weekendNote: "Les marchés sont fermés. Les prix reflètent la clôture de vendredi. Les ordres seront exécutés à l'ouverture du marché.",
    holidayNote: "Les marchés sont fermés pour cause de jour férié. Les ordres seront exécutés à la réouverture.",
    pendingOrders: "Les ordres du week-end seront exécutés au prix réel du marché lundi.",
  },
  ar: {
    weekendPrices: "أسعار عطلة نهاية الأسبوع مطبقة",
    holidayPrices: "أسعار العطلة مطبقة",
    liveMarket: "أسعار السوق المباشرة",
    weekendNote: "الأسواق مغلقة. الأسعار تعكس إغلاق يوم الجمعة. سيتم تنفيذ الطلبات عند فتح السوق.",
    holidayNote: "الأسواق مغلقة بسبب العطلة. سيتم تنفيذ الطلبات عند إعادة فتح الأسواق.",
    pendingOrders: "سيتم تنفيذ طلبات عطلة نهاية الأسبوع بسعر السوق الحقيقي يوم الاثنين.",
  },
  ru: {
    weekendPrices: "Применяются цены выходного дня",
    holidayPrices: "Применяются праздничные цены",
    liveMarket: "Рыночные цены в реальном времени",
    weekendNote: "Рынки закрыты. Цены отражают закрытие пятницы. Заказы будут исполнены при открытии рынка.",
    holidayNote: "Рынки закрыты из-за праздника. Заказы будут исполнены при открытии рынков.",
    pendingOrders: "Заказы выходного дня будут исполнены по реальной рыночной цене в понедельник.",
  },
};

interface MarketStatus {
  open: boolean;
  label: string;
  priceType: "live" | "weekend" | "holiday";
}

export function MarketStatusBanner() {
  const { lang } = useLanguage();
  const [status, setStatus] = useState<MarketStatus | null>(null);

  const t = (key: string) =>
    (translations as any)[lang]?.[key] || (translations as any).en[key] || key;

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/market-status");
        if (res.ok) {
          const data = await res.json();
          setStatus(data);
        }
      } catch (e) {
        console.error("Failed to fetch market status:", e);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!status || status.open) return null;

  const isHoliday = status.priceType === "holiday";

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <span className="text-2xl">{isHoliday ? "🏛️" : "⏸"}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              {isHoliday ? t("holidayPrices") : t("weekendPrices")}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {isHoliday ? t("holidayNote") : t("weekendNote")}
          </p>
          <p className="text-xs text-amber-500/70 mt-1.5 font-medium">
            ⚡ {t("pendingOrders")}
          </p>
        </div>
      </div>
    </div>
  );
}
