// src/lib/auxr-ap.ts
//
// Authorised participants (APs) — market makers that create and redeem AUXR
// at NAV ± a narrow spread, the way ETF APs do.
//
// Why: on every venue AUXR holds $400–750 within 2% of NAV. A maker quotes
// that little because it cannot rebalance cheaply: the app charges 125 bps
// each way and an on-chain withdrawal waits hours for a Safe signature. An AP
// buys and sells at NAV ± AUXR_AP_SPREAD (25 bps) and takes AUXR on-chain
// from a pre-minted inventory wallet straight away, so it can quote size and
// arbitrage the venues back to NAV — real two-way flow, every unit created or
// redeemed through us.
//
// Controls:
//   - An AP is an Auxite account listed here by an admin, with ONE on-chain
//     destination (its exchange deposit address). Inventory never goes
//     anywhere else, so a stolen AP login cannot send AUXR to a new wallet.
//   - The inventory wallet only holds AUXR; it has no role on the contract.
//     Minting stays with the admin Safe, which refills it in batches. The
//     most a compromised inventory key can lose is what it holds. Its key is
//     AUXR_AP_INVENTORY_PRIVATE_KEY (scripts/setup-ap-inventory.mjs writes it
//     to Vercel without printing it) — AWS KMS is no longer in use.
//   - Per-AP daily withdrawal cap.
//   - Every AP buy and sell emails the hedge desk the grams to buy or sell,
//     because AUXR issued here is not hedged automatically.
//
// Redeeming needs nothing new: the AP sends AUXR to the deposit address (the
// scanner credits and burns it) and sells at the AP spread.

import { getRedis } from "@/lib/redis";
import { sendEmail } from "@/lib/email";
import { AUXR_GRAMS_PER_UNIT } from "@/lib/auxr-pricing";
import { AUXR_CONTRACT_ADDRESS, getOnChainBalance, weiToAuxr } from "@/lib/auxr-onchain";
import { recordBurn, recordMint } from "@/lib/auxr-reserve";
import { acquireBalanceLock, releaseBalanceLock } from "@/lib/balance-lock";
import { ethers } from "ethers";
import type { Address } from "viem";

/** Spread charged to APs on each side, as a fraction of NAV. */
export const AP_SPREAD = Number(process.env.AUXR_AP_SPREAD ?? 0.0025);
/** AUXR an AP may take from inventory per UTC day. */
export const AP_DAILY_CAP = Number(process.env.AUXR_AP_DAILY_CAP ?? 300);
/** Inventory size the Safe tops up to; below LOW the hedge desk is told. */
export const INVENTORY_TARGET = Number(process.env.AUXR_AP_INVENTORY_TARGET ?? 600);
export const INVENTORY_LOW = Number(process.env.AUXR_AP_INVENTORY_LOW ?? 150);

const HEDGE_EMAIL = process.env.AUXR_HEDGE_EMAIL || "bs@auxite.io";
const AP_KEY = "auxr:ap:accounts";
const FLOWS_KEY = "auxr:ap:flows";
const NET_KEY = "auxr:ap:net-units";
const BASE_RPC = process.env.BASE_RPC_URL || "https://mainnet.base.org";

export interface ApAccount {
  address: string;      // Auxite account (off-chain ledger key)
  label: string;        // e.g. "Pionex MM"
  destination: string;  // the only on-chain address inventory may go to
  addedAt: number;
}

function parse<T>(v: unknown): T | null {
  if (!v) return null;
  try { return typeof v === "string" ? (JSON.parse(v) as T) : (v as T); } catch { return null; }
}

// ── Registry ─────────────────────────────────────────────────────────────────

export async function getAp(address: string): Promise<ApAccount | null> {
  return parse<ApAccount>(await getRedis().hget(AP_KEY, address.toLowerCase()));
}

export async function listAps(): Promise<ApAccount[]> {
  const all = ((await getRedis().hgetall(AP_KEY)) || {}) as Record<string, unknown>;
  return Object.values(all).map((v) => parse<ApAccount>(v)).filter((x): x is ApAccount => !!x);
}

export async function setAp(ap: Omit<ApAccount, "addedAt">): Promise<ApAccount> {
  const rec: ApAccount = {
    address: ap.address.toLowerCase(),
    label: ap.label,
    destination: ap.destination.toLowerCase(),
    addedAt: Date.now(),
  };
  await getRedis().hset(AP_KEY, { [rec.address]: JSON.stringify(rec) });
  return rec;
}

