"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

interface PriceSettings {
  AUXG: { askAdjust: number; bidAdjust: number };
  AUXS: { askAdjust: number; bidAdjust: number };
  AUXPT: { askAdjust: number; bidAdjust: number };
  AUXPD: { askAdjust: number; bidAdjust: number };
  ETH: { askAdjust: number; bidAdjust: number };
  BTC: { askAdjust: number; bidAdjust: number };
}

interface LivePrices {
  AUXG: number;
  AUXS: number;
  AUXPT: number;
  AUXPD: number;
  ETH: number;
  BTC: number;
}

const DEFAULT_SETTINGS: PriceSettings = {
  AUXG: { askAdjust: 2, bidAdjust: -1 },
  AUXS: { askAdjust: 3, bidAdjust: -1.5 },
  AUXPT: { askAdjust: 2.5, bidAdjust: -1.25 },
  AUXPD: { askAdjust: 2.5, bidAdjust: -1.25 },
  ETH: { askAdjust: 1, bidAdjust: -0.5 },
  BTC: { askAdjust: 1, bidAdjust: -0.5 },
};

export default function AdminPage() {
  const [settings, setSettings] = useState<PriceSettings>(DEFAULT_SETTINGS);
  const [basePrices, setBasePrices] = useState<LivePrices>({ AUXG: 0, AUXS: 0, AUXPT: 0, AUXPD: 0, ETH: 0, BTC: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  const ADMIN_PASSWORD = "auxite2024";

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/admin/settings");
        if (res.ok) {
          const data = await res.json();
          if (data && data.AUXG) {
            setSettings({ ...DEFAULT_SETTINGS, ...data });
          }
        }
      } catch (e) {
        console.error("Failed to load settings:", e);
      }
    };

    const auth = sessionStorage.getItem("auxite_admin_auth");
    if (auth === "true") {
      setAuthenticated(true);
      loadSettings();
    }
  }, []);

  useEffect(() => {
    if (!authenticated) return;

    const fetchPrices = async () => {
      try {
        // Metal fiyatları
        const metalRes = await fetch("/api/prices");
        const metalData = await metalRes.json();
        
        // Crypto fiyatları
        const cryptoRes = await fetch("/api/crypto");
        const cryptoData = await cryptoRes.json();
        
        setBasePrices({
          AUXG: metalData.basePrices?.AUXG || 0,
          AUXS: metalData.basePrices?.AUXS || 0,
          AUXPT: metalData.basePrices?.AUXPT || 0,
          AUXPD: metalData.basePrices?.AUXPD || 0,
          ETH: cryptoData.ethereum?.usd || 0,
          BTC: cryptoData.bitcoin?.usd || 0,
        });
        
        if (metalData.settings && metalData.settings.AUXG) {
          setSettings(prev => ({ ...prev, ...metalData.settings }));
        }
        setLastUpdated(new Date());
      } catch (e) {
        console.error("Failed to fetch prices:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 5000);
    return () => clearInterval(interval);
  }, [authenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      sessionStorage.setItem("auxite_admin_auth", "true");
      setError("");
    } else {
      setError("Yanlış şifre!");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage("");
    
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      
      if (res.ok) {
        setSaveMessage("✅ Ayarlar kaydedildi!");
      } else {
        const errorData = await res.json();
        setSaveMessage(`❌ Hata: ${errorData.error || "Kaydetme hatası"}`);
      }
    } catch (e) {
      setSaveMessage("❌ Bağlantı hatası!");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(""), 3000);
    }
  };

  const calculatePrice = (basePrice: number, adjustment: number) => {
    if (!basePrice || isNaN(basePrice) || isNaN(adjustment)) return 0;
    return basePrice * (1 + adjustment / 100);
  };

  const updateSetting = (
    metal: keyof PriceSettings,
    field: "askAdjust" | "bidAdjust",
    value: string
  ) => {
    const numValue = parseFloat(value) || 0;
    setSettings((prev) => ({
      ...prev,
      [metal]: { ...prev[metal], [field]: numValue },
    }));
  };

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="w-full max-w-md p-8">
          <div className="text-center mb-8">
            <Image
              src="/auxite-wallet-logo.png"
              alt="Auxite"
              width={160}
              height={40}
              className="h-12 w-auto mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-slate-100">Admin Girişi</h1>
            <p className="text-slate-400 mt-2">Fiyat ayarlarını yönetmek için giriş yapın</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Şifre</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                placeholder="Admin şifresi"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              className="w-full px-4 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-colors"
            >
              Giriş Yap
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-slate-400 hover:text-emerald-400">
              ← Ana Sayfaya Dön
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const metals = [
    { key: "AUXG" as const, name: "Altın (Gold)", color: "text-amber-400", icon: "/gold-favicon-32x32.png" },
    { key: "AUXS" as const, name: "Gümüş (Silver)", color: "text-slate-300", icon: "/silver-favicon-32x32.png" },
    { key: "AUXPT" as const, name: "Platin (Platinum)", color: "text-blue-400", icon: "/platinum-favicon-32x32.png" },
    { key: "AUXPD" as const, name: "Paladyum (Palladium)", color: "text-purple-400", icon: "/palladium-favicon-32x32.png" },
  ];

  const cryptos = [
    { key: "ETH" as const, name: "Ethereum", color: "text-[#627EEA]", icon: "ETH" },
    { key: "BTC" as const, name: "Bitcoin", color: "text-[#F7931A]", icon: "BTC" },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Image
                  src="/auxite-wallet-logo.png"
                  alt="Auxite"
                  width={160}
                  height={40}
                  className="h-10 w-auto"
                />
              </Link>
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-sm font-medium">
                Admin Panel
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span>Canlı</span>
              </div>
              <span className="text-sm text-slate-500">
                {lastUpdated?.toLocaleTimeString("tr-TR") || "-"}
              </span>
              <button
                onClick={() => {
                  sessionStorage.removeItem("auxite_admin_auth");
                  setAuthenticated(false);
                }}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-colors"
              >
                Çıkış
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-100 mb-2">💰 Fiyat Ayarları</h1>
          <p className="text-slate-400">
            Satış ve alış fiyatlarını baz fiyata göre ayarlayın.
          </p>
        </div>

        {/* Info Banner */}
        <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <h3 className="font-medium text-blue-300 mb-2">Nasıl Çalışır?</h3>
              <div className="text-sm text-blue-200 space-y-1">
                <p><span className="text-emerald-400 font-semibold">Satış Fiyatı</span> = Baz × (1 + Ayar%) → <span className="text-emerald-400">+2</span> yazarsan fiyat %2 artar</p>
                <p><span className="text-red-400 font-semibold">Alış Fiyatı</span> = Baz × (1 + Ayar%) → <span className="text-red-400">-1</span> yazarsan fiyat %1 düşer</p>
                <p className="text-blue-200/60 mt-2 pt-2 border-t border-blue-500/20">
                  <strong>Örnek:</strong> Baz $100 | Satış +2 = $102 | Alış -1 = $99 | Makas = $3
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Metal Price Table */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-200 mb-4">🥇 Metal Fiyatları</h2>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-800/50">
                    <th className="px-4 py-4 text-left text-sm font-medium text-slate-400">Metal</th>
                    <th className="px-4 py-4 text-right text-sm font-medium text-slate-400">Baz Fiyat</th>
                    <th className="px-4 py-4 text-center text-sm font-medium text-slate-400">
                      <span className="text-emerald-400">Satış Ayarı %</span>
                      <div className="text-xs text-slate-500 font-normal">Müşteri alırken</div>
                    </th>
                    <th className="px-4 py-4 text-center text-sm font-medium text-slate-400">
                      <span className="text-red-400">Alış Ayarı %</span>
                      <div className="text-xs text-slate-500 font-normal">Müşteri satarken</div>
                    </th>
                    <th className="px-4 py-4 text-right text-sm font-medium text-emerald-400">Satış Fiyatı</th>
                    <th className="px-4 py-4 text-right text-sm font-medium text-red-400">Alış Fiyatı</th>
                    <th className="px-4 py-4 text-right text-sm font-medium text-amber-400">Makas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {metals.map((metal) => {
                    const basePrice = basePrices[metal.key] || 0;
                    const setting = settings[metal.key] || { askAdjust: 2, bidAdjust: -1 };
                    const askPrice = calculatePrice(basePrice, setting.askAdjust);
                    const bidPrice = calculatePrice(basePrice, setting.bidAdjust);
                    const makas = askPrice - bidPrice;
                    const makasPercent = basePrice > 0 ? ((makas / basePrice) * 100) : 0;

                    return (
                      <tr key={metal.key} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <img src={metal.icon} alt={metal.name} className="w-8 h-8" />
                            <div>
                              <div className={`font-semibold ${metal.color}`}>{metal.key}</div>
                              <div className="text-xs text-slate-500">{metal.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          {loading ? (
                            <div className="animate-pulse h-6 w-16 bg-slate-700 rounded ml-auto"></div>
                          ) : (
                            <span className="font-mono text-slate-300">${basePrice.toFixed(2)}</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              step="0.1"
                              value={setting.askAdjust}
                              onChange={(e) => updateSetting(metal.key, "askAdjust", e.target.value)}
                              className="w-20 px-2 py-2 rounded-lg bg-slate-800 border border-emerald-500/30 text-center text-white focus:outline-none focus:border-emerald-500"
                            />
                            <span className="text-slate-500">%</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              step="0.1"
                              value={setting.bidAdjust}
                              onChange={(e) => updateSetting(metal.key, "bidAdjust", e.target.value)}
                              className="w-20 px-2 py-2 rounded-lg bg-slate-800 border border-red-500/30 text-center text-white focus:outline-none focus:border-red-500"
                            />
                            <span className="text-slate-500">%</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          {loading ? (
                            <div className="animate-pulse h-6 w-16 bg-slate-700 rounded ml-auto"></div>
                          ) : (
                            <span className="font-mono text-emerald-400 font-semibold">${askPrice.toFixed(2)}</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          {loading ? (
                            <div className="animate-pulse h-6 w-16 bg-slate-700 rounded ml-auto"></div>
                          ) : (
                            <span className="font-mono text-red-400 font-semibold">${bidPrice.toFixed(2)}</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          {loading ? (
                            <div className="animate-pulse h-6 w-16 bg-slate-700 rounded ml-auto"></div>
                          ) : (
                            <div>
                              <span className="font-mono text-amber-400 font-semibold">${makas.toFixed(2)}</span>
                              <div className="text-xs text-slate-500">{makasPercent.toFixed(2)}%</div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Crypto Price Table */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-200 mb-4">💎 Kripto Fiyatları</h2>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-800/50">
                    <th className="px-4 py-4 text-left text-sm font-medium text-slate-400">Kripto</th>
                    <th className="px-4 py-4 text-right text-sm font-medium text-slate-400">Baz Fiyat</th>
                    <th className="px-4 py-4 text-center text-sm font-medium text-slate-400">
                      <span className="text-emerald-400">Satış Ayarı %</span>
                      <div className="text-xs text-slate-500 font-normal">Müşteri alırken</div>
                    </th>
                    <th className="px-4 py-4 text-center text-sm font-medium text-slate-400">
                      <span className="text-red-400">Alış Ayarı %</span>
                      <div className="text-xs text-slate-500 font-normal">Müşteri satarken</div>
                    </th>
                    <th className="px-4 py-4 text-right text-sm font-medium text-emerald-400">Satış Fiyatı</th>
                    <th className="px-4 py-4 text-right text-sm font-medium text-red-400">Alış Fiyatı</th>
                    <th className="px-4 py-4 text-right text-sm font-medium text-amber-400">Makas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {cryptos.map((crypto) => {
                    const basePrice = basePrices[crypto.key] || 0;
                    const setting = settings[crypto.key] || { askAdjust: 1, bidAdjust: -0.5 };
                    const askPrice = calculatePrice(basePrice, setting.askAdjust);
                    const bidPrice = calculatePrice(basePrice, setting.bidAdjust);
                    const makas = askPrice - bidPrice;
                    const makasPercent = basePrice > 0 ? ((makas / basePrice) * 100) : 0;

                    return (
                      <tr key={crypto.key} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${crypto.key === "ETH" ? "bg-[#627EEA]" : "bg-[#F7931A]"}`}>
                              <span className="text-white text-sm font-bold">
                                {crypto.key === "ETH" ? "Ξ" : "₿"}
                              </span>
                            </div>
                            <div>
                              <div className={`font-semibold ${crypto.color}`}>{crypto.key}</div>
                              <div className="text-xs text-slate-500">{crypto.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          {loading ? (
                            <div className="animate-pulse h-6 w-24 bg-slate-700 rounded ml-auto"></div>
                          ) : (
                            <span className="font-mono text-slate-300">
                              ${basePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              step="0.1"
                              value={setting.askAdjust}
                              onChange={(e) => updateSetting(crypto.key, "askAdjust", e.target.value)}
                              className="w-20 px-2 py-2 rounded-lg bg-slate-800 border border-emerald-500/30 text-center text-white focus:outline-none focus:border-emerald-500"
                            />
                            <span className="text-slate-500">%</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              step="0.1"
                              value={setting.bidAdjust}
                              onChange={(e) => updateSetting(crypto.key, "bidAdjust", e.target.value)}
                              className="w-20 px-2 py-2 rounded-lg bg-slate-800 border border-red-500/30 text-center text-white focus:outline-none focus:border-red-500"
                            />
                            <span className="text-slate-500">%</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          {loading ? (
                            <div className="animate-pulse h-6 w-24 bg-slate-700 rounded ml-auto"></div>
                          ) : (
                            <span className="font-mono text-emerald-400 font-semibold">
                              ${askPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          {loading ? (
                            <div className="animate-pulse h-6 w-24 bg-slate-700 rounded ml-auto"></div>
                          ) : (
                            <span className="font-mono text-red-400 font-semibold">
                              ${bidPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          {loading ? (
                            <div className="animate-pulse h-6 w-24 bg-slate-700 rounded ml-auto"></div>
                          ) : (
                            <div>
                              <span className="font-mono text-amber-400 font-semibold">
                                ${makas.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              <div className="text-xs text-slate-500">{makasPercent.toFixed(2)}%</div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm">
            {saveMessage && (
              <span className={saveMessage.includes("✅") ? "text-emerald-400" : "text-red-400"}>
                {saveMessage}
              </span>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white font-semibold transition-colors flex items-center gap-2"
          >
            {saving ? "Kaydediliyor..." : "💾 Ayarları Kaydet"}
          </button>
        </div>

        {/* Quick Presets */}
        <div className="mt-8 p-6 rounded-xl border border-slate-800 bg-slate-900/50">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">⚡ Hızlı Ayarlar</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSettings({
                AUXG: { askAdjust: 1, bidAdjust: -0.5 },
                AUXS: { askAdjust: 1.5, bidAdjust: -0.75 },
                AUXPT: { askAdjust: 1.25, bidAdjust: -0.6 },
                AUXPD: { askAdjust: 1.25, bidAdjust: -0.6 },
                ETH: { askAdjust: 0.5, bidAdjust: -0.25 },
                BTC: { askAdjust: 0.5, bidAdjust: -0.25 },
              })}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-colors"
            >
              🏷️ Düşük Makas
            </button>
            <button
              onClick={() => setSettings(DEFAULT_SETTINGS)}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-colors"
            >
              ⚖️ Varsayılan
            </button>
            <button
              onClick={() => setSettings({
                AUXG: { askAdjust: 3, bidAdjust: -1.5 },
                AUXS: { askAdjust: 4, bidAdjust: -2 },
                AUXPT: { askAdjust: 3.5, bidAdjust: -1.75 },
                AUXPD: { askAdjust: 3.5, bidAdjust: -1.75 },
                ETH: { askAdjust: 2, bidAdjust: -1 },
                BTC: { askAdjust: 2, bidAdjust: -1 },
              })}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-colors"
            >
              💰 Yüksek Makas
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <Link href="/" className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-colors">
            ← Markets
          </Link>
        </div>
      </div>
    </main>
  );
}
