// ============================================================================
// /api/admin/sweep-tron — consolidate per-user Tron (TRC20 USDT) deposits into
// the Tron treasury. Server-side (uses DEPOSIT_HD_MNEMONIC for the derived
// per-user Tron keys via tron-deposit).
//
//   GET  ?dry=1 (default)  → inventory + per-address plan (USDT, controllable,
//                            TRX/energy needs) + treasury TRX balance. No signing.
//   POST { confirm:"SWEEP", address?:"T.." } → execute: gas-station TRX from
//        treasury (TRC20 transfers burn energy paid in TRX), then transfer USDT.
//
// Treasury = HOT_WALLET_TRON_ADDRESS/_KEY if set, else seed index 0 (controllable
// via the same HD seed). The treasury address must hold TRX for energy; until
// funded, execute returns insufficient_treasury_trx.
//
// Auth: Authorization: Bearer ${CRON_SECRET}. Treasury-critical.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { TronWeb } from "tronweb";
import { getRedis } from "@/lib/redis";
import {
  isTronConfigured,
  deriveTronAddress,
  deriveTronPrivateKey,
  TRON_USDT_CONTRACT,
} from "@/lib/tron-deposit";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;
const FULL_HOST = "https://api.trongrid.io";
const SUN = 1_000_000; // 1 TRX = 1e6 sun
const GAS_TOPUP_TRX = 40; // TRX sent to a gasless address to cover an energy burn
const FEE_LIMIT_SUN = 60 * SUN; // max TRX a transfer may burn for energy

function tronOpts() {
  const headers: Record<string, string> = {};
  if (process.env.TRONGRID_API_KEY) headers["TRON-PRO-API-KEY"] = process.env.TRONGRID_API_KEY;
  return { fullHost: FULL_HOST, headers };
}

// Treasury (destination + gas-station source).
function treasuryAddress(): string {
  return process.env.HOT_WALLET_TRON_ADDRESS || deriveTronAddress(0);
}
function treasuryPrivateKey(): string {
  return process.env.HOT_WALLET_TRON_KEY || deriveTronPrivateKey(0);
}

async function scan(pattern: string): Promise<string[]> {
  const r = getRedis();
  let cursor = "0";
  const out: string[] = [];
  do {
    const [next, batch] = (await r.scan(cursor, { match: pattern, count: 500 })) as [string, string[]];
    cursor = next;
    out.push(...batch);
  } while (cursor !== "0");
  return out;
}

async function usdtBalance(tw: any, addr: string): Promise<number> {
  tw.setAddress(addr);
  const c = await tw.contract().at(TRON_USDT_CONTRACT);
  const bal = await c.balanceOf(addr).call();
  return Number(bal.toString()) / SUN;
}

// Resolve the derived Tron private key for a deposit address (verify it matches).
async function resolveTronKey(addr: string): Promise<string | null> {
  if (!isTronConfigured()) return null;
  const r = getRedis();
  const userWallet = (await r.get(`deposit:tron:${addr}`)) as string | null;
  if (!userWallet) return null;
  const idx = await r.get(`deposit:hd:index:${String(userWallet).toLowerCase()}`);
  if (idx === null || idx === undefined) return null;
  try {
    const pk = deriveTronPrivateKey(Number(idx));
    if (deriveTronAddress(Number(idx)) === addr) return pk;
  } catch {}
  return null;
}

