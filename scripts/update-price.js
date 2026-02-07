const { ethers } = require('ethers');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const p = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/06f4a3d8bae44ffb889975d654d8a680');
  const privateKey = process.env.HOT_WALLET_ETH_PRIVATE_KEY;
  const wallet = new ethers.Wallet(privateKey, p);
  
  console.log('Wallet:', wallet.address);
  console.log('Balance:', ethers.formatEther(await p.getBalance(wallet.address)), 'ETH');
  
  const abi = [
    'function askPerKgE6() view returns (uint256)',
    'function bidPerKgE6() view returns (uint256)',
    'function setAskPerKgE6(uint256) external',
    'function setBidPerKgE6(uint256) external'
  ];
  
  const c = new ethers.Contract('0x28e0938457c5bf02Fe35208b7b1098af7Ec20d91', abi, wallet);
  
  // Güncel fiyat: ~$136.74/gram = $136,740/kg
  // E6 format: 136740 * 1_000_000 = 136740000000
  const newAskE6 = 136740000000n; // $136.74/gram (satış fiyatı - kullanıcı alırken)
  const newBidE6 = 135000000000n; // $135.00/gram (alış fiyatı - kullanıcı satarken)
  
  console.log('\nCurrent Ask:', (await c.askPerKgE6()).toString(), '($' + (Number(await c.askPerKgE6()) / 1e6 / 1000).toFixed(2) + '/g)');
  console.log('Current Bid:', (await c.bidPerKgE6()).toString(), '($' + (Number(await c.bidPerKgE6()) / 1e6 / 1000).toFixed(2) + '/g)');
  
  console.log('\nUpdating to:');
  console.log('New Ask:', newAskE6.toString(), '($' + (Number(newAskE6) / 1e6 / 1000).toFixed(2) + '/g)');
  console.log('New Bid:', newBidE6.toString(), '($' + (Number(newBidE6) / 1e6 / 1000).toFixed(2) + '/g)');
  
  try {
    console.log('\nSending setAskPerKgE6...');
    const tx1 = await c.setAskPerKgE6(newAskE6);
    console.log('TX:', tx1.hash);
    await tx1.wait();
    console.log('Ask updated!');
    
    console.log('\nSending setBidPerKgE6...');
    const tx2 = await c.setBidPerKgE6(newBidE6);
    console.log('TX:', tx2.hash);
    await tx2.wait();
    console.log('Bid updated!');
    
    console.log('\nNew prices:');
    console.log('Ask:', (await c.askPerKgE6()).toString());
    console.log('Bid:', (await c.bidPerKgE6()).toString());
  } catch(e) {
    console.log('Error:', e.message);
  }
}

main().catch(console.error);
