// ============================================
// PROVIDER ADAPTER — Itera rental pilot (§7, §10)
// Everything specific to the car-sharing software vendor lives in this folder.
// The vendor is not chosen yet, so the only adapter is "generic": a normalised
// JSON payload signed with HMAC-SHA256. When the vendor is picked, add its
// adapter here and point RENTAL_PROVIDER at it; nothing outside this folder
// should need to change.
// ============================================

import * as crypto from "crypto";
import type { PaymentStatus, Trip, Zone } from "../types";

export interface ProviderAdapter {
  name: string;
  /** Must fail closed: no secret configured means no request is accepted. */
  verify(rawBody: string, headers: Headers): boolean;
  parseTrip(rawBody: string, receivedAt: number): { ok: true; trip: Trip } | { ok: false; error: string };
}

const ZONES: Zone[] = ["europe", "anatolia"];
const PAYMENT: PaymentStatus[] = ["paid", "failed", "refunded", "disputed"];

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : NaN);
const str = (v: unknown): string => (typeof v === "string" ? v : "");

export const genericAdapter: ProviderAdapter = {
  name: "generic",

  verify(rawBody, headers) {
    const secret = process.env.RENTAL_WEBHOOK_SECRET;
    if (!secret) return false;
    const given = headers.get("x-itera-signature") ?? "";
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    const a = Buffer.from(given, "utf8");
    const b = Buffer.from(expected, "utf8");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  },

  parseTrip(rawBody, receivedAt) {
    let p: Record<string, unknown>;
    try {
      p = JSON.parse(rawBody);
    } catch {
      return { ok: false, error: "invalid_json" };
    }
    if (p.event !== "trip.completed") return { ok: false, error: "unsupported_event" };
    const d = (p.data ?? {}) as Record<string, unknown>;
    const fare = (d.fare ?? {}) as Record<string, unknown>;

    const startZone = str(d.startZone) as Zone;
    const endZone = str(d.endZone) as Zone;
    const paymentStatus = str(d.paymentStatus) as PaymentStatus;
    if (!ZONES.includes(startZone) || !ZONES.includes(endZone)) return { ok: false, error: "invalid_zone" };
    if (!PAYMENT.includes(paymentStatus)) return { ok: false, error: "invalid_payment_status" };

    const trip: Trip = {
      tripId: str(d.tripId),
      vehicleId: str(d.vehicleId),
      userRef: str(d.userRef),
      start: Date.parse(str(d.startedAt)),
      end: Date.parse(str(d.endedAt)),
      startZone,
      endZone,
      startArea: str(d.startArea) || undefined,
      endArea: str(d.endArea) || undefined,
      distanceKm: num(d.distanceKm),
      fare: {
        timeFeeTry: num(fare.timeFeeTry),
        distanceFeeTry: num(fare.distanceFeeTry),
        discountTry: num(fare.discountTry ?? 0),
        surchargeTry: num(fare.surchargeTry ?? 0),
      },
      totalTry: num(d.totalTry),
      usdTry: num(d.usdTry),
      paymentStatus,
      endEnergyPct: typeof d.endEnergyPct === "number" ? d.endEnergyPct : undefined,
      endedPluggedIn: typeof d.endedPluggedIn === "boolean" ? d.endedPluggedIn : undefined,
      damageReported: typeof d.damageReported === "boolean" ? d.damageReported : undefined,
      provider: "generic",
      receivedAt,
    };
    if (!trip.tripId || !trip.vehicleId || !trip.userRef) return { ok: false, error: "missing_ids" };
    if (Number.isNaN(trip.start) || Number.isNaN(trip.end)) return { ok: false, error: "invalid_timestamps" };
    return { ok: true, trip };
  },
};

const ADAPTERS: Record<string, ProviderAdapter> = { generic: genericAdapter };

export function getProviderAdapter(): ProviderAdapter {
  return ADAPTERS[process.env.RENTAL_PROVIDER || "generic"] ?? genericAdapter;
}
