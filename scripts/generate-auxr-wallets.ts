// ============================================================================
// scripts/generate-auxr-wallets.ts
// ----------------------------------------------------------------------------
// One-shot bootstrap for Sepolia deployment. Creates three EOAs and appends
// them to .env (idempotent — won't overwrite if already set):
//
//   PRIVATE_KEY                Deployer (also default admin/minter on first deploy)
//   AUXR_DEPOSIT_PRIVATE_KEY   Holds AUXR sent back to Auxite; burns on credit
//   AUXR_DEPOSIT_ADDRESS       Derived from the deposit key
//
// After running:
//   1. Fund the deployer address with Sepolia ETH:
//        https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
//        https://www.alchemy.com/faucets/base-sepolia
//   2. Deploy:  npm run contracts:deploy:sepolia
//   3. After deploy, add AUXR_CONTRACT_ADDRESS=0x... to .env from the
//      deployments/auxr-baseSepolia.json file.
//
// Usage:
//   npx ts-node scripts/generate-auxr-wallets.ts
//   # or
//   node --import 'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("ts-node/esm", pathToFileURL("./"));' scripts/generate-auxr-wallets.ts
//
// Safety: these are TESTNET keys. Do not use for mainnet without rotating
// to a Safe multisig and/or KMS-controlled signer.
// ============================================================================

import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import * as fs from "node:fs";
import * as path from "node:path";

const ENV_PATH = path.join(__dirname, "..", ".env");

interface EnvLine {
  key: string;
  value: string;
  comment?: string;
}

function readEnv(): Map<string, string> {
  const map = new Map<string, string>();
  if (!fs.existsSync(ENV_PATH)) return map;
  const lines = fs.readFileSync(ENV_PATH, "utf-8").split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    map.set(line.slice(0, eq).trim(), line.slice(eq + 1).trim());
  }
  return map;
}

function appendEnv(entries: EnvLine[]) {
  const header = `\n# ── AUXR wallets (generated ${new Date().toISOString()}) ──\n`;
  const body = entries
    .map((e) =>
      e.comment ? `# ${e.comment}\n${e.key}=${e.value}` : `${e.key}=${e.value}`
    )
    .join("\n");
  fs.appendFileSync(ENV_PATH, `${header}${body}\n`);
}

function main() {
  const existing = readEnv();
  const toAppend: EnvLine[] = [];

  // 1. Deployer / admin / minter
  if (!existing.get("PRIVATE_KEY")) {
    const pk = generatePrivateKey();
    const acct = privateKeyToAccount(pk);
    toAppend.push({
      key: "PRIVATE_KEY",
      value: pk,
      comment: `Deployer EOA — address ${acct.address}`,
    });
    console.log(`Generated PRIVATE_KEY      → ${acct.address}`);
  } else {
    const acct = privateKeyToAccount(existing.get("PRIVATE_KEY") as `0x${string}`);
    console.log(`Existing PRIVATE_KEY       → ${acct.address}  (kept)`);
  }

  // 2. Deposit wallet (receives AUXR returned to Auxite, burns it)
  if (!existing.get("AUXR_DEPOSIT_PRIVATE_KEY")) {
    const pk = generatePrivateKey();
    const acct = privateKeyToAccount(pk);
    toAppend.push({
      key: "AUXR_DEPOSIT_PRIVATE_KEY",
      value: pk,
      comment: `Deposit address signer (burns received AUXR on credit)`,
    });
    toAppend.push({ key: "AUXR_DEPOSIT_ADDRESS", value: acct.address });
    console.log(`Generated DEPOSIT          → ${acct.address}`);
  } else {
    const acct = privateKeyToAccount(
      existing.get("AUXR_DEPOSIT_PRIVATE_KEY") as `0x${string}`
    );
    console.log(`Existing DEPOSIT           → ${acct.address}  (kept)`);
  }

  // 3. Minter — default to PRIVATE_KEY (admin is auto-granted MINTER_ROLE).
  //    Rotate post-deployment to a separate backend signer if desired.
  if (!existing.get("AUXR_MINTER_PRIVATE_KEY")) {
    const usePk =
      existing.get("PRIVATE_KEY") ||
      toAppend.find((e) => e.key === "PRIVATE_KEY")?.value ||
      generatePrivateKey();
    toAppend.push({
      key: "AUXR_MINTER_PRIVATE_KEY",
      value: usePk,
      comment: `Mirrors PRIVATE_KEY initially; rotate to dedicated backend signer post-launch`,
    });
    const acct = privateKeyToAccount(usePk as `0x${string}`);
    console.log(`MINTER                     → ${acct.address}  (= deployer)`);
  }

  // 4. AUXR_CHAIN default
  if (!existing.get("AUXR_CHAIN")) {
    toAppend.push({
      key: "AUXR_CHAIN",
      value: "baseSepolia",
      comment: `Switch to "base" after Sepolia validation + audit`,
    });
  }

  if (toAppend.length === 0) {
    console.log("\nNothing to append — all AUXR env vars already set.");
    return;
  }

  appendEnv(toAppend);

  const deployerAddr = (() => {
    const pk =
      existing.get("PRIVATE_KEY") ||
      toAppend.find((e) => e.key === "PRIVATE_KEY")?.value;
    return pk ? privateKeyToAccount(pk as `0x${string}`).address : "(unknown)";
  })();

  console.log("");
  console.log("─".repeat(70));
  console.log(`.env updated with ${toAppend.length} new entries.`);
  console.log("");
  console.log("Next steps:");
  console.log(`  1. Fund the deployer with Sepolia ETH:`);
  console.log(`     Deployer address: ${deployerAddr}`);
  console.log(`     Faucet:           https://www.alchemy.com/faucets/base-sepolia`);
  console.log(`  2. Deploy:`);
  console.log(`     npm run contracts:deploy:sepolia`);
  console.log(`  3. After deploy, copy the contract address from`);
  console.log(`     deployments/auxr-baseSepolia.json into .env as`);
  console.log(`     AUXR_CONTRACT_ADDRESS=0x...`);
  console.log("─".repeat(70));
}

main();
