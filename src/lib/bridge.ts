// ════════════════════════════════════════════════════════════════════════════
// BRIDGE.XYZ API — crypto → USD off-ramp orchestration
// ════════════════════════════════════════════════════════════════════════════
//
// Bridge (https://bridge.xyz, Stripe) converts stablecoins to fiat and pays out
// to a bank account. We use it to drain the platform's crypto treasury into our
// Wise USD account:
//
//   treasury hot wallet (USDC/USDT)  ──on-chain──▶  Bridge liquidation address
//        └──▶ Bridge auto-converts to USD  ──wire──▶  Wise USD account (instant)
//
// One-time setup (admin, src/app/api/admin/bridge/setup):
//   1. Register the Wise USD account as an `external_account` on our Bridge
//      customer (the KYB'd Aurum Ledger business).         → external_account_id
//   2. Create one `liquidation_address` per (chain, currency) we off-ramp, each
//      configured to wire USD to that external account.    → deposit address
//
// Runtime (src/lib/bridge-offramp.ts + cron + admin sweep):
//   • Forward treasury stablecoins to the matching liquidation address.
//   • Bridge emits drain webhooks as the conversion settles → we credit the USD
//     into treasury cash so solvency backing stays whole across the conversion.
//
// Auth: BRIDGE_API_KEY (Api-Key header). All requests against the v0 API.
// ════════════════════════════════════════════════════════════════════════════

import crypto from "crypto";
import { getRedis } from "./redis";

const BRIDGE_API_BASE = process.env.BRIDGE_API_BASE || "https://api.bridge.xyz/v0";
const BRIDGE_API_KEY = process.env.BRIDGE_API_KEY || "";
const BRIDGE_CUSTOMER_ID = process.env.BRIDGE_CUSTOMER_ID || "";

if (!BRIDGE_API_KEY && process.env.NODE_ENV === "production") {
  console.warn("[bridge] BRIDGE_API_KEY not set — Bridge endpoints will fail.");
}

export function bridgeCustomerId(): string {
  if (!BRIDGE_CUSTOMER_ID) throw new Error("BRIDGE_CUSTOMER_ID not configured");
  return BRIDGE_CUSTOMER_ID;
}

// ── Redis keys ───────────────────────────────────────────────────────────────
export const BRIDGE_KEYS = {
  externalAccount: "bridge:config:external_account",        // JSON { id, currency, bankName, ... }
  liquidationAddresses: "bridge:config:liquidation_addresses", // JSON map "<chain>:<currency>" → { id, address, ... }
  sweeps: "bridge:sweeps",                                   // list, newest first
  inflightUsd: "treasury:bridge:inflight_usd",              // float — crypto sent, USD not yet in Wise
  webhookEvents: "bridge:webhook:events",
  webhookErrors: "bridge:webhook:errors",
  webhookUnmatched: "bridge:webhook:unmatched",
  sweepLock: "bridge:sweep:lock",
} as const;

