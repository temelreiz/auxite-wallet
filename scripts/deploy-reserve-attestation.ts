// ============================================================================
// scripts/deploy-reserve-attestation.ts
// ----------------------------------------------------------------------------
// Deploys ReserveAttestation — the on-chain proof-of-reserve registry. This is
// an ADDITIVE auxiliary contract at its own address; it does NOT touch the
// metal token contracts or their rwa.xyz / rwa.io / DefiLlama listings.
//
// Usage:
//   # Testnet
//   npx hardhat run scripts/deploy-reserve-attestation.ts --network baseSepolia
//   # Mainnet — DO NOT run without explicit go-ahead
//   npx hardhat run scripts/deploy-reserve-attestation.ts --network base
//
// Constructor args (env):
//   ATTESTATION_ADMIN     — governance Safe multisig (DEFAULT_ADMIN_ROLE).
//                           Defaults to the deployer if unset.
//   ATTESTATION_ATTESTOR  — independent attestor signing key address
//                           (ATTESTOR_ROLE). Defaults to zero address (grant
//                           later via the admin). This is the address derived
//                           from RESERVE_ATTESTOR_KEY held by The Network Firm.
//
// After deploy:
//   1. Verify:  npx hardhat verify --network <net> <ADDRESS> <ADMIN> <ATTESTOR>
//   2. Set RESERVE_ATTESTATION_ADDRESS so the API + posting cron use it.
//   3. If attestor was zero, grant ATTESTOR_ROLE to the attestor address.
// ============================================================================

import { ethers, network, run } from "hardhat";
import * as fs from "node:fs";
import * as path from "node:path";

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddr = await deployer.getAddress();

  const admin = process.env.ATTESTATION_ADMIN || deployerAddr;
  const attestor = process.env.ATTESTATION_ATTESTOR || ethers.ZeroAddress;

  console.log(`Network:  ${network.name}`);
  console.log(`Deployer: ${deployerAddr}`);
  console.log(`Admin:    ${admin}`);
  console.log(`Attestor: ${attestor}${attestor === ethers.ZeroAddress ? " (grant later)" : ""}`);

  const Factory = await ethers.getContractFactory("ReserveAttestation");
  const reg = await Factory.deploy(admin, attestor);
  await reg.waitForDeployment();
  const address = await reg.getAddress();
  console.log(`\n✅ ReserveAttestation deployed: ${address}`);

  // Persist the deployment record.
  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `reserve-attestation-${network.name}.json`);
  fs.writeFileSync(
    outFile,
    JSON.stringify(
      { address, admin, attestor, network: network.name, deployedBy: deployerAddr },
      null,
      2
    )
  );
  console.log(`📝 Wrote ${outFile}`);

  console.log(`\nNext:`);
  console.log(`  RESERVE_ATTESTATION_ADDRESS=${address}`);
  console.log(`  npx hardhat verify --network ${network.name} ${address} ${admin} ${attestor}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
