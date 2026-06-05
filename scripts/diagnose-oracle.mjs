// Read-only oracle diagnostics: confirm on-chain values, find recent writers,
// check their gas, and surface recent reverted writes. No keys, no signing.
import { ethers } from "ethers";
import fs from "fs";

// Load BASE_RPC_URL from .env.local without printing it.
function envFrom(file, key) {
  try {
    const txt = fs.readFileSync(file, "utf8");
    const m = txt.match(new RegExp(`^${key}\\s*=\\s*"?([^"\\n]+)"?`, "m"));
    return m ? m[1].trim() : null;
  } catch { return null; }
}

const RPC =
  envFrom(".env.local", "BASE_RPC_URL") ||
  envFrom(".env.local", "NEXT_PUBLIC_BASE_RPC_URL") ||
  "https://mainnet.base.org";

const ORACLE = "0xDB36fFD8a762226928d62a2Fe6F19bB329b5EbbE";
const ABI = [
  "function getBasePerKgE6(bytes32 metalId) view returns (uint256)",
  "function getETHPriceE6() view returns (uint256)",
  "function owner() view returns (address)",
];
const IDS = {
  GOLD: ethers.id("GOLD"),
  SILVER: ethers.id("SILVER"),
  PLATINUM: ethers.id("PLATINUM"),
  PALLADIUM: ethers.id("PALLADIUM"),
};

const provider = new ethers.JsonRpcProvider(RPC);

async function main() {
  console.log("RPC host:", (() => { try { return new URL(RPC).host; } catch { return "?"; } })());
  const net = await provider.getNetwork();
  console.log("chainId:", net.chainId.toString());

  const oracle = new ethers.Contract(ORACLE, ABI, provider);

  // 1) On-chain values
  const perKg = {};
  for (const [k, id] of Object.entries(IDS)) {
    try {
      const e6 = await oracle.getBasePerKgE6(id);
      perKg[k] = Number(e6) / 1e6; // per kg USD
    } catch (e) { perKg[k] = `ERR ${e.shortMessage || e.message}`; }
  }
  let ethUsd;
  try { ethUsd = Number(await oracle.getETHPriceE6()) / 1e6; } catch (e) { ethUsd = `ERR ${e.message}`; }
  console.log("\n=== On-chain oracle (per-kg USD / per-gram) ===");
  for (const k of Object.keys(IDS)) {
    const kg = perKg[k];
    console.log(`${k}: ${typeof kg === "number" ? `$${kg.toFixed(2)}/kg  ($${(kg/1000).toFixed(3)}/g)` : kg}`);
  }
  console.log(`ETH: $${typeof ethUsd === "number" ? ethUsd.toFixed(2) : ethUsd}`);

  // 2) Owner / authorized updater
  try {
    const owner = await oracle.owner();
    console.log("\nowner():", owner);
  } catch (e) {
    console.log("\nowner(): not exposed / reverted:", e.shortMessage || e.message);
  }

  // 3) Recent transactions to the oracle (Blockscout v2) — find writers + reverts
  console.log("\n=== Recent txs to oracle (Blockscout) ===");
  try {
    const url = `https://base.blockscout.com/api/v2/addresses/${ORACLE}/transactions?filter=to`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    const data = await res.json();
    const items = (data.items || []).slice(0, 12);
    if (!items.length) console.log("(no tx items returned)");
    const writers = {};
    for (const it of items) {
      const method = it.method || it.decoded_input?.method_call || "(raw)";
      const status = it.status || it.result || "?";
      const from = (it.from?.hash || it.from || "?");
      const ts = it.timestamp || "?";
      console.log(`${ts}  ${status.padEnd(8)}  ${method.slice(0,28).padEnd(28)}  from ${from}`);
      if (from && from.startsWith("0x")) writers[from.toLowerCase()] = true;
    }
    // 4) Gas balance of each writer
    console.log("\n=== Writer ETH (gas) balances on Base ===");
    for (const w of Object.keys(writers)) {
      try {
        const bal = Number(ethers.formatEther(await provider.getBalance(w)));
        console.log(`${w}: ${bal.toFixed(6)} ETH ${bal < 0.0005 ? "  <-- LOW / likely out of gas" : ""}`);
      } catch (e) { console.log(`${w}: balance ERR ${e.message}`); }
    }
  } catch (e) {
    console.log("Blockscout fetch failed:", e.message);
  }
}

main().catch((e) => { console.error("fatal:", e); process.exit(1); });
