// src/components/PriceCard.tsx
"use client";

import { GoldPrice, PriceDirection } from "@/hooks/useGoldPrice";
import { useLanguage } from "@/components/LanguageContext";

const translations: Record<string, Record<string, string>> = {
  tr: {
    auxiteGoldPrice: "Auxite Alt\u0131n Fiyat\u0131",
    oneOzGold: "1 oz Alt\u0131n",
    loading: "Y\u00fckleniyor...",
    errorPrefix: "Hata",
    errorHint: "L\u00fctfen .env.local ve GOLDAPI anahtar\u0131n\u0131 kontrol edin.",
    lastUpdated: "Son g\u00fcncelleme",
  },
  en: {
    auxiteGoldPrice: "Auxite Gold Price",
    oneOzGold: "1 oz Gold",
    loading: "Loading...",
    errorPrefix: "Error",
    errorHint: "Please check .env.local and GOLDAPI key.",
    lastUpdated: "Last updated",
  },
  de: {
    auxiteGoldPrice: "Auxite Goldpreis",
    oneOzGold: "1 oz Gold",
    loading: "Laden...",
    errorPrefix: "Fehler",
    errorHint: "Bitte \u00fcberpr\u00fcfen Sie .env.local und den GOLDAPI-Schl\u00fcssel.",
    lastUpdated: "Letzte Aktualisierung",
  },
  fr: {
    auxiteGoldPrice: "Prix de l'or Auxite",
    oneOzGold: "1 oz Or",
    loading: "Chargement...",
    errorPrefix: "Erreur",
    errorHint: "Veuillez v\u00e9rifier .env.local et la cl\u00e9 GOLDAPI.",
    lastUpdated: "Derni\u00e8re mise \u00e0 jour",
  },
  ar: {
    auxiteGoldPrice: "\u0633\u0639\u0631 \u0630\u0647\u0628 \u0623\u0648\u0643\u0633\u0627\u064a\u062a",
    oneOzGold: "1 \u0623\u0648\u0646\u0635\u0629 \u0630\u0647\u0628",
    loading: "\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0645\u064a\u0644...",
    errorPrefix: "\u062e\u0637\u0623",
    errorHint: "\u064a\u0631\u062c\u0649 \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 .env.local \u0648\u0645\u0641\u062a\u0627\u062d GOLDAPI.",
    lastUpdated: "\u0622\u062e\u0631 \u062a\u062d\u062f\u064a\u062b",
  },
  ru: {
    auxiteGoldPrice: "\u0426\u0435\u043d\u0430 \u0437\u043e\u043b\u043e\u0442\u0430 Auxite",
    oneOzGold: "1 \u0443\u043d\u0446\u0438\u044f \u0437\u043e\u043b\u043e\u0442\u0430",
    loading: "\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...",
    errorPrefix: "\u041e\u0448\u0438\u0431\u043a\u0430",
    errorHint: "\u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 .env.local \u0438 \u043a\u043b\u044e\u0447 GOLDAPI.",
    lastUpdated: "\u041f\u043e\u0441\u043b\u0435\u0434\u043d\u0435\u0435 \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u0438\u0435",
  },
};

type Props = {
  data: GoldPrice | null;
  direction: PriceDirection;
  loading: boolean;
  error: string | null;
};

function DirectionArrow({ direction }: { direction: PriceDirection }) {
  if (direction === "up") {
    return <span className="text-green-500 text-xl ml-2">↑</span>;
  }
  if (direction === "down") {
    return <span className="text-red-500 text-xl ml-2">↓</span>;
  }
  return <span className="text-gray-400 text-xl ml-2">→</span>;
}

export default function PriceCard({ data, direction, loading, error }: Props) {
  const { lang } = useLanguage();
  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;

  const priceText =
    data?.price != null ? data.price.toFixed(2) : loading ? t("loading") : "-";

  const localeMap: Record<string, string> = {
    tr: "tr-TR",
    en: "en-US",
    de: "de-DE",
    fr: "fr-FR",
    ar: "ar-SA",
    ru: "ru-RU",
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">
            {t("auxiteGoldPrice")}
          </p>
          <p className="text-lg font-semibold text-gray-900">{t("oneOzGold")}</p>
        </div>
        <div className="flex items-center">
          <p className="text-2xl font-bold tabular-nums">{priceText}</p>
          <span className="ml-1 text-sm text-gray-500">
            {data?.currency || "USD"}
          </span>
          <DirectionArrow direction={direction} />
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-500 mt-1">
          {t("errorPrefix")}: {error}. {t("errorHint")}
        </p>
      )}

      {!error && !loading && data?.timestamp && (
        <p className="text-[10px] text-gray-400 mt-1">
          {t("lastUpdated")}:{" "}
          {new Date(data.timestamp * 1000).toLocaleTimeString(localeMap[lang] || "en-US")}
        </p>
      )}
    </div>
  );
}
