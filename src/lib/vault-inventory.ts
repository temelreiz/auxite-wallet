// src/lib/vault-inventory.ts
//
// Per-vault metal inventory + region routing.
//
// Each vault (zurich, istanbul, dubai, singapore, london) holds a per-metal
// amount of physical metal ("held", grams). As users buy, the bought grams are
// allocated to a vault chosen by the buyer's region, and that vault's "sold"
// counter goes up. Available = held - sold.
//
//   vault:hold:{METAL}   → Redis hash { vaultId: grams }   (total physical in vault)
//   vault:sold:{METAL}   → Redis hash { vaultId: grams }   (allocated to users)
//   vault:hold:init      → "1" once holdings are seeded (guards the reconciler)
//
// Σ held per metal == on-chain totalSupply target (what the reconciler mints to).
//
// Routing (NO jurisdiction restriction — region only picks the *preferred* vault;
// if it can't cover the amount we walk outward to the nearest available vault):
//   Europe + Americas → Istanbul, then Zurich …
//   Middle East       → Dubai …
//   Far East / APAC   → Singapore …
// Buyer region comes from KYC address.country.

import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export type Metal = "AUXG" | "AUXS" | "AUXPT" | "AUXPD";
export const METALS: Metal[] = ["AUXG", "AUXS", "AUXPT", "AUXPD"];

const HOLD_KEY = (m: Metal) => `vault:hold:${m}`;
const SOLD_KEY = (m: Metal) => `vault:sold:${m}`;
const INIT_FLAG = "vault:hold:init";

// All known vault ids (must match website:vaults ids). Order = default proximity.
export const ALL_VAULT_IDS = ["zurich", "istanbul", "dubai", "singapore", "london"] as const;
export type VaultId = (typeof ALL_VAULT_IDS)[number];

// Nearest-vault fallback order per home vault (geographic proximity).
const FALLBACK_ORDER: Record<VaultId, VaultId[]> = {
  singapore: ["singapore", "dubai", "istanbul", "zurich", "london"],
  dubai: ["dubai", "istanbul", "singapore", "zurich", "london"],
  istanbul: ["istanbul", "zurich", "dubai", "london", "singapore"],
  zurich: ["zurich", "istanbul", "london", "dubai", "singapore"],
  london: ["london", "zurich", "istanbul", "dubai", "singapore"],
};

// ── Region → home vault ────────────────────────────────────────────────────
// Accepts ISO-2 codes or common country names (KYC address.country is free-ish).
const APAC = new Set([
  "SG","SINGAPORE","CN","CHINA","JP","JAPAN","KR","SOUTH KOREA","KOREA","MY","MALAYSIA",
  "ID","INDONESIA","TH","THAILAND","VN","VIETNAM","PH","PHILIPPINES","HK","HONG KONG",
  "TW","TAIWAN","IN","INDIA","AU","AUSTRALIA","NZ","NEW ZEALAND","BD","BANGLADESH",
  "PK","PAKISTAN","LK","SRI LANKA","KH","CAMBODIA","LA","LAOS","MM","MYANMAR","BN","BRUNEI",
  "MN","MONGOLIA","NP","NEPAL","MO","MACAU","MV","MALDIVES","FJ","PG",
]);
const MIDDLE_EAST = new Set([
  "AE","UAE","UNITED ARAB EMIRATES","SA","SAUDI ARABIA","QA","QATAR","KW","KUWAIT",
  "BH","BAHRAIN","OM","OMAN","JO","JORDAN","LB","LEBANON","IQ","IRAQ","IR","IRAN",
  "IL","ISRAEL","YE","YEMEN","SY","SYRIA","PS","PALESTINE","EG","EGYPT",
]);
// Europe + Americas (and default-ish West). Turkey handled explicitly → istanbul.
const EUROPE_AMERICAS = new Set([
  "TR","TURKEY","TÜRKIYE","TURKIYE","GB","UK","UNITED KINGDOM","IE","IRELAND",
  "DE","GERMANY","FR","FRANCE","ES","SPAIN","IT","ITALY","PT","PORTUGAL","NL","NETHERLANDS",
  "BE","BELGIUM","LU","LUXEMBOURG","CH","SWITZERLAND","AT","AUSTRIA","SE","SWEDEN",
  "NO","NORWAY","DK","DENMARK","FI","FINLAND","IS","ICELAND","PL","POLAND","CZ","SK",
  "HU","HUNGARY","RO","ROMANIA","BG","BULGARIA","GR","GREECE","HR","SI","RS","SERBIA",
  "UA","UKRAINE","RU","RUSSIA","EE","LV","LT","CY","CYPRUS","MT","MALTA",
  "US","USA","UNITED STATES","CA","CANADA","MX","MEXICO","BR","BRAZIL","AR","ARGENTINA",
  "CL","CHILE","CO","COLOMBIA","PE","PERU","UY","URUGUAY","VE","ZA","SOUTH AFRICA","NG","MA",
]);

