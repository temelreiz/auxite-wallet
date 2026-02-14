"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/components/LanguageContext";

interface Session {
  id: string;
  walletAddress: string;
  deviceInfo: {
    browser: string;
    os: string;
    device: string;
  };
  ip: string;
  location?: string;
  createdAt: number;
  lastActiveAt: number;
  isCurrent: boolean;
}

interface SessionManagerProps {
  walletAddress: string;
  lang?: "tr" | "en" | "de" | "fr" | "ar" | "ru";
}

const DEVICE_ICONS: Record<string, string> = {
  Desktop: "🖥️",
  Mobile: "📱",
  Tablet: "📲",
};

const BROWSER_ICONS: Record<string, string> = {
  Chrome: "🌐",
  Firefox: "🦊",
  Safari: "🧭",
  Edge: "🔷",
  Opera: "🔴",
  Unknown: "🌐",
};

const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "Aktif Oturumlar",
    description: "Hesabınıza bağlı cihazları yönetin",
    current: "Bu Cihaz",
    lastActive: "Son aktivite",
    loggedIn: "Giriş",
    terminate: "Sonlandır",
    terminateAll: "Diğer Tümünü Sonlandır",
    noSessions: "Aktif oturum bulunamadı",
    justNow: "Az önce",
    ago: "önce",
    confirmTerminateAll: "Diğer tüm oturumları sonlandırmak istediğinize emin misiniz?",
    securityNote: "Tanımadığınız bir oturum görürseniz, hemen sonlandırın ve şifrenizi değiştirin.",
  },
  en: {
    title: "Active Sessions",
    description: "Manage devices connected to your account",
    current: "This Device",
    lastActive: "Last active",
    loggedIn: "Logged in",
    terminate: "Terminate",
    terminateAll: "Terminate All Others",
    noSessions: "No active sessions found",
    justNow: "Just now",
    ago: "ago",
    confirmTerminateAll: "Are you sure you want to terminate all other sessions?",
    securityNote: "If you see an unrecognized session, terminate it immediately and change your password.",
  },
  de: {
    title: "Aktive Sitzungen",
    description: "Verwalten Sie die mit Ihrem Konto verbundenen Geräte",
    current: "Dieses Gerät",
    lastActive: "Zuletzt aktiv",
    loggedIn: "Angemeldet",
    terminate: "Beenden",
    terminateAll: "Alle anderen beenden",
    noSessions: "Keine aktiven Sitzungen gefunden",
    justNow: "Gerade eben",
    ago: "vor",
    confirmTerminateAll: "Sind Sie sicher, dass Sie alle anderen Sitzungen beenden möchten?",
    securityNote: "Wenn Sie eine unbekannte Sitzung sehen, beenden Sie sie sofort und ändern Sie Ihr Passwort.",
  },
  fr: {
    title: "Sessions Actives",
    description: "Gérez les appareils connectés à votre compte",
    current: "Cet Appareil",
    lastActive: "Dernière activité",
    loggedIn: "Connecté",
    terminate: "Terminer",
    terminateAll: "Terminer toutes les autres",
    noSessions: "Aucune session active trouvée",
    justNow: "À l'instant",
    ago: "il y a",
    confirmTerminateAll: "Êtes-vous sûr de vouloir terminer toutes les autres sessions?",
    securityNote: "Si vous voyez une session non reconnue, terminez-la immédiatement et changez votre mot de passe.",
  },
  ar: {
    title: "الجلسات النشطة",
    description: "إدارة الأجهزة المتصلة بحسابك",
    current: "هذا الجهاز",
    lastActive: "آخر نشاط",
    loggedIn: "تسجيل الدخول",
    terminate: "إنهاء",
    terminateAll: "إنهاء جميع الجلسات الأخرى",
    noSessions: "لم يتم العثور على جلسات نشطة",
    justNow: "الآن",
    ago: "منذ",
    confirmTerminateAll: "هل أنت متأكد أنك تريد إنهاء جميع الجلسات الأخرى؟",
    securityNote: "إذا رأيت جلسة غير معروفة، قم بإنهائها فوراً وغيّر كلمة المرور.",
  },
  ru: {
    title: "Активные сессии",
    description: "Управление устройствами, подключенными к вашему аккаунту",
    current: "Это устройство",
    lastActive: "Последняя активность",
    loggedIn: "Вход",
    terminate: "Завершить",
    terminateAll: "Завершить все остальные",
    noSessions: "Активные сессии не найдены",
    justNow: "Только что",
    ago: "назад",
    confirmTerminateAll: "Вы уверены, что хотите завершить все остальные сессии?",
    securityNote: "Если вы видите незнакомую сессию, немедленно завершите её и смените пароль.",
  },
};

