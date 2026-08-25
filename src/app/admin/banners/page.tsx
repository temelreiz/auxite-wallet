"use client";

// Admin → Campaign banners.
//
// /api/admin/banners has existed for a while but had no interface, so opening
// a campaign meant hand-rolling a POST with curl. Everything the endpoint
// supports is here: create, edit, activate/deactivate, delete, priority.
//
// The right-hand column renders the real popup card from the form state, so
// colour and copy choices are visible before anything reaches users. Banners
// go out to the mobile app through the same record, and a modal is the most
// intrusive surface we have — worth seeing first.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Banner, BannerLocale } from "@/lib/campaign-banners";
import { pickBannerLocale } from "@/lib/campaign-banners";

function useAdminToken(): string | null {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setToken(sessionStorage.getItem("auxite_admin_token"));
  }, []);
  return token;
}

const LOCALES: { code: keyof BannerLocale; label: string }[] = [
  { code: "tr", label: "Türkçe" },
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "ar", label: "العربية" },
  { code: "ru", label: "Русский" },
];

const ACTION_TYPES = ["none", "screen", "link"] as const;

/** Destinations resolveBannerRoute() understands — free text still allowed. */
const SCREEN_SUGGESTIONS = [
  "fund-vault", "trade", "allocate", "redeem", "stake",
  "vault", "auxr", "trust", "transfers", "profile", "support",
];

interface FormState {
  id: string;
  title: BannerLocale;
  subtitle: BannerLocale;
  imageUrl: string;
  backgroundColor: string;
  textColor: string;
  actionType: (typeof ACTION_TYPES)[number];
  actionValue: string;
  ctaLabel: BannerLocale;
  dismissLabel: BannerLocale;
  active: boolean;
  priority: number;
  startDate: string;
  endDate: string;
}

const EMPTY_FORM: FormState = {
  id: "",
  title: {},
  subtitle: {},
  imageUrl: "",
  backgroundColor: "#0f766e",
  textColor: "#ffffff",
  actionType: "screen",
  actionValue: "fund-vault",
  ctaLabel: {},
  dismissLabel: {},
  active: true,
  priority: 50,
  startDate: "",
  endDate: "",
};

