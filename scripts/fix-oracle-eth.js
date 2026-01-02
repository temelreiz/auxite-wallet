const { ethers } = require("ethers");

const SEPOLIA_RPC = "https://sepolia.infura.io/v3/06f4a3d8bae44ffb889975d654d8a680";
const OWNER_PRIVATE_KEY = "0xce3400bebcef2d7603216e8340b7ee29bcb493edb8f7b30d088c3edec63bc401";
const ORACLE = "0x45677fc1bE2F59937Fd6A93145Db76beB38a7CcA";

async function main() {
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const wallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
  
  // Check current ETH price
  console.log("=== Checking Oracle ETH Price ===");
  
  // Call getEthPrice (0xc551b800)
  try {
    const result = await provider.call({
      to: ORACLE,
      data: "0xc551b800",
    });
    console.log("getEthPrice result:", result);
    if (result && result !== "0x") {
      const price = BigInt(result);
      console.log("ETH price:", price.toString(), "(", Number(price) / 1e8, "USD)");
    }
  } catch(e) {
    console.log("getEthPrice failed:", e.message.slice(0, 60));
  }

  // Find the setEthPrice function - try common selectors
  const possibleFunctions = [
    { name: "setEthPrice(uint256)", data: "0x837a6a95" },
    { name: "updateEthPrice(uint256)", data: "0x" },
  ];

  // Try to set ETH price: $3500 = 350000000000 (8 decimals)
  const ethPrice = 350000000000n;
  const ethPriceHex = ethPrice.toString(16).padStart(64, '0');
  
  console.log("\n=== Setting ETH Price ===");
  
  // Try setEthPrice(uint256) - selector 0x837a6a95
  try {
    const tx = await wallet.sendTransaction({
      to: ORACLE,
      data: "0x837a6a95" + ethPriceHex,
      gasLimit: 100000,
      maxFeePerGas: ethers.parseUnits("20", "gwei"),
      maxPriorityFeePerGas: ethers.parseUnits("5", "gwei"),
    });
    console.log("setEthPrice TX:", tx.hash);
    await tx.wait();
    console.log("✅ ETH price set!");
  } catch(e) {
    console.log("setEthPrice failed:", e.message.slice(0, 80));
  }

  // Verify
  try {
    const result = await provider.call({
      to: ORACLE,
      data: "0xc551b800",
    });
    const price = BigInt(result);
    console.log("\nVerified ETH price:", price.toString(), "(", Number(price) / 1e8, "USD)");
  } catch(e) {
    console.log("Verify failed");
  }
}

main().catch(console.error);
