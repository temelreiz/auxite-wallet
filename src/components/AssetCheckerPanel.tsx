"use client";

import { useState } from "react";
import type { UiLang } from "@/app/page";
import { useAllocationChecker } from "@/hooks/useAllocationChecker";
import { METALS } from "@/lib/metals";

type Props = {
  lang: UiLang;
};

export default function AssetCheckerPanel({ lang }: Props) {
  const [input, setInput] = useState("");
  const [activeAddress, setActiveAddress] = useState<string | undefined>();

  const { records, loading, error } = useAllocationChecker(activeAddress);

  const t = (tr: string, en: string) => (lang === "tr" ? tr : en);

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

  const formatDate = (ts: bigint) => {
    const d = new Date(Number(ts) * 1000);
    return d.toLocaleString(lang === "tr" ? "tr-TR" : "en-US");
  };

  const formatGrams = (g: bigint) => {
    // kontrat decimals = 3 → 1 token = 1 gram, register "grams" doğrudan gram ise:
    return `${g.toString()} g`;
  };

  return (
    <section className="mt-8">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-4">
        {/* Header */}
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold">
              {t("Varlıklarım Nerede?", "Where are my assets?")}
            </h2>
            <p className="mt-1 max-w-xl text-xs text-slate-400">
              {t(
                "Auxite RWA metal tokenlarınızın hangi allocation kayıtlarında, hangi saklayıcıda tutulduğunu görmek için cüzdan adresinizi girin.",
                "Enter a wallet address to see which allocation records and custodians hold your Auxite RWA metal tokens.",
              )}
            </p>
          </div>

          <div className="flex w-full gap-2 sm:w-auto">
            <input
              className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
              placeholder={t(
                "0x ile başlayan Ethereum cüzdan adresi",
                "Ethereum address starting with 0x",
              )}
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
              {loading ? t("Sorgulanıyor…", "Checking…") : t("Sorgula", "Check")}
            </button>
          </div>
        </div>

        {/* Info / error */}
        {error && (
          <p className="mb-2 text-xs text-red-400">
            {t("Hata:", "Error:")} {error}
          </p>
        )}

        {!activeAddress && !error && (
          <p className="mt-1 text-[11px] text-slate-500">
            {t(
              "Sorgulama yapmak için cüzdan adresinizi girin.",
              "Enter an address and click Check to see allocation records.",
            )}
          </p>
        )}

        {activeAddress && !loading && records.length === 0 && !error && (
          <p className="mt-1 text-[11px] text-slate-500">
            {t(
              "Bu adres için kayıtlı allocation bulunamadı.",
              "No allocation records found for this address.",
            )}
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
                    {getMetalLabel(r.metalId)} ·{" "}
                    {t("Allocation", "Allocation")} #{r.id.toString()}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {t("Gram:", "Grams:")} {formatGrams(r.grams)} ·{" "}
                    {t("Saklayıcı:", "Custodian:")} {r.custodian || "-"}
                  </span>
                </div>

                <div className="text-right text-[11px] text-slate-400">
                  <div>{t("Alım Tarihi", "Purchase time")}</div>
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
