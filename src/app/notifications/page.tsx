"use client";

import { useState, useEffect } from "react";
import TopNav from "@/components/TopNav";
import { useLanguage } from "@/components/LanguageContext";
import { useWallet } from "@/components/WalletContext";
import Link from "next/link";

const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "Bildirimler",
    subtitle: "Hesap bildirimleri ve uyarılar",
    markAllRead: "Tümünü Okundu İşaretle",
    unread: "okunmamış",
    all: "Tümü",
    asset: "Varlık",
    security: "Güvenlik",
    compliance: "Uyumluluk",
    yield: "Getiri",
    document: "Belge",
    operational: "Operasyonel",
    viewDetails: "Detayları Gör",
    noNotifications: "Bildirim bulunmuyor",
    noNotificationsDesc: "Yeni bildirimler burada görünecek",
    today: "Bugün",
    yesterday: "Dün",
    back: "Geri",
  },
  en: {
    title: "Notifications",
    subtitle: "Account notifications and alerts",
    markAllRead: "Mark All Read",
    unread: "unread",
    all: "All",
    asset: "Asset",
    security: "Security",
    compliance: "Compliance",
    yield: "Yield",
    document: "Document",
    operational: "Operational",
    viewDetails: "View Details",
    noNotifications: "No notifications",
    noNotificationsDesc: "New notifications will appear here",
    today: "Today",
    yesterday: "Yesterday",
    back: "Back",
  },
  de: {
    title: "Benachrichtigungen",
    subtitle: "Kontobenachrichtigungen und Warnungen",
    markAllRead: "Alle als gelesen markieren",
    unread: "ungelesen",
    all: "Alle",
    asset: "Vermögenswert",
    security: "Sicherheit",
    compliance: "Compliance",
    yield: "Rendite",
    document: "Dokument",
    operational: "Betrieblich",
    viewDetails: "Details anzeigen",
    noNotifications: "Keine Benachrichtigungen",
    noNotificationsDesc: "Neue Benachrichtigungen werden hier angezeigt",
    today: "Heute",
    yesterday: "Gestern",
    back: "Zurück",
  },
  fr: {
    title: "Notifications",
    subtitle: "Notifications et alertes du compte",
    markAllRead: "Tout marquer comme lu",
    unread: "non lues",
    all: "Toutes",
    asset: "Actif",
    security: "Sécurité",
    compliance: "Conformité",
    yield: "Rendement",
    document: "Document",
    operational: "Opérationnel",
    viewDetails: "Voir les détails",
    noNotifications: "Aucune notification",
    noNotificationsDesc: "Les nouvelles notifications apparaîtront ici",
    today: "Aujourd'hui",
    yesterday: "Hier",
    back: "Retour",
  },
  ar: {
    title: "الإشعارات",
    subtitle: "إشعارات وتنبيهات الحساب",
    markAllRead: "تحديد الكل كمقروء",
    unread: "غير مقروءة",
    all: "الكل",
    asset: "الأصول",
    security: "الأمان",
    compliance: "الامتثال",
    yield: "العائد",
    document: "المستندات",
    operational: "التشغيل",
    viewDetails: "عرض التفاصيل",
    noNotifications: "لا توجد إشعارات",
    noNotificationsDesc: "ستظهر الإشعارات الجديدة هنا",
    today: "اليوم",
    yesterday: "أمس",
    back: "رجوع",
  },
  ru: {
    title: "Уведомления",
    subtitle: "Уведомления и оповещения аккаунта",
    markAllRead: "Отметить все как прочитанные",
    unread: "непрочитанных",
    all: "Все",
    asset: "Активы",
    security: "Безопасность",
    compliance: "Соответствие",
    yield: "Доходность",
    document: "Документы",
    operational: "Операционные",
    viewDetails: "Подробнее",
    noNotifications: "Нет уведомлений",
    noNotificationsDesc: "Новые уведомления появятся здесь",
    today: "Сегодня",
    yesterday: "Вчера",
    back: "Назад",
  },
};

