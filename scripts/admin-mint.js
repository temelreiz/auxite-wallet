const { ethers } = require("ethers");

const SEPOLIA_RPC = "https://sepolia.infura.io/v3/06f4a3d8bae44ffb889975d654d8a680";
const OWNER_PRIVATE_KEY = "0xce3400bebcef2d7603216e8340b7ee29bcb493edb8f7b30d088c3edec63bc401";
const AUXG = "0xE044a46907a99245F06d294352A80C6165B7Ab6e";
const HOT_WALLET = "0xbE8993001F475AF12eFC4185d96859D0b191ABa9";

async function main() {
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const wallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
  
  // mint(address,uint256) selector: 0x40c10f19
  // Hot wallet address padded to 32 bytes
  // Amount: 100 grams = 100000 (3 decimals) = 0x186a0
  
  const toAddress = HOT_WALLET.toLowerCase().slice(2).padStart(64, '0');
  const amount = (100000n).toString(16).padStart(64, '0'); // 100 grams
  const mintData = "0x40c10f19" + toAddress + amount;
  
  console.log("=== Admin Mint (MINTER_ROLE) ===");
  console.log("To:", HOT_WALLET);
  console.log("Amount: 100 grams");
  console.log("Data:", mintData.slice(0, 20) + "...");
  
  // Static call first
  console.log("\n=== Static Call Test ===");
  try {
    await provider.call({
      to: AUXG,
      data: mintData,
      from: wallet.address,
    });
    console.log("✅ Static call passed!");
  } catch(e) {
    console.log("❌ Static call failed:", e.reason || e.message.slice(0, 80));
    
    // Check MINTER_ROLE
    const MINTER_ROLE = "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6";
    const hasRoleData = "0x91d14854" + MINTER_ROLE.slice(2) + wallet.address.toLowerCase().slice(2).padStart(64, '0');
    const result = await provider.call({ to: AUXG, data: hasRoleData });
    console.log("Has MINTER_ROLE:", BigInt(result).toString() === "1" ? "YES" : "NO");
    return;
  }
  
  // Send real TX
  console.log("\n=== Sending Transaction ===");
  const tx = await wallet.sendTransaction({
    to: AUXG,
    data: mintData,
    gasLimit: 200000,
    maxFeePerGas: ethers.parseUnits("30", "gwei"),
    maxPriorityFeePerGas: ethers.parseUnits("10", "gwei"),
  });
  
  console.log("TX:", tx.hash);
  const receipt = await tx.wait();
  console.log("Status:", receipt.status === 1 ? "✅ Success" : "❌ Failed");
  
  // Check balance
  const balanceData = "0x70a08231" + HOT_WALLET.toLowerCase().slice(2).padStart(64, '0');
  const balanceResult = await provider.call({ to: AUXG, data: balanceData });
  console.log("Hot wallet AUXG balance:", Number(BigInt(balanceResult)) / 1000, "grams");
}

main().catch(console.error);
