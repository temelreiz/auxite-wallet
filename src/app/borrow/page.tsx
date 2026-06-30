"use client";
import { useState, useEffect, useCallback } from "react";
import TopNav from "@/components/TopNav";

const WALLET_KEY = "auxite_wallet_address";
const METALS = [
  { sym: "AUXG", name: "Gold" },
  { sym: "AUXS", name: "Silver" },
  { sym: "AUXPT", name: "Platinum" },
  { sym: "AUXPD", name: "Palladium" },
];
const TERMS = [3, 6, 12];
const fmt = (n: number, d = 2) => (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

export default function BorrowPage() {
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // form
  const [metal, setMetal] = useState("AUXG");
  const [grams, setGrams] = useState("");
  const [term, setTerm] = useState(6);
  const [borrowAmt, setBorrowAmt] = useState("");
  const [quote, setQuote] = useState<any>(null);
  const [tcAccept, setTcAccept] = useState(false);
  const [twoFA, setTwoFA] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const a = localStorage.getItem(WALLET_KEY);
    setAddress(a);
    setLoading(false);
  }, []);

  const fetchData = useCallback(async () => {
    if (!address) return;
    try {
      const r = await fetch(`/api/borrow?address=${address}`);
      setData(await r.json());
    } catch (e) { /* noop */ }
  }, [address]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // live quote when metal/grams/term change
  useEffect(() => {
    const g = parseFloat(grams);
    if (!address || !(g > 0)) { setQuote(null); return; }
    const id = setTimeout(async () => {
      try {
        const r = await fetch(`/api/borrow?address=${address}&metal=${metal}&grams=${g}&term=${term}`);
        const j = await r.json();
        setQuote(j.quote || null);
      } catch { setQuote(null); }
    }, 250);
    return () => clearTimeout(id);
  }, [address, metal, grams, term]);

  const maxBorrow = quote?.ok ? quote.maxBorrow : 0;
  const principal = Math.min(parseFloat(borrowAmt) || 0, maxBorrow);
  const apr = quote?.apr ?? data?.aprByTerm?.[term] ?? 0;
  const origFee = principal * (data?.originationFee ?? 0.01);
  const net = Math.max(0, principal - origFee);
  const liqPrice = principal > 0 && quote?.ok ? principal / (parseFloat(grams) * (quote.liqLtv || 0.7)) : 0;

  const doBorrow = async () => {
    setMsg(null); setBusy(true);
    try {
      const r = await fetch("/api/borrow", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, metal, collateralGrams: parseFloat(grams), principalUSDC: principal, termMonths: term, termsAccepted: tcAccept, twoFactorCode: twoFA }),
      });
      const j = await r.json();
      if (!r.ok || !j.success) { setMsg({ ok: false, text: j.error || "Borrow failed" }); }
      else {
        setMsg({ ok: true, text: `Borrowed ${fmt(j.disbursedUSDC)} USDC against ${fmt(parseFloat(grams), 3)}g ${metal}. ${fmt(parseFloat(grams), 3)}g locked.` });
        setGrams(""); setBorrowAmt(""); setTcAccept(false); setTwoFA("");
        fetchData();
      }
    } catch (e: any) { setMsg({ ok: false, text: e?.message || "error" }); }
    setBusy(false);
  };

  const doRepay = async (loanId: string, owed: number) => {
    const amt = prompt(`Repay how much USDC? (owed: ${fmt(owed)})`, owed.toFixed(2));
    if (!amt) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/borrow/repay", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, loanId, amountUSDC: parseFloat(amt) }),
      });
      const j = await r.json();
      if (!r.ok || !j.success) setMsg({ ok: false, text: j.error || "Repay failed" });
      else setMsg({ ok: true, text: j.closed ? `Loan repaid — ${fmt(j.releasedGrams, 3)}g released ✓` : `Paid ${fmt(j.paidUSDC)} USDC — ${fmt(j.remainingOwed)} remaining` });
      fetchData();
    } catch (e: any) { setMsg({ ok: false, text: e?.message || "error" }); }
    setBusy(false);
  };

  if (loading) return <main className="min-h-screen bg-stone-100 dark:bg-slate-950 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-stone-300 border-t-[#BFA181] rounded-full" /></main>;

  const card = "rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900/50";

  return (
    <main className="min-h-screen bg-stone-100 dark:bg-slate-950 text-slate-900 dark:text-white pb-24 sm:pb-10">
      <TopNav />
      <div className="border-b border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900/30">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <h1 className="text-lg sm:text-xl font-bold">Borrow against your metal</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Unlock USDC without selling — your metal stays yours.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {!address ? (
          <div className={`${card} p-8 text-center`}>
            <p className="text-slate-500">Connect your wallet to borrow.</p>
          </div>
        ) : (
          <>
            {/* Pool */}
            {data?.pool && (
              <div className={`${card} p-4 flex items-center justify-between text-sm`}>
                <span className="text-slate-500">Pool available</span>
                <span className="font-semibold">${fmt(data.pool.available)} / ${fmt(data.pool.cap)}</span>
              </div>
            )}

            {/* Borrow form */}
            <div className={`${card} p-5 space-y-4`}>
              <h2 className="font-semibold">New loan</h2>

              <div>
                <label className="text-xs text-slate-500">Collateral metal</label>
                <div className="grid grid-cols-4 gap-2 mt-1">
                  {METALS.map((m) => (
                    <button key={m.sym} onClick={() => setMetal(m.sym)}
                      className={`py-2 rounded-xl text-xs font-medium border ${metal === m.sym ? "border-[#BFA181] bg-[#BFA181]/10 text-[#BFA181]" : "border-stone-200 dark:border-slate-700 text-slate-500"}`}>
                      {m.sym}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500">Collateral (grams)</label>
                  <input type="number" value={grams} onChange={(e) => setGrams(e.target.value)} placeholder="100"
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-stone-200 dark:border-slate-700 bg-transparent" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Term</label>
                  <div className="grid grid-cols-3 gap-1 mt-1">
                    {TERMS.map((tm) => (
                      <button key={tm} onClick={() => setTerm(tm)}
                        className={`py-2 rounded-xl text-xs font-medium border ${term === tm ? "border-[#BFA181] bg-[#BFA181]/10 text-[#BFA181]" : "border-stone-200 dark:border-slate-700 text-slate-500"}`}>
                        {tm}mo
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {quote?.ok && (
                <div className="rounded-xl bg-stone-50 dark:bg-slate-800/50 p-3 text-sm space-y-1">
                  <Row k="Collateral value" v={`$${fmt(quote.collateralValue)}`} />
                  <Row k={`Max borrow (LTV ${(quote.maxLtv * 100).toFixed(0)}%)`} v={`$${fmt(quote.maxBorrow)}`} />
                  <Row k="APR" v={`${(apr * 100).toFixed(0)}%`} />
                </div>
              )}

              <div>
                <label className="text-xs text-slate-500">Borrow amount (USDC)</label>
                <input type="number" value={borrowAmt} onChange={(e) => setBorrowAmt(e.target.value)} placeholder={maxBorrow ? `up to ${fmt(maxBorrow)}` : "0"}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-stone-200 dark:border-slate-700 bg-transparent" />
              </div>

              {principal > 0 && quote?.ok && (
                <div className="rounded-xl bg-stone-50 dark:bg-slate-800/50 p-3 text-sm space-y-1">
                  <Row k="Origination fee (1%)" v={`−$${fmt(origFee)}`} />
                  <Row k="You receive" v={`$${fmt(net)}`} strong />
                  <Row k="Liquidation price" v={`$${fmt(liqPrice)}/g`} />
                  <Row k="Locked collateral" v={`${fmt(parseFloat(grams), 3)}g ${metal}`} />
                </div>
              )}

              {/* T&C + 2FA */}
              <label className="flex items-start gap-2 text-xs text-slate-500">
                <input type="checkbox" checked={tcAccept} onChange={(e) => setTcAccept(e.target.checked)} className="mt-0.5" />
                <span>I accept the loan Terms: my {metal} collateral is <b>locked for the term</b> (cannot be sold, withdrawn, converted, transferred or staked), and is <b>liquidated at NAV</b> if I don't repay or the price falls to the liquidation level.</span>
              </label>
              <input value={twoFA} onChange={(e) => setTwoFA(e.target.value)} placeholder="2FA code"
                className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-slate-700 bg-transparent text-sm" />

              <button disabled={busy || !(principal > 0) || !tcAccept || !twoFA}
                onClick={doBorrow}
                className="w-full py-3 rounded-xl font-semibold bg-[#BFA181] text-white disabled:opacity-40">
                {busy ? "…" : `Borrow $${fmt(net)} USDC`}
              </button>

              {msg && <p className={`text-sm ${msg.ok ? "text-emerald-600" : "text-red-500"}`}>{msg.text}</p>}
            </div>

            {/* Active loans */}
            <div className="space-y-3">
              <h2 className="font-semibold text-sm text-slate-500">Your loans</h2>
              {(!data?.loans || data.loans.length === 0) && <p className="text-sm text-slate-400">No active loans.</p>}
              {(data?.loans || []).map((l: any) => (
                <div key={l.id} className={`${card} p-4 space-y-2`}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{fmt(l.collateralGrams, 3)}g {l.metal}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#BFA181]/10 text-[#BFA181]">{l.status}</span>
                  </div>
                  <Row k="Borrowed" v={`$${fmt(l.principalUSDC)} @ ${(l.apr * 100).toFixed(0)}% · ${l.termMonths}mo`} />
                  <Row k="Owed now" v={`$${fmt(l.owed)}`} strong />
                  <Row k="Liquidation price" v={`$${fmt(l.liquidationPrice)}/g`} />
                  <Row k="Maturity" v={new Date(l.maturityDate).toLocaleDateString()} />
                  <button disabled={busy} onClick={() => doRepay(l.id, l.owed)}
                    className="w-full mt-1 py-2 rounded-xl text-sm font-medium border border-[#BFA181] text-[#BFA181] disabled:opacity-40">
                    Repay
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{k}</span>
      <span className={strong ? "font-bold" : "font-medium"}>{v}</span>
    </div>
  );
}
