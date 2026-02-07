const { ethers } = require('ethers');

async function checkBalance() {
  const WRONG_WALLET = '0xbE8993001F475AF12eFC4185d96859D0b191ABa9';
  
  // Multiple Base RPC options
  const providers = [
    'https://mainnet.base.org',
    'https://base.llamarpc.com',
    'https://base-mainnet.public.blastapi.io'
  ];
  
  for (const rpc of providers) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      const balance = await provider.getBalance(WRONG_WALLET);
      console.log(`${rpc}:`);
      console.log('Balance:', ethers.formatEther(balance), 'ETH');
      console.log('');
    } catch (e) {
      console.log(`${rpc}: Error - ${e.message}`);
    }
  }
}

checkBalance().catch(console.error);
