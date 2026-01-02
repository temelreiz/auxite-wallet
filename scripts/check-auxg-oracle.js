const { ethers } = require("ethers");

const SEPOLIA_RPC = "https://sepolia.infura.io/v3/06f4a3d8bae44ffb889975d654d8a680";
const OWNER_PRIVATE_KEY = "0xce3400bebcef2d7603216e8340b7ee29bcb493edb8f7b30d088c3edec63bc401";
const AUXG = "0xE044a46907a99245F06d294352A80C6165B7Ab6e";

async function main() {
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const wallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
  
  const code = await provider.getCode(AUXG);
  
  // Check for oracle-related functions
  const selectors = {
    "7dc0d1d0": "oracle()",
    "7adbf973": "setOracle(address)",
    "d0209f96": "setOracle(address)", // alternative
    "8cba8aae": "updateOracle(address)",
    "a22cb465": "setApprovalForAll",
    "6eb32130": "checkSupplyEnabled()",
    "ee50ee1b": "setCheckSupplyEnabled(bool)",
  };
  
  console.log("=== AUXG Contract Functions ===\n");
  for (const [sel, name] of Object.entries(selectors)) {
    const found = code.toLowerCase().includes(sel);
    console.log(found ? "✅" : "❌", name, `(0x${sel})`);
  }

  // Try to read current oracle
  const ABI = [
    "function oracle() view returns (address)",
    "function setOracle(address) external",
    "function checkSupplyEnabled() view returns (bool)",
    "function setCheckSupplyEnabled(bool) external",
  ];
  
  const contract = new ethers.Contract(AUXG, ABI, wallet);
  
  console.log("\n=== Current Values ===");
  try {
    const oracle = await contract.oracle();
    console.log("Oracle:", oracle);
  } catch(e) {
    console.log("oracle() failed");
  }

  try {
    const checkSupply = await contract.checkSupplyEnabled();
    console.log("Check Supply Enabled:", checkSupply);
  } catch(e) {
    console.log("checkSupplyEnabled() failed");
  }

  // Try to disable supply check (might help mint work)
  console.log("\n=== Trying to disable supply check ===");
  try {
    const tx = await contract.setCheckSupplyEnabled(false, { gasLimit: 100000 });
    console.log("TX:", tx.hash);
    await tx.wait();
    console.log("✅ Supply check disabled!");
  } catch(e) {
    console.log("setCheckSupplyEnabled failed:", e.reason || e.message.slice(0, 60));
  }
}

main().catch(console.error);
