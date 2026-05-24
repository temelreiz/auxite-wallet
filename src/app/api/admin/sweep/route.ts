// ============================================================================
// /api/admin/sweep  — consolidate funds from per-user deposit addresses into
// the hot wallet (Base / EVM only; Tron is a separate follow-up that needs
// tronweb). Server-side so it can use DEPOSIT_HD_MNEMONIC (HD keys) and AWS KMS
// (KMS keys). Tron deposits are left in place for now.
//
//   GET  ?dry=1 (default)  → inventory + per-address plan, NO signing
//   POST { confirm:"SWEEP", address?:"0x.." } → execute (gas-station + sweep)
//
// Auth: Authorization: Bearer ${CRON_SECRET}. Treasury-critical — keep secret.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { getRedis } from "@/lib/redis";
import { isHdConfigured, deriveEvmPrivateKey } from "@/lib/hd-deposit";
import { getUserIdFromAddress, getDecryptedWallet } from "@/lib/kms-wallet";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;
const HOT = (process.env.HOT_WALLET_ETH_ADDRESS || "").toLowerCase();
const HOT_PK = process.env.HOT_WALLET_ETH_PRIVATE_KEY || "";
const RPC = process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org";
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const USDT = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2";
const ERC20 = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address,uint256) returns (bool)",
];
// Don't sweep native ETH below this (leaves gas-station dust untouched).
const ETH_SWEEP_MIN = ethers.parseEther("0.001");

const provider = new ethers.JsonRpcProvider(RPC);

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

// Resolve a signer wallet for a derived address (HD seed or KMS), verifying the
// recovered address matches. Returns null if we can't prove control.
async function resolveSigner(
  addr: string
): Promise<{ wallet: ethers.Wallet | ethers.HDNodeWallet; source: "hd" | "kms" } | null> {
  const r = getRedis();
  const lower = addr.toLowerCase();

  // HD path
  if (isHdConfigured()) {
    const userWallet = (await r.get(`deposit:hd:evm:${lower}`)) as string | null;
    if (userWallet) {
      const idx = await r.get(`deposit:hd:index:${String(userWallet).toLowerCase()}`);
      if (idx !== null && idx !== undefined) {
        try {
          const w = new ethers.Wallet(deriveEvmPrivateKey(Number(idx)), provider);
          if (w.address.toLowerCase() === lower) return { wallet: w, source: "hd" };
        } catch {}
      }
    }
  }
  // KMS path
  try {
    const userId = await getUserIdFromAddress(addr);
    if (userId) {
      const w = await getDecryptedWallet(userId, provider);
      if (w && w.address.toLowerCase() === lower) return { wallet: w as ethers.Wallet, source: "kms" };
    }
  } catch {}
  return null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Sequential reads with retry — the public Base RPC rate-limits parallel
// (Promise.all) batches and returns "missing revert data", which would make
// funded addresses look empty.
async function balancesOf(addr: string): Promise<{ wei: bigint; usdc: bigint; usdt: bigint }> {
  const usdcC = new ethers.Contract(USDC, ERC20, provider);
  const usdtC = new ethers.Contract(USDT, ERC20, provider);
  let lastErr: any;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const wei = await provider.getBalance(addr); await sleep(50);
      const usdc = (await usdcC.balanceOf(addr)) as bigint; await sleep(50);
      const usdt = (await usdtC.balanceOf(addr)) as bigint;
      return { wei, usdc, usdt };
    } catch (e) {
      lastErr = e;
      await sleep(400);
    }
  }
  throw lastErr || new Error("rpc_failed");
}

async function fundedEvmAddresses(): Promise<string[]> {
  const hd = (await scan("deposit:hd:evm:*")).map((k) => k.replace("deposit:hd:evm:", "").toLowerCase());
  const kms = (await scan("wallet:address:*")).map((k) => k.replace("wallet:address:", "").toLowerCase());
  return [...new Set([...hd, ...kms])];
}

function authed(request: NextRequest): boolean {
  if (!CRON_SECRET) return false;
  return request.headers.get("authorization") === `Bearer ${CRON_SECRET}`;
}

