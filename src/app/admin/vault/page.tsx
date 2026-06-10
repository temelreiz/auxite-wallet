"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const ADMIN_ADDRESSES = [
  "0xD24B2bca1E0b58a2EAE5b1184871219f9a8EE944",
].map((a) => a.toLowerCase());

const METALS = ["AUXG", "AUXS", "AUXPT", "AUXPD"] as const;
const NAMES: Record<string, string> = { AUXG: "Altın", AUXS: "Gümüş", AUXPT: "Platin", AUXPD: "Paladyum" };

interface Row { metal: string; target: number; onchain: number; delta: number }
interface Op { metal: string; account: string; kind: "mint" | "burn"; grams: number; isTreasury: boolean; txHash?: string }

export default function AdminVaultPage() {
  const { isConnected, address } = useAccount();
  const [isAdmin, setIsAdmin] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  const [rows, setRows] = useState<Row[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [plan, setPlan] = useState<{ dryRun: boolean; ops: Op[]; errors: any[] } | null>(null);

  useEffect(() => {
    if (address) {
      const ok = ADMIN_ADDRESSES.includes(address.toLowerCase());
      setIsAdmin(ok);
      if (ok && sessionStorage.getItem("auxite_admin_token")) {
        setAuthenticated(true);
        load();
      }
    }
  }, [address]);

  const headers = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${sessionStorage.getItem("auxite_admin_token")}`,
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/vault", { headers: headers() });
      const data = await res.json();
      if (res.ok) {
        setRows(data.rows || []);
        const e: Record<string, string> = {};
        for (const r of data.rows || []) e[r.metal] = String(r.target);
        setEdits(e);
      } else setMsg({ type: "error", text: data.error || "Yüklenemedi" });
    } catch { setMsg({ type: "error", text: "Bağlantı hatası" }); }
    finally { setLoading(false); }
  };

  const post = async (body: any) => {
    const res = await fetch("/api/admin/vault", { method: "POST", headers: headers(), body: JSON.stringify(body) });
    return { res, data: await res.json() };
  };

  const save = async () => {
    setBusy("save"); setMsg({ type: "", text: "" }); setPlan(null);
    try {
      const targets: Record<string, number> = {};
      for (const m of METALS) if (edits[m] !== undefined) targets[m] = Number(edits[m]);
      const { res, data } = await post({ action: "save", targets });
      if (res.ok) { setMsg({ type: "success", text: "Hedefler kaydedildi" }); load(); }
      else setMsg({ type: "error", text: data.error || "Kaydedilemedi" });
    } finally { setBusy(null); }
  };

  const preview = async () => {
    setBusy("preview"); setMsg({ type: "", text: "" }); setPlan(null);
    try {
      const { res, data } = await post({ action: "preview" });
      if (res.ok) { setPlan({ dryRun: true, ops: data.ops || [], errors: data.errors || [] }); }
      else setMsg({ type: "error", text: data.error || "Önizleme başarısız" });
    } finally { setBusy(null); }
  };

  const execute = async () => {
    if (!confirm("ZİNCİRE MINT/BURN yapılacak (geri alınamaz). Devam?")) return;
    setBusy("execute"); setMsg({ type: "", text: "" });
    try {
      const { res, data } = await post({ action: "execute" });
      if (res.ok) {
        setPlan({ dryRun: false, ops: data.ops || [], errors: data.errors || [] });
        setMsg({ type: (data.errors?.length ? "error" : "success"), text: data.errors?.length ? `${data.errors.length} hata` : "Mint tamamlandı ✅" });
        load();
      } else setMsg({ type: "error", text: data.error || "Execute başarısız" });
    } finally { setBusy(null); }
  };

  if (!isConnected) return (
    <Gate><p className="text-slate-400 mb-6">Admin cüzdanınızı bağlayın</p><ConnectButton showBalance={false} chainStatus="none" accountStatus="avatar" /></Gate>
  );
  if (!isAdmin || !authenticated) return (
    <Gate><h1 className="text-2xl font-bold mb-4">Yetkisiz Erişim</h1><Link href="/admin" className="text-emerald-400">Admin Paneline Git →</Link></Gate>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-slate-400 hover:text-white text-sm">← Admin Panel</Link>
          <h1 className="text-xl font-bold">Kasa Yönetimi</h1>
        </div>
        <ConnectButton showBalance={false} chainStatus="none" accountStatus="avatar" />
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <p className="text-sm text-slate-400 mb-6">
          Kasaya metal ekleyince ilgili tokenin <b>hedef gramını</b> gir → <b>Kaydet</b> → <b>Önizle</b> (ne mint/burn olacak) → <b>Çalıştır</b> (zincire mint). Sonra supply otomatik /api/supply + RWA.io'ya yansır.
        </p>

        {msg.text && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${msg.type === "success" ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>{msg.text}</div>
        )}

        {loading ? <p className="text-slate-400">Yükleniyor…</p> : (
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="text-left px-4 py-3">Metal</th>
                  <th className="text-right px-4 py-3">On-chain (g)</th>
                  <th className="text-right px-4 py-3">Hedef (g)</th>
                  <th className="text-right px-4 py-3">Fark</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const d = (Number(edits[r.metal]) || 0) - r.onchain;
                  return (
                    <tr key={r.metal} className="border-b border-slate-800/50">
                      <td className="px-4 py-3 font-semibold">{r.metal} <span className="text-slate-500 font-normal">{NAMES[r.metal]}</span></td>
                      <td className="px-4 py-3 text-right font-mono text-slate-300">{r.onchain.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number" value={edits[r.metal] ?? ""}
                          onChange={(e) => setEdits({ ...edits, [r.metal]: e.target.value })}
                          className="w-32 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-right font-mono focus:border-emerald-500 outline-none"
                        />
                      </td>
                      <td className={`px-4 py-3 text-right font-mono ${d > 0 ? "text-emerald-400" : d < 0 ? "text-red-400" : "text-slate-500"}`}>
                        {d > 0 ? `+${d.toLocaleString()} mint` : d < 0 ? `${d.toLocaleString()} burn` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button onClick={save} disabled={!!busy} className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 font-semibold text-sm">{busy === "save" ? "Kaydediliyor…" : "Hedefleri Kaydet"}</button>
          <button onClick={preview} disabled={!!busy} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 font-semibold text-sm">{busy === "preview" ? "Önizleniyor…" : "Önizle (dry-run)"}</button>
          <button onClick={execute} disabled={!!busy} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-semibold text-sm">{busy === "execute" ? "Çalıştırılıyor…" : "Çalıştır (mint)"}</button>
        </div>

        {plan && (
          <div className="mt-6 bg-slate-900 rounded-xl border border-slate-800 p-4">
            <h3 className="font-semibold mb-3">{plan.dryRun ? "Önizleme (dry-run) — yapılacaklar:" : "Sonuç:"}</h3>
            {plan.ops.length === 0 && plan.errors.length === 0 && <p className="text-slate-400 text-sm">Değişiklik yok (her şey hedefte).</p>}
            <ul className="space-y-1 text-sm font-mono">
              {plan.ops.map((o, i) => (
                <li key={i} className={o.kind === "mint" ? "text-emerald-300" : "text-amber-300"}>
                  {o.kind === "mint" ? "↑ MINT" : "↓ BURN"} {o.grams}g {o.metal} {o.isTreasury ? "→ Treasury" : `→ ${o.account.slice(0, 10)}…`}
                  {o.txHash && <a href={`https://basescan.org/tx/${o.txHash}`} target="_blank" rel="noreferrer" className="ml-2 text-blue-400 underline">tx</a>}
                </li>
              ))}
            </ul>
            {plan.errors.length > 0 && (
              <div className="mt-3 text-sm text-red-400">
                <p className="font-semibold">Hatalar:</p>
                {plan.errors.map((e, i) => <p key={i}>{e.metal}: {String(e.error).slice(0, 120)}</p>)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Gate({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Kasa Yönetimi</h1>
        {children}
      </div>
    </div>
  );
}
