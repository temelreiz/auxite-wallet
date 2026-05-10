// ════════════════════════════════════════════════════════════════════════════
// WISE API — incoming bank-wire detection
// ════════════════════════════════════════════════════════════════════════════
//
// Wise (Aurum Ledger HK Business profile) is the bank rail for fiat deposits.
// Users wire USD/EUR to our Wise account; we detect the incoming transaction
// via a webhook subscribed to `account-details-payment#state-change` and
// credit the corresponding AUXM balance based on the wire's reference field.
//
// Auth: WISE_API_TOKEN (Personal API Token from Wise dashboard) — Bearer auth.
// All requests against https://api.wise.com (production).
// ════════════════════════════════════════════════════════════════════════════

const WISE_API_BASE = process.env.WISE_API_BASE || "https://api.wise.com";
const WISE_API_TOKEN = process.env.WISE_API_TOKEN || "";

if (!WISE_API_TOKEN && process.env.NODE_ENV === "production") {
  console.warn("[wise] WISE_API_TOKEN not set — Wise endpoints will fail.");
}

// ── Generic request helper ─────────────────────────────────────────────────
export async function wiseRequest<T = any>(
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: any
): Promise<T> {
  if (!WISE_API_TOKEN) throw new Error("WISE_API_TOKEN not configured");

  const res = await fetch(`${WISE_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${WISE_API_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data: any;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    console.error(`[wise] ${method} ${path} → ${res.status}`, data);
    throw new Error(`Wise API ${res.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
  }
  return data as T;
}

// ── Profile lookup ─────────────────────────────────────────────────────────
export interface WiseProfile {
  id: number;
  type: "PERSONAL" | "BUSINESS";
  details?: { name?: string; companyName?: string };
}

/** Fetch all profiles (Personal + Business) accessible by this token. */
export async function listProfiles(): Promise<WiseProfile[]> {
  return wiseRequest<WiseProfile[]>("GET", "/v2/profiles");
}

/** Pick the BUSINESS profile (Aurum Ledger). Falls back to first profile. */
export async function getBusinessProfile(): Promise<WiseProfile> {
  const profiles = await listProfiles();
  if (!profiles.length) throw new Error("No Wise profiles accessible by this token");
  const biz = profiles.find((p) => p.type === "BUSINESS");
  return biz || profiles[0];
}

// ── Webhook subscription ───────────────────────────────────────────────────
//
// Subscribe to "account-details-payment#state-change" at PROFILE level so we
// receive an event every time a wire lands in any of Aurum Ledger's account
// details (USD, EUR, GBP, etc).
//
// POST /v3/profiles/{profileId}/subscriptions
// Body: { name, trigger_on, delivery: { version, url } }
// ────────────────────────────────────────────────────────────────────────────

export interface WiseSubscription {
  id: string;
  name: string;
  trigger_on: string;
  delivery: { version: string; url: string };
  scope?: { domain: string; id?: number };
  created_by?: string;
  created_at?: string;
}

export const WISE_TRIGGER_INCOMING_PAYMENT = "account-details-payment#state-change";
export const WISE_DELIVERY_VERSION = "2.0.0";

export async function listProfileSubscriptions(profileId: number): Promise<WiseSubscription[]> {
  return wiseRequest<WiseSubscription[]>("GET", `/v3/profiles/${profileId}/subscriptions`);
}

export async function createIncomingPaymentSubscription(
  profileId: number,
  webhookUrl: string,
  name = "auxite-incoming-wires"
): Promise<WiseSubscription> {
  return wiseRequest<WiseSubscription>("POST", `/v3/profiles/${profileId}/subscriptions`, {
    name,
    trigger_on: WISE_TRIGGER_INCOMING_PAYMENT,
    delivery: { version: WISE_DELIVERY_VERSION, url: webhookUrl },
  });
}

export async function deleteSubscription(profileId: number, subscriptionId: string): Promise<void> {
  await wiseRequest("DELETE", `/v3/profiles/${profileId}/subscriptions/${subscriptionId}`);
}

// ── Payment / transfer detail lookup ───────────────────────────────────────
//
// The webhook payload is a small envelope. To get full details (amount,
// currency, sender, REFERENCE FIELD), we call back to Wise with the
// resource id from the event.
//
// NOTE: exact path depends on resource type — likely
//   GET /v1/profiles/{profileId}/balance-statements/...
//   GET /v1/profiles/{profileId}/borderless-accounts/...
//   GET /v3/profiles/{profileId}/transfers/{id}
// We log the event payload first to confirm the right callback path on the
// first real webhook delivery.
// ────────────────────────────────────────────────────────────────────────────

export async function getProfileBalances(profileId: number): Promise<any[]> {
  return wiseRequest("GET", `/v4/profiles/${profileId}/balances?types=STANDARD`);
}

/**
 * Try several known endpoint shapes to fetch the underlying payment record
 * referenced by an `account-details-payment#state-change` event.
 * Logs which one succeeded so we can pin it down after the first real
 * webhook lands.
 */
export async function tryFetchPaymentByResourceId(
  profileId: number,
  resourceId: string | number
): Promise<{ data: any; via: string } | null> {
  const candidates = [
    `/v1/profiles/${profileId}/account-details-payments/${resourceId}`,
    `/v3/profiles/${profileId}/account-details-payments/${resourceId}`,
    `/v1/profiles/${profileId}/borderless-accounts/transactions/${resourceId}`,
  ];
  for (const path of candidates) {
    try {
      const data = await wiseRequest("GET", path);
      console.log(`[wise] resource ${resourceId} fetched via ${path}`);
      return { data, via: path };
    } catch (e) {
      // try next
    }
  }
  console.warn(`[wise] could not fetch resource ${resourceId} via known paths`);
  return null;
}

// ── Webhook signature verification ─────────────────────────────────────────
//
// Wise signs webhook deliveries with RSA-SHA256 over the raw body. The
// signature is sent in `X-Signature-SHA256` header (Base64). Verify with
// the published Wise public key.
//
// We hold the public key as an env var (WISE_WEBHOOK_PUBLIC_KEY) so it can
// be rotated without a code deploy. If not set, signature is skipped with
// a loud warning — useful for the very first webhook to inspect the
// payload, but MUST be set before relying on the integration.
// ────────────────────────────────────────────────────────────────────────────

import crypto from "crypto";

export function verifyWiseWebhookSignature(rawBody: string, signatureBase64: string): boolean {
  const pubKey = process.env.WISE_WEBHOOK_PUBLIC_KEY;
  if (!pubKey) {
    console.warn("[wise] WISE_WEBHOOK_PUBLIC_KEY not set — skipping signature verification");
    return true; // fail-open for first-look; switch to false once key is configured
  }
  if (!signatureBase64) return false;
  try {
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(rawBody);
    verifier.end();
    return verifier.verify(pubKey, signatureBase64, "base64");
  } catch (e) {
    console.error("[wise] signature verification threw:", e);
    return false;
  }
}
