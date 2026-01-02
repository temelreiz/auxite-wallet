const { ethers } = require("ethers");
const solc = require("solc");
const fs = require("fs");

const SEPOLIA_RPC = "https://sepolia.infura.io/v3/06f4a3d8bae44ffb889975d654d8a680";
const OWNER_PRIVATE_KEY = "0xce3400bebcef2d7603216e8340b7ee29bcb493edb8f7b30d088c3edec63bc401";

async function main() {
  // Read source
  const source = fs.readFileSync("contracts/SimpleOracle.sol", "utf8");
  
  // Compile
  const input = {
    language: "Solidity",
    sources: { "SimpleOracle.sol": { content: source } },
    settings: { outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } } },
  };
  
  console.log("Compiling SimpleOracle...");
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  
  if (output.errors) {
    output.errors.forEach(e => console.log(e.formattedMessage));
  }
  
  const contract = output.contracts["SimpleOracle.sol"]["SimpleOracle"];
  const abi = contract.abi;
  const bytecode = contract.evm.bytecode.object;
  
  console.log("Bytecode length:", bytecode.length);
  
  // Deploy
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const wallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
  
  console.log("\nDeploying from:", wallet.address);
  console.log("ETH Balance:", ethers.formatEther(await provider.getBalance(wallet.address)));
  
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const oracle = await factory.deploy({
    gasLimit: 500000,
    maxFeePerGas: ethers.parseUnits("25", "gwei"),
    maxPriorityFeePerGas: ethers.parseUnits("5", "gwei"),
  });
  
  console.log("TX:", oracle.deploymentTransaction()?.hash);
  await oracle.waitForDeployment();
  
  const address = await oracle.getAddress();
  console.log("\n✅ SimpleOracle deployed at:", address);
  
  // Verify
  const goldPrice = await oracle.getLatestPrice("0x3496e2e73c4d42b75d702e60d9e48102720b8691234415963a5a857b86425d07");
  const ethPrice = await oracle.getEthPrice();
  console.log("Gold price:", goldPrice.toString());
  console.log("ETH price:", ethPrice.toString());
  
  // Save address
  fs.writeFileSync("NEW_ORACLE_ADDRESS.txt", address);
  console.log("\nSaved to NEW_ORACLE_ADDRESS.txt");
}

main().catch(console.error);