export function SessionManager({ walletAddress, lang: langProp }: SessionManagerProps) {
  const { lang: ctxLang } = useLanguage();
  const lang = langProp || ctxLang || "en";
  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [terminating, setTerminating] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
    // Her 30 saniyede güncelle
    const interval = setInterval(fetchSessions, 30000);
    return () => clearInterval(interval);
  }, [walletAddress]);

  const fetchSessions = async () => {
    try {
      const res = await fetch(`/api/security/sessions?address=${walletAddress}`);
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (err) {
      console.error("Sessions fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const terminateSession = async (sessionId: string) => {
    setTerminating(sessionId);
    try {
      const res = await fetch("/api/security/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, sessionId }),
      });

      if (res.ok) {
        fetchSessions();
      }
    } catch (err) {
      console.error("Terminate session error:", err);
    } finally {
      setTerminating(null);
    }
  };

  const terminateAllOthers = async () => {
    if (!confirm(t("confirmTerminateAll"))) {
      return;
    }

    setTerminating("all");
    try {
      const res = await fetch("/api/security/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, terminateAll: true }),
      });

      if (res.ok) {
        fetchSessions();
      }
    } catch (err) {
      console.error("Terminate all sessions error:", err);
    } finally {
      setTerminating(null);
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t("justNow");
    if (minutes < 60) return `${minutes}m ${t("ago")}`;
    if (hours < 24) return `${hours}h ${t("ago")}`;
    return `${days}d ${t("ago")}`;
  };

  const formatDate = (timestamp: number) => {
    const localeMap: Record<string, string> = { tr: "tr-TR", en: "en-US", de: "de-DE", fr: "fr-FR", ar: "ar-SA", ru: "ru-RU" };
    return new Date(timestamp).toLocaleDateString(localeMap[lang] || "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-slate-700 rounded w-1/3"></div>
        <div className="h-20 bg-slate-800 rounded"></div>
        <div className="h-20 bg-slate-800 rounded"></div>
      </div>
    );
  }

  const otherSessions = sessions.filter((s) => !s.isCurrent);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">{t("title")}</h3>
          <p className="text-sm text-slate-400">{t("description")}</p>
        </div>
        {otherSessions.length > 0 && (
          <button
            onClick={terminateAllOthers}
            disabled={terminating === "all"}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {terminating === "all" ? "..." : t("terminateAll")}
          </button>
        )}
      </div>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          {t("noSessions")}
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`p-4 rounded-xl border ${
                session.isCurrent
                  ? "bg-[#2F6F62]/10 border-[#2F6F62]/30"
                  : "bg-slate-800/50 border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">
                    {DEVICE_ICONS[session.deviceInfo.device] || "🖥️"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">
                        {session.deviceInfo.browser} on {session.deviceInfo.os}
                      </span>
                      {session.isCurrent && (
                        <span className="text-xs px-2 py-0.5 bg-[#2F6F62] text-white rounded">
                          {t("current")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                        {session.ip}
                      </span>
                      <span>•</span>
                      <span>{t("lastActive")}: {formatTimeAgo(session.lastActiveAt)}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {t("loggedIn")}: {formatDate(session.createdAt)}
                    </div>
                  </div>
                </div>
                
                {!session.isCurrent && (
                  <button
                    onClick={() => terminateSession(session.id)}
                    disabled={terminating === session.id}
                    className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {terminating === session.id ? "..." : t("terminate")}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Security Note */}
      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-blue-300">
            {t("securityNote")}
          </p>
        </div>
      </div>
    </div>
  );
}
