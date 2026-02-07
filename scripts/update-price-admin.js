const { ethers } = require('ethers');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const p = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/06f4a3d8bae44ffb889975d654d8a680');
  
  const privateKey = process.env.PRIVATE_KEY;
  const wallet = new ethers.Wallet(privateKey, p);
  
  console.log('Admin Wallet:', wallet.address);
  console.log('Balance:', ethers.formatEther(await p.getBalance(wallet.address)), 'ETH');
  
  const abi = [
    'function askPerKgE6() view returns (uint256)',
    'function bidPerKgE6() view returns (uint256)',
    'function setAskPerKgE6(uint256) external',
    'function setBidPerKgE6(uint256) external'
  ];
  
  const c = new ethers.Contract('0x28e0938457c5bf02Fe35208b7b1098af7Ec20d91', abi, wallet);
  
  const newAskE6 = 136740000000n; // $136.74/gram
  const newBidE6 = 135000000000n; // $135.00/gram
  
  console.log('\nCurrent Ask: $' + (Number(await c.askPerKgE6()) / 1e6 / 1000).toFixed(2) + '/g');
  console.log('Current Bid: $' + (Number(await c.bidPerKgE6()) / 1e6 / 1000).toFixed(2) + '/g');
  
  console.log('\nUpdating prices...');
  
  const tx1 = await c.setAskPerKgE6(newAskE6);
  console.log('Ask TX:', tx1.hash);
  await tx1.wait();
  
  const tx2 = await c.setBidPerKgE6(newBidE6);
  console.log('Bid TX:', tx2.hash);
  await tx2.wait();
  
  console.log('\n✅ Updated!');
  console.log('New Ask: $' + (Number(await c.askPerKgE6()) / 1e6 / 1000).toFixed(2) + '/g');
  console.log('New Bid: $' + (Number(await c.bidPerKgE6()) / 1e6 / 1000).toFixed(2) + '/g');
}

main().catch(console.error);
