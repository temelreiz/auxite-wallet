const { ethers } = require("ethers");

const SEPOLIA_RPC = "https://sepolia.infura.io/v3/06f4a3d8bae44ffb889975d654d8a680";
const PRIVATE_KEY = "0xce3400bebcef2d7603216e8340b7ee29bcb493edb8f7b30d088c3edec63bc401";
const AUXG = "0xD14D32B1e03B3027D1f8381EeeC567e147De9CCe";

const TOKEN_ABI = [
  'function buy(uint256 grams, string calldata custodian) external payable returns (uint256)',
  'function calculateBuyCost(uint256 grams) view returns (uint256)',
  'function getPrice() view returns (uint256 askWeiPerGram, uint256 bidWeiPerGram)',
];

async function main() {
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = new ethers.Contract(AUXG, TOKEN_ABI, wallet);
  
  const grams = 1;
  const gramsInt = BigInt(Math.ceil(grams));
  
  console.log("Testing buy for", gramsInt, "grams");
  
  // Get cost
  const costWei = await contract.calculateBuyCost(gramsInt);
  console.log("Cost:", ethers.formatEther(costWei), "ETH");
  
  // Add slippage
  const slippagePercent = 5;
  const maxCostWei = costWei + (costWei * BigInt(Math.floor(slippagePercent * 100))) / 10000n;
  console.log("Max cost with slippage:", ethers.formatEther(maxCostWei), "ETH");
  
  // Estimate gas
  try {
    const gasEstimate = await contract.buy.estimateGas(gramsInt, "Zurich", { value: maxCostWei });
    console.log("Gas estimate:", gasEstimate.toString());
    
    // Execute
    const feeData = await provider.getFeeData();
    const tx = await contract.buy(gramsInt, "Zurich", {
      value: maxCostWei,
      gasLimit: BigInt(gasEstimate) + 50000n,
    });
    
    console.log("TX:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Success! Block:", receipt.blockNumber);
  } catch (e) {
    console.error("Error:", e.message);
  }
}

main();
