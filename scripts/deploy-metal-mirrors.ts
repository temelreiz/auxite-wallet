// Deploys the 4 AuxiteMetalMirror contracts (AUXG-M, AUXS-M, AUXPT-M,
// AUXPD-M) to Base. Each one is just an ERC-20 + AccessControl mint
// surface used by the rwa-mint-sync cron to mirror off-chain claims
// onto a chain rwa.xyz can index.
//
// Usage:
//   npx hardhat run scripts/deploy-metal-mirrors.ts --network base
//
// Reads PRIVATE_KEY and BASE_RPC_URL from .env (already wired up in
// hardhat.config.ts). The deployer becomes the bootstrap admin and
// MINTER on every contract; we'll grant MINTER_ROLE to the dedicated
// minter wallet right after via a follow-up script.

import { ethers } from "hardhat";

interface Metal {
  symbol: string;
  name: string;
}

const METALS: Metal[] = [
  { symbol: "AUXG-M",  name: "Auxite Gold Mirror" },
  { symbol: "AUXS-M",  name: "Auxite Silver Mirror" },
  { symbol: "AUXPT-M", name: "Auxite Platinum Mirror" },
  { symbol: "AUXPD-M", name: "Auxite Palladium Mirror" },
];

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("Network:  ", network.name, `chainId=${network.chainId}`);
  console.log("Deployer: ", deployer.address);
  console.log("Balance:  ", ethers.formatEther(balance), "ETH");
  console.log("");

  if (balance < ethers.parseEther("0.001")) {
    console.warn("⚠️  Low ETH on deployer. May not be enough for 4 deploys.");
  }

  const Factory = await ethers.getContractFactory("AuxiteMetalMirror");
  const deployed: { symbol: string; name: string; address: string; txHash: string }[] = [];

  for (const m of METALS) {
    console.log(`Deploying ${m.symbol} (${m.name})…`);
    const contract = await Factory.deploy(m.name, m.symbol, deployer.address);
    const txHash = contract.deploymentTransaction()?.hash || "—";
    console.log(`  tx: ${txHash}`);
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    console.log(`  ✅ ${m.symbol} → ${address}`);
    deployed.push({ symbol: m.symbol, name: m.name, address, txHash });
    console.log("");
  }

  console.log("═".repeat(72));
  console.log("Deployment summary");
  console.log("═".repeat(72));
  for (const d of deployed) {
    console.log(`${d.symbol.padEnd(8)} ${d.address}   ${d.name}`);
  }
  console.log("");

  // Print the snippet ready to paste into src/lib/rwa-mint-sync.ts.
  console.log("// Paste into ASSETS in src/lib/rwa-mint-sync.ts:");
  for (const d of deployed) {
    const id = d.symbol.replace("-M", "");
    const field = id.toLowerCase();
    console.log(
      `  { id: "${id}", balanceField: "${field}", metalKey: "${id}", contractAddress: "${d.address.toLowerCase()}" },`,
    );
  }

  // Also print the BaseScan verify command for each.
  console.log("\n// Verify each on BaseScan (run from project root):");
  for (const d of deployed) {
    console.log(
      `npx hardhat verify --network base ${d.address} "${d.name}" "${d.symbol}" ${ethers.ZeroAddress.replace(/0x0+/, "0x") /* placeholder */}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