// ── Dry-run: report what would be swept ─────────────────────────────────────
export async function GET(request: NextRequest) {
  if (!authed(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!HOT) return NextResponse.json({ error: "hot_wallet_not_configured" }, { status: 503 });

  const plan: any[] = [];
  const errors: any[] = [];
  const all = await fundedEvmAddresses();
  let chainId = "unknown";
  try { chainId = String((await provider.getNetwork()).chainId); } catch {}
  let rpcHost = "unknown";
  try { rpcHost = new URL(RPC).host; } catch {}
  for (const addr of all) {
    let bal;
    try {
      bal = await balancesOf(addr);
    } catch (e: any) {
      errors.push({ address: addr, error: e?.shortMessage || e?.message || "rpc_error" });
      continue;
    }
    const eth = Number(ethers.formatEther(bal.wei));
    const usdc = Number(ethers.formatUnits(bal.usdc, 6));
    const usdt = Number(ethers.formatUnits(bal.usdt, 6));
    if (eth === 0 && usdc === 0 && usdt === 0) continue;
    const signer = await resolveSigner(addr);
    plan.push({
      address: addr,
      eth,
      usdc,
      usdt,
      controllable: !!signer,
      keySource: signer?.source ?? null,
      needsGasStation: (usdc > 0 || usdt > 0) && bal.wei < ETH_SWEEP_MIN,
    });
  }
  return NextResponse.json({
    success: true,
    dry: true,
    destination: HOT,
    diag: { rpcHost, chainId, scanned: all.length },
    fundedCount: plan.length,
    plan,
    ...(errors.length ? { rpcErrors: errors } : {}),
    note: "Tron USDT is not swept here (needs tronweb).",
  });
}

// ── Execute: gas-station + sweep to hot wallet ──────────────────────────────
export async function POST(request: NextRequest) {
  if (!authed(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!HOT || !HOT_PK) return NextResponse.json({ error: "hot_wallet_not_configured" }, { status: 503 });

  let body: any = {};
  try {
    body = await request.json();
  } catch {}
  if (body?.confirm !== "SWEEP") {
    return NextResponse.json({ error: "confirmation_required", hint: 'POST { "confirm": "SWEEP" }' }, { status: 400 });
  }

  // Concurrency guard.
  const r = getRedis();
  const lock = await r.set("admin:sweep:lock", Date.now(), { nx: true, ex: 120 });
  if (!lock) return NextResponse.json({ error: "sweep_in_progress" }, { status: 409 });

  const hotWallet = new ethers.Wallet(HOT_PK, provider);
  const only = body?.address ? String(body.address).toLowerCase() : null;
  const results: any[] = [];

  try {
    const targets = only ? [only] : await fundedEvmAddresses();
    for (const addr of targets) {
      let bal;
      try { bal = await balancesOf(addr); } catch { continue; }
      const hasToken = bal.usdc > 0n || bal.usdt > 0n;
      const hasEth = bal.wei > ETH_SWEEP_MIN;
      if (!hasToken && !hasEth) continue;

      const resolved = await resolveSigner(addr);
      if (!resolved) {
        results.push({ address: addr, status: "skipped_uncontrollable" });
        continue;
      }
      const signer = resolved.wallet;
      const swept: any[] = [];

      try {
        const fee = await provider.getFeeData();
        const gasPrice = fee.maxFeePerGas || fee.gasPrice || ethers.parseUnits("0.01", "gwei");

        // Token sweeps (USDC, USDT) — gas-station if the address has no ETH.
        for (const [contract, sym, raw] of [
          [USDC, "USDC", bal.usdc] as const,
          [USDT, "USDT", bal.usdt] as const,
        ]) {
          if (raw <= 0n) continue;
          const erc20Gas = 80000n;
          const needed = erc20Gas * gasPrice;
          const ethBal = await provider.getBalance(addr);
          if (ethBal < needed) {
            const topup = needed * 2n - ethBal;
            const g = await hotWallet.sendTransaction({ to: addr, value: topup });
            await g.wait();
          }
          const erc = new ethers.Contract(contract, ERC20, signer);
          const fresh = (await erc.balanceOf(addr)) as bigint;
          if (fresh > 0n) {
            const tx = await erc.transfer(HOT, fresh);
            const rec = await tx.wait();
            swept.push({ token: sym, amount: ethers.formatUnits(fresh, 6), txHash: rec?.hash });
          }
        }

        // Native ETH sweep (skip dust / gas-station leftovers).
        const ethNow = await provider.getBalance(addr);
        const reserve = 21000n * gasPrice * 2n;
        if (ethNow > ETH_SWEEP_MIN && ethNow > reserve) {
          const value = ethNow - reserve;
          const tx = await signer.sendTransaction({ to: HOT, value });
          const rec = await tx.wait();
          swept.push({ token: "ETH", amount: ethers.formatEther(value), txHash: rec?.hash });
        }

        results.push({ address: addr, status: "swept", keySource: resolved.source, swept });
      } catch (e: any) {
        results.push({ address: addr, status: "error", error: e?.shortMessage || e?.message, swept });
      }
    }

    return NextResponse.json({ success: true, destination: HOT, results });
  } finally {
    await r.del("admin:sweep:lock").catch(() => {});
  }
}
