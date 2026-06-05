// One-off: grant MINTER_ROLE on AUXG / AUXS / AUXPT to the dedicated
// minter wallet so the rwa-mint-sync cron can call mint() once we flip
// the env var live in Vercel.
//
// AUXPD is intentionally skipped — its contract reverted both hasRole
// reads on our probe. Once we confirm whether it uses Ownable or a
// custom role pattern (BaseScan → Read Contract), we'll add an AUXPD
// branch here.
//
// Caller wallet: must hold DEFAULT_ADMIN_ROLE on each token contract.
// We verified that the hot wallet (HOT_WALLET_ETH_PRIVATE_KEY in
// .env.local) currently does for AUXG / AUXS / AUXPT.
//
// Cost: 3 small grantRole() txs on Base — ~0.0001 ETH (~$0.30) total.

const { ethers } = require("ethers");
require("dotenv").config({ path: ".env.local" });

const RPC = "https://mainnet.base.org";
const ADMIN_PK = process.env.HOT_WALLET_ETH_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;

const MINTER_TARGET = "0xD3287A8acb7cF6f9a79f08bbEBE21d5Cd634F3A2";

const TOKENS = {
  AUXG:  "0x390164702040b509a3d752243f92c2ac0318989d",
  AUXS:  "0x82f6eb8ba5c84c8fd395b25a7a40ade08f0868aa",
  AUXPT: "0x119de594170b68561b1761ae1246c5154f94705d",
  // AUXPD: skipped — access pattern unclear, see header comment.
};

const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));

const ABI = [
  "function grantRole(bytes32 role, address account) external",
  "function hasRole(bytes32 role, address account) view returns (bool)",
];

(async () => {
  if (!ADMIN_PK) {
    console.error("❌ HOT_WALLET_ETH_PRIVATE_KEY not set in .env.local");
    process.exit(2);
  }

  const provider = new ethers.JsonRpcProvider(RPC);
  const admin = new ethers.Wallet(ADMIN_PK, provider);

  console.log("Caller (must be admin):", admin.address);
  console.log("Granting MINTER_ROLE to:", MINTER_TARGET);
  console.log("Network: Base mainnet");
  console.log("MINTER_ROLE hash:", MINTER_ROLE);
  console.log("");

  // Gas balance sanity check
  const bal = await provider.getBalance(admin.address);
  console.log("Caller ETH balance:", ethers.formatEther(bal), "ETH");
  if (bal < ethers.parseEther("0.0005")) {
    console.warn("⚠️  Low ETH balance on Base. May not have gas for 3 txns.");
  }
  console.log("");

  for (const [sym, addr] of Object.entries(TOKENS)) {
    console.log(`━━━ ${sym} (${addr}) ━━━`);
    const contract = new ethers.Contract(addr, ABI, admin);

    // Already granted? Skip to save gas + avoid duplicate-event noise.
    try {
      const already = await contract.hasRole(MINTER_ROLE, MINTER_TARGET);
      if (already) {
        console.log("  ✓ Target already has MINTER_ROLE — skipping.");
        console.log("");
        continue;
      }
    } catch (e) {
      console.log("  ⚠️  hasRole check failed, will attempt grant anyway:", e.message.slice(0, 80));
    }

    try {
      console.log("  Sending grantRole tx…");
      const tx = await contract.grantRole(MINTER_ROLE, MINTER_TARGET, { gasLimit: 100_000 });
      console.log("  tx hash:", tx.hash);
      console.log("  Waiting for confirmation…");
      const receipt = await tx.wait();
      console.log(`  ✅ Confirmed in block ${receipt.blockNumber} (status: ${receipt.status})`);
      // Verify
      const has = await contract.hasRole(MINTER_ROLE, MINTER_TARGET);
      console.log("  Post-grant hasRole check:", has ? "✅ true" : "❌ false");
    } catch (e) {
      console.error("  ❌ Grant failed:", e?.shortMessage || e?.message || String(e));
    }
    console.log("");
  }

  console.log("Done. Next: add RWA_MINT_SYNC_PRIVATE_KEY (the minter wallet's PK) to Vercel.");
})().catch(e => { console.error(e); process.exit(1); });
