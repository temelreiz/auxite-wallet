// ============================================================================
// scripts/handoff-metal-admin.js
// ----------------------------------------------------------------------------
// Moves DEFAULT_ADMIN_ROLE of the 4 metal tokens (AUXG/AUXS/AUXPT/AUXPD) from
// the operational HOT WALLET to the governance Safe (2/3 multisig). This closes
// the biggest DD red flag: the listed tokens' top role is currently held by a
// single hot key.
//
// Signer = the CURRENT admin = HOT_WALLET_ETH_PRIVATE_KEY (0xaE4d3…). NOTE: the
// hardhat PRIVATE_KEY (0xD4ce…) is NOT admin and cannot do this.
//
// ONLY DEFAULT_ADMIN_ROLE is moved. MINTER_ROLE is left untouched (minting
// stays with the automated reconciler signer; the Safe can re-grant MINTER
// later if needed since it becomes admin).
//
// TWO PHASES — never both in one run:
//   Phase 1  HANDOFF_GRANT=true     grant DEFAULT_ADMIN to the Safe (4 txs)
//            → then VERIFY the Safe holds admin on all 4 (re-run report)
//   Phase 2  HANDOFF_RENOUNCE=true  hot wallet renounces its own admin (4 txs)
//            → guarded: refuses to renounce unless the Safe already holds admin
//
// Default (no flag) = read-only report. Nothing is sent.
//
// Usage:
//   node scripts/handoff-metal-admin.js                  # report
//   HANDOFF_GRANT=true   node scripts/handoff-metal-admin.js
//   # verify (report) ...
//   HANDOFF_RENOUNCE=true node scripts/handoff-metal-admin.js
// ============================================================================

const { ethers } = require("ethers");
require("dotenv").config({ path: ".env.local" });

const RPC = process.env.BASE_RPC_URL || "https://mainnet.base.org";
const SAFE = "0xEdC9163c5f8A2a76BD1CdDa6BAA4Eb576B481070"; // 2/3 governance Safe
const TOKENS = {
  AUXG: "0x390164702040b509a3d752243f92c2ac0318989d",
  AUXS: "0x82f6eb8ba5c84c8fd395b25a7a40ade08f0868aa",
  AUXPT: "0x119de594170b68561b1761ae1246c5154f94705d",
  AUXPD: "0xe051b2603617277ab50c509f5a38c16056c1c908",
};
const ADMIN_ROLE = "0x" + "00".repeat(32);

const ABI = [
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function grantRole(bytes32 role, address account)",
  "function renounceRole(bytes32 role, address account)",
];

const GRANT = process.env.HANDOFF_GRANT === "true";
const RENOUNCE = process.env.HANDOFF_RENOUNCE === "true";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(fn, tries = 5) {
  let e;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err) {
      e = err;
      await sleep(500 * (i + 1));
    }
  }
  throw e;
}

(async () => {
  if (GRANT && RENOUNCE) {
    console.error("❌ Run GRANT and RENOUNCE in SEPARATE invocations, never together.");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC);
  let signer = null;
  let signerAddr = null;
  if (GRANT || RENOUNCE) {
    let pk = (process.env.HOT_WALLET_ETH_PRIVATE_KEY || "").trim().replace(/^["']|["']$/g, "");
    if (pk && !pk.startsWith("0x")) pk = "0x" + pk;
    if (!/^0x[a-fA-F0-9]{64}$/.test(pk)) {
      console.error("❌ HOT_WALLET_ETH_PRIVATE_KEY missing/malformed — this key is the current admin.");
      process.exit(1);
    }
    signer = new ethers.Wallet(pk, provider);
    signerAddr = signer.address;
  }

  console.log("RPC:   ", RPC);
  console.log("Safe:  ", SAFE, "(target admin)");
  console.log("Mode:  ", GRANT ? "GRANT admin → Safe" : RENOUNCE ? "RENOUNCE hot-wallet admin" : "REPORT (read-only)");
  if (signerAddr) console.log("Signer:", signerAddr, "(must be current admin)");

  for (const [sym, addr] of Object.entries(TOKENS)) {
    await sleep(1200); // ease public-RPC rate limits between tokens
    console.log(`\n━━━ ${sym} (${addr}) ━━━`);
    const ro = new ethers.Contract(addr, ABI, provider);
    const safeIsAdmin = await withRetry(() => ro.hasRole(ADMIN_ROLE, SAFE));
    const signerIsAdmin = signerAddr ? await withRetry(() => ro.hasRole(ADMIN_ROLE, signerAddr)) : null;
    console.log(`  Safe admin?       ${safeIsAdmin ? "✅" : "❌"}`);
    if (signerAddr) console.log(`  Hot-wallet admin? ${signerIsAdmin ? "✅" : "❌"}`);

    if (GRANT) {
      if (safeIsAdmin) {
        console.log("  ↳ Safe already admin — skip grant.");
        continue;
      }
      if (!signerIsAdmin) {
        console.log("  ⚠️  Signer is NOT admin here — cannot grant. Skipping.");
        continue;
      }
      const c = new ethers.Contract(addr, ABI, signer);
      const tx = await c.grantRole(ADMIN_ROLE, SAFE);
      console.log(`  → grantRole(ADMIN, Safe) sent: ${tx.hash}`);
      const r = await tx.wait();
      console.log(`  ✅ confirmed in block ${r.blockNumber}`);
    }

    if (RENOUNCE) {
      // Guard: never renounce unless the Safe is already admin (no-brick).
      if (!safeIsAdmin) {
        console.log("  ⛔ Safe is NOT admin yet — REFUSING to renounce (would brick governance). Run GRANT first.");
        continue;
      }
      if (!signerIsAdmin) {
        console.log("  ↳ Hot wallet already not admin — nothing to renounce.");
        continue;
      }
      const c = new ethers.Contract(addr, ABI, signer);
      const tx = await c.renounceRole(ADMIN_ROLE, signerAddr);
      console.log(`  → renounceRole(ADMIN, self) sent: ${tx.hash}`);
      const r = await tx.wait();
      console.log(`  ✅ hot wallet renounced admin, block ${r.blockNumber}`);
    }
  }

  if (!GRANT && !RENOUNCE) {
    console.log("\n(report only — set HANDOFF_GRANT=true to grant admin to the Safe)");
  }
  console.log("\nDone.");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