export default function AdminBannersPage() {
  const adminToken = useAdminToken();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAllLocales, setShowAllLocales] = useState(false);
  const [previewLang, setPreviewLang] = useState<keyof BannerLocale>("tr");

  const load = useCallback(async () => {
    try {
      // No `active` param — admins need to see deactivated banners too.
      const r = await fetch("/api/mobile/banners", { cache: "no-store" });
      const j = await r.json();
      if (j?.success) setBanners(j.banners || []);
    } catch (e: any) {
      setErr(e?.message || "banner_fetch_failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const post = useCallback(
    async (payload: Record<string, any>) => {
      if (!adminToken) return false;
      setBusy(true);
      setErr(null);
      setOkMsg(null);
      try {
        const r = await fetch("/api/admin/banners", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify(payload),
        });
        if (r.status === 401) {
          setSessionExpired(true);
          setErr("Admin oturumu doldu — /admin üzerinden tekrar giriş yapın.");
          return false;
        }
        const j = await r.json();
        if (!r.ok || j?.error) {
          setErr(j?.error || `request_failed_${r.status}`);
          return false;
        }
        await load();
        return true;
      } catch (e: any) {
        setErr(e?.message || "request_failed");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [adminToken, load],
  );

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowAllLocales(false);
  };

  const startEdit = (b: Banner) => {
    setEditingId(b.id);
    setForm({
      id: b.id,
      title: b.title || {},
      subtitle: b.subtitle || {},
      imageUrl: b.imageUrl || "",
      backgroundColor: b.backgroundColor || "#0f766e",
      textColor: b.textColor || "#ffffff",
      actionType: (ACTION_TYPES as readonly string[]).includes(b.actionType)
        ? (b.actionType as FormState["actionType"])
        : "none",
      actionValue: b.actionValue || "",
      ctaLabel: b.ctaLabel || {},
      dismissLabel: b.dismissLabel || {},
      active: b.active !== false,
      priority: b.priority ?? 50,
      startDate: b.startDate ? b.startDate.slice(0, 10) : "",
      endDate: b.endDate ? b.endDate.slice(0, 10) : "",
    });
    setShowAllLocales(
      LOCALES.some(
        (l) => l.code !== "tr" && l.code !== "en" && (b.title?.[l.code] || b.subtitle?.[l.code]),
      ),
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const titleMissing = !form.title.tr?.trim() && !form.title.en?.trim();

  const submit = async () => {
    if (titleMissing) {
      setErr("En az bir dilde başlık gerekli (TR veya EN).");
      return;
    }
    const banner: Record<string, any> = {
      title: form.title,
      subtitle: form.subtitle,
      imageUrl: form.imageUrl.trim() || undefined,
      backgroundColor: form.backgroundColor,
      // The API's `add` branch reads bgColor first; send both so the same
      // payload works for add and update.
      bgColor: form.backgroundColor,
      textColor: form.textColor,
      actionType: form.actionType,
      actionValue: form.actionType === "none" ? "" : form.actionValue.trim(),
      ctaLabel: form.ctaLabel,
      dismissLabel: form.dismissLabel,
      active: form.active,
      priority: Number(form.priority) || 0,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
    };

    const ok = editingId
      ? await post({ action: "update", bannerId: editingId, banner })
      : await post({ action: "add", banner: { ...banner, id: form.id.trim() || undefined } });

    if (ok) {
      setOkMsg(editingId ? "Banner güncellendi." : "Banner oluşturuldu.");
      resetForm();
    }
  };

  const previewTitle = pickBannerLocale(form.title, previewLang);
  const previewSubtitle = pickBannerLocale(form.subtitle, previewLang);

  const liveCount = useMemo(() => {
    const now = Date.now();
    return banners.filter((b) => {
      if (!b.active) return false;
      if (b.startDate && Date.parse(b.startDate) > now) return false;
      if (b.endDate && Date.parse(b.endDate) < now) return false;
      return true;
    }).length;
  }, [banners]);

  if (!adminToken) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-3">Admin authentication required</p>
          <Link href="/admin" className="text-[#BFA181] underline">
            Go to /admin to sign in
          </Link>
        </div>
      </div>
    );
  }

  const field =
    "w-full rounded-lg bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-[#BFA181]/60 focus:outline-none";
  const label = "block text-xs uppercase tracking-widest text-slate-500 mb-1.5";

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto border-b border-white/5">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-sm text-slate-400 hover:text-white">
            &larr; Admin
          </Link>
          <span className="text-slate-600">·</span>
          <h1 className="text-base font-semibold">Campaign Banners</h1>
        </div>
        <div className="text-xs text-slate-500">
          {sessionExpired ? (
            <span className="text-red-400">● Session expired</span>
          ) : (
            <span className="text-emerald-400">● {liveCount} yayında</span>
          )}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {err && (
          <div className="mb-5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {err}{" "}
            {sessionExpired && (
              <Link href="/admin" className="underline hover:text-white">
                admin girişine git →
              </Link>
            )}
          </div>
        )}
        {okMsg && (
          <div className="mb-5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {okMsg}
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_400px] gap-8 items-start">
          {/* ─────────── Form ─────────── */}
          <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6">
            <h2 className="text-sm font-semibold mb-5">
              {editingId ? `Düzenleniyor: ${editingId}` : "Yeni banner"}
            </h2>

            <div className="space-y-5">
              <div>
                <label className={label}>Başlık</label>
                <div className="grid sm:grid-cols-2 gap-3">
                  {LOCALES.filter((l) => showAllLocales || l.code === "tr" || l.code === "en").map(
                    (l) => (
                      <input
                        key={l.code}
                        className={field}
                        placeholder={l.label}
                        value={form.title[l.code] || ""}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, title: { ...f.title, [l.code]: e.target.value } }))
                        }
                      />
                    ),
                  )}
                </div>
              </div>

              <div>
                <label className={label}>Alt başlık</label>
                <div className="grid sm:grid-cols-2 gap-3">
                  {LOCALES.filter((l) => showAllLocales || l.code === "tr" || l.code === "en").map(
                    (l) => (
                      <input
                        key={l.code}
                        className={field}
                        placeholder={l.label}
                        value={form.subtitle[l.code] || ""}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            subtitle: { ...f.subtitle, [l.code]: e.target.value },
                          }))
                        }
                      />
                    ),
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowAllLocales((v) => !v)}
                  className="mt-2 text-xs text-[#BFA181] hover:underline"
                >
                  {showAllLocales
                    ? "− Sadece TR/EN göster"
                    : "+ Diğer diller (DE, FR, AR, RU)"}
                </button>
                <p className="mt-1.5 text-xs text-slate-600">
                  Çevirisi girilmeyen dil, TR → EN sırasıyla geri düşer.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={label}>Arka plan rengi</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={form.backgroundColor}
                      onChange={(e) => setForm((f) => ({ ...f, backgroundColor: e.target.value }))}
                      className="h-9 w-12 rounded border border-white/10 bg-zinc-900"
                    />
                    <input
                      className={field}
                      value={form.backgroundColor}
                      onChange={(e) => setForm((f) => ({ ...f, backgroundColor: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className={label}>Metin rengi</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={form.textColor}
                      onChange={(e) => setForm((f) => ({ ...f, textColor: e.target.value }))}
                      className="h-9 w-12 rounded border border-white/10 bg-zinc-900"
                    />
                    <input
                      className={field}
                      value={form.textColor}
                      onChange={(e) => setForm((f) => ({ ...f, textColor: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className={label}>Görsel URL (opsiyonel)</label>
                <input
                  className={field}
                  placeholder="https://…"
                  value={form.imageUrl}
                  onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={label}>Tıklama davranışı</label>
                  <select
                    className={field}
                    value={form.actionType}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, actionType: e.target.value as FormState["actionType"] }))
                    }
                  >
                    <option value="screen">Uygulama ekranı</option>
                    <option value="link">Bağlantı (URL)</option>
                    <option value="none">Yok — sadece bilgi</option>
                  </select>
                </div>
                {form.actionType !== "none" && (
                  <div>
                    <label className={label}>
                      {form.actionType === "screen" ? "Ekran" : "URL"}
                    </label>
                    <input
                      className={field}
                      list={form.actionType === "screen" ? "screen-suggestions" : undefined}
                      placeholder={form.actionType === "screen" ? "fund-vault" : "https://…"}
                      value={form.actionValue}
                      onChange={(e) => setForm((f) => ({ ...f, actionValue: e.target.value }))}
                    />
                    <datalist id="screen-suggestions">
                      {SCREEN_SUGGESTIONS.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </div>
                )}
              </div>

              <div>
                <label className={label}>Buton metinleri (opsiyonel)</label>
                <div className="grid sm:grid-cols-2 gap-3">
                  <input
                    className={field}
                    placeholder="Ana buton — TR (varsayılan: Devam et)"
                    value={form.ctaLabel.tr || ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, ctaLabel: { ...f.ctaLabel, tr: e.target.value } }))
                    }
                  />
                  <input
                    className={field}
                    placeholder="Primary — EN (default: Continue)"
                    value={form.ctaLabel.en || ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, ctaLabel: { ...f.ctaLabel, en: e.target.value } }))
                    }
                  />
                  <input
                    className={field}
                    placeholder="Kapat butonu — TR (varsayılan: Kapat)"
                    value={form.dismissLabel.tr || ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, dismissLabel: { ...f.dismissLabel, tr: e.target.value } }))
                    }
                  />
                  <input
                    className={field}
                    placeholder="Dismiss — EN (default: Dismiss)"
                    value={form.dismissLabel.en || ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, dismissLabel: { ...f.dismissLabel, en: e.target.value } }))
                    }
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-600">
                  Boş bırakılırsa bileşenin varsayılan metinleri kullanılır. Diğer diller
                  TR &rarr; EN sırasıyla geri düşer.
                </p>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className={label}>Öncelik</label>
                  <input
                    type="number"
                    className={field}
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))}
                  />
                  <p className="mt-1 text-xs text-slate-600">Yüksek olan popup&apos;ta çıkar.</p>
                </div>
                <div>
                  <label className={label}>Başlangıç</label>
                  <input
                    type="date"
                    className={field}
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={label}>Bitiş</label>
                  <input
                    type="date"
                    className={field}
                    value={form.endDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                  className="w-4 h-4 accent-[#BFA181]"
                />
                Aktif
              </label>

              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={submit}
                  disabled={busy || titleMissing}
                  className="px-5 py-2.5 rounded-xl bg-[#BFA181] text-zinc-950 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#d0b494] transition-colors"
                >
                  {busy ? "…" : editingId ? "Kaydet" : "Oluştur"}
                </button>
                {editingId && (
                  <button
                    onClick={resetForm}
                    className="px-4 py-2.5 rounded-xl border border-white/10 text-sm text-slate-300 hover:bg-white/5"
                  >
                    İptal
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* ─────────── Live preview ─────────── */}
          <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 lg:sticky lg:top-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Popup önizleme</h2>
              <select
                value={previewLang}
                onChange={(e) => setPreviewLang(e.target.value as keyof BannerLocale)}
                className="rounded-lg bg-zinc-900 border border-white/10 px-2 py-1 text-xs text-slate-300"
              >
                {LOCALES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl bg-black/50 p-5">
              <div
                className="rounded-3xl overflow-hidden shadow-2xl shadow-black/50"
                style={{ backgroundColor: form.backgroundColor, color: form.textColor }}
              >
                {form.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.imageUrl} alt="" className="w-full h-28 object-cover" />
                )}
                <div className="p-5">
                  <div className="text-lg font-bold leading-tight mb-1.5">
                    {previewTitle || <span className="opacity-40">Başlık…</span>}
                  </div>
                  {previewSubtitle && (
                    <p className="text-sm opacity-90 leading-relaxed">{previewSubtitle}</p>
                  )}
                  <div className="mt-5 flex items-center gap-2">
                    {form.actionType !== "none" && (
                      <div
                        className="flex-1 px-4 py-2.5 rounded-xl bg-white/95 text-center text-sm font-bold"
                        style={{ color: form.backgroundColor }}
                      >
                        {pickBannerLocale(form.ctaLabel, previewLang) ||
                          (previewLang === "tr" ? "Devam et" : "Continue")}
                      </div>
                    )}
                    <div
                      className={`px-4 py-2.5 rounded-xl text-sm font-semibold bg-black/15 ${
                        form.actionType === "none" ? "flex-1 text-center" : ""
                      }`}
                    >
                      {pickBannerLocale(form.dismissLabel, previewLang) ||
                        (previewLang === "tr" ? "Kapat" : "Dismiss")}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-600">
              Vault&apos;ta en yüksek öncelikli aktif banner açılır. Kapatan kullanıcıya 24 saat
              tekrar gösterilmez.
            </p>
          </section>
        </div>

        {/* ─────────── List ─────────── */}
        <section className="mt-10">
          <h2 className="text-sm font-semibold mb-4">
            Mevcut bannerlar {loading ? "" : `(${banners.length})`}
          </h2>

          {loading ? (
            <p className="text-sm text-slate-500">Yükleniyor…</p>
          ) : banners.length === 0 ? (
            <p className="text-sm text-slate-500">
              Henüz banner yok. Yukarıdaki formla ilkini oluşturun.
            </p>
          ) : (
            <div className="space-y-3">
              {banners.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-4 rounded-xl border border-white/10 bg-zinc-900/50 p-4"
                >
                  <div
                    className="w-11 h-11 rounded-xl flex-shrink-0 border border-white/10"
                    style={{ backgroundColor: b.backgroundColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">
                      {pickBannerLocale(b.title, "tr") || b.id}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {b.id} · öncelik {b.priority}
                      {b.actionType !== "none" && ` · → ${b.actionValue}`}
                      {b.endDate && ` · bitiş ${b.endDate.slice(0, 10)}`}
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                      b.active
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-slate-500/15 text-slate-400"
                    }`}
                  >
                    {b.active ? "aktif" : "pasif"}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => post({ action: "toggle", bannerId: b.id })}
                      disabled={busy}
                      className="px-3 py-1.5 rounded-lg border border-white/10 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-40"
                    >
                      {b.active ? "Durdur" : "Yayınla"}
                    </button>
                    <button
                      onClick={() => startEdit(b)}
                      className="px-3 py-1.5 rounded-lg border border-white/10 text-xs text-slate-300 hover:bg-white/5"
                    >
                      Düzenle
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`"${b.id}" silinsin mi? Bu geri alınamaz.`)) {
                          post({ action: "delete", bannerId: b.id });
                        }
                      }}
                      disabled={busy}
                      className="px-3 py-1.5 rounded-lg border border-red-500/30 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-40"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
