const { ethers } = require("ethers");

const SEPOLIA_RPC = "https://sepolia.infura.io/v3/06f4a3d8bae44ffb889975d654d8a680";
const OWNER_PRIVATE_KEY = "0xce3400bebcef2d7603216e8340b7ee29bcb493edb8f7b30d088c3edec63bc401";
const AUXG = "0xE044a46907a99245F06d294352A80C6165B7Ab6e";
const HOT_WALLET = "0xbE8993001F475AF12eFC4185d96859D0b191ABa9";

const ABI = [
  "function mint(uint256 amount) external payable",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function getPrice() view returns (uint256, uint256)",
];

async function main() {
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const wallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
  const contract = new ethers.Contract(AUXG, ABI, wallet);
  
  // Get current nonce (including pending)
  const nonce = await provider.getTransactionCount(wallet.address, "pending");
  console.log("Current nonce:", nonce);
  
  const [buyPrice] = await contract.getPrice();
  const grams = 10;
  const amount = ethers.parseUnits(grams.toString(), 3);
  const ethNeeded = buyPrice * BigInt(grams);
  
  console.log("Minting", grams, "AUXG with higher gas...");
  console.log("ETH needed:", ethers.formatEther(ethNeeded));
  
  const tx = await contract["mint(uint256)"](amount, { 
    value: ethNeeded,
    gasLimit: 500000,
    maxFeePerGas: ethers.parseUnits("20", "gwei"),
    maxPriorityFeePerGas: ethers.parseUnits("5", "gwei"),
    nonce: nonce,
  });
  
  console.log("TX:", tx.hash);
  console.log("Waiting for confirmation...");
  
  const receipt = await tx.wait();
  console.log("✅ Confirmed! Block:", receipt.blockNumber);
  console.log("Status:", receipt.status === 1 ? "Success" : "Failed");
  
  if (receipt.status === 1) {
    const balance = await contract.balanceOf(wallet.address);
    console.log("Balance:", ethers.formatUnits(balance, 3), "AUXG");
    
    if (balance > 0) {
      console.log("\nTransferring to hot wallet...");
      const tx2 = await contract.transfer(HOT_WALLET, balance, { 
        gasLimit: 100000,
        maxFeePerGas: ethers.parseUnits("20", "gwei"),
        maxPriorityFeePerGas: ethers.parseUnits("5", "gwei"),
      });
      await tx2.wait();
      console.log("✅ Transferred!");
      
      const hotBalance = await contract.balanceOf(HOT_WALLET);
      console.log("Hot wallet AUXG:", ethers.formatUnits(hotBalance, 3));
    }
  }
}

main().catch(console.error);
