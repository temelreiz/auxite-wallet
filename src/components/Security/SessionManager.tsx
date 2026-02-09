"use client";

import { useState, useEffect } from "react";

interface SessionManagerProps {
  walletAddress: string;
  lang?: "tr" | "en" | "de" | "fr" | "ar" | "ru";
}

interface Session {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceType: string;
  ip: string;
  location: string;
  createdAt: string;
  lastActivity: string;
  isCurrent: boolean;
}

export function SessionManager({ walletAddress, lang = "en" }: SessionManagerProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, [walletAddress]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/security/sessions", {
        headers: { "x-wallet-address": walletAddress },
      });
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (err) {
      console.error("Sessions fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    if (!confirm(lang === "tr" ? "Bu oturum sonlandırılsın mı?" : "End this session?")) {
      return;
    }

    try {
      setProcessing(sessionId);
      setError(null);

      const res = await fetch(`/api/security/sessions?sessionId=${sessionId}`, {
        method: "DELETE",
        headers: { "x-wallet-address": walletAddress },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      setSuccess(lang === "tr" ? "Oturum sonlandırıldı" : "Session ended");
      fetchSessions();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(null);
    }
  };

  const revokeAllSessions = async () => {
    if (!confirm(
      lang === "tr" 
        ? "Mevcut oturum hariç tüm oturumlar sonlandırılsın mı?" 
        : "End all sessions except current?"
    )) {
      return;
    }

    try {
      setProcessing("all");
      setError(null);

      const res = await fetch("/api/security/sessions?revokeAll=true", {
        method: "DELETE",
        headers: { "x-wallet-address": walletAddress },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      setSuccess(
        lang === "tr" 
          ? `${data.revokedCount} oturum sonlandırıldı` 
          : `${data.revokedCount} sessions ended`
      );
      fetchSessions();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(null);
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case "mobile": return "📱";
      case "tablet": return "📱";
      case "desktop": return "💻";
      default: return "🖥️";
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (lang === "tr") {
      if (diffMins < 5) return "Şimdi aktif";
      if (diffMins < 60) return `${diffMins} dk önce`;
      if (diffHours < 24) return `${diffHours} saat önce`;
      if (diffDays < 7) return `${diffDays} gün önce`;
      return date.toLocaleDateString("tr-TR");
    } else {
      if (diffMins < 5) return "Active now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString("en-US");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-slate-600 border-t-[#BFA181] rounded-full" />
      </div>
    );
  }

  const otherSessions = sessions.filter(s => !s.isCurrent);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            {lang === "tr" ? "Aktif Oturumlar" : "Active Sessions"}
          </h3>
          <p className="text-sm text-slate-400">
            {sessions.length} {lang === "tr" ? "aktif oturum" : "active session(s)"}
          </p>
        </div>
        {otherSessions.length > 0 && (
          <button
            onClick={revokeAllSessions}
            disabled={processing === "all"}
            className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {processing === "all"
              ? (lang === "tr" ? "İşleniyor..." : "Processing...")
              : (lang === "tr" ? "Tümünü Sonlandır" : "End All")}
          </button>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-[#2F6F62]/10 border border-[#2F6F62]/20 rounded-lg p-3 text-[#2F6F62] text-sm">
          {success}
        </div>
      )}

      {/* Current Session */}
      {sessions.find(s => s.isCurrent) && (
        <div className="bg-[#2F6F62]/10 rounded-xl p-4 border border-[#2F6F62]/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#2F6F62]/20 flex items-center justify-center">
              <span className="text-xl">{getDeviceIcon(sessions.find(s => s.isCurrent)?.deviceType || "")}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-[#2F6F62] font-medium">
                  {sessions.find(s => s.isCurrent)?.deviceName}
                </p>
                <span className="text-xs bg-[#2F6F62] text-white px-2 py-0.5 rounded-full">
                  {lang === "tr" ? "Mevcut" : "Current"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                📍 {sessions.find(s => s.isCurrent)?.location} • {lang === "tr" ? "Şimdi aktif" : "Active now"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Other Sessions */}
      {otherSessions.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-400">
            {lang === "tr" ? "Diğer Oturumlar" : "Other Sessions"}
          </h4>
          
          {otherSessions.map((session) => (
            <div 
              key={session.id}
              className="bg-slate-800/50 rounded-xl p-4 border border-slate-700"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                    <span className="text-xl">{getDeviceIcon(session.deviceType)}</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">{session.deviceName}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <span>📍 {session.location}</span>
                      <span>•</span>
                      <span>{formatDate(session.lastActivity)}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => revokeSession(session.id)}
                  disabled={processing === session.id}
                  className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-xs font-medium disabled:opacity-50"
                >
                  {processing === session.id
                    ? (lang === "tr" ? "..." : "...")
                    : (lang === "tr" ? "Sonlandır" : "End")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {otherSessions.length === 0 && (
        <div className="bg-slate-800/30 rounded-xl p-8 text-center">
          <span className="text-3xl mb-3 block">✅</span>
          <p className="text-slate-400">
            {lang === "tr" 
              ? "Başka aktif oturum yok" 
              : "No other active sessions"}
          </p>
        </div>
      )}

      {/* Info */}
      <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/20">
        <div className="flex gap-3">
          <span className="text-amber-400">⚠️</span>
          <div>
            <p className="text-sm text-amber-400 font-medium mb-1">
              {lang === "tr" ? "Güvenlik İpucu" : "Security Tip"}
            </p>
            <p className="text-xs text-slate-400">
              {lang === "tr" 
                ? "Tanımadığınız oturumları derhal sonlandırın. Şüpheli bir aktivite görürseniz şifrenizi değiştirin ve 2FA'yı aktifleştirin."
                : "End any sessions you don't recognize immediately. If you see suspicious activity, change your password and enable 2FA."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
