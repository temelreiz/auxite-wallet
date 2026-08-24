"use client";

// Admin → Compose & send a marketing campaign to consented leads.
//
// Sends only to leads with explicit marketing consent, minus anyone who has
// unsubscribed (enforced server-side in marketing-campaign.ts). Always test to
// yourself first; the live send is confirm-gated and shows the recipient count.

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

type LogEntry = {
  subject: string;
  total: number;
  sent: number;
  failed: number;
  at: number;
  sentBy?: string | null;
};

const fmt = (ms: number) => new Date(ms).toLocaleString();

export default function MarketingCampaignPage() {
  const token = useAdminToken();
  const auth = useMemo(() => ({ Authorization: `Bearer ${token ?? ""}` }), [token]);

  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("<p>Hi,</p>\n<p>...</p>\n<p>— The Auxite team</p>");
  const [testEmail, setTestEmail] = useState("");
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/admin/marketing-send", { headers: auth });
      if (res.status === 401) {
        setError("Unauthorized — log in on the admin dashboard first.");
        return;
      }
      const data = await res.json();
      setRecipientCount(data.recipientCount ?? 0);
      setLog(data.log || []);
    } catch {
      setError("Failed to load.");
    }
  }, [token, auth]);

  useEffect(() => {
    void load();
  }, [load]);

  async function send(mode: "test" | "live") {
    setError(null);
    setMsg(null);
    if (!subject.trim() || !html.trim()) {
      setError("Subject and body are required.");
      return;
    }
    if (mode === "test" && !testEmail.trim()) {
      setError("Enter a test email address.");
      return;
    }
    if (mode === "live") {
      if (!recipientCount) {
        setError("No consented recipients to send to.");
        return;
      }
      if (!confirm(`Send this campaign to ${recipientCount} consented lead(s)? This cannot be undone.`))
        return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/marketing-send", {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ subject, html, mode, testEmail: testEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Send failed.");
        return;
      }
      const r = data.result;
      setMsg(
        mode === "test"
          ? `Test sent: ${r.sent}/${r.total} (failed ${r.failed}).`
          : `Campaign sent: ${r.sent}/${r.total} delivered, ${r.failed} failed.`,
      );
      if (mode === "live") void load();
    } catch {
      setError("Send failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-200">
      <div className="mx-auto max-w-5xl">
        <div className="mb-2 text-sm">
          <Link href="/admin/marketing-leads" className="text-gold-400 hover:text-gold-300">
            ← Marketing leads
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-white">Marketing Campaign</h1>
        <p className="mb-6 text-sm text-slate-400">
          Sends to{" "}
          <span className="text-gold-300">{recipientCount ?? "…"}</span> consented lead(s).
          Unsubscribed addresses are excluded automatically; every email includes a one-click
          unsubscribe link.
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-800 bg-red-950/50 px-4 py-2 text-sm text-red-300">
            {error}
          </div>
        )}
        {msg && (
          <div className="mb-4 rounded-lg border border-green-800 bg-green-950/40 px-4 py-2 text-sm text-green-300">
            {msg}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Compose */}
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs uppercase text-slate-500">Subject</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Your subject line"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-gold-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase text-slate-500">Body (HTML)</label>
              <textarea
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                rows={14}
                className="w-full resize-y rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-white focus:border-gold-500 focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@you.com"
                className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-gold-500 focus:outline-none"
              />
              <button
                onClick={() => void send("test")}
                disabled={busy}
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800 disabled:opacity-40"
              >
                Send test
              </button>
              <button
                onClick={() => void send("live")}
                disabled={busy || !recipientCount}
                className="rounded-lg bg-gold-500 px-3 py-2 text-sm font-medium text-white hover:bg-gold-600 disabled:opacity-40"
              >
                {busy ? "Sending…" : `Send to ${recipientCount ?? 0} leads`}
              </button>
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="mb-1 block text-xs uppercase text-slate-500">Preview</label>
            <div className="rounded-lg border border-slate-800 bg-white p-4 text-black">
              <div className="mb-2 border-b border-gray-200 pb-2 text-sm font-semibold">
                {subject || "(no subject)"}
              </div>
              <div
                className="prose prose-sm max-w-none text-sm"
                dangerouslySetInnerHTML={{ __html: html }}
              />
              <hr className="my-4 border-gray-200" />
              <p className="text-[11px] text-gray-500">
                You are receiving this because you opted in to Auxite marketing updates.{" "}
                <span className="underline">Unsubscribe</span>.
              </p>
            </div>
          </div>
        </div>

        {/* History */}
        <h2 className="mb-2 mt-8 text-lg font-semibold text-white">Recent sends</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Subject</th>
                <th className="px-3 py-2">Sent</th>
                <th className="px-3 py-2">Failed</th>
              </tr>
            </thead>
            <tbody>
              {log.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                    No campaigns sent yet.
                  </td>
                </tr>
              )}
              {log.map((l, i) => (
                <tr key={i} className="border-t border-slate-800">
                  <td className="px-3 py-2 whitespace-nowrap text-slate-400">{fmt(l.at)}</td>
                  <td className="px-3 py-2 text-slate-300">{l.subject}</td>
                  <td className="px-3 py-2 text-green-300">
                    {l.sent}/{l.total}
                  </td>
                  <td className="px-3 py-2 text-slate-400">{l.failed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
