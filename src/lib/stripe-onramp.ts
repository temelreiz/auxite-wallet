// src/lib/stripe-onramp.ts
//
// Stripe's hosted fiat-to-crypto onramp. Stripe is the merchant of record and
// handles identity, sanctions, fraud and disputes; the crypto is delivered to
// the customer's Auxite deposit address, where scan-user-deposits credits it.
//
// Networks are limited to the ones that watcher reads. A purchase delivered on
// any other network would reach the address but never be credited.

export const ONRAMP_NETWORKS = ["base", "bitcoin"] as const;
export const ONRAMP_CURRENCIES = ["usdc", "eth", "btc"] as const;

// Docs do not list the Base key under wallet_addresses. Confirm in test mode.
const BASE_WALLET_KEY = process.env.STRIPE_ONRAMP_BASE_WALLET_KEY || "base_network";

export function isOnrampEnabled(): boolean {
  return process.env.STRIPE_ONRAMP_ENABLED === "true";
}

export function onrampSessionParams(evm: string, btc: string, customerIp?: string): Record<string, string> {
  const params: Record<string, string> = {
    [`wallet_addresses[${BASE_WALLET_KEY}]`]: evm,
    "wallet_addresses[bitcoin]": btc,
    lock_wallet_address: "true",
    destination_network: "base",
    destination_currency: "usdc",
  };
  ONRAMP_NETWORKS.forEach((n, i) => (params[`destination_networks[${i}]`] = n));
  ONRAMP_CURRENCIES.forEach((c, i) => (params[`destination_currencies[${i}]`] = c));
  if (customerIp && customerIp !== "unknown") params.customer_ip_address = customerIp;
  return params;
}

const UNAVAILABLE = new Set([
  "crypto_onramp_unsupportable_customer",
  "crypto_onramp_unsupported_country",
  "crypto_onramp_disabled",
]);

export function isOnrampUnavailable(code: unknown): boolean {
  return typeof code === "string" && UNAVAILABLE.has(code);
}

export async function createOnrampRedirect(params: Record<string, string>): Promise<string> {
  const res = await fetch("https://api.stripe.com/v1/crypto/onramp_sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.redirect_url) {
    const err = new Error(data?.error?.message || "Onramp session failed") as Error & { code?: string };
    err.code = data?.error?.code;
    throw err;
  }
  return data.redirect_url as string;
}
