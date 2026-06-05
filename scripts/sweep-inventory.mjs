// scripts/sweep-inventory.mjs — READ-ONLY. On-chain balances sitting in every
// per-user derived deposit address we might control: HD EVM (deposit:hd:evm:*),
// KMS EVM (wallet:address:*), and Tron (deposit:tron:*). Uses Blockscout +
// TronGrid (reliable, keyless). No keys, no signing.
import { Redis } from "@upstash/redis";
import { ethers } from "ethers";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env.local") });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const USDT_BASE = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2";
const TRON_USDT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org");
const ERC20 = ["function balanceOf(address) view returns (uint256)"];
const usdcC = new ethers.Contract(USDC, ERC20, provider);
const usdtC = new ethers.Contract(USDT_BASE, ERC20, provider);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function scan(p) {
  let c = "0", out = [];
  do { const [n, b] = await redis.scan(c, { match: p, count: 500 }); c = n; out.push(...b); } while (c !== "0");
  return out;
}
const j = async (u) => { try { return await (await fetch(u, { cache: "no-store" })).json(); } catch { return null; } };

// Canonical on-chain reads via RPC (sequential + one retry — public RPC rate-limits batches).
async function evmBalances(addr) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const wei = await provider.getBalance(addr); await sleep(60);
      const u = await usdcC.balanceOf(addr); await sleep(60);
      const t = await usdtC.balanceOf(addr); await sleep(60);
      return { eth: Number(ethers.formatEther(wei)), usdc: Number(ethers.formatUnits(u, 6)), usdt: Number(ethers.formatUnits(t, 6)) };
    } catch { await sleep(400); }
  }
  return { eth: 0, usdc: 0, usdt: 0, err: true };
}

async function main() {
  console.log(`\n${"━".repeat(76)}\nSWEEP INVENTORY (read-only · Blockscout/TronGrid)\n${"━".repeat(76)}`);

  const hdEvm = (await scan("deposit:hd:evm:*")).map((k) => k.replace("deposit:hd:evm:", "").toLowerCase());
  const kmsEvm = (await scan("wallet:address:*")).map((k) => k.replace("wallet:address:", "").toLowerCase());
  const evmAddrs = [...new Set([...hdEvm, ...kmsEvm])];

  let totEth = 0, totUsdc = 0, totUsdtBase = 0, evmFunded = 0;
  console.log(`\n[Base EVM]  ${evmAddrs.length} unique addresses (HD ${hdEvm.length} + KMS ${kmsEvm.length})`);
  for (const addr of evmAddrs) {
    const { eth, usdc, usdt } = await evmBalances(addr);
    if (eth > 0 || usdc > 0 || usdt > 0) {
      evmFunded++; totEth += eth; totUsdc += usdc; totUsdtBase += usdt;
      console.log(`  ${addr}  ETH ${eth.toFixed(6)}  USDC ${usdc.toFixed(2)}  USDT ${usdt.toFixed(2)}`);
    }
  }

  const tronAddrs = (await scan("deposit:tron:*")).map((k) => k.replace("deposit:tron:", ""));
  let totUsdt = 0, tronFunded = 0;
  console.log(`\n[Tron]  ${tronAddrs.length} addresses`);
  for (const addr of tronAddrs) {
    let usdt = 0;
    // Tronscan /account → trc20token_balances (reliable for TRC20 balances).
    const d = await j(`https://apilist.tronscanapi.com/api/account?address=${addr}`);
    for (const tk of d?.trc20token_balances || []) {
      if (tk.tokenId === TRON_USDT || tk.tokenAbbr === "USDT") {
        usdt += Number(tk.balance || 0) / 10 ** Number(tk.tokenDecimal ?? 6);
      }
    }
    if (usdt > 0) { tronFunded++; totUsdt += usdt; console.log(`  ${addr}  USDT ${usdt.toFixed(2)}`); }
    await sleep(150);
  }

  console.log(`\n${"━".repeat(76)}`);
  console.log(`EVM funded: ${evmFunded}  →  ETH ${totEth.toFixed(6)} · USDC ${totUsdc.toFixed(2)} · USDT(base) ${totUsdtBase.toFixed(2)}`);
  console.log(`Tron funded: ${tronFunded}  →  USDT ${totUsdt.toFixed(2)}`);
  console.log(`Total sweepable ≈ $${(totUsdc + totUsdtBase + totUsdt).toFixed(2)} stable + ${totEth.toFixed(6)} ETH`);
  console.log(`${"━".repeat(76)}\n`);
}
main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