function normCountry(country?: string | null): string {
  return String(country || "").trim().toUpperCase();
}

/** Home vault for a buyer's country (null → unknown, caller uses default order). */
export function homeVaultForCountry(country?: string | null): VaultId | null {
  const c = normCountry(country);
  if (!c) return null;
  if (APAC.has(c)) return "singapore";
  if (MIDDLE_EAST.has(c)) return "dubai";
  if (EUROPE_AMERICAS.has(c)) return "istanbul";
  return null;
}

// ── Active vaults (from website:vaults; inactive ones are skipped) ──────────
async function activeVaultIds(): Promise<Set<string>> {
  try {
    const vaults = (await redis.get("website:vaults")) as Array<{ id: string; status: string }> | null;
    if (Array.isArray(vaults) && vaults.length) {
      return new Set(vaults.filter((v) => v.status === "active").map((v) => v.id));
    }
  } catch (e) {
    console.error("[vault-inv] activeVaultIds failed:", e);
  }
  // Fallback: everything except london.
  return new Set(["zurich", "istanbul", "dubai", "singapore"]);
}

// ── Reads ───────────────────────────────────────────────────────────────────
function hashToNum(h: Record<string, unknown> | null): Record<string, number> {
  const out: Record<string, number> = {};
  if (h) for (const [k, v] of Object.entries(h)) {
    const n = parseFloat(String(v));
    if (Number.isFinite(n)) out[k] = n;
  }
  return out;
}

export async function getHeld(m: Metal): Promise<Record<string, number>> {
  return hashToNum((await redis.hgetall(HOLD_KEY(m))) as any);
}
export async function getSold(m: Metal): Promise<Record<string, number>> {
  return hashToNum((await redis.hgetall(SOLD_KEY(m))) as any);
}

/** Σ held per metal — the canonical totalSupply target for the reconciler. */
export async function getVaultTotals(): Promise<Record<Metal, number>> {
  const out = { AUXG: 0, AUXS: 0, AUXPT: 0, AUXPD: 0 } as Record<Metal, number>;
  for (const m of METALS) {
    const held = await getHeld(m);
    out[m] = Object.values(held).reduce((a, b) => a + b, 0);
  }
  return out;
}

export async function isInitialized(): Promise<boolean> {
  return (await redis.get(INIT_FLAG)) === "1";
}

/** Full per-vault, per-metal view for the admin UI. */
export async function getInventoryView(): Promise<
  Array<{ vaultId: string; metals: Record<Metal, { held: number; sold: number; available: number }> }>
> {
  const held: Record<Metal, Record<string, number>> = {} as any;
  const sold: Record<Metal, Record<string, number>> = {} as any;
  for (const m of METALS) { held[m] = await getHeld(m); sold[m] = await getSold(m); }

  return ALL_VAULT_IDS.map((vid) => {
    const metals = {} as Record<Metal, { held: number; sold: number; available: number }>;
    for (const m of METALS) {
      const h = held[m][vid] || 0;
      const s = sold[m][vid] || 0;
      metals[m] = { held: h, sold: s, available: h - s };
    }
    return { vaultId: vid, metals };
  });
}

// ── Writes ───────────────────────────────────────────────────────────────────
/** Set a vault's held grams for one metal (admin entry). */
export async function setHeld(m: Metal, vaultId: string, grams: number): Promise<void> {
  if (!Number.isFinite(grams) || grams < 0) throw new Error(`Invalid grams for ${m}/${vaultId}`);
  await redis.hset(HOLD_KEY(m), { [vaultId]: grams });
  await redis.set(INIT_FLAG, "1");
}

