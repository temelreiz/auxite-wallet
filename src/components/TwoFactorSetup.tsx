"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";

interface TwoFactorSetupProps {
  walletAddress?: string;
  lang?: "tr" | "en" | "de" | "fr" | "ar" | "ru";
  onClose?: () => void;
}

type Step = "status" | "setup" | "verify" | "success" | "disable";

export function TwoFactorSetup({ lang = "tr", onClose, walletAddress }: TwoFactorSetupProps) {
  const address = walletAddress;
  const [step, setStep] = useState<Step>("status");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // 2FA Status
  const [isEnabled, setIsEnabled] = useState(false);
  const [backupCodesRemaining, setBackupCodesRemaining] = useState(0);
  
  // Setup data
  const [secret, setSecret] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const t = {
    title: lang === "tr" ? "İki Faktörlü Doğrulama (2FA)" : "Two-Factor Authentication (2FA)",
    subtitle: lang === "tr" 
      ? "Hesabınızı ekstra güvenlik katmanıyla koruyun" 
      : "Protect your account with an extra layer of security",
    enabled: lang === "tr" ? "2FA Aktif" : "2FA Enabled",
    disabled: lang === "tr" ? "2FA Devre Dışı" : "2FA Disabled",
    enable: lang === "tr" ? "2FA Aktifleştir" : "Enable 2FA",
    disable: lang === "tr" ? "2FA Devre Dışı Bırak" : "Disable 2FA",
    setupTitle: lang === "tr" ? "2FA Kurulumu" : "2FA Setup",
    step1: lang === "tr" 
      ? "1. Google Authenticator veya benzer bir uygulama indirin" 
      : "1. Download Google Authenticator or similar app",
    step2: lang === "tr" 
      ? "2. Aşağıdaki QR kodu tarayın veya kodu manuel girin" 
      : "2. Scan the QR code below or enter the code manually",
    step3: lang === "tr" 
      ? "3. Uygulamadan 6 haneli kodu girin" 
      : "3. Enter the 6-digit code from the app",
    secretKey: lang === "tr" ? "Gizli Anahtar" : "Secret Key",
    verificationCode: lang === "tr" ? "Doğrulama Kodu" : "Verification Code",
    verify: lang === "tr" ? "Doğrula ve Aktifleştir" : "Verify & Enable",
    backupCodesTitle: lang === "tr" ? "Backup Kodları" : "Backup Codes",
    backupCodesWarning: lang === "tr" 
      ? "Bu kodları güvenli bir yere kaydedin! Telefonunuzu kaybederseniz bunlarla giriş yapabilirsiniz." 
      : "Save these codes securely! You can use them to log in if you lose your phone.",
    backupCodesRemaining: lang === "tr" ? "Kalan backup kodu" : "Backup codes remaining",
    regenerateBackup: lang === "tr" ? "Yeni Kodlar Oluştur" : "Regenerate Codes",
    close: lang === "tr" ? "Kapat" : "Close",
    cancel: lang === "tr" ? "İptal" : "Cancel",
    copied: lang === "tr" ? "Kopyalandı!" : "Copied!",
    enterCodeToDisable: lang === "tr" 
      ? "2FA'yı devre dışı bırakmak için doğrulama kodunu girin" 
      : "Enter verification code to disable 2FA",
    success: lang === "tr" ? "2FA başarıyla aktifleştirildi!" : "2FA successfully enabled!",
    disableSuccess: lang === "tr" ? "2FA devre dışı bırakıldı" : "2FA disabled",
  };

  // Fetch 2FA status
  useEffect(() => {
    if (!address) return;
    
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/security/2fa?address=${address}`);
        const data = await res.json();
        
        setIsEnabled(data.enabled);
        setBackupCodesRemaining(data.backupCodesRemaining || 0);
        setLoading(false);
      } catch (err) {
        console.error("2FA status error:", err);
        setLoading(false);
      }
    };
    
    fetchStatus();
  }, [address]);

  // Start 2FA setup
  const handleSetup = async () => {
    setError("");
    setLoading(true);
    
    try {
      const res = await fetch("/api/security/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup", address }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Setup failed");
      }
      
      setSecret(data.secret);
      setQrCodeUrl(data.qrCodeUrl);
      setStep("setup");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setLoading(false);
    }
  };

  // Verify and enable 2FA
  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      setError(lang === "tr" ? "6 haneli kod girin" : "Enter 6-digit code");
      return;
    }
    
    setError("");
    setLoading(true);
    
    try {
      const res = await fetch("/api/security/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "enable", 
          address, 
          code: verificationCode 
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Verification failed");
      }
      
      setBackupCodes(data.backupCodes);
      setIsEnabled(true);
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  // Disable 2FA
  const handleDisable = async () => {
    if (verificationCode.length < 6) {
      setError(lang === "tr" ? "Doğrulama kodu girin" : "Enter verification code");
      return;
    }
    
    setError("");
    setLoading(true);
    
    try {
      const res = await fetch("/api/security/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "disable", 
          address, 
          code: verificationCode 
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Disable failed");
      }
      
      setIsEnabled(false);
      setStep("status");
      setVerificationCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disable failed");
    } finally {
      setLoading(false);
    }
  };

  // Regenerate backup codes
  const handleRegenerateBackup = async () => {
    if (verificationCode.length !== 6) {
      setError(lang === "tr" ? "6 haneli kod girin" : "Enter 6-digit code");
      return;
    }
    
    setError("");
    setLoading(true);
    
    try {
      const res = await fetch("/api/security/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "regenerate-backup", 
          address, 
          code: verificationCode 
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Regenerate failed");
      }
      
      setBackupCodes(data.backupCodes);
      setBackupCodesRemaining(10);
      setVerificationCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regenerate failed");
    } finally {
      setLoading(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!address) {
    return (
      <div className="p-6 text-center text-slate-400">
        {lang === "tr" ? "Cüzdan bağlantısı gerekli" : "Wallet connection required"}
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            🔐 {t.title}
          </h3>
          <p className="text-sm text-slate-400 mt-1">{t.subtitle}</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            ✕
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && step === "status" && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-8 h-8 border-2 border-slate-600 border-t-emerald-500 rounded-full"></div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Status View */}
      {step === "status" && !loading && (
        <div className="space-y-4">
          <div className={`p-4 rounded-xl border ${
            isEnabled 
              ? "bg-emerald-500/10 border-emerald-500/30" 
              : "bg-slate-800 border-slate-700"
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isEnabled ? "bg-emerald-500/20" : "bg-slate-700"
                }`}>
                  {isEnabled ? "✅" : "🔓"}
                </div>
                <div>
                  <p className={`font-medium ${isEnabled ? "text-emerald-400" : "text-slate-300"}`}>
                    {isEnabled ? t.enabled : t.disabled}
                  </p>
                  {isEnabled && (
                    <p className="text-xs text-slate-400">
                      {t.backupCodesRemaining}: {backupCodesRemaining}
                    </p>
                  )}
                </div>
              </div>
              
              {isEnabled ? (
                <button
                  onClick={() => setStep("disable")}
                  className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 text-sm font-medium"
                >
                  {t.disable}
                </button>
              ) : (
                <button
                  onClick={handleSetup}
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 text-sm font-medium disabled:opacity-50"
                >
                  {t.enable}
                </button>
              )}
            </div>
          </div>

          {/* Regenerate backup codes */}
          {isEnabled && backupCodesRemaining < 5 && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <p className="text-amber-400 text-sm mb-3">
                ⚠️ {lang === "tr" 
                  ? "Backup kodlarınız azaldı. Yeni kodlar oluşturun." 
                  : "Your backup codes are running low. Generate new codes."}
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-center font-mono"
                />
                <button
                  onClick={handleRegenerateBackup}
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 text-sm font-medium disabled:opacity-50"
                >
                  {t.regenerateBackup}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Setup View */}
      {step === "setup" && (
        <div className="space-y-6">
          <div className="text-sm text-slate-400 space-y-2">
            <p>{t.step1}</p>
            <p>{t.step2}</p>
            <p>{t.step3}</p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            <div className="p-4 bg-white rounded-xl">
              <QRCodeSVG value={qrCodeUrl} size={200} />
            </div>
          </div>

          {/* Secret Key */}
          <div className="p-4 bg-slate-800 rounded-xl">
            <p className="text-xs text-slate-400 mb-2">{t.secretKey}</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-emerald-400 font-mono text-sm break-all">
                {secret}
              </code>
              <button
                onClick={() => copyToClipboard(secret)}
                className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white"
              >
                📋
              </button>
            </div>
          </div>

          {/* Verification Input */}
          <div>
            <label className="text-sm text-slate-400 block mb-2">{t.verificationCode}</label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-center text-2xl font-mono tracking-widest focus:outline-none focus:border-emerald-500"
              maxLength={6}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setStep("status");
                setVerificationCode("");
                setError("");
              }}
              className="flex-1 py-3 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600"
            >
              {t.cancel}
            </button>
            <button
              onClick={handleVerify}
              disabled={loading || verificationCode.length !== 6}
              className="flex-1 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? "..." : t.verify}
            </button>
          </div>
        </div>
      )}

      {/* Success View - Show Backup Codes */}
      {step === "success" && (
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-5xl mb-4">✅</div>
            <h4 className="text-xl font-semibold text-emerald-400">{t.success}</h4>
          </div>

          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <p className="text-amber-400 text-sm font-medium mb-2">⚠️ {t.backupCodesTitle}</p>
            <p className="text-slate-400 text-xs mb-4">{t.backupCodesWarning}</p>
            
            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((code, i) => (
                <div key={i} className="px-3 py-2 bg-slate-800 rounded-lg text-center font-mono text-sm text-white">
                  {code}
                </div>
              ))}
            </div>

            <button
              onClick={() => copyToClipboard(backupCodes.join("\n"))}
              className="w-full mt-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 text-sm"
            >
              📋 {lang === "tr" ? "Tümünü Kopyala" : "Copy All"}
            </button>
          </div>

          <button
            onClick={() => {
              setStep("status");
              setBackupCodes([]);
              setVerificationCode("");
            }}
            className="w-full py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 font-medium"
          >
            {t.close}
          </button>
        </div>
      )}

      {/* Disable View */}
      {step === "disable" && (
        <div className="space-y-4">
          <p className="text-slate-400 text-sm">{t.enterCodeToDisable}</p>
          
          <input
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder="000000"
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-center text-2xl font-mono tracking-widest focus:outline-none focus:border-red-500"
          />
          
          <p className="text-xs text-slate-500 text-center">
            {lang === "tr" 
              ? "6 haneli kod veya backup kodu girin" 
              : "Enter 6-digit code or backup code"}
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setStep("status");
                setVerificationCode("");
                setError("");
              }}
              className="flex-1 py-3 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600"
            >
              {t.cancel}
            </button>
            <button
              onClick={handleDisable}
              disabled={loading || verificationCode.length < 6}
              className="flex-1 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? "..." : t.disable}
            </button>
          </div>
        </div>
      )}

      {/* Show new backup codes if regenerated */}
      {backupCodes.length > 0 && step === "status" && (
        <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
          <p className="text-emerald-400 text-sm font-medium mb-2">✅ {t.backupCodesTitle}</p>
          <div className="grid grid-cols-2 gap-2">
            {backupCodes.map((code, i) => (
              <div key={i} className="px-3 py-2 bg-slate-800 rounded-lg text-center font-mono text-sm text-white">
                {code}
              </div>
            ))}
          </div>
          <button
            onClick={() => setBackupCodes([])}
            className="w-full mt-3 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 text-sm"
          >
            {t.close}
          </button>
        </div>
      )}
    </div>
  );
}

export default TwoFactorSetup;
