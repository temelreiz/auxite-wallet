"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/components/LanguageContext";

interface SecurityLogsProps {
  walletAddress: string;
}

interface SecurityLog {
  event: string;
  description: string;
  severity: "info" | "warning" | "danger";
  details: Record<string, unknown>;
  timestamp: string;
  relativeTime: string;
}

const translations: Record<string, Record<string, string>> = {
  tr: {
    securityHistory: "Güvenlik Geçmişi",
    recentEvents: "Son güvenlik olayları",
    all: "Tümü",
    loading: "Yükleniyor...",
    showMore: "Daha Fazla Göster",
    noEvents: "Henüz güvenlik olayı yok",
    eventTypes: "Olay Türleri:",
    info: "Bilgi",
    warning: "Uyarı",
    critical: "Kritik",
  },
  en: {
    securityHistory: "Security History",
    recentEvents: "Recent security events",
    all: "All",
    loading: "Loading...",
    showMore: "Show More",
    noEvents: "No security events yet",
    eventTypes: "Event Types:",
    info: "Info",
    warning: "Warning",
    critical: "Critical",
  },
  de: {
    securityHistory: "Sicherheitsverlauf",
    recentEvents: "Aktuelle Sicherheitsereignisse",
    all: "Alle",
    loading: "Laden...",
    showMore: "Mehr anzeigen",
    noEvents: "Noch keine Sicherheitsereignisse",
    eventTypes: "Ereignistypen:",
    info: "Info",
    warning: "Warnung",
    critical: "Kritisch",
  },
  fr: {
    securityHistory: "Historique de sécurité",
    recentEvents: "Événements de sécurité récents",
    all: "Tous",
    loading: "Chargement...",
    showMore: "Afficher plus",
    noEvents: "Aucun événement de sécurité",
    eventTypes: "Types d'événements :",
    info: "Info",
    warning: "Avertissement",
    critical: "Critique",
  },
  ar: {
    securityHistory: "سجل الأمان",
    recentEvents: "أحداث الأمان الأخيرة",
    all: "الكل",
    loading: "جارٍ التحميل...",
    showMore: "عرض المزيد",
    noEvents: "لا توجد أحداث أمنية بعد",
    eventTypes: "أنواع الأحداث:",
    info: "معلومات",
    warning: "تحذير",
    critical: "حرج",
  },
  ru: {
    securityHistory: "История безопасности",
    recentEvents: "Недавние события безопасности",
    all: "Все",
    loading: "Загрузка...",
    showMore: "Показать больше",
    noEvents: "Пока нет событий безопасности",
    eventTypes: "Типы событий:",
    info: "Информация",
    warning: "Предупреждение",
    critical: "Критический",
  },
};

