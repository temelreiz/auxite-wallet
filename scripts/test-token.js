const { ethers } = require('ethers');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const p = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/06f4a3d8bae44ffb889975d654d8a680');
  const privateKey = process.env.HOT_WALLET_ETH_PRIVATE_KEY;
  const wallet = new ethers.Wallet(privateKey, p);
  
  // Token kontrat - tüm admin fonksiyonları
  const abi = [
    'function askPerKgE6() view returns (uint256)',
    'function bidPerKgE6() view returns (uint256)',
    'function setAskPerKgE6(uint256) external',
    'function setBidPerKgE6(uint256) external',
    'function admin() view returns (address)',
    'function owner() view returns (address)'
  ];
  
  const c = new ethers.Contract('0x28e0938457c5bf02Fe35208b7b1098af7Ec20d91', abi, wallet);
  
  console.log('Current Ask:', (await c.askPerKgE6()).toString());
  console.log('Current Bid:', (await c.bidPerKgE6()).toString());
  
  // Try to get admin/owner
  try {
    console.log('Admin:', await c.admin());
  } catch(e) {
    console.log('No admin() function');
  }
}

main().catch(console.error);
