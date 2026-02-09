"use client";

import { useState, useEffect, useRef } from "react";

interface TwoFactorVerifyProps {
  walletAddress: string;
  lang?: "tr" | "en" | "de" | "fr" | "ar" | "ru" | "de" | "fr" | "ar" | "ru";
  title?: string;
  description?: string;
  onVerified: (verificationToken: string) => void;
  onCancel: () => void;
  allowBiometric?: boolean;
}

export function TwoFactorVerify({
  walletAddress,
  lang = "en",
  title,
  description,
  onVerified,
  onCancel,
  allowBiometric = true,
}: TwoFactorVerifyProps) {
  const [code, setCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [hasBiometric, setHasBiometric] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    if (allowBiometric) {
      checkBiometric();
    }
  }, []);

  const checkBiometric = async () => {
    try {
      const res = await fetch("/api/security/biometric", {
        headers: { "x-wallet-address": walletAddress },
      });
      const data = await res.json();
      setHasBiometric(data.enabled);
    } catch {
      setHasBiometric(false);
    }
  };

  const verify = async () => {
    const cleanCode = code.replace(/\s/g, "");
    
    if (useBackupCode) {
      if (cleanCode.length !== 8) {
        setError(lang === "tr" ? "8 haneli backup kodu girin" : "Enter 8-digit backup code");
        return;
      }
    } else {
      if (cleanCode.length !== 6) {
        setError(lang === "tr" ? "6 haneli kod girin" : "Enter 6-digit code");
        return;
      }
    }

    try {
      setProcessing(true);
      setError(null);

      const res = await fetch("/api/security/2fa/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({ 
          code: cleanCode,
          isBackupCode: useBackupCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.locked) {
          setError(
            lang === "tr" 
              ? "Çok fazla başarısız deneme. 15 dakika sonra tekrar deneyin."
              : "Too many failed attempts. Try again in 15 minutes."
          );
        } else {
          setError(data.error);
          if (data.remainingAttempts !== undefined) {
            setRemainingAttempts(data.remainingAttempts);
          }
        }
        return;
      }

      onVerified(data.verificationToken);
    } catch (err: any) {
      setError(err.message || (lang === "tr" ? "Bir hata oluştu" : "An error occurred"));
    } finally {
      setProcessing(false);
    }
  };

  const verifyWithBiometric = async () => {
    try {
      setProcessing(true);
      setError(null);

      // WebAuthn import
      const { startAuthentication } = await import("@simplewebauthn/browser");

      // Auth options al
      const optionsRes = await fetch("/api/security/biometric", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({ action: "auth-options" }),
      });

      const optionsData = await optionsRes.json();
      if (!optionsRes.ok) throw new Error(optionsData.error);

      // Biometric prompt
      const credential = await startAuthentication(optionsData.options);

      // Verify
      const verifyRes = await fetch("/api/security/biometric", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({ 
          action: "auth-verify",
          response: credential,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error);

      onVerified(verifyData.verificationToken);
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setError(lang === "tr" ? "İşlem iptal edildi" : "Operation cancelled");
      } else {
        setError(err.message);
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      verify();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <span className="text-xl">🔐</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {title || (lang === "tr" ? "Doğrulama Gerekli" : "Verification Required")}
              </h2>
              <p className="text-sm text-slate-400">
                {description || (lang === "tr" ? "İşlemi onaylamak için doğrulayın" : "Verify to confirm this action")}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Biometric Option */}
          {hasBiometric && allowBiometric && (
            <>
              <button
                onClick={verifyWithBiometric}
                disabled={processing}
                className="w-full py-4 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-colors font-medium flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <span className="text-2xl">👆</span>
                {processing 
                  ? (lang === "tr" ? "Bekleniyor..." : "Waiting...")
                  : (lang === "tr" ? "Biyometrik ile Doğrula" : "Verify with Biometric")}
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-700" />
                <span className="text-xs text-slate-500">
                  {lang === "tr" ? "veya" : "or"}
                </span>
                <div className="flex-1 h-px bg-slate-700" />
              </div>
            </>
          )}

          {/* Code Input */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              {useBackupCode 
                ? (lang === "tr" ? "Backup Kodu" : "Backup Code")
                : (lang === "tr" ? "Doğrulama Kodu" : "Verification Code")}
            </label>
            <input
              ref={inputRef}
              type="text"
              value={code}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                setCode(val.slice(0, useBackupCode ? 8 : 6));
              }}
              onKeyDown={handleKeyDown}
              placeholder={useBackupCode ? "00000000" : "000000"}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-center text-2xl font-mono text-white placeholder-slate-600 focus:outline-none focus:border-[#2F6F62]"
              maxLength={useBackupCode ? 8 : 6}
              disabled={processing}
            />
          </div>

          {/* Toggle Backup Code */}
          <button
            onClick={() => {
              setUseBackupCode(!useBackupCode);
              setCode("");
              setError(null);
            }}
            className="text-sm text-slate-400 hover:text-slate-300"
          >
            {useBackupCode 
              ? (lang === "tr" ? "← Authenticator kodu kullan" : "← Use authenticator code")
              : (lang === "tr" ? "Backup kodu kullan →" : "Use backup code →")}
          </button>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
              {error}
              {remainingAttempts !== null && (
                <p className="mt-1 text-xs">
                  {lang === "tr" ? `Kalan deneme: ${remainingAttempts}` : `Remaining attempts: ${remainingAttempts}`}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 flex gap-3">
          <button
            onClick={onCancel}
            disabled={processing}
            className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors font-medium disabled:opacity-50"
          >
            {lang === "tr" ? "İptal" : "Cancel"}
          </button>
          <button
            onClick={verify}
            disabled={
              processing || 
              (useBackupCode ? code.length !== 8 : code.length !== 6)
            }
            className="flex-1 py-3 rounded-xl bg-[#2F6F62] text-white hover:bg-[#2F6F62] transition-colors font-medium disabled:opacity-50"
          >
            {processing 
              ? (lang === "tr" ? "Doğrulanıyor..." : "Verifying...")
              : (lang === "tr" ? "Doğrula" : "Verify")}
          </button>
        </div>
      </div>
    </div>
  );
}
