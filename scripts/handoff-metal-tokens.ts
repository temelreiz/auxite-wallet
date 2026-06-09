// Hands off the canonical AuxiteMetal contracts from the bootstrap deployer to
// production roles. Run this ONLY AFTER the backfill is complete and verified —
// the deployer needs MINTER_ROLE during backfill.
//
// For each token it:
//   1. grants MINTER_ROLE       → the reconciler signer (the rwa-mint-sync key)
//   2. grants DEFAULT_ADMIN_ROLE → the Safe governance multisig
//   3. renounces the deployer's MINTER_ROLE
//   4. renounces the deployer's DEFAULT_ADMIN_ROLE   (LAST — point of no return)
//
// End state: admin = Safe, minter = reconciler, deployer powerless.
//
// Usage:
//   npx hardhat run scripts/handoff-metal-tokens.ts --network base
//
// Env:
//   RECONCILER_ADDRESS  on-chain address of the rwa-mint-sync signer (the
//                       account behind RWA_MINT_SYNC_PRIVATE_KEY)
//   SAFE_ADDRESS        governance multisig (defaults to the known Auxite Safe)

import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const SAFE_ADDRESS =
  process.env.SAFE_ADDRESS || "0xEdC9163c5f8A2a76BD1CdDa6BAA4Eb576B481070";

async function main() {
  const [deployer] = await ethers.getSigners();
  const net = await ethers.provider.getNetwork();

  const reconciler = process.env.RECONCILER_ADDRESS;
  if (!reconciler || !ethers.isAddress(reconciler)) {
    throw new Error("Set RECONCILER_ADDRESS to the rwa-mint-sync signer address");
  }
  if (!ethers.isAddress(SAFE_ADDRESS)) throw new Error("Bad SAFE_ADDRESS");

  const manifestPath = path.join(
    __dirname,
    "deployments",
    `metal-tokens.${net.chainId}.json`,
  );
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest not found: ${manifestPath} (deploy first)`);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  console.log("Network:    ", network.name, `chainId=${net.chainId}`);
  console.log("Deployer:   ", deployer.address);
  console.log("Reconciler: ", reconciler, "(→ MINTER_ROLE)");
  console.log("Safe:       ", SAFE_ADDRESS, "(→ DEFAULT_ADMIN_ROLE)");
  console.log("");

  const Factory = await ethers.getContractFactory("AuxiteMetal");
  const MINTER_ROLE = ethers.id("MINTER_ROLE");
  const ADMIN_ROLE = "0x" + "0".repeat(64); // DEFAULT_ADMIN_ROLE

  for (const t of manifest.tokens as { symbol: string; address: string }[]) {
    console.log(`── ${t.symbol} (${t.address}) ──`);
    const c = Factory.attach(t.address).connect(deployer);

    // Sanity: deployer must still hold admin to perform grants/renounces.
    const deployerIsAdmin: boolean = await (c as any).hasRole(ADMIN_ROLE, deployer.address);
    if (!deployerIsAdmin) {
      console.log("  ⚠️  deployer is not admin here — skipping (already handed off?)");
      continue;
    }

    await (await (c as any).grantRole(MINTER_ROLE, reconciler)).wait();
    console.log("  ✓ MINTER_ROLE → reconciler");
    await (await (c as any).grantRole(ADMIN_ROLE, SAFE_ADDRESS)).wait();
    console.log("  ✓ DEFAULT_ADMIN_ROLE → Safe");
    await (await (c as any).renounceRole(MINTER_ROLE, deployer.address)).wait();
    console.log("  ✓ deployer renounced MINTER_ROLE");
    await (await (c as any).renounceRole(ADMIN_ROLE, deployer.address)).wait();
    console.log("  ✓ deployer renounced DEFAULT_ADMIN_ROLE  (handoff complete)\n");
  }

  console.log("Handoff done. Verify on BaseScan that admin=Safe and minter=reconciler.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
