const { ethers } = require('ethers');

async function checkTx() {
  const TX_HASH = '0x39e196ec32f43777e3a469a4e635025ae93dac5b993446a0506b394633ab156f';
  
  // Try Base first
  const baseProvider = new ethers.JsonRpcProvider('https://mainnet.base.org');
  const ethProvider = new ethers.JsonRpcProvider('https://eth.llamarpc.com');
  
  console.log('Checking Base...');
  try {
    const baseTx = await baseProvider.getTransaction(TX_HASH);
    if (baseTx) {
      console.log('Found on Base!');
      console.log('From:', baseTx.from);
      console.log('To:', baseTx.to);
      console.log('Value:', ethers.formatEther(baseTx.value), 'ETH');
      return;
    }
  } catch (e) {
    console.log('Not on Base');
  }
  
  console.log('\nChecking Ethereum Mainnet...');
  try {
    const ethTx = await ethProvider.getTransaction(TX_HASH);
    if (ethTx) {
      console.log('Found on Ethereum!');
      console.log('From:', ethTx.from);
      console.log('To:', ethTx.to);
      console.log('Value:', ethers.formatEther(ethTx.value), 'ETH');
      return;
    }
  } catch (e) {
    console.log('Not on Ethereum');
  }
  
  console.log('\nTransaction not found on either network');
}

checkTx().catch(console.error);
