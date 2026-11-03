// ════════════════════════════════════════════════════════════════════════════
// MICROSOFT ADVERTISING (BING) UET CONVERSION TRACKING
// ════════════════════════════════════════════════════════════════════════════
//
// Same shape as src/lib/x-pixel.ts and src/lib/google-ads-conversion.ts so all
// three ad platforms are fired from the same call sites.
//
// The UET base tag (id 187285572, account G107C28T) is loaded by
// MarketingPixels.tsx only after analytics consent. The two conversion goals
// in Microsoft Ads are custom events matched on the event action:
//   "sign_up"  → goal "Sign up"   (no value)
//   "purchase" → goal "Purchase"  (variable revenue, USD)
// The action names here must stay equal to those goal definitions.
// ════════════════════════════════════════════════════════════════════════════

type BingConversionEvent = "signup" | "purchase";

interface BingConversionOpts {
  /** Conversion value. Only meaningful for purchase. */
  value?: number;
  /** ISO 4217 code, defaults to "USD". */
  currency?: string;
}

declare global {
  interface Window {
    uetq?: unknown[] | { push: (...args: unknown[]) => void };
  }
}

const ACTION: Record<BingConversionEvent, string> = {
  signup: "sign_up",
  purchase: "purchase",
};

/**
 * Fire a Microsoft Ads conversion. Safe to call unconditionally: no-ops on the
 * server, and before consent window.uetq does not exist, so nothing is sent.
 */
export function fireBingConversion(event: BingConversionEvent, opts: BingConversionOpts = {}): void {
  if (typeof window === "undefined" || !window.uetq) return;

  try {
    const params: Record<string, unknown> = {};
    if (typeof opts.value === "number") {
      params.revenue_value = opts.value;
      params.currency = opts.currency || "USD";
    }
    window.uetq.push("event", ACTION[event], params);
  } catch (e) {
    // Never crash a success screen because an ad tag failed.
    console.warn("[bing-uet] fireBingConversion failed:", e);
  }
}
