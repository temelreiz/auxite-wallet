"use client";

import { useState, useEffect } from "react";

interface TwoFactorSetupProps {
  walletAddress: string;
  lang?: "tr" | "en" | "de" | "fr" | "ar" | "ru" | "de" | "fr" | "ar" | "ru";
  onStatusChange?: () => void;
}

interface TwoFAStatus {
  enabled: boolean;
  enabledAt?: string;
  backupCodesRemaining?: number;
}

export function TwoFactorSetup({ 
  walletAddress, 
  lang = "en",
  onStatusChange 
}: TwoFactorSetupProps) {
  const [status, setStatus] = useState<TwoFAStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"status" | "setup" | "verify" | "backup" | "disable">("status");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verifyCode, setVerifyCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, [walletAddress]);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/security/2fa/status", {
        headers: { "x-wallet-address": walletAddress },
      });
      const data = await res.json();
      setStatus(data);
      setStep("status");
    } catch (err) {
      console.error("2FA status error:", err);
    } finally {
      setLoading(false);
    }
  };

  const startSetup = async () => {
    try {
      setProcessing(true);
      setError(null);
      
      const res = await fetch("/api/security/2fa/setup", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Kurulum başlatılamadı");
      }

      setQrCode(data.qrCodeDataUrl);
      setBackupCodes(data.backupCodes);
      setStep("setup");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const verifyAndEnable = async () => {
    if (verifyCode.length !== 6) {
      setError(lang === "tr" ? "6 haneli kod girin" : "Enter 6-digit code");
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      const res = await fetch("/api/security/2fa/enable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({ code: verifyCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Doğrulama başarısız");
      }

      setStep("backup");
      onStatusChange?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const disable2FA = async () => {
    if (verifyCode.length !== 6) {
      setError(lang === "tr" ? "6 haneli kod girin" : "Enter 6-digit code");
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      const res = await fetch("/api/security/2fa/disable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({ code: verifyCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "İşlem başarısız");
      }

      await fetchStatus();
      setVerifyCode("");
      onStatusChange?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopiedBackup(true);
    setTimeout(() => setCopiedBackup(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-slate-600 border-t-[#BFA181] rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status View */}
      {step === "status" && (
        <>
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  status?.enabled ? "bg-[#2F6F62]/20" : "bg-slate-700"
                }`}>
                  <span className="text-2xl">🔐</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {lang === "tr" ? "İki Faktörlü Doğrulama" : "Two-Factor Authentication"}
                  </h3>
                  <p className={`text-sm ${status?.enabled ? "text-[#2F6F62]" : "text-slate-400"}`}>
                    {status?.enabled 
                      ? (lang === "tr" ? "Aktif" : "Enabled")
                      : (lang === "tr" ? "Kapalı" : "Disabled")}
                  </p>
                </div>
              </div>
              
              {status?.enabled ? (
                <button
                  onClick={() => setStep("disable")}
                  className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-sm font-medium"
                >
                  {lang === "tr" ? "Kapat" : "Disable"}
                </button>
              ) : (
                <button
                  onClick={startSetup}
                  disabled={processing}
                  className="px-4 py-2 rounded-lg bg-[#2F6F62] text-white hover:bg-[#2F6F62] transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {processing 
                    ? (lang === "tr" ? "Yükleniyor..." : "Loading...")
                    : (lang === "tr" ? "Aktifleştir" : "Enable")}
                </button>
              )}
            </div>

            {status?.enabled && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">
                    {lang === "tr" ? "Kalan yedek kod" : "Backup codes remaining"}
                  </span>
                  <span className={`font-medium ${
                    (status.backupCodesRemaining || 0) <= 2 ? "text-[#BFA181]" : "text-slate-300"
                  }`}>
                    {status.backupCodesRemaining || 0}
                  </span>
                </div>
                {status.enabledAt && (
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-slate-400">
                      {lang === "tr" ? "Aktifleştirilme" : "Enabled at"}
                    </span>
                    <span className="text-slate-300">
                      {new Date(status.enabledAt).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US")}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
            <div className="flex gap-3">
              <span className="text-blue-400">ℹ️</span>
              <div>
                <p className="text-sm text-blue-400 font-medium mb-1">
                  {lang === "tr" ? "2FA Nedir?" : "What is 2FA?"}
                </p>
                <p className="text-xs text-slate-400">
                  {lang === "tr" 
                    ? "İki faktörlü doğrulama, hesabınıza giriş yaparken şifrenize ek olarak telefonunuzdaki bir uygulamadan kod girmenizi gerektirir. Bu, hesabınızı çok daha güvenli hale getirir."
                    : "Two-factor authentication requires you to enter a code from an app on your phone in addition to your password when logging in. This makes your account much more secure."}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Setup View - QR Code */}
      {step === "setup" && qrCode && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-white mb-2">
              {lang === "tr" ? "QR Kodu Tarayın" : "Scan QR Code"}
            </h3>
            <p className="text-sm text-slate-400">
              {lang === "tr" 
                ? "Google Authenticator veya Authy uygulamasıyla tarayın"
                : "Scan with Google Authenticator or Authy app"}
            </p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-xl">
              <img src={qrCode} alt="QR Code" className="w-48 h-48" />
            </div>
          </div>

          {/* Verify Code Input */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              {lang === "tr" ? "Doğrulama Kodu" : "Verification Code"}
            </label>
            <input
              type="text"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-center text-2xl font-mono text-white placeholder-slate-600 focus:outline-none focus:border-[#2F6F62]"
              maxLength={6}
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setStep("status");
                setQrCode(null);
                setVerifyCode("");
                setError(null);
              }}
              className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors font-medium"
            >
              {lang === "tr" ? "İptal" : "Cancel"}
            </button>
            <button
              onClick={verifyAndEnable}
              disabled={verifyCode.length !== 6 || processing}
              className="flex-1 py-3 rounded-xl bg-[#2F6F62] text-white hover:bg-[#2F6F62] transition-colors font-medium disabled:opacity-50"
            >
              {processing 
                ? (lang === "tr" ? "Doğrulanıyor..." : "Verifying...")
                : (lang === "tr" ? "Doğrula ve Aktifleştir" : "Verify & Enable")}
            </button>
          </div>
        </div>
      )}

      {/* Backup Codes View */}
      {step === "backup" && (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-[#2F6F62]/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✅</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {lang === "tr" ? "2FA Aktifleştirildi!" : "2FA Enabled!"}
            </h3>
            <p className="text-sm text-slate-400">
              {lang === "tr" 
                ? "Yedek kodlarınızı güvenli bir yere kaydedin"
                : "Save your backup codes in a safe place"}
            </p>
          </div>

          {/* Backup Codes */}
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-400">
                {lang === "tr" ? "Yedek Kodlar" : "Backup Codes"}
              </span>
              <button
                onClick={copyBackupCodes}
                className="text-xs text-[#2F6F62] hover:text-[#BFA181]"
              >
                {copiedBackup 
                  ? (lang === "tr" ? "✓ Kopyalandı" : "✓ Copied")
                  : (lang === "tr" ? "Kopyala" : "Copy")}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((code, i) => (
                <div key={i} className="font-mono text-sm text-slate-300 bg-slate-900 rounded px-3 py-2 text-center">
                  {code}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#BFA181]/10 border border-[#BFA181]/20 rounded-lg p-3">
            <div className="flex gap-2">
              <span className="text-[#BFA181]">⚠️</span>
              <p className="text-xs text-[#BFA181]">
                {lang === "tr" 
                  ? "Bu kodları bir daha göremeyeceksiniz. Güvenli bir yere kaydedin!"
                  : "You won't see these codes again. Save them somewhere safe!"}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setStep("status");
              fetchStatus();
            }}
            className="w-full py-3 rounded-xl bg-[#2F6F62] text-white hover:bg-[#2F6F62] transition-colors font-medium"
          >
            {lang === "tr" ? "Tamamla" : "Done"}
          </button>
        </div>
      )}

      {/* Disable View */}
      {step === "disable" && (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🔓</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {lang === "tr" ? "2FA'yı Kapat" : "Disable 2FA"}
            </h3>
            <p className="text-sm text-slate-400">
              {lang === "tr" 
                ? "Doğrulama kodunuzu girerek 2FA'yı kapatın"
                : "Enter your verification code to disable 2FA"}
            </p>
          </div>

          {/* Verify Code Input */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              {lang === "tr" ? "Doğrulama Kodu" : "Verification Code"}
            </label>
            <input
              type="text"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-center text-2xl font-mono text-white placeholder-slate-600 focus:outline-none focus:border-red-500"
              maxLength={6}
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <div className="flex gap-2">
              <span className="text-red-500">⚠️</span>
              <p className="text-xs text-red-400">
                {lang === "tr" 
                  ? "2FA'yı kapatmak hesabınızın güvenliğini azaltır. Bu işlemi sadece gerekli durumlarda yapın."
                  : "Disabling 2FA reduces your account security. Only do this when necessary."}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setStep("status");
                setVerifyCode("");
                setError(null);
              }}
              className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors font-medium"
            >
              {lang === "tr" ? "İptal" : "Cancel"}
            </button>
            <button
              onClick={disable2FA}
              disabled={verifyCode.length !== 6 || processing}
              className="flex-1 py-3 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors font-medium disabled:opacity-50"
            >
              {processing 
                ? (lang === "tr" ? "İşleniyor..." : "Processing...")
                : (lang === "tr" ? "2FA'yı Kapat" : "Disable 2FA")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
