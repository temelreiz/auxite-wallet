/**
 * Itera rental pilot ledger. The pilot's product is its data (Kapı 1), and the
 * shadow-token NAV is only credible if revenue cannot be typed in, replayed
 * webhooks cannot double-count, and an unvalued car is not carried at cost.
 * These tests pin those properties.
 */
import * as crypto from "crypto";

const kv = new Map<string, unknown>();
const sets = new Map<string, Set<string>>();
const lists = new Map<string, unknown[]>();

jest.mock("@/lib/redis", () => ({
  getRedis: () => ({
    get: jest.fn(async (k: string) => kv.get(k) ?? null),
    set: jest.fn(async (k: string, v: unknown, opts?: { nx?: boolean }) => {
      if (opts?.nx && kv.has(k)) return null;
      kv.set(k, v);
      return "OK";
    }),
    sadd: jest.fn(async (k: string, m: string) => {
      if (!sets.has(k)) sets.set(k, new Set());
      sets.get(k)!.add(m);
      return 1;
    }),
    smembers: jest.fn(async (k: string) => [...(sets.get(k) ?? [])]),
    rpush: jest.fn(async (k: string, v: unknown) => {
      if (!lists.has(k)) lists.set(k, []);
      lists.get(k)!.push(v);
      return lists.get(k)!.length;
    }),
    lrange: jest.fn(async (k: string, start: number, stop: number) => {
      const l = lists.get(k) ?? [];
      const s = start < 0 ? Math.max(0, l.length + start) : start;
      const e = stop < 0 ? l.length + stop : stop;
      return l.slice(s, e + 1);
    }),
  }),
}));

import { registerVehicle, setVehicleStatus, recordValuation, listSpans } from "@/lib/rental/fleet-registry";
import { appendAdminCashEvent, listCashEvents } from "@/lib/rental/cash-ledger";
import { recordTrip, validateTrip } from "@/lib/rental/trip-ledger";
import { computeNav, setRentalConfig, takeNavSnapshot } from "@/lib/rental/nav-engine";
import { computeMetrics } from "@/lib/rental/metrics";
import { genericAdapter } from "@/lib/rental/provider";
import type { Trip, Vehicle } from "@/lib/rental/types";

const T0 = Date.parse("2026-11-01T00:00:00Z");
const H = 3_600_000;
const RATE = 40; // TRY per USD

function vehicleInput(id: string, powertrain: "ev" | "hev" = "ev", segment: "B" | "C" = "B") {
  return {
    vehicleId: id,
    plate: `34 ITR ${id}`,
    vin: `VIN${id}`,
    make: "Test",
    model: "Car",
    year: 2026,
    powertrain,
    segment,
    zone: "europe" as const,
    acquiredAt: T0,
    purchasePriceTry: 1_200_000,
    purchaseUsdTry: RATE,
  };
}

function trip(over: Partial<Trip> = {}): Trip {
  return {
    tripId: "t1",
    vehicleId: "v1",
    userRef: "u_abc",
    start: T0 + 10 * H,
    end: T0 + 10.5 * H,
    startZone: "europe",
    endZone: "anatolia",
    distanceKm: 12,
    fare: { timeFeeTry: 300, distanceFeeTry: 100, discountTry: 0, surchargeTry: 0 },
    totalTry: 400,
    usdTry: RATE,
    paymentStatus: "paid",
    endedPluggedIn: true,
    provider: "generic",
    receivedAt: T0 + 10.5 * H,
    ...over,
  };
}

beforeEach(() => {
  kv.clear();
  sets.clear();
  lists.clear();
});

describe("trip ledger", () => {
  it("books revenue once even if the provider replays the webhook", async () => {
    await registerVehicle(vehicleInput("v1"), T0);
    const first = await recordTrip(trip());
    const replay = await recordTrip(trip());
    expect(first).toMatchObject({ ok: true, duplicate: false });
    expect(replay).toMatchObject({ ok: true, duplicate: true });
    const cash = await listCashEvents("2026-11");
    expect(cash).toHaveLength(1);
    expect(cash[0]).toMatchObject({ type: "trip_revenue", amountUsd: 10, source: "provider" });
  });

  it("does not book revenue for a failed payment", async () => {
    await registerVehicle(vehicleInput("v1"), T0);
    await recordTrip(trip({ paymentStatus: "failed" }));
    expect(await listCashEvents("2026-11")).toHaveLength(0);
  });

  it("rejects a fare whose breakdown does not add up to the total", () => {
    expect(validateTrip(trip({ totalTry: 999 }))).toBe("fare_breakdown_mismatch");
  });

  it("rejects trips for unknown vehicles", async () => {
    expect(await recordTrip(trip())).toMatchObject({ ok: false, error: "vehicle_not_found" });
  });
});

describe("admin cash path", () => {
  it("refuses trip revenue entered by hand", async () => {
    const r = await appendAdminCashEvent(
      { type: "trip_revenue", amountTry: 1000, usdTry: RATE, occurredAt: T0, documentRef: "x" },
      "0xadmin"
    );
    expect(r).toMatchObject({ ok: false, error: "provider_only_type" });
  });

  it("requires a supporting document for every cost", async () => {
    const r = await appendAdminCashEvent({ type: "cleaning", amountTry: 200, usdTry: RATE, occurredAt: T0 }, "0xadmin");
    expect(r).toMatchObject({ ok: false, error: "document_ref_required" });
  });

  it("records costs as outflows with the admin who entered them", async () => {
    const r = await appendAdminCashEvent(
      { type: "charging", amountTry: 400, usdTry: RATE, occurredAt: T0, vehicleId: "v1", documentRef: "inv-1" },
      "0xadmin"
    );
    expect(r).toMatchObject({ ok: true, event: { amountUsd: -10, source: "admin", recordedBy: "0xadmin" } });
  });
});

