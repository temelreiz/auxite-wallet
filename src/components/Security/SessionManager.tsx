"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/components/LanguageContext";

interface SessionManagerProps {
  walletAddress: string;
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

const translations: Record<string, Record<string, string>> = {
  tr: {
    activeSessions: "Aktif Oturumlar",
    activeSession: "aktif oturum",
    processing: "İşleniyor...",
    endAll: "Tümünü Sonlandır",
    current: "Mevcut",
    activeNow: "Şimdi aktif",
    otherSessions: "Diğer Oturumlar",
    end: "Sonlandır",
    noOtherSessions: "Başka aktif oturum yok",
    securityTip: "Güvenlik İpucu",
    securityTipInfo: "Tanımadığınız oturumları derhal sonlandırın. Şüpheli bir aktivite görürseniz şifrenizi değiştirin ve 2FA'yı aktifleştirin.",
    confirmEnd: "Bu oturum sonlandırılsın mı?",
    sessionEnded: "Oturum sonlandırıldı",
    confirmEndAll: "Mevcut oturum hariç tüm oturumlar sonlandırılsın mı?",
    sessionsEnded: "oturum sonlandırıldı",
    justNow: "Şimdi aktif",
    minsAgo: "dk önce",
    hoursAgo: "saat önce",
    daysAgo: "gün önce",
  },
  en: {
    activeSessions: "Active Sessions",
    activeSession: "active session(s)",
    processing: "Processing...",
    endAll: "End All",
    current: "Current",
    activeNow: "Active now",
    otherSessions: "Other Sessions",
    end: "End",
    noOtherSessions: "No other active sessions",
    securityTip: "Security Tip",
    securityTipInfo: "End any sessions you don't recognize immediately. If you see suspicious activity, change your password and enable 2FA.",
    confirmEnd: "End this session?",
    sessionEnded: "Session ended",
    confirmEndAll: "End all sessions except current?",
    sessionsEnded: "sessions ended",
    justNow: "Active now",
    minsAgo: "m ago",
    hoursAgo: "h ago",
    daysAgo: "d ago",
  },
  de: {
    activeSessions: "Aktive Sitzungen",
    activeSession: "aktive Sitzung(en)",
    processing: "Verarbeitung...",
    endAll: "Alle beenden",
    current: "Aktuell",
    activeNow: "Jetzt aktiv",
    otherSessions: "Andere Sitzungen",
    end: "Beenden",
    noOtherSessions: "Keine weiteren aktiven Sitzungen",
    securityTip: "Sicherheitshinweis",
    securityTipInfo: "Beenden Sie sofort alle Sitzungen, die Sie nicht erkennen. Bei verdächtiger Aktivität ändern Sie Ihr Passwort und aktivieren Sie 2FA.",
    confirmEnd: "Diese Sitzung beenden?",
    sessionEnded: "Sitzung beendet",
    confirmEndAll: "Alle Sitzungen außer der aktuellen beenden?",
    sessionsEnded: "Sitzungen beendet",
    justNow: "Gerade aktiv",
    minsAgo: "Min. her",
    hoursAgo: "Std. her",
    daysAgo: "T. her",
  },
  fr: {
    activeSessions: "Sessions actives",
    activeSession: "session(s) active(s)",
    processing: "Traitement...",
    endAll: "Tout terminer",
    current: "Actuelle",
    activeNow: "Actif maintenant",
    otherSessions: "Autres sessions",
    end: "Terminer",
    noOtherSessions: "Aucune autre session active",
    securityTip: "Conseil de sécurité",
    securityTipInfo: "Terminez immédiatement les sessions que vous ne reconnaissez pas. En cas d'activité suspecte, changez votre mot de passe et activez le 2FA.",
    confirmEnd: "Terminer cette session ?",
    sessionEnded: "Session terminée",
    confirmEndAll: "Terminer toutes les sessions sauf la session actuelle ?",
    sessionsEnded: "sessions terminées",
    justNow: "Actif maintenant",
    minsAgo: "min",
    hoursAgo: "h",
    daysAgo: "j",
  },
  ar: {
    activeSessions: "الجلسات النشطة",
    activeSession: "جلسة (جلسات) نشطة",
    processing: "جارٍ المعالجة...",
    endAll: "إنهاء الكل",
    current: "الحالية",
    activeNow: "نشطة الآن",
    otherSessions: "جلسات أخرى",
    end: "إنهاء",
    noOtherSessions: "لا توجد جلسات نشطة أخرى",
    securityTip: "نصيحة أمنية",
    securityTipInfo: "قم بإنهاء أي جلسات لا تتعرف عليها فوراً. إذا رأيت نشاطاً مشبوهاً، قم بتغيير كلمة المرور وتفعيل المصادقة الثنائية.",
    confirmEnd: "هل تريد إنهاء هذه الجلسة؟",
    sessionEnded: "تم إنهاء الجلسة",
    confirmEndAll: "إنهاء جميع الجلسات باستثناء الحالية؟",
    sessionsEnded: "جلسات تم إنهاؤها",
    justNow: "نشطة الآن",
    minsAgo: "د مضت",
    hoursAgo: "س مضت",
    daysAgo: "ي مضت",
  },
  ru: {
    activeSessions: "Активные сессии",
    activeSession: "активная(ых) сессия(й)",
    processing: "Обработка...",
    endAll: "Завершить все",
    current: "Текущая",
    activeNow: "Активна сейчас",
    otherSessions: "Другие сессии",
    end: "Завершить",
    noOtherSessions: "Нет других активных сессий",
    securityTip: "Совет по безопасности",
    securityTipInfo: "Немедленно завершите сессии, которые вы не узнаёте. При подозрительной активности смените пароль и включите 2FA.",
    confirmEnd: "Завершить эту сессию?",
    sessionEnded: "Сессия завершена",
    confirmEndAll: "Завершить все сессии, кроме текущей?",
    sessionsEnded: "сессий завершено",
    justNow: "Активна сейчас",
    minsAgo: "мин назад",
    hoursAgo: "ч назад",
    daysAgo: "д назад",
  },
};

export function SessionManager({ walletAddress }: SessionManagerProps) {
  const { lang } = useLanguage();
  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;

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
    if (!confirm(t("confirmEnd"))) {
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

      setSuccess(t("sessionEnded"));
      fetchSessions();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(null);
    }
  };

