// ============================================
// CASH LEDGER — Itera rental pilot
// Append-only record of every money movement of the fleet SPV.
// Trip revenue is written only by the provider integration; the admin path
// refuses it so revenue cannot be typed in or edited by hand (§3).
// ============================================

import * as crypto from "crypto";
import { KEYS, getRedis, parse, monthOf } from "./store";
import {
  CASH_EVENT_TYPES,
  INFLOW_TYPES,
  PROVIDER_ONLY_TYPES,
  toUsd,
  type CashEvent,
  type CashEventType,
  type CashSource,
} from "./types";

export interface AppendCashEventInput {
  type: CashEventType;
  amountTry: number;
  usdTry: number;
  occurredAt: number;
  vehicleId?: string;
  tripId?: string;
  documentRef?: string;
  note?: string;
  /** Deterministic id for idempotent writes (e.g. `trip:<tripId>`). */
  eventId?: string;
}

export type AppendResult =
  | { ok: true; event: CashEvent; duplicate: boolean }
  | { ok: false; error: string };

async function append(
  input: AppendCashEventInput,
  source: CashSource,
  recordedBy: string | undefined,
  now: number
): Promise<AppendResult> {
  if (!CASH_EVENT_TYPES.includes(input.type)) return { ok: false, error: "invalid_type" };
  if (!(input.amountTry > 0)) return { ok: false, error: "amount_must_be_positive" };
  if (!(input.usdTry > 0)) return { ok: false, error: "invalid_usd_rate" };

  const redis = getRedis();
  const eventId = input.eventId ?? `${input.type}:${crypto.randomUUID()}`;
  const usd = toUsd(input.amountTry, input.usdTry);
  const event: CashEvent = {
    eventId,
    type: input.type,
    vehicleId: input.vehicleId,
    tripId: input.tripId,
    amountTry: input.amountTry,
    usdTry: input.usdTry,
    amountUsd: INFLOW_TYPES.includes(input.type) ? usd : -usd,
    occurredAt: input.occurredAt,
    documentRef: input.documentRef,
    note: input.note,
    source,
    recordedBy,
    recordedAt: now,
  };

  // NX makes the write idempotent: a replayed webhook cannot double-count.
  const created = await redis.set(KEYS.cashEvent(eventId), JSON.stringify(event), { nx: true });
  if (created !== "OK") {
    const existing = parse<CashEvent>(await redis.get(KEYS.cashEvent(eventId)));
    return existing ? { ok: true, event: existing, duplicate: true } : { ok: false, error: "write_conflict" };
  }
  await redis.rpush(KEYS.cashByMonth(monthOf(event.occurredAt)), eventId);
  await redis.rpush(KEYS.cashLog, eventId);
  return { ok: true, event, duplicate: false };
}

/** Provider integration path: the only way trip revenue enters the ledger. */
export function appendProviderCashEvent(input: AppendCashEventInput, now = Date.now()) {
  return append(input, "provider", undefined, now);
}

/** Admin path: costs, capital, valuations-related sales, distributions. Never revenue. */
export async function appendAdminCashEvent(
  input: AppendCashEventInput,
  adminAddress: string,
  now = Date.now()
): Promise<AppendResult> {
  if (PROVIDER_ONLY_TYPES.includes(input.type)) return { ok: false, error: "provider_only_type" };
  if (!input.documentRef?.trim()) return { ok: false, error: "document_ref_required" };
  return append({ ...input, eventId: undefined }, "admin", adminAddress, now);
}

export async function listCashEvents(month: string): Promise<CashEvent[]> {
  const redis = getRedis();
  const ids = (await redis.lrange(KEYS.cashByMonth(month), 0, -1)) as string[];
  const out: CashEvent[] = [];
  for (const id of ids) {
    const e = parse<CashEvent>(await redis.get(KEYS.cashEvent(id)));
    if (e) out.push(e);
  }
  return out;
}

/** All events ever recorded, in write order. Used for the cash balance in NAV. */
export async function listAllCashEvents(): Promise<CashEvent[]> {
  const redis = getRedis();
  const ids = (await redis.lrange(KEYS.cashLog, 0, -1)) as string[];
  const out: CashEvent[] = [];
  for (const id of ids) {
    const e = parse<CashEvent>(await redis.get(KEYS.cashEvent(id)));
    if (e) out.push(e);
  }
  return out;
}
