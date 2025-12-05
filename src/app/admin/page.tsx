"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";

interface PriceSettings {
  AUXG: { askAdjust: number; bidAdjust: number };
  AUXS: { askAdjust: number; bidAdjust: number };
  AUXPT: { askAdjust: number; bidAdjust: number };
  AUXPD: { askAdjust: number; bidAdjust: number };
  ETH: { askAdjust: number; bidAdjust: number };
  BTC: { askAdjust: number; bidAdjust: number };
  XRP: { askAdjust: number; bidAdjust: number };
  SOL: { askAdjust: number; bidAdjust: number };
}

interface LivePrices {
  AUXG: number;
  AUXS: number;
  AUXPT: number;
  AUXPD: number;
  ETH: number;
  BTC: number;
  XRP: number;
  SOL: number;
}

interface NewsItem {
  id: string;
  title: string;
  description: string;
  fullContent?: string;
  url?: string;
  source: string;
  date: string;
  icon: string;
  color: string;
}

interface NewsData {
  tr: NewsItem[];
  en: NewsItem[];
}

const DEFAULT_SETTINGS: PriceSettings = {
  AUXG: { askAdjust: 2, bidAdjust: -1 },
  AUXS: { askAdjust: 3, bidAdjust: -1.5 },
  AUXPT: { askAdjust: 2.5, bidAdjust: -1.25 },
  AUXPD: { askAdjust: 2.5, bidAdjust: -1.25 },
  ETH: { askAdjust: 1, bidAdjust: -0.5 },
  BTC: { askAdjust: 1, bidAdjust: -0.5 },
  XRP: { askAdjust: 1.5, bidAdjust: -0.75 },
  SOL: { askAdjust: 1.5, bidAdjust: -0.75 },
};

const DEFAULT_NEWS: NewsData = {
  tr: [],
  en: [],
};

const ICON_OPTIONS = [
  { value: 'gift', label: '🎁', name: 'Hediye' },
  { value: 'trending-up', label: '📈', name: 'Yükseliş' },
  { value: 'trending-down', label: '📉', name: 'Düşüş' },
  { value: 'package', label: '📦', name: 'Paket' },
  { value: 'award', label: '🏆', name: 'Ödül' },
  { value: 'zap', label: '⚡', name: 'Hızlı' },
  { value: 'globe', label: '🌍', name: 'Dünya' },
  { value: 'shield', label: '🛡️', name: 'Güvenlik' },
  { value: 'star', label: '⭐', name: 'Yıldız' },
  { value: 'bell', label: '🔔', name: 'Bildirim' },
  { value: 'info', label: 'ℹ️', name: 'Bilgi' },
  { value: 'alert-circle', label: '⚠️', name: 'Uyarı' },
];

const COLOR_OPTIONS = [
  { value: '#8B5CF6', name: 'Mor' },
  { value: '#FFD700', name: 'Altın' },
  { value: '#10B981', name: 'Yeşil' },
  { value: '#F7931A', name: 'Turuncu' },
  { value: '#627EEA', name: 'Mavi' },
  { value: '#EF4444', name: 'Kırmızı' },
];

