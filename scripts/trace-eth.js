const { ethers } = require('ethers');

async function traceETH() {
  const WRONG_WALLET = '0xbE8993001F475AF12eFC4185d96859D0b191ABa9';
  const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
  
  // Get all blocks where ETH came in
  const incomingTxHash = '0x39e196ec32f43777e3a469a4e635025ae93dac5b993446a0506b394633ab156f';
  const incomingTx = await provider.getTransaction(incomingTxHash);
  const incomingBlock = incomingTx.blockNumber;
  
  console.log('ETH received at block:', incomingBlock);
  console.log('Amount received:', ethers.formatEther(incomingTx.value), 'ETH');
  
  // Current balance is 0, so it must have been spent
  // Check each nonce from 0 to 5 to find outgoing txs
  console.log('\nThis wallet has sent 6 transactions (nonce 0-5)');
  console.log('The ETH was likely auto-forwarded or stolen.\n');
  
  // Try to find the latest transaction from this wallet
  // by checking recent blocks
  const currentBlock = await provider.getBlockNumber();
  console.log('Checking recent blocks around incoming tx...');
  
  // Check the same block and next few blocks
  for (let blockNum = incomingBlock; blockNum <= incomingBlock + 50; blockNum++) {
    try {
      const block = await provider.getBlock(blockNum, true);
      if (!block || !block.prefetchedTransactions) continue;
      
      for (const tx of block.prefetchedTransactions) {
        if (tx.from && tx.from.toLowerCase() === WRONG_WALLET.toLowerCase()) {
          console.log('Found outgoing TX at block', blockNum);
          console.log('  Hash:', tx.hash);
          console.log('  To:', tx.to);
          console.log('  Value:', ethers.formatEther(tx.value), 'ETH');
        }
      }
    } catch (e) {
      // Skip errors
    }
  }
}

traceETH().catch(console.error);
