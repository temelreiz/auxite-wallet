// Deploys the 4 canonical AuxiteMetal token contracts (AUXG, AUXS, AUXPT,
// AUXPD) to Base. These REPLACE the display-only AuxiteMetalMirror contracts:
// supply is now minted per-investor (the chain becomes the ownership record),
// which is what makes the assets "On-chain Represented" on rwa.xyz instead of
// a "Digital Twin".
//
// Usage:
//   npx hardhat run scripts/deploy-metal-tokens.ts --network baseSepolia   # rehearse first!
//   npx hardhat run scripts/deploy-metal-tokens.ts --network base          # mainnet
//
// SECURITY / ROLE FLOW (do NOT set admin=Safe at deploy time):
//   1. Deploy with the DEPLOYER as bootstrap admin+minter (this script).
//   2. Backfill existing balances with the deployer key (scripts/backfill-metal-tokens.ts).
//   3. Hand off: grant MINTER_ROLE to the reconciler signer, grant
//      DEFAULT_ADMIN_ROLE to the Safe, renounce the deployer's roles
//      (scripts/handoff-metal-tokens.ts).
// Setting admin=Safe up front would force every backfill batch through the
// multisig — impractical. The deployer holds power only transiently.
//
// Reads PRIVATE_KEY and BASE_RPC_URL from .env (wired in hardhat.config.ts).

import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const RESERVE_INFO_URI = "https://vault.auxite.io/trust/reserves";

interface Metal {
  symbol: string;
  name: string;
}

const METALS: Metal[] = [
  { symbol: "AUXG",  name: "Auxite Gold" },
  { symbol: "AUXS",  name: "Auxite Silver" },
  { symbol: "AUXPT", name: "Auxite Platinum" },
  { symbol: "AUXPD", name: "Auxite Palladium" },
];

async function main() {
  const [deployer] = await ethers.getSigners();
  const net = await ethers.provider.getNetwork();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("Network:  ", network.name, `chainId=${net.chainId}`);
  console.log("Deployer: ", deployer.address, "(bootstrap admin+minter)");
  console.log("Balance:  ", ethers.formatEther(balance), "ETH");
  console.log("reserveInfoURI:", RESERVE_INFO_URI);
  console.log("");

  if (net.chainId !== 8453n && net.chainId !== 84532n && net.chainId !== 31337n) {
    throw new Error(`Refusing to deploy on unexpected chainId ${net.chainId}`);
  }
  if (balance < ethers.parseEther("0.001")) {
    console.warn("⚠️  Low ETH on deployer — may not cover 4 deploys.");
  }

  const Factory = await ethers.getContractFactory("AuxiteMetal");
  const deployed: {
    symbol: string;
    name: string;
    address: string;
    txHash: string;
    args: [string, string, string, string];
  }[] = [];

  for (const m of METALS) {
    console.log(`Deploying ${m.symbol} (${m.name})…`);
    const args: [string, string, string, string] = [
      m.name,
      m.symbol,
      deployer.address, // bootstrap admin — handed off to the Safe later
      RESERVE_INFO_URI,
    ];
    const contract = await Factory.deploy(...args);
    const txHash = contract.deploymentTransaction()?.hash || "—";
    console.log(`  tx: ${txHash}`);
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    console.log(`  ✅ ${m.symbol} → ${address}\n`);
    deployed.push({ symbol: m.symbol, name: m.name, address, txHash, args });
  }

  // ── Persist a deployment manifest + per-token verify args files ───────────
  const outDir = path.join(__dirname, "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const manifestPath = path.join(outDir, `metal-tokens.${net.chainId}.json`);
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        chainId: Number(net.chainId),
        deployer: deployer.address,
        reserveInfoURI: RESERVE_INFO_URI,
        deployedAt: new Date().toISOString(),
        tokens: deployed.map((d) => ({ symbol: d.symbol, address: d.address, txHash: d.txHash })),
      },
      null,
      2,
    ),
  );
  for (const d of deployed) {
    fs.writeFileSync(
      path.join(outDir, `verify-args.${d.symbol}.js`),
      `module.exports = ${JSON.stringify(d.args)};\n`,
    );
  }

  // ── Summary + next-step snippets ──────────────────────────────────────────
  console.log("═".repeat(72));
  console.log("Deployment summary  →  ", manifestPath);
  console.log("═".repeat(72));
  for (const d of deployed) console.log(`${d.symbol.padEnd(6)} ${d.address}   ${d.name}`);

  console.log("\n// 1) Verify each on BaseScan (clean NatSpec goes public):");
  for (const d of deployed) {
    console.log(
      `npx hardhat verify --network base --constructor-args scripts/deployments/verify-args.${d.symbol}.js ${d.address}`,
    );
  }

  console.log("\n// 2) Paste into CANONICAL_TOKENS in src/config/contracts-v8.ts:");
  for (const d of deployed) {
    console.log(`  ${d.symbol}: "${d.address.toLowerCase()}" as \`0x\${string}\`,`);
  }

  console.log(
    "\nNext: backfill (scripts/backfill-metal-tokens.ts) BEFORE handing off roles to the Safe.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
