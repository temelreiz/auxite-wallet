// scripts/derive-vectors.mjs — verify HD derivation against PUBLIC BIP test
// vectors (uses the standard "abandon…about" test mnemonic, not our seed).
// Mirrors the exact derivation in src/lib/hd-deposit.ts.
import { ethers } from "ethers";
import * as bitcoin from "bitcoinjs-lib";
import { HDKey } from "@scure/bip32";
import { mnemonicToSeedSync } from "@scure/bip39";

const TEST_MNEMONIC =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

// Known-good public vectors for the test mnemonic:
const EXPECT_EVM0 = "0x9858EfFD232B4033E47d90003D41EC34EcaEda94"; // m/44'/60'/0'/0/0
const EXPECT_BTC0 = "bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu";   // m/84'/0'/0'/0/0

function evm(index) {
  const mn = ethers.Mnemonic.fromPhrase(TEST_MNEMONIC);
  const root = ethers.HDNodeWallet.fromMnemonic(mn, "m");
  return root.derivePath(`44'/60'/0'/0/${index}`).address;
}
function btc(index) {
  const seed = mnemonicToSeedSync(TEST_MNEMONIC);
  const root = HDKey.fromMasterSeed(seed);
  const child = root.derive(`m/84'/0'/0'/0/${index}`);
  const { address } = bitcoin.payments.p2wpkh({
    pubkey: Buffer.from(child.publicKey),
    network: bitcoin.networks.bitcoin,
  });
  return address;
}

const evm0 = evm(0);
const btc0 = btc(0);

const evmOk = evm0.toLowerCase() === EXPECT_EVM0.toLowerCase();
const btcOk = btc0 === EXPECT_BTC0;

console.log(`\nEVM m/44'/60'/0'/0/0: ${evm0}  ${evmOk ? "✅" : "❌ expected " + EXPECT_EVM0}`);
console.log(`BTC m/84'/0'/0'/0/0: ${btc0}  ${btcOk ? "✅" : "❌ expected " + EXPECT_BTC0}`);
console.log("\nDistinct addresses per index (sanity):");
for (let i = 0; i < 3; i++) console.log(`  i=${i}  evm=${evm(i)}  btc=${btc(i)}`);

if (!evmOk || !btcOk) {
  console.error("\n❌ Derivation does NOT match public vectors — DO NOT ship.");
  process.exit(1);
}
console.log("\n✅ Both match public BIP vectors. Derivation is correct.\n");