  const revokeAllSessions = async () => {
    if (!confirm(t("confirmEndAll"))) {
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

      setSuccess(`${data.revokedCount} ${t("sessionsEnded")}`);
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

  const getLocaleCode = () => {
    const localeMap: Record<string, string> = {
      tr: "tr-TR", en: "en-US", de: "de-DE", fr: "fr-FR", ar: "ar-SA", ru: "ru-RU",
    };
    return localeMap[lang] || "en-US";
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 5) return t("justNow");
    if (diffMins < 60) return `${diffMins} ${t("minsAgo")}`;
    if (diffHours < 24) return `${diffHours} ${t("hoursAgo")}`;
    if (diffDays < 7) return `${diffDays} ${t("daysAgo")}`;
    return date.toLocaleDateString(getLocaleCode());
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
            {t("activeSessions")}
          </h3>
          <p className="text-sm text-slate-400">
            {sessions.length} {t("activeSession")}
          </p>
        </div>
        {otherSessions.length > 0 && (
          <button
            onClick={revokeAllSessions}
            disabled={processing === "all"}
            className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {processing === "all"
              ? t("processing")
              : t("endAll")}
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
                  {t("current")}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                📍 {sessions.find(s => s.isCurrent)?.location} • {t("activeNow")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Other Sessions */}
      {otherSessions.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-400">
            {t("otherSessions")}
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
                    ? "..."
                    : t("end")}
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
            {t("noOtherSessions")}
          </p>
        </div>
      )}

      {/* Info */}
      <div className="bg-[#BFA181]/10 rounded-xl p-4 border border-[#BFA181]/20">
        <div className="flex gap-3">
          <span className="text-[#BFA181]">⚠️</span>
          <div>
            <p className="text-sm text-[#BFA181] font-medium mb-1">
              {t("securityTip")}
            </p>
            <p className="text-xs text-slate-400">
              {t("securityTipInfo")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