export default function AdminPage() {
  const [settings, setSettings] = useState<PriceSettings>(DEFAULT_SETTINGS);
  const [basePrices, setBasePrices] = useState<LivePrices>({ 
    AUXG: 0, AUXS: 0, AUXPT: 0, AUXPD: 0, 
    ETH: 0, BTC: 0, XRP: 0, SOL: 0 
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  
  // ✅ BUG FIX: Input düzenleme sırasında settings'in üzerine yazılmasını engelle
  const [isEditing, setIsEditing] = useState(false);
  const settingsLoadedRef = useRef(false);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'prices' | 'news' | 'wallet' | 'wallet'>('prices');
  
  // News state
  const [newsData, setNewsData] = useState<NewsData>(DEFAULT_NEWS);
  const [newsLang, setNewsLang] = useState<'tr' | 'en'>('tr');
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsSaving, setNewsSaving] = useState(false);
  const [newsMessage, setNewsMessage] = useState("");

  // Hot Wallet state
  const [hotWalletData, setHotWalletData] = useState<any>(null);
  const [hotWalletLoading, setHotWalletLoading] = useState(false);
  
  // New news form
  const [newNews, setNewNews] = useState({
    title: '',
    description: '',
    fullContent: '',
    url: '',
    source: 'Auxite',
    date: '',
    icon: 'gift',
    color: '#8B5CF6',
  });


  // İlk yükleme - settings'i sadece bir kez yükle
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/admin/settings");
        if (res.ok) {
          const data = await res.json();
          if (data && data.AUXG) {
            setSettings({ ...DEFAULT_SETTINGS, ...data });
            settingsLoadedRef.current = true;
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

  // Fiyatları periyodik güncelle - ✅ BUG FIX: Settings'i sadece ilk yüklemede al
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
          XRP: cryptoData.ripple?.usd || 0,
          SOL: cryptoData.solana?.usd || 0,
        });
        
        // ✅ BUG FIX: Settings'i sadece ilk yüklemede ve düzenleme yapılmıyorken güncelle
        if (!settingsLoadedRef.current && !isEditing && metalData.settings && metalData.settings.AUXG) {
          setSettings(prev => ({ ...DEFAULT_SETTINGS, ...prev, ...metalData.settings }));
          settingsLoadedRef.current = true;
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
  }, [authenticated, isEditing]);

  // Haberleri yükle
  useEffect(() => {
    if (!authenticated || activeTab !== 'news') return;
    
    const loadNews = async () => {
      setNewsLoading(true);
      try {
        const res = await fetch("/api/news?all=true");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.allNews) {
            setNewsData(data.allNews);
          }
        }
      } catch (e) {
        console.error("Failed to load news:", e);
      } finally {
        setNewsLoading(false);
      }
    };
    
    loadNews();
  }, [authenticated, activeTab]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      
      const data = await res.json();
      
      if (data.success && data.token) {
        setAuthenticated(true);
        sessionStorage.setItem("auxite_admin_token", data.token);
        setError("");
      } else {
        setError(data.error || "Yanlış şifre!");
      }
    } catch (err) {
      setError("Bağlantı hatası!");
    }
  };
  const handleSave = async () => {
    setSaving(true);
    setSaveMessage("");
    setIsEditing(false); // Kaydetme sonrası editing'i kapat
    
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      
      if (res.ok) {
        setSaveMessage("✅ Ayarlar kaydedildi!");
        settingsLoadedRef.current = true; // Kaydedilen ayarları koru
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
    asset: keyof PriceSettings,
    field: "askAdjust" | "bidAdjust",
    value: string
  ) => {
    setIsEditing(true); // ✅ Düzenleme başladı
    const numValue = parseFloat(value) || 0;
    setSettings((prev) => ({
      ...prev,
      [asset]: { ...prev[asset], [field]: numValue },
    }));
  };

  // Haber kaydet
  const handleSaveNews = async () => {
    setNewsSaving(true);
    setNewsMessage("");
    
    try {
      const res = await fetch("/api/news", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionStorage.getItem("auxite_admin_token") || ""}`,
        },
        body: JSON.stringify(newsData),
      });
      
      if (res.ok) {
        setNewsMessage("✅ Haberler kaydedildi!");
      } else {
        setNewsMessage("❌ Kaydetme hatası!");
      }
    } catch (e) {
      setNewsMessage("❌ Bağlantı hatası!");
    } finally {
      setNewsSaving(false);
      setTimeout(() => setNewsMessage(""), 3000);
    }
  };

  // Haber ekle
  const addNews = () => {
    if (!newNews.title || !newNews.description) {
      alert('Başlık ve açıklama gerekli!');
      return;
    }
    
    const news: NewsItem = {
      id: Date.now().toString(),
      title: newNews.title,
      description: newNews.description,
      fullContent: newNews.fullContent || undefined,
      url: newNews.url || undefined,
      source: newNews.source || 'Auxite',
      date: newNews.date || new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
      icon: newNews.icon,
      color: newNews.color,
    };
    
    setNewsData(prev => ({
      ...prev,
      [newsLang]: [news, ...prev[newsLang]],
    }));
    
    // Form'u temizle
    setNewNews({
      title: '',
      description: '',
      fullContent: '',
      url: '',
      source: 'Auxite',
      date: '',
      icon: 'gift',
      color: '#8B5CF6',
    });
  };

  // Haber sil
  const deleteNews = (id: string) => {
    if (confirm('Bu haberi silmek istediğinize emin misiniz?')) {
      setNewsData(prev => ({
        ...prev,
        [newsLang]: prev[newsLang].filter(n => n.id !== id),
      }));
    }
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
            <p className="text-slate-400 mt-2">Fiyat ve haber ayarlarını yönetmek için giriş yapın</p>
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
    { key: "BTC" as const, name: "Bitcoin", color: "text-[#F7931A]", bgColor: "bg-[#F7931A]", icon: "₿" },
    { key: "ETH" as const, name: "Ethereum", color: "text-[#627EEA]", bgColor: "bg-[#627EEA]", icon: "Ξ" },
    { key: "XRP" as const, name: "Ripple", color: "text-[#23292F]", bgColor: "bg-[#23292F]", icon: "✕" },
    { key: "SOL" as const, name: "Solana", color: "text-[#9945FF]", bgColor: "bg-[#9945FF]", icon: "◎" },
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
              {isEditing && (
                <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-400 text-xs">
                  Düzenleniyor...
                </span>
              )}
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

      {/* Tabs */}
      <div className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('prices')}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === 'prices'
                  ? 'text-emerald-400 border-b-2 border-emerald-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              💰 Fiyat Ayarları
            </button>
            <button
              onClick={() => setActiveTab('news')}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === 'news'
                  ? 'text-emerald-400 border-b-2 border-emerald-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              📰 Haber Yönetimi
            </button>
            <button
              onClick={() => setActiveTab('wallet')}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === 'wallet'
                  ? 'text-emerald-400 border-b-2 border-emerald-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              🔐 Hot Wallet
            </button>
        </div>
          </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* ==================== FİYAT AYARLARI TAB ==================== */}
        {activeTab === 'prices' && (
          <>
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
                                <Image
                                  src={metal.icon}
                                  alt={metal.name}
                                  width={32}
                                  height={32}
                                  className="w-8 h-8"
                                />
                                <div>
                                  <div className={`font-semibold ${metal.color}`}>{metal.key}</div>
                                  <div className="text-xs text-slate-500">{metal.name}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-right">
                              {loading ? (
                                <div className="animate-pulse h-6 w-24 bg-slate-700 rounded ml-auto"></div>
                              ) : (
                                <span className="font-mono text-slate-300">
                                  ${basePrice.toFixed(2)}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="number"
                                  step="0.1"
                                  value={setting.askAdjust}
                                  onChange={(e) => updateSetting(metal.key, "askAdjust", e.target.value)}
                                  onFocus={() => setIsEditing(true)}
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
                                  onFocus={() => setIsEditing(true)}
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
                                  ${askPrice.toFixed(2)}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-right">
                              {loading ? (
                                <div className="animate-pulse h-6 w-24 bg-slate-700 rounded ml-auto"></div>
                              ) : (
                                <span className="font-mono text-red-400 font-semibold">
                                  ${bidPrice.toFixed(2)}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-right">
                              {loading ? (
                                <div className="animate-pulse h-6 w-24 bg-slate-700 rounded ml-auto"></div>
                              ) : (
                                <div>
                                  <span className="font-mono text-amber-400 font-semibold">
                                    ${makas.toFixed(2)}
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
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${crypto.bgColor}`}>
                                  <span className="text-white text-sm font-bold">{crypto.icon}</span>
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
                                  onFocus={() => setIsEditing(true)}
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
                                  onFocus={() => setIsEditing(true)}
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
              <div className="text-sm flex items-center gap-4">
                {saveMessage && (
                  <span className={saveMessage.includes("✅") ? "text-emerald-400" : "text-red-400"}>
                    {saveMessage}
                  </span>
                )}
                {isEditing && (
                  <span className="text-amber-400">
                    ⚠️ Kaydedilmemiş değişiklikler var
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
                  onClick={() => {
                    setIsEditing(true);
                    setSettings({
                      AUXG: { askAdjust: 1, bidAdjust: -0.5 },
                      AUXS: { askAdjust: 1.5, bidAdjust: -0.75 },
                      AUXPT: { askAdjust: 1.25, bidAdjust: -0.6 },
                      AUXPD: { askAdjust: 1.25, bidAdjust: -0.6 },
                      ETH: { askAdjust: 0.5, bidAdjust: -0.25 },
                      BTC: { askAdjust: 0.5, bidAdjust: -0.25 },
                      XRP: { askAdjust: 0.75, bidAdjust: -0.35 },
                      SOL: { askAdjust: 0.75, bidAdjust: -0.35 },
                    });
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-colors"
                >
                  🏷️ Düşük Makas
                </button>
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setSettings(DEFAULT_SETTINGS);
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-colors"
                >
                  ⚖️ Varsayılan
                </button>
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setSettings({
                      AUXG: { askAdjust: 3, bidAdjust: -1.5 },
                      AUXS: { askAdjust: 4, bidAdjust: -2 },
                      AUXPT: { askAdjust: 3.5, bidAdjust: -1.75 },
                      AUXPD: { askAdjust: 3.5, bidAdjust: -1.75 },
                      ETH: { askAdjust: 2, bidAdjust: -1 },
                      BTC: { askAdjust: 2, bidAdjust: -1 },
                      XRP: { askAdjust: 2.5, bidAdjust: -1.25 },
                      SOL: { askAdjust: 2.5, bidAdjust: -1.25 },
                    });
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-colors"
                >
                  💰 Yüksek Makas
                </button>
              </div>
            </div>
          </>
        )}

        {/* ==================== HABER YÖNETİMİ TAB ==================== */}
        {activeTab === 'news' && (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-100 mb-2">📰 Haber Yönetimi</h1>
              <p className="text-slate-400">
                Mobil uygulama için haberleri yönetin. Her gün 2-3 haber ekleyebilirsiniz.
              </p>
            </div>

            {/* Language Toggle */}
            <div className="mb-6 flex gap-2">
              <button
                onClick={() => setNewsLang('tr')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  newsLang === 'tr'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                🇹🇷 Türkçe
              </button>
              <button
                onClick={() => setNewsLang('en')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  newsLang === 'en'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                🇬🇧 English
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Yeni Haber Formu */}
              <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50">
                <h3 className="text-lg font-semibold text-slate-200 mb-4">➕ Yeni Haber Ekle</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Başlık *</label>
                    <input
                      type="text"
                      value={newNews.title}
                      onChange={(e) => setNewNews(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                      placeholder={newsLang === 'tr' ? 'Haber başlığı...' : 'News title...'}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Açıklama *</label>
                    <textarea
                      value={newNews.description}
                      onChange={(e) => setNewNews(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-emerald-500 min-h-[80px]"
                      placeholder={newsLang === 'tr' ? 'Kısa açıklama (liste görünümünde gösterilir)...' : 'Short description (shown in list view)...'}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Tam İçerik (Opsiyonel)</label>
                    <textarea
                      value={newNews.fullContent}
                      onChange={(e) => setNewNews(prev => ({ ...prev, fullContent: e.target.value }))}
                      className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-emerald-500 min-h-[120px]"
                      placeholder={newsLang === 'tr' ? 'Haberin tam içeriği (detay sayfasında gösterilir)...' : 'Full news content (shown in detail page)...'}
                    />
                    <p className="text-xs text-slate-500 mt-1">Boş bırakılırsa kısa açıklama gösterilir</p>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Kaynak URL (Opsiyonel)</label>
                    <input
                      type="text"
                      value={newNews.url}
                      onChange={(e) => setNewNews(prev => ({ ...prev, url: e.target.value }))}
                      className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                      placeholder="https://..."
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Kaynak</label>
                      <input
                        type="text"
                        value={newNews.source}
                        onChange={(e) => setNewNews(prev => ({ ...prev, source: e.target.value }))}
                        className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                        placeholder="Auxite, Bloomberg..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Tarih</label>
                      <input
                        type="text"
                        value={newNews.date}
                        onChange={(e) => setNewNews(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                        placeholder={newsLang === 'tr' ? '2 Aralık 2024' : 'Dec 2, 2024'}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">İkon Seçin</label>
                    <div className="grid grid-cols-6 gap-2">
                      {ICON_OPTIONS.map((icon) => (
                        <button
                          key={icon.value}
                          onClick={() => setNewNews(prev => ({ ...prev, icon: icon.value }))}
                          className={`p-3 rounded-lg text-xl transition-all ${
                            newNews.icon === icon.value
                              ? 'bg-emerald-500/20 border-2 border-emerald-500'
                              : 'bg-slate-800 border-2 border-transparent hover:border-slate-600'
                          }`}
                          title={icon.name}
                        >
                          {icon.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Renk Seçin</label>
                    <div className="grid grid-cols-6 gap-2">
                      {COLOR_OPTIONS.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => setNewNews(prev => ({ ...prev, color: color.value }))}
                          className={`h-10 rounded-lg transition-all ${
                            newNews.color === color.value
                              ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900'
                              : ''
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <button
                    onClick={addNews}
                    className="w-full px-4 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-colors"
                  >
                    ➕ Haber Ekle
                  </button>
                </div>
              </div>

              {/* Mevcut Haberler */}
              <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-200">
                    📋 Mevcut Haberler ({newsLang === 'tr' ? 'Türkçe' : 'English'})
                  </h3>
                  <span className="px-2 py-1 rounded bg-slate-700 text-slate-300 text-sm">
                    {newsData[newsLang]?.length || 0} haber
                  </span>
                </div>
                
                {newsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                  </div>
                ) : newsData[newsLang]?.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    Henüz haber eklenmedi
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {newsData[newsLang]?.map((news) => {
                      const iconData = ICON_OPTIONS.find(i => i.value === news.icon);
                      return (
                        <div
                          key={news.id}
                          className="p-4 rounded-lg bg-slate-800/50 border-l-4 relative group"
                          style={{ borderLeftColor: news.color }}
                        >
                          <button
                            onClick={() => deleteNews(news.id)}
                            className="absolute top-2 right-2 p-1 rounded bg-red-500/20 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/40"
                          >
                            🗑️
                          </button>
                          <div className="flex items-start gap-3 pr-8">
                            <span className="text-2xl">{iconData?.label || '📰'}</span>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-slate-200 truncate">{news.title}</h4>
                              <p className="text-sm text-slate-400 line-clamp-2 mt-1">{news.description}</p>
                              <div className="flex gap-3 mt-2 text-xs text-slate-500">
                                <span>{news.source}</span>
                                <span>•</span>
                                <span>{news.date}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Save News Button */}
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm">
                {newsMessage && (
                  <span className={newsMessage.includes("✅") ? "text-emerald-400" : "text-red-400"}>
                    {newsMessage}
                  </span>
                )}
              </div>
              <button
                onClick={handleSaveNews}
                disabled={newsSaving}
                className="px-8 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white font-semibold transition-colors flex items-center gap-2"
              >
                {newsSaving ? "Kaydediliyor..." : "💾 Haberleri Kaydet"}
              </button>
            </div>

            {/* Info */}
            <div className="mt-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div className="text-sm text-blue-200">
                  <p><strong>İpucu:</strong> Haberler mobil uygulamada otomatik olarak görüntülenir.</p>
                  <p className="mt-1">Her iki dilde (Türkçe/İngilizce) haber eklemeyi unutmayın.</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Hot Wallet Tab */}
        {activeTab === 'wallet' && (
          <div className="space-y-6">
            <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-200">🔐 Hot Wallet Bakiyeleri</h3>
                <button
                  onClick={async () => {
                    setHotWalletLoading(true);
                    try {
                      const res = await fetch('/api/admin/hot-wallet-balances');
                      const data = await res.json();
                      setHotWalletData(data);
                    } catch (e) { console.error(e); }
                    setHotWalletLoading(false);
                  }}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-sm font-medium transition-colors"
                >
                  🔄 Yenile
                </button>
              </div>
              
              {hotWalletLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                </div>
              ) : hotWalletData?.success ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
                    <div>
                      <p className="font-medium">ETH</p>
                      <p className="text-xs text-slate-400 font-mono">{hotWalletData.addresses?.ETH}</p>
                    </div>
                    <p className="text-xl font-bold text-[#627EEA]">{hotWalletData.balances?.ETH?.toFixed(6) || 0} ETH</p>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
                    <div>
                      <p className="font-medium">USDT (ERC20)</p>
                      <p className="text-xs text-slate-400">Aynı ETH adresi</p>
                    </div>
                    <p className="text-xl font-bold text-[#26A17B]">{hotWalletData.balances?.USDT?.toFixed(2) || 0} USDT</p>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
                    <div>
                      <p className="font-medium">XRP</p>
                      <p className="text-xs text-slate-400 font-mono">{hotWalletData.addresses?.XRP}</p>
                    </div>
                    <p className="text-xl font-bold text-slate-300">{hotWalletData.balances?.XRP?.toFixed(2) || 0} XRP</p>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
                    <div>
                      <p className="font-medium">SOL</p>
                      <p className="text-xs text-slate-400 font-mono">{hotWalletData.addresses?.SOL}</p>
                    </div>
                    <p className="text-xl font-bold text-[#9945FF]">{hotWalletData.balances?.SOL?.toFixed(6) || 0} SOL</p>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
                    <div>
                      <p className="font-medium">BTC (NOWPayments)</p>
                      <p className="text-xs text-slate-400">Payout Service</p>
                    </div>
                    <p className="text-xl font-bold text-[#F7931A]">{hotWalletData.balances?.BTC?.toFixed(8) || 0} BTC</p>
                  </div>
                  <p className="text-xs text-slate-500 mt-4">
                    Son güncelleme: {hotWalletData.timestamp ? new Date(hotWalletData.timestamp).toLocaleString('tr-TR') : '-'}
                  </p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-slate-400 mb-4">Bakiyeleri görmek için Yenile butonuna tıklayın</p>
                </div>
              )}
            </div>
            
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div className="text-sm text-amber-200">
                  <p><strong>Önemli:</strong> Hot wallet'lara yeterli bakiye yükleyin.</p>
                  <p className="mt-1">• ETH: Gas fee için ETH + Çekim için USDT</p>
                  <p>• XRP: Min 10 XRP reserve + işlem için</p>
                  <p>• SOL: İşlem ücreti için</p>
                </div>
              </div>
            </div>
          </div>
        )}

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
