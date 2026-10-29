// ============================================
// TRIP LEDGER — Itera rental pilot
// Trips as reported by the car-sharing provider. Recording is idempotent on
// the provider's trip id, so webhook retries and the nightly reconciliation
// can both write the same trip safely.
// ============================================

import { KEYS, getRedis, parse, monthOf } from "./store";
import { appendProviderCashEvent } from "./cash-ledger";
import { getVehicle } from "./fleet-registry";
import type { Trip } from "./types";

export type RecordTripResult =
  | { ok: true; trip: Trip; duplicate: boolean }
  | { ok: false; error: string };

export function validateTrip(t: Trip): string | null {
  if (!t.tripId) return "trip_id_required";
  if (!(t.end > t.start)) return "end_before_start";
  if (!(t.distanceKm >= 0)) return "invalid_distance";
  if (!(t.usdTry > 0)) return "invalid_usd_rate";
  const { timeFeeTry, distanceFeeTry, discountTry, surchargeTry } = t.fare;
  for (const n of [timeFeeTry, distanceFeeTry, discountTry, surchargeTry, t.totalTry]) {
    if (!(n >= 0)) return "invalid_fare";
  }
  const expected = timeFeeTry + distanceFeeTry + surchargeTry - discountTry;
  if (Math.abs(expected - t.totalTry) > 0.01) return "fare_breakdown_mismatch";
  return null;
}

export async function recordTrip(trip: Trip): Promise<RecordTripResult> {
  const invalid = validateTrip(trip);
  if (invalid) return { ok: false, error: invalid };
  if (!(await getVehicle(trip.vehicleId))) return { ok: false, error: "vehicle_not_found" };

  const redis = getRedis();
  const created = await redis.set(KEYS.trip(trip.tripId), JSON.stringify(trip), { nx: true });
  if (created !== "OK") {
    const existing = parse<Trip>(await redis.get(KEYS.trip(trip.tripId)));
    return existing ? { ok: true, trip: existing, duplicate: true } : { ok: false, error: "write_conflict" };
  }
  await redis.rpush(KEYS.tripsByMonth(monthOf(trip.end)), trip.tripId);

  // Revenue is booked only when the payment actually went through.
  if (trip.paymentStatus === "paid" && trip.totalTry > 0) {
    const cash = await appendProviderCashEvent({
      eventId: `trip:${trip.tripId}`,
      type: "trip_revenue",
      amountTry: trip.totalTry,
      usdTry: trip.usdTry,
      occurredAt: trip.end,
      vehicleId: trip.vehicleId,
      tripId: trip.tripId,
    });
    if (!cash.ok) return { ok: false, error: `cash_${cash.error}` };
  }
  return { ok: true, trip, duplicate: false };
}

export async function getTrip(tripId: string): Promise<Trip | null> {
  return parse<Trip>(await getRedis().get(KEYS.trip(tripId)));
}

export async function listTrips(month: string): Promise<Trip[]> {
  const redis = getRedis();
  const ids = (await redis.lrange(KEYS.tripsByMonth(month), 0, -1)) as string[];
  const out: Trip[] = [];
  for (const id of ids) {
    const t = await getTrip(id);
    if (t) out.push(t);
  }
  return out;
}
