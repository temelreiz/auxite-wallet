// ============================================
// FLEET REGISTRY — Itera rental pilot
// Vehicle records, status transitions (closed spans) and valuations.
// Valuations come from outside sources (index / appraisal / sale); the
// operator never marks its own cars (§3).
// ============================================

import { KEYS, getRedis, parse, monthOf } from "./store";
import {
  toUsd,
  type Powertrain,
  type Segment,
  type Valuation,
  type ValuationSource,
  type Vehicle,
  type VehicleStatus,
  type VehicleStatusSpan,
  type Zone,
} from "./types";

export interface RegisterVehicleInput {
  vehicleId: string;
  plate: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  powertrain: Powertrain;
  segment: Segment;
  zone: Zone;
  acquiredAt: number;
  purchasePriceTry: number;
  purchaseUsdTry: number;
}

export async function registerVehicle(
  input: RegisterVehicleInput,
  now = Date.now()
): Promise<{ ok: true; vehicle: Vehicle } | { ok: false; error: string }> {
  const redis = getRedis();
  const vehicle: Vehicle = {
    ...input,
    status: "acquiring",
    statusSince: now,
    odometerKm: 0,
    createdAt: now,
    updatedAt: now,
  };
  const created = await redis.set(KEYS.vehicle(input.vehicleId), JSON.stringify(vehicle), { nx: true });
  if (created !== "OK") return { ok: false, error: "vehicle_exists" };
  await redis.sadd(KEYS.vehicles, input.vehicleId);
  return { ok: true, vehicle };
}

export async function getVehicle(vehicleId: string): Promise<Vehicle | null> {
  return parse<Vehicle>(await getRedis().get(KEYS.vehicle(vehicleId)));
}

export async function listVehicles(): Promise<Vehicle[]> {
  const redis = getRedis();
  const ids = (await redis.smembers(KEYS.vehicles)) as string[];
  const out: Vehicle[] = [];
  for (const id of ids) {
    const v = await getVehicle(id);
    if (v) out.push(v);
  }
  return out.sort((a, b) => a.vehicleId.localeCompare(b.vehicleId));
}

/**
 * Move a vehicle to a new status and close the span it was in. The closed
 * span is filed under the month it started in; metrics clip spans to the
 * period they report on.
 */
export async function setVehicleStatus(
  vehicleId: string,
  status: VehicleStatus,
  at = Date.now(),
  odometerKm?: number
): Promise<{ ok: true; vehicle: Vehicle; closed: VehicleStatusSpan | null } | { ok: false; error: string }> {
  const redis = getRedis();
  const vehicle = await getVehicle(vehicleId);
  if (!vehicle) return { ok: false, error: "vehicle_not_found" };
  if (vehicle.status === "disposed") return { ok: false, error: "vehicle_disposed" };
  if (at < vehicle.statusSince) return { ok: false, error: "out_of_order" };

  let closed: VehicleStatusSpan | null = null;
  if (status !== vehicle.status) {
    closed = { vehicleId, status: vehicle.status, start: vehicle.statusSince, end: at };
    await redis.rpush(KEYS.spans(monthOf(closed.start)), JSON.stringify(closed));
    vehicle.status = status;
    vehicle.statusSince = at;
  }
  if (odometerKm !== undefined) {
    if (odometerKm < vehicle.odometerKm) return { ok: false, error: "odometer_decreased" };
    vehicle.odometerKm = odometerKm;
  }
  vehicle.updatedAt = at;
  await redis.set(KEYS.vehicle(vehicleId), JSON.stringify(vehicle));
  return { ok: true, vehicle, closed };
}

export async function listSpans(month: string): Promise<VehicleStatusSpan[]> {
  const rows = (await getRedis().lrange(KEYS.spans(month), 0, -1)) as unknown[];
  return rows.map((r) => parse<VehicleStatusSpan>(r)).filter((s): s is VehicleStatusSpan => !!s);
}

export interface RecordValuationInput {
  vehicleId: string;
  valueTry: number;
  usdTry: number;
  source: ValuationSource;
  valuer: string;
  valuedAt: number;
}

export async function recordValuation(
  input: RecordValuationInput,
  now = Date.now()
): Promise<{ ok: true; valuation: Valuation } | { ok: false; error: string }> {
  if (!(input.valueTry >= 0)) return { ok: false, error: "invalid_value" };
  if (!input.valuer.trim()) return { ok: false, error: "valuer_required" };
  if (!(await getVehicle(input.vehicleId))) return { ok: false, error: "vehicle_not_found" };
  const valuation: Valuation = {
    ...input,
    valueUsd: toUsd(input.valueTry, input.usdTry),
    recordedAt: now,
  };
  await getRedis().rpush(KEYS.valuations(input.vehicleId), JSON.stringify(valuation));
  return { ok: true, valuation };
}

/** Most recent valuation by valuation date (not by entry order). */
export async function latestValuation(vehicleId: string): Promise<Valuation | null> {
  const rows = (await getRedis().lrange(KEYS.valuations(vehicleId), 0, -1)) as unknown[];
  let best: Valuation | null = null;
  for (const r of rows) {
    const v = parse<Valuation>(r);
    if (v && (!best || v.valuedAt >= best.valuedAt)) best = v;
  }
  return best;
}
