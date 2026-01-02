const { ethers } = require("ethers");

const SEPOLIA_RPC = "https://sepolia.infura.io/v3/06f4a3d8bae44ffb889975d654d8a680";
const OWNER_PRIVATE_KEY = "0xce3400bebcef2d7603216e8340b7ee29bcb493edb8f7b30d088c3edec63bc401";
const AUXG = "0xE044a46907a99245F06d294352A80C6165B7Ab6e";
const ORACLE = "0x45677fc1bE2F59937Fd6A93145Db76beB38a7CcA";
const HOT_WALLET = "0xbE8993001F475AF12eFC4185d96859D0b191ABa9";

// Token ID for gold
const GOLD_TOKEN_ID = "0x3496e2e73c4d42b75d702e60d9e48102720b8691234415963a5a857b86425d07";

const ORACLE_ABI = [
  "function getLatestPrice(bytes32 tokenId) view returns (uint256)",
  "function getEthPrice() view returns (uint256)",
];

const TOKEN_ABI = [
  "function mint(uint256 amount) external payable",
  "function mint(address to, uint256 amount) external",
  "function buyPrice() view returns (uint256)",
  "function getPrice() view returns (uint256, uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
];

async function main() {
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const wallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
  
  // Check oracle
  console.log("=== Oracle Check ===");
  const oracle = new ethers.Contract(ORACLE, ORACLE_ABI, provider);
  
  try {
    const goldPrice = await oracle.getLatestPrice(GOLD_TOKEN_ID);
    console.log("Gold price from oracle:", ethers.formatUnits(goldPrice, 8), "USD");
  } catch(e) {
    console.log("Oracle getLatestPrice error:", e.message.slice(0, 60));
  }

  try {
    const ethPrice = await oracle.getEthPrice();
    console.log("ETH price from oracle:", ethers.formatUnits(ethPrice, 8), "USD");
  } catch(e) {
    console.log("Oracle getEthPrice error:", e.message.slice(0, 60));
  }

  // Check token functions
  console.log("\n=== Token Check ===");
  const token = new ethers.Contract(AUXG, TOKEN_ABI, wallet);
  
  try {
    const [buyPrice, sellPrice] = await token.getPrice();
    console.log("Buy price:", ethers.formatUnits(buyPrice, 18), "ETH/gram");
    console.log("Sell price:", ethers.formatUnits(sellPrice, 18), "ETH/gram");
  } catch(e) {
    console.log("getPrice error:", e.message.slice(0, 60));
  }

  // Try mint(uint256) - self mint with ETH payment
  console.log("\n=== Trying mint(uint256) with ETH ===");
  try {
    const amount = ethers.parseUnits("10", 3); // 10 grams
    // Estimate ETH needed (assume ~$95/gram, ~$3800/ETH = 0.025 ETH/gram)
    const ethValue = ethers.parseEther("0.3"); // 0.3 ETH for 10 grams
    
    console.log("Minting 10 grams with 0.3 ETH...");
    const tx = await token["mint(uint256)"](amount, { value: ethValue, gasLimit: 300000 });
    console.log("TX:", tx.hash);
    await tx.wait();
    console.log("✅ Minted!");
    
    const balance = await token.balanceOf(wallet.address);
    console.log("New balance:", ethers.formatUnits(balance, 3), "AUXG");
  } catch(e) {
    console.log("mint(uint256) error:", e.reason || e.message.slice(0, 100));
  }
}

main().catch(console.error);
