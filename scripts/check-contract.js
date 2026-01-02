const { ethers } = require("ethers");

const SEPOLIA_RPC = "https://sepolia.infura.io/v3/06f4a3d8bae44ffb889975d654d8a680";
const AUXG_ADDRESS = "0xE044a46907a99245F06d294352A80C6165B7Ab6e";
const CALLER = "0xD24B2bca1E0b58a2EAE5b1184871219f9a8EE944";

const ABI = [
  "function owner() view returns (address)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function MINTER_ROLE() view returns (bytes32)",
  "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
  "function getRoleAdmin(bytes32 role) view returns (bytes32)",
  "function grantRole(bytes32 role, address account) external",
  "function totalSupply() view returns (uint256)",
  "function name() view returns (string)",
];

async function main() {
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const contract = new ethers.Contract(AUXG_ADDRESS, ABI, provider);

  console.log("📋 Contract Info for AUXG\n");
  
  try {
    const name = await contract.name();
    console.log("Name:", name);
  } catch(e) { console.log("Name: N/A"); }

  try {
    const supply = await contract.totalSupply();
    console.log("Total Supply:", ethers.formatUnits(supply, 3));
  } catch(e) { console.log("Total Supply: N/A"); }

  try {
    const owner = await contract.owner();
    console.log("Owner:", owner);
    console.log("Caller is owner:", owner.toLowerCase() === CALLER.toLowerCase());
  } catch(e) { 
    console.log("Owner: N/A (no owner function)"); 
  }

  try {
    const MINTER_ROLE = await contract.MINTER_ROLE();
    console.log("\nMINTER_ROLE:", MINTER_ROLE);
    
    const hasMinterRole = await contract.hasRole(MINTER_ROLE, CALLER);
    console.log("Caller has MINTER_ROLE:", hasMinterRole);
  } catch(e) { 
    console.log("\nNo AccessControl (MINTER_ROLE):", e.message.slice(0, 50)); 
  }

  try {
    const ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();
    console.log("\nDEFAULT_ADMIN_ROLE:", ADMIN_ROLE);
    
    const hasAdminRole = await contract.hasRole(ADMIN_ROLE, CALLER);
    console.log("Caller has ADMIN_ROLE:", hasAdminRole);
  } catch(e) { 
    console.log("\nNo DEFAULT_ADMIN_ROLE"); 
  }
}

main().catch(console.error);
