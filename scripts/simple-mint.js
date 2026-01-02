const { ethers } = require("ethers");

const SEPOLIA_RPC = "https://sepolia.infura.io/v3/06f4a3d8bae44ffb889975d654d8a680";
const OWNER_PRIVATE_KEY = "0xce3400bebcef2d7603216e8340b7ee29bcb493edb8f7b30d088c3edec63bc401";
const AUXG = "0xE044a46907a99245F06d294352A80C6165B7Ab6e";
const AUXS = "0xc7dd69aD99f09a090a2AEF09F80f70DDDB588FAD";
const AUXPT = "0x09bDA6990CAFfB3b9Df403E829FC1aed957cB880";
const AUXPD = "0x6a594A3cDc1Df2c72bF83Ba47768a5d4780bFD6A";
const HOT_WALLET = "0xbE8993001F475AF12eFC4185d96859D0b191ABa9";

const ABI = [
  "function mint(uint256 amount) external payable",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function getPrice() view returns (uint256, uint256)",
  "function decimals() view returns (uint8)",
];

async function mintAndTransfer(wallet, tokenAddress, symbol, grams) {
  const contract = new ethers.Contract(tokenAddress, ABI, wallet);
  
  console.log(`\n=== ${symbol} ===`);
  
  const decimals = await contract.decimals();
  const [buyPrice] = await contract.getPrice();
  console.log("Buy price:", ethers.formatEther(buyPrice), "ETH/gram");
  
  const amount = ethers.parseUnits(grams.toString(), decimals);
  const ethNeeded = buyPrice * BigInt(grams);
  console.log(`Minting ${grams} grams, ETH needed: ${ethers.formatEther(ethNeeded)}`);
  
  const tx = await contract["mint(uint256)"](amount, { 
    value: ethNeeded,
    gasLimit: 500000,
  });
  console.log("TX:", tx.hash);
  await tx.wait();
  console.log("✅ Minted!");
  
  const balance = await contract.balanceOf(wallet.address);
  console.log("Balance:", ethers.formatUnits(balance, decimals));
  
  // Transfer to hot wallet
  console.log("Transferring to hot wallet...");
  const tx2 = await contract.transfer(HOT_WALLET, balance, { gasLimit: 100000 });
  await tx2.wait();
  console.log("✅ Transferred to hot wallet!");
  
  const hotBalance = await contract.balanceOf(HOT_WALLET);
  console.log("Hot wallet balance:", ethers.formatUnits(hotBalance, decimals));
}

async function main() {
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const wallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
  
  const ethBalance = await provider.getBalance(wallet.address);
  console.log("Wallet ETH:", ethers.formatEther(ethBalance));
  
  try {
    // Mint smaller amounts - 10g gold (~0.21 ETH), 100g silver, 5g platinum, 5g palladium
    await mintAndTransfer(wallet, AUXG, "AUXG", 10);
    await mintAndTransfer(wallet, AUXS, "AUXS", 100);
    await mintAndTransfer(wallet, AUXPT, "AUXPT", 5);
    await mintAndTransfer(wallet, AUXPD, "AUXPD", 5);
    
    console.log("\n✅ All tokens minted and transferred to hot wallet!");
  } catch(e) {
    console.log("Error:", e.shortMessage || e.message);
  }
}

main().catch(console.error);
