"use client";

import { useState, useEffect, useCallback } from "react";

interface SecurityStatus {
  twoFactorEnabled: boolean;
  biometricEnabled: boolean;
  trustedDevices: number;
  activeSessions: number;
  securityScore: number;
  backupCodesRemaining: number;
  requiresVerification: boolean;
}

interface UseSecurityOptions {
  walletAddress: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseSecurityReturn {
  status: SecurityStatus | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  verify2FA: (code: string, isBackupCode?: boolean) => Promise<{ success: boolean; token?: string; error?: string }>;
  verifyBiometric: () => Promise<{ success: boolean; token?: string; error?: string }>;
  requiresVerification: () => boolean;
  checkVerificationToken: (token: string) => Promise<boolean>;
}

export function useSecurity({
  walletAddress,
  autoRefresh = false,
  refreshInterval = 60000,
}: UseSecurityOptions): UseSecurityReturn {
  const [status, setStatus] = useState<SecurityStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!walletAddress) return;

    try {
      setError(null);

      // Parallel fetch all security endpoints
      const [twoFARes, bioRes, devicesRes, sessionsRes] = await Promise.all([
        fetch("/api/security/2fa/status", {
          headers: { "x-wallet-address": walletAddress },
        }),
        fetch("/api/security/biometric", {
          headers: { "x-wallet-address": walletAddress },
        }),
        fetch("/api/security/devices", {
          headers: { "x-wallet-address": walletAddress },
        }),
        fetch("/api/security/sessions", {
          headers: { "x-wallet-address": walletAddress },
        }),
      ]);

      const [twoFAData, bioData, devicesData, sessionsData] = await Promise.all([
        twoFARes.json(),
        bioRes.json(),
        devicesRes.json(),
        sessionsRes.json(),
      ]);

      // Calculate security score
      let score = 20;
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
        backupCodesRemaining: twoFAData.backupCodesRemaining || 0,
        requiresVerification: twoFAData.enabled || bioData.enabled,
      });
    } catch (err: any) {
      setError(err.message || "Failed to fetch security status");
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchStatus();

    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchStatus, autoRefresh, refreshInterval]);

  const verify2FA = async (
    code: string,
    isBackupCode = false
  ): Promise<{ success: boolean; token?: string; error?: string }> => {
    try {
      const res = await fetch("/api/security/2fa/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({ code, isBackupCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error };
      }

      return { success: true, token: data.verificationToken };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const verifyBiometric = async (): Promise<{ success: boolean; token?: string; error?: string }> => {
    try {
      const { startAuthentication } = await import("@simplewebauthn/browser");

      // Get auth options
      const optionsRes = await fetch("/api/security/biometric", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({ action: "auth-options" }),
      });

      const optionsData = await optionsRes.json();
      if (!optionsRes.ok) {
        return { success: false, error: optionsData.error };
      }

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
      if (!verifyRes.ok) {
        return { success: false, error: verifyData.error };
      }

      return { success: true, token: verifyData.verificationToken };
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        return { success: false, error: "Operation cancelled" };
      }
      return { success: false, error: err.message };
    }
  };

  const requiresVerification = (): boolean => {
    return status?.requiresVerification || false;
  };

  const checkVerificationToken = async (token: string): Promise<boolean> => {
    try {
      // Token'ı backend'de kontrol et
      // Bu basit implementasyonda token'ın varlığını kontrol ediyoruz
      const res = await fetch("/api/security/verify-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({ token }),
      });

      return res.ok;
    } catch {
      return false;
    }
  };

  return {
    status,
    loading,
    error,
    refresh: fetchStatus,
    verify2FA,
    verifyBiometric,
    requiresVerification,
    checkVerificationToken,
  };
}

/**
 * Higher-order function to wrap actions with security verification
 */
export function withSecurityVerification<T extends (...args: any[]) => Promise<any>>(
  action: T,
  walletAddress: string,
  options?: {
    require2FA?: boolean;
    requireBiometric?: boolean;
    onVerificationRequired?: () => void;
  }
): T {
  return (async (...args: Parameters<T>) => {
    // Bu wrapper fonksiyon, action'ı çağırmadan önce
    // gerekli doğrulamaların yapılmasını sağlar
    // Implementasyon context'e göre yapılmalı
    return action(...args);
  }) as T;
}

/**
 * Güvenlik gerektiren işlemler için context provider
 */
export interface SecurityContextValue {
  walletAddress: string;
  status: SecurityStatus | null;
  showVerification: (options: {
    title?: string;
    description?: string;
    onVerified: (token: string) => void;
    onCancel: () => void;
  }) => void;
  hideVerification: () => void;
}
