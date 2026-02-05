const { ethers } = require('ethers');

async function recoverETH() {
  // Wrong address private key (from .env.vercel)
  const WRONG_WALLET_PRIVATE_KEY = '0x73eb48b0bf95acbaa7074a0d33fff2c8b6698bf6b0791096af84c2664f01033e';
  
  // Correct hot wallet address (production)
  const CORRECT_HOT_WALLET = '0xaE4d3eb67558423f74E8D80F56fbdfc1F91F3213';
  
  // Base mainnet RPC
  const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
  
  // Create wallet from private key
  const wallet = new ethers.Wallet(WRONG_WALLET_PRIVATE_KEY, provider);
  
  console.log('Wrong wallet address:', wallet.address);
  console.log('Correct hot wallet:', CORRECT_HOT_WALLET);
  
  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log('Balance:', ethers.formatEther(balance), 'ETH');
  
  if (balance === 0n) {
    console.log('No balance to recover');
    return;
  }
  
  // Get gas price
  const feeData = await provider.getFeeData();
  const gasLimit = 21000n;
  const maxFeePerGas = feeData.maxFeePerGas || ethers.parseUnits('0.1', 'gwei');
  const gasCost = gasLimit * maxFeePerGas;
  
  console.log('Gas cost:', ethers.formatEther(gasCost), 'ETH');
  
  // Calculate amount to send (balance - gas cost)
  const amountToSend = balance - gasCost;
  
  if (amountToSend <= 0n) {
    console.log('Balance too low to cover gas');
    return;
  }
  
  console.log('Amount to send:', ethers.formatEther(amountToSend), 'ETH');
  
  // Send transaction
  const tx = await wallet.sendTransaction({
    to: CORRECT_HOT_WALLET,
    value: amountToSend,
    gasLimit: gasLimit,
    maxFeePerGas: maxFeePerGas,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || ethers.parseUnits('0.001', 'gwei'),
  });
  
  console.log('Transaction sent:', tx.hash);
  console.log('Waiting for confirmation...');
  
  const receipt = await tx.wait();
  console.log('Transaction confirmed!');
  console.log('Block:', receipt.blockNumber);
  console.log('Gas used:', receipt.gasUsed.toString());
}

recoverETH().catch(console.error);
