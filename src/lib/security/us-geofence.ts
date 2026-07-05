// src/lib/security/us-geofence.ts
//
// US-PERSON REGULATORY GEOFENCE for Auxite's REGULATED platform features.
// ---------------------------------------------------------------------------
// Purpose: while the AUXE securities offering (Reg D 506(c), via Dalmore) may be
// sold to verified US accredited investors, the PLATFORM's regulated
// money-movement / commodity features are NOT offered to US persons until the
// relevant licenses are held (FinCEN MSB / state MTL / CFTC retail-commodity).
// This module restricts US persons from those specific features while leaving
// holding, viewing, and the securities offering unaffected.
//
// ⚠️  SCOPE IS PROVISIONAL — pending calibration by securities/regulatory
//     counsel (Aaron Krowne / Krowne Law). Two things counsel calibrates:
//       (1) the exact "US person" definition (below we use KYC nationality /
//           residence country + edge IP country; counsel may add citizenship,
//           tax residency, or tighten fail-closed behavior), and
//       (2) the exact list of gated features (FEATURE_DEFAULTS below).
//     Every feature flag and the master switch are env-overridable so counsel's
//     calibration can be applied WITHOUT a code change (see env keys below).
//
// Geofencing comfort hierarchy (per counsel, safest → least):
//   1. KYC-based  (we do this — Auxite runs Sumsub KYC)   ← primary
//   2. IP + VPN blocking                                  ← IP layer added here
//   3. IP-only
//   4. disclaimers
// This module combines (1) KYC country + (2) edge IP country for defense in
// depth. (VPN/proxy detection exists in ./geoip.ts and can be layered on via a
// paid vendor later — see isVpnLikely note.)

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ─────────────────────── US-person definition ───────────────────────
const US_TOKENS = new Set([
  "US", "USA", "U.S.", "U.S.A.",
  "UNITED STATES", "UNITED STATES OF AMERICA", "AMERICA",
]);
function norm(s: unknown): string {
  return String(s ?? "").trim().toUpperCase();
}
function isUsToken(v: unknown): boolean {
  return US_TOKENS.has(norm(v));
}

// ─────────────────────────── config ────────────────────────────────
export type RegulatedFeature =
  | "fiatOnRamp"       // card / Stripe fiat funding
  | "fiatOffRamp"      // fiat payout (bank / Wise / Bridge)
  | "cryptoWithdraw"   // withdraw USDC/USDT/ETH/BTC etc.
  | "stablecoinConvert"// USD <-> USDT / stablecoin conversion
  | "leaseYield"       // financed metal Lease Yield (CFTC-sensitive)
  | "metalTrade"       // buy/sell/convert metal (default OFF — spot w/ actual delivery may be OK; counsel confirms)
  | "cryptoTrade";     // crypto-leg trades on the exchange (default OFF pending calibration)

// Default gate: money-movement features ON; metal/crypto-trade OFF until counsel
// confirms whether spot metal (actual delivery) needs gating for US persons.
const FEATURE_DEFAULTS: Record<RegulatedFeature, boolean> = {
  fiatOnRamp: true,
  fiatOffRamp: true,
  cryptoWithdraw: true,
  stablecoinConvert: true,
  leaseYield: true,
  metalTrade: false,
  cryptoTrade: false,
};

function envBool(key: string, dflt: boolean): boolean {
  const v = process.env[key];
  if (v === undefined || v === null || v === "") return dflt;
  return /^(1|true|on|yes)$/i.test(v.trim());
}

/** Master switch: US_GEOFENCE_ENABLED (default ON). */
export function isGeofenceEnabled(): boolean {
  return envBool("US_GEOFENCE_ENABLED", true);
}

/** Per-feature switch: US_GEOFENCE_<FEATURE_UPPER_SNAKE> overrides the default.
 *  e.g. US_GEOFENCE_METAL_TRADE=true to also gate metal trading. */
export function isFeatureGated(feature: RegulatedFeature): boolean {
  const envKey =
    "US_GEOFENCE_" +
    feature.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase();
  return envBool(envKey, FEATURE_DEFAULTS[feature]);
}

// ───────────────────── US-person detection ─────────────────────────
/** Tier 1 — KYC-based: does the KYC record resolve this wallet to a US person
 *  (nationality OR residence country)? Missing KYC → false (not blocked here;
 *  regulated features separately require KYC). Counsel may tighten to
 *  fail-closed for unknown country. */
export async function isUSPersonByKyc(address: string): Promise<boolean> {
  try {
    if (!address) return false;
    const raw = await redis.get(`kyc:${address.toLowerCase()}`);
    if (!raw) return false;
    const kyc: any = typeof raw === "string" ? JSON.parse(raw) : raw;
    return (
      isUsToken(kyc?.personalInfo?.nationality) ||
      isUsToken(kyc?.address?.country)
    );
  } catch {
    return false;
  }
}

/** Tier 2 — edge IP country (Vercel `x-vercel-ip-country`, Cloudflare
 *  `cf-ipcountry`). Instant, no external call. */
export function isUSPersonByIp(req: NextRequest): boolean {
  const country =
    req.headers.get("x-vercel-ip-country") ||
    req.headers.get("cf-ipcountry") ||
    "";
  return norm(country) === "US";
}

/** Combined US-person check (KYC OR edge IP). Pass `req` to include the IP
 *  layer; omit it for KYC-only contexts. */
export async function isUSPerson(
  address: string,
  req?: NextRequest,
): Promise<boolean> {
  if (req && isUSPersonByIp(req)) return true;
  return isUSPersonByKyc(address);
}

// ───────────────────────── enforcement ─────────────────────────────
/**
 * Guard for a regulated route. Returns a 403 NextResponse to return
 * immediately if the caller is a US person and the feature is gated;
 * otherwise returns null (proceed).
 *
 * Usage in a route (after resolving the user's wallet `address`):
 *   const blocked = await blockUSPersonForFeature("cryptoWithdraw", address, req);
 *   if (blocked) return blocked;
 */
export async function blockUSPersonForFeature(
  feature: RegulatedFeature,
  address: string,
  req?: NextRequest,
): Promise<NextResponse | null> {
  if (!isGeofenceEnabled()) return null;
  if (!isFeatureGated(feature)) return null;
  if (!(await isUSPerson(address, req))) return null;

  return NextResponse.json(
    {
      error: "This feature is not available in your region.",
      geoblocked: true,
      code: "US_GEOFENCE",
      feature,
    },
    { status: 403 },
  );
}
