// ────────────────────────────────────────────────────────────────────────────
// mint-auxr.mjs — one-off AUXR mint via MINTER_ROLE
//
// Mints AUXR on-chain to a recipient. SAFE BY DEFAULT: runs a static simulation
// and prints what it *would* do. It only broadcasts a real transaction when you
// pass --broadcast. Claude does NOT run this — you (the minter-key holder) do.
//
//   Dry-run (simulate only, no funds move):
//     node scripts/mint-auxr.mjs
//
//   Broadcast for real (mints tokens on-chain):
//     node scripts/mint-auxr.mjs --broadcast
//
// Env (from .env.local): AUXR_MINTER_PRIVATE_KEY, AUXR_CONTRACT_ADDRESS,
//   AUXR_CHAIN (base|baseSepolia), BASE_RPC_URL (optional).
// ────────────────────────────────────────────────────────────────────────────
import { ethers } from "ethers";
import { config } from "dotenv";
config({ path: ".env.local" });

// ── Mint parameters — EDIT HERE if you need different values ─────────────────
const RECIPIENT = "0x728771961934d994148071Bbc4857F768D82519E"; // new Ledger
const AMOUNT_AUXR = "150";  // human units; AUXR has 18 decimals
const DECIMALS = 18;
// ─────────────────────────────────────────────────────────────────────────────

const BROADCAST = process.argv.includes("--broadcast");

const CHAIN = process.env.AUXR_CHAIN || "baseSepolia";
const RPC =
  CHAIN === "base"
    ? process.env.BASE_RPC_URL || "https://mainnet.base.org"
    : process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org";
const CONTRACT = process.env.AUXR_CONTRACT_ADDRESS;
const MINTER_PK = process.env.AUXR_MINTER_PRIVATE_KEY;

// mint(address to, uint256 amount, bytes32 refId) + role check helpers
const ABI = [
  "function mint(address to, uint256 amount, bytes32 refId)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function MINTER_ROLE() view returns (bytes32)",
  "function balanceOf(address) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
];

function fail(msg) { console.error("❌ " + msg); process.exit(1); }

async function main() {
  if (!CONTRACT) fail("AUXR_CONTRACT_ADDRESS not set in .env.local");
  if (!MINTER_PK || MINTER_PK.length < 64) fail("AUXR_MINTER_PRIVATE_KEY not set in .env.local");
  if (!ethers.isAddress(RECIPIENT)) fail("RECIPIENT is not a valid address");

  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(MINTER_PK, provider);
  const c = new ethers.Contract(CONTRACT, ABI, wallet);
  const amount = ethers.parseUnits(AMOUNT_AUXR, DECIMALS);
  // Deterministic-but-unique ref so it's traceable; not reused across runs.
  const refId = ethers.id(`manual-mint:${RECIPIENT}:${AMOUNT_AUXR}:${Math.floor(Date.now() / 1000)}`);

  console.log("=== AUXR MINT ===");
  console.log("chain      :", CHAIN, CHAIN === "base" ? "(MAINNET — real value)" : "(testnet)");
  console.log("contract   :", CONTRACT);
  console.log("minter     :", wallet.address);
  console.log("recipient  :", RECIPIENT);
  console.log("amount     :", AMOUNT_AUXR, "AUXR", `(${amount.toString()} base units)`);
  console.log("refId      :", refId);
  console.log("mode       :", BROADCAST ? "🚨 BROADCAST (real tx)" : "🧪 DRY-RUN (simulate only)");

  // Role sanity
  try {
    const role = await c.MINTER_ROLE();
    const ok = await c.hasRole(role, wallet.address);
    console.log("MINTER_ROLE:", ok ? "YES ✅" : "NO ❌ (this key cannot mint)");
    if (!ok) fail("Minter key lacks MINTER_ROLE — aborting.");
  } catch (e) {
    console.warn("⚠️  Could not verify MINTER_ROLE:", e.shortMessage || e.message);
  }

  // Simulate (staticCall) — reverts here mean the real tx would revert too.
  try {
    await c.mint.staticCall(RECIPIENT, amount, refId);
    console.log("simulation : ✅ passed (mint would succeed)");
  } catch (e) {
    fail("simulation reverted: " + (e.shortMessage || e.reason || e.message));
  }

  if (!BROADCAST) {
    console.log("\n🧪 Dry-run only. Re-run with  --broadcast  to actually mint.");
    return;
  }

  console.log("\n=== Broadcasting ===");
  const tx = await c.mint(RECIPIENT, amount, refId);
  console.log("tx sent    :", tx.hash);
  const rcpt = await tx.wait();
  console.log("status     :", rcpt.status === 1 ? "✅ SUCCESS" : "❌ FAILED");
  const bal = await c.balanceOf(RECIPIENT);
  console.log("recipient AUXR balance now:", ethers.formatUnits(bal, DECIMALS));
  const explorer = CHAIN === "base" ? "https://basescan.org/tx/" : "https://sepolia.basescan.org/tx/";
  console.log("explorer   :", explorer + tx.hash);
}

main().catch((e) => fail(e.message));
