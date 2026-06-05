// scripts/derive-check.mjs — READ-ONLY safety check for per-user deposit
// address derivation. Prints ONLY addresses (never the mnemonic or any
// private key). Confirms HOT_WALLET_MNEMONIC is a valid seed we control and
// shows its relationship to the known hot wallet.
import { ethers } from "ethers";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env.local") });

const phrase = (process.env.HOT_WALLET_MNEMONIC || "").trim();
const hotEth = (process.env.HOT_WALLET_ETH_ADDRESS || "").toLowerCase();

if (!phrase) {
  console.error("HOT_WALLET_MNEMONIC not set");
  process.exit(1);
}

const wordCount = phrase.split(/\s+/).length;
console.log(`\nMnemonic present: ${wordCount} words (valid lengths: 12/15/18/21/24)`);
let valid = false;
try {
  ethers.Mnemonic.fromPhrase(phrase);
  valid = true;
} catch (e) {
  console.log("⚠️  Mnemonic failed checksum validation:", e.message);
}
console.log(`Checksum valid: ${valid}`);
console.log(`Known hot wallet (HOT_WALLET_ETH_ADDRESS): ${hotEth}\n`);

if (!valid) process.exit(1);

const mn = ethers.Mnemonic.fromPhrase(phrase);
const root = ethers.HDNodeWallet.fromMnemonic(mn, "m");

console.log("Derived EVM addresses at m/44'/60'/0'/0/{i}:");
let matchIndex = -1;
for (let i = 0; i < 6; i++) {
  const child = root.derivePath(`44'/60'/0'/0/${i}`);
  const addr = child.address;
  const isHot = addr.toLowerCase() === hotEth;
  if (isHot) matchIndex = i;
  console.log(`  index ${i}: ${addr}${isHot ? "   <-- HOT WALLET" : ""}`);
}

console.log("");
if (matchIndex >= 0) {
  console.log(`✅ Hot wallet IS derivable from this mnemonic (index ${matchIndex}). We fully control all derived addresses.`);
} else {
  console.log("ℹ️  Hot wallet is a separate key (not on this path), but the mnemonic is a valid seed we hold —");
  console.log("   so every address we derive from it is still controlled by us (re-derivable for sweeping).");
}
console.log("\n(No secrets printed. Deposit addresses for users would start at a high index, e.g. 1000+.)\n");
