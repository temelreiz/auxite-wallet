"use client";

import { useState, useEffect } from "react";
import { TwoFactorSetup } from "./TwoFactorSetup";
import { DeviceManager } from "./DeviceManager";
import { SessionManager } from "./SessionManager";
import { BiometricSetup } from "./BiometricSetup";
import { SecurityLogs } from "./SecurityLogs";

interface SecuritySettingsProps {
  walletAddress: string;
  lang?: "tr" | "en";
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
  lang = "tr",
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
    if (score >= 80) return "text-emerald-400";
    if (score >= 50) return "text-amber-400";
    return "text-red-400";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return lang === "tr" ? "Güçlü" : "Strong";
    if (score >= 50) return lang === "tr" ? "Orta" : "Medium";
    return lang === "tr" ? "Zayıf" : "Weak";
  };

  const tabs = [
    { id: "overview", label: lang === "tr" ? "Genel Bakış" : "Overview", icon: "🛡️" },
    { id: "2fa", label: "2FA", icon: "🔐" },
    { id: "biometric", label: lang === "tr" ? "Biyometrik" : "Biometric", icon: "👆" },
    { id: "devices", label: lang === "tr" ? "Cihazlar" : "Devices", icon: "📱" },
    { id: "sessions", label: lang === "tr" ? "Oturumlar" : "Sessions", icon: "🔑" },
    { id: "logs", label: lang === "tr" ? "Geçmiş" : "Logs", icon: "📋" },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <span className="text-xl">🛡️</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {lang === "tr" ? "Güvenlik Ayarları" : "Security Settings"}
              </h2>
              <p className="text-sm text-slate-400">
                {lang === "tr" ? "Hesabınızı koruyun" : "Protect your account"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-2 border-b border-slate-800 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-2 border-slate-600 border-t-emerald-500 rounded-full" />
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === "overview" && status && (
                <div className="space-y-6">
                  {/* Security Score */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">
                        {lang === "tr" ? "Güvenlik Skoru" : "Security Score"}
                      </h3>
                      <div className={`text-3xl font-bold ${getScoreColor(status.securityScore)}`}>
                        {status.securityScore}/100
                      </div>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-3 mb-2">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${
                          status.securityScore >= 80
                            ? "bg-emerald-500"
                            : status.securityScore >= 50
                            ? "bg-amber-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${status.securityScore}%` }}
                      />
                    </div>
                    <p className={`text-sm ${getScoreColor(status.securityScore)}`}>
                      {getScoreLabel(status.securityScore)}
                    </p>
                  </div>

                  {/* Quick Status Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* 2FA Status */}
                    <div 
                      className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 cursor-pointer hover:border-slate-600 transition-colors"
                      onClick={() => setActiveTab("2fa")}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">🔐</span>
                        <span className="text-sm text-slate-400">2FA</span>
                      </div>
                      <div className={`text-lg font-semibold ${status.twoFactorEnabled ? "text-emerald-400" : "text-red-400"}`}>
                        {status.twoFactorEnabled 
                          ? (lang === "tr" ? "Aktif" : "Active") 
                          : (lang === "tr" ? "Kapalı" : "Disabled")}
                      </div>
                      {status.twoFactorEnabled && status.backupCodesRemaining !== undefined && (
                        <p className="text-xs text-slate-500 mt-1">
                          {status.backupCodesRemaining} {lang === "tr" ? "yedek kod" : "backup codes"}
                        </p>
                      )}
                    </div>

                    {/* Biometric Status */}
                    <div 
                      className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 cursor-pointer hover:border-slate-600 transition-colors"
                      onClick={() => setActiveTab("biometric")}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">👆</span>
                        <span className="text-sm text-slate-400">
                          {lang === "tr" ? "Biyometrik" : "Biometric"}
                        </span>
                      </div>
                      <div className={`text-lg font-semibold ${status.biometricEnabled ? "text-emerald-400" : "text-slate-400"}`}>
                        {status.biometricEnabled 
                          ? (lang === "tr" ? "Aktif" : "Active") 
                          : (lang === "tr" ? "Kapalı" : "Disabled")}
                      </div>
                    </div>

                    {/* Devices */}
                    <div 
                      className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 cursor-pointer hover:border-slate-600 transition-colors"
                      onClick={() => setActiveTab("devices")}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">📱</span>
                        <span className="text-sm text-slate-400">
                          {lang === "tr" ? "Cihazlar" : "Devices"}
                        </span>
                      </div>
                      <div className="text-lg font-semibold text-white">
                        {status.trustedDevices}
                      </div>
                      <p className="text-xs text-slate-500">
                        {lang === "tr" ? "güvenilir" : "trusted"}
                      </p>
                    </div>

                    {/* Sessions */}
                    <div 
                      className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 cursor-pointer hover:border-slate-600 transition-colors"
                      onClick={() => setActiveTab("sessions")}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">🔑</span>
                        <span className="text-sm text-slate-400">
                          {lang === "tr" ? "Oturumlar" : "Sessions"}
                        </span>
                      </div>
                      <div className="text-lg font-semibold text-white">
                        {status.activeSessions}
                      </div>
                      <p className="text-xs text-slate-500">
                        {lang === "tr" ? "aktif" : "active"}
                      </p>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                    <h3 className="text-lg font-semibold text-white mb-4">
                      {lang === "tr" ? "Öneriler" : "Recommendations"}
                    </h3>
                    <div className="space-y-3">
                      {!status.twoFactorEnabled && (
                        <div className="flex items-start gap-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                          <span className="text-amber-500">⚠️</span>
                          <div>
                            <p className="text-sm text-amber-400 font-medium">
                              {lang === "tr" ? "2FA'yı Aktifleştirin" : "Enable 2FA"}
                            </p>
                            <p className="text-xs text-slate-400">
                              {lang === "tr" 
                                ? "Hesabınızı ekstra güvenlik katmanıyla koruyun" 
                                : "Protect your account with an extra layer of security"}
                            </p>
                          </div>
                        </div>
                      )}
                      {!status.biometricEnabled && (
                        <div className="flex items-start gap-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                          <span className="text-blue-500">💡</span>
                          <div>
                            <p className="text-sm text-blue-400 font-medium">
                              {lang === "tr" ? "Biyometrik Ekleyin" : "Add Biometric"}
                            </p>
                            <p className="text-xs text-slate-400">
                              {lang === "tr" 
                                ? "Touch ID veya Face ID ile hızlı ve güvenli giriş" 
                                : "Quick and secure login with Touch ID or Face ID"}
                            </p>
                          </div>
                        </div>
                      )}
                      {status.securityScore >= 80 && (
                        <div className="flex items-start gap-3 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                          <span className="text-emerald-500">✅</span>
                          <div>
                            <p className="text-sm text-emerald-400 font-medium">
                              {lang === "tr" ? "Harika!" : "Great!"}
                            </p>
                            <p className="text-xs text-slate-400">
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
