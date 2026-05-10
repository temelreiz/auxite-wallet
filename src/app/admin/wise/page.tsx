// src/app/admin/wise/page.tsx
//
// Admin console for Wise incoming-wire ops. Surfaces:
//   - Recent webhook events (read-only, last 50)
//   - Unmatched wires (no AUX reference / user not found) → manual credit
//   - KYC-pending wires (held by KYC gate) → release credit
//   - Recent errors
//
// Auth: shares the existing main admin sessionStorage token.

"use client";

import { useState, useEffect, useCallback } from "react";

interface CountSummary {
  events: number;
  unmatched: number;
  errors: number;
  kycPending: number;
}

interface QueueEntry {
  at?: number;
  resourceId: string;
  amount?: number;
  currency?: string;
  usdValue?: number;
  auxmCredit?: number;
  refShort?: string;
  reference?: string;
  senderName?: string;
  reason?: string;
  userAddress?: string; // present on kyc-pending entries
}

interface ApiPayload {
  success: boolean;
  counts: CountSummary;
  events: any[];
  unmatched: QueueEntry[];
  errors: any[];
  kycPending: QueueEntry[];
  generatedAt: number;
  error?: string;
}

type Tab = "unmatched" | "kyc" | "events" | "errors";

function getAuthHeaders() {
  const token = typeof window !== "undefined" ? sessionStorage.getItem("auxite_admin_token") : null;
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token || ""}`,
  };
}

function fmtTime(ts?: number): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString();
}

function fmtMoney(n?: number, c = ""): string {
  if (n === undefined || n === null) return "—";
  const s = n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return c ? `${s} ${c}` : s;
}

export default function AdminWisePage() {
  const [data, setData] = useState<ApiPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("unmatched");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [walletInputs, setWalletInputs] = useState<Record<string, string>>({});
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [overrideAmounts, setOverrideAmounts] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/wise/console", { headers: getAuthHeaders() });
      const json: ApiPayload = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || `HTTP ${res.status}`);
      } else {
        setData(json);
      }
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const submitCredit = async (source: "unmatched" | "kyc-pending", entry: QueueEntry) => {
    const wallet = source === "kyc-pending"
      ? entry.userAddress || ""
      : (walletInputs[entry.resourceId] || "").trim();
    if (!wallet || !wallet.startsWith("0x")) {
      showToast("err", "Wallet address must start with 0x");
      return;
    }
    const overrideStr = overrideAmounts[entry.resourceId];
    const overrideAmount = overrideStr ? Number(overrideStr) : undefined;
    if (overrideAmount !== undefined && (!isFinite(overrideAmount) || overrideAmount <= 0)) {
      showToast("err", "Override amount invalid");
      return;
    }
    const note = (noteInputs[entry.resourceId] || "").trim();

    if (!confirm(
      `Credit ${overrideAmount ?? entry.usdValue ?? entry.amount ?? "?"} ${entry.currency || "USD"} ` +
      `→ AUXM\nto ${wallet.slice(0, 10)}...${wallet.slice(-4)}?`
    )) return;

    setBusyId(entry.resourceId);
    try {
      const res = await fetch("/api/admin/wise/console", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          source,
          resourceId: entry.resourceId,
          walletAddress: wallet,
          overrideAmount,
          note: note || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast("err", json.error || `HTTP ${res.status}`);
      } else {
        showToast("ok", `Credited ${json.credited.auxmCredit} AUXM`);
        await load();
      }
    } catch (e: any) {
      showToast("err", e?.message || "Network error");
    } finally {
      setBusyId(null);
    }
  };

  const renderQueueRow = (source: "unmatched" | "kyc-pending", entry: QueueEntry) => {
    const isKyc = source === "kyc-pending";
    const wallet = isKyc ? entry.userAddress : walletInputs[entry.resourceId] || "";
    return (
      <div key={entry.resourceId} className="border border-stone-700 rounded-lg p-4 bg-slate-900/50 space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="text-xs text-slate-400 font-mono">{entry.resourceId}</div>
          <div className="text-xs text-slate-500">{fmtTime(entry.at)}</div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Amount</p>
            <p className="font-semibold text-white">{fmtMoney(entry.amount, entry.currency)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">USD value</p>
            <p className="font-semibold text-white">{fmtMoney(entry.usdValue)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Reference</p>
            <p className="font-semibold text-[#BFA181]">{entry.refShort ? `AUX-${entry.refShort}` : entry.reference || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Sender</p>
            <p className="font-semibold text-white truncate">{entry.senderName || "—"}</p>
          </div>
        </div>

        {isKyc && (
          <div className="text-xs px-3 py-2 rounded bg-amber-900/30 border border-amber-700/40 text-amber-300">
            ⚠️ Held by KYC gate (user: <span className="font-mono">{entry.userAddress?.slice(0, 10)}…{entry.userAddress?.slice(-4)}</span>). Verify KYC status before releasing.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {!isKyc && (
            <input
              type="text"
              placeholder="Wallet address (0x...)"
              value={walletInputs[entry.resourceId] || ""}
              onChange={(e) => setWalletInputs({ ...walletInputs, [entry.resourceId]: e.target.value })}
              className="px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white text-sm font-mono"
            />
          )}
          <input
            type="number"
            step="0.01"
            placeholder={`Override USD (def ${fmtMoney(entry.usdValue ?? entry.amount)})`}
            value={overrideAmounts[entry.resourceId] || ""}
            onChange={(e) => setOverrideAmounts({ ...overrideAmounts, [entry.resourceId]: e.target.value })}
            className="px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white text-sm"
          />
          <input
            type="text"
            placeholder="Note (audit log)"
            value={noteInputs[entry.resourceId] || ""}
            onChange={(e) => setNoteInputs({ ...noteInputs, [entry.resourceId]: e.target.value })}
            className="px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white text-sm"
          />
        </div>

        <button
          onClick={() => submitCredit(source, entry)}
          disabled={busyId === entry.resourceId || (!isKyc && !wallet?.startsWith("0x"))}
          className="px-4 py-2 rounded bg-[#BFA181] text-black font-bold text-sm hover:bg-[#D4B47A] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busyId === entry.resourceId ? "Crediting…" : `Credit ${fmtMoney(Number(overrideAmounts[entry.resourceId]) || entry.usdValue || entry.amount)} AUXM`}
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Wise Console</h1>
          <button
            onClick={load}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-sm"
          >
            ↻ Refresh
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded bg-red-900/30 border border-red-700/40 text-red-300 text-sm">
            {error}. {error?.includes("Unauthorized") && (
              <a href="/admin" className="underline">Sign in via /admin</a>
            )}
          </div>
        )}

        {toast && (
          <div className={`fixed top-6 right-6 px-4 py-3 rounded shadow-lg text-sm font-semibold ${
            toast.type === "ok" ? "bg-emerald-700" : "bg-red-700"
          }`}>
            {toast.msg}
          </div>
        )}

        {loading && !data ? (
          <p className="text-slate-400">Loading…</p>
        ) : data ? (
          <>
            {/* Tabs with counts */}
            <div className="flex gap-1 mb-6 p-1 rounded-lg bg-slate-900 border border-slate-800 overflow-x-auto">
              {([
                ["unmatched", `Unmatched (${data.counts.unmatched})`],
                ["kyc", `KYC pending (${data.counts.kycPending})`],
                ["events", `Events (${data.counts.events})`],
                ["errors", `Errors (${data.counts.errors})`],
              ] as [Tab, string][]).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`px-4 py-2 rounded text-sm font-semibold whitespace-nowrap ${
                    tab === id ? "bg-[#BFA181] text-black" : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === "unmatched" && (
              <div className="space-y-3">
                {data.unmatched.length === 0 ? (
                  <p className="text-slate-500 text-sm">No unmatched wires. 🎉</p>
                ) : (
                  data.unmatched.map((e) => renderQueueRow("unmatched", e))
                )}
              </div>
            )}

            {tab === "kyc" && (
              <div className="space-y-3">
                {data.kycPending.length === 0 ? (
                  <p className="text-slate-500 text-sm">No wires held by KYC gate.</p>
                ) : (
                  data.kycPending.map((e) => renderQueueRow("kyc-pending", e))
                )}
              </div>
            )}

            {tab === "events" && (
              <div className="space-y-2">
                {data.events.length === 0 ? (
                  <p className="text-slate-500 text-sm">No recent events.</p>
                ) : (
                  data.events.map((e: any, i: number) => (
                    <details key={i} className="border border-slate-800 rounded p-3 bg-slate-900/50">
                      <summary className="cursor-pointer text-xs text-slate-400">
                        {fmtTime(e.at)} — {e.event?.event_type || e.event?.type || "(unknown)"}
                      </summary>
                      <pre className="text-[11px] text-slate-400 mt-2 overflow-x-auto">
                        {JSON.stringify(e.event || e, null, 2)}
                      </pre>
                    </details>
                  ))
                )}
              </div>
            )}

            {tab === "errors" && (
              <div className="space-y-2">
                {data.errors.length === 0 ? (
                  <p className="text-slate-500 text-sm">No recent errors.</p>
                ) : (
                  data.errors.map((e: any, i: number) => (
                    <div key={i} className="border border-red-900/40 rounded p-3 bg-red-900/20 text-sm">
                      <p className="text-xs text-slate-400 mb-1">{fmtTime(e.at)}</p>
                      <p className="text-red-300 font-semibold">{e.reason || e.error || "(no detail)"}</p>
                      {e.resourceId && <p className="text-xs text-slate-500 mt-1 font-mono">{e.resourceId}</p>}
                    </div>
                  ))
                )}
              </div>
            )}

            <p className="text-xs text-slate-600 mt-6">
              Generated {fmtTime(data.generatedAt)}. KYC threshold:
              <code className="ml-1 px-1 py-0.5 bg-slate-900 rounded text-slate-400">
                ${process.env.NEXT_PUBLIC_WISE_KYC_THRESHOLD_USD || "5000"}
              </code>{" "}
              (set via WISE_KYC_THRESHOLD_USD env).
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
