// ============================================================================
// scripts/deploy-mint-guard.ts
// ----------------------------------------------------------------------------
// Deploys MintGuard — the rate-limited minter that replaces the reconciliation
// signer as MINTER_ROLE holder on the canonical metal tokens. Additive: the
// token contracts and their listings are untouched.
//
// Usage:
//   # Testnet
//   npx hardhat run scripts/deploy-mint-guard.ts --network baseSepolia
//   # Mainnet — DO NOT run without explicit go-ahead
//   npx hardhat run scripts/deploy-mint-guard.ts --network base
//
// Env:
//   MINT_GUARD_ADMIN      — governance Safe (DEFAULT_ADMIN_ROLE). Required.
//   MINT_GUARD_OPERATOR   — reconciliation signer address (the address of
//                           RWA_MINT_SYNC_PRIVATE_KEY). Required.
//   MINT_GUARD_PAUSER     — security ops address (optional).
//   MINT_GUARD_CAP_<SYM>_G       daily mint cap in grams (AUXG/AUXS/AUXPT/AUXPD)
//   MINT_GUARD_BURN_CAP_<SYM>_G  daily burn cap in grams (defaults to mint cap)
//
// The script only deploys. It prints the Safe transactions (setCaps, grant
// MINTER_ROLE to the guard, revoke it from the signer) for the owners to sign.
// After the Safe executes them, set RWA_MINT_GUARD_ADDRESS so rwa-mint-sync
// routes through the guard.
// ============================================================================

import { ethers, network } from "hardhat";
import * as fs from "node:fs";
import * as path from "node:path";

// Canonical AuxiteMetal addresses (Base mainnet) — keep in sync with
// src/lib/rwa-mint-sync.ts.
const TOKENS: Record<string, string> = {
  AUXG: "0xCef9D7593E8Ba796eE05C54B8983B7749bB1218a",
  AUXS: "0xB0aC63aeD12b5A0Ee710618D99444bf126068c1a",
  AUXPT: "0x39F314fb20668997A2ADDaB1eA9236e0072D5E2D",
  AUXPD: "0x6e4837fCf158D15ABFdf90b3954D041D452BE832",
};
const GRAM = 1000n; // 3 decimals
const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddr = await deployer.getAddress();

  const admin = process.env.MINT_GUARD_ADMIN;
  const operator = process.env.MINT_GUARD_OPERATOR;
  const pauser = process.env.MINT_GUARD_PAUSER || ethers.ZeroAddress;
  if (!admin || !operator) throw new Error("MINT_GUARD_ADMIN and MINT_GUARD_OPERATOR are required");

  const caps = Object.keys(TOKENS).map((sym) => {
    const mintG = process.env[`MINT_GUARD_CAP_${sym}_G`];
    if (!mintG) throw new Error(`MINT_GUARD_CAP_${sym}_G is required`);
    const burnG = process.env[`MINT_GUARD_BURN_CAP_${sym}_G`] || mintG;
    return { sym, token: TOKENS[sym], mint: BigInt(mintG) * GRAM, burn: BigInt(burnG) * GRAM };
  });

  console.log(`Network:  ${network.name}`);
  console.log(`Deployer: ${deployerAddr}`);
  console.log(`Admin:    ${admin}`);
  console.log(`Operator: ${operator}`);
  console.log(`Pauser:   ${pauser}`);

  const Factory = await ethers.getContractFactory("MintGuard");
  const guard = await Factory.deploy(admin, operator, pauser);
  await guard.waitForDeployment();
  const address = await guard.getAddress();
  console.log(`\n✅ MintGuard deployed: ${address}`);

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `mint-guard-${network.name}.json`);
  fs.writeFileSync(
    outFile,
    JSON.stringify(
      {
        address,
        admin,
        operator,
        pauser,
        caps: caps.map((c) => ({ ...c, mint: c.mint.toString(), burn: c.burn.toString() })),
        network: network.name,
        deployedBy: deployerAddr,
      },
      null,
      2
    )
  );
  console.log(`📝 Wrote ${outFile}`);

  const tokenIface = new ethers.Interface(["function grantRole(bytes32,address)", "function revokeRole(bytes32,address)"]);
  console.log(`\nSafe transactions (sign with 2/3 owners, in this order):`);
  for (const c of caps) {
    console.log(`  to ${address}  ${c.sym} setCaps → ${guard.interface.encodeFunctionData("setCaps", [c.token, c.mint, c.burn])}`);
  }
  for (const c of caps) {
    console.log(`  to ${c.token}  ${c.sym} grantRole(MINTER, guard) → ${tokenIface.encodeFunctionData("grantRole", [MINTER_ROLE, address])}`);
  }
  for (const c of caps) {
    console.log(`  to ${c.token}  ${c.sym} revokeRole(MINTER, operator) → ${tokenIface.encodeFunctionData("revokeRole", [MINTER_ROLE, operator])}`);
  }
  console.log(`\nAlso revoke MINTER_ROLE from any other EOA (scripts/check-minter-role-base.js lists holders).`);
  console.log(`Then set RWA_MINT_GUARD_ADDRESS=${address}`);
  console.log(`Verify: npx hardhat verify --network ${network.name} ${address} ${admin} ${operator} ${pauser}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
