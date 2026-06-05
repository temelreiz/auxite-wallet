// JS wrapper for the metal-mirror deploy — Hardhat's ts-node loader
// doesn't play with the project's ESM tsconfig, so we use plain CJS
// here. Logic mirrors deploy-metal-mirrors.ts.

const { ethers } = require("hardhat");

const METALS = [
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
  console.log("Balance:  ", ethers.formatEther(balance), "ETH\n");

  if (balance < ethers.parseEther("0.001")) {
    console.warn("⚠️  Low ETH on deployer. May not be enough for 4 deploys.\n");
  }

  const Factory = await ethers.getContractFactory("AuxiteMetalMirror");
  const deployed = [];

  for (const m of METALS) {
    console.log(`Deploying ${m.symbol} (${m.name})…`);
    const contract = await Factory.deploy(m.name, m.symbol, deployer.address);
    const txHash = contract.deploymentTransaction()?.hash || "—";
    console.log(`  tx: ${txHash}`);
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    console.log(`  ✅ ${m.symbol} → ${address}\n`);
    deployed.push({ symbol: m.symbol, name: m.name, address, txHash });
  }

  console.log("═".repeat(72));
  console.log("Deployment summary");
  console.log("═".repeat(72));
  for (const d of deployed) {
    console.log(`${d.symbol.padEnd(8)} ${d.address}   ${d.name}`);
  }
  console.log("");

  console.log("// Paste into ASSETS in src/lib/rwa-mint-sync.ts:");
  for (const d of deployed) {
    const id = d.symbol.replace("-M", "");
    const field = id.toLowerCase();
    console.log(
      `  { id: "${id}", balanceField: "${field}", metalKey: "${id}", contractAddress: "${d.address.toLowerCase()}" },`,
    );
  }

  console.log("\n// Verify each on BaseScan (run from project root):");
  for (const d of deployed) {
    console.log(
      `npx hardhat verify --network base ${d.address} "${d.name}" "${d.symbol}" ${deployer.address}`,
    );
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
