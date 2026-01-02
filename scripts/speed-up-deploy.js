const { ethers } = require("ethers");
const solc = require("solc");
const fs = require("fs");

const SEPOLIA_RPC = "https://sepolia.infura.io/v3/06f4a3d8bae44ffb889975d654d8a680";
const OWNER_PRIVATE_KEY = "0xce3400bebcef2d7603216e8340b7ee29bcb493edb8f7b30d088c3edec63bc401";

async function main() {
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const wallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
  
  // Get pending nonce
  const pendingNonce = await provider.getTransactionCount(wallet.address, "pending");
  const latestNonce = await provider.getTransactionCount(wallet.address, "latest");
  
  console.log("Latest nonce:", latestNonce);
  console.log("Pending nonce:", pendingNonce);
  
  // Compile
  const source = fs.readFileSync("contracts/SimpleOracle.sol", "utf8");
  const input = {
    language: "Solidity",
    sources: { "SimpleOracle.sol": { content: source } },
    settings: { outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } } },
  };
  
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const contract = output.contracts["SimpleOracle.sol"]["SimpleOracle"];
  const bytecode = contract.evm.bytecode.object;
  
  // Deploy with higher gas and same nonce to replace pending tx
  console.log("\nRedeploying with higher gas...");
  
  const tx = await wallet.sendTransaction({
    data: "0x" + bytecode,
    gasLimit: 500000,
    maxFeePerGas: ethers.parseUnits("50", "gwei"),
    maxPriorityFeePerGas: ethers.parseUnits("20", "gwei"),
    nonce: latestNonce,
  });
  
  console.log("New TX:", tx.hash);
  console.log("Waiting...");
  
  const receipt = await tx.wait();
  console.log("\n✅ Deployed!");
  console.log("Contract:", receipt.contractAddress);
  console.log("Block:", receipt.blockNumber);
  
  fs.writeFileSync("NEW_ORACLE_ADDRESS.txt", receipt.contractAddress);
}

main().catch(console.error);
