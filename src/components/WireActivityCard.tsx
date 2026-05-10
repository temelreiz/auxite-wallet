// src/components/WireActivityCard.tsx
//
// Compact widget that surfaces the user's bank-wire activity on the vault
// home. Two states:
//   - has wires → list last N credits with date, amount, AUXM result
//   - empty     → hint + reference code to encourage first wire
//
// Pulls from /api/wise/user-wires?address=...

"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageContext";

interface WireItem {
  id: string;
  timestamp?: number;
  currency?: string;
  amount?: number;
  auxmCredited?: number;
  senderName?: string;
  reference?: string | null;
  status?: string;
}

interface ApiResponse {
  success: boolean;
  reference: string;
  wires: WireItem[];
  total: number;
}

const t = (lang: string) => {
  const dict: Record<string, Record<string, string>> = {
    tr: {
      title: "Banka Havalesi",
      empty: "Henüz havale almadınız",
      emptyHint: "Havale gönderirken bu referansı mutlaka ekleyin:",
      recent: "Son havaleler",
      credited: "yatırıldı",
      from: "Gönderen",
      reference: "Sizin Referansınız",
    },
    en: {
      title: "Bank Wire",
      empty: "No wires yet",
      emptyHint: "When sending a wire, always include this reference:",
      recent: "Recent wires",
      credited: "credited",
      from: "From",
      reference: "Your Reference",
    },
    de: {
      title: "Banküberweisung",
      empty: "Noch keine Überweisungen",
      emptyHint: "Geben Sie bei jeder Überweisung diese Referenz an:",
      recent: "Letzte Überweisungen",
      credited: "gutgeschrieben",
      from: "Absender",
      reference: "Ihre Referenz",
    },
    fr: {
      title: "Virement bancaire",
      empty: "Aucun virement pour l'instant",
      emptyHint: "Lors d'un virement, incluez toujours cette référence :",
      recent: "Virements récents",
      credited: "crédités",
      from: "De",
      reference: "Votre référence",
    },
    ar: {
      title: "حوالة بنكية",
      empty: "لا توجد حوالات بعد",
      emptyHint: "عند إرسال أي حوالة، ضمّن هذا المرجع دائماً:",
      recent: "آخر الحوالات",
      credited: "تم إيداعه",
      from: "من",
      reference: "مرجعك",
    },
    ru: {
      title: "Банковский перевод",
      empty: "Переводов пока нет",
      emptyHint: "При отправке перевода всегда указывайте эту ссылку:",
      recent: "Последние переводы",
      credited: "зачислено",
      from: "От",
      reference: "Ваш референс",
    },
  };
  return (k: string) => dict[lang]?.[k] || dict.en[k] || k;
};

function fmt(amt: number | undefined, currency?: string): string {
  if (amt === undefined || amt === null) return "";
  const s = amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency ? `${s} ${currency}` : s;
}

function timeAgo(ts: number | undefined, lang: string): string {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  const hr = Math.floor(diff / 3_600_000);
  const day = Math.floor(diff / 86_400_000);
  if (lang === "tr") {
    if (min < 1) return "az önce";
    if (min < 60) return `${min}dk önce`;
    if (hr < 24) return `${hr}sa önce`;
    return `${day}g önce`;
  }
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  return `${day}d ago`;
}

interface Props {
  walletAddress: string;
  onOpenWireModal?: () => void;
}

export function WireActivityCard({ walletAddress, onOpenWireModal }: Props) {
  const { lang } = useLanguage();
  const tr = t(lang);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!walletAddress) { setLoading(false); return; }
    (async () => {
      try {
        const res = await fetch(`/api/wise/user-wires?address=${walletAddress}&limit=3`);
        const json: ApiResponse = await res.json();
        if (!cancelled) setData(json);
      } catch {
        // silent — widget is non-critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [walletAddress]);

  if (loading || !data) return null;

  const hasWires = data.wires && data.wires.length > 0;

  return (
    <div className="rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#121A2A] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#BFA181]/15 flex items-center justify-center">
            <svg className="w-4 h-4 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">{tr("title")}</h3>
        </div>
        {onOpenWireModal && (
          <button
            onClick={onOpenWireModal}
            className="text-xs font-semibold text-[#BFA181] hover:text-[#D4B47A]"
          >
            +
          </button>
        )}
      </div>

      {hasWires ? (
        <>
          <ul className="space-y-2">
            {data.wires.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-white truncate">
                    {fmt(w.amount, w.currency)} {tr("credited")}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {w.senderName ? `${tr("from")} ${w.senderName} · ` : ""}{timeAgo(w.timestamp, lang)}
                  </p>
                </div>
                <span className="text-sm font-bold text-[#BFA181] whitespace-nowrap">
                  +{fmt(w.auxmCredited, "AUXM")}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">{tr("reference")}</p>
            <p className="font-mono text-sm text-[#BFA181] font-bold">{data.reference}</p>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{tr("empty")}</p>
          <div className="rounded-xl bg-[#BFA181]/10 border border-[#BFA181]/30 p-3">
            <p className="text-[10px] uppercase tracking-wider text-[#BFA181] font-semibold mb-1">{tr("reference")}</p>
            <p className="font-mono text-base text-[#BFA181] font-bold mb-2">{data.reference}</p>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{tr("emptyHint")}</p>
          </div>
        </>
      )}
    </div>
  );
}