/** Bulk set held grams: { AUXG: { zurich: 100, ... }, ... }. */
export async function setHeldBulk(data: Partial<Record<Metal, Record<string, number>>>): Promise<void> {
  for (const m of METALS) {
    const byVault = data[m];
    if (!byVault) continue;
    const upd: Record<string, number> = {};
    for (const [vid, g] of Object.entries(byVault)) {
      const n = Number(g);
      if (Number.isFinite(n) && n >= 0) upd[vid] = n;
    }
    if (Object.keys(upd).length) await redis.hset(HOLD_KEY(m), upd);
  }
  await redis.set(INIT_FLAG, "1");
}

/**
 * One-time seed so Σ held == current on-chain target (keeps the reconciler a
 * no-op). Puts each metal's whole amount into the primary vault; the founder
 * then redistributes to reality via the admin UI. Idempotent.
 */
export async function seedHoldingsIfEmpty(targets: Record<Metal, number>, primary: VaultId = "zurich"): Promise<boolean> {
  if (await isInitialized()) return false;
  for (const m of METALS) {
    await redis.hset(HOLD_KEY(m), { [primary]: Number(targets[m]) || 0 });
  }
  await redis.set(INIT_FLAG, "1");
  return true;
}

// ── Routing + deduction (called from the buy flow; best-effort) ──────────────
export interface RouteResult {
  metal: Metal;
  grams: number;
  country: string | null;
  homeVault: VaultId | null;
  allocations: Array<{ vaultId: string; grams: number }>;
  shortfall: number; // grams that no active vault could cover (still booked to home)
}

/**
 * Allocate `grams` of `metal` to vault(s) by region, walking outward to the
 * nearest available vault, and increment each vault's "sold" counter.
 * NEVER throws — returns a result (or a no-op result on error).
 */
export async function routeAndDeductSale(
  metal: Metal,
  grams: number,
  country?: string | null
): Promise<RouteResult> {
  const result: RouteResult = {
    metal, grams, country: country ?? null,
    homeVault: homeVaultForCountry(country),
    allocations: [], shortfall: 0,
  };
  try {
    if (!(grams > 0)) return result;
    const active = await activeVaultIds();
    const home: VaultId = result.homeVault ?? "istanbul";
    const order = (FALLBACK_ORDER[home] || ALL_VAULT_IDS).filter((v) => active.has(v));
    const fallbackHome = order[0] ?? home;

    const held = await getHeld(metal);
    const sold = await getSold(metal);

    let remaining = grams;
    const inc: Record<string, number> = {};
    for (const vid of order) {
      if (remaining <= 0) break;
      const avail = (held[vid] || 0) - (sold[vid] || 0);
      if (avail <= 0) continue;
      const take = Math.min(avail, remaining);
      inc[vid] = (inc[vid] || 0) + take;
      remaining -= take;
    }
    // Insufficient global stock → book the remainder to the home vault (goes
    // negative-available, surfaced as shortfall) so the sale is still recorded.
    if (remaining > 1e-9) {
      inc[fallbackHome] = (inc[fallbackHome] || 0) + remaining;
      result.shortfall = remaining;
      remaining = 0;
    }

    for (const [vid, g] of Object.entries(inc)) {
      await redis.hincrbyfloat(SOLD_KEY(metal), vid, g);
      result.allocations.push({ vaultId: vid, grams: g });
    }
  } catch (e) {
    console.error("[vault-inv] routeAndDeductSale failed (non-blocking):", e);
  }
  return result;
}

/** Reverse a sale (redeem/refund): decrement sold from the given vault(s). */
export async function returnSaleToVault(
  metal: Metal,
  grams: number,
  preferVault?: string | null
): Promise<void> {
  try {
    if (!(grams > 0)) return;
    const sold = await getSold(metal);
    let remaining = grams;
    // Return to the preferred vault first, then wherever the most is sold.
    const order = [
      ...(preferVault ? [preferVault] : []),
      ...Object.keys(sold).sort((a, b) => (sold[b] || 0) - (sold[a] || 0)),
    ];
    const seen = new Set<string>();
    for (const vid of order) {
      if (remaining <= 0) break;
      if (seen.has(vid)) continue;
      seen.add(vid);
      const cur = sold[vid] || 0;
      if (cur <= 0) continue;
      const give = Math.min(cur, remaining);
      await redis.hincrbyfloat(SOLD_KEY(metal), vid, -give);
      remaining -= give;
    }
  } catch (e) {
    console.error("[vault-inv] returnSaleToVault failed (non-blocking):", e);
  }
}