export async function removeAp(address: string): Promise<void> {
  const a = address.toLowerCase();
  await getRedis().hdel(AP_KEY, a);
  for (const s of await listApSources(a)) await removeApSource(s.source);
}

// ── Source addresses (redeem attribution) ────────────────────────────────────
//
// The deposit scanner credits a deposit only when it comes from a known user
// wallet. An AP's AUXR sits on an exchange and leaves from the exchange's hot
// wallet, so its redemptions landed in manual review. An AP registers its own
// wallets (the ones it withdraws to from the exchange) as sources; deposits
// from them are credited to the AP.
//
// Controls:
//   - A source maps to one AP and can't be a user's wallet (the scanner checks
//     user wallets first anyway) or the AP's exchange destination.
//   - A new source is only honoured after AP_SOURCE_COOLDOWN_MS. A deposit
//     sent sooner stays in manual review, so a hijacked admin session can't
//     redirect deposits the moment it adds an address.
//   - Tainted addresses (auxr-taint) are never credited through this path.
// Crediting only ever moves AUXR the AP actually sent; nothing is minted.

const SOURCES_KEY = "auxr:ap:sources"; // hash: source → ApSource JSON

/** Hours a newly added source waits before deposits from it are credited. */
export const AP_SOURCE_COOLDOWN_MS = Number(process.env.AUXR_AP_SOURCE_COOLDOWN_HOURS ?? 24) * 60 * 60 * 1000;

export interface ApSource {
  source: string;     // on-chain wallet the AP redeems from
  apAddress: string;  // AP's Auxite account
  addedAt: number;
  activeAt: number;   // addedAt + cooldown
}

export async function listApSources(apAddress?: string): Promise<ApSource[]> {
  const all = ((await getRedis().hgetall(SOURCES_KEY)) || {}) as Record<string, unknown>;
  const list = Object.values(all).map((v) => parse<ApSource>(v)).filter((x): x is ApSource => !!x);
  return apAddress ? list.filter((s) => s.apAddress === apAddress.toLowerCase()) : list;
}

export type AddApSourceResult =
  | { ok: true; source: ApSource }
  | { ok: false; error: "ap_not_found" | "source_is_destination" | "source_taken" };

export async function addApSource(apAddress: string, source: string, now = Date.now()): Promise<AddApSourceResult> {
  const ap = await getAp(apAddress);
  if (!ap) return { ok: false, error: "ap_not_found" };
  const s = source.toLowerCase();
  if (s === ap.destination) return { ok: false, error: "source_is_destination" };
  const rec: ApSource = { source: s, apAddress: ap.address, addedAt: now, activeAt: now + AP_SOURCE_COOLDOWN_MS };
  // hsetnx: a source already mapped (to this or another AP) is never re-pointed
  // or re-timed; remove it first.
  const set = await getRedis().hsetnx(SOURCES_KEY, s, JSON.stringify(rec));
  if (!set) return { ok: false, error: "source_taken" };
  return { ok: true, source: rec };
}

export async function removeApSource(source: string): Promise<void> {
  await getRedis().hdel(SOURCES_KEY, source.toLowerCase());
}

export type ApSourceMatch =
  | { status: "active"; ap: ApAccount; source: ApSource }
  | { status: "cooling_down"; source: ApSource }
  | { status: "none" };

/** Resolve a depositing wallet to an AP through its registered sources. */
export async function resolveApSource(fromAddress: string, now = Date.now()): Promise<ApSourceMatch> {
  const src = parse<ApSource>(await getRedis().hget(SOURCES_KEY, fromAddress.toLowerCase()));
  if (!src) return { status: "none" };
  const ap = await getAp(src.apAddress);
  if (!ap) return { status: "none" };
  if (now < src.activeAt) return { status: "cooling_down", source: src };
  return { status: "active", ap, source: src };
}

// ── Inventory wallet ─────────────────────────────────────────────────────────

function inventorySigner(provider?: ethers.Provider): ethers.Wallet | null {
  const key = process.env.AUXR_AP_INVENTORY_PRIVATE_KEY;
  if (!key) return null;
  return new ethers.Wallet(key.startsWith("0x") ? key : `0x${key}`, provider);
}

/** Address of the inventory wallet, or null until its key is configured. */
export async function existingInventoryAddress(): Promise<string | null> {
  return inventorySigner()?.address.toLowerCase() ?? null;
}

/** Same as existingInventoryAddress, but a missing key is an error. */
export async function inventoryAddress(): Promise<string> {
  const a = await existingInventoryAddress();
  if (!a) throw new Error("AUXR_AP_INVENTORY_PRIVATE_KEY is not set");
  return a;
}

