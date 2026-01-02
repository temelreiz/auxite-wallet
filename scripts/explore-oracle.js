const { ethers } = require("ethers");

const SEPOLIA_RPC = "https://sepolia.infura.io/v3/06f4a3d8bae44ffb889975d654d8a680";
const OWNER_PRIVATE_KEY = "0xce3400bebcef2d7603216e8340b7ee29bcb493edb8f7b30d088c3edec63bc401";
const ORACLE = "0x45677fc1bE2F59937Fd6A93145Db76beB38a7CcA";

// Daha geniş ABI
const ORACLE_ABI = [
  "function owner() view returns (address)",
  "function getLatestPrice(bytes32) view returns (uint256)",
  "function c551b800() view returns (uint256)",
  "function setPrice(bytes32, uint256) external",
  "function updatePrice(bytes32, uint256) external",
  "function priceData(bytes32) view returns (uint256 price, uint256 timestamp)",
  "function tokenPrices(bytes32) view returns (uint256)",
  "function ada43a1f(bytes32) view returns (uint256, uint256)", // possible getPrice
];

// Token IDs - from contract bytecode reference
const GOLD_TOKEN_ID = "0x3496e2e73c4d42b75d702e60d9e48102720b8691234415963a5a857b86425d07";
const SILVER_TOKEN_ID = ethers.keccak256(ethers.toUtf8Bytes("AUXS"));
const ETH_TOKEN_ID = ethers.keccak256(ethers.toUtf8Bytes("ETH"));

async function main() {
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const wallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
  const oracle = new ethers.Contract(ORACLE, ORACLE_ABI, wallet);
  
  console.log("=== Checking Oracle Data ===\n");
  
  // Check what token IDs exist
  console.log("GOLD_TOKEN_ID:", GOLD_TOKEN_ID);
  console.log("SILVER keccak:", SILVER_TOKEN_ID);
  console.log("ETH keccak:", ETH_TOKEN_ID);
  
  // Try different getter functions
  console.log("\n=== Trying getters ===");
  
  try {
    const price = await oracle.getLatestPrice(GOLD_TOKEN_ID);
    console.log("Gold getLatestPrice:", price.toString());
  } catch(e) {
    console.log("Gold getLatestPrice failed");
  }

  try {
    const ethPrice = await oracle.c551b800();
    console.log("ETH price (c551b800):", ethPrice.toString());
  } catch(e) {
    console.log("c551b800 failed:", e.message.slice(0, 50));
  }

  // Try ada43a1f which might be getPrice(bytes32)
  try {
    const result = await oracle.ada43a1f(GOLD_TOKEN_ID);
    console.log("ada43a1f result:", result);
  } catch(e) {
    console.log("ada43a1f failed");
  }

  // Try setting with the correct token ID format
  console.log("\n=== Trying different setPrice calls ===");
  
  // Price: $95/gram = 95 * 10^8 = 9500000000
  const goldPrice = 9500000000n;
  
  // Try with GOLD_TOKEN_ID from contract
  try {
    console.log("Trying setPrice with GOLD_TOKEN_ID...");
    const tx = await oracle.updatePrice(GOLD_TOKEN_ID, goldPrice, { gasLimit: 150000 });
    console.log("TX:", tx.hash);
    await tx.wait();
    console.log("✅ Success with updatePrice!");
  } catch(e) {
    console.log("updatePrice failed:", e.reason || e.message.slice(0, 60));
  }

  // Read back
  try {
    const price = await oracle.getLatestPrice(GOLD_TOKEN_ID);
    console.log("\nGold price after update:", price.toString());
  } catch(e) {
    console.log("Read failed after update");
  }
}

main().catch(console.error);
