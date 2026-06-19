// /api/redeem/nav/route.ts
// NAV REDEMPTION — Class A peg engine endpoint (metal token → stablecoin at NAV).
//
//   GET  ?address&metal&amount&stablecoin  → live quote + eligibility
//   POST { address, metal, amount, stablecoin, payoutAddress } → create order
//
// The treasury is the standing counterparty at NAV, so redemption is always
// available — that guarantee is what holds the secondary price to NAV. This
// endpoint QUOTES and RECORDS an order for settlement; it never moves funds.
// Stablecoin payout is executed by a separate, explicitly authorized treasury
// settlement step against the recorded order.
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { Redis } from "@upstash/redis";
import { ethers } from "ethers";
import { getUserBalance } from "@/lib/redis";
import { getMetalPrices } from "@/lib/price-cache";
import { checkTradingAllowed } from "@/lib/trading-guard";
import { requireKycForWithdraw } from "@/lib/withdrawal-guard";
import { METAL_TOKENS } from "@/config/contracts-v8";
import {
  quoteNavRedemption,
  METAL_SYMBOLS,
  type MetalSymbol,
  type Stablecoin,
} from "@/lib/nav-redemption";

export const dynamic = "force-dynamic";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const BASE_RPC_URL =
  process.env.NEXT_PUBLIC_BASE_RPC_URL ||
  process.env.BASE_RPC_URL ||
  "https://mainnet.base.org";
const ERC20_ABI = ["function balanceOf(address owner) view returns (uint256)"];
const METAL_DECIMALS = 3;

const METAL_TO_PRICE_KEY: Record<MetalSymbol, "gold" | "silver" | "platinum" | "palladium"> = {
  AUXG: "gold",
  AUXS: "silver",
  AUXPT: "platinum",
  AUXPD: "palladium",
};

function isMetal(s: string): s is MetalSymbol {
  return (METAL_SYMBOLS as string[]).includes(s);
}

function parseStablecoin(s: string | null): Stablecoin {
  return s?.toUpperCase() === "USDT" ? "USDT" : "USDC";
}

async function getOnChainMetalBalance(
  address: string,
  metal: MetalSymbol
): Promise<number> {
  try {
    const contractAddress = METAL_TOKENS[metal];
    if (!contractAddress) return 0;
    const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
    const contract = new ethers.Contract(contractAddress, ERC20_ABI, provider);
    const bal = await contract.balanceOf(address);
    return parseFloat(ethers.formatUnits(bal, METAL_DECIMALS));
  } catch {
    return 0;
  }
}

async function getRedeemableGrams(
  address: string,
  metal: MetalSymbol
): Promise<number> {
  const metalLower = metal.toLowerCase();
  let redisBal = 0;
  try {
    const balances = await getUserBalance(address);
    redisBal = parseFloat(String((balances as any)[metalLower] || 0));
  } catch {
    redisBal = 0;
  }
  const onChain = await getOnChainMetalBalance(address, metal);
  return redisBal + onChain;
}

/** NAV per gram + freshness from the shared price cache. */
async function getNav(metal: MetalSymbol): Promise<{ navPerGram: number; ageSeconds: number }> {
  const prices = await getMetalPrices();
  const navPerGram = prices[METAL_TO_PRICE_KEY[metal]] || 0;
  const ageSeconds = Math.max(0, Math.floor((Date.now() - prices.timestamp) / 1000));
  return { navPerGram, ageSeconds };
}

// ── GET: quote + eligibility ────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address") || "";
  const metalRaw = (searchParams.get("metal") || "AUXG").toUpperCase();
  const amount = parseFloat(searchParams.get("amount") || "0");
  const stablecoin = parseStablecoin(searchParams.get("stablecoin"));

  if (!isMetal(metalRaw)) {
    return NextResponse.json({ success: false, error: "invalid_metal" }, { status: 400 });
  }
  const metal = metalRaw;

  const { navPerGram, ageSeconds } = await getNav(metal);
  const quote = quoteNavRedemption({
    metal,
    grams: amount,
    navPerGram,
    navAgeSeconds: ageSeconds,
    stablecoin,
  });

  let balanceGrams: number | null = null;
  let sufficient: boolean | null = null;
  if (address) {
    balanceGrams = await getRedeemableGrams(address, metal);
    sufficient = balanceGrams >= amount;
  }

  return NextResponse.json({
    success: true,
    quote,
    navAgeSeconds: ageSeconds,
    balanceGrams,
    sufficient,
  });
}

// ── POST: create a redemption order (no funds move) ─────────────────────────
export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "invalid_body" }, { status: 400 });
  }

  const address = String(body.address || "");
  const metalRaw = String(body.metal || "").toUpperCase();
  const amount = parseFloat(String(body.amount || "0"));
  const stablecoin = parseStablecoin(body.stablecoin || null);
  const payoutAddress = String(body.payoutAddress || address);

  if (!address) {
    return NextResponse.json({ success: false, error: "address_required" }, { status: 400 });
  }
  if (!isMetal(metalRaw)) {
    return NextResponse.json({ success: false, error: "invalid_metal" }, { status: 400 });
  }
  const metal = metalRaw;

  // 1. Feature kill-switch (reuse metal trading guard).
  const trading = await checkTradingAllowed("metalTrading");
  if (!trading.allowed) {
    return NextResponse.json(
      { success: false, error: "trading_disabled", message: trading.message },
      { status: 403 }
    );
  }

  // 2. KYC gate — fail closed (never let value out unverified).
  const kyc = await requireKycForWithdraw(address);
  if (!kyc.ok) {
    return NextResponse.json(
      { success: false, error: kyc.code || "kyc_required", message: kyc.error },
      { status: 403 }
    );
  }

  // 3. Price the redemption (with circuit breaker on stale NAV).
  const { navPerGram, ageSeconds } = await getNav(metal);
  const quote = quoteNavRedemption({
    metal,
    grams: amount,
    navPerGram,
    navAgeSeconds: ageSeconds,
    stablecoin,
  });
  if (!quote.ok) {
    return NextResponse.json(
      { success: false, error: quote.reason || "quote_failed", quote },
      { status: quote.circuitBreaker ? 503 : 400 }
    );
  }

  // 4. Balance check.
  const balanceGrams = await getRedeemableGrams(address, metal);
  if (balanceGrams < amount) {
    return NextResponse.json(
      { success: false, error: "insufficient_balance", balanceGrams },
      { status: 400 }
    );
  }

  // 5. Record the order for settlement. Status pending_settlement — the
  //    treasury settlement worker burns the metal and pays the stablecoin in a
  //    separate authorized step; this endpoint deliberately does not move funds.
  const orderId = randomUUID();
  const order = {
    orderId,
    type: "nav_redemption",
    status: "pending_settlement",
    address,
    payoutAddress,
    metal,
    grams: amount,
    stablecoin,
    quote,
    navPerGram,
    navAgeSeconds: ageSeconds,
    createdAt: Date.now(),
  };

  try {
    await redis.set(`redeem:nav:order:${orderId}`, JSON.stringify(order));
    await redis.lpush("redeem:nav:queue", orderId);
    await redis.lpush(`redeem:nav:user:${address.toLowerCase()}`, orderId);
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: "persist_failed", message: e?.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    orderId,
    status: order.status,
    quote,
    message:
      "Redemption order created. Stablecoin payout is settled by treasury operations against this order.",
  });
}
