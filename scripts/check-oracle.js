const { ethers } = require("ethers");

const SEPOLIA_RPC = "https://sepolia.infura.io/v3/06f4a3d8bae44ffb889975d654d8a680";
const OWNER_PRIVATE_KEY = "0xce3400bebcef2d7603216e8340b7ee29bcb493edb8f7b30d088c3edec63bc401";
const ORACLE = "0x45677fc1bE2F59937Fd6A93145Db76beB38a7CcA";

// Common oracle function signatures
const ORACLE_ABI = [
  "function owner() view returns (address)",
  "function getLatestPrice(bytes32) view returns (uint256)",
  "function getPrice(bytes32) view returns (uint256)",
  "function prices(bytes32) view returns (uint256)",
  "function setPrice(bytes32, uint256) external",
  "function updatePrice(bytes32, uint256) external",
  "function setGoldPrice(uint256) external",
  "function goldPrice() view returns (uint256)",
  "function ethPrice() view returns (uint256)",
  "function getEthPrice() view returns (uint256)",
  "function c551b800() view returns (uint256)", // getEthPrice selector
  "function hasRole(bytes32, address) view returns (bool)",
  "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
  "function UPDATER_ROLE() view returns (bytes32)",
  "function grantRole(bytes32, address) external",
];

// Token IDs
const GOLD_ID = "0x3496e2e73c4d42b75d702e60d9e48102720b8691234415963a5a857b86425d07";

async function main() {
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const wallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
  const oracle = new ethers.Contract(ORACLE, ORACLE_ABI, wallet);
  
  console.log("=== Oracle Contract ===");
  console.log("Address:", ORACLE);
  console.log("Caller:", wallet.address);
  
  // Check owner
  try {
    const owner = await oracle.owner();
    console.log("Owner:", owner);
  } catch(e) { console.log("No owner()"); }

  // Check admin role
  try {
    const ADMIN_ROLE = await oracle.DEFAULT_ADMIN_ROLE();
    const hasAdmin = await oracle.hasRole(ADMIN_ROLE, wallet.address);
    console.log("Has ADMIN_ROLE:", hasAdmin);
  } catch(e) { console.log("No AccessControl"); }

  // Check updater role
  try {
    const UPDATER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("UPDATER_ROLE"));
    const hasUpdater = await oracle.hasRole(UPDATER_ROLE, wallet.address);
    console.log("Has UPDATER_ROLE:", hasUpdater);
    console.log("UPDATER_ROLE hash:", UPDATER_ROLE);
  } catch(e) { console.log("No UPDATER_ROLE check"); }

  // Check prices
  try {
    const goldPrice = await oracle.prices(GOLD_ID);
    console.log("Gold price (stored):", goldPrice.toString());
  } catch(e) { console.log("No prices() mapping"); }

  try {
    const ethPrice = await oracle.ethPrice();
    console.log("ETH price:", ethPrice.toString());
  } catch(e) { console.log("No ethPrice()"); }

  // Try to set price
  console.log("\n=== Trying to set prices ===");
  try {
    // Gold: ~$2950/oz = ~$95/gram -> 9500000000 (8 decimals)
    const goldPriceValue = ethers.parseUnits("95", 8);
    console.log("Setting gold price:", goldPriceValue.toString());
    
    const tx = await oracle.setPrice(GOLD_ID, goldPriceValue, { gasLimit: 100000 });
    console.log("TX:", tx.hash);
    await tx.wait();
    console.log("✅ Gold price set!");
  } catch(e) {
    console.log("setPrice error:", e.reason || e.message.slice(0, 80));
  }

  try {
    // ETH: ~$3500 -> 350000000000 (8 decimals)
    const ethPriceValue = ethers.parseUnits("3500", 8);
    const tx = await oracle.updatePrice(ethers.id("ETH"), ethPriceValue, { gasLimit: 100000 });
    console.log("ETH price TX:", tx.hash);
    await tx.wait();
    console.log("✅ ETH price set!");
  } catch(e) {
    console.log("updatePrice ETH error:", e.reason || e.message.slice(0, 80));
  }
}

main().catch(console.error);
