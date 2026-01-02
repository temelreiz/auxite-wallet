const { ethers } = require("ethers");

const SEPOLIA_RPC = "https://sepolia.infura.io/v3/06f4a3d8bae44ffb889975d654d8a680";
const OWNER_PRIVATE_KEY = "0xce3400bebcef2d7603216e8340b7ee29bcb493edb8f7b30d088c3edec63bc401";
const AUXG = "0xE044a46907a99245F06d294352A80C6165B7Ab6e";

async function main() {
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const wallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
  
  const code = await provider.getCode(AUXG);
  
  // Find all view functions and try them
  const selectors = {
    "5c975abb": "paused()",
    "6eb32130": "pauseTimeRemaining()",
    "d1bc352f": "freezeStatus(address)",
    "97b8a3a7": "?_unknown_97b8a3a7",
    "300b0221": "?_unknown_300b0221",  
    "45e62881": "?_unknown_45e62881",
    "7ad7fd24": "?_unknown_7ad7fd24",
    "ee50ee1b": "?_unknown_ee50ee1b",
  };
  
  console.log("=== Checking Contract State ===\n");
  
  for (const [sel, name] of Object.entries(selectors)) {
    if (!code.toLowerCase().includes(sel)) continue;
    
    try {
      const result = await provider.call({
        to: AUXG,
        data: "0x" + sel,
      });
      console.log(`${name}: ${result}`);
      if (result.length <= 66) {
        const num = BigInt(result);
        console.log(`  → ${num.toString()}`);
      }
    } catch(e) {
      console.log(`${name}: call failed`);
    }
  }
  
  // Check pause time remaining
  console.log("\n=== Specific Checks ===");
  
  // pauseTimeRemaining selector from bytecode: check around 6eb32130
  try {
    const result = await provider.call({ to: AUXG, data: "0x6eb32130" });
    console.log("pauseTimeRemaining:", BigInt(result).toString(), "seconds");
  } catch(e) {
    console.log("pauseTimeRemaining: failed");
  }
  
  // Check if contract is in some pause state
  try {
    const result = await provider.call({ to: AUXG, data: "0x5c975abb" });
    console.log("paused():", BigInt(result).toString() === "1" ? "YES" : "NO");
  } catch(e) {
    console.log("paused(): failed");
  }
  
  // Check pauseStartTime (0x300b0221)
  try {
    const result = await provider.call({ to: AUXG, data: "0x300b0221" });
    const timestamp = Number(BigInt(result));
    if (timestamp > 0) {
      console.log("pauseStartTime:", new Date(timestamp * 1000).toISOString());
    }
  } catch(e) {}
  
  // Check current block timestamp
  const block = await provider.getBlock("latest");
  console.log("\nCurrent time:", new Date(block.timestamp * 1000).toISOString());
  console.log("Block timestamp:", block.timestamp);
}

main().catch(console.error);
