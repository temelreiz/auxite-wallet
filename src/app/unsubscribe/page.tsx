// src/app/unsubscribe/page.tsx
// One-click marketing/winback email unsubscribe landing page.
// User arrives via link in email footer: /unsubscribe?email=X&token=Y
// On confirm, calls POST /api/unsubscribe which adds to email:suppressed.

"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function UnsubscribePage() {
  const params = useSearchParams();
  const email = (params.get("email") || "").trim();
  const token = (params.get("token") || "").trim();

  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const tokenLooksValid = email.includes("@") && token.length === 16;

  const handleConfirm = async () => {
    setState("loading");
    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Failed to unsubscribe");
        setState("error");
        return;
      }
      setState("done");
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Network error");
      setState("error");
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f5f5",
        fontFamily: "Georgia, 'Times New Roman', serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          background: "#fff",
          maxWidth: 480,
          width: "100%",
          padding: 0,
          borderTop: "3px solid #C5A55A",
          borderBottom: "2px solid #C5A55A",
        }}
      >
        <div style={{ padding: "24px 30px 16px", borderBottom: "1px solid #e5e5e5" }}>
          <h1
            style={{
              fontSize: 13,
              letterSpacing: 5,
              color: "#1a1a1a",
              fontWeight: 700,
              margin: 0,
            }}
          >
            AUXITE
          </h1>
          <p style={{ fontSize: 11, color: "#888", margin: "2px 0 0 0" }}>
            Custody &amp; Settlement Services
          </p>
        </div>

        <div style={{ padding: "28px 30px", color: "#1a1a1a" }}>
          {!tokenLooksValid && (
            <>
              <h2 style={{ fontSize: 16, fontWeight: 400, margin: "0 0 12px" }}>
                Invalid unsubscribe link
              </h2>
              <p style={{ fontSize: 13, color: "#666", lineHeight: 1.7 }}>
                The link appears to be malformed or missing required parameters.
                Please use the unsubscribe link from a recent Auxite email, or
                contact{" "}
                <a href="mailto:support@auxite.io" style={{ color: "#C5A55A" }}>
                  support@auxite.io
                </a>
                .
              </p>
            </>
          )}

          {tokenLooksValid && state === "idle" && (
            <>
              <h2 style={{ fontSize: 16, fontWeight: 400, margin: "0 0 12px" }}>
                Confirm unsubscribe
              </h2>
              <p style={{ fontSize: 13, color: "#444", lineHeight: 1.7 }}>
                You will no longer receive marketing or re-engagement emails
                from Auxite at <strong>{email}</strong>. Transactional emails
                (deposit confirmations, security alerts, statements) will still
                be delivered.
              </p>
              <button
                onClick={handleConfirm}
                style={{
                  marginTop: 20,
                  display: "inline-block",
                  background: "#1a1a1a",
                  color: "#fff",
                  padding: "12px 28px",
                  border: "none",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: 1,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                CONFIRM UNSUBSCRIBE
              </button>
            </>
          )}

          {state === "loading" && (
            <p style={{ fontSize: 13, color: "#666" }}>Processing…</p>
          )}

          {state === "done" && (
            <>
              <h2 style={{ fontSize: 16, fontWeight: 400, margin: "0 0 12px" }}>
                You're unsubscribed
              </h2>
              <p style={{ fontSize: 13, color: "#444", lineHeight: 1.7 }}>
                <strong>{email}</strong> will no longer receive marketing
                emails. You may continue to receive operational notifications
                related to your account.
              </p>
            </>
          )}

          {state === "error" && (
            <>
              <h2 style={{ fontSize: 16, fontWeight: 400, margin: "0 0 12px" }}>
                Could not unsubscribe
              </h2>
              <p style={{ fontSize: 13, color: "#a33", lineHeight: 1.7 }}>
                {errorMsg}. Please email{" "}
                <a href="mailto:support@auxite.io" style={{ color: "#C5A55A" }}>
                  support@auxite.io
                </a>{" "}
                and we will remove you manually.
              </p>
            </>
          )}
        </div>

        <div
          style={{
            padding: "16px 30px",
            borderTop: "1px solid #e5e5e5",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 9, color: "#aaa", margin: "4px 0" }}>
            Aurum Ledger Ltd · Hong Kong
          </p>
        </div>
      </div>
    </main>
  );
}
