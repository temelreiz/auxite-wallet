const { ethers } = require("ethers");

const SEPOLIA_RPC = "https://sepolia.infura.io/v3/06f4a3d8bae44ffb889975d654d8a680";
const OWNER_PRIVATE_KEY = "0xce3400bebcef2d7603216e8340b7ee29bcb493edb8f7b30d088c3edec63bc401";
const AUXG = "0xE044a46907a99245F06d294352A80C6165B7Ab6e";
const HOT_WALLET = "0xbE8993001F475AF12eFC4185d96859D0b191ABa9";

const ABI = [
  "function paused() view returns (bool)",
  "function pauseTimeRemaining() view returns (uint256)",
  "function unpause() external",
  "function mint(address,uint256) external",
  "function hasRole(bytes32,address) view returns (bool)",
  "function PAUSER_ROLE() view returns (bytes32)",
];

const MINTER_ROLE = "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6";
const PAUSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PAUSER_ROLE"));

async function main() {
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const wallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
  const contract = new ethers.Contract(AUXG, ABI, wallet);
  
  console.log("Checking AUXG contract...\n");
  
  try {
    const isPaused = await contract.paused();
    console.log("Contract paused:", isPaused);
  } catch(e) {
    console.log("paused() error:", e.message.slice(0,50));
  }

  try {
    const hasMinter = await contract.hasRole(MINTER_ROLE, wallet.address);
    console.log("Has MINTER_ROLE:", hasMinter);
  } catch(e) {
    console.log("hasRole error:", e.message.slice(0,50));
  }

  try {
    const hasPauser = await contract.hasRole(PAUSER_ROLE, wallet.address);
    console.log("Has PAUSER_ROLE:", hasPauser);
  } catch(e) {
    console.log("PAUSER_ROLE check error");
  }

  // Try to unpause if paused
  try {
    const isPaused = await contract.paused();
    if (isPaused) {
      console.log("\nTrying to unpause...");
      const tx = await contract.unpause({ gasLimit: 100000 });
      console.log("TX:", tx.hash);
      await tx.wait();
      console.log("✅ Unpaused!");
    }
  } catch(e) {
    console.log("Unpause error:", e.message.slice(0,80));
  }
}

main().catch(console.error);
