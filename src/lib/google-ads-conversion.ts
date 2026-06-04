// ════════════════════════════════════════════════════════════════════════════
// GOOGLE ADS CONVERSION TRACKING
// ════════════════════════════════════════════════════════════════════════════
//
// Central helper for firing Google Ads conversions from web. Reads conversion
// IDs from public env vars so ops can rotate them without a code change.
//
// Required env vars (in Vercel project settings):
//   NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID   = "AW-1234567890"        // account
//   NEXT_PUBLIC_GOOGLE_ADS_LABEL_SIGNUP    = "abcDEF-123"           // signup conversion label
//   NEXT_PUBLIC_GOOGLE_ADS_LABEL_PURCHASE  = "ghiJKL-456"           // metal-purchase conversion label
//   NEXT_PUBLIC_GOOGLE_ADS_LABEL_DEPOSIT   = "mnoPQR-789"           // wire-deposit conversion label
//
// All four are optional — if a label isn't set, fireConversion no-ops for that
// event. This lets us ship the wiring before the Google Ads account is fully
// configured; once ops fills in the env vars in Vercel, conversions start
// flowing immediately (no redeploy needed for Vercel's edge-fetched env).
//
// gtag() is loaded by the Google Ads <Script> in src/app/layout.tsx; we
// guard every call so a missing tag never throws.
// ════════════════════════════════════════════════════════════════════════════

type ConversionEvent = "signup" | "purchase" | "deposit";

interface ConversionOpts {
  /** Conversion value in USD. Optional — only meaningful for purchase/deposit. */
  value?: number;
  /** ISO 4217 code, defaults to "USD". */
  currency?: string;
  /** Stable order/transaction id for dedupe in Google Ads reports. */
  transactionId?: string;
}

declare global {
  // gtag is injected by the GA4 + Google Ads <Script> tags in the root layout.
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

function labelFor(event: ConversionEvent): string | undefined {
  switch (event) {
    case "signup":   return process.env.NEXT_PUBLIC_GOOGLE_ADS_LABEL_SIGNUP;
    case "purchase": return process.env.NEXT_PUBLIC_GOOGLE_ADS_LABEL_PURCHASE;
    case "deposit":  return process.env.NEXT_PUBLIC_GOOGLE_ADS_LABEL_DEPOSIT;
  }
}

/**
 * Fire a Google Ads conversion. Safe to call unconditionally — silently
 * no-ops if any of:
 *   - running on the server
 *   - gtag never loaded
 *   - the conversion id env var is missing
 *   - the per-event label env var is missing
 *
 * Call from the moment the user PERCEIVES the conversion completing on the
 * client (success screen, confirmation page). Server-side events (Stripe
 * webhook firing minutes after redirect) are out of scope; for those use
 * the enhanced conversions API instead.
 */
export function fireConversion(event: ConversionEvent, opts: ConversionOpts = {}): void {
  if (typeof window === "undefined") return;
  const gtag = window.gtag;
  if (typeof gtag !== "function") return;

  const accountId = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID;
  const label = labelFor(event);
  if (!accountId || !label) return;

  const payload: Record<string, any> = {
    send_to: `${accountId}/${label}`,
  };
  if (opts.value !== undefined) {
    payload.value = opts.value;
    payload.currency = opts.currency || "USD";
  }
  if (opts.transactionId) {
    payload.transaction_id = opts.transactionId;
  }

  try {
    gtag("event", "conversion", payload);
  } catch {
    // gtag stub may throw if loaded but not configured; never crash the host.
  }
}
