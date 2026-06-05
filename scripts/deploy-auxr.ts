// ============================================================================
// scripts/deploy-auxr.ts
// ----------------------------------------------------------------------------
// Deploys the AUXR ERC-20 contract to the network specified by `--network`.
//
// Usage:
//   # Testnet (Base Sepolia, chainId 84532)
//   npx hardhat run scripts/deploy-auxr.ts --network baseSepolia
//
//   # Mainnet (Base, chainId 8453) — DO NOT run without explicit go-ahead
//   npx hardhat run scripts/deploy-auxr.ts --network base
//
// After deploy:
//   1. Verify on Basescan:
//        npx hardhat verify --network baseSepolia <ADDRESS> <ADMIN_ADDRESS>
//   2. Persist the address in deployments/auxr-{network}.json
//   3. Update src/lib/auxr-bridge.ts AUXR_CONTRACT_ADDRESS_{NETWORK}
//   4. If admin is the deployer, grant MINTER_ROLE to the backend signer
//      and consider revoking MINTER_ROLE from the deployer admin.
// ============================================================================

import { ethers, network, run } from "hardhat";
import * as fs from "node:fs";
import * as path from "node:path";

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddr = await deployer.getAddress();

  // Admin defaults to the deployer; override with ADMIN_ADDRESS env var to
  // initialize the contract with a Safe multisig or separate signer.
  const adminAddress = process.env.ADMIN_ADDRESS || deployerAddr;

  const balance = await ethers.provider.getBalance(deployerAddr);
  const net = await ethers.provider.getNetwork();

  console.log("─".repeat(70));
  console.log(`AUXR deployment`);
  console.log(`  Network:   ${network.name} (chainId ${net.chainId})`);
  console.log(`  Deployer:  ${deployerAddr}`);
  console.log(`  Balance:   ${ethers.formatEther(balance)} ETH`);
  console.log(`  Admin:     ${adminAddress}${
    adminAddress.toLowerCase() === deployerAddr.toLowerCase()
      ? "  (deployer — rotate to multisig post-deploy)"
      : ""
  }`);
  console.log("─".repeat(70));

  if (balance === 0n) {
    throw new Error(
      `Deployer ${deployerAddr} has zero balance on ${network.name}. ` +
        `Fund the deployer and try again.`
    );
  }

  const AUXR = await ethers.getContractFactory("AUXR");
  const auxr = await AUXR.deploy(adminAddress);
  await auxr.waitForDeployment();
  const address = await auxr.getAddress();
  const tx = auxr.deploymentTransaction();

  console.log(`AUXR deployed:`);
  console.log(`  Address:   ${address}`);
  console.log(`  Tx hash:   ${tx?.hash}`);
  console.log(`  Gas used:  (see receipt)`);
  console.log("");

  // Persist deployment record
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir);
  const record = {
    network: network.name,
    chainId: Number(net.chainId),
    contract: "AUXR",
    address,
    admin: adminAddress,
    deployer: deployerAddr,
    txHash: tx?.hash,
    blockNumber: tx?.blockNumber ?? null,
    deployedAt: new Date().toISOString(),
  };
  const file = path.join(deploymentsDir, `auxr-${network.name}.json`);
  fs.writeFileSync(file, JSON.stringify(record, null, 2));
  console.log(`Saved deployment record: ${file}`);

  // Auto-verify on supported networks (waits 5 blocks first for the contract
  // to be indexed by Basescan).
  if (network.name === "baseSepolia" || network.name === "base") {
    console.log(`\nWaiting 30s for Basescan indexing before verification...`);
    await new Promise((r) => setTimeout(r, 30_000));

    try {
      await run("verify:verify", {
        address,
        constructorArguments: [adminAddress],
      });
      console.log(`Contract verified on Basescan.`);
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (msg.toLowerCase().includes("already verified")) {
        console.log("Contract already verified on Basescan.");
      } else {
        console.warn(`Verification failed: ${msg}`);
        console.log(
          `Manual command: npx hardhat verify --network ${network.name} ${address} ${adminAddress}`
        );
      }
    }
  }

  console.log("\n─".repeat(70));
  console.log(`Next steps:`);
  console.log(`  1. Update src/lib/auxr-bridge.ts with address: ${address}`);
  console.log(`  2. If using a backend signer, grant MINTER_ROLE:`);
  console.log(
    `       cast send ${address} "grantRole(bytes32,address)" \\`
  );
  console.log(`         $(cast keccak "MINTER_ROLE") <BACKEND_SIGNER>`);
  console.log(`  3. Consider revoking MINTER_ROLE from admin EOA post-grant.`);
  console.log("─".repeat(70));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
