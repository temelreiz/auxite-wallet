"use client";

// Itera car-sharing pilot — admin tab (docs/car-rental-pilot-design.md)
// Vehicles, status, external valuations, non-revenue costs, NAV and Kapı 1
// metrics. Trip revenue is not entered here: it only arrives from the
// provider webhook.

import { useState, useEffect, useCallback } from "react";

type Section = "overview" | "vehicles" | "entries" | "metrics" | "nav";

const STATUSES = ["acquiring", "available", "in_trip", "reserved", "servicing", "maintenance", "damaged", "disposed"];
const STATUS_LABELS: Record<string, string> = {
  acquiring: "Teslim bekliyor",
  available: "Müsait",
  in_trip: "Yolculukta",
  reserved: "Rezerve",
  servicing: "Hizmette",
  maintenance: "Bakımda",
  damaged: "Hasarlı",
  disposed: "Satıldı",
};
const COST_TYPES = [
  "vehicle_purchase", "capital_in", "disposal", "fuel", "charging", "cleaning", "relocation", "parking",
  "toll", "maintenance", "insurance", "damage", "damage_recovery", "fine", "fine_recovery",
  "energy_incentive", "software", "payment_fee", "tax", "operator_fee", "platform_fee", "distribution",
];
const CELLS = ["EV-B", "EV-C", "HEV-B", "HEV-C", "ALL"] as const;

const METRIC_ROWS: { key: string; label: string; fmt: (v: number | null) => string }[] = [
  { key: "vehicles", label: "Araç", fmt: (v) => String(v ?? 0) },
  { key: "timeUtilisation", label: "Zaman kullanım oranı", fmt: (v) => (v == null ? "—" : `${(v * 100).toFixed(1)}%`) },
  { key: "trips", label: "Yolculuk", fmt: (v) => String(v ?? 0) },
  { key: "tripsPerVehicleDay", label: "Araç başı günlük yolculuk", fmt: (v) => (v == null ? "—" : v.toFixed(2)) },
  { key: "avgTripMinutes", label: "Ort. yolculuk (dk)", fmt: (v) => (v == null ? "—" : v.toFixed(1)) },
  { key: "avgTripKm", label: "Ort. yolculuk (km)", fmt: (v) => (v == null ? "—" : v.toFixed(1)) },
  { key: "grossRevenueUsd", label: "Brüt gelir", fmt: (v) => `$${(v ?? 0).toLocaleString()}` },
  { key: "costsUsd", label: "Gider", fmt: (v) => `$${(v ?? 0).toLocaleString()}` },
  { key: "netIncomeUsd", label: "Net gelir", fmt: (v) => `$${(v ?? 0).toLocaleString()}` },
  { key: "costRatio", label: "Gider oranı", fmt: (v) => (v == null ? "—" : `${(v * 100).toFixed(1)}%`) },
  { key: "collectionLossRatio", label: "Tahsilat kaybı", fmt: (v) => (v == null ? "—" : `${(v * 100).toFixed(1)}%`) },
  { key: "energyCostPerKmUsd", label: "Enerji maliyeti / km", fmt: (v) => (v == null ? "—" : `$${v.toFixed(3)}`) },
  { key: "userChargeRatio", label: "Kullanıcı şarj oranı", fmt: (v) => (v == null ? "—" : `${(v * 100).toFixed(1)}%`) },
  { key: "damagePer1000Trips", label: "Hasar / 1.000 yolculuk", fmt: (v) => (v == null ? "—" : v.toFixed(1)) },
  { key: "crossZoneTripRatio", label: "Yakalar arası yolculuk", fmt: (v) => (v == null ? "—" : `${(v * 100).toFixed(1)}%`) },
  { key: "unavailableHours", label: "Kullanılamaz saat", fmt: (v) => String(v ?? 0) },
];

const card = "bg-slate-800/50 rounded-xl p-4 border border-slate-700";
const input = "w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm";
const button = "px-3 py-1.5 rounded-lg bg-[#d4a574] text-white text-xs font-medium disabled:opacity-50";

function authHeaders(json = false): HeadersInit {
  const token = sessionStorage.getItem("auxite_admin_token");
  return json
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { Authorization: `Bearer ${token}` };
}