export async function inventoryUnits(): Promise<number> {
  const addr = await existingInventoryAddress();
  if (!addr) return 0;
  return weiToAuxr(await getOnChainBalance(addr as Address));
}

/** Transfer AUXR from inventory and wait for one confirmation. */
async function transferFromInventory(to: string, units: number): Promise<{ success: boolean; txHash: string; error?: string }> {
  const provider = new ethers.JsonRpcProvider(BASE_RPC);
  const signer = inventorySigner(provider);
  if (!signer) return { success: false, txHash: "", error: "inventory key not configured" };
  const token = new ethers.Contract(
    AUXR_CONTRACT_ADDRESS,
    ["function transfer(address to, uint256 amount) returns (bool)"],
    signer,
  );
  const tx = await token.transfer(to, ethers.parseUnits(units.toFixed(18), 18));
  const receipt = await tx.wait(1);
  return receipt?.status === 1
    ? { success: true, txHash: tx.hash }
    : { success: false, txHash: tx.hash, error: "transfer reverted" };
}

// ── Hedge desk ───────────────────────────────────────────────────────────────

/**
 * Record an AP buy or sell and tell the hedge desk what to do. Buy = we owe
 * more metal exposure (buy the grams); sell = we owe less (sell them).
 */
export async function recordApFlow(p: {
  side: "buy" | "sell";
  ap: ApAccount;
  units: number;
  navUSD: number;
  priceUSD: number;
  refId?: string;
}): Promise<void> {
  const r = getRedis();
  const signed = p.side === "buy" ? p.units : -p.units;
  const net = Number(await r.incrbyfloat(NET_KEY, signed));
  await r.lpush(FLOWS_KEY, JSON.stringify({ at: Date.now(), ...p, ap: p.ap.label, address: p.ap.address, net }));
  await r.ltrim(FLOWS_KEY, 0, 999);

  const verb = p.side === "buy" ? "AL" : "SAT";
  const rows = (Object.keys(AUXR_GRAMS_PER_UNIT) as (keyof typeof AUXR_GRAMS_PER_UNIT)[])
    .map((m) => `<tr><td>${m}</td><td style="text-align:right">${(p.units * AUXR_GRAMS_PER_UNIT[m]).toFixed(3)} g</td></tr>`)
    .join("");
  await sendEmail({
    to: HEDGE_EMAIL,
    subject: `AUXR hedge: ${verb} ${p.units.toFixed(4)} AUXR karşılığı metal (${p.ap.label})`,
    html:
      `<p><b>${p.ap.label}</b> ${p.side === "buy" ? "AUXR aldı" : "AUXR sattı"}: <b>${p.units.toFixed(4)} AUXR</b> ` +
      `@ $${p.priceUSD.toFixed(3)} (NAV $${p.navUSD.toFixed(3)}).</p>` +
      `<p>Hedge için <b>${verb}</b>:</p><table cellpadding="4">${rows}</table>` +
      `<p>AP net pozisyonu (hedge edilmesi gereken toplam): <b>${net.toFixed(4)} AUXR</b> ≈ $${(net * p.navUSD).toFixed(0)}</p>` +
      (p.refId ? `<p style="color:#888">ref ${p.refId}</p>` : ""),
  }).catch(() => {});
}

export async function apNetUnits(): Promise<number> {
  return Number((await getRedis().get(NET_KEY)) ?? 0);
}

export async function recentApFlows(limit = 50): Promise<unknown[]> {
  return ((await getRedis().lrange(FLOWS_KEY, 0, limit - 1)) as unknown[]).map((x) => parse(x) ?? x);
}

// ── Withdraw from inventory ──────────────────────────────────────────────────

export type InventoryWithdrawResult =
  | { ok: true; txHash: string; units: number; destination: string; replay?: boolean }
  | { ok: false; status: number; error: string; detail?: Record<string, unknown> };

/**
 * Move `units` of an AP's off-chain AUXR to its registered destination by
 * transferring from inventory — no mint, no Safe wait. Off-chain balance is
 * debited and the reserve ledger burned first; if the transfer fails both
 * are restored.
 */
