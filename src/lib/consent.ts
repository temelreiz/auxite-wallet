// ════════════════════════════════════════════════════════════════════════════
// COOKIE CONSENT — single source of truth
// ════════════════════════════════════════════════════════════════════════════
//
// CookieConsent.tsx writes the user's choice to localStorage, but three other
// places need to READ it: the GA4 consent-mode default, the X pixel and the
// Meta pixel. Before this module each of them reached for
// window.auxite_analytics_consent directly, which was only ever assigned at
// the moment the user clicked the banner — never restored on a later page
// load. Consented users therefore came back with analytics denied.
//
// Everything consent-related now goes through here:
//   - readConsent()          parse the stored record
//   - hasAnalyticsConsent()  the one boolean the pixels care about
//   - applyConsentToWindow() re-hydrate the global GA4's inline script reads
//   - CONSENT_CHANGED_EVENT  so pixels can mount without a page reload
// ════════════════════════════════════════════════════════════════════════════

export const CONSENT_STORAGE_KEY = "auxite_cookie_consent";

/** Fired on window when the user accepts or rejects from the banner. */
export const CONSENT_CHANGED_EVENT = "auxite:consent-changed";

export interface ConsentRecord {
  essential: boolean;
  analytics: boolean;
  timestamp: string;
  version: string;
}

/**
 * Read the stored consent record. Returns null when the user hasn't chosen
 * yet — callers must treat null as "no consent", never as "assume yes".
 */
export function readConsent(): ConsentRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.analytics !== "boolean") return null;
    return parsed as ConsentRecord;
  } catch {
    // Corrupt record — treat as no decision rather than crashing the app.
    return null;
  }
}

/** True only when the user has explicitly opted in to analytics cookies. */
export function hasAnalyticsConsent(): boolean {
  return readConsent()?.analytics === true;
}

/**
 * Mirror the stored decision onto window so the GA4 inline script in
 * layout.tsx sees it on every load, not just the one where the banner was
 * clicked. Safe to call repeatedly.
 */
export function applyConsentToWindow(): void {
  if (typeof window === "undefined") return;
  (window as any).auxite_analytics_consent = hasAnalyticsConsent();
}

/** Notify listeners (pixels) that the decision changed in this same session. */
export function notifyConsentChanged(): void {
  if (typeof window === "undefined") return;
  applyConsentToWindow();
  try {
    window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));
  } catch {}
}
