"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

// Sumsub KYC Page - Standalone page for mobile WebBrowser
// This page loads Sumsub SDK directly with token from URL params

function KYCContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const wallet = searchParams.get("wallet");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sdkInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!token) {
      setError("Missing access token");
      setLoading(false);
      return;
    }

    const initSDK = async () => {
      try {
        // Check if token is a test token (starts with test_)
        if (token?.startsWith("test_")) {
          throw new Error("Sumsub is in test mode. Please configure environment variables on the server.");
        }

        // Dynamically import Sumsub SDK
        const snsWebSdk = (await import("@sumsub/websdk")).default;

        if (!containerRef.current) {
          throw new Error("Container not ready");
        }

        // Initialize SDK
        const sdk = snsWebSdk
          .init(token, async () => {
            // Token refresh - fetch new token
            if (!wallet) return token;

            try {
              const res = await fetch("/api/kyc/sumsub", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-wallet-address": wallet,
                },
                body: JSON.stringify({}),
              });
              const data = await res.json();
              return data.accessToken || token;
            } catch {
              return token;
            }
          })
          .withConf({
            theme: "dark",
            lang: navigator.language.startsWith("tr") ? "tr" : "en",
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
            setError(error.message || "Verification error");
          })
          .on("idCheck.applicantStatus", (payload: any) => {
            console.log("Applicant status:", payload);
            if (payload.reviewStatus === "completed" && payload.reviewResult?.reviewAnswer === "GREEN") {
              // Verification completed successfully
              setTimeout(() => {
                window.close();
              }, 2000);
            }
          })
          .onMessage((type: string, payload: any) => {
            console.log("SDK message:", type, payload);
            if (type === "idCheck.onApplicantSubmitted") {
              // Show success message
              setError(null);
            }
          })
          .build();

        sdkInstanceRef.current = sdk;
        sdk.launch(containerRef.current);
        setLoading(false);
      } catch (err: any) {
        console.error("SDK init error:", err);
        setError(err.message || "Failed to initialize verification");
        setLoading(false);
      }
    };

    initSDK();

    return () => {
      if (sdkInstanceRef.current) {
        try {
          sdkInstanceRef.current.destroy();
        } catch (e) {
          console.error("SDK destroy error:", e);
        }
      }
    };
  }, [token, wallet]);

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 rounded-2xl p-8 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Invalid Request</h1>
          <p className="text-slate-400">Missing access token. Please try again from the app.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">Identity Verification</h1>
            <p className="text-xs text-slate-400">Secure verification powered by Sumsub</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#2F6F62]/20 rounded-full">
              <svg className="w-3.5 h-3.5 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-[10px] font-medium text-[#2F6F62]">256-bit</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-4">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin w-10 h-10 border-2 border-slate-600 border-t-[#BFA181] rounded-full mx-auto mb-4"></div>
              <p className="text-slate-400">Loading verification...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Sumsub Container */}
        <div
          ref={containerRef}
          id="sumsub-websdk-container"
          className="bg-slate-900 rounded-xl min-h-[500px] overflow-hidden"
        />
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            GDPR Compliant
          </span>
          <span>•</span>
          <span>Powered by Auxite</span>
        </div>
      </div>
    </div>
  );
}

export default function KYCPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-2 border-slate-600 border-t-[#BFA181] rounded-full"></div>
      </div>
    }>
      <KYCContent />
    </Suspense>
  );
}
