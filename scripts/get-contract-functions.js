const { ethers } = require("ethers");

const SEPOLIA_RPC = "https://sepolia.infura.io/v3/06f4a3d8bae44ffb889975d654d8a680";
const AUXG_ADDRESS = "0xE044a46907a99245F06d294352A80C6165B7Ab6e";

// Try all possible mint-related function signatures
const POSSIBLE_ABI = [
  "function mint(address,uint256)",
  "function mint(uint256)",
  "function adminMint(address,uint256)",
  "function ownerMint(address,uint256)", 
  "function mintTo(address,uint256)",
  "function safeMint(address,uint256)",
  "function issue(address,uint256)",
  "function grantRole(bytes32,address)",
  "function MINTER_ROLE() view returns (bytes32)",
  "function getRoleMember(bytes32,uint256) view returns (address)",
  "function getRoleMemberCount(bytes32) view returns (uint256)",
  "function supportsInterface(bytes4) view returns (bool)",
];

async function main() {
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  
  // Get contract bytecode to check functions
  const code = await provider.getCode(AUXG_ADDRESS);
  console.log("Contract code length:", code.length);
  
  // Common function selectors
  const selectors = {
    "mint(address,uint256)": "0x40c10f19",
    "mint(uint256)": "0xa0712d68",
    "adminMint(address,uint256)": "0x",
    "grantRole(bytes32,address)": "0x2f2ff15d",
    "MINTER_ROLE()": "0xd5391393",
    "transfer(address,uint256)": "0xa9059cbb",
    "balanceOf(address)": "0x70a08231",
  };

  console.log("\nChecking function selectors in bytecode:");
  for (const [fn, selector] of Object.entries(selectors)) {
    if (selector && code.includes(selector.slice(2))) {
      console.log(`✅ ${fn} - ${selector}`);
    } else if (selector) {
      console.log(`❌ ${fn}`);
    }
  }

  // Check Etherscan for ABI
  console.log("\n📋 Check contract on Etherscan:");
  console.log(`https://sepolia.etherscan.io/address/${AUXG_ADDRESS}#code`);
  console.log(`\nFailed TX: https://sepolia.etherscan.io/tx/0xcf1ea7af1229c3e81366d2e361928fdc681286de7de154dcf8a484628ff008fe`);
}

main().catch(console.error);
