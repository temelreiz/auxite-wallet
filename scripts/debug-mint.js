const { ethers } = require("ethers");

const SEPOLIA_RPC = "https://sepolia.infura.io/v3/06f4a3d8bae44ffb889975d654d8a680";
const OWNER_PRIVATE_KEY = "0xce3400bebcef2d7603216e8340b7ee29bcb493edb8f7b30d088c3edec63bc401";
const AUXG = "0xE044a46907a99245F06d294352A80C6165B7Ab6e";
const HOT_WALLET = "0xbE8993001F475AF12eFC4185d96859D0b191ABa9";

const ABI = [
  "function mint(address,uint256) external",
  "function oracle() view returns (address)",
  "function checkSupplyEnabled() view returns (bool)",
  "function maxSupply() view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function pauseTimeRemaining() view returns (uint256)",
];

async function main() {
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const wallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
  const contract = new ethers.Contract(AUXG, ABI, wallet);
  
  console.log("Debug info for AUXG...\n");
  
  try {
    const oracle = await contract.oracle();
    console.log("Oracle address:", oracle);
  } catch(e) { console.log("No oracle() function"); }

  try {
    const checkSupply = await contract.checkSupplyEnabled();
    console.log("Supply check enabled:", checkSupply);
  } catch(e) { console.log("No checkSupplyEnabled()"); }

  try {
    const total = await contract.totalSupply();
    console.log("Total supply:", ethers.formatUnits(total, 3));
  } catch(e) { console.log("No totalSupply()"); }

  try {
    const pauseTime = await contract.pauseTimeRemaining();
    console.log("Pause time remaining:", pauseTime.toString());
  } catch(e) { console.log("No pauseTimeRemaining()"); }

  // Try static call to get revert reason
  console.log("\nTrying static call to get revert reason...");
  try {
    const amount = ethers.parseUnits("1000", 3);
    await contract["mint(address,uint256)"].staticCall(HOT_WALLET, amount);
    console.log("Static call succeeded - mint should work!");
  } catch(e) {
    console.log("Revert reason:", e.reason || e.message);
    if (e.data) console.log("Error data:", e.data);
  }
}

main().catch(console.error);
