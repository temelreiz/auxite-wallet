const { ethers } = require('ethers');

async function checkTxReceipt() {
  const TX_HASH = '0x39e196ec32f43777e3a469a4e635025ae93dac5b993446a0506b394633ab156f';
  const WRONG_WALLET = '0xbE8993001F475AF12eFC4185d96859D0b191ABa9';
  
  const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
  
  // Get transaction receipt
  const receipt = await provider.getTransactionReceipt(TX_HASH);
  
  if (receipt) {
    console.log('Transaction Receipt:');
    console.log('Status:', receipt.status === 1 ? 'SUCCESS' : 'FAILED');
    console.log('Block:', receipt.blockNumber);
    console.log('Gas used:', receipt.gasUsed.toString());
  } else {
    console.log('Receipt not found (transaction might be pending)');
  }
  
  // Get current block
  const currentBlock = await provider.getBlockNumber();
  console.log('\nCurrent block:', currentBlock);
  
  // Get balance history
  const balance = await provider.getBalance(WRONG_WALLET);
  console.log('\nCurrent balance:', ethers.formatEther(balance), 'ETH');
  
  // Check if there are any outgoing transactions from wrong wallet
  console.log('\nChecking for outgoing transactions...');
  const nonce = await provider.getTransactionCount(WRONG_WALLET);
  console.log('Transaction count (nonce):', nonce);
}

checkTxReceipt().catch(console.error);
