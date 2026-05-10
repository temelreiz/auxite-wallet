// ════════════════════════════════════════════════════════════════════════════
// WEB ANALYTICS — gtag wrapper for GA4 events
// ════════════════════════════════════════════════════════════════════════════
//
// gtag.js is loaded in app/layout.tsx with Auxite's GA_ID. This module
// provides a typed wrapper for sending custom events.
//
// IMPORTANT — keep event names + parameter shapes IN SYNC with mobile
// (auxite-vault/lib/analytics.ts). Funnel reports compare web + mobile
// flows, so divergent names break cross-platform analysis.
// ════════════════════════════════════════════════════════════════════════════

type GtagFn = (
  command: "event" | "config" | "set" | "consent" | "js",
  ...args: any[]
) => void;

declare global {
  interface Window {
    gtag?: GtagFn;
    dataLayer?: any[];
  }
}

/**
 * Send a custom event to GA4 (no-op if gtag.js hasn't loaded yet —
 * safe to call from server components or before consent is granted).
 */
export function logEvent(name: string, params?: Record<string, any>): void {
  if (typeof window === "undefined") return;
  try {
    if (typeof window.gtag === "function") {
      window.gtag("event", name, params || {});
    } else if (Array.isArray(window.dataLayer)) {
      // Queue for when gtag loads
      window.dataLayer.push({ event: name, ...(params || {}) });
    }
  } catch (e) {
    // Never crash on analytics failure
    console.warn("[analytics] logEvent failed:", e);
  }
}

/** Tag the user once they connect a wallet (becomes user_id in GA4). */
export function setUserId(id: string | null): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  try {
    window.gtag("config", process.env.NEXT_PUBLIC_GA_ID || "", { user_id: id || undefined });
  } catch (e) {
    console.warn("[analytics] setUserId failed:", e);
  }
}

/** Set a user property (e.g. tier, language) for later segmentation. */
export function setUserProperty(name: string, value: string | null): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  try {
    window.gtag("set", "user_properties", { [name]: value });
  } catch (e) {
    console.warn("[analytics] setUserProperty failed:", e);
  }
}
