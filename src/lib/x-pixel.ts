// ════════════════════════════════════════════════════════════════════════════
// X (TWITTER) PIXEL CONVERSION TRACKING
// ════════════════════════════════════════════════════════════════════════════
//
// Central helper for firing X conversions from web. Mirrors the shape of
// src/lib/google-ads-conversion.ts on purpose — same event vocabulary, same
// env-gated no-op behaviour — so both ad platforms are wired from the same
// call sites and can't drift apart.
//
// X's Website Conversions objective bids toward these events. Without them the
// campaign can only optimise for link clicks, which is what produced the
// junk-geo traffic on the Google Ads side.
//
// Required env vars (in Vercel project settings):
//   NEXT_PUBLIC_X_PIXEL_ID          = "oXXXXX"        // universal website tag
//   NEXT_PUBLIC_X_EVENT_SIGNUP      = "tw-oXXX-oYYY"  // "Sign up" event id
//   NEXT_PUBLIC_X_EVENT_PURCHASE    = "tw-oXXX-oZZZ"  // "Purchase" event id
//   NEXT_PUBLIC_X_EVENT_KYC         = "tw-oXXX-oAAA"  // "Lead" event id
//
// Every one is optional — a missing event id makes that call a no-op, so the
// wiring can ship before the X Ads account is certified and configured. Event
// ids come from X Ads → Tools → Events Manager, one per conversion event.
//
// twq() is loaded by the X Pixel <Script> in src/app/layout.tsx; we guard
// every call so a missing tag never throws.
// ════════════════════════════════════════════════════════════════════════════

type XConversionEvent = "signup" | "purchase" | "kyc";

interface XConversionOpts {
  /** Conversion value in USD. Optional — only meaningful for purchase. */
  value?: number;
  /** ISO 4217 code, defaults to "USD". */
  currency?: string;
  /** Stable id so X can dedupe repeated fires of the same conversion. */
  transactionId?: string;
}

type TwqFn = (command: string, ...args: any[]) => void;

declare global {
  interface Window {
    twq?: TwqFn;
  }
}

function eventIdFor(event: XConversionEvent): string | undefined {
  switch (event) {
    case "signup":   return process.env.NEXT_PUBLIC_X_EVENT_SIGNUP;
    case "purchase": return process.env.NEXT_PUBLIC_X_EVENT_PURCHASE;
    case "kyc":      return process.env.NEXT_PUBLIC_X_EVENT_KYC;
  }
}

/**
 * Fire an X conversion. Safe to call unconditionally — silently no-ops if any
 * of:
 *   - running on the server
 *   - twq never loaded (pixel id unset, or blocked by an ad blocker)
 *   - the per-event id env var is missing
 *
 * Call from the moment the user PERCEIVES the conversion completing on the
 * client, alongside the Google Ads fireConversion() call.
 */
export function fireXConversion(event: XConversionEvent, opts: XConversionOpts = {}): void {
  if (typeof window === "undefined") return;

  const eventId = eventIdFor(event);
  if (!eventId) return;

  try {
    if (typeof window.twq !== "function") return;

    const payload: Record<string, any> = {};
    if (typeof opts.value === "number") {
      payload.value = opts.value;
      payload.currency = opts.currency || "USD";
    }
    if (opts.transactionId) payload.conversion_id = opts.transactionId;

    window.twq("event", eventId, payload);
  } catch (e) {
    // Never crash a success screen because an ad pixel failed.
    console.warn("[x-pixel] fireXConversion failed:", e);
  }
}