const thisMonth = () => new Date().toISOString().slice(0, 7);

export default function RentalTab() {
  const [section, setSection] = useState<Section>("overview");
  const [month, setMonth] = useState(thisMonth());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const fetchData = useCallback(async () => {
    const apiSection = section === "entries" ? "vehicles" : section;
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/rental?section=${apiSection}&month=${month}`, { headers: authHeaders() });
      setData(await res.json());
    } catch (e) {
      console.error("Rental data fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [section, month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const post = async (action: string, payload: Record<string, unknown>) => {
    setMsg("İşleniyor...");
    try {
      const res = await fetch("/api/admin/rental", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({ action, ...payload }),
      });
      const json = await res.json();
      setMsg(json.ok ? "✅ Kaydedildi" : `❌ ${json.error || "Hata"}`);
      if (json.ok) fetchData();
      return !!json.ok;
    } catch {
      setMsg("❌ Hata");
      return false;
    } finally {
      setTimeout(() => setMsg(""), 4000);
    }
  };

  const sections: { id: Section; label: string; icon: string }[] = [
    { id: "overview", label: "Özet", icon: "📊" },
    { id: "vehicles", label: "Araçlar", icon: "🚗" },
    { id: "entries", label: "Değerleme & Gider", icon: "🧾" },
    { id: "metrics", label: "Kapı 1 Metrikleri", icon: "📈" },
    { id: "nav", label: "NAV", icon: "⚖️" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">🚗 Itera — Araç Paylaşım Pilotu</h2>
        {msg && <span className="text-sm px-3 py-1 rounded bg-slate-800 text-slate-300">{msg}</span>}
      </div>

      <div className="flex gap-1 flex-wrap">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${section === s.id ? "bg-[#d4a574] text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Yükleniyor...</div>
      ) : (
        <>
          {section === "overview" && <Overview data={data} />}
          {section === "vehicles" && <Vehicles vehicles={data?.vehicles ?? []} post={post} />}
          {section === "entries" && <Entries vehicles={data?.vehicles ?? []} post={post} />}
          {section === "metrics" && <Metrics data={data} month={month} setMonth={setMonth} />}
          {section === "nav" && <Nav data={data} post={post} />}
        </>
      )}
    </div>
  );
}

type Post = (action: string, payload: Record<string, unknown>) => Promise<boolean>;

function Overview({ data }: { data: any }) {
  const nav = data?.latestNav;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className={card}>
          <div className="text-xs text-slate-500">Araç</div>
          <div className="text-2xl font-bold text-white">{data?.vehicles ?? 0}</div>
        </div>
        <div className={card}>
          <div className="text-xs text-slate-500">Son NAV</div>
          <div className="text-2xl font-bold text-[#d4a574]">{nav ? `$${nav.navUsd.toLocaleString()}` : "—"}</div>
          <div className="text-xs text-slate-500">{nav ? new Date(nav.takenAt).toLocaleString("tr-TR") : "henüz alınmadı"}</div>
        </div>
        <div className={card}>
          <div className="text-xs text-slate-500">Token başına NAV (gölge)</div>
          <div className="text-2xl font-bold text-white">{nav?.navPerToken != null ? `$${nav.navPerToken}` : "—"}</div>
        </div>
        <div className={card}>
          <div className="text-xs text-slate-500">Değerlemesi eksik araç</div>
          <div className={`text-2xl font-bold ${nav?.vehiclesMissingValuation?.length ? "text-red-400" : "text-green-400"}`}>
            {nav?.vehiclesMissingValuation?.length ?? "—"}
          </div>
        </div>
      </div>
      <div className={card}>
        <div className="text-xs text-slate-500 mb-2">Duruma göre araçlar</div>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(data?.byStatus ?? {}).length === 0 && <span className="text-sm text-slate-500">Kayıtlı araç yok</span>}
          {Object.entries(data?.byStatus ?? {}).map(([s, n]) => (
            <span key={s} className="px-2 py-1 rounded bg-slate-900 text-xs text-slate-300">
              {STATUS_LABELS[s] ?? s}: <b className="text-white">{String(n)}</b>
            </span>
          ))}
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Yolculuk geliri bu panelden girilemez; yalnızca araç paylaşım yazılımının webhook&apos;u üzerinden gelir.
      </p>
    </div>
  );
}

function Vehicles({ vehicles, post }: { vehicles: any[]; post: Post }) {
  const empty = {
    vehicleId: "", plate: "", vin: "", make: "", model: "", year: new Date().getFullYear(),
    powertrain: "ev", segment: "B", zone: "europe", acquiredAt: new Date().toISOString().slice(0, 10),
    purchasePriceTry: "", purchaseUsdTry: "",
  };
  const [f, setF] = useState<any>(empty);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  const submit = async () => {
    const ok = await post("registerVehicle", {
      vehicle: {
        ...f,
        year: Number(f.year),
        acquiredAt: Date.parse(f.acquiredAt),
        purchasePriceTry: Number(f.purchasePriceTry),
        purchaseUsdTry: Number(f.purchaseUsdTry),
      },
    });
    if (ok) setF(empty);
  };

  return (
    <div className="space-y-4">
      <div className={card}>
        <h3 className="text-sm font-semibold text-white mb-3">Araç ekle</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <input className={input} placeholder="Araç ID (ör. ITR-001)" value={f.vehicleId} onChange={set("vehicleId")} />
          <input className={input} placeholder="Plaka" value={f.plate} onChange={set("plate")} />
          <input className={input} placeholder="Şasi no (VIN)" value={f.vin} onChange={set("vin")} />
          <input className={input} placeholder="Marka" value={f.make} onChange={set("make")} />
          <input className={input} placeholder="Model" value={f.model} onChange={set("model")} />
          <input className={input} type="number" placeholder="Yıl" value={f.year} onChange={set("year")} />
          <select className={input} value={f.powertrain} onChange={set("powertrain")}>
            <option value="ev">Elektrikli (EV)</option>
            <option value="hev">Hibrit (HEV)</option>
          </select>
          <select className={input} value={f.segment} onChange={set("segment")}>
            <option value="B">B segment</option>
            <option value="C">C segment</option>
          </select>
          <select className={input} value={f.zone} onChange={set("zone")}>
            <option value="europe">Avrupa (Beşiktaş/Nişantaşı)</option>
            <option value="anatolia">Anadolu (Kadıköy/Ataşehir)</option>
          </select>
          <input className={input} type="date" value={f.acquiredAt} onChange={set("acquiredAt")} />
          <input className={input} type="number" placeholder="Alış fiyatı (TRY)" value={f.purchasePriceTry} onChange={set("purchasePriceTry")} />
          <input className={input} type="number" placeholder="USD/TRY kuru" value={f.purchaseUsdTry} onChange={set("purchaseUsdTry")} />
        </div>
        <button className={`${button} mt-3`} onClick={submit} disabled={!f.vehicleId || !f.plate || !f.vin}>
          + Kaydet
        </button>
      </div>

      <div className={`${card} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500">
              <th className="py-2 pr-3">ID</th>
              <th className="pr-3">Plaka</th>
              <th className="pr-3">Araç</th>
              <th className="pr-3">Hücre</th>
              <th className="pr-3">Yaka</th>
              <th className="pr-3">Km</th>
              <th className="pr-3">Durum</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-500">Kayıtlı araç yok</td>
              </tr>
            )}
            {vehicles.map((v) => (
              <tr key={v.vehicleId} className="border-t border-slate-700/50 text-slate-300">
                <td className="py-2 pr-3 font-mono text-white">{v.vehicleId}</td>
                <td className="pr-3">{v.plate}</td>
                <td className="pr-3">{v.make} {v.model} {v.year}</td>
                <td className="pr-3">{v.powertrain.toUpperCase()}-{v.segment}</td>
                <td className="pr-3">{v.zone === "europe" ? "Avrupa" : "Anadolu"}</td>
                <td className="pr-3">{v.odometerKm.toLocaleString()}</td>
                <td className="pr-3">
                  <select
                    className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs"
                    value={v.status}
                    disabled={v.status === "disposed"}
                    onChange={(e) => post("setStatus", { vehicleId: v.vehicleId, status: e.target.value })}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Entries({ vehicles, post }: { vehicles: any[]; post: Post }) {
  const today = new Date().toISOString().slice(0, 10);
  const emptyVal = { vehicleId: "", valueTry: "", usdTry: "", source: "index", valuer: "", valuedAt: today };
  const emptyCash = { type: "charging", vehicleId: "", amountTry: "", usdTry: "", occurredAt: today, documentRef: "", note: "" };
  const [val, setVal] = useState<any>(emptyVal);
  const [cash, setCash] = useState<any>(emptyCash);

  const vehicleSelect = (value: string, onChange: (e: any) => void, allowFleet: boolean) => (
    <select className={input} value={value} onChange={onChange}>
      <option value="">{allowFleet ? "Filo geneli" : "Araç seçin"}</option>
      {vehicles.map((v) => (
        <option key={v.vehicleId} value={v.vehicleId}>{v.vehicleId} · {v.plate}</option>
      ))}
    </select>
  );

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className={card}>
        <h3 className="text-sm font-semibold text-white mb-1">Dış değerleme</h3>
        <p className="text-xs text-slate-500 mb-3">İkinci el endeksi, ekspertiz veya satış. Operatör kendi tahminini girmez.</p>
        <div className="grid grid-cols-2 gap-2">
          {vehicleSelect(val.vehicleId, (e) => setVal({ ...val, vehicleId: e.target.value }), false)}
          <select className={input} value={val.source} onChange={(e) => setVal({ ...val, source: e.target.value })}>
            <option value="index">Fiyat endeksi</option>
            <option value="appraisal">Ekspertiz</option>
            <option value="sale">Satış</option>
          </select>
          <input className={input} type="number" placeholder="Değer (TRY)" value={val.valueTry} onChange={(e) => setVal({ ...val, valueTry: e.target.value })} />
          <input className={input} type="number" placeholder="USD/TRY kuru" value={val.usdTry} onChange={(e) => setVal({ ...val, usdTry: e.target.value })} />
          <input className={input} placeholder="Değerleyen (kurum)" value={val.valuer} onChange={(e) => setVal({ ...val, valuer: e.target.value })} />
          <input className={input} type="date" value={val.valuedAt} onChange={(e) => setVal({ ...val, valuedAt: e.target.value })} />
        </div>
        <button
          className={`${button} mt-3`}
          disabled={!val.vehicleId || !val.valuer}
          onClick={async () => {
            const ok = await post("recordValuation", {
              ...val,
              valueTry: Number(val.valueTry),
              usdTry: Number(val.usdTry),
              valuedAt: Date.parse(val.valuedAt),
            });
            if (ok) setVal(emptyVal);
          }}
        >
          Değerlemeyi kaydet
        </button>
      </div>

      <div className={card}>
        <h3 className="text-sm font-semibold text-white mb-1">Gider / sermaye hareketi</h3>
        <p className="text-xs text-slate-500 mb-3">Her kayıt için belge numarası zorunlu. Yolculuk geliri buradan girilemez.</p>
        <div className="grid grid-cols-2 gap-2">
          <select className={input} value={cash.type} onChange={(e) => setCash({ ...cash, type: e.target.value })}>
            {COST_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {vehicleSelect(cash.vehicleId, (e) => setCash({ ...cash, vehicleId: e.target.value }), true)}
          <input className={input} type="number" placeholder="Tutar (TRY)" value={cash.amountTry} onChange={(e) => setCash({ ...cash, amountTry: e.target.value })} />
          <input className={input} type="number" placeholder="USD/TRY kuru" value={cash.usdTry} onChange={(e) => setCash({ ...cash, usdTry: e.target.value })} />
          <input className={input} type="date" value={cash.occurredAt} onChange={(e) => setCash({ ...cash, occurredAt: e.target.value })} />
          <input className={input} placeholder="Belge no (fatura/dekont)" value={cash.documentRef} onChange={(e) => setCash({ ...cash, documentRef: e.target.value })} />
          <input className={`${input} col-span-2`} placeholder="Not (opsiyonel)" value={cash.note} onChange={(e) => setCash({ ...cash, note: e.target.value })} />
        </div>
        <button
          className={`${button} mt-3`}
          disabled={!cash.documentRef}
          onClick={async () => {
            const ok = await post("addCashEvent", {
              ...cash,
              amountTry: Number(cash.amountTry),
              usdTry: Number(cash.usdTry),
              occurredAt: Date.parse(cash.occurredAt),
            });
            if (ok) setCash(emptyCash);
          }}
        >
          Kaydet
        </button>
      </div>
    </div>
  );
}

function Metrics({ data, month, setMonth }: { data: any; month: string; setMonth: (m: string) => void }) {
  const m = data?.metrics;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Ay</span>
        <input type="month" className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>
      <div className={`${card} overflow-x-auto`}>
        {!m ? (
          <div className="text-sm text-slate-500">{data?.error ?? "Veri yok"}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="py-2 pr-3">Metrik</th>
                {CELLS.map((c) => (
                  <th key={c} className="pr-3 text-right">{c === "ALL" ? "Toplam" : c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METRIC_ROWS.map((r) => (
                <tr key={r.key} className="border-t border-slate-700/50">
                  <td className="py-2 pr-3 text-slate-400">{r.label}</td>
                  {CELLS.map((c) => (
                    <td key={c} className={`pr-3 text-right ${c === "ALL" ? "text-white font-semibold" : "text-slate-300"}`}>
                      {r.fmt(m[c]?.[r.key] ?? null)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-slate-500">Hücre sütunları yalnızca araca bağlı giderleri içerir; filo geneli giderler sadece Toplam sütununda.</p>
    </div>
  );
}

function Nav({ data, post }: { data: any; post: Post }) {
  const [supply, setSupply] = useState<string>(String(data?.config?.shadowSupply ?? 0));
  const [liab, setLiab] = useState<string>(String(data?.config?.liabilitiesUsd ?? 0));
  const snaps: any[] = [...(data?.snapshots ?? [])].reverse();

  return (
    <div className="space-y-4">
      <div className={card}>
        <h3 className="text-sm font-semibold text-white mb-3">Gölge token ayarları</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
          <label className="text-xs text-slate-500">
            Gölge arz (token)
            <input className={input} type="number" value={supply} onChange={(e) => setSupply(e.target.value)} />
          </label>
          <label className="text-xs text-slate-500">
            Borçlar (USD)
            <input className={input} type="number" value={liab} onChange={(e) => setLiab(e.target.value)} />
          </label>
          <button className={button} onClick={() => post("setConfig", { shadowSupply: Number(supply), liabilitiesUsd: Number(liab) })}>
            Ayarları kaydet
          </button>
          <button className={button} onClick={() => post("snapshotNav", {})}>
            NAV hesapla
          </button>
        </div>
      </div>

      <div className={`${card} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500">
              <th className="py-2 pr-3">Tarih</th>
              <th className="pr-3 text-right">Filo değeri</th>
              <th className="pr-3 text-right">Nakit</th>
              <th className="pr-3 text-right">Borç</th>
              <th className="pr-3 text-right">NAV</th>
              <th className="pr-3 text-right">Token başına</th>
              <th className="pr-3 text-right">Değerlemesiz</th>
            </tr>
          </thead>
          <tbody>
            {snaps.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-500">Henüz NAV alınmadı</td>
              </tr>
            )}
            {snaps.map((s) => (
              <tr key={s.takenAt} className="border-t border-slate-700/50 text-slate-300">
                <td className="py-2 pr-3">{new Date(s.takenAt).toLocaleString("tr-TR")}</td>
                <td className="pr-3 text-right">${s.fleetValueUsd.toLocaleString()}</td>
                <td className="pr-3 text-right">${s.cashUsd.toLocaleString()}</td>
                <td className="pr-3 text-right">${s.liabilitiesUsd.toLocaleString()}</td>
                <td className="pr-3 text-right text-white font-semibold">${s.navUsd.toLocaleString()}</td>
                <td className="pr-3 text-right">{s.navPerToken != null ? `$${s.navPerToken}` : "—"}</td>
                <td className={`pr-3 text-right ${s.vehiclesMissingValuation.length ? "text-red-400" : ""}`}>{s.vehiclesMissingValuation.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
