"use client";

import { useState } from "react";
import { useAllocationChecker } from "@/hooks/useAllocationChecker";
import { METALS } from "@/lib/metals";
import { useLanguage } from "@/components/LanguageContext";

type Props = {
  lang?: string;
};

// ============================================
// LOCAL TRANSLATIONS - 6 Language Support
// ============================================
const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "Varlıklarım Nerede?",
    subtitle: "Auxite RWA metal tokenlarınızın hangi allocation kayıtlarında, hangi saklayıcıda tutulduğunu görmek için cüzdan adresinizi girin.",
    placeholder: "0x ile başlayan Ethereum cüzdan adresi",
    check: "Sorgula",
    checking: "Sorgulanıyor…",
    error: "Hata:",
    enterAddress: "Sorgulama yapmak için cüzdan adresinizi girin.",
    noRecords: "Bu adres için kayıtlı allocation bulunamadı.",
    allocation: "Allocation",
    grams: "Gram:",
    custodian: "Saklayıcı:",
    purchaseTime: "Alım Tarihi",
  },
  en: {
    title: "Where are my assets?",
    subtitle: "Enter a wallet address to see which allocation records and custodians hold your Auxite RWA metal tokens.",
    placeholder: "Ethereum address starting with 0x",
    check: "Check",
    checking: "Checking…",
    error: "Error:",
    enterAddress: "Enter an address and click Check to see allocation records.",
    noRecords: "No allocation records found for this address.",
    allocation: "Allocation",
    grams: "Grams:",
    custodian: "Custodian:",
    purchaseTime: "Purchase time",
  },
  de: {
    title: "Wo sind meine Vermögenswerte?",
    subtitle: "Geben Sie eine Wallet-Adresse ein, um zu sehen, welche Allokationseinträge und Verwahrer Ihre Auxite RWA-Metall-Token halten.",
    placeholder: "Ethereum-Adresse beginnend mit 0x",
    check: "Prüfen",
    checking: "Wird geprüft…",
    error: "Fehler:",
    enterAddress: "Geben Sie eine Adresse ein und klicken Sie auf Prüfen, um Allokationseinträge zu sehen.",
    noRecords: "Keine Allokationseinträge für diese Adresse gefunden.",
    allocation: "Allokation",
    grams: "Gramm:",
    custodian: "Verwahrer:",
    purchaseTime: "Kaufzeit",
  },
  fr: {
    title: "Où sont mes actifs?",
    subtitle: "Entrez une adresse de portefeuille pour voir quels enregistrements d'allocation et dépositaires détiennent vos tokens métaux Auxite RWA.",
    placeholder: "Adresse Ethereum commençant par 0x",
    check: "Vérifier",
    checking: "Vérification…",
    error: "Erreur:",
    enterAddress: "Entrez une adresse et cliquez sur Vérifier pour voir les enregistrements d'allocation.",
    noRecords: "Aucun enregistrement d'allocation trouvé pour cette adresse.",
    allocation: "Allocation",
    grams: "Grammes:",
    custodian: "Dépositaire:",
    purchaseTime: "Date d'achat",
  },
  ar: {
    title: "أين أصولي؟",
    subtitle: "أدخل عنوان المحفظة لمعرفة سجلات التخصيص والأمناء الذين يحتفظون برموز معادن Auxite RWA الخاصة بك.",
    placeholder: "عنوان Ethereum يبدأ بـ 0x",
    check: "تحقق",
    checking: "جاري التحقق…",
    error: "خطأ:",
    enterAddress: "أدخل عنواناً وانقر على تحقق لرؤية سجلات التخصيص.",
    noRecords: "لم يتم العثور على سجلات تخصيص لهذا العنوان.",
    allocation: "التخصيص",
    grams: "الجرامات:",
    custodian: "الأمين:",
    purchaseTime: "وقت الشراء",
  },
  ru: {
    title: "Где мои активы?",
    subtitle: "Введите адрес кошелька, чтобы узнать, в каких записях распределения и у каких хранителей находятся ваши токены металлов Auxite RWA.",
    placeholder: "Адрес Ethereum, начинающийся с 0x",
    check: "Проверить",
    checking: "Проверка…",
    error: "Ошибка:",
    enterAddress: "Введите адрес и нажмите Проверить, чтобы увидеть записи распределения.",
    noRecords: "Записи распределения для этого адреса не найдены.",
    allocation: "Распределение",
    grams: "Граммы:",
    custodian: "Хранитель:",
    purchaseTime: "Время покупки",
  },
};

export default function AssetCheckerPanel({ lang: propLang }: Props) {
  const { lang: contextLang } = useLanguage();
  const lang = propLang || contextLang || "en";
  const t = translations[lang] || translations.en;
  
  const [input, setInput] = useState("");
  const [activeAddress, setActiveAddress] = useState<string | undefined>();

  const { records, loading, error } = useAllocationChecker(activeAddress);

  const handleSearch = () => {
    const trimmed = input.trim();
    if (trimmed) {
      setActiveAddress(trimmed);
    }
  };

  const isValidLikeAddress = /^0x[0-9a-fA-F]{40}$/.test(input.trim());

  const getMetalLabel = (id: string) => {
    const m = METALS.find((x) => x.id === id);
    return m ? m.symbol : id;
  };

  const locale = lang === "tr" ? "tr-TR" : lang === "de" ? "de-DE" : lang === "fr" ? "fr-FR" : lang === "ar" ? "ar-SA" : lang === "ru" ? "ru-RU" : "en-US";

  const formatDate = (ts: bigint) => {
    const d = new Date(Number(ts) * 1000);
    return d.toLocaleString(locale);
  };

  const formatGrams = (g: bigint) => {
    return `${g.toString()} g`;
  };

  return (
    <section className="mt-8">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-4">
        {/* Header */}
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold">
              {t.title}
            </h2>
            <p className="mt-1 max-w-xl text-xs text-slate-400">
              {t.subtitle}
            </p>
          </div>

          <div className="flex w-full gap-2 sm:w-auto">
            <input
              className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
              placeholder={t.placeholder}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={!isValidLikeAddress || loading}
              className={
                "rounded-xl px-3 py-1.5 text-xs font-semibold transition " +
                (isValidLikeAddress && !loading
                  ? "bg-emerald-500 text-white hover:bg-emerald-400"
                  : "cursor-not-allowed bg-slate-700 text-slate-300")
              }
            >
              {loading ? t.checking : t.check}
            </button>
          </div>
        </div>

        {/* Info / error */}
        {error && (
          <p className="mb-2 text-xs text-red-400">
            {t.error} {error}
          </p>
        )}

        {!activeAddress && !error && (
          <p className="mt-1 text-[11px] text-slate-500">
            {t.enterAddress}
          </p>
        )}

        {activeAddress && !loading && records.length === 0 && !error && (
          <p className="mt-1 text-[11px] text-slate-500">
            {t.noRecords}
          </p>
        )}

        {/* Allocation listesi */}
        {records.length > 0 && (
          <div className="mt-3 space-y-2">
            {records.map((r) => (
              <div
                key={`${r.metalId}-${r.id.toString()}`}
                className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-100 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold">
                    {getMetalLabel(r.metalId)} · {t.allocation} #{r.id.toString()}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {t.grams} {formatGrams(r.grams)} · {t.custodian} {r.custodian || "-"}
                  </span>
                </div>

                <div className="text-right text-[11px] text-slate-400">
                  <div>{t.purchaseTime}</div>
                  <div className="font-mono">{formatDate(r.timestamp)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
