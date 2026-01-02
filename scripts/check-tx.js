const { ethers } = require("ethers");
const SEPOLIA_RPC = "https://sepolia.infura.io/v3/06f4a3d8bae44ffb889975d654d8a680";

async function main() {
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const txHash = "0x25432d70775c7c054a1bc9318961251b837e2b9753dce720b331eb02d7aea581";
  
  const receipt = await provider.getTransactionReceipt(txHash);
  if (receipt) {
    console.log("Status:", receipt.status === 1 ? "✅ Success" : "❌ Failed");
    console.log("Block:", receipt.blockNumber);
    console.log("Gas used:", receipt.gasUsed.toString());
  } else {
    console.log("TX still pending...");
    const tx = await provider.getTransaction(txHash);
    if (tx) {
      console.log("Nonce:", tx.nonce);
      console.log("Gas price:", ethers.formatUnits(tx.gasPrice || tx.maxFeePerGas, "gwei"), "gwei");
    }
  }
}
main().catch(console.error);
