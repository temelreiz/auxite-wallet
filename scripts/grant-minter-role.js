const { ethers } = require("ethers");

const SEPOLIA_RPC = "https://sepolia.infura.io/v3/06f4a3d8bae44ffb889975d654d8a680";
const OWNER_PRIVATE_KEY = "0xce3400bebcef2d7603216e8340b7ee29bcb493edb8f7b30d088c3edec63bc401";

const TOKENS = {
  AUXG: "0xE044a46907a99245F06d294352A80C6165B7Ab6e",
  AUXS: "0xc7dd69aD99f09a090a2AEF09F80f70DDDB588FAD",
  AUXPT: "0x09bDA6990CAFfB3b9Df403E829FC1aed957cB880",
  AUXPD: "0x6a594A3cDc1Df2c72bF83Ba47768a5d4780bFD6A",
};

// Common MINTER_ROLE hash (keccak256("MINTER_ROLE"))
const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
console.log("MINTER_ROLE hash:", MINTER_ROLE);

const ABI = [
  "function grantRole(bytes32 role, address account) external",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function getRoleAdmin(bytes32 role) view returns (bytes32)",
];

async function main() {
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const wallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
  
  console.log("\nOwner/Caller:", wallet.address);
  console.log("MINTER_ROLE:", MINTER_ROLE);
  
  for (const [symbol, address] of Object.entries(TOKENS)) {
    console.log(`\n━━━ ${symbol} ━━━`);
    const contract = new ethers.Contract(address, ABI, wallet);
    
    try {
      // Check if already has role
      const hasRole = await contract.hasRole(MINTER_ROLE, wallet.address);
      console.log("Has MINTER_ROLE:", hasRole);
      
      if (!hasRole) {
        console.log("Granting MINTER_ROLE...");
        const tx = await contract.grantRole(MINTER_ROLE, wallet.address, { gasLimit: 100000 });
        console.log("TX:", tx.hash);
        await tx.wait();
        console.log("✅ Role granted!");
      }
    } catch (e) {
      console.log("❌ Error:", e.message.slice(0, 100));
    }
  }
}

main().catch(console.error);
