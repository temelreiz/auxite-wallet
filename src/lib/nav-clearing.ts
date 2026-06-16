// src/lib/nav-clearing.ts
//
// OFF-CHAIN NAV clearing venue — the ledger twin of the on-chain Trutina
// clearing house. Single price = attested NAV (spread-free), users place
// sell/buy orders, matched FIFO user-to-user, Auxite backstops the sell side
// (guaranteed NAV exit). Settles by moving Redis custodial balances. 50 bps
// seller-side fee → treasury. NO AMM, no spread.
//
// Differs from lib/matching-engine.ts (a risk/hedge layer that captures spread
// and never touches balances): this engine clears at ONE NAV and settles funds.
//
// HARD-GATED: disabled unless NAV_CLEARING_ENABLED=true. Touches real custodial
// balances — keep off until reviewed + validated on a test account.

import { Redis } from "@upstash/redis";
import { isKycVerified } from "./kyc-limits";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const NAV_CLEARING_ENABLED = process.env.NAV_CLEARING_ENABLED === "true";

const FEE_BPS = Number(process.env.NAV_CLEARING_FEE_BPS ?? "50"); // seller-side
const BACKSTOP_ENABLED = (process.env.NAV_CLEARING_BACKSTOP ?? "true") === "true";
const METALS = new Set(["AUXG", "AUXS", "AUXPT", "AUXPD"]);
const AUXITE_INVENTORY = "auxite-nav-inventory"; // pseudo-account that holds backstop-bought metal

const KEYS = {
  userBalance: (addr: string) => `user:${addr.toLowerCase()}:balance`,
  sellQ: (m: string) => `nav:sellq:${m.toUpperCase()}`,
  buyQ: (m: string) => `nav:buyq:${m.toUpperCase()}`,
  order: (id: string) => `nav:order:${id}`,
  treasury: (m: string) => `nav:treasury:${m.toUpperCase()}`,
  inventory: (m: string) => `nav:inventory:${m.toUpperCase()}`,
  lock: (m: string) => `nav:lock:${m.toUpperCase()}`,
  seq: "nav:seq",
  txLog: (addr: string) => `user:${addr.toLowerCase()}:transactions`,
};

export type Side = "buy" | "sell";

export interface NavOrder {
  id: string;
  side: Side;
  metal: string;
  maker: string;
  // Sell: grams of metal escrowed & remaining. Buy: AUXM escrowed & remaining.
  remaining: number;
  createdAt: number;
  status: "open" | "partial" | "filled" | "cancelled";
}

const round = (n: number, dp = 6) => Math.round(n * 10 ** dp) / 10 ** dp;

/** Single spread-free NAV (USD per gram) = mid of cost-basis buy/sell. */
export async function getNav(metal: string): Promise<number> {
  const { getMetalUsdPrice } = await import("./price-cache");
  const m = metal.toUpperCase();
  const buy = await getMetalUsdPrice(m, "buy");
  const sell = await getMetalUsdPrice(m, "sell");
  const nav = (Number(buy) + Number(sell)) / 2;
  if (!Number.isFinite(nav) || nav <= 0) throw new Error(`bad NAV for ${m}`);
  return nav;
}

async function acquireLock(metal: string): Promise<boolean> {
  // SET NX EX — only one clear pass per metal at a time.
  const ok = await redis.set(KEYS.lock(metal), "1", { nx: true, ex: 8 });
  return ok === "OK" || ok === true;
}
async function releaseLock(metal: string) {
  await redis.del(KEYS.lock(metal));
}

async function balOf(addr: string, field: string): Promise<number> {
  const bal = await redis.hget(KEYS.userBalance(addr), field.toLowerCase());
  return parseFloat((bal as string) || "0");
}
function credit(addr: string, field: string, amt: number) {
  return redis.hincrbyfloat(KEYS.userBalance(addr), field.toLowerCase(), round(amt));
}
function debit(addr: string, field: string, amt: number) {
  return redis.hincrbyfloat(KEYS.userBalance(addr), field.toLowerCase(), -round(amt));
}

async function logTx(addr: string, tx: Record<string, unknown>) {
  await redis.lpush(KEYS.txLog(addr), JSON.stringify(tx));
  await redis.ltrim(KEYS.txLog(addr), 0, 99);
}

