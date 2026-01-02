const { ethers } = require("ethers");

const SEPOLIA_RPC = "https://sepolia.infura.io/v3/06f4a3d8bae44ffb889975d654d8a680";
const OWNER_PRIVATE_KEY = "0xce3400bebcef2d7603216e8340b7ee29bcb493edb8f7b30d088c3edec63bc401";
const AUXG = "0xE044a46907a99245F06d294352A80C6165B7Ab6e";

async function main() {
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const wallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
  
  // 7ad7fd24 might be checkSupplyEnabled or similar
  // Let's try to set it to false
  
  console.log("=== Trying to disable checks ===\n");
  
  // Common setter patterns - try setting 7ad7fd24 related value to false
  const setters = [
    { sel: "4a14f136", name: "setCheckSupplyEnabled(bool)", value: "0" }, // guess
    { sel: "b613b114", name: "setSupplyCheckEnabled(bool)", value: "0" },
    { sel: "ee50ee1b", name: "setMinPurchase(uint256)", value: "1" }, // maybe min purchase?
  ];
  
  for (const s of setters) {
    const data = "0x" + s.sel + s.value.padStart(64, '0');
    console.log(`Trying ${s.name}...`);
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
      console.log("✅ Success!");
    } catch(e) {
      console.log("Failed:", e.message.slice(0, 50));
    }
  }
  
  // Check the 7ad7fd24 value again
  const result = await provider.call({ to: AUXG, data: "0x7ad7fd24" });
  console.log("\n7ad7fd24 value now:", BigInt(result).toString());
  
  // Try mint again
  console.log("\n=== Retry Admin Mint ===");
  const HOT_WALLET = "0xbE8993001F475AF12eFC4185d96859D0b191ABa9";
  const toAddress = HOT_WALLET.toLowerCase().slice(2).padStart(64, '0');
  const amount = (100000n).toString(16).padStart(64, '0');
  const mintData = "0x40c10f19" + toAddress + amount;
  
  try {
    await provider.call({ to: AUXG, data: mintData, from: wallet.address });
    console.log("✅ Static call passed! Sending TX...");
    
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
  } catch(e) {
    console.log("Still failing:", e.reason || e.message.slice(0, 60));
  }
}

main().catch(console.error);
