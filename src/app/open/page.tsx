"use client";

// /open — smart app deep-link with fallback.
// Tries to open the Auxite Vault app (auxite-vault://<to>); if not installed,
// falls back to the Play Store (Android) or the web app (iOS/desktop, since the
// iOS app is not yet live). Used by email/push CTAs to drive app traffic.

import { useEffect, useState } from "react";

const SCHEME = "auxite-vault";
const PLAY_URL = "https://play.google.com/store/apps/details?id=io.auxite.vault";
const WEB_FALLBACK = "https://vault.auxite.io/stake";
// In-app routes we allow deep-linking to (Expo Router paths; tab group omitted).
const ALLOWED = new Set(["yield", "allocate", "index", "auxr", "fund-vault", "redeem"]);

export default function OpenAppPage() {
  const [target, setTarget] = useState("yield");
  const [platform, setPlatform] = useState<"android" | "ios" | "desktop">("desktop");

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const to = (sp.get("to") || "yield").toLowerCase();
    const safe = ALLOWED.has(to) ? to : "yield";
    setTarget(safe);

    const ua = navigator.userAgent || "";
    const isAndroid = /android/i.test(ua);
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    setPlatform(isAndroid ? "android" : isIOS ? "ios" : "desktop");

    // Triple slash → empty host + "/safe" path, so Expo Router resolves it to
    // the route (e.g. /yield) instead of treating "yield" as the host (which
    // lands on the index/vault screen).
    const deepLink = `${SCHEME}:///${safe}`;
    const storeOrWeb = isAndroid ? PLAY_URL : WEB_FALLBACK;

    if (isAndroid || isIOS) {
      // Try the app; if it doesn't grab focus, fall back after a short delay.
      const start = Date.now();
      const timer = setTimeout(() => {
        // If we're still here (app not installed / didn't open), redirect.
        if (Date.now() - start < 2500 && !document.hidden) {
          window.location.href = storeOrWeb;
        }
      }, 1400);
      // Attempt to open the app.
      window.location.href = deepLink;
      const onHide = () => clearTimeout(timer); // app opened → cancel fallback
      document.addEventListener("visibilitychange", onHide, { once: true });
      return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", onHide); };
    } else {
      // Desktop: go straight to the web app.
      window.location.href = WEB_FALLBACK;
    }
  }, []);

  const deepLink = `${SCHEME}:///${target}`;

  return (
    <div style={{ fontFamily: "Georgia, serif", background: "#f5f5f5", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 420, width: "100%", background: "#fff", borderRadius: 8, overflow: "hidden", textAlign: "center" }}>
        <div style={{ height: 3, background: "#C5A55A" }} />
        <div style={{ padding: "32px 28px" }}>
          <h1 style={{ fontSize: 20, color: "#1a1a1a", margin: "0 0 8px" }}>Opening Auxite…</h1>
          <p style={{ fontSize: 13, color: "#666", lineHeight: 1.6, margin: "0 0 22px" }}>
            If the app didn’t open automatically, choose an option below.
          </p>
          <a href={deepLink} style={{ display: "block", background: "#1a1a1a", color: "#fff", padding: "13px 20px", textDecoration: "none", fontSize: 13, fontWeight: 600, letterSpacing: 1, borderRadius: 4, marginBottom: 10 }}>OPEN THE APP</a>
          {platform !== "ios" && (
            <a href={PLAY_URL} style={{ display: "block", background: "#fff", color: "#1a1a1a", border: "1px solid #ddd", padding: "13px 20px", textDecoration: "none", fontSize: 13, fontWeight: 600, letterSpacing: 1, borderRadius: 4, marginBottom: 10 }}>GET IT ON GOOGLE PLAY</a>
          )}
          <a href={WEB_FALLBACK} style={{ display: "block", color: "#C5A55A", padding: "10px", textDecoration: "none", fontSize: 12 }}>Continue on the web →</a>
        </div>
        <div style={{ height: 2, background: "#C5A55A" }} />
      </div>
    </div>
  );
}
