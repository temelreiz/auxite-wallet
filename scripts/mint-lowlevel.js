const { ethers } = require("ethers");

const SEPOLIA_RPC = "https://sepolia.infura.io/v3/06f4a3d8bae44ffb889975d654d8a680";
const OWNER_PRIVATE_KEY = "0xce3400bebcef2d7603216e8340b7ee29bcb493edb8f7b30d088c3edec63bc401";
const AUXG = "0xE044a46907a99245F06d294352A80C6165B7Ab6e";
const HOT_WALLET = "0xbE8993001F475AF12eFC4185d96859D0b191ABa9";

async function main() {
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const wallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
  
  console.log("=== Low-level Mint Test ===\n");
  
  // mint(uint256) selector: 0xa0712d68
  // 10 grams = 10000 (3 decimals) = 0x2710
  const amount = 10000n;
  const amountHex = amount.toString(16).padStart(64, '0');
  const mintData = "0xa0712d68" + amountHex;
  
  console.log("Mint data:", mintData);
  
  // Get buy price first
  const priceData = "0xcc3c0f06"; // getPrice() selector - returns (uint256, uint256)
  const priceResult = await provider.call({ to: AUXG, data: priceData });
  console.log("Price result:", priceResult);
  
  // Decode - first 32 bytes is buy price
  const buyPrice = BigInt("0x" + priceResult.slice(2, 66));
  console.log("Buy price:", ethers.formatEther(buyPrice), "ETH/gram");
  
  const ethNeeded = buyPrice * 10n; // 10 grams
  console.log("ETH needed for 10g:", ethers.formatEther(ethNeeded));
  
  // Static call first to check
  console.log("\n=== Static Call Test ===");
  try {
    await provider.call({
      to: AUXG,
      data: mintData,
      value: ethNeeded,
      from: wallet.address,
    });
    console.log("✅ Static call succeeded!");
  } catch(e) {
    console.log("❌ Static call failed:", e.message.slice(0, 100));
    
    // Try with more ETH
    console.log("\nTrying with more ETH...");
    try {
      await provider.call({
        to: AUXG,
        data: mintData,
        value: ethers.parseEther("0.3"),
        from: wallet.address,
      });
      console.log("✅ Static call with 0.3 ETH succeeded!");
    } catch(e2) {
      console.log("❌ Still failed:", e2.message.slice(0, 100));
    }
  }
  
  // Check what functions exist
  console.log("\n=== Checking Contract Functions ===");
  const code = await provider.getCode(AUXG);
  
  const selectors = {
    "a0712d68": "mint(uint256)",
    "40c10f19": "mint(address,uint256)", 
    "cc3c0f06": "getPrice()",
    "5c975abb": "paused()",
    "6eb32130": "checkSupplyEnabled()",
    "d5abeb01": "maxSupply()",
  };
  
  for (const [sel, name] of Object.entries(selectors)) {
    const found = code.toLowerCase().includes(sel);
    console.log(found ? "✅" : "❌", name);
  }
}

main().catch(console.error);
