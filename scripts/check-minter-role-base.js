// One-off: check who holds MINTER_ROLE on the 4 Base-mainnet metal contracts.
// Tries the deployer wallet first; reports `true`/`false` per metal so we
// know whether we can use that key for the rwa-mint-sync cron, or whether
// we need to grant the role first.

const { ethers } = require("ethers");
require("dotenv").config({ path: ".env.local" });

const BASE_RPC = process.env.BASE_RPC_URL || "https://mainnet.base.org";
const PK = process.env.DEPLOYER_PRIVATE_KEY || process.env.HOT_WALLET_ETH_PRIVATE_KEY;

const TOKENS = {
  AUXG:  "0x390164702040b509a3d752243f92c2ac0318989d",
  AUXS:  "0x82f6eb8ba5c84c8fd395b25a7a40ade08f0868aa",
  AUXPT: "0x119de594170b68561b1761ae1246c5154f94705d",
  AUXPD: "0xe051b2603617277ab50c509f5a38c16056c1c908",
};

const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
const DEFAULT_ADMIN_ROLE = "0x" + "00".repeat(32);

const ABI = [
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function getRoleAdmin(bytes32 role) view returns (bytes32)",
];

(async () => {
  const provider = new ethers.JsonRpcProvider(BASE_RPC);

  console.log("RPC:", BASE_RPC);
  console.log("MINTER_ROLE hash:", MINTER_ROLE);

  if (!PK) {
    console.log("\n⚠️  No DEPLOYER_PRIVATE_KEY / HOT_WALLET_ETH_PRIVATE_KEY in .env.local — checking other addresses anyway.");
  }

  // Addresses to probe
  const probe = [];
  if (PK) {
    const w = new ethers.Wallet(PK);
    probe.push({ label: "deployer/hot-wallet (from env)", address: w.address });
  }
  // You can append more known addresses here as needed.
  // probe.push({ label: "known admin", address: "0x..." });

  for (const [symbol, addr] of Object.entries(TOKENS)) {
    console.log(`\n━━━ ${symbol} (${addr}) ━━━`);
    const contract = new ethers.Contract(addr, ABI, provider);
    try {
      for (const p of probe) {
        const isMinter = await contract.hasRole(MINTER_ROLE, p.address);
        const isAdmin = await contract.hasRole(DEFAULT_ADMIN_ROLE, p.address);
        console.log(`  ${p.label}  ${p.address}`);
        console.log(`    MINTER_ROLE:        ${isMinter ? "✅" : "❌"}`);
        console.log(`    DEFAULT_ADMIN_ROLE: ${isAdmin ? "✅" : "❌"}`);
      }
    } catch (e) {
      console.log(`  ❌ Read failed: ${e.message.slice(0, 120)}`);
    }
  }
})().catch(e => { console.error(e); process.exit(1); });
