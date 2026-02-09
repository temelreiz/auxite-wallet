"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";

interface KYCData {
  walletAddress: string;
  level: "none" | "basic" | "verified" | "enhanced";
  status: "not_started" | "pending" | "under_review" | "approved" | "rejected" | "expired";
  limits: { dailyWithdraw: number; monthlyWithdraw: number; singleTransaction: number; };
  verification?: { rejectionReason?: string; };
}

interface Props {
  walletAddress: string;
  lang: "tr" | "en";
  onClose?: () => void;
}

const t = {
  tr: {
    title: "Kimlik Doğrulama (KYC)", subtitle: "Limitlerini artırmak için kimliğini doğrula",
    currentLevel: "Mevcut Seviye",
    levels: { none: "Doğrulanmamış", basic: "Temel", verified: "Doğrulanmış", enhanced: "Tam Doğrulama" },
    status: { not_started: "Başlanmadı", pending: "Bekliyor", under_review: "İnceleniyor", approved: "Onaylandı", rejected: "Reddedildi", expired: "Süresi Doldu" },
    limits: "Limitler", dailyWithdraw: "Günlük Çekim", monthlyWithdraw: "Aylık Çekim", singleTransaction: "Tek İşlem",
    startVerification: "Doğrulamayı Başlat",
    continueVerification: "Doğrulamaya Devam Et",
    verificationInProgress: "Doğrulama devam ediyor...",
    rejected: "Başvurunuz reddedildi",
    rejectionReason: "Sebep",
    tryAgain: "Tekrar Dene",
    approved: "Kimlik doğrulamanız tamamlandı!",
    pending: "Başvurunuz inceleniyor. Bu işlem 24-48 saat sürebilir.",
    error: "Bir hata oluştu",
    loading: "Yükleniyor...",
  },
  en: {
    title: "Identity Verification (KYC)", subtitle: "Verify your identity to increase limits",
    currentLevel: "Current Level",
    levels: { none: "Unverified", basic: "Basic", verified: "Verified", enhanced: "Enhanced" },
    status: { not_started: "Not Started", pending: "Pending", under_review: "Under Review", approved: "Approved", rejected: "Rejected", expired: "Expired" },
    limits: "Limits", dailyWithdraw: "Daily Withdraw", monthlyWithdraw: "Monthly Withdraw", singleTransaction: "Single Transaction",
    startVerification: "Start Verification",
    continueVerification: "Continue Verification",
    verificationInProgress: "Verification in progress...",
    rejected: "Your application was rejected",
    rejectionReason: "Reason",
    tryAgain: "Try Again",
    approved: "Your identity has been verified!",
    pending: "Your application is under review. This may take 24-48 hours.",
    error: "An error occurred",
    loading: "Loading...",
  },
};