// Accept either the CRON_SECRET bearer (cron jobs / ops scripts) OR a valid
// admin session (so the /admin Deposits & Sweep panel can call this directly).
async function authed(request: NextRequest): Promise<boolean> {
  if (CRON_SECRET && request.headers.get("authorization") === `Bearer ${CRON_SECRET}`) return true;
  try {
    const a = await requireAdmin(request);
    return a.authorized;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  if (!(await authed(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isTronConfigured()) return NextResponse.json({ error: "hd_not_configured" }, { status: 503 });

  const reader = new TronWeb(tronOpts());
  const treasury = treasuryAddress();
  let treasuryTrx = 0;
  try { treasuryTrx = Number(await reader.trx.getBalance(treasury)) / SUN; } catch {}

  const only = new URL(request.url).searchParams.get("address");
  const addrs = only ? [only] : (await scan("deposit:tron:*")).map((k) => k.replace("deposit:tron:", ""));

  const plan: any[] = [];
  for (const addr of addrs) {
    let usdt = 0, trx = 0;
    try { usdt = await usdtBalance(reader, addr); } catch { continue; }
    try { trx = Number(await reader.trx.getBalance(addr)) / SUN; } catch {}
    if (usdt <= 0) continue;
    const key = await resolveTronKey(addr);
    plan.push({ address: addr, usdt, trx, controllable: !!key, needsTrxTopup: trx < GAS_TOPUP_TRX });
  }

  return NextResponse.json({
    success: true,
    dry: true,
    treasury,
    treasuryTrx,
    gasReady: treasuryTrx >= GAS_TOPUP_TRX,
    fundedCount: plan.length,
    plan,
    note:
      treasuryTrx < GAS_TOPUP_TRX
        ? `Fund the treasury ${treasury} with TRX (≈${GAS_TOPUP_TRX}+ per gasless address, or stake TRX for energy) before executing.`
        : "Ready to execute.",
  });
}

export async function POST(request: NextRequest) {
  if (!(await authed(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isTronConfigured()) return NextResponse.json({ error: "hd_not_configured" }, { status: 503 });

  let body: any = {};
  try { body = await request.json(); } catch {}
  if (body?.confirm !== "SWEEP") {
    return NextResponse.json({ error: "confirmation_required", hint: 'POST { "confirm":"SWEEP" }' }, { status: 400 });
  }

  const r = getRedis();
  const lock = await r.set("admin:sweep-tron:lock", Date.now(), { nx: true, ex: 120 });
  if (!lock) return NextResponse.json({ error: "sweep_in_progress" }, { status: 409 });

  const reader = new TronWeb(tronOpts());
  const treasury = treasuryAddress();
  const treasuryTw = new TronWeb({ ...tronOpts(), privateKey: treasuryPrivateKey() });
  const only = body?.address ? String(body.address) : null;
  const results: any[] = [];

  try {
    const addrs = only ? [only] : (await scan("deposit:tron:*")).map((k) => k.replace("deposit:tron:", ""));
    for (const addr of addrs) {
      let usdt = 0;
      try { usdt = await usdtBalance(reader, addr); } catch { continue; }
      if (usdt <= 0) continue;

      const pk = await resolveTronKey(addr);
      if (!pk) { results.push({ address: addr, status: "skipped_uncontrollable" }); continue; }

      try {
        // Gas-station: ensure the address has TRX to burn for energy.
        const trx = Number(await reader.trx.getBalance(addr)) / SUN;
        if (trx < GAS_TOPUP_TRX) {
          const treasuryTrx = Number(await reader.trx.getBalance(treasury)) / SUN;
          if (treasuryTrx < GAS_TOPUP_TRX - trx) {
            results.push({ address: addr, status: "insufficient_treasury_trx", treasury, treasuryTrx });
            continue;
          }
          const need = Math.ceil((GAS_TOPUP_TRX - trx) * SUN);
          await treasuryTw.trx.sendTransaction(addr, need);
          // brief wait for the TRX to land
          await new Promise((res) => setTimeout(res, 4000));
        }

        // Transfer USDT → treasury, signed by the derived key.
        const userTw = new TronWeb({ ...tronOpts(), privateKey: pk });
        const c = await userTw.contract().at(TRON_USDT_CONTRACT);
        const raw = (await c.balanceOf(addr).call()).toString();
        const txid = await c.transfer(treasury, raw).send({ feeLimit: FEE_LIMIT_SUN });
        results.push({ address: addr, status: "swept", usdt, txid });
      } catch (e: any) {
        results.push({ address: addr, status: "error", error: e?.message || String(e) });
      }
    }
    return NextResponse.json({ success: true, treasury, results });
  } finally {
    await r.del("admin:sweep-tron:lock").catch(() => {});
  }
}
