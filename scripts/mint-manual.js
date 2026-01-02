const { ethers } = require("ethers");

const SEPOLIA_RPC = "https://sepolia.infura.io/v3/06f4a3d8bae44ffb889975d654d8a680";
const OWNER_PRIVATE_KEY = "0xce3400bebcef2d7603216e8340b7ee29bcb493edb8f7b30d088c3edec63bc401";
const AUXG = "0xE044a46907a99245F06d294352A80C6165B7Ab6e";

async function main() {
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const wallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
  
  // mint(uint256) selector: 0xa0712d68
  // 10 grams = 10000 (3 decimals) = 0x2710
  const amount = 10000n;
  const mintData = "0xa0712d68" + amount.toString(16).padStart(64, '0');
  
  console.log("Mint data:", mintData);
  
  // Get buy price
  const priceAbi = ["function getPrice() view returns (uint256, uint256)"];
  const auxg = new ethers.Contract(AUXG, priceAbi, provider);
  const [buyPrice] = await auxg.getPrice();
  const ethNeeded = buyPrice * 10n;
  
  console.log("Buy price:", ethers.formatEther(buyPrice), "ETH/gram");
  console.log("ETH needed:", ethers.formatEther(ethNeeded));
  
  // Static call first
  console.log("\n=== Static Call Test ===");
  try {
    const result = await provider.call({
      to: AUXG,
      data: mintData,
      value: ethNeeded,
      from: wallet.address,
    });
    console.log("✅ Static call passed! Result:", result);
  } catch(e) {
    console.log("❌ Static call failed:", e.reason || e.message.slice(0, 80));
    return;
  }
  
  // If static call passes, send real TX
  console.log("\n=== Sending Transaction ===");
  const tx = await wallet.sendTransaction({
    to: AUXG,
    data: mintData,
    value: ethNeeded,
    gasLimit: 300000,
    maxFeePerGas: ethers.parseUnits("30", "gwei"),
    maxPriorityFeePerGas: ethers.parseUnits("10", "gwei"),
  });
  
  console.log("TX:", tx.hash);
  const receipt = await tx.wait();
  console.log("Status:", receipt.status === 1 ? "✅ Success" : "❌ Failed");
}

main().catch(console.error);
