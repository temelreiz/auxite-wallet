const { ethers } = require("ethers");

const SEPOLIA_RPC = "https://sepolia.infura.io/v3/06f4a3d8bae44ffb889975d654d8a680";
const OWNER_PRIVATE_KEY = "0xce3400bebcef2d7603216e8340b7ee29bcb493edb8f7b30d088c3edec63bc401";
const ORACLE = "0x45677fc1bE2F59937Fd6A93145Db76beB38a7CcA";

const GOLD_ID = "0x3496e2e73c4d42b75d702e60d9e48102720b8691234415963a5a857b86425d07";
const SILVER_ID = "0xee566534db4be977568dfe4ffe67466f5f29880d065f02314dd9f131ef9fb0ae";

async function main() {
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const wallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
  
  console.log("=== Setting Oracle Prices ===\n");
  
  // Gold: $95/gram = 9500000000 (8 decimals)
  // Silver: $1.10/gram = 110000000
  // Platinum: $32/gram = 3200000000
  // Palladium: $33/gram = 3300000000
  // ETH: $3500 = 350000000000
  
  const prices = [
    { id: GOLD_ID, price: 9500000000n, name: "Gold" },
    { id: SILVER_ID, price: 110000000n, name: "Silver" },
  ];
  
  for (const p of prices) {
    console.log(`Setting ${p.name} price...`);
    try {
      // updatePrice(bytes32,uint256)
      const data = "0x8d6cc56d" + 
        p.id.slice(2) + 
        p.price.toString(16).padStart(64, '0');
      
      const tx = await wallet.sendTransaction({
        to: ORACLE,
        data: data,
        gasLimit: 100000,
        maxFeePerGas: ethers.parseUnits("30", "gwei"),
        maxPriorityFeePerGas: ethers.parseUnits("10", "gwei"),
      });
      console.log("TX:", tx.hash);
      await tx.wait();
      console.log("✅ Done");
    } catch(e) {
      console.log("Error:", e.message.slice(0, 60));
    }
  }
  
  // Set ETH price
  console.log("\nSetting ETH price...");
  try {
    const ethPrice = 350000000000n;
    const data = "0x837a6a95" + ethPrice.toString(16).padStart(64, '0');
    
    const tx = await wallet.sendTransaction({
      to: ORACLE,
      data: data,
      gasLimit: 100000,
      maxFeePerGas: ethers.parseUnits("30", "gwei"),
      maxPriorityFeePerGas: ethers.parseUnits("10", "gwei"),
    });
    console.log("TX:", tx.hash);
    await tx.wait();
    console.log("✅ ETH price set");
  } catch(e) {
    console.log("Error:", e.message.slice(0, 60));
  }
  
  // Verify prices
  console.log("\n=== Verifying Prices ===");
  
  // getLatestPrice(GOLD_ID)
  const goldResult = await provider.call({
    to: ORACLE,
    data: "0x0e032ba0" + GOLD_ID.slice(2),
  });
  console.log("Gold:", BigInt(goldResult).toString());
  
  // getEthPrice
  const ethResult = await provider.call({
    to: ORACLE,
    data: "0xc551b800",
  });
  console.log("ETH:", BigInt(ethResult).toString());
  
  // Now try mint
  console.log("\n=== Testing Mint ===");
  const AUXG = "0xE044a46907a99245F06d294352A80C6165B7Ab6e";
  
  // Check getPrice on AUXG
  try {
    const ABI = ["function getPrice() view returns (uint256, uint256)"];
    const auxg = new ethers.Contract(AUXG, ABI, provider);
    const [buyPrice, sellPrice] = await auxg.getPrice();
    console.log("AUXG Buy price:", ethers.formatEther(buyPrice), "ETH/gram");
    console.log("AUXG Sell price:", ethers.formatEther(sellPrice), "ETH/gram");
  } catch(e) {
    console.log("getPrice still failing:", e.message.slice(0, 60));
  }
}

main().catch(console.error);