describe("fleet registry", () => {
  it("closes a status span on every transition", async () => {
    await registerVehicle(vehicleInput("v1"), T0);
    await setVehicleStatus("v1", "available", T0 + 24 * H);
    await setVehicleStatus("v1", "maintenance", T0 + 48 * H);
    const spans = await listSpans("2026-11");
    expect(spans.map((s) => [s.status, (s.end - s.start) / H])).toEqual([
      ["acquiring", 24],
      ["available", 24],
    ]);
  });

  it("refuses an odometer that goes backwards", async () => {
    await registerVehicle(vehicleInput("v1"), T0);
    await setVehicleStatus("v1", "available", T0 + H, 100);
    expect(await setVehicleStatus("v1", "in_trip", T0 + 2 * H, 50)).toMatchObject({ ok: false, error: "odometer_decreased" });
  });
});

describe("NAV", () => {
  it("counts an unvalued car as zero, not at purchase price", () => {
    const v = { vehicleId: "v1", status: "available" } as Vehicle;
    const nav = computeNav({
      vehicles: [v],
      valuations: { v1: null },
      cashEvents: [],
      liabilitiesUsd: 0,
      shadowSupply: 100,
      takenAt: T0,
    });
    expect(nav).toMatchObject({ fleetValueUsd: 0, navUsd: 0, vehiclesMissingValuation: ["v1"] });
  });

  it("adds external valuations and cash, and divides by the shadow supply", async () => {
    await registerVehicle(vehicleInput("v1"), T0);
    await recordValuation({ vehicleId: "v1", valueTry: 1_000_000, usdTry: RATE, source: "index", valuer: "index-x", valuedAt: T0 }, T0);
    await recordTrip(trip());
    await appendAdminCashEvent(
      { type: "capital_in", amountTry: 400_000, usdTry: RATE, occurredAt: T0, documentRef: "bank-1" },
      "0xadmin"
    );
    await setRentalConfig({ shadowSupply: 350, liabilitiesUsd: 0 }, "0xadmin", T0);
    const snap = await takeNavSnapshot(T0 + 24 * H);
    // 25,000 (car) + 10,000 (capital) + 10 (trip) = 35,010
    expect(snap).toMatchObject({ fleetValueUsd: 25_000, cashUsd: 10_010, navUsd: 35_010, navPerToken: 100.0286 });
  });
});

describe("metrics", () => {
  it("reports utilisation, user charging and cross-zone trips per cell", () => {
    const period = { start: T0, end: T0 + 24 * H };
    const ev = { ...vehicleInput("v1"), status: "available", statusSince: T0, odometerKm: 0, createdAt: T0, updatedAt: T0 } as Vehicle;
    const hev = { ...vehicleInput("v2", "hev", "C"), status: "available", statusSince: T0, odometerKm: 0, createdAt: T0, updatedAt: T0 } as Vehicle;
    const trips = [
      trip({ tripId: "a", start: T0 + H, end: T0 + 3 * H }),
      trip({ tripId: "b", vehicleId: "v2", start: T0 + H, end: T0 + 2 * H, endZone: "europe", endedPluggedIn: undefined }),
    ];
    const m = computeMetrics(period, [ev, hev], trips, [], []);
    expect(m["EV-B"]).toMatchObject({ trips: 1, tripHours: 2, timeUtilisation: 0.0833, userChargeRatio: 1, crossZoneTripRatio: 1 });
    expect(m["HEV-C"]).toMatchObject({ trips: 1, userChargeRatio: null, crossZoneTripRatio: 0 });
    expect(m.ALL.trips).toBe(2);
  });
});

describe("generic provider adapter", () => {
  const body = JSON.stringify({ event: "trip.completed", data: {} });
  const sign = (b: string, s: string) => crypto.createHmac("sha256", s).update(b).digest("hex");
  const hdr = (sig: string) => ({ get: (n: string) => (n === "x-itera-signature" ? sig : null) }) as unknown as Headers;

  afterEach(() => delete process.env.RENTAL_WEBHOOK_SECRET);

  it("fails closed when no secret is configured", () => {
    expect(genericAdapter.verify(body, hdr(sign(body, "")))).toBe(false);
  });

  it("accepts a correct signature and rejects a wrong one", () => {
    process.env.RENTAL_WEBHOOK_SECRET = "s3cret";
    expect(genericAdapter.verify(body, hdr(sign(body, "s3cret")))).toBe(true);
    expect(genericAdapter.verify(body, hdr(sign(body, "other")))).toBe(false);
  });

  it("parses a completed trip into the ledger shape", () => {
    const raw = JSON.stringify({
      event: "trip.completed",
      data: {
        tripId: "t1", vehicleId: "v1", userRef: "u1",
        startedAt: "2026-11-01T10:00:00Z", endedAt: "2026-11-01T10:30:00Z",
        startZone: "europe", endZone: "europe", distanceKm: 5,
        fare: { timeFeeTry: 150, distanceFeeTry: 50 }, totalTry: 200, usdTry: 40, paymentStatus: "paid",
      },
    });
    const r = genericAdapter.parseTrip(raw, T0);
    expect(r).toMatchObject({ ok: true, trip: { tripId: "t1", fare: { discountTry: 0, surchargeTry: 0 } } });
  });
});
