// ============================================
// METRICS — Itera rental pilot (Kapı 1 table, §6 and §11.6)
// Pure computation over trips, status spans and cash events for a period,
// broken down per fleet cell (EV-B, EV-C, HEV-B, HEV-C).
// ============================================

import {
  UNAVAILABLE_STATUSES,
  cellOf,
  type CashEvent,
  type Cell,
  type Trip,
  type Vehicle,
  type VehicleStatusSpan,
} from "./types";

export interface Period {
  start: number;
  end: number;
}

export interface CellMetrics {
  vehicles: number;
  vehicleHours: number;
  unavailableHours: number;
  tripHours: number;
  /** trip hours / rentable hours */
  timeUtilisation: number | null;
  trips: number;
  tripsPerVehicleDay: number | null;
  avgTripMinutes: number | null;
  avgTripKm: number | null;
  grossRevenueUsd: number;
  costsUsd: number;
  netIncomeUsd: number;
  /** costs / gross revenue */
  costRatio: number | null;
  /** failed + disputed fares / all fares (by amount) */
  collectionLossRatio: number | null;
  energyCostPerKmUsd: number | null;
  /** EV trips that ended plugged in at a reserved charger / all EV trips */
  userChargeRatio: number | null;
  damagePer1000Trips: number | null;
  crossZoneTripRatio: number | null;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const round = (n: number, d = 4) => Math.round(n * 10 ** d) / 10 ** d;
const ratio = (a: number, b: number) => (b > 0 ? round(a / b) : null);

function overlapMs(aStart: number, aEnd: number, p: Period): number {
  return Math.max(0, Math.min(aEnd, p.end) - Math.max(aStart, p.start));
}

/** Revenue-type events are excluded from costs; capital and distributions are neither. */
const NON_OPERATING = new Set(["capital_in", "vehicle_purchase", "disposal", "distribution"]);
const REVENUE = new Set(["trip_revenue", "user_fee"]);
const RECOVERY = new Set(["damage_recovery", "fine_recovery"]);
const ENERGY = new Set(["fuel", "charging"]);

export function computeMetrics(
  period: Period,
  vehicles: Vehicle[],
  trips: Trip[],
  spans: VehicleStatusSpan[],
  cash: CashEvent[]
): Record<Cell | "ALL", CellMetrics> {
  const cellOfVehicle = new Map<string, Cell>(vehicles.map((v) => [v.vehicleId, cellOf(v)]));
  const cells: (Cell | "ALL")[] = ["EV-B", "EV-C", "HEV-B", "HEV-C", "ALL"];
  const inCell = (vehicleId: string | undefined, cell: Cell | "ALL") =>
    cell === "ALL" || (vehicleId !== undefined && cellOfVehicle.get(vehicleId) === cell);

  const result = {} as Record<Cell | "ALL", CellMetrics>;
  for (const cell of cells) {
    const cv = vehicles.filter((v) => inCell(v.vehicleId, cell));

    // A vehicle exists in the period from acquisition (or registration) onward.
    let vehicleMs = 0;
    for (const v of cv) vehicleMs += overlapMs(v.acquiredAt, period.end, period);

    // Closed spans plus the currently open one.
    let unavailableMs = 0;
    const openSpans: VehicleStatusSpan[] = cv.map((v) => ({
      vehicleId: v.vehicleId,
      status: v.status,
      start: v.statusSince,
      end: Math.max(period.end, v.statusSince),
    }));
    for (const s of [...spans.filter((s) => inCell(s.vehicleId, cell)), ...openSpans]) {
      if (UNAVAILABLE_STATUSES.includes(s.status)) unavailableMs += overlapMs(s.start, s.end, period);
    }

    const ct = trips.filter((t) => inCell(t.vehicleId, cell) && t.end > period.start && t.end <= period.end);
    const tripMs = ct.reduce((s, t) => s + overlapMs(t.start, t.end, period), 0);
    const km = ct.reduce((s, t) => s + t.distanceKm, 0);
    const fares = ct.reduce((s, t) => s + t.totalTry, 0);
    const lostFares = ct
      .filter((t) => t.paymentStatus === "failed" || t.paymentStatus === "disputed")
      .reduce((s, t) => s + t.totalTry, 0);

    const evTrips = ct.filter((t) => cellOfVehicle.get(t.vehicleId)?.startsWith("EV"));

    const ce = cash.filter(
      (e) => e.occurredAt >= period.start && e.occurredAt < period.end && (cell === "ALL" || inCell(e.vehicleId, cell))
    );
    let gross = 0;
    let costs = 0;
    let energy = 0;
    for (const e of ce) {
      if (NON_OPERATING.has(e.type)) continue;
      if (REVENUE.has(e.type)) gross += e.amountUsd;
      else if (RECOVERY.has(e.type)) costs -= e.amountUsd; // recoveries reduce costs
      else costs += -e.amountUsd;
      if (ENERGY.has(e.type)) energy += -e.amountUsd;
    }

    const rentableMs = vehicleMs - unavailableMs;
    const vehicleDays = vehicleMs / DAY;
    result[cell] = {
      vehicles: cv.length,
      vehicleHours: round(vehicleMs / HOUR, 1),
      unavailableHours: round(unavailableMs / HOUR, 1),
      tripHours: round(tripMs / HOUR, 1),
      timeUtilisation: ratio(tripMs, rentableMs),
      trips: ct.length,
      tripsPerVehicleDay: ratio(ct.length, vehicleDays),
      avgTripMinutes: ct.length ? round(tripMs / ct.length / 60_000, 1) : null,
      avgTripKm: ct.length ? round(km / ct.length, 1) : null,
      grossRevenueUsd: round(gross, 2),
      costsUsd: round(costs, 2),
      netIncomeUsd: round(gross - costs, 2),
      costRatio: ratio(costs, gross),
      collectionLossRatio: ratio(lostFares, fares),
      energyCostPerKmUsd: ratio(energy, km),
      userChargeRatio: evTrips.length ? ratio(evTrips.filter((t) => t.endedPluggedIn).length, evTrips.length) : null,
      damagePer1000Trips: ct.length ? round((ct.filter((t) => t.damageReported).length / ct.length) * 1000, 2) : null,
      crossZoneTripRatio: ratio(ct.filter((t) => t.startZone !== t.endZone).length, ct.length),
    };
  }
  return result;
}