async function loadOrder(id: string): Promise<NavOrder | null> {
  const raw = await redis.get(KEYS.order(id));
  return raw ? (typeof raw === "string" ? JSON.parse(raw) : (raw as NavOrder)) : null;
}
async function saveOrder(o: NavOrder) {
  await redis.set(KEYS.order(o.id), JSON.stringify(o));
}

/** Advance a queue past dead (filled/cancelled) heads; returns the head order or null. */
async function headOrder(queueKey: string): Promise<NavOrder | null> {
  // We peek; dead heads are popped lazily here.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const id = (await redis.lindex(queueKey, 0)) as string | null;
    if (!id) return null;
    const o = await loadOrder(id);
    if (!o || o.status === "filled" || o.status === "cancelled") {
      await redis.lpop(queueKey);
      continue;
    }
    return o;
  }
}

export interface PlaceResult {
  orderId: string;
  matchedGrams: number;
  status: NavOrder["status"];
}

/**
 * Place a sell (grams of metal) or buy (AUXM amount), escrow the funds, then
 * run a clearing pass. KYC required. Returns the resulting order state.
 */
export async function placeOrder(
  side: Side,
  metal: string,
  amount: number,
  maker: string,
): Promise<PlaceResult> {
  if (!NAV_CLEARING_ENABLED) throw new Error("NAV clearing disabled");
  const m = metal.toUpperCase();
  if (!METALS.has(m)) throw new Error("unsupported metal");
  if (!(amount > 0)) throw new Error("amount must be > 0");
  if (!(await isKycVerified(maker))) throw new Error("kyc_required");

  // ── Escrow: debit the maker now (held until match or cancel). ──
  if (side === "sell") {
    const have = await balOf(maker, m);
    if (have < amount) throw new Error("insufficient metal balance");
    await debit(maker, m, amount); // lock grams
  } else {
    const have = await balOf(maker, "auxm");
    if (have < amount) throw new Error("insufficient AUXM balance");
    await debit(maker, "auxm", amount); // lock AUXM
  }

  const id = `NAV-${side[0].toUpperCase()}-${await redis.incr(KEYS.seq)}`;
  const order: NavOrder = {
    id,
    side,
    metal: m,
    maker: maker.toLowerCase(),
    remaining: round(amount),
    createdAt: Date.now(),
    status: "open",
  };
  await saveOrder(order);
  await redis.rpush(side === "sell" ? KEYS.sellQ(m) : KEYS.buyQ(m), id);

  const matchedGrams = await clear(m);
  const fresh = (await loadOrder(id)) ?? order;
  return { orderId: id, matchedGrams, status: fresh.status };
}

/**
 * Clearing pass for a metal: FIFO-match sell/buy heads at the live NAV, then
 * (if enabled) backstop the remaining sell head with Auxite. Returns grams
 * settled in this pass. Lock-guarded so concurrent calls don't double-settle.
 */
export async function clear(metal: string): Promise<number> {
  if (!NAV_CLEARING_ENABLED) return 0;
  const m = metal.toUpperCase();
  if (!(await acquireLock(m))) return 0; // another pass in flight
  let settledGrams = 0;
  try {
    const nav = await getNav(m);

    // 1) User-to-user FIFO matches.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const sell = await headOrder(KEYS.sellQ(m));
      const buy = await headOrder(KEYS.buyQ(m));
      if (!sell || !buy) break;
      if (sell.maker === buy.maker) break; // don't self-match the heads (v1)

      const buyAffordableGrams = buy.remaining / nav; // AUXM remaining → grams
      const q = round(Math.min(sell.remaining, buyAffordableGrams), 6);
      if (q <= 0) break;

      await settle(m, nav, sell, buy.maker, q, buy);
      settledGrams += q;

      if (sell.status === "filled") await redis.lpop(KEYS.sellQ(m));
      if (buy.status === "filled") await redis.lpop(KEYS.buyQ(m));
    }

    // 2) Backstop: Auxite buys any remaining sell head at NAV (guaranteed exit).
    if (BACKSTOP_ENABLED) {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const sell = await headOrder(KEYS.sellQ(m));
        if (!sell) break;
        const q = sell.remaining;
        if (q <= 0) break;
        await settle(m, nav, sell, AUXITE_INVENTORY, q, null);
        settledGrams += q;
        await redis.lpop(KEYS.sellQ(m));
      }
    }
  } finally {
    await releaseLock(m);
  }
  return settledGrams;
}

