"use client";

import { useState, useEffect } from "react";

interface DeviceManagerProps {
  walletAddress: string;
  lang?: "tr" | "en" | "de" | "fr" | "ar" | "ru" | "de" | "fr" | "ar" | "ru";
}

interface Device {
  id: string;
  fingerprint: string;
  name: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  deviceType: "desktop" | "mobile" | "tablet" | "unknown";
  ip: string;
  location?: {
    city?: string;
    country?: string;
    countryCode?: string;
  };
  locationFormatted?: string;
  trusted: boolean;
  firstSeen: string;
  lastSeen: string;
  isCurrent: boolean;
}

export function DeviceManager({ walletAddress, lang = "en" }: DeviceManagerProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDevices();
  }, [walletAddress]);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/security/devices", {
        headers: { "x-wallet-address": walletAddress },
      });
      const data = await res.json();
      setDevices(data.devices || []);
    } catch (err) {
      console.error("Devices fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTrust = async (deviceId: string, trusted: boolean) => {
    try {
      setProcessing(deviceId);
      setError(null);

      const res = await fetch("/api/security/devices/trust", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({ deviceId, trusted }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      fetchDevices();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(null);
    }
  };

  const removeDevice = async (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    if (device?.isCurrent) {
      setError(lang === "tr" ? "Mevcut cihazı silemezsiniz" : "Cannot remove current device");
      return;
    }

    if (!confirm(lang === "tr" ? "Bu cihaz silinsin mi?" : "Remove this device?")) {
      return;
    }

    try {
      setProcessing(deviceId);
      setError(null);

      const res = await fetch(`/api/security/devices?deviceId=${deviceId}`, {
        method: "DELETE",
        headers: { "x-wallet-address": walletAddress },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      fetchDevices();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(null);
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case "mobile": return "📱";
      case "tablet": return "📱";
      case "desktop": return "💻";
      default: return "🖥️";
    }
  };

  const getOSIcon = (os: string) => {
    const osLower = os.toLowerCase();
    if (osLower.includes("windows")) return "🪟";
    if (osLower.includes("mac") || osLower.includes("ios")) return "🍎";
    if (osLower.includes("android")) return "🤖";
    if (osLower.includes("linux")) return "🐧";
    return "💻";
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (lang === "tr") {
      if (diffMins < 5) return "Şimdi";
      if (diffMins < 60) return `${diffMins} dk önce`;
      if (diffHours < 24) return `${diffHours} saat önce`;
      if (diffDays < 7) return `${diffDays} gün önce`;
      return date.toLocaleDateString("tr-TR");
    } else {
      if (diffMins < 5) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString("en-US");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-slate-600 border-t-emerald-500 rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            {lang === "tr" ? "Bağlı Cihazlar" : "Connected Devices"}
          </h3>
          <p className="text-sm text-slate-400">
            {devices.length} {lang === "tr" ? "cihaz" : "device(s)"} • 
            {devices.filter(d => d.trusted).length} {lang === "tr" ? "güvenilir" : "trusted"}
          </p>
        </div>
        <button
          onClick={fetchDevices}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          title={lang === "tr" ? "Yenile" : "Refresh"}
        >
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Devices List */}
      <div className="space-y-3">
        {devices.map((device) => (
          <div 
            key={device.id}
            className={`bg-slate-800/50 rounded-xl p-4 border transition-colors ${
              device.isCurrent 
                ? "border-emerald-500/50" 
                : device.trusted 
                ? "border-blue-500/30" 
                : "border-slate-700"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                {/* Device Icon */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  device.isCurrent 
                    ? "bg-emerald-500/20" 
                    : device.trusted 
                    ? "bg-blue-500/20" 
                    : "bg-slate-700"
                }`}>
                  <span className="text-2xl">{getDeviceIcon(device.deviceType)}</span>
                </div>

                {/* Device Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium">{device.name}</p>
                    {device.isCurrent && (
                      <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                        {lang === "tr" ? "Bu cihaz" : "This device"}
                      </span>
                    )}
                    {device.trusted && !device.isCurrent && (
                      <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                        {lang === "tr" ? "Güvenilir" : "Trusted"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      {getOSIcon(device.os)} {device.os}
                    </span>
                    <span>•</span>
                    <span>{device.browser}</span>
                  </div>

                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      📍 {device.locationFormatted || "Bilinmiyor"}
                    </span>
                    <span>•</span>
                    <span>
                      {lang === "tr" ? "Son görülme" : "Last seen"}: {formatDate(device.lastSeen)}
                    </span>
                  </div>

                  {/* IP (masked) */}
                  <div className="mt-1 text-xs text-slate-600">
                    IP: {device.ip.split('.').slice(0, 2).join('.')}.***.***
                  </div>
                </div>
              </div>

              {/* Actions */}
              {!device.isCurrent && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleTrust(device.id, !device.trusted)}
                    disabled={processing === device.id}
                    className={`p-2 rounded-lg transition-colors ${
                      device.trusted 
                        ? "hover:bg-slate-700 text-blue-400" 
                        : "hover:bg-blue-500/20 text-slate-400"
                    }`}
                    title={device.trusted 
                      ? (lang === "tr" ? "Güveni Kaldır" : "Remove Trust")
                      : (lang === "tr" ? "Güvenilir Yap" : "Mark Trusted")}
                  >
                    {processing === device.id ? (
                      <div className="w-4 h-4 border-2 border-slate-600 border-t-emerald-500 rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill={device.trusted ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => removeDevice(device.id)}
                    disabled={processing === device.id}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-slate-400 hover:text-red-400"
                    title={lang === "tr" ? "Cihazı Sil" : "Remove Device"}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {devices.length === 0 && (
        <div className="text-center py-12">
          <span className="text-4xl mb-4 block">📱</span>
          <p className="text-slate-400">
            {lang === "tr" ? "Henüz kayıtlı cihaz yok" : "No devices registered yet"}
          </p>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
        <div className="flex gap-3">
          <span className="text-blue-400">ℹ️</span>
          <div>
            <p className="text-sm text-blue-400 font-medium mb-1">
              {lang === "tr" ? "Güvenilir Cihazlar" : "Trusted Devices"}
            </p>
            <p className="text-xs text-slate-400">
              {lang === "tr" 
                ? "Güvenilir olarak işaretlediğiniz cihazlarda bazı ek güvenlik adımları atlanabilir. Tanımadığınız cihazları derhal silin."
                : "Devices marked as trusted may skip some security steps. Remove any devices you don't recognize immediately."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
