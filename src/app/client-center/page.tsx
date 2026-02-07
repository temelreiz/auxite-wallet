"use client";

import { useState, useEffect } from "react";
import TopNav from "@/components/TopNav";
import { useLanguage } from "@/components/LanguageContext";
import { useAccount } from "wagmi";

// ============================================
// CLIENT CENTER - Not "Profile"
// Institutional client management portal
// ============================================

const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "Müşteri Merkezi",
    subtitle: "Hesap yönetimi, güvenlik ayarları ve tercihler",
    // Sections
    accountOverview: "Hesap Özeti",
    securityCenter: "Güvenlik Merkezi",
    deviceRegistry: "Cihaz Kayıtları",
    preferences: "Tercihler",
    // Account
    clientId: "Müşteri Kimliği",
    accountStatus: "Hesap Durumu",
    verified: "Doğrulanmış",
    pending: "Beklemede",
    memberSince: "Üyelik Başlangıcı",
    custodyAddress: "Saklama Adresi",
    kycStatus: "KYC Durumu",
    tier: "Seviye",
    // Security
    twoFactorAuth: "İki Faktörlü Kimlik Doğrulama",
    enabled: "Etkin",
    disabled: "Devre Dışı",
    enable2FA: "2FA Etkinleştir",
    disable2FA: "2FA Devre Dışı Bırak",
    whitelist: "Beyaz Liste Yönetimi",
    whitelistDesc: "Onaylı transfer adresleri yönetin",
    manageWhitelist: "Beyaz Listeyi Yönet",
    sessionManagement: "Oturum Yönetimi",
    activeSessions: "Aktif Oturumlar",
    killAllSessions: "Tüm Oturumları Sonlandır",
    lastLogin: "Son Giriş",
    securityLog: "Güvenlik Günlüğü",
    viewSecurityLog: "Günlüğü Görüntüle",
    // Devices
    thisDevice: "Bu Cihaz",
    browser: "Tarayıcı",
    mobile: "Mobil",
    lastActive: "Son Aktif",
    removeDevice: "Cihazı Kaldır",
    noDevices: "Kayıtlı cihaz yok",
    // Preferences
    language: "Dil",
    timezone: "Saat Dilimi",
    currency: "Para Birimi",
    notifications: "Bildirimler",
    emailNotifications: "E-posta Bildirimleri",
    pushNotifications: "Push Bildirimleri",
    priceAlerts: "Fiyat Uyarıları",
    transactionAlerts: "İşlem Uyarıları",
    // Actions
    save: "Kaydet",
    cancel: "İptal",
    edit: "Düzenle",
    copy: "Kopyala",
    copied: "Kopyalandı",
    // Danger Zone
    dangerZone: "Tehlike Bölgesi",
    exportData: "Veri Dışa Aktar",
    exportDataDesc: "Tüm hesap verilerinizi indirin",
    deleteAccount: "Hesabı Sil",
    deleteAccountDesc: "Kalıcı olarak hesabınızı silin",
    // Referral
    referralProgram: "Referans Programı",
    referralCode: "Referans Kodunuz",
    totalReferrals: "Toplam Referanslar",
    totalEarnings: "Toplam Kazanç",
    shareReferral: "Paylaş",
  },
  en: {
    title: "Client Center",
    subtitle: "Account management, security settings, and preferences",
    // Sections
    accountOverview: "Account Overview",
    securityCenter: "Security Center",
    deviceRegistry: "Device Registry",
    preferences: "Preferences",
    // Account
    clientId: "Client ID",
    accountStatus: "Account Status",
    verified: "Verified",
    pending: "Pending",
    memberSince: "Member Since",
    custodyAddress: "Custody Address",
    kycStatus: "KYC Status",
    tier: "Tier",
    // Security
    twoFactorAuth: "Two-Factor Authentication",
    enabled: "Enabled",
    disabled: "Disabled",
    enable2FA: "Enable 2FA",
    disable2FA: "Disable 2FA",
    whitelist: "Whitelist Management",
    whitelistDesc: "Manage approved transfer addresses",
    manageWhitelist: "Manage Whitelist",
    sessionManagement: "Session Management",
    activeSessions: "Active Sessions",
    killAllSessions: "Kill All Sessions",
    lastLogin: "Last Login",
    securityLog: "Security Log",
    viewSecurityLog: "View Log",
    // Devices
    thisDevice: "This Device",
    browser: "Browser",
    mobile: "Mobile",
    lastActive: "Last Active",
    removeDevice: "Remove Device",
    noDevices: "No registered devices",
    // Preferences
    language: "Language",
    timezone: "Timezone",
    currency: "Currency",
    notifications: "Notifications",
    emailNotifications: "Email Notifications",
    pushNotifications: "Push Notifications",
    priceAlerts: "Price Alerts",
    transactionAlerts: "Transaction Alerts",
    // Actions
    save: "Save",
    cancel: "Cancel",
    edit: "Edit",
    copy: "Copy",
    copied: "Copied",
    // Danger Zone
    dangerZone: "Danger Zone",
    exportData: "Export Data",
    exportDataDesc: "Download all your account data",
    deleteAccount: "Delete Account",
    deleteAccountDesc: "Permanently delete your account",
    // Referral
    referralProgram: "Referral Program",
    referralCode: "Your Referral Code",
    totalReferrals: "Total Referrals",
    totalEarnings: "Total Earnings",
    shareReferral: "Share",
  },
};