// ── Generic request helper ────────────────────────────────────────────────────
export async function bridgeRequest<T = any>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: any,
  idempotencyKey?: string
): Promise<T> {
  if (!BRIDGE_API_KEY) throw new Error("BRIDGE_API_KEY not configured");

  const headers: Record<string, string> = {
    "Api-Key": BRIDGE_API_KEY,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  const res = await fetch(`${BRIDGE_API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const text = await res.text();
  let data: any;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    console.error(`[bridge] ${method} ${path} → ${res.status}`, data);
    throw new Error(`Bridge API ${res.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
  }
  return data as T;
}

// ── Customer ──────────────────────────────────────────────────────────────────
export async function getCustomer(customerId = bridgeCustomerId()): Promise<any> {
  return bridgeRequest("GET", `/customers/${customerId}`);
}

// ── External accounts (bank destinations) ─────────────────────────────────────
export interface UsBankExternalAccount {
  bankName: string;
  accountName?: string;
  accountOwnerName: string;
  accountOwnerType?: "individual" | "business";
  firstName?: string;
  lastName?: string;
  routingNumber: string;
  accountNumber: string;
  checkingOrSavings?: "checking" | "savings";
  address: {
    streetLine1: string;
    streetLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string; // ISO-3, e.g. "USA"
  };
}

/**
 * Register a US bank account (our Wise USD account) as an off-ramp destination.
 * Returns Bridge's `{ id, ... }` — store the id; it's referenced by every
 * liquidation address.
 */
export async function createUsExternalAccount(
  acct: UsBankExternalAccount,
  customerId = bridgeCustomerId()
): Promise<any> {
  const body = {
    currency: "usd",
    account_type: "us",
    bank_name: acct.bankName,
    account_name: acct.accountName || acct.accountOwnerName,
    account_owner_name: acct.accountOwnerName,
    account_owner_type: acct.accountOwnerType || "business",
    ...(acct.firstName ? { first_name: acct.firstName } : {}),
    ...(acct.lastName ? { last_name: acct.lastName } : {}),
    account: {
      routing_number: acct.routingNumber,
      account_number: acct.accountNumber,
      checking_or_savings: acct.checkingOrSavings || "checking",
    },
    address: {
      street_line_1: acct.address.streetLine1,
      ...(acct.address.streetLine2 ? { street_line_2: acct.address.streetLine2 } : {}),
      city: acct.address.city,
      state: acct.address.state,
      postal_code: acct.address.postalCode,
      country: acct.address.country,
    },
  };
  const idem = `auxite-extacct-${customerId}-${acct.routingNumber}-${acct.accountNumber}`.slice(0, 200);
  return bridgeRequest("POST", `/customers/${customerId}/external_accounts`, body, idem);
}

export async function listExternalAccounts(customerId = bridgeCustomerId()): Promise<any> {
  return bridgeRequest("GET", `/customers/${customerId}/external_accounts`);
}

// ── Liquidation addresses (per chain + currency) ──────────────────────────────
export type BridgeChain = "base" | "tron" | "ethereum";
export type BridgeCurrency = "usdc" | "usdt";

export interface CreateLiquidationAddressInput {
  chain: BridgeChain;
  currency: BridgeCurrency;
  externalAccountId: string;
  /** Hot-wallet address funds are returned to if a conversion can't complete. */
  returnAddress: string;
  wireMessage?: string;
}

/**
 * Create a static deposit address that auto-converts incoming stablecoin to USD
 * and WIRES it to the given external (bank) account. Bridge sends the wire as
 * soon as funds are received — the "instant" leg.
 */
export async function createLiquidationAddress(
  input: CreateLiquidationAddressInput,
  customerId = bridgeCustomerId()
): Promise<any> {
  const body = {
    currency: input.currency,
    chain: input.chain,
    external_account_id: input.externalAccountId,
    destination_payment_rail: "wire",
    destination_currency: "usd",
    destination_wire_message: input.wireMessage || `Auxite treasury offramp ${input.chain} ${input.currency}`,
    return_instructions: { address: input.returnAddress },
  };
  const idem = `auxite-la-${customerId}-${input.chain}-${input.currency}`;
  return bridgeRequest("POST", `/customers/${customerId}/liquidation_addresses`, body, idem);
}

export async function listLiquidationAddresses(customerId = bridgeCustomerId()): Promise<any> {
  return bridgeRequest("GET", `/customers/${customerId}/liquidation_addresses`);
}

/** Drain history (funds_received → payment_submitted → payment_processed). */
export async function getLiquidationDrains(
  liquidationAddressId: string,
  customerId = bridgeCustomerId()
): Promise<any> {
  return bridgeRequest(
    "GET",
    `/customers/${customerId}/liquidation_addresses/${liquidationAddressId}/drains`
  );
}

// ── Stored config helpers ─────────────────────────────────────────────────────
export interface StoredExternalAccount {
  id: string;
  bankName: string;
  accountOwnerName: string;
  last4: string;
  createdAt: number;
}

export interface StoredLiquidationAddress {
  id: string;
  address: string;
  chain: BridgeChain;
  currency: BridgeCurrency;
  externalAccountId: string;
  createdAt: number;
}

export async function getStoredExternalAccount(): Promise<StoredExternalAccount | null> {
  const raw = await getRedis().get(BRIDGE_KEYS.externalAccount);
  if (!raw) return null;
  return typeof raw === "string" ? JSON.parse(raw) : (raw as any);
}

export async function setStoredExternalAccount(a: StoredExternalAccount): Promise<void> {
  await getRedis().set(BRIDGE_KEYS.externalAccount, JSON.stringify(a));
}

export async function getStoredLiquidationAddresses(): Promise<Record<string, StoredLiquidationAddress>> {
  const raw = await getRedis().get(BRIDGE_KEYS.liquidationAddresses);
  if (!raw) return {};
  return typeof raw === "string" ? JSON.parse(raw) : (raw as any);
}

export function liquidationKey(chain: BridgeChain, currency: BridgeCurrency): string {
  return `${chain}:${currency}`;
}

export async function setStoredLiquidationAddress(la: StoredLiquidationAddress): Promise<void> {
  const map = await getStoredLiquidationAddresses();
  map[liquidationKey(la.chain, la.currency)] = la;
  await getRedis().set(BRIDGE_KEYS.liquidationAddresses, JSON.stringify(map));
}

// ── Webhook signature verification ────────────────────────────────────────────
//
// Bridge signs webhook deliveries with the RSA private key paired to a PKI
// public key (PEM) that Bridge assigns to each webhook endpoint when it is
// created (shown in the dashboard / returned from POST /v0/webhooks). Put that
// PEM in BRIDGE_WEBHOOK_PUBLIC_KEY so it can rotate without a deploy.
//
// Header `X-Webhook-Signature` is `t=<timestamp_ms>,v0=<base64 signature>`. The
// signed payload is `<timestamp>.<raw request body>` (RSA-SHA256). If the key is
// not set we fail-open with a loud warning — useful to inspect the first real
// delivery and confirm the payload shape; set the key before relying on it.
export function verifyBridgeWebhookSignature(rawBody: string, signatureHeader: string): boolean {
  const pubKey = process.env.BRIDGE_WEBHOOK_PUBLIC_KEY;
  if (!pubKey) {
    console.warn("[bridge] BRIDGE_WEBHOOK_PUBLIC_KEY not set — skipping signature verification");
    return true;
  }
  if (!signatureHeader) return false;
  try {
    const tMatch = signatureHeader.match(/t=([^,]+)/);
    const vMatch = signatureHeader.match(/v0=([^,]+)/);
    // Bridge sends "t=...,v0=..."; tolerate a bare base64 sig as a fallback.
    const sig = vMatch ? vMatch[1] : signatureHeader;
    const signedPayload = tMatch ? `${tMatch[1]}.${rawBody}` : rawBody;
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(signedPayload);
    verifier.end();
    return verifier.verify(pubKey, sig, "base64");
  } catch (e) {
    console.error("[bridge] signature verification threw:", e);
    return false;
  }
}