interface Notification {
  id: string;
  category: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

const categoryConfig: Record<string, { color: string; bgColor: string; icon: string }> = {
  asset: { color: "#BFA181", bgColor: "bg-[#BFA181]/15", icon: "📦" },
  security: { color: "#ef4444", bgColor: "bg-red-500/15", icon: "🛡️" },
  compliance: { color: "#8b5cf6", bgColor: "bg-purple-500/15", icon: "📋" },
  yield: { color: "#2F6F62", bgColor: "bg-[#2F6F62]/15", icon: "📈" },
  document: { color: "#3b82f6", bgColor: "bg-blue-500/15", icon: "📁" },
  operational: { color: "#f59e0b", bgColor: "bg-amber-500/15", icon: "⚙️" },
};

// Mock notifications matching mobile
const mockNotifications: Notification[] = [
  { id: "n1", category: "asset", title: "Allocation Complete", message: "Your 50g AUXG allocation has been confirmed and secured in the Zurich vault.", read: false, createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
  { id: "n2", category: "security", title: "New Session Detected", message: "A new login session was detected from Chrome on MacBook Pro in Istanbul, Turkey.", read: false, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
  { id: "n3", category: "compliance", title: "KYC Review Complete", message: "Your identity verification has been approved. All account features are now available.", read: true, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
  { id: "n4", category: "yield", title: "Yield Contract Executed", message: "Your monthly yield of 0.45% has been credited to your AUXM settlement balance.", read: true, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString() },
  { id: "n5", category: "document", title: "Monthly Statement Available", message: "Your January 2024 custody statement is now available for download.", read: false, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString() },
  { id: "n6", category: "asset", title: "Redemption Request Received", message: "Your redemption request for 25g AUXS has been received and is being processed.", read: true, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString() },
  { id: "n7", category: "security", title: "Withdrawal Protection Active", message: "24-hour withdrawal delay has been activated for your account security.", read: true, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString() },
  { id: "n8", category: "operational", title: "Scheduled Maintenance", message: "Platform maintenance scheduled for Sunday 02:00-04:00 CET. Services may be briefly unavailable.", read: true, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString() },
  { id: "n9", category: "yield", title: "Monthly Yield Credit", message: "Your monthly yield of $127.50 has been credited to your settlement balance.", read: true, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString() },
  { id: "n10", category: "document", title: "Audit Certificate Published", message: "Q4 2023 independent audit certificate is now available in your documents.", read: true, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString() },
  { id: "n11", category: "operational", title: "New Feature: QR Login", message: "You can now log in from desktop using QR code scanning from your mobile app.", read: true, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString() },
];

export default function NotificationsPage() {
  const { lang } = useLanguage();
  const { address } = useWallet();
  const t = translations[lang] || translations.en;

  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [activeCategory, setActiveCategory] = useState("all");

  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredNotifications = activeCategory === "all"
    ? notifications
    : notifications.filter(n => n.category === activeCategory);

  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    if (address) {
      try {
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address, markAllRead: true }),
        });
      } catch {}
    }
  };

  const handleMarkRead = async (notificationId: string) => {
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
    if (address) {
      try {
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address, notificationId }),
        });
      } catch {}
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 0) return t.today;
    if (diffDays === 1) return t.yesterday;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  const categories = [
    { key: "all", label: t.all },
    { key: "asset", label: t.asset },
    { key: "security", label: t.security },
    { key: "compliance", label: t.compliance },
    { key: "yield", label: t.yield },
    { key: "document", label: t.document },
    { key: "operational", label: t.operational },
  ];

  return (
    <div className="min-h-screen bg-[#f8f5f0] dark:bg-[#0a0a0a]">
      <TopNav />
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-4">
            <Link href="/client-center" className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition">
              <svg className="w-5 h-5 text-slate-800 dark:text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{t.title}</h1>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#BFA181] text-white">{unreadCount}</span>
                )}
              </div>
              <p className="text-sm text-slate-500 dark:text-zinc-400">{t.subtitle}</p>
            </div>
          </div>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="text-sm text-[#BFA181] font-medium hover:underline">
              {t.markAllRead}
            </button>
          )}
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-5">
          {categories.map(cat => {
            const config = categoryConfig[cat.key];
            const isActive = activeCategory === cat.key;
            const catCount = cat.key === "all"
              ? notifications.filter(n => !n.read).length
              : notifications.filter(n => n.category === cat.key && !n.read).length;

            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  isActive
                    ? cat.key === "all"
                      ? "bg-slate-800 dark:bg-white text-white dark:text-black"
                      : `text-white`
                    : "bg-white dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 border border-stone-200 dark:border-zinc-700/50 hover:bg-slate-50 dark:hover:bg-zinc-700/50"
                }`}
                style={isActive && cat.key !== "all" ? { backgroundColor: config?.color } : {}}
              >
                {config?.icon && <span className="text-sm">{config.icon}</span>}
                {cat.label}
                {catCount > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300"}`}>
                    {catCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Notification List */}
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-zinc-700 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">{t.noNotifications}</p>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">{t.noNotificationsDesc}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map(notification => {
              const config = categoryConfig[notification.category] || categoryConfig.operational;
              return (
                <div
                  key={notification.id}
                  onClick={() => !notification.read && handleMarkRead(notification.id)}
                  className={`bg-white dark:bg-zinc-800/50 rounded-xl p-4 border transition cursor-pointer hover:shadow-sm ${
                    !notification.read
                      ? "border-l-[3px]"
                      : "border-stone-200 dark:border-zinc-700/50"
                  }`}
                  style={!notification.read ? { borderLeftColor: config.color, borderTopColor: "transparent", borderRightColor: "transparent", borderBottomColor: "transparent" } : {}}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-lg">{config.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">{notification.title}</h3>
                          {!notification.read && (
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 dark:text-zinc-500 flex-shrink-0 ml-2">{formatTime(notification.createdAt)}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed line-clamp-2">{notification.message}</p>
                      {notification.actionUrl && (
                        <button className="flex items-center gap-1 mt-2 text-xs font-medium text-[#BFA181] hover:underline">
                          {t.viewDetails}
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
