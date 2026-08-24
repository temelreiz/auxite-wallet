"use client";

// Admin → Marketing leads.
//
// Phase 2 surface: emails captured by the support widget WITH explicit opt-in
// consent (src/lib/marketing-lead.ts). Only rows marked "consented" carry
// permission to market to; the CSV export is consented-only by design so an
// operator can't accidentally ship a non-consenting address to a mail tool.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

function useAdminToken(): string | null {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setToken(sessionStorage.getItem("auxite_admin_token"));
  }, []);
  return token;
}

type Lead = {
  email: string;
  sessionId: string | null;
  lang: string | null;
  marketingConsent: boolean;
  consentText: string | null;
  consentVersion: string | null;
  consentAt: number | null;
  source: string;
  createdAt: number;
  updatedAt: number;
};

const fmt = (ms: number | null) => (ms ? new Date(ms).toLocaleString() : "—");

export default function MarketingLeadsPage() {
  const token = useAdminToken();
  const [items, setItems] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [consentedOnly, setConsentedOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const auth = useMemo(() => ({ Authorization: `Bearer ${token ?? ""}` }), [token]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/marketing-leads?consented=${consentedOnly ? "1" : "0"}&limit=500`,
        { headers: auth },
      );
      if (res.status === 401) {
        setError("Unauthorized — log in on the admin dashboard first.");
        return;
      }
      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch {
      setError("Failed to load leads.");
    } finally {
      setLoading(false);
    }
  }, [token, consentedOnly, auth]);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(email: string) {
    if (!confirm(`Delete lead ${email}? (use for unsubscribe / erasure requests)`)) return;
    await fetch(`/api/admin/marketing-leads?email=${encodeURIComponent(email)}`, {
      method: "DELETE",
      headers: auth,
    });
    void load();
  }

  function exportConsentedCsv() {
    const consented = items.filter((l) => l.marketingConsent);
    const rows = [
      ["email", "language", "source", "consent_version", "consent_at"],
      ...consented.map((l) => [
        l.email,
        l.lang ?? "",
        l.source,
        l.consentVersion ?? "",
        l.consentAt ? new Date(l.consentAt).toISOString() : "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `marketing-leads-consented-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const consentedCount = items.filter((l) => l.marketingConsent).length;

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-200">
      <div className="mx-auto max-w-5xl">
        <div className="mb-2 text-sm">
          <Link href="/admin/support-chats" className="text-gold-400 hover:text-gold-300">
            ← Support chats
          </Link>
        </div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Marketing Leads</h1>
            <p className="text-sm text-slate-400">
              Opt-in emails from the support widget · {total} total · {consentedCount} consented on
              this page
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={consentedOnly}
                onChange={(e) => setConsentedOnly(e.target.checked)}
                className="h-4 w-4 accent-gold-500"
              />
              Consented only
            </label>
            <button
              onClick={exportConsentedCsv}
              className="rounded-lg bg-gold-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-gold-600"
            >
              Export consented CSV
            </button>
            <button
              onClick={() => void load()}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="mb-4 rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-2 text-xs text-slate-400">
          Only <span className="text-gold-300">consented</span> leads may be emailed for marketing.
          The CSV export is consented-only. Set <code className="text-slate-300">MARKETING_LEAD_WEBHOOK_URL</code>{" "}
          to forward consented leads to a CRM automatically.
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-800 bg-red-950/50 px-4 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Consent</th>
                <th className="px-3 py-2">Lang</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Consented at</th>
                <th className="px-3 py-2">Version</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                    No leads yet.
                  </td>
                </tr>
              )}
              {items.map((l) => (
                <tr key={l.email} className="border-t border-slate-800 hover:bg-slate-900">
                  <td className="px-3 py-2 text-slate-200">{l.email}</td>
                  <td className="px-3 py-2">
                    {l.marketingConsent ? (
                      <span className="rounded bg-green-500/15 px-1.5 py-0.5 text-xs text-green-300">
                        Consented
                      </span>
                    ) : (
                      <span className="rounded bg-slate-700/50 px-1.5 py-0.5 text-xs text-slate-400">
                        No consent
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 uppercase text-slate-400">{l.lang || "—"}</td>
                  <td className="px-3 py-2 text-slate-400">{l.source}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-slate-400">{fmt(l.consentAt)}</td>
                  <td className="px-3 py-2 text-slate-400">{l.consentVersion || "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => void remove(l.email)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
