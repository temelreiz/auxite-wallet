const { ethers } = require('ethers');

async function checkMainnet() {
  const WRONG_WALLET = '0xbE8993001F475AF12eFC4185d96859D0b191ABa9';
  const CORRECT_HOT_WALLET = '0xaE4d3eb67558423f74E8D80F56fbdfc1F91F3213';
  
  // Ethereum mainnet
  const provider = new ethers.JsonRpcProvider('https://eth.llamarpc.com');
  
  const wrongBalance = await provider.getBalance(WRONG_WALLET);
  const correctBalance = await provider.getBalance(CORRECT_HOT_WALLET);
  
  console.log('=== Ethereum Mainnet ===');
  console.log('Wrong wallet balance:', ethers.formatEther(wrongBalance), 'ETH');
  console.log('Correct hot wallet balance:', ethers.formatEther(correctBalance), 'ETH');
}

checkMainnet().catch(console.error);