export function SecurityLogs({ walletAddress }: SecurityLogsProps) {
  const { lang } = useLanguage();
  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;

  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "info" | "warning" | "danger">("all");
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchLogs(true);
  }, [walletAddress, filter]);

  const fetchLogs = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setOffset(0);
      }

      const currentOffset = reset ? 0 : offset;
      const severityParam = filter !== "all" ? `&severity=${filter}` : "";

      const res = await fetch(
        `/api/security/logs?limit=${limit}&offset=${currentOffset}&lang=${lang}${severityParam}`,
        {
          headers: { "x-wallet-address": walletAddress },
        }
      );

      const data = await res.json();

      if (reset) {
        setLogs(data.logs || []);
      } else {
        setLogs(prev => [...prev, ...(data.logs || [])]);
      }

      setHasMore(data.hasMore);
      setOffset(currentOffset + limit);
    } catch (err) {
      console.error("Security logs fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case "danger":
        return {
          bg: "bg-red-500/10",
          border: "border-red-500/20",
          icon: "🔴",
          text: "text-red-400",
        };
      case "warning":
        return {
          bg: "bg-[#BFA181]/10",
          border: "border-[#BFA181]/20",
          icon: "🟡",
          text: "text-[#BFA181]",
        };
      default:
        return {
          bg: "bg-slate-800/50",
          border: "border-slate-700",
          icon: "🔵",
          text: "text-slate-300",
        };
    }
  };

  const getEventIcon = (event: string) => {
    if (event.includes("2FA")) return "🔐";
    if (event.includes("DEVICE")) return "📱";
    if (event.includes("SESSION")) return "🔑";
    if (event.includes("PASSKEY") || event.includes("BIOMETRIC")) return "👆";
    if (event.includes("LOGIN")) return "🚪";
    if (event.includes("SUSPICIOUS") || event.includes("BLOCKED")) return "⚠️";
    if (event.includes("WITHDRAWAL") || event.includes("TRANSACTION")) return "💸";
    return "📋";
  };

  const formatDetails = (details: Record<string, unknown>) => {
    const entries = Object.entries(details);
    if (entries.length === 0) return null;

    return entries.map(([key, value]) => {
      // IP maskeleme
      if (key === "ip" && typeof value === "string") {
        const parts = value.split(".");
        if (parts.length === 4) {
          value = `${parts[0]}.${parts[1]}.***.***`;
        }
      }

      return (
        <span key={key} className="inline-flex items-center gap-1 text-xs bg-slate-700/50 px-2 py-0.5 rounded">
          <span className="text-slate-500">{key}:</span>
          <span className="text-slate-300">{String(value)}</span>
        </span>
      );
    });
  };

  const getLocaleCode = () => {
    const localeMap: Record<string, string> = {
      tr: "tr-TR", en: "en-US", de: "de-DE", fr: "fr-FR", ar: "ar-SA", ru: "ru-RU",
    };
    return localeMap[lang] || "en-US";
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-slate-600 border-t-[#BFA181] rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            {t("securityHistory")}
          </h3>
          <p className="text-sm text-slate-400">
            {t("recentEvents")}
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
          {[
            { id: "all", label: t("all") },
            { id: "info", label: "ℹ️" },
            { id: "warning", label: "⚠️" },
            { id: "danger", label: "🔴" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                filter === f.id
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Logs List */}
      <div className="space-y-2">
        {logs.map((log, index) => {
          const styles = getSeverityStyles(log.severity);

          return (
            <div
              key={`${log.timestamp}-${index}`}
              className={`${styles.bg} rounded-xl p-4 border ${styles.border}`}
            >
              <div className="flex items-start gap-3">
                {/* Event Icon */}
                <div className="text-xl">
                  {getEventIcon(log.event)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`font-medium ${styles.text}`}>
                      {log.description}
                    </p>
                    <span className="text-lg">{styles.icon}</span>
                  </div>

                  {/* Details */}
                  {log.details && Object.keys(log.details).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {formatDetails(log.details)}
                    </div>
                  )}

                  {/* Time */}
                  <p className="text-xs text-slate-500 mt-2">
                    {log.relativeTime} • {new Date(log.timestamp).toLocaleString(getLocaleCode())}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="text-center">
          <button
            onClick={() => fetchLogs(false)}
            disabled={loading}
            className="px-6 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors text-sm disabled:opacity-50"
          >
            {loading
              ? t("loading")
              : t("showMore")}
          </button>
        </div>
      )}

      {/* Empty State */}
      {logs.length === 0 && (
        <div className="text-center py-12">
          <span className="text-4xl mb-4 block">📋</span>
          <p className="text-slate-400">
            {t("noEvents")}
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="bg-slate-800/30 rounded-xl p-4">
        <p className="text-xs text-slate-500 mb-2">
          {t("eventTypes")}
        </p>
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="text-blue-400">🔵</span>
            <span className="text-slate-400">{t("info")}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="text-[#BFA181]">🟡</span>
            <span className="text-slate-400">{t("warning")}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="text-red-400">🔴</span>
            <span className="text-slate-400">{t("critical")}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
