const { ethers } = require('ethers');

async function checkOutgoing() {
  const WRONG_WALLET = '0xbE8993001F475AF12eFC4185d96859D0b191ABa9';
  
  const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
  
  // Get incoming tx block
  const incomingTx = await provider.getTransaction('0x39e196ec32f43777e3a469a4e635025ae93dac5b993446a0506b394633ab156f');
  console.log('Incoming TX block:', incomingTx.blockNumber);
  
  // Scan blocks after the incoming tx for outgoing
  const startBlock = incomingTx.blockNumber;
  const currentBlock = await provider.getBlockNumber();
  
  console.log('\nScanning blocks', startBlock, 'to', currentBlock, 'for outgoing txs...');
  console.log('(This might take a moment...)\n');
  
  // Check last 500 blocks (about 16 minutes on Base)
  const endBlock = Math.min(startBlock + 500, currentBlock);
  
  for (let block = startBlock; block <= endBlock; block += 10) {
    const blockData = await provider.getBlock(block, true);
    if (!blockData || !blockData.prefetchedTransactions) continue;
    
    for (const tx of blockData.prefetchedTransactions) {
      if (tx.from && tx.from.toLowerCase() === WRONG_WALLET.toLowerCase()) {
        console.log('Found outgoing TX!');
        console.log('Block:', block);
        console.log('Hash:', tx.hash);
        console.log('To:', tx.to);
        console.log('Value:', ethers.formatEther(tx.value), 'ETH');
        console.log('');
      }
    }
  }
  
  console.log('Scan complete');
}

checkOutgoing().catch(console.error);
