const { ethers } = require("ethers");

const SEPOLIA_RPC = "https://sepolia.infura.io/v3/06f4a3d8bae44ffb889975d654d8a680";
const OWNER_PRIVATE_KEY = "0xce3400bebcef2d7603216e8340b7ee29bcb493edb8f7b30d088c3edec63bc401";
const HOT_WALLET = "0xbE8993001F475AF12eFC4185d96859D0b191ABa9";

const TOKENS = {
  AUXG: { address: "0xE044a46907a99245F06d294352A80C6165B7Ab6e", amount: "1000", decimals: 3 },
  AUXS: { address: "0xc7dd69aD99f09a090a2AEF09F80f70DDDB588FAD", amount: "10000", decimals: 3 },
  AUXPT: { address: "0x09bDA6990CAFfB3b9Df403E829FC1aed957cB880", amount: "100", decimals: 3 },
  AUXPD: { address: "0x6a594A3cDc1Df2c72bF83Ba47768a5d4780bFD6A", amount: "100", decimals: 3 },
};

const MINT_ABI = [
  "function mint(address to, uint256 amount) external",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
];

async function main() {
  console.log("🚀 Mint Script Starting...\n");
  
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const wallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
  
  // Check ETH balance for gas
  const ethBalance = await provider.getBalance(wallet.address);
  console.log("Owner ETH Balance:", ethers.formatEther(ethBalance), "ETH\n");

  if (ethBalance < ethers.parseEther("0.01")) {
    console.log("⚠️  Low ETH balance! Need Sepolia ETH for gas.");
    console.log("Get from: https://sepoliafaucet.com/");
    return;
  }

  for (const [symbol, config] of Object.entries(TOKENS)) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📀 ${symbol}`);
    
    try {
      const contract = new ethers.Contract(config.address, MINT_ABI, wallet);
      
      const decimals = Number(await contract.decimals());
      const balanceBefore = await contract.balanceOf(HOT_WALLET);
      console.log(`Current Balance: ${ethers.formatUnits(balanceBefore, decimals)} ${symbol}`);

      const amountWithDecimals = ethers.parseUnits(config.amount, decimals);
      console.log(`Minting: ${config.amount} ${symbol} (${amountWithDecimals.toString()} units)`);

      // Call with manual gas limit
      const tx = await contract["mint(address,uint256)"](HOT_WALLET, amountWithDecimals, {
        gasLimit: 200000,
      });
      console.log(`TX Hash: ${tx.hash}`);
      console.log(`Waiting for confirmation...`);
      
      const receipt = await tx.wait();
      console.log(`✅ Confirmed in block ${receipt.blockNumber}`);

      const balanceAfter = await contract.balanceOf(HOT_WALLET);
      console.log(`New Balance: ${ethers.formatUnits(balanceAfter, decimals)} ${symbol}`);

    } catch (error) {
      console.log(`❌ Error: ${error.shortMessage || error.message}`);
      if (error.data) console.log(`Error data: ${error.data}`);
    }
  }

  console.log("\n✅ Done!");
}

main().catch(console.error);