// Mock data
const mockDevices = [
  { id: 1, name: "Chrome on MacOS", type: "browser", lastActive: "2026-02-07T14:30:00Z", current: true },
  { id: 2, name: "Auxite Mobile App", type: "mobile", lastActive: "2026-02-07T10:15:00Z", current: false },
  { id: 3, name: "Firefox on Windows", type: "browser", lastActive: "2026-02-05T08:45:00Z", current: false },
];

const mockSecurityLog = [
  { id: 1, event: "Login", device: "Chrome on MacOS", ip: "192.168.1.***", time: "2026-02-07T14:30:00Z" },
  { id: 2, event: "2FA Enabled", device: "Chrome on MacOS", ip: "192.168.1.***", time: "2026-02-06T16:20:00Z" },
  { id: 3, event: "Whitelist Updated", device: "Auxite Mobile", ip: "10.0.0.***", time: "2026-02-05T12:00:00Z" },
];

export default function ClientCenterPage() {
  const { lang, setLang } = useLanguage();
  const t = translations[lang] || translations.en;
  const { address } = useAccount();

  const [activeTab, setActiveTab] = useState<"account" | "security" | "devices" | "preferences">("account");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    priceAlerts: true,
    transactions: true,
  });
  const [copied, setCopied] = useState(false);
  const [showSecurityLog, setShowSecurityLog] = useState(false);

  // Mock client data
  const clientData = {
    clientId: "AUX-" + (address?.slice(2, 8).toUpperCase() || "XXXXXX"),
    memberSince: "January 2026",
    kycStatus: "verified",
    tier: "Gold",
    referralCode: "AUX-" + (address?.slice(2, 8).toUpperCase() || "XXXXXX"),
    totalReferrals: 12,
    totalEarnings: 450.25,
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString(lang === "tr" ? "tr-TR" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-slate-950">
      <TopNav />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{t.title}</h1>
          <p className="text-slate-600 dark:text-slate-400">{t.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-4 sticky top-4">
              <div className="space-y-1">
                {[
                  { key: "account", label: t.accountOverview, icon: "👤" },
                  { key: "security", label: t.securityCenter, icon: "🔒" },
                  { key: "devices", label: t.deviceRegistry, icon: "📱" },
                  { key: "preferences", label: t.preferences, icon: "⚙️" },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setActiveTab(item.key as typeof activeTab)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === item.key
                        ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                        : "text-slate-600 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Account Overview Tab */}
            {activeTab === "account" && (
              <>
                {/* Client ID Card */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">{t.accountOverview}</h3>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">{t.clientId}</label>
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-mono font-semibold text-slate-800 dark:text-white">{clientData.clientId}</p>
                        <button
                          onClick={() => copyToClipboard(clientData.clientId)}
                          className="p-1 rounded hover:bg-stone-100 dark:hover:bg-slate-800"
                        >
                          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-slate-500 block mb-1">{t.accountStatus}</label>
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        {t.verified}
                      </span>
                    </div>

                    <div>
                      <label className="text-xs text-slate-500 block mb-1">{t.memberSince}</label>
                      <p className="text-slate-800 dark:text-white">{clientData.memberSince}</p>
                    </div>

                    <div>
                      <label className="text-xs text-slate-500 block mb-1">{t.tier}</label>
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-sm font-medium">
                        🏆 {clientData.tier}
                      </span>
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-xs text-slate-500 block mb-1">{t.custodyAddress}</label>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-mono text-slate-600 dark:text-slate-400 truncate">
                          {address || "Not connected"}
                        </p>
                        {address && (
                          <button
                            onClick={() => copyToClipboard(address)}
                            className="p-1 rounded hover:bg-stone-100 dark:hover:bg-slate-800 flex-shrink-0"
                          >
                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Referral Program */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">{t.referralProgram}</h3>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 bg-stone-50 dark:bg-slate-800 rounded-lg">
                      <label className="text-xs text-slate-500 block mb-1">{t.referralCode}</label>
                      <div className="flex items-center gap-2">
                        <p className="font-mono font-semibold text-slate-800 dark:text-white">{clientData.referralCode}</p>
                        <button
                          onClick={() => copyToClipboard(clientData.referralCode)}
                          className="p-1 rounded hover:bg-stone-200 dark:hover:bg-slate-700"
                        >
                          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="p-4 bg-stone-50 dark:bg-slate-800 rounded-lg">
                      <label className="text-xs text-slate-500 block mb-1">{t.totalReferrals}</label>
                      <p className="text-2xl font-bold text-slate-800 dark:text-white">{clientData.totalReferrals}</p>
                    </div>
                    <div className="p-4 bg-stone-50 dark:bg-slate-800 rounded-lg">
                      <label className="text-xs text-slate-500 block mb-1">{t.totalEarnings}</label>
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">${clientData.totalEarnings}</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Security Center Tab */}
            {activeTab === "security" && (
              <>
                {/* 2FA */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-white">{t.twoFactorAuth}</h3>
                      <p className="text-sm text-slate-500">
                        {twoFactorEnabled ? t.enabled : t.disabled}
                      </p>
                    </div>
                    <button
                      onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        twoFactorEnabled
                          ? "bg-red-500/20 text-red-600 hover:bg-red-500/30"
                          : "bg-emerald-500 text-white hover:bg-emerald-600"
                      }`}
                    >
                      {twoFactorEnabled ? t.disable2FA : t.enable2FA}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-stone-50 dark:bg-slate-800 rounded-lg">
                    <div className={`w-3 h-3 rounded-full ${twoFactorEnabled ? "bg-emerald-500" : "bg-slate-400"}`} />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {twoFactorEnabled ? "Your account is protected with 2FA" : "Enable 2FA for enhanced security"}
                    </span>
                  </div>
                </div>

                {/* Whitelist */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-white">{t.whitelist}</h3>
                      <p className="text-sm text-slate-500">{t.whitelistDesc}</p>
                    </div>
                    <button className="px-4 py-2 bg-stone-100 dark:bg-slate-800 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-700 transition-colors">
                      {t.manageWhitelist}
                    </button>
                  </div>
                </div>

                {/* Session Management */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-white">{t.sessionManagement}</h3>
                      <p className="text-sm text-slate-500">{t.activeSessions}: 3</p>
                    </div>
                    <button className="px-4 py-2 bg-red-500/20 text-red-600 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors">
                      {t.killAllSessions}
                    </button>
                  </div>
                </div>

                {/* Security Log */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white">{t.securityLog}</h3>
                    <button
                      onClick={() => setShowSecurityLog(!showSecurityLog)}
                      className="px-4 py-2 bg-stone-100 dark:bg-slate-800 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      {t.viewSecurityLog}
                    </button>
                  </div>

                  {showSecurityLog && (
                    <div className="space-y-2">
                      {mockSecurityLog.map((log) => (
                        <div key={log.id} className="flex items-center justify-between p-3 bg-stone-50 dark:bg-slate-800 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                              <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-800 dark:text-white">{log.event}</p>
                              <p className="text-xs text-slate-500">{log.device} • {log.ip}</p>
                            </div>
                          </div>
                          <p className="text-xs text-slate-500">{formatDate(log.time)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Device Registry Tab */}
            {activeTab === "devices" && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">{t.deviceRegistry}</h3>

                <div className="space-y-3">
                  {mockDevices.map((device) => (
                    <div
                      key={device.id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        device.current
                          ? "border-emerald-500 bg-emerald-500/10"
                          : "border-stone-200 dark:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          device.type === "browser" ? "bg-blue-500/20" : "bg-purple-500/20"
                        }`}>
                          {device.type === "browser" ? (
                            <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-800 dark:text-white">{device.name}</p>
                            {device.current && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-600">
                                {t.thisDevice}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">{t.lastActive}: {formatDate(device.lastActive)}</p>
                        </div>
                      </div>

                      {!device.current && (
                        <button className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-500/10 rounded-lg transition-colors">
                          {t.removeDevice}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === "preferences" && (
              <>
                {/* Language & Display */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">{t.preferences}</h3>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-800 dark:text-white">{t.language}</p>
                        <p className="text-sm text-slate-500">Select your preferred language</p>
                      </div>
                      <select
                        value={lang}
                        onChange={(e) => setLang(e.target.value as typeof lang)}
                        className="px-4 py-2 bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="en">English</option>
                        <option value="tr">Türkçe</option>
                        <option value="de">Deutsch</option>
                        <option value="fr">Français</option>
                        <option value="ar">العربية</option>
                        <option value="ru">Русский</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-800 dark:text-white">{t.currency}</p>
                        <p className="text-sm text-slate-500">Display currency for values</p>
                      </div>
                      <select className="px-4 py-2 bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white focus:outline-none focus:border-amber-500">
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="TRY">TRY (₺)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Notifications */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">{t.notifications}</h3>

                  <div className="space-y-4">
                    {[
                      { key: "email", label: t.emailNotifications },
                      { key: "push", label: t.pushNotifications },
                      { key: "priceAlerts", label: t.priceAlerts },
                      { key: "transactions", label: t.transactionAlerts },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between">
                        <p className="font-medium text-slate-800 dark:text-white">{item.label}</p>
                        <button
                          onClick={() => setNotifications((prev) => ({ ...prev, [item.key]: !prev[item.key as keyof typeof notifications] }))}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            notifications[item.key as keyof typeof notifications]
                              ? "bg-emerald-500"
                              : "bg-slate-300 dark:bg-slate-600"
                          }`}
                        >
                          <div
                            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                              notifications[item.key as keyof typeof notifications] ? "translate-x-7" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-red-200 dark:border-red-900/50 p-6">
                  <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">{t.dangerZone}</h3>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-800 dark:text-white">{t.exportData}</p>
                        <p className="text-sm text-slate-500">{t.exportDataDesc}</p>
                      </div>
                      <button className="px-4 py-2 bg-stone-100 dark:bg-slate-800 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-700 transition-colors">
                        {t.exportData}
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-800 dark:text-white">{t.deleteAccount}</p>
                        <p className="text-sm text-slate-500">{t.deleteAccountDesc}</p>
                      </div>
                      <button className="px-4 py-2 bg-red-500/20 rounded-lg text-sm font-medium text-red-600 hover:bg-red-500/30 transition-colors">
                        {t.deleteAccount}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Copied Toast */}
      {copied && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm">
          {t.copied}
        </div>
      )}
    </div>
  );
}
