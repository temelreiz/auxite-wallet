const { ethers } = require("ethers");

const SEPOLIA_RPC = "https://sepolia.infura.io/v3/06f4a3d8bae44ffb889975d654d8a680";
const OWNER_PRIVATE_KEY = "0xce3400bebcef2d7603216e8340b7ee29bcb493edb8f7b30d088c3edec63bc401";
const AUXG = "0xE044a46907a99245F06d294352A80C6165B7Ab6e";

async function main() {
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const wallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
  const code = await provider.getCode(AUXG);
  
  console.log("=== Searching for Vault Functions ===\n");
  
  // Common vault-related function selectors
  const selectors = {
    "8456cb59": "pause()",
    "3f4ba83a": "unpause()",
    "d5abeb01": "maxSupply()",
    "18160ddd": "totalSupply()",
    "e985e9c5": "isApprovedForAll(address,address)",
    "97b8a3a7": "tokenId()",
    "7ad7fd24": "checkSupplyEnabled()", 
    "ee50ee1b": "minPurchase()",
    "4eb4096f": "setVault(address)",
    "fbfa77cf": "vault()",
    "0e89439b": "setVaultAddress(address)",
    "48b96be2": "vaultAddress()",
    "d0209f96": "setOracle(address)",
    "7dc0d1d0": "oracle()",
  };
  
  console.log("Functions found in bytecode:");
  for (const [sel, name] of Object.entries(selectors)) {
    if (code.toLowerCase().includes(sel)) {
      console.log(`  ✅ ${name} (0x${sel})`);
      
      // Try to call view functions
      if (name.endsWith("()") && !name.startsWith("set") && !name.startsWith("pause") && !name.startsWith("unpause")) {
        try {
          const result = await provider.call({ to: AUXG, data: "0x" + sel });
          if (result.length === 66) {
            const val = BigInt(result);
            if (val < 1000000) {
              console.log(`     → ${val.toString()}`);
            } else if (result.startsWith("0x000000000000000000000000")) {
              console.log(`     → ${result.slice(0, 42).replace("0x000000000000000000000000", "0x")}`);
            }
          }
        } catch(e) {}
      }
    }
  }
  
  // Check maxSupply and totalSupply
  console.log("\n=== Supply Check ===");
  try {
    const maxSupply = await provider.call({ to: AUXG, data: "0xd5abeb01" });
    console.log("maxSupply:", ethers.formatUnits(BigInt(maxSupply), 3), "grams");
  } catch(e) {
    console.log("maxSupply: not found");
  }
  
  try {
    const totalSupply = await provider.call({ to: AUXG, data: "0x18160ddd" });
    console.log("totalSupply:", ethers.formatUnits(BigInt(totalSupply), 3), "grams");
  } catch(e) {
    console.log("totalSupply: not found");
  }
  
  // Check vault
  console.log("\n=== Vault Check ===");
  try {
    const vault = await provider.call({ to: AUXG, data: "0xfbfa77cf" });
    const addr = "0x" + vault.slice(26);
    console.log("vault():", addr);
  } catch(e) {
    console.log("vault(): not found");
  }
  
  try {
    const vault = await provider.call({ to: AUXG, data: "0x48b96be2" });
    const addr = "0x" + vault.slice(26);
    console.log("vaultAddress():", addr);
  } catch(e) {
    console.log("vaultAddress(): not found");
  }
}

main().catch(console.error);
