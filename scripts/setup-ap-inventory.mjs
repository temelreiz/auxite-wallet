// Creates the AUXR AP inventory wallet and stores its key in Vercel.
//   node scripts/setup-ap-inventory.mjs
// Generates a fresh key, writes AUXR_AP_INVENTORY_PRIVATE_KEY to the
// auxite-wallet project's Production environment and prints ONLY the
// address — the key is never shown or written to disk. Refuses to run if the
// variable already exists, so an inventory holding AUXR is never orphaned.
// Redeploy afterwards for the key to take effect.
import { execFileSync } from "node:child_process";
import { Wallet } from "ethers";

const NAME = "AUXR_AP_INVENTORY_PRIVATE_KEY";
const scope = process.env.VERCEL_SCOPE || "auxite";

const existing = execFileSync("vercel", ["env", "ls", "production", "--scope", scope], { encoding: "utf8" });
if (new RegExp(`\\b${NAME}\\b`).test(existing)) {
  console.error(`${NAME} already exists in Production — not replacing it.`);
  process.exit(1);
}

const wallet = Wallet.createRandom();
execFileSync("vercel", ["env", "add", NAME, "production", "--sensitive", "--scope", scope], {
  input: wallet.privateKey,
  stdio: ["pipe", "ignore", "inherit"],
});
console.log(`✓ ${NAME} saved (sensitive, Production)`);
console.log(`Inventory address: ${wallet.address}`);
console.log("Next: redeploy, mint 600 AUXR to this address from the Safe, send ~0.005 Base ETH for gas.");
