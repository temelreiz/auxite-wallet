// scripts/tron-derive-test.mjs — prove Tron (TRC20) address derivation from an
// HD seed using only available libs (bs58 + ethers + @scure/bip32 + node crypto).
// Uses the PUBLIC test mnemonic. A Tron address = base58check(0x41 ++ keccak256(
// uncompressedPubKey[1:])[-20:]).
import { ethers } from "ethers";
import { HDKey } from "@scure/bip32";
import { mnemonicToSeedSync } from "@scure/bip39";
import bs58 from "bs58";
import { createHash } from "crypto";

const TEST_MNEMONIC =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

function sha256(buf) { return createHash("sha256").update(buf).digest(); }

function tronAddressFromPriv(privHex) {
  // uncompressed pubkey: 0x04 + X(32) + Y(32)
  const uncompressed = ethers.SigningKey.computePublicKey("0x" + privHex, false); // 0x04...
  const pubNoPrefix = "0x" + uncompressed.slice(4); // drop 0x04
  const hash = ethers.keccak256(pubNoPrefix); // 0x + 64 hex
  const last20 = hash.slice(-40); // 20 bytes
  const addr21 = Buffer.from("41" + last20, "hex"); // mainnet prefix 0x41
  const checksum = sha256(sha256(addr21)).subarray(0, 4);
  return bs58.encode(Buffer.concat([addr21, checksum]));
}

function deriveTron(index) {
  const seed = mnemonicToSeedSync(TEST_MNEMONIC);
  const root = HDKey.fromMasterSeed(seed);
  const child = root.derive(`m/44'/195'/0'/0/${index}`);
  const privHex = Buffer.from(child.privateKey).toString("hex");
  return tronAddressFromPriv(privHex);
}

// round-trip check: base58check decodes back to 0x41 + 20 bytes with valid checksum
function isValidTron(addr) {
  try {
    const bytes = Buffer.from(bs58.decode(addr));
    const payload = bytes.subarray(0, bytes.length - 4);
    const checksum = bytes.subarray(bytes.length - 4);
    const expect = sha256(sha256(payload)).subarray(0, 4);
    return payload[0] === 0x41 && payload.length === 21 && checksum.equals(expect) && addr.startsWith("T");
  } catch { return false; }
}

for (let i = 0; i < 3; i++) {
  const a = deriveTron(i);
  console.log(`index ${i}: ${a}  valid=${isValidTron(a)}  len=${a.length}`);
}
console.log("\nKnown public vector check (test mnemonic m/44'/195'/0'/0/0):");
console.log("  derived:", deriveTron(0));
console.log("  expected (BIP44 Tron test vector): TUEZSdKsoDHQMeZwihtdoBiN46zxhGWYdH");
console.log("  MATCH:", deriveTron(0) === "TUEZSdKsoDHQMeZwihtdoBiN46zxhGWYdH");
