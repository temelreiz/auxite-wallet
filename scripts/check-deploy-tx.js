const { ethers } = require("ethers");
const SEPOLIA_RPC = "https://sepolia.infura.io/v3/06f4a3d8bae44ffb889975d654d8a680";

async function main() {
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const txHash = "0xff4f50211135ad7c89ac8045905f65d3eeba76a531fdf15fccc83b4be0b9941a";
  
  const receipt = await provider.getTransactionReceipt(txHash);
  if (receipt) {
    console.log("Status:", receipt.status === 1 ? "✅ Success" : "❌ Failed");
    console.log("Contract Address:", receipt.contractAddress);
    console.log("Block:", receipt.blockNumber);
    console.log("Gas used:", receipt.gasUsed.toString());
  } else {
    console.log("TX still pending...");
  }
}
main().catch(console.error);
