// ============================================
// ADMIN RENTAL API — Itera car-sharing pilot
// Vehicles, status, external valuations, non-revenue cash events, NAV and
// Kapı 1 metrics. Trip revenue cannot be entered here (§3).
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  registerVehicle,
  listVehicles,
  setVehicleStatus,
  recordValuation,
  listSpans,
  type RegisterVehicleInput,
} from "@/lib/rental/fleet-registry";
import { appendAdminCashEvent, listCashEvents } from "@/lib/rental/cash-ledger";
import { listTrips } from "@/lib/rental/trip-ledger";
import { getRentalConfig, setRentalConfig, takeNavSnapshot, listNavSnapshots } from "@/lib/rental/nav-engine";
import { computeMetrics } from "@/lib/rental/metrics";
import { monthsBetween } from "@/lib/rental/store";
import type { CashEventType, ValuationSource, VehicleStatus } from "@/lib/rental/types";

const STATUSES: VehicleStatus[] = [
  "acquiring", "available", "in_trip", "reserved", "servicing", "maintenance", "damaged", "disposed",
];
const VALUATION_SOURCES: ValuationSource[] = ["index", "appraisal", "sale"];

function monthRange(month: string): { start: number; end: number } | null {
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  const start = Date.parse(`${month}-01T00:00:00Z`);
  const d = new Date(start);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return { start, end: d.getTime() };
}

const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  try {
    const url = new URL(request.url);
    const section = url.searchParams.get("section") || "overview";
    const month = url.searchParams.get("month") || new Date().toISOString().slice(0, 7);

    switch (section) {
      case "vehicles":
        return NextResponse.json({ vehicles: await listVehicles() });
      case "trips":
        return NextResponse.json({ month, trips: await listTrips(month) });
      case "cash":
        return NextResponse.json({ month, events: await listCashEvents(month) });
      case "nav":
        return NextResponse.json({ config: await getRentalConfig(), snapshots: await listNavSnapshots() });
      case "metrics": {
        const period = monthRange(month);
        if (!period) return bad("invalid_month");
        const vehicles = await listVehicles();
        // Spans are filed by start month, so read back to the first acquisition.
        const first = vehicles.reduce((m, v) => Math.min(m, v.acquiredAt), period.start);
        const spans = (await Promise.all(monthsBetween(first, period.end - 1).map(listSpans))).flat();
        const [trips, cash] = await Promise.all([listTrips(month), listCashEvents(month)]);
        return NextResponse.json({ month, metrics: computeMetrics(period, vehicles, trips, spans, cash) });
      }
      case "overview":
      default: {
        const [vehicles, snapshots] = await Promise.all([listVehicles(), listNavSnapshots(1)]);
        const byStatus: Record<string, number> = {};
        for (const v of vehicles) byStatus[v.status] = (byStatus[v.status] || 0) + 1;
        return NextResponse.json({ vehicles: vehicles.length, byStatus, latestNav: snapshots[0] ?? null });
      }
    }
  } catch (error) {
    console.error("Admin rental GET error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response!;
  const admin = auth.address!;

  try {
    const body = await request.json();
    const action = body?.action as string;

    switch (action) {
      case "registerVehicle": {
        const v = body.vehicle as RegisterVehicleInput;
        if (!v?.vehicleId || !v.plate || !v.vin) return bad("vehicle_ids_required");
        if (!["ev", "hev"].includes(v.powertrain) || !["B", "C"].includes(v.segment)) return bad("invalid_cell");
        if (!["europe", "anatolia"].includes(v.zone)) return bad("invalid_zone");
        if (!(v.purchasePriceTry > 0) || !(v.purchaseUsdTry > 0)) return bad("invalid_purchase_price");
        const r = await registerVehicle(v);
        return r.ok ? NextResponse.json(r) : NextResponse.json(r, { status: 409 });
      }
      case "setStatus": {
        if (!STATUSES.includes(body.status)) return bad("invalid_status");
        const r = await setVehicleStatus(String(body.vehicleId), body.status, Date.now(), body.odometerKm);
        return r.ok ? NextResponse.json(r) : NextResponse.json(r, { status: 409 });
      }
      case "recordValuation": {
        if (!VALUATION_SOURCES.includes(body.source)) return bad("invalid_valuation_source");
        const r = await recordValuation({
          vehicleId: String(body.vehicleId),
          valueTry: Number(body.valueTry),
          usdTry: Number(body.usdTry),
          source: body.source,
          valuer: String(body.valuer ?? ""),
          valuedAt: Number(body.valuedAt) || Date.now(),
        });
        return r.ok ? NextResponse.json(r) : bad(r.error);
      }
      case "addCashEvent": {
        const r = await appendAdminCashEvent(
          {
            type: body.type as CashEventType,
            amountTry: Number(body.amountTry),
            usdTry: Number(body.usdTry),
            occurredAt: Number(body.occurredAt) || Date.now(),
            vehicleId: body.vehicleId || undefined,
            documentRef: body.documentRef,
            note: body.note,
          },
          admin
        );
        return r.ok ? NextResponse.json(r) : bad(r.error);
      }
      case "setConfig": {
        const r = await setRentalConfig(
          {
            shadowSupply: body.shadowSupply === undefined ? undefined : Number(body.shadowSupply),
            liabilitiesUsd: body.liabilitiesUsd === undefined ? undefined : Number(body.liabilitiesUsd),
          },
          admin
        );
        return r.ok ? NextResponse.json(r) : bad(r.error);
      }
      case "snapshotNav":
        return NextResponse.json({ ok: true, snapshot: await takeNavSnapshot() });
      default:
        return bad("unknown_action");
    }
  } catch (error) {
    console.error("Admin rental POST error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
