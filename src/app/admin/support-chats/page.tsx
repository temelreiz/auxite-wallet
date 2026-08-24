"use client";

// Admin → Support chat transcripts.
//
// The AI support widget now persists every conversation (src/lib/support-chat-
// store.ts). This is the reading surface: browse what users ask the bot, filter
// to conversations where someone left an email, read a full transcript, export
// leads to CSV, and delete a conversation on request.
//
// Marketing use of captured emails still needs the opt-in consent flow — this
// page is for support insight and lead visibility, not a green light to email.

import { useCallback, useEffect, useMemo, useState } from "react";

function useAdminToken(): string | null {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setToken(sessionStorage.getItem("auxite_admin_token"));
  }, []);
  return token;
}

type Summary = {
  id: string;
  startedAt: number;
  updatedAt: number;
  lang: string | null;
  email: string | null;
  messageCount: number;
  preview: string;
};

type Message = { role: "user" | "assistant"; content: string };
type Transcript = Summary & { referer: string | null; messages: Message[] };

const fmt = (ms: number) => new Date(ms).toLocaleString();

export default function SupportChatsPage() {
  const token = useAdminToken();
  const [items, setItems] = useState<Summary[]>([]);
  const [total, setTotal] = useState(0);
  const [leadsOnly, setLeadsOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<Transcript | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const auth = useMemo(
    () => ({ Authorization: `Bearer ${token ?? ""}` }),
    [token],
  );

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/support-chats?leads=${leadsOnly ? "1" : "0"}&limit=200`,
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
      setError("Failed to load transcripts.");
    } finally {
      setLoading(false);
    }
  }, [token, leadsOnly, auth]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openTranscript(id: string) {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/support-chats?id=${encodeURIComponent(id)}`, {
        headers: auth,
      });
      const data = await res.json();
      if (data.transcript) setActive(data.transcript);
    } finally {
      setDetailLoading(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this conversation permanently?")) return;
    await fetch(`/api/admin/support-chats?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: auth,
    });
    if (active?.id === id) setActive(null);
    void load();
  }

  function exportLeadsCsv() {
    const leads = items.filter((i) => i.email);
    const rows = [
      ["email", "language", "messages", "first_message", "started", "updated"],
      ...leads.map((l) => [
        l.email ?? "",
        l.lang ?? "",
        String(l.messageCount),
        l.preview.replace(/"/g, "'"),
        new Date(l.startedAt).toISOString(),
        new Date(l.updatedAt).toISOString(),
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${c}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `support-leads-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const leadCount = items.filter((i) => i.email).length;

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-200">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Support Chats</h1>
            <p className="text-sm text-slate-400">
              AI support widget transcripts · {total} total
              {leadCount > 0 && ` · ${leadCount} with email on this page`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={leadsOnly}
                onChange={(e) => setLeadsOnly(e.target.checked)}
                className="h-4 w-4 accent-gold-500"
              />
              Leads only (email left)
            </label>
            <button
              onClick={exportLeadsCsv}
              className="rounded-lg bg-gold-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-gold-600"
            >
              Export leads CSV
            </button>
            <button
              onClick={() => void load()}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800"
            >
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-800 bg-red-950/50 px-4 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1fr_minmax(320px,420px)]">
          {/* List */}
          <div className="overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Lang</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Msgs</th>
                  <th className="px-3 py-2">First message</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                      No conversations yet.
                    </td>
                  </tr>
                )}
                {items.map((it) => (
                  <tr
                    key={it.id}
                    onClick={() => openTranscript(it.id)}
                    className={`cursor-pointer border-t border-slate-800 hover:bg-slate-900 ${
                      active?.id === it.id ? "bg-slate-900" : ""
                    }`}
                  >
                    <td className="px-3 py-2 whitespace-nowrap text-slate-400">
                      {fmt(it.updatedAt)}
                    </td>
                    <td className="px-3 py-2 uppercase text-slate-400">{it.lang || "—"}</td>
                    <td className="px-3 py-2">
                      {it.email ? (
                        <span className="rounded bg-gold-500/15 px-1.5 py-0.5 text-xs text-gold-300">
                          {it.email}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-400">{it.messageCount}</td>
                    <td className="px-3 py-2 text-slate-300">{it.preview || "—"}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void remove(it.id);
                        }}
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

          {/* Detail */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            {detailLoading && <p className="text-sm text-slate-500">Loading…</p>}
            {!detailLoading && !active && (
              <p className="text-sm text-slate-500">Select a conversation to read it.</p>
            )}
            {active && (
              <div>
                <div className="mb-3 border-b border-slate-800 pb-3 text-xs text-slate-400">
                  <div>Started: {fmt(active.startedAt)}</div>
                  <div>Updated: {fmt(active.updatedAt)}</div>
                  <div>Language: {active.lang || "—"}</div>
                  {active.email && (
                    <div className="text-gold-300">Email: {active.email}</div>
                  )}
                  {active.referer && (
                    <div className="truncate">From: {active.referer}</div>
                  )}
                </div>
                <div className="space-y-2">
                  {active.messages.map((m, i) => (
                    <div
                      key={i}
                      className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
                    >
                      <div
                        className={
                          m.role === "user"
                            ? "max-w-[85%] whitespace-pre-wrap rounded-lg bg-gold-500/90 px-3 py-2 text-sm text-white"
                            : "max-w-[85%] whitespace-pre-wrap rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-200"
                        }
                      >
                        {m.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
