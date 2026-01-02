const { ethers } = require("ethers");

const SEPOLIA_RPC = "https://sepolia.infura.io/v3/06f4a3d8bae44ffb889975d654d8a680";
const OWNER_PRIVATE_KEY = "0xce3400bebcef2d7603216e8340b7ee29bcb493edb8f7b30d088c3edec63bc401";
const AUXG = "0xE044a46907a99245F06d294352A80C6165B7Ab6e";
const HOT_WALLET = "0xbE8993001F475AF12eFC4185d96859D0b191ABa9";

async function main() {
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const wallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
  const code = await provider.getCode(AUXG);
  
  console.log("=== Finding setCheckSupplyEnabled ===\n");
  
  // Search for setter pattern - function that writes to storage slot of 7ad7fd24
  // Common naming: setCheckSupplyEnabled, setSupplyCheck, disableSupplyCheck
  
  // Compute potential selectors
  const functionNames = [
    "setCheckSupplyEnabled(bool)",
    "setSupplyCheckEnabled(bool)",
    "enableSupplyCheck(bool)",
    "disableSupplyCheck()",
    "setMaxSupply(uint256)",
    "updateMaxSupply(uint256)",
  ];
  
  for (const fn of functionNames) {
    const selector = ethers.id(fn).slice(0, 10);
    const found = code.toLowerCase().includes(selector.slice(2));
    console.log(found ? "✅" : "❌", fn, selector);
  }
  
  // Try setCheckSupplyEnabled(false)
  console.log("\n=== Trying to disable supply check ===");
  const setCheckSelector = ethers.id("setCheckSupplyEnabled(bool)").slice(0, 10);
  console.log("Selector:", setCheckSelector);
  
  // false = 0
  const data = setCheckSelector + "0".padStart(64, '0');
  
  try {
    const tx = await wallet.sendTransaction({
      to: AUXG,
      data: data,
      gasLimit: 100000,
      maxFeePerGas: ethers.parseUnits("30", "gwei"),
      maxPriorityFeePerGas: ethers.parseUnits("10", "gwei"),
    });
    console.log("TX:", tx.hash);
    await tx.wait();
    console.log("✅ TX Success");
  } catch(e) {
    console.log("TX Failed:", e.message.slice(0, 60));
  }
  
  // Check value
  const result = await provider.call({ to: AUXG, data: "0x7ad7fd24" });
  console.log("checkSupplyEnabled now:", BigInt(result).toString());
  
  // Try mint
  console.log("\n=== Retry Mint ===");
  const toAddress = HOT_WALLET.toLowerCase().slice(2).padStart(64, '0');
  const amount = (100000n).toString(16).padStart(64, '0'); // 100 grams
  const mintData = "0x40c10f19" + toAddress + amount;
  
  try {
    await provider.call({ to: AUXG, data: mintData, from: wallet.address });
    console.log("✅ Static call passed!");
    
    const tx = await wallet.sendTransaction({
      to: AUXG,
      data: mintData,
      gasLimit: 200000,
      maxFeePerGas: ethers.parseUnits("30", "gwei"),
      maxPriorityFeePerGas: ethers.parseUnits("10", "gwei"),
    });
    console.log("TX:", tx.hash);
    await tx.wait();
    console.log("✅ Minted!");
    
    // Check balance
    const balanceData = "0x70a08231" + HOT_WALLET.toLowerCase().slice(2).padStart(64, '0');
    const balance = await provider.call({ to: AUXG, data: balanceData });
    console.log("Hot wallet AUXG:", Number(BigInt(balance)) / 1000, "grams");
  } catch(e) {
    console.log("Still failing:", e.reason || e.message.slice(0, 60));
  }
}

main().catch(console.error);