/**
 * Settle `q` grams from `sell` to `buyerAddr` at `nav`. Seller's metal was
 * escrowed at placement; buyer's AUXM was escrowed (unless buyer is the Auxite
 * backstop, which pays from platform liability and takes metal into inventory).
 * 50 bps seller-side fee → treasury.
 */
async function settle(
  metal: string,
  nav: number,
  sell: NavOrder,
  buyerAddr: string,
  q: number,
  buyOrder: NavOrder | null,
) {
  const m = metal.toUpperCase();
  const cost = round(q * nav, 6); // AUXM value of q grams at NAV
  const fee = round((cost * FEE_BPS) / 10_000, 6);
  const sellerProceeds = round(cost - fee, 6);
  const isBackstop = buyerAddr === AUXITE_INVENTORY;

  // Seller: escrow already debited; receive AUXM proceeds.
  await credit(sell.maker, "auxm", sellerProceeds);

  // Buyer: receives metal. Backstop buyer = Auxite inventory (no user balance).
  if (isBackstop) {
    await redis.hincrbyfloat(KEYS.inventory(m), "grams", round(q, 6));
  } else {
    await credit(buyerAddr, m, q);
    // Buyer's AUXM was escrowed on placeBuy → reduce their order's remaining.
    if (buyOrder) {
      buyOrder.remaining = round(buyOrder.remaining - cost, 6);
      buyOrder.status = buyOrder.remaining <= 1e-6 ? "filled" : "partial";
      await saveOrder(buyOrder);
    }
  }

  // Fee → treasury.
  if (fee > 0) await redis.hincrbyfloat(KEYS.treasury(m), "auxm", fee);

  // Seller order bookkeeping.
  sell.remaining = round(sell.remaining - q, 6);
  sell.status = sell.remaining <= 1e-6 ? "filled" : "partial";
  await saveOrder(sell);

  // Transaction logs (custodial, off-chain).
  const ts = Date.now();
  await logTx(sell.maker, {
    id: `nav_sell_${sell.id}_${ts}`,
    type: "sell",
    subType: isBackstop ? "nav_backstop" : "nav_clearing",
    metal: m,
    grams: q,
    pricePerGram: nav,
    fee,
    auxmReceived: sellerProceeds,
    status: "completed",
    timestamp: ts,
  });
  if (!isBackstop) {
    await logTx(buyerAddr, {
      id: `nav_buy_${buyOrder?.id ?? "x"}_${ts}`,
      type: "buy",
      subType: "nav_clearing",
      metal: m,
      grams: q,
      pricePerGram: nav,
      auxmPaid: cost,
      status: "completed",
      timestamp: ts,
    });
  }
}

/** Cancel an open/partial order; refunds the remaining escrow to the maker. */
export async function cancelOrder(orderId: string, maker: string): Promise<void> {
  if (!NAV_CLEARING_ENABLED) throw new Error("NAV clearing disabled");
  const o = await loadOrder(orderId);
  if (!o) throw new Error("order not found");
  if (o.maker !== maker.toLowerCase()) throw new Error("not your order");
  if (o.status === "filled" || o.status === "cancelled") throw new Error("not cancellable");

  const refund = o.remaining;
  o.remaining = 0;
  o.status = "cancelled";
  await saveOrder(o);

  if (refund > 0) {
    if (o.side === "sell") await credit(o.maker, o.metal, refund); // give grams back
    else await credit(o.maker, "auxm", refund); // give AUXM back
  }
}

/** Live order book for a metal (open/partial orders only). */
export async function getBook(metal: string): Promise<{ nav: number; sells: NavOrder[]; buys: NavOrder[] }> {
  const m = metal.toUpperCase();
  const [sellIds, buyIds, nav] = await Promise.all([
    redis.lrange(KEYS.sellQ(m), 0, -1) as Promise<string[]>,
    redis.lrange(KEYS.buyQ(m), 0, -1) as Promise<string[]>,
    getNav(m).catch(() => 0),
  ]);
  const load = async (ids: string[]) =>
    (await Promise.all(ids.map(loadOrder))).filter(
      (o): o is NavOrder => !!o && (o.status === "open" || o.status === "partial"),
    );
  return { nav, sells: await load(sellIds), buys: await load(buyIds) };
}
