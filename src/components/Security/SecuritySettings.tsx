"use client";

import { useState, useEffect } from "react";
import { TwoFactorSetup } from "./TwoFactorSetup";
import { DeviceManager } from "./DeviceManager";
import { SessionManager } from "./SessionManager";
import { BiometricSetup } from "./BiometricSetup";
import { SecurityLogs } from "./SecurityLogs";

interface SecuritySettingsProps {
  walletAddress: string;
  lang?: "tr" | "en" | "de" | "fr" | "ar" | "ru";
  onClose?: () => void;
}

interface SecurityStatus {
  twoFactorEnabled: boolean;
  biometricEnabled: boolean;
  trustedDevices: number;
  activeSessions: number;
  securityScore: number;
  backupCodesRemaining?: number;
}

export function SecuritySettings({ 
  walletAddress, 
  lang = "en",
  onClose 
}: SecuritySettingsProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "2fa" | "biometric" | "devices" | "sessions" | "logs">("overview");
  const [status, setStatus] = useState<SecurityStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSecurityStatus();
  }, [walletAddress]);

  const fetchSecurityStatus = async () => {
    try {
      setLoading(true);
      
      // 2FA durumu
      const twoFARes = await fetch("/api/security/2fa/status", {
        headers: { "x-wallet-address": walletAddress },
      });
      const twoFAData = await twoFARes.json();

      // Biometric durumu
      const bioRes = await fetch("/api/security/biometric", {
        headers: { "x-wallet-address": walletAddress },
      });
      const bioData = await bioRes.json();

      // Cihazlar
      const devicesRes = await fetch("/api/security/devices", {
        headers: { "x-wallet-address": walletAddress },
      });
      const devicesData = await devicesRes.json();

      // Oturumlar
      const sessionsRes = await fetch("/api/security/sessions", {
        headers: { "x-wallet-address": walletAddress },
      });
      const sessionsData = await sessionsRes.json();

      // Güvenlik skoru hesapla
      let score = 20; // Base score
      if (twoFAData.enabled) score += 35;
      if (bioData.enabled) score += 20;
      if (twoFAData.backupCodesRemaining >= 4) score += 10;
      if (devicesData.trustedDevices > 0 && devicesData.trustedDevices <= 3) score += 10;
      if (sessionsData.totalActive <= 2) score += 5;

      setStatus({
        twoFactorEnabled: twoFAData.enabled || false,
        biometricEnabled: bioData.enabled || false,
        trustedDevices: devicesData.trustedDevices || 0,
        activeSessions: sessionsData.totalActive || 0,
        securityScore: Math.min(100, score),
        backupCodesRemaining: twoFAData.backupCodesRemaining,
      });
    } catch (error) {
      console.error("Security status error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-[#2F6F62]";
    if (score >= 50) return "text-[#BFA181]";
    return "text-red-400";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return lang === "tr" ? "Güçlü" : "Strong";
    if (score >= 50) return lang === "tr" ? "Orta" : "Medium";
    return lang === "tr" ? "Zayıf" : "Weak";
  };

  const tabs = [
    { id: "overview", label: lang === "tr" ? "Genel" : "Overview", icon: "🛡️" },
    { id: "2fa", label: "2FA", icon: "🔐" },
    { id: "biometric", label: lang === "tr" ? "Bio" : "Bio", icon: "👆" },
    { id: "devices", label: lang === "tr" ? "Cihaz" : "Device", icon: "📱" },
    { id: "sessions", label: lang === "tr" ? "Oturum" : "Session", icon: "🔑" },
    { id: "logs", label: lang === "tr" ? "Log" : "Logs", icon: "📋" },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-700 w-full max-w-[calc(100vw-16px)] sm:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 lg:p-6 border-b border-slate-800">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#2F6F62]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-base sm:text-xl">🛡️</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-bold text-white truncate">
                {lang === "tr" ? "Güvenlik Ayarları" : "Security Settings"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 hidden sm:block">
                {lang === "tr" ? "Hesabınızı koruyun" : "Protect your account"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors touch-manipulation flex-shrink-0"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs - Horizontal scroll on mobile */}
        <div className="flex gap-0.5 sm:gap-1 p-1.5 sm:p-2 border-b border-slate-800 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 touch-manipulation ${
                activeTab === tab.id
                  ? "bg-[#2F6F62]/20 text-[#2F6F62]"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <span className="text-sm sm:text-base">{tab.icon}</span>
              <span className="hidden xs:inline sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
          {loading ? (
            <div className="flex items-center justify-center h-48 sm:h-64">
              <div className="animate-spin w-6 h-6 sm:w-8 sm:h-8 border-2 border-slate-600 border-t-[#BFA181] rounded-full" />
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === "overview" && status && (
                <div className="space-y-4 sm:space-y-6">
                  {/* Security Score */}
                  <div className="bg-slate-800/50 rounded-xl p-4 sm:p-6 border border-slate-700">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <h3 className="text-sm sm:text-lg font-semibold text-white">
                        {lang === "tr" ? "Güvenlik Skoru" : "Security Score"}
                      </h3>
                      <div className={`text-2xl sm:text-3xl font-bold ${getScoreColor(status.securityScore)}`}>
                        {status.securityScore}/100
                      </div>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2 sm:h-3 mb-2">
                      <div
                        className={`h-2 sm:h-3 rounded-full transition-all duration-500 ${
                          status.securityScore >= 80
                            ? "bg-[#2F6F62]"
                            : status.securityScore >= 50
                            ? "bg-[#BFA181]"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${status.securityScore}%` }}
                      />
                    </div>
                    <p className={`text-xs sm:text-sm ${getScoreColor(status.securityScore)}`}>
                      {getScoreLabel(status.securityScore)}
                    </p>
                  </div>

                  {/* Quick Status Cards */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
                    {/* 2FA Status */}
                    <div 
                      className="bg-slate-800/50 rounded-xl p-3 sm:p-4 border border-slate-700 cursor-pointer hover:border-slate-600 transition-colors touch-manipulation active:scale-[0.98]"
                      onClick={() => setActiveTab("2fa")}
                    >
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                        <span className="text-base sm:text-xl">🔐</span>
                        <span className="text-[10px] sm:text-sm text-slate-400">2FA</span>
                      </div>
                      <div className={`text-sm sm:text-lg font-semibold ${status.twoFactorEnabled ? "text-[#2F6F62]" : "text-red-400"}`}>
                        {status.twoFactorEnabled 
                          ? (lang === "tr" ? "Aktif" : "Active") 
                          : (lang === "tr" ? "Kapalı" : "Off")}
                      </div>
                      {status.twoFactorEnabled && status.backupCodesRemaining !== undefined && (
                        <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1">
                          {status.backupCodesRemaining} {lang === "tr" ? "yedek" : "backup"}
                        </p>
                      )}
                    </div>

                    {/* Biometric Status */}
                    <div 
                      className="bg-slate-800/50 rounded-xl p-3 sm:p-4 border border-slate-700 cursor-pointer hover:border-slate-600 transition-colors touch-manipulation active:scale-[0.98]"
                      onClick={() => setActiveTab("biometric")}
                    >
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                        <span className="text-base sm:text-xl">👆</span>
                        <span className="text-[10px] sm:text-sm text-slate-400">
                          {lang === "tr" ? "Bio" : "Bio"}
                        </span>
                      </div>
                      <div className={`text-sm sm:text-lg font-semibold ${status.biometricEnabled ? "text-[#2F6F62]" : "text-slate-400"}`}>
                        {status.biometricEnabled 
                          ? (lang === "tr" ? "Aktif" : "Active") 
                          : (lang === "tr" ? "Kapalı" : "Off")}
                      </div>
                    </div>

                    {/* Devices */}
                    <div 
                      className="bg-slate-800/50 rounded-xl p-3 sm:p-4 border border-slate-700 cursor-pointer hover:border-slate-600 transition-colors touch-manipulation active:scale-[0.98]"
                      onClick={() => setActiveTab("devices")}
                    >
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                        <span className="text-base sm:text-xl">📱</span>
                        <span className="text-[10px] sm:text-sm text-slate-400">
                          {lang === "tr" ? "Cihaz" : "Device"}
                        </span>
                      </div>
                      <div className="text-sm sm:text-lg font-semibold text-white">
                        {status.trustedDevices}
                      </div>
                      <p className="text-[10px] sm:text-xs text-slate-500">
                        {lang === "tr" ? "güvenilir" : "trusted"}
                      </p>
                    </div>

                    {/* Sessions */}
                    <div 
                      className="bg-slate-800/50 rounded-xl p-3 sm:p-4 border border-slate-700 cursor-pointer hover:border-slate-600 transition-colors touch-manipulation active:scale-[0.98]"
                      onClick={() => setActiveTab("sessions")}
                    >
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                        <span className="text-base sm:text-xl">🔑</span>
                        <span className="text-[10px] sm:text-sm text-slate-400">
                          {lang === "tr" ? "Oturum" : "Session"}
                        </span>
                      </div>
                      <div className="text-sm sm:text-lg font-semibold text-white">
                        {status.activeSessions}
                      </div>
                      <p className="text-[10px] sm:text-xs text-slate-500">
                        {lang === "tr" ? "aktif" : "active"}
                      </p>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="bg-slate-800/50 rounded-xl p-4 sm:p-6 border border-slate-700">
                    <h3 className="text-sm sm:text-lg font-semibold text-white mb-3 sm:mb-4">
                      {lang === "tr" ? "Öneriler" : "Recommendations"}
                    </h3>
                    <div className="space-y-2 sm:space-y-3">
                      {!status.twoFactorEnabled && (
                        <div className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 bg-[#BFA181]/10 rounded-lg border border-[#BFA181]/20">
                          <span className="text-[#BFA181] text-sm sm:text-base flex-shrink-0">⚠️</span>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm text-[#BFA181] font-medium">
                              {lang === "tr" ? "2FA'yı Aktifleştirin" : "Enable 2FA"}
                            </p>
                            <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">
                              {lang === "tr" 
                                ? "Hesabınızı ekstra güvenlik katmanıyla koruyun" 
                                : "Protect your account with an extra layer of security"}
                            </p>
                          </div>
                        </div>
                      )}
                      {!status.biometricEnabled && (
                        <div className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                          <span className="text-blue-500 text-sm sm:text-base flex-shrink-0">💡</span>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm text-blue-400 font-medium">
                              {lang === "tr" ? "Biyometrik Ekleyin" : "Add Biometric"}
                            </p>
                            <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">
                              {lang === "tr" 
                                ? "Touch ID veya Face ID ile hızlı ve güvenli giriş" 
                                : "Quick and secure login with Touch ID or Face ID"}
                            </p>
                          </div>
                        </div>
                      )}
                      {status.securityScore >= 80 && (
                        <div className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 bg-[#2F6F62]/10 rounded-lg border border-[#2F6F62]/20">
                          <span className="text-[#2F6F62] text-sm sm:text-base flex-shrink-0">✅</span>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm text-[#2F6F62] font-medium">
                              {lang === "tr" ? "Harika!" : "Great!"}
                            </p>
                            <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">
                              {lang === "tr" 
                                ? "Hesabınız güçlü bir şekilde korunuyor" 
                                : "Your account is well protected"}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 2FA Tab */}
              {activeTab === "2fa" && (
                <TwoFactorSetup 
                  walletAddress={walletAddress} 
                  lang={lang}
                  onStatusChange={fetchSecurityStatus}
                />
              )}

              {/* Biometric Tab */}
              {activeTab === "biometric" && (
                <BiometricSetup 
                  walletAddress={walletAddress} 
                  lang={lang}
                  onStatusChange={fetchSecurityStatus}
                />
              )}

              {/* Devices Tab */}
              {activeTab === "devices" && (
                <DeviceManager 
                  walletAddress={walletAddress} 
                  lang={lang}
                />
              )}

              {/* Sessions Tab */}
              {activeTab === "sessions" && (
                <SessionManager 
                  walletAddress={walletAddress} 
                  lang={lang}
                />
              )}

              {/* Logs Tab */}
              {activeTab === "logs" && (
                <SecurityLogs 
                  walletAddress={walletAddress} 
                  lang={lang}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