export async function withdrawFromInventory(p: {
  ap: ApAccount;
  units: number;
  refId: string;
}): Promise<InventoryWithdrawResult> {
  const r = getRedis();
  const idemKey = `auxr:ap:withdraw:${p.refId}`;
  const prior = parse<{ state: string; txHash?: string }>(await r.get(idemKey));
  if (prior?.state === "completed" && prior.txHash) {
    return { ok: true, txHash: prior.txHash, units: p.units, destination: p.ap.destination, replay: true };
  }
  if (prior) return { ok: false, status: 409, error: "withdraw_in_progress" };

  const day = new Date().toISOString().slice(0, 10);
  const capKey = `auxr:ap:daily:${p.ap.address}:${day}`;
  const used = Number(await r.incrbyfloat(capKey, p.units));
  await r.expire(capKey, 2 * 86400);
  if (used > AP_DAILY_CAP + 1e-9) {
    await r.incrbyfloat(capKey, -p.units);
    return { ok: false, status: 400, error: "ap_daily_cap", detail: { cap: AP_DAILY_CAP, used: used - p.units } };
  }
  const refundCap = () => r.incrbyfloat(capKey, -p.units).catch(() => {});

  const inv = await inventoryUnits().catch(() => 0);
  if (inv < p.units - 1e-9) {
    await refundCap();
    return { ok: false, status: 503, error: "inventory_low", detail: { available: inv } };
  }

  const lock = await acquireBalanceLock(p.ap.address, "auxr-ap-withdraw");
  if (!lock) {
    await refundCap();
    return { ok: false, status: 409, error: "balance_busy" };
  }
  const balanceKey = `user:${p.ap.address}:balance`;
  try {
    const bal = Number((await r.hget(balanceKey, "auxr")) ?? 0);
    if (bal < p.units - 1e-9) {
      await refundCap();
      return { ok: false, status: 400, error: "insufficient_balance", detail: { available: bal } };
    }
    if ((await r.set(idemKey, JSON.stringify({ state: "debited" }), { nx: true, ex: 30 * 86400 })) === null) {
      await refundCap();
      return { ok: false, status: 409, error: "withdraw_in_progress" };
    }
    await r.hincrbyfloat(balanceKey, "auxr", -p.units);
    await recordBurn({
      unitsAUXR: p.units,
      refId: `ap-withdraw:${p.refId}`,
      walletAddress: p.ap.address,
      reason: `AP inventory withdraw to ${p.ap.destination}`,
    }).catch((e) => console.error("[auxr-ap] recordBurn failed", e));
  } finally {
    await releaseBalanceLock(lock);
  }

  const sent = await transferFromInventory(p.ap.destination, p.units)
    .catch((e) => ({ txHash: "", success: false, error: String(e?.message || e) }));

  if (!sent.success) {
    // Put everything back; the AP keeps its off-chain AUXR.
    await r.hincrbyfloat(balanceKey, "auxr", p.units);
    await recordMint({
      unitsAUXR: p.units,
      refId: `ap-withdraw-revert:${p.refId}`,
      walletAddress: p.ap.address,
      reason: `AP inventory withdraw failed, restored`,
    }).catch(() => {});
    await refundCap();
    await r.set(idemKey, JSON.stringify({ state: "failed", error: sent.error }), { ex: 30 * 86400 });
    return { ok: false, status: 502, error: "transfer_failed", detail: { reason: sent.error } };
  }

  await r.set(idemKey, JSON.stringify({ state: "completed", txHash: sent.txHash }), { ex: 30 * 86400 });
  await maybeWarnInventoryLow().catch(() => {});
  return { ok: true, txHash: sent.txHash, units: p.units, destination: p.ap.destination };
}

/** Email once when inventory crosses below INVENTORY_LOW; re-arm on refill. */
async function maybeWarnInventoryLow(): Promise<void> {
  const r = getRedis();
  const units = await inventoryUnits();
  const state = units < INVENTORY_LOW ? "low" : "ok";
  const prev = (await r.get("auxr:state:ap-inventory")) as string | null;
  if (prev === state) return;
  await r.set("auxr:state:ap-inventory", state);
  if (state !== "low") return;
  const addr = await existingInventoryAddress();
  await sendEmail({
    to: HEDGE_EMAIL,
    subject: `AUXR AP envanteri azaldı: ${units.toFixed(2)} AUXR`,
    html:
      `<p>AP envanter cüzdanında <b>${units.toFixed(2)} AUXR</b> kaldı (eşik ${INVENTORY_LOW}).</p>` +
      `<p>Safe'ten <code>${addr}</code> adresine ~${Math.max(0, INVENTORY_TARGET - units).toFixed(0)} AUXR basarak ${INVENTORY_TARGET}'e tamamla.</p>`,
  });
}
