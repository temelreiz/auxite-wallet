// ============================================================================
// scripts/harden-roles.js
// ----------------------------------------------------------------------------
// Contract role hardening PLANNER for the Base-mainnet token contracts.
//
// Closes the #1 contract due-diligence red flag: the deploy admin still holds
// the bootstrap MINTER_ROLE (see AuxiteMetal constructor: "revoke after wiring
// the signer"). If that key is ever compromised, supply can be minted at will.
//
// The admin is a Safe MULTISIG, so this script does NOT sign or send anything.
// It (a) reads the current role state read-only, and (b) prints Safe-ready
// calldata for the grant/revoke transactions to submit through the Safe. That
// keeps the irreversible mainnet operation entirely in the user's multisig.
//
// Usage:
//   DEPLOY_ADMIN=0x... BACKEND_SIGNER=0x... node scripts/harden-roles.js
//   (BASE_RPC_URL optional; defaults to https://mainnet.base.org)
//
// DEPLOY_ADMIN   = address that holds the bootstrap MINTER_ROLE to be revoked
//                  (typically the deployer / current admin).
// BACKEND_SIGNER = the KMS reconciliation signer that should be the sole minter.
// ============================================================================

const { ethers } = require("ethers");
require("dotenv").config({ path: ".env.local" });

const BASE_RPC = process.env.BASE_RPC_URL || "https://mainnet.base.org";
const DEPLOY_ADMIN = process.env.DEPLOY_ADMIN;
const BACKEND_SIGNER = process.env.BACKEND_SIGNER;

const CONTRACTS = {
  AUXG: "0x390164702040b509a3d752243f92c2ac0318989d",
  AUXS: "0x82f6eb8ba5c84c8fd395b25a7a40ade08f0868aa",
  AUXPT: "0x119de594170b68561b1761ae1246c5154f94705d",
  AUXPD: "0xe051b2603617277ab50c509f5a38c16056c1c908",
  AUXR: "0xB145B8e9C02193d55454f534f917Cabe704FA042",
};

const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
const DEFAULT_ADMIN_ROLE = "0x" + "00".repeat(32);

const ABI = [
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function grantRole(bytes32 role, address account)",
  "function revokeRole(bytes32 role, address account)",
];

const iface = new ethers.Interface(ABI);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Public RPCs throttle rapid sequential eth_calls (seen as "missing revert
// data"). Retry with backoff so the report is reliable.
async function hasRoleRetry(contract, role, account, tries = 4) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      return await contract.hasRole(role, account);
    } catch (e) {
      lastErr = e;
      await sleep(400 * (i + 1));
    }
  }
  throw lastErr;
}

function plan(label, contractAddr, fn, role, account) {
  return {
    contract: label,
    to: ethers.getAddress(contractAddr),
    action: `${fn}(MINTER_ROLE, ${account})`,
    calldata: iface.encodeFunctionData(fn, [role, account]),
  };
}

(async () => {
  const provider = new ethers.JsonRpcProvider(BASE_RPC);
  console.log("RPC:", BASE_RPC);
  console.log("MINTER_ROLE:", MINTER_ROLE);

  if (!DEPLOY_ADMIN || !BACKEND_SIGNER) {
    console.log(
      "\n⚠️  Set DEPLOY_ADMIN and BACKEND_SIGNER to generate the hardening plan."
    );
    console.log("    Running in read-only role-report mode for known addresses.\n");
  }

  const safeTxs = [];

  for (const [symbol, addr] of Object.entries(CONTRACTS)) {
    console.log(`\n━━━ ${symbol} (${addr}) ━━━`);
    const c = new ethers.Contract(addr, ABI, provider);

    try {
      let adminIsMinter = false;
      let signerIsMinter = false;
      if (DEPLOY_ADMIN) {
        adminIsMinter = await hasRoleRetry(c, MINTER_ROLE, DEPLOY_ADMIN);
        const adminIsAdmin = await hasRoleRetry(c, DEFAULT_ADMIN_ROLE, DEPLOY_ADMIN);
        console.log(`  deploy admin ${DEPLOY_ADMIN}`);
        console.log(`    MINTER_ROLE:        ${adminIsMinter ? "✅ (to revoke)" : "❌"}`);
        console.log(`    DEFAULT_ADMIN_ROLE: ${adminIsAdmin ? "✅" : "❌"}`);
      }
      if (BACKEND_SIGNER) {
        signerIsMinter = await hasRoleRetry(c, MINTER_ROLE, BACKEND_SIGNER);
        console.log(`  backend signer ${BACKEND_SIGNER}`);
        console.log(`    MINTER_ROLE:        ${signerIsMinter ? "✅" : "❌ (needs grant)"}`);
      }

      if (DEPLOY_ADMIN && BACKEND_SIGNER) {
        // Step 1: ensure the backend signer can mint before we remove the admin.
        if (!signerIsMinter) {
          safeTxs.push(plan(symbol, addr, "grantRole", MINTER_ROLE, BACKEND_SIGNER));
          console.log("  → PLAN: grant MINTER_ROLE to backend signer");
        }
        // Step 2: revoke the bootstrap MINTER_ROLE from the admin — but never
        // leave the contract with no minter.
        if (adminIsMinter) {
          if (!signerIsMinter) {
            console.log(
              "  ⚠️  revoke is queued AFTER the grant above — submit grant first, confirm, then revoke."
            );
          }
          safeTxs.push(plan(symbol, addr, "revokeRole", MINTER_ROLE, DEPLOY_ADMIN));
          console.log("  → PLAN: revoke MINTER_ROLE from deploy admin");
        } else if (!adminIsMinter) {
          console.log("  ✅ Already hardened: deploy admin holds no MINTER_ROLE.");
        }
      }
    } catch (e) {
      console.log(`  ❌ Read failed: ${String(e.message).slice(0, 120)}`);
    }
    await sleep(200); // be gentle on public RPCs between contracts
  }

  if (safeTxs.length) {
    console.log("\n\n════════ SAFE-READY TRANSACTIONS ════════");
    console.log("Submit these via the Auxite governance Safe (in order):\n");
    safeTxs.forEach((t, i) => {
      console.log(`#${i + 1} [${t.contract}] ${t.action}`);
      console.log(`   to:       ${t.to}`);
      console.log(`   calldata: ${t.calldata}\n`);
    });
    console.log(
      "Order matters: grant the signer first and CONFIRM on-chain before revoking the admin,\n" +
        "so a contract is never left without a minter."
    );
  } else if (DEPLOY_ADMIN && BACKEND_SIGNER) {
    console.log("\n✅ Nothing to do — roles already hardened across all contracts.");
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
