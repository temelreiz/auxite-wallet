"use client";

import { useState, useEffect, useCallback } from "react";
import TopNav from "@/components/TopNav";
import { useLanguage } from "@/components/LanguageContext";
import { useWallet } from "@/components/WalletContext";
import { useToast } from "@/components/ToastProvider";

const METALS = ["AUXG", "AUXS", "AUXPT", "AUXPD"] as const;
type Metal = (typeof METALS)[number];

interface NavOrder {
  id: string;
  side: "buy" | "sell";
  metal: string;
  maker: string;
  remaining: number;
  status: string;
  createdAt: number;
}

const T: Record<string, Record<string, string>> = {
  en: {
    title: "Trade at NAV",
    subtitle: "Buy and sell metal at pure Net Asset Value — no spread. Auxite guarantees a NAV exit for sellers.",
    sell: "Sell",
    buy: "Buy",
    nav: "NAV (USD/gram)",
    sellAmt: "Grams to sell",
    buyAmt: "AUXM to spend",
    place: "Place order",
    placing: "Placing…",
    book: "Order book",
    myOrders: "My open orders",
    cancel: "Cancel",
    noOrders: "No open orders",
    feeNote: "0.5% fee on matched value (seller-side).",
    needAddr: "Please sign in first.",
  },
  tr: {
    title: "NAV'da İşlem",
    subtitle: "Metali saf Net Aktif Değer'den al-sat — spread yok. Auxite satıcıya NAV'da çıkış garantisi verir.",
    sell: "Sat",
    buy: "Al",
    nav: "NAV (USD/gram)",
    sellAmt: "Satılacak gram",
    buyAmt: "Harcanacak AUXM",
    place: "Emir ver",
    placing: "Gönderiliyor…",
    book: "Emir defteri",
    myOrders: "Açık emirlerim",
    cancel: "İptal",
    noOrders: "Açık emir yok",
    feeNote: "Eşleşen değerin %0.5'i komisyon (satıcıdan).",
    needAddr: "Önce giriş yapın.",
  },
};

export default function TradeNavPage() {
  const { lang } = useLanguage();
  const { address: ctxAddress } = useWallet();
  const { showToast } = useToast();
  const t = T[lang] || T.en;

  const address =
    ctxAddress || (typeof window !== "undefined" ? localStorage.getItem("auxite_wallet_address") : null);

  const [side, setSide] = useState<"sell" | "buy">("sell");
  const [metal, setMetal] = useState<Metal>("AUXG");
  const [amount, setAmount] = useState("");
  const [nav, setNav] = useState<number>(0);
  const [sells, setSells] = useState<NavOrder[]>([]);
  const [buys, setBuys] = useState<NavOrder[]>([]);
  const [loading, setLoading] = useState(false);

  const loadBook = useCallback(async () => {
    try {
      const res = await fetch(`/api/nav-clearing/book?metal=${metal}`);
      if (!res.ok) return;
      const d = await res.json();
      setNav(d.nav || 0);
      setSells(d.sells || []);
      setBuys(d.buys || []);
    } catch {
      /* ignore */
    }
  }, [metal]);

  useEffect(() => {
    loadBook();
    const id = setInterval(loadBook, 10000);
    return () => clearInterval(id);
  }, [loadBook]);

  const place = useCallback(async () => {
    if (!address) return showToast(t.needAddr, "error");
    const amt = parseFloat(amount);
    if (!(amt > 0)) return;
    setLoading(true);
    try {
      const res = await fetch("/api/nav-clearing/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, side, metal, amount: amt }),
      });
      const d = await res.json();
      if (d.success) {
        showToast(`${d.status}${d.matchedGrams ? ` · ${d.matchedGrams}g matched` : ""}`, "success");
        setAmount("");
        loadBook();
      } else {
        showToast(d.error || "Failed", "error");
      }
    } catch {
      showToast("Connection error", "error");
    } finally {
      setLoading(false);
    }
  }, [address, amount, side, metal, showToast, t, loadBook]);

  const cancel = useCallback(
    async (orderId: string) => {
      if (!address) return;
      try {
        const res = await fetch("/api/nav-clearing/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address, orderId }),
        });
        const d = await res.json();
        if (d.success) {
          showToast("Cancelled", "success");
          loadBook();
        } else {
          showToast(d.error || "Failed", "error");
        }
      } catch {
        showToast("Connection error", "error");
      }
    },
    [address, showToast, loadBook],
  );

  const myOrders = [...sells, ...buys].filter((o) => address && o.maker === address.toLowerCase());

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-slate-950">
      <TopNav />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">{t.title}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">{t.subtitle}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Order form */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-slate-800 p-6">
            <div className="flex gap-2 mb-4">
              {(["sell", "buy"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSide(s)}
                  className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                    side === s ? "bg-[#2F6F62] text-white shadow-md" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  {s === "sell" ? t.sell : t.buy}
                </button>
              ))}
            </div>

            <div className="flex gap-2 mb-4">
              {METALS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMetal(m)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                    metal === m
                      ? "border-[#BFA181] bg-[#BFA181]/10 text-[#BFA181]"
                      : "border-stone-200 dark:border-slate-700 text-slate-500"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">{t.nav}</span>
              <span className="font-semibold text-slate-800 dark:text-white">
                {nav ? `$${nav.toFixed(4)}` : "—"}
              </span>
            </div>

            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={side === "sell" ? t.sellAmt : t.buyAmt}
              className="w-full px-4 py-2.5 rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
            />

            <button
              onClick={place}
              disabled={loading || !(parseFloat(amount) > 0)}
              className="w-full mt-4 py-3 bg-[#2F6F62] text-white font-semibold rounded-xl hover:bg-[#1d4f47] disabled:opacity-50"
            >
              {loading ? t.placing : t.place}
            </button>
            <p className="mt-3 text-xs text-slate-400">{t.feeNote}</p>
          </div>

          {/* Book + my orders */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-slate-800 p-6">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                {t.book} · {metal}
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-[#2F6F62] font-semibold mb-1">{t.buy}</p>
                  {buys.length === 0 && <p className="text-slate-400">—</p>}
                  {buys.map((o) => (
                    <p key={o.id} className="text-slate-600 dark:text-slate-400">
                      {o.remaining.toFixed(2)} AUXM
                    </p>
                  ))}
                </div>
                <div>
                  <p className="text-[#BFA181] font-semibold mb-1">{t.sell}</p>
                  {sells.length === 0 && <p className="text-slate-400">—</p>}
                  {sells.map((o) => (
                    <p key={o.id} className="text-slate-600 dark:text-slate-400">
                      {o.remaining.toFixed(4)} g
                    </p>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-slate-800 p-6">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{t.myOrders}</h3>
              {myOrders.length === 0 && <p className="text-xs text-slate-400">{t.noOrders}</p>}
              {myOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between py-1.5 text-xs border-b border-stone-100 dark:border-slate-800 last:border-0">
                  <span className="text-slate-600 dark:text-slate-400">
                    {o.side === "sell" ? t.sell : t.buy} {o.metal} ·{" "}
                    {o.side === "sell" ? `${o.remaining.toFixed(4)} g` : `${o.remaining.toFixed(2)} AUXM`}
                  </span>
                  <button onClick={() => cancel(o.id)} className="text-red-500 hover:text-red-600 font-medium">
                    {t.cancel}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