export function KYCVerification({ walletAddress, lang, onClose }: Props) {
  const labels = t[lang];
  const [loading, setLoading] = useState(true);
  const [kyc, setKyc] = useState<KYCData | null>(null);
  const [sdkLoading, setSdkLoading] = useState(false);
  const [sdkActive, setSdkActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const sdkInstanceRef = useRef<any>(null);

  useEffect(() => {
    fetchKYC();
    return () => {
      if (sdkInstanceRef.current) {
        try {
          sdkInstanceRef.current.destroy();
        } catch (e) {
          console.error("SDK destroy error:", e);
        }
      }
    };
  }, [walletAddress]);

  const fetchKYC = async () => {
    try {
      const res = await fetch("/api/kyc", { headers: { "x-wallet-address": walletAddress } });
      const data = await res.json();
      setKyc(data.kyc);
    } catch (err) {
      console.error("Fetch KYC error:", err);
    } finally {
      setLoading(false);
    }
  };

  const launchSumsubSDK = useCallback(async () => {
    setSdkLoading(true);
    setErrorMessage("");
    setSdkActive(true);

    try {
      // Access token al
      const tokenRes = await fetch("/api/kyc/sumsub", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-wallet-address": walletAddress },
        body: JSON.stringify({}),
      });

      const tokenData = await tokenRes.json();
      console.log("Sumsub token response:", tokenData);

      if (!tokenRes.ok) {
        throw new Error(tokenData.error || "Token alınamadı");
      }

      // Check if token is a test token (starts with test_)
      if (tokenData.accessToken?.startsWith("test_")) {
        throw new Error("Sumsub is in test mode. Please configure SUMSUB_APP_TOKEN and SUMSUB_SECRET_KEY environment variables.");
      }

      // SDK'yı dinamik olarak yükle
      const snsWebSdk = (await import("@sumsub/websdk")).default;
      console.log("SDK loaded:", snsWebSdk);

      // Container'ın hazır olmasını bekle
      await new Promise(resolve => setTimeout(resolve, 100));

      if (!containerRef.current) {
        throw new Error("Container not ready");
      }

      console.log("Launching SDK with token:", tokenData.accessToken.substring(0, 20) + "...");
      console.log("Container:", containerRef.current);

      // Sumsub SDK'yı başlat
      const sdk = snsWebSdk
        .init(tokenData.accessToken, async () => {
          console.log("Token refresh requested");
          const refreshRes = await fetch("/api/kyc/sumsub", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-wallet-address": walletAddress },
            body: JSON.stringify({}),
          });
          const refreshData = await refreshRes.json();
          return refreshData.accessToken;
        })
        .withConf({ theme: "dark",
          lang: lang === "tr" ? "tr" : "en",
        })
        .withOptions({
          addViewportTag: false,
          adaptIframeHeight: true,
        })
        .on("idCheck.onStepCompleted", (payload: any) => {
          console.log("Step completed:", payload);
        })
        .on("idCheck.onError", (error: any) => {
          console.error("SDK error:", error);
          setErrorMessage(labels.error + ": " + (error.message || JSON.stringify(error)));
        })
        .on("idCheck.applicantStatus", (payload: any) => {
          console.log("Applicant status:", payload);
          fetchKYC();
        })
        .onMessage((type: string, payload: any) => {
          console.log("SDK message:", type, payload);
          if (type === "idCheck.onApplicantSubmitted") {
            fetchKYC();
          }
          if (type === "idCheck.onApplicantLoaded") {
            console.log("Applicant loaded successfully");
          }
        })
        .build();

      console.log("SDK built, launching...");
      sdkInstanceRef.current = sdk;
      sdk.launch(containerRef.current);
      console.log("SDK launched");

    } catch (err: any) {
      console.error("SDK launch error:", err);
      setErrorMessage(err.message || labels.error);
      setSdkActive(false);
    } finally {
      setSdkLoading(false);
    }
  }, [walletAddress, lang, labels.error]);

  if (loading) {
    return (
      <div className={onClose ? "fixed inset-0 bg-black/70 flex items-center justify-center z-50" : "flex justify-center py-8"}>
        <div className="animate-spin w-8 h-8 border-2 border-slate-600 border-t-[#BFA181] rounded-full"></div>
      </div>
    );
  }

  const isApproved = kyc?.status === "approved";
  const isRejected = kyc?.status === "rejected";
  const isPending = kyc?.status === "pending" || kyc?.status === "under_review";

  const content = (
    <div className="space-y-4">
      {onClose && !sdkActive && (
        <div className="flex items-center justify-between mb-4">
          <div><h2 className="text-lg font-semibold text-white">{labels.title}</h2><p className="text-sm text-slate-400">{labels.subtitle}</p></div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Status & Limits */}
      {!sdkActive && (
        <>
          <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
            <div><div className="text-xs text-slate-500">{labels.currentLevel}</div><div className="text-white font-medium">{labels.levels[kyc?.level || "none"]}</div></div>
            <span className={`px-3 py-1 rounded-full text-xs ${isApproved ? "bg-[#2F6F62]/20 text-[#2F6F62]" : isRejected ? "bg-red-500/20 text-red-400" : isPending ? "bg-[#BFA181]/20 text-[#BFA181]" : "bg-slate-500/20 text-slate-400"}`}>
              {labels.status[kyc?.status || "not_started"]}
            </span>
          </div>

          <div className="p-3 bg-slate-800/50 rounded-xl space-y-2">
            <div className="text-sm text-slate-400 font-medium">{labels.limits}</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><div className="text-xs text-slate-500">{labels.dailyWithdraw}</div><div className="text-white font-medium">${kyc?.limits.dailyWithdraw.toLocaleString()}</div></div>
              <div><div className="text-xs text-slate-500">{labels.monthlyWithdraw}</div><div className="text-white font-medium">${kyc?.limits.monthlyWithdraw.toLocaleString()}</div></div>
              <div><div className="text-xs text-slate-500">{labels.singleTransaction}</div><div className="text-white font-medium">${kyc?.limits.singleTransaction.toLocaleString()}</div></div>
            </div>
          </div>
        </>
      )}

      {/* Status Messages */}
      {isApproved && !sdkActive && (
        <div className="p-4 bg-[#2F6F62]/20 border border-[#2F6F62]/50 rounded-xl text-[#2F6F62] text-center">
          ✅ {labels.approved}
        </div>
      )}

      {isPending && !sdkActive && (
        <div className="p-4 bg-[#BFA181]/20 border border-[#BFA181]/50 rounded-xl text-[#BFA181] text-center">
          ⏳ {labels.pending}
        </div>
      )}

      {isRejected && !sdkActive && (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
          <div className="text-red-400 font-medium text-center">{labels.rejected}</div>
          {kyc?.verification?.rejectionReason && (
            <div className="text-red-300 text-sm mt-1 text-center">{labels.rejectionReason}: {kyc.verification.rejectionReason}</div>
          )}
          <button onClick={launchSumsubSDK} className="mt-3 w-full py-2 bg-red-500 text-white rounded-lg text-sm">
            {labels.tryAgain}
          </button>
        </div>
      )}

      {errorMessage && !sdkActive && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-sm">
          ❌ {errorMessage}
        </div>
      )}

      {/* Start/Continue Button */}
      {!isApproved && !sdkActive && !isPending && !isRejected && (
        <button
          onClick={launchSumsubSDK}
          disabled={sdkLoading}
          className="w-full py-4 bg-[#2F6F62] text-white rounded-xl font-medium hover:bg-[#2F6F62] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {sdkLoading ? (
            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
          ) : (
            <>
              <span>🔐</span>
              <span>{kyc?.status === "not_started" ? labels.startVerification : labels.continueVerification}</span>
            </>
          )}
        </button>
      )}

      {/* Sumsub SDK Container */}
      {sdkActive && (
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">{labels.title}</h2>
            <button
              onClick={() => { 
                if (sdkInstanceRef.current) {
                  try { sdkInstanceRef.current.destroy(); } catch(e) {}
                }
                setSdkActive(false); 
                fetchKYC(); 
              }}
              className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700"
            >
              ✕
            </button>
          </div>
          {sdkLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-slate-600 border-t-[#BFA181] rounded-full"></div>
              <span className="ml-3 text-slate-400">{labels.loading}</span>
            </div>
          )}
          {errorMessage && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-sm mb-4">
              ❌ {errorMessage}
            </div>
          )}
          <div 
            ref={containerRef} 
            id="sumsub-websdk-container"
            className="min-h-[500px] bg-slate-800 rounded-xl overflow-hidden"
            style={{ minHeight: "500px" }}
          />
        </div>
      )}
    </div>
  );

  if (onClose) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-lg w-full max-h-[90vh] overflow-y-auto p-4">{content}</div>
      </div>
    );
  }

  return content;
}

export default KYCVerification;
