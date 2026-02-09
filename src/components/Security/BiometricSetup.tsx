"use client";

import { useState, useEffect } from "react";
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";

interface BiometricSetupProps {
  walletAddress: string;
  lang?: "tr" | "en" | "de" | "fr" | "ar" | "ru" | "de" | "fr" | "ar" | "ru";
  onStatusChange?: () => void;
}

interface Passkey {
  id: string;
  name: string;
  createdAt: string;
  lastUsed?: string;
  deviceType: string;
  backedUp: boolean;
}

export function BiometricSetup({ 
  walletAddress, 
  lang = "en",
  onStatusChange 
}: BiometricSetupProps) {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    checkSupport();
    fetchPasskeys();
  }, [walletAddress]);

  const checkSupport = async () => {
    if (!window.PublicKeyCredential) {
      setSupported(false);
      return;
    }
    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      setSupported(available);
    } catch {
      setSupported(false);
    }
  };

  const fetchPasskeys = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/security/biometric", {
        headers: { "x-wallet-address": walletAddress },
      });
      const data = await res.json();
      setPasskeys(data.passkeys || []);
    } catch (err) {
      console.error("Passkeys fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const registerPasskey = async () => {
    try {
      setProcessing(true);
      setError(null);
      setSuccess(null);

      // Registration options al
      const optionsRes = await fetch("/api/security/biometric", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({ action: "register-options" }),
      });

      const optionsData = await optionsRes.json();
      if (!optionsRes.ok) throw new Error(optionsData.error);

      // Biometric prompt göster
      const credential = await startRegistration(optionsData.options);

      // Verify
      const verifyRes = await fetch("/api/security/biometric", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({ 
          action: "register-verify",
          response: credential,
          name: `Passkey ${passkeys.length + 1}`,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error);

      setSuccess(lang === "tr" ? "Passkey başarıyla eklendi!" : "Passkey added successfully!");
      fetchPasskeys();
      onStatusChange?.();
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setError(lang === "tr" ? "İşlem iptal edildi" : "Operation cancelled");
      } else {
        setError(err.message || (lang === "tr" ? "Bir hata oluştu" : "An error occurred"));
      }
    } finally {
      setProcessing(false);
    }
  };

  const deletePasskey = async (id: string) => {
    if (!confirm(lang === "tr" ? "Bu passkey silinsin mi?" : "Delete this passkey?")) {
      return;
    }

    try {
      setProcessing(true);
      const res = await fetch(`/api/security/biometric?id=${id}`, {
        method: "DELETE",
        headers: { "x-wallet-address": walletAddress },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      fetchPasskeys();
      onStatusChange?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const renamePasskey = async (id: string) => {
    if (!editName.trim()) return;

    try {
      const res = await fetch("/api/security/biometric", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({ 
          action: "rename",
          passkeyId: id,
          newName: editName.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      setEditingId(null);
      setEditName("");
      fetchPasskeys();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const testPasskey = async () => {
    try {
      setProcessing(true);
      setError(null);

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

      setSuccess(lang === "tr" ? "Biyometrik doğrulama başarılı!" : "Biometric verification successful!");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-slate-600 border-t-[#BFA181] rounded-full" />
      </div>
    );
  }

  if (!supported) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6 text-center">
        <span className="text-4xl mb-4 block">🚫</span>
        <h3 className="text-lg font-semibold text-amber-400 mb-2">
          {lang === "tr" ? "Desteklenmiyor" : "Not Supported"}
        </h3>
        <p className="text-sm text-slate-400">
          {lang === "tr" 
            ? "Bu cihaz biyometrik doğrulamayı desteklemiyor. Lütfen Touch ID veya Face ID destekleyen bir cihaz kullanın."
            : "This device doesn't support biometric authentication. Please use a device with Touch ID or Face ID."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              passkeys.length > 0 ? "bg-[#2F6F62]/20" : "bg-slate-700"
            }`}>
              <span className="text-2xl">👆</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {lang === "tr" ? "Biyometrik Doğrulama" : "Biometric Authentication"}
              </h3>
              <p className={`text-sm ${passkeys.length > 0 ? "text-[#2F6F62]" : "text-slate-400"}`}>
                {passkeys.length > 0
                  ? `${passkeys.length} ${lang === "tr" ? "passkey kayıtlı" : "passkey(s) registered"}`
                  : (lang === "tr" ? "Kayıtlı passkey yok" : "No passkeys registered")}
              </p>
            </div>
          </div>
          
          <button
            onClick={registerPasskey}
            disabled={processing}
            className="px-4 py-2 rounded-lg bg-[#2F6F62] text-white hover:bg-[#2F6F62] transition-colors text-sm font-medium disabled:opacity-50"
          >
            {processing 
              ? (lang === "tr" ? "Bekleniyor..." : "Waiting...")
              : (lang === "tr" ? "+ Passkey Ekle" : "+ Add Passkey")}
          </button>
        </div>
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

      {/* Passkeys List */}
      {passkeys.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-slate-400">
              {lang === "tr" ? "Kayıtlı Passkey'ler" : "Registered Passkeys"}
            </h4>
            <button
              onClick={testPasskey}
              disabled={processing}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              {lang === "tr" ? "Test Et" : "Test"}
            </button>
          </div>

          {passkeys.map((passkey) => (
            <div 
              key={passkey.id}
              className="bg-slate-800/50 rounded-xl p-4 border border-slate-700"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <span className="text-lg">🔑</span>
                  </div>
                  <div>
                    {editingId === passkey.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                          autoFocus
                        />
                        <button
                          onClick={() => renamePasskey(passkey.id)}
                          className="text-[#2F6F62] text-xs"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-slate-400 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <p className="text-white font-medium">{passkey.name}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>
                        {lang === "tr" ? "Eklendi" : "Added"}: {new Date(passkey.createdAt).toLocaleDateString()}
                      </span>
                      {passkey.backedUp && (
                        <span className="text-[#2F6F62]">• Synced</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingId(passkey.id);
                      setEditName(passkey.name);
                    }}
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    title={lang === "tr" ? "Yeniden Adlandır" : "Rename"}
                  >
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => deletePasskey(passkey.id)}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                    title={lang === "tr" ? "Sil" : "Delete"}
                  >
                    <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
        <div className="flex gap-3">
          <span className="text-blue-400">ℹ️</span>
          <div>
            <p className="text-sm text-blue-400 font-medium mb-1">
              {lang === "tr" ? "Passkey Nedir?" : "What is a Passkey?"}
            </p>
            <p className="text-xs text-slate-400">
              {lang === "tr" 
                ? "Passkey, parmak izi veya yüz tanıma gibi biyometrik yöntemlerle kimlik doğrulamanızı sağlar. Şifrelerden çok daha güvenlidir ve phishing saldırılarına karşı koruma sağlar."
                : "Passkeys enable authentication using biometrics like fingerprint or face recognition. They're much more secure than passwords and protect against phishing attacks."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
