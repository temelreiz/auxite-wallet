// src/app/admin/settings/page.tsx
// Admin Settings - 2FA, Security, System, Logs

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Shield,
  Key,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  Check,
  Copy,
  Loader2,
  Settings,
  Activity,
  Users,
  Database,
  Bell,
  Globe,
  Server,
  FileText,
  RefreshCw,
  Download,
  Trash2,
  ChevronLeft,
  LogOut,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface SecurityStatus {
  admin2FA: boolean;
  rateLimit: boolean;
  auditLog: boolean;
  ipWhitelist: boolean;
  lastLogin?: string;
  loginAttempts: number;
}

interface SystemStats {
  totalUsers: number;
  activeUsers24h: number;
  totalTrades: number;
  totalWithdraws: number;
  pendingKYC: number;
  redisConnected: boolean;
  blockchainEnabled: boolean;
}

interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  ip: string;
  timestamp: number;
  success: boolean;
  riskLevel: string;
  details?: any;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function AdminSettingsPage() {
  // Auth state
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<"security" | "system" | "logs" | "api">("security");

  // 2FA state
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFAStep, setTwoFAStep] = useState<"idle" | "setup" | "verify" | "complete" | "disable">("idle");
  const [twoFASecret, setTwoFASecret] = useState("");
  const [twoFACode, setTwoFACode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [twoFAError, setTwoFAError] = useState("");
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);

  // Security state
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus>({
    admin2FA: false,
    rateLimit: true,
    auditLog: true,
    ipWhitelist: false,
    loginAttempts: 0,
  });

  // System state
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalUsers: 0,
    activeUsers24h: 0,
    totalTrades: 0,
    totalWithdraws: 0,
    pendingKYC: 0,
    redisConnected: false,
    blockchainEnabled: false,
  });
  const [systemLoading, setSystemLoading] = useState(false);

  // Logs state
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsFilter, setLogsFilter] = useState<"all" | "high" | "critical">("all");

  // General state
  const [message, setMessage] = useState({ type: "", text: "" });

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTH CHECK
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const token = sessionStorage.getItem("auxite_admin_token");
    if (token) {
      verifyToken(token);
    }
  }, []);

  const verifyToken = async (token: string) => {
    try {
      const res = await fetch("/api/admin/auth", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAuthenticated(true);
        loadSecurityStatus();
      } else {
        sessionStorage.removeItem("auxite_admin_token");
      }
    } catch (e) {
      console.error("Token verification failed:", e);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        sessionStorage.setItem("auxite_admin_token", data.token);
        setAuthenticated(true);
        loadSecurityStatus();
      } else {
        setAuthError(data.error || "Giriş başarısız");
      }
    } catch (err) {
      setAuthError("Bağlantı hatası");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("auxite_admin_token");
    setAuthenticated(false);
    setPassword("");
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA LOADING
  // ═══════════════════════════════════════════════════════════════════════════

  const loadSecurityStatus = async () => {
    try {
      // 2FA status
      const twoFARes = await fetch("/api/admin/2fa");
      const twoFAData = await twoFARes.json();
      setTwoFAEnabled(twoFAData.enabled);
      setSecurityStatus((prev) => ({ ...prev, admin2FA: twoFAData.enabled }));
    } catch (e) {
      console.error("Failed to load security status:", e);
    }
  };

  const loadSystemStats = async () => {
    setSystemLoading(true);
    try {
      const res = await fetch("/api/admin/stats", {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("auxite_admin_token")}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setSystemStats(data);
      }
    } catch (e) {
      console.error("Failed to load system stats:", e);
    } finally {
      setSystemLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await fetch(`/api/admin/audit-logs?filter=${logsFilter}`, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("auxite_admin_token")}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (e) {
      console.error("Failed to load audit logs:", e);
    } finally {
      setLogsLoading(false);
    }
  };

  // Load data when tab changes
  useEffect(() => {
    if (!authenticated) return;

    if (activeTab === "system") {
      loadSystemStats();
    } else if (activeTab === "logs") {
      loadAuditLogs();
    }
  }, [activeTab, authenticated, logsFilter]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 2FA FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const start2FASetup = async () => {
    setTwoFALoading(true);
    setTwoFAError("");

    try {
      const res = await fetch("/api/admin/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup", password }),
      });

      const data = await res.json();

      if (res.ok) {
        setTwoFASecret(data.secret);
        setTwoFAStep("setup");
      } else {
        setTwoFAError(data.error || "Kurulum başarısız");
      }
    } catch (err) {
      setTwoFAError("Bağlantı hatası");
    } finally {
      setTwoFALoading(false);
    }
  };

  const verify2FA = async () => {
    if (twoFACode.length !== 6) {
      setTwoFAError("6 haneli kod girin");
      return;
    }

    setTwoFALoading(true);
    setTwoFAError("");

    try {
      const res = await fetch("/api/admin/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", code: twoFACode, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setBackupCodes(data.backupCodes);
        setTwoFAStep("complete");
        setTwoFAEnabled(true);
        setSecurityStatus((prev) => ({ ...prev, admin2FA: true }));
      } else {
        setTwoFAError(data.error || "Doğrulama başarısız");
      }
    } catch (err) {
      setTwoFAError("Bağlantı hatası");
    } finally {
      setTwoFALoading(false);
    }
  };

  const disable2FA = async () => {
    if (twoFACode.length < 6) {
      setTwoFAError("Kod girin");
      return;
    }

    setTwoFALoading(true);
    setTwoFAError("");

    try {
      const res = await fetch("/api/admin/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disable", code: twoFACode, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setTwoFAEnabled(false);
        setTwoFAStep("idle");
        setTwoFACode("");
        setSecurityStatus((prev) => ({ ...prev, admin2FA: false }));
        showMessage("success", "2FA devre dışı bırakıldı");
      } else {
        setTwoFAError(data.error || "İşlem başarısız");
      }
    } catch (err) {
      setTwoFAError("Bağlantı hatası");
    } finally {
      setTwoFALoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const showMessage = (type: string, text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  const copyToClipboard = (text: string, type: "secret" | "backup") => {
    navigator.clipboard.writeText(text);
    if (type === "secret") {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } else {
      setCopiedBackup(true);
      setTimeout(() => setCopiedBackup(false), 2000);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("tr-TR");
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "critical":
        return "text-red-400 bg-red-500/10";
      case "high":
        return "text-orange-400 bg-orange-500/10";
      case "medium":
        return "text-yellow-400 bg-yellow-500/10";
      default:
        return "text-green-400 bg-green-500/10";
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // LOGIN SCREEN
  // ═══════════════════════════════════════════════════════════════════════════

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <Settings className="w-8 h-8 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-100">Admin Ayarları</h1>
            <p className="text-slate-400 mt-2">Güvenlik ve sistem ayarları</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Şifre</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-10 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Admin şifresi"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {authError && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertTriangle className="w-4 h-4" />
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading || !password}
              className="w-full px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
              Giriş Yap
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/admin" className="text-slate-400 hover:text-white text-sm">
              ← Admin Paneline Dön
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                <ChevronLeft className="w-5 h-5 text-slate-400" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold">Admin Ayarları</h1>
                  <p className="text-xs text-slate-400">Güvenlik & Sistem</p>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Çıkış
            </button>
          </div>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div className="max-w-6xl mx-auto px-4 mt-4">
          <div
            className={`p-4 rounded-xl flex items-center gap-3 ${
              message.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                : "bg-red-500/10 border border-red-500/30 text-red-400"
            }`}
          >
            {message.type === "success" ? <Check className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            {message.text}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4 mt-6">
        <div className="flex gap-2 border-b border-slate-800 pb-4">
          {[
            { id: "security", label: "Güvenlik", icon: Shield },
            { id: "system", label: "Sistem", icon: Server },
            { id: "logs", label: "Loglar", icon: FileText },
            { id: "api", label: "API", icon: Globe },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SECURITY TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "security" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 2FA Card */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                  <Key className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">İki Faktörlü Doğrulama</h2>
                  <p className="text-sm text-slate-400">
                    {twoFAEnabled ? "2FA Etkin" : "2FA Devre Dışı"}
                  </p>
                </div>
              </div>

              {/* 2FA Error */}
              {twoFAError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <p className="text-red-400 text-sm">{twoFAError}</p>
                </div>
              )}

              {/* 2FA Status / Idle */}
              {twoFAStep === "idle" && (
                <div className="space-y-4">
                  <div
                    className={`p-4 rounded-xl ${
                      twoFAEnabled
                        ? "bg-green-500/10 border border-green-500/30"
                        : "bg-orange-500/10 border border-orange-500/30"
                    }`}
                  >
                    <p className={`text-sm ${twoFAEnabled ? "text-green-400" : "text-orange-400"}`}>
                      {twoFAEnabled
                        ? "✅ 2FA admin girişi için etkin"
                        : "⚠️ 2FA etkin değil - Güvenlik riski!"}
                    </p>
                  </div>

                  {/* Password for 2FA actions */}
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Admin Şifresi (2FA işlemi için)</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 px-4 text-white"
                      placeholder="••••••••••••"
                    />
                  </div>

                  {!twoFAEnabled ? (
                    <button
                      onClick={start2FASetup}
                      disabled={twoFALoading || !password}
                      className="w-full bg-yellow-500 text-black font-semibold py-3 rounded-xl hover:bg-yellow-400 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {twoFALoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
                      2FA Etkinleştir
                    </button>
                  ) : (
                    <button
                      onClick={() => setTwoFAStep("disable")}
                      disabled={!password}
                      className="w-full bg-red-500/20 text-red-400 border border-red-500/30 font-semibold py-3 rounded-xl hover:bg-red-500/30 disabled:opacity-50"
                    >
                      2FA Devre Dışı Bırak
                    </button>
                  )}
                </div>
              )}

              {/* 2FA Setup */}
              {twoFAStep === "setup" && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-400">
                    Authenticator uygulamanıza ekleyin:
                  </p>

                  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                    <p className="text-xs text-slate-500 mb-1">Secret Key</p>
                    <div className="flex items-center gap-2">
                      <code className="text-yellow-400 font-mono text-sm flex-1 break-all">
                        {twoFASecret}
                      </code>
                      <button
                        onClick={() => copyToClipboard(twoFASecret, "secret")}
                        className="p-2 hover:bg-slate-700 rounded-lg"
                      >
                        {copiedSecret ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Doğrulama Kodu</label>
                    <input
                      type="text"
                      value={twoFACode}
                      onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 px-4 text-white text-center text-xl tracking-widest font-mono"
                      placeholder="000000"
                      maxLength={6}
                    />
                  </div>

                  <button
                    onClick={verify2FA}
                    disabled={twoFALoading || twoFACode.length !== 6}
                    className="w-full bg-yellow-500 text-black font-semibold py-3 rounded-xl hover:bg-yellow-400 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {twoFALoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                    Doğrula ve Etkinleştir
                  </button>

                  <button
                    onClick={() => {
                      setTwoFAStep("idle");
                      setTwoFACode("");
                    }}
                    className="w-full text-slate-400 py-2 hover:text-white"
                  >
                    İptal
                  </button>
                </div>
              )}

              {/* 2FA Complete */}
              {twoFAStep === "complete" && (
                <div className="space-y-4">
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                    <Check className="w-12 h-12 text-green-400 mx-auto mb-2" />
                    <p className="text-green-400 font-medium">2FA Etkinleştirildi!</p>
                  </div>

                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Key className="w-5 h-5 text-orange-400" />
                      <p className="text-orange-400 font-medium">Yedek Kodlar</p>
                    </div>
                    <p className="text-xs text-orange-300/70 mb-3">
                      Bu kodları güvenli bir yere kaydedin!
                    </p>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {backupCodes.map((code, i) => (
                        <code
                          key={i}
                          className="bg-slate-900/50 px-3 py-2 rounded-lg text-sm text-white font-mono text-center"
                        >
                          {code}
                        </code>
                      ))}
                    </div>
                    <button
                      onClick={() => copyToClipboard(backupCodes.join("\n"), "backup")}
                      className="w-full bg-slate-700 text-white py-2 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-slate-600"
                    >
                      {copiedBackup ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedBackup ? "Kopyalandı!" : "Tümünü Kopyala"}
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setTwoFAStep("idle");
                      setTwoFACode("");
                    }}
                    className="w-full bg-emerald-500 text-white font-semibold py-3 rounded-xl hover:bg-emerald-400"
                  >
                    Tamam
                  </button>
                </div>
              )}

              {/* 2FA Disable */}
              {twoFAStep === "disable" && (
                <div className="space-y-4">
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                    <p className="text-red-400 text-sm">
                      ⚠️ 2FA'yı devre dışı bırakmak güvenlik riski oluşturur!
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">2FA Kodu veya Yedek Kod</label>
                    <input
                      type="text"
                      value={twoFACode}
                      onChange={(e) => setTwoFACode(e.target.value.replace(/[^0-9A-Za-z]/g, "").slice(0, 8))}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 px-4 text-white text-center text-xl tracking-widest font-mono"
                      placeholder="000000"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setTwoFAStep("idle");
                        setTwoFACode("");
                      }}
                      className="flex-1 bg-slate-700 text-white py-3 rounded-xl hover:bg-slate-600"
                    >
                      İptal
                    </button>
                    <button
                      onClick={disable2FA}
                      disabled={twoFALoading || twoFACode.length < 6}
                      className="flex-1 bg-red-500 text-white font-semibold py-3 rounded-xl hover:bg-red-400 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {twoFALoading && <Loader2 className="w-5 h-5 animate-spin" />}
                      Devre Dışı Bırak
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Security Overview Card */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Güvenlik Durumu</h2>
                  <p className="text-sm text-slate-400">Sistem güvenlik özeti</p>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { label: "Admin 2FA", enabled: securityStatus.admin2FA, critical: true },
                  { label: "Rate Limiting", enabled: securityStatus.rateLimit },
                  { label: "Audit Logging", enabled: securityStatus.auditLog },
                  { label: "IP Whitelist", enabled: securityStatus.ipWhitelist },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl"
                  >
                    <span className="text-slate-300">{item.label}</span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        item.enabled
                          ? "bg-green-500/10 text-green-400"
                          : item.critical
                          ? "bg-red-500/10 text-red-400"
                          : "bg-slate-700 text-slate-400"
                      }`}
                    >
                      {item.enabled ? "Etkin" : "Devre Dışı"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Security Score */}
              <div className="mt-6 p-4 bg-slate-800/50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">Güvenlik Skoru</span>
                  <span className="text-lg font-bold text-emerald-400">
                    {Object.values(securityStatus).filter(Boolean).length - 1}/4
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${((Object.values(securityStatus).filter(Boolean).length - 1) / 4) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Session Info */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 lg:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <Activity className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold">Oturum Bilgileri</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-800/50 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">Son Giriş</p>
                  <p className="text-sm text-slate-200">{securityStatus.lastLogin || "Bu oturum"}</p>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">Başarısız Girişler</p>
                  <p className="text-sm text-slate-200">{securityStatus.loginAttempts}</p>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">IP Adresi</p>
                  <p className="text-sm text-slate-200">Gizli</p>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">Oturum Süresi</p>
                  <p className="text-sm text-slate-200">24 saat</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SYSTEM TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "system" && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Toplam Kullanıcı", value: systemStats.totalUsers, icon: Users, color: "blue" },
                { label: "Aktif (24s)", value: systemStats.activeUsers24h, icon: Activity, color: "green" },
                { label: "Toplam Trade", value: systemStats.totalTrades, icon: RefreshCw, color: "yellow" },
                { label: "Bekleyen KYC", value: systemStats.pendingKYC, icon: FileText, color: "orange" },
              ].map((stat) => (
                <div key={stat.label} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-full bg-${stat.color}-500/10 flex items-center justify-center`}>
                      <stat.icon className={`w-5 h-5 text-${stat.color}-400`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white">{stat.value.toLocaleString()}</p>
                  <p className="text-sm text-slate-400">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* System Status */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Sistem Durumu</h3>
                <button
                  onClick={loadSystemStats}
                  disabled={systemLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm"
                >
                  <RefreshCw className={`w-4 h-4 ${systemLoading ? "animate-spin" : ""}`} />
                  Yenile
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-emerald-400" />
                    <span>Redis</span>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs ${
                      systemStats.redisConnected ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {systemStats.redisConnected ? "Bağlı" : "Bağlantı Yok"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-blue-400" />
                    <span>Blockchain</span>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs ${
                      systemStats.blockchainEnabled ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"
                    }`}
                  >
                    {systemStats.blockchainEnabled ? "Etkin" : "Devre Dışı"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Server className="w-5 h-5 text-purple-400" />
                    <span>API</span>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs bg-green-500/10 text-green-400">
                    Çalışıyor
                  </span>
                </div>
              </div>
            </div>

            {/* Environment Info */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4">Environment</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-800/50 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">Mode</p>
                  <p className="text-sm text-white font-mono">
                    {process.env.NODE_ENV || "development"}
                  </p>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">Network</p>
                  <p className="text-sm text-white font-mono">Sepolia</p>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">Version</p>
                  <p className="text-sm text-white font-mono">v6.0.0</p>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">Build</p>
                  <p className="text-sm text-white font-mono">Dec 2024</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* LOGS TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "logs" && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {[
                  { id: "all", label: "Tümü" },
                  { id: "high", label: "Yüksek Risk" },
                  { id: "critical", label: "Kritik" },
                ].map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setLogsFilter(filter.id as any)}
                    className={`px-4 py-2 rounded-lg text-sm ${
                      logsFilter === filter.id
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              <button
                onClick={loadAuditLogs}
                disabled={logsLoading}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${logsLoading ? "animate-spin" : ""}`} />
                Yenile
              </button>
            </div>

            {/* Logs Table */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-800/50">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium">Zaman</th>
                      <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium">Kullanıcı</th>
                      <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium">İşlem</th>
                      <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium">IP</th>
                      <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium">Risk</th>
                      <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium">Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logsLoading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center">
                          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto" />
                        </td>
                      </tr>
                    ) : auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                          Log bulunamadı
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log.id} className="border-t border-slate-800 hover:bg-slate-800/30">
                          <td className="px-4 py-3 text-sm text-slate-300">{formatDate(log.timestamp)}</td>
                          <td className="px-4 py-3 text-sm font-mono text-slate-400">
                            {log.userId.slice(0, 10)}...
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-300">{log.action}</td>
                          <td className="px-4 py-3 text-sm font-mono text-slate-400">{log.ip}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${getRiskColor(log.riskLevel)}`}>
                              {log.riskLevel}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {log.success ? (
                              <Check className="w-4 h-4 text-green-400" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-red-400" />
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Export */}
            <div className="flex justify-end">
              <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300">
                <Download className="w-4 h-4" />
                CSV İndir
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* API TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "api" && (
          <div className="space-y-6">
            {/* API Status */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4">API Servisleri</h3>
              <div className="space-y-3">
                {[
                  { name: "GoldAPI", status: "active", rateLimit: "300/ay" },
                  { name: "CoinGecko", status: "active", rateLimit: "50/dk" },
                  { name: "Infura (ETH)", status: "active", rateLimit: "100k/gün" },
                  { name: "XRPL", status: "active", rateLimit: "Unlimited" },
                  { name: "Helius (SOL)", status: "active", rateLimit: "50/sn" },
                  { name: "NOWPayments", status: "active", rateLimit: "Custom" },
                ].map((api) => (
                  <div key={api.name} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          api.status === "active" ? "bg-green-400" : "bg-red-400"
                        }`}
                      />
                      <span className="text-slate-300">{api.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-slate-500">{api.rateLimit}</span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs ${
                          api.status === "active"
                            ? "bg-green-500/10 text-green-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {api.status === "active" ? "Aktif" : "Hata"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Webhook Settings */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4">Webhook Ayarları</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Withdraw Webhook URL</label>
                  <input
                    type="text"
                    placeholder="https://your-server.com/webhook/withdraw"
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 px-4 text-white font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Trade Webhook URL</label>
                  <input
                    type="text"
                    placeholder="https://your-server.com/webhook/trade"
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 px-4 text-white font-mono text-sm"
                  />
                </div>
                <button className="px-6 py-2 bg-amber-500 hover:bg-amber-600 rounded-xl text-white font-medium">
                  Kaydet
                </button>
              </div>
            </div>

            {/* Rate Limits */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4">Rate Limit Ayarları</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { endpoint: "General API", limit: "100 req/min" },
                  { endpoint: "Auth", limit: "5 req/min" },
                  { endpoint: "Withdraw", limit: "10 req/hour" },
                  { endpoint: "Trade", limit: "60 req/min" },
                ].map((item) => (
                  <div key={item.endpoint} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
                    <span className="text-slate-300">{item.endpoint}</span>
                    <span className="text-sm text-emerald-400 font-mono">{item.limit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
