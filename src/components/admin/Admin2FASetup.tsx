// src/components/admin/Admin2FASetup.tsx
// Admin 2FA Setup Component

"use client";

import { useState, useEffect } from "react";
import { Shield, Key, AlertTriangle, Check, Copy, Eye, EyeOff, Loader2 } from "lucide-react";

interface Admin2FASetupProps {
  onClose?: () => void;
}

export default function Admin2FASetup({ onClose }: Admin2FASetupProps) {
  const [step, setStep] = useState<"status" | "setup" | "verify" | "complete" | "disable">("status");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);

  // Setup state
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [secret, setSecret] = useState("");
  const [otpauthUrl, setOtpauthUrl] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);

  // Check 2FA status on mount
  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const res = await fetch("/api/admin/2fa");
      const data = await res.json();
      setIs2FAEnabled(data.enabled);
    } catch (err) {
      console.error("Status check failed:", err);
    }
  };

  const handleSetup = async () => {
    if (!password) {
      setError("Şifre gerekli");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup", password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Kurulum başarısız");
        return;
      }

      setSecret(data.secret);
      setOtpauthUrl(data.otpauthUrl);
      setStep("setup");
    } catch (err) {
      setError("Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (verifyCode.length !== 6) {
      setError("6 haneli kod girin");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", code: verifyCode, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Doğrulama başarısız");
        return;
      }

      setBackupCodes(data.backupCodes);
      setStep("complete");
      setIs2FAEnabled(true);
    } catch (err) {
      setError("Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (verifyCode.length !== 6) {
      setError("6 haneli kod girin");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disable", code: verifyCode, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Devre dışı bırakma başarısız");
        return;
      }

      setIs2FAEnabled(false);
      setStep("status");
      setVerifyCode("");
    } catch (err) {
      setError("Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: "secret" | "backup") => {
    navigator.clipboard.writeText(text);
    if (type === "secret") {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } else {
      setCopiedBackup(true);
      setTimeout(() => setCopiedBackup(false), 2000);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
          <Shield className="w-6 h-6 text-yellow-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Admin 2FA</h2>
          <p className="text-sm text-gray-400">
            {is2FAEnabled ? "2FA Etkin" : "2FA Devre Dışı"}
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* STATUS STEP */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {step === "status" && (
        <div className="space-y-4">
          <div className={`p-4 rounded-xl ${is2FAEnabled ? "bg-green-500/10 border border-green-500/30" : "bg-orange-500/10 border border-orange-500/30"}`}>
            <p className={`text-sm ${is2FAEnabled ? "text-green-400" : "text-orange-400"}`}>
              {is2FAEnabled
                ? "✅ 2FA admin paneli için etkin durumda"
                : "⚠️ 2FA etkin değil - Güvenlik riski!"}
            </p>
          </div>

          {/* Password input */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Admin Şifresi</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-900/50 border border-gray-600 rounded-xl py-3 px-4 pr-10 text-white"
                placeholder="••••••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            {!is2FAEnabled ? (
              <button
                onClick={handleSetup}
                disabled={loading || !password}
                className="flex-1 bg-yellow-500 text-black font-semibold py-3 rounded-xl hover:bg-yellow-400 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
                2FA Etkinleştir
              </button>
            ) : (
              <button
                onClick={() => setStep("disable")}
                disabled={!password}
                className="flex-1 bg-red-500/20 text-red-400 border border-red-500/30 font-semibold py-3 rounded-xl hover:bg-red-500/30 disabled:opacity-50"
              >
                2FA Devre Dışı Bırak
              </button>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* SETUP STEP */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {step === "setup" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Authenticator uygulamanızda (Google Authenticator, Authy vb.) aşağıdaki kodu ekleyin:
          </p>

          {/* Secret key */}
          <div className="bg-gray-900/50 border border-gray-600 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Secret Key</p>
            <div className="flex items-center gap-2">
              <code className="text-yellow-400 font-mono text-sm flex-1 break-all">{secret}</code>
              <button
                onClick={() => copyToClipboard(secret, "secret")}
                className="p-2 hover:bg-gray-700 rounded-lg"
              >
                {copiedSecret ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
              </button>
            </div>
          </div>

          {/* QR Code placeholder */}
          <div className="bg-white rounded-xl p-4 text-center">
            <p className="text-gray-800 text-sm mb-2">QR Kod:</p>
            <div className="bg-gray-100 p-4 rounded-lg">
              <code className="text-xs text-gray-600 break-all">{otpauthUrl}</code>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              (QR kod için bu URL'i kullanabilirsiniz)
            </p>
          </div>

          {/* Verify code input */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Doğrulama Kodu</label>
            <input
              type="text"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full bg-gray-900/50 border border-gray-600 rounded-xl py-3 px-4 text-white text-center text-xl tracking-widest font-mono"
              placeholder="000000"
              maxLength={6}
            />
          </div>

          <button
            onClick={handleVerify}
            disabled={loading || verifyCode.length !== 6}
            className="w-full bg-yellow-500 text-black font-semibold py-3 rounded-xl hover:bg-yellow-400 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
            Doğrula ve Etkinleştir
          </button>

          <button
            onClick={() => setStep("status")}
            className="w-full text-gray-400 py-2 hover:text-white"
          >
            İptal
          </button>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* COMPLETE STEP */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {step === "complete" && (
        <div className="space-y-4">
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
            <Check className="w-12 h-12 text-green-400 mx-auto mb-2" />
            <p className="text-green-400 font-medium">2FA Başarıyla Etkinleştirildi!</p>
          </div>

          {/* Backup codes */}
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-5 h-5 text-orange-400" />
              <p className="text-orange-400 font-medium">Yedek Kodlar</p>
            </div>
            <p className="text-xs text-orange-300/70 mb-3">
              Bu kodları güvenli bir yere kaydedin. Her kod sadece bir kez kullanılabilir.
            </p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {backupCodes.map((code, i) => (
                <code key={i} className="bg-gray-900/50 px-3 py-2 rounded-lg text-sm text-white font-mono text-center">
                  {code}
                </code>
              ))}
            </div>
            <button
              onClick={() => copyToClipboard(backupCodes.join("\n"), "backup")}
              className="w-full bg-gray-700 text-white py-2 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-gray-600"
            >
              {copiedBackup ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedBackup ? "Kopyalandı!" : "Tümünü Kopyala"}
            </button>
          </div>

          <button
            onClick={() => {
              setStep("status");
              onClose?.();
            }}
            className="w-full bg-yellow-500 text-black font-semibold py-3 rounded-xl hover:bg-yellow-400"
          >
            Tamam
          </button>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* DISABLE STEP */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {step === "disable" && (
        <div className="space-y-4">
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p className="text-red-400 text-sm">
              ⚠️ 2FA'yı devre dışı bırakmak güvenlik riskidir. Emin misiniz?
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">2FA Kodu veya Yedek Kod</label>
            <input
              type="text"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/[^0-9A-Za-z]/g, "").slice(0, 8))}
              className="w-full bg-gray-900/50 border border-gray-600 rounded-xl py-3 px-4 text-white text-center text-xl tracking-widest font-mono"
              placeholder="000000"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setStep("status");
                setVerifyCode("");
              }}
              className="flex-1 bg-gray-700 text-white py-3 rounded-xl hover:bg-gray-600"
            >
              İptal
            </button>
            <button
              onClick={handleDisable}
              disabled={loading || verifyCode.length < 6}
              className="flex-1 bg-red-500 text-white font-semibold py-3 rounded-xl hover:bg-red-400 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              Devre Dışı Bırak
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
