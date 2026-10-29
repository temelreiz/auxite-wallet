// ============================================
// ITERA RENTAL — shared types
// Hourly free-floating car-sharing pilot (docs/car-rental-pilot-design.md)
// Source of truth for trip revenue is the car-sharing provider; this ledger
// is a verifiable copy of it (§3). Amounts are kept in TRY with the USD rate
// used, so USD NAV can be recomputed and FX impact measured (§6).
// ============================================

export type Powertrain = "ev" | "hev";
export type Segment = "B" | "C";
export type Zone = "europe" | "anatolia";

/** Fleet cell (§11.1): every metric is reported per cell. */
export type Cell = `${Uppercase<Powertrain>}-${Segment}`;

export type VehicleStatus =
  | "acquiring"
  | "available"
  | "in_trip"
  | "reserved"
  | "servicing" // cleaning, charging/refuelling, relocation
  | "maintenance"
  | "damaged"
  | "disposed";

/** Statuses in which the car cannot be rented. Used for availability. */
export const UNAVAILABLE_STATUSES: readonly VehicleStatus[] = [
  "acquiring",
  "maintenance",
  "damaged",
  "disposed",
];

export interface Vehicle {
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
  status: VehicleStatus;
  statusSince: number;
  odometerKm: number;
  createdAt: number;
  updatedAt: number;
}

/** A closed period in one status. Utilisation and unavailability come from these. */
export interface VehicleStatusSpan {
  vehicleId: string;
  status: VehicleStatus;
  start: number;
  end: number;
}

export type PaymentStatus = "paid" | "failed" | "refunded" | "disputed";

export interface TripFare {
  timeFeeTry: number;
  distanceFeeTry: number;
  discountTry: number; // positive number, subtracted
  surchargeTry: number; // out-of-zone, cleaning, etc.
}

export interface Trip {
  tripId: string; // provider's id
  vehicleId: string;
  userRef: string; // anonymised provider user id, never personal data
  start: number;
  end: number;
  startZone: Zone;
  endZone: Zone;
  startArea?: string; // grid/neighbourhood level, never exact location
  endArea?: string;
  distanceKm: number;
  fare: TripFare;
  totalTry: number;
  usdTry: number;
  paymentStatus: PaymentStatus;
  endEnergyPct?: number; // EV charge or HEV tank, 0-100
  endedPluggedIn?: boolean; // EV ended at a reserved charger with charging started
  damageReported?: boolean;
  provider: string;
  receivedAt: number;
}

export type CashEventType =
  | "trip_revenue"
  | "user_fee"
  | "capital_in"
  | "vehicle_purchase"
  | "disposal"
  | "fuel"
  | "charging"
  | "cleaning"
  | "relocation"
  | "parking"
  | "toll"
  | "maintenance"
  | "insurance"
  | "damage"
  | "damage_recovery"
  | "fine"
  | "fine_recovery"
  | "energy_incentive"
  | "software"
  | "payment_fee"
  | "tax"
  | "operator_fee"
  | "platform_fee"
  | "distribution";

export const CASH_EVENT_TYPES: readonly CashEventType[] = [
  "trip_revenue", "user_fee", "capital_in", "vehicle_purchase", "disposal", "fuel", "charging",
  "cleaning", "relocation", "parking", "toll", "maintenance", "insurance", "damage",
  "damage_recovery", "fine", "fine_recovery", "energy_incentive", "software", "payment_fee",
  "tax", "operator_fee", "platform_fee", "distribution",
];

/**
 * Types that only the provider integration may write. Revenue entered by hand
 * is exactly what the separation of powers in §3 forbids, so the admin path
 * refuses these.
 */
export const PROVIDER_ONLY_TYPES: readonly CashEventType[] = ["trip_revenue", "user_fee"];

export const INFLOW_TYPES: readonly CashEventType[] = [
  "trip_revenue",
  "user_fee",
  "capital_in",
  "disposal",
  "damage_recovery",
  "fine_recovery",
];

export type CashSource = "provider" | "admin";

export interface CashEvent {
  eventId: string;
  type: CashEventType;
  vehicleId?: string; // empty for fleet-wide items
  tripId?: string;
  amountTry: number; // always positive; direction follows from type
  usdTry: number;
  amountUsd: number; // signed: inflow positive, outflow negative
  occurredAt: number;
  documentRef?: string;
  note?: string;
  source: CashSource;
  recordedBy?: string; // admin address when source === "admin"
  recordedAt: number;
}

export type ValuationSource = "index" | "appraisal" | "sale";

export interface Valuation {
  vehicleId: string;
  valueTry: number;
  usdTry: number;
  valueUsd: number;
  source: ValuationSource;
  valuer: string;
  valuedAt: number;
  recordedAt: number;
}

export interface NavSnapshot {
  takenAt: number;
  fleetValueUsd: number;
  cashUsd: number;
  liabilitiesUsd: number;
  navUsd: number;
  shadowSupply: number;
  navPerToken: number | null;
  vehiclesValued: number;
  vehiclesMissingValuation: string[];
}

export function cellOf(v: Pick<Vehicle, "powertrain" | "segment">): Cell {
  return `${v.powertrain.toUpperCase() as Uppercase<Powertrain>}-${v.segment}`;
}

export function toUsd(amountTry: number, usdTry: number): number {
  if (!(usdTry > 0)) throw new Error("usdTry must be a positive rate");
  return Math.round((amountTry / usdTry) * 100) / 100;
}
