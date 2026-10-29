// ============================================
// NAV ENGINE — Itera rental pilot (shadow token, §1 and §4)
// Fleet NAV = Σ latest external valuation of each non-disposed vehicle
//           + cash (signed sum of the cash ledger) − liabilities
// NAV per token = Fleet NAV / shadow supply. Nothing is minted during the
// pilot; the shadow supply is the number of tokens the capital would have
// bought at the launch price.
// ============================================

import { KEYS, getRedis, parse } from "./store";
import { listVehicles, latestValuation } from "./fleet-registry";
import { listAllCashEvents } from "./cash-ledger";
import type { CashEvent, NavSnapshot, Valuation, Vehicle } from "./types";

export interface RentalConfig {
  shadowSupply: number;
  liabilitiesUsd: number;
  updatedAt: number;
  updatedBy?: string;
}

export interface NavInput {
  vehicles: Vehicle[];
  valuations: Record<string, Valuation | null>;
  cashEvents: CashEvent[];
  liabilitiesUsd: number;
  shadowSupply: number;
  takenAt: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Pure: everything the NAV depends on is passed in, so it can be audited and tested. */
export function computeNav(input: NavInput): NavSnapshot {
  let fleetValueUsd = 0;
  let vehiclesValued = 0;
  const vehiclesMissingValuation: string[] = [];

  for (const v of input.vehicles) {
    if (v.status === "disposed") continue; // its sale proceeds are already in cash
    const val = input.valuations[v.vehicleId];
    if (!val) {
      // An unvalued car counts as zero rather than at purchase price: the
      // operator must not be able to carry a mark nobody external has given.
      vehiclesMissingValuation.push(v.vehicleId);
      continue;
    }
    fleetValueUsd += val.valueUsd;
    vehiclesValued++;
  }

  const cashUsd = input.cashEvents.reduce((s, e) => s + e.amountUsd, 0);
  const navUsd = fleetValueUsd + cashUsd - input.liabilitiesUsd;

  return {
    takenAt: input.takenAt,
    fleetValueUsd: round2(fleetValueUsd),
    cashUsd: round2(cashUsd),
    liabilitiesUsd: round2(input.liabilitiesUsd),
    navUsd: round2(navUsd),
    shadowSupply: input.shadowSupply,
    navPerToken: input.shadowSupply > 0 ? Math.round((navUsd / input.shadowSupply) * 10000) / 10000 : null,
    vehiclesValued,
    vehiclesMissingValuation,
  };
}

export async function getRentalConfig(): Promise<RentalConfig> {
  const c = parse<RentalConfig>(await getRedis().get(KEYS.config));
  return c ?? { shadowSupply: 0, liabilitiesUsd: 0, updatedAt: 0 };
}

export async function setRentalConfig(
  patch: Partial<Pick<RentalConfig, "shadowSupply" | "liabilitiesUsd">>,
  updatedBy: string,
  now = Date.now()
): Promise<{ ok: true; config: RentalConfig } | { ok: false; error: string }> {
  if (patch.shadowSupply !== undefined && !(patch.shadowSupply >= 0)) return { ok: false, error: "invalid_supply" };
  if (patch.liabilitiesUsd !== undefined && !(patch.liabilitiesUsd >= 0)) return { ok: false, error: "invalid_liabilities" };
  const config: RentalConfig = { ...(await getRentalConfig()), ...patch, updatedAt: now, updatedBy };
  await getRedis().set(KEYS.config, JSON.stringify(config));
  return { ok: true, config };
}

/** Compute today's NAV from the ledgers and store it in the daily series. */
export async function takeNavSnapshot(now = Date.now()): Promise<NavSnapshot> {
  const [vehicles, cashEvents, config] = await Promise.all([
    listVehicles(),
    listAllCashEvents(),
    getRentalConfig(),
  ]);
  const valuations: Record<string, Valuation | null> = {};
  for (const v of vehicles) valuations[v.vehicleId] = await latestValuation(v.vehicleId);

  const snapshot = computeNav({
    vehicles,
    valuations,
    cashEvents,
    liabilitiesUsd: config.liabilitiesUsd,
    shadowSupply: config.shadowSupply,
    takenAt: now,
  });
  await getRedis().rpush(KEYS.navDaily, JSON.stringify(snapshot));
  return snapshot;
}

export async function listNavSnapshots(limit = 400): Promise<NavSnapshot[]> {
  const rows = (await getRedis().lrange(KEYS.navDaily, -limit, -1)) as unknown[];
  return rows.map((r) => parse<NavSnapshot>(r)).filter((s): s is NavSnapshot => !!s);
}
