// lib/blockchain-service.ts
import { ethers } from 'ethers';
import * as xrpl from 'xrpl';
import { Connection, Keypair, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';

// ERC20 ABI (sadece transfer fonksiyonu)
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

interface WithdrawResult {
  success: boolean;
  txHash?: string;
  error?: string;
  fee?: number;
}

// =====================
// ETH WITHDRAW
// =====================
export async function withdrawETH(
  toAddress: string,
  amount: number // in ETH
): Promise<WithdrawResult> {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.ETH_MAINNET_RPC);
    const wallet = new ethers.Wallet(process.env.HOT_WALLET_ETH_PRIVATE_KEY!, provider);

    console.log(`🔷 ETH Withdraw: ${amount} ETH to ${toAddress}`);
    console.log(`   Hot Wallet: ${wallet.address}`);

    // Check hot wallet balance
    const balance = await provider.getBalance(wallet.address);
    const amountWei = ethers.parseEther(amount.toFixed(8));
    
    // Get current gas price
    const feeData = await provider.getFeeData();
    const gasLimit = 21000n; // Standard ETH transfer
    const maxFeePerGas = feeData.maxFeePerGas || ethers.parseUnits('50', 'gwei');
    const estimatedGasCost = gasLimit * maxFeePerGas;

    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);
    console.log(`   Required: ${ethers.formatEther(amountWei + estimatedGasCost)} ETH (inc. gas)`);

    if (balance < amountWei + estimatedGasCost) {
      return { 
        success: false, 
        error: `Insufficient hot wallet balance. Required: ${ethers.formatEther(amountWei + estimatedGasCost)} ETH, Available: ${ethers.formatEther(balance)} ETH` 
      };
    }

    // Send transaction
    const tx = await wallet.sendTransaction({
      to: toAddress.trim(),
      value: amountWei,
      maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || ethers.parseUnits('2', 'gwei'),
      gasLimit,
    });

    console.log(`   TX Hash: ${tx.hash}`);

    // Wait for confirmation
    const receipt = await tx.wait(1);

    console.log(`   ✅ Confirmed in block ${receipt?.blockNumber}`);

    return {
      success: true,
      txHash: receipt?.hash || tx.hash,
      fee: parseFloat(ethers.formatEther(estimatedGasCost)),
    };
  } catch (error: any) {
    console.error('ETH withdraw error:', error);
    return { success: false, error: error.message || 'ETH transfer failed' };
  }
}

// =====================
// USDT (ERC20) WITHDRAW
// =====================
export async function withdrawUSDT(
  toAddress: string,
  amount: number // in USDT
): Promise<WithdrawResult> {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.ETH_MAINNET_RPC);
    const wallet = new ethers.Wallet(process.env.HOT_WALLET_ETH_PRIVATE_KEY!, provider);
    
    // USDT Mainnet Contract Address
    const USDT_CONTRACT = process.env.USDT_CONTRACT_ADDRESS || '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    
    const usdtContract = new ethers.Contract(USDT_CONTRACT, ERC20_ABI, wallet);

    console.log(`💵 USDT Withdraw: ${amount} USDT to ${toAddress}`);
    console.log(`   Hot Wallet: ${wallet.address}`);

    // Check USDT balance
    const decimals = await usdtContract.decimals();
    const usdtBalance = await usdtContract.balanceOf(wallet.address);
    const amountInUnits = ethers.parseUnits(amount.toFixed(2), decimals);

    console.log(`   USDT Balance: ${ethers.formatUnits(usdtBalance, decimals)} USDT`);

    if (usdtBalance < amountInUnits) {
      return { 
        success: false, 
        error: `Insufficient USDT balance. Available: ${ethers.formatUnits(usdtBalance, decimals)} USDT` 
      };
    }

    // Check ETH for gas
    const ethBalance = await provider.getBalance(wallet.address);
    const feeData = await provider.getFeeData();
    const gasLimit = 100000n; // ERC20 transfer needs more gas
    const maxFeePerGas = feeData.maxFeePerGas || ethers.parseUnits('50', 'gwei');
    const estimatedGasCost = gasLimit * maxFeePerGas;

    console.log(`   ETH for gas: ${ethers.formatEther(ethBalance)} ETH`);
    console.log(`   Gas needed: ${ethers.formatEther(estimatedGasCost)} ETH`);

    if (ethBalance < estimatedGasCost) {
      return { 
        success: false, 
        error: `Insufficient ETH for gas. Required: ${ethers.formatEther(estimatedGasCost)} ETH, Available: ${ethers.formatEther(ethBalance)} ETH` 
      };
    }

    // Send USDT transfer
    const tx = await usdtContract.transfer(toAddress.trim(), amountInUnits, {
      maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || ethers.parseUnits('2', 'gwei'),
      gasLimit,
    });

    console.log(`   TX Hash: ${tx.hash}`);

    const receipt = await tx.wait(1);

    console.log(`   ✅ Confirmed in block ${receipt?.blockNumber}`);

    return {
      success: true,
      txHash: receipt?.hash || tx.hash,
      fee: parseFloat(ethers.formatEther(estimatedGasCost)),
    };
  } catch (error: any) {
    console.error('USDT withdraw error:', error);
    return { success: false, error: error.message || 'USDT transfer failed' };
  }
}

// =====================
// XRP WITHDRAW
// =====================
export async function withdrawXRP(
  toAddress: string,
  amount: number, // in XRP
  tag?: number // Destination Tag (optional)
): Promise<WithdrawResult> {
  const client = new xrpl.Client('wss://xrplcluster.com'); // Mainnet
  
  try {
    await client.connect();

    // XRP wallet from seed/secret
    // Önce HOT_WALLET_XRP_SECRET dene, yoksa mnemonic'ten türet
    let wallet: xrpl.Wallet;
    
    if (process.env.HOT_WALLET_XRP_SECRET) {
      wallet = xrpl.Wallet.fromSeed(process.env.HOT_WALLET_XRP_SECRET);
    } else if (process.env.HOT_WALLET_MNEMONIC) {
      // Mnemonic'ten XRP wallet türet
      wallet = xrpl.Wallet.fromMnemonic(process.env.HOT_WALLET_MNEMONIC);
    } else {
      throw new Error('XRP wallet credentials not configured');
    }

    console.log(`⚪ XRP Withdraw: ${amount} XRP to ${toAddress}`);
    console.log(`   Hot Wallet: ${wallet.classicAddress}`);
    if (tag) console.log(`   Destination Tag: ${tag}`);

    // Check balance
    const accountInfo = await client.request({
      command: 'account_info',
      account: wallet.classicAddress,
    });
    
    const balance = parseFloat(accountInfo.result.account_data.Balance) / 1000000; // drops to XRP
    const reserveAmount = 10; // XRP reserve requirement
    
    console.log(`   Balance: ${balance} XRP (${reserveAmount} XRP reserve)`);
    console.log(`   Available: ${(balance - reserveAmount).toFixed(2)} XRP`);

    if (balance - amount < reserveAmount) {
      return { 
        success: false, 
        error: `Insufficient XRP balance. Available: ${(balance - reserveAmount).toFixed(2)} XRP (10 XRP reserve required)` 
      };
    }

    // Prepare payment with optional DestinationTag
    const payment: xrpl.Payment = {
      TransactionType: 'Payment',
      Account: wallet.classicAddress,
      Destination: toAddress.trim(),
      Amount: xrpl.xrpToDrops(amount.toFixed(6)),
      ...(tag !== undefined && tag !== null && { DestinationTag: tag }),
    };

    // Auto-fill and sign
    const prepared = await client.autofill(payment);
    const signed = wallet.sign(prepared);
    
    // Submit and wait
    const result = await client.submitAndWait(signed.tx_blob);
    
    console.log(`   TX Hash: ${result.result.hash}`);

    await client.disconnect();

    if (result.result.meta && typeof result.result.meta === 'object' && 'TransactionResult' in result.result.meta) {
      const txResult = result.result.meta.TransactionResult;
      if (txResult === 'tesSUCCESS') {
        console.log(`   ✅ XRP transfer successful`);
        return {
          success: true,
          txHash: result.result.hash,
          fee: 0.000012,
        };
      } else {
        return { success: false, error: `XRP transaction failed: ${txResult}` };
      }
    }

    return { success: false, error: 'XRP transaction failed: Unknown error' };
  } catch (error: any) {
    console.error('XRP withdraw error:', error.message, error.data, error);
    await client.disconnect().catch(() => {});
    return { success: false, error: error.message || 'XRP transfer failed' };
  }
}

// =====================
// SOL WITHDRAW
// =====================
export async function withdrawSOL(
  toAddress: string,
  amount: number // in SOL
): Promise<WithdrawResult> {
  try {
    const connection = new Connection(
      process.env.SOL_MAINNET_RPC || 'https://api.mainnet-beta.solana.com', 
      'confirmed'
    );
    
    // Private key hex formatında (bizim ürettiğimiz)
    let keypair: Keypair;
    const privateKeyStr = process.env.HOT_WALLET_SOL_PRIVATE_KEY!;
    
    if (privateKeyStr.length === 128) {
      // Hex format (64 bytes = 128 hex chars)
      const privateKeyBytes = Buffer.from(privateKeyStr, 'hex');
      keypair = Keypair.fromSecretKey(privateKeyBytes);
    } else if (privateKeyStr.length === 88) {
      // Base64 format
      const privateKeyBytes = Buffer.from(privateKeyStr, 'base64');
      keypair = Keypair.fromSecretKey(privateKeyBytes);
    } else {
      // JSON array format [1,2,3,...]
      const privateKeyArray = JSON.parse(privateKeyStr);
      keypair = Keypair.fromSecretKey(Uint8Array.from(privateKeyArray));
    }

    console.log(`🟣 SOL Withdraw: ${amount} SOL to ${toAddress}`);
    console.log(`   Hot Wallet: ${keypair.publicKey.toBase58()}`);

    // Check balance
    const balance = await connection.getBalance(keypair.publicKey);
    const amountLamports = Math.floor(parseFloat(amount.toFixed(9)) * LAMPORTS_PER_SOL);
    const feeEstimate = 5000; // 5000 lamports is typical fee

    console.log(`   Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
    console.log(`   Sending: ${amount} SOL + ~0.000005 SOL fee`);

    if (balance < amountLamports + feeEstimate) {
      return { 
        success: false, 
        error: `Insufficient SOL balance. Available: ${((balance - feeEstimate) / LAMPORTS_PER_SOL).toFixed(4)} SOL` 
      };
    }

    // Create transfer instruction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: new PublicKey(toAddress.trim()),
        lamports: amountLamports,
      })
    );

    // Send and confirm
    const signature = await sendAndConfirmTransaction(connection, transaction, [keypair]);

    console.log(`   TX Hash: ${signature}`);
    console.log(`   ✅ SOL transfer successful`);

    return {
      success: true,
      txHash: signature,
      fee: feeEstimate / LAMPORTS_PER_SOL,
    };
  } catch (error: any) {
    console.error('SOL withdraw error:', error);
    return { success: false, error: error.message || 'SOL transfer failed' };
  }
}

// =====================
// BTC WITHDRAW 
// =====================
export async function withdrawBTC(
  toAddress: string,
  amount: number // in BTC
): Promise<WithdrawResult> {
  // BTC için şimdilik manual approval gerekli
  // Veya NOWPayments payout API kullanılabilir
  
  console.log(`🟠 BTC Withdraw Request: ${amount} BTC to ${toAddress}`);
  console.log(`   ⚠️ BTC withdrawals require manual processing`);
  
  // Option 1: NOWPayments kullan (eğer varsa)
  if (process.env.NOWPAYMENTS_API_KEY) {
    try {
      const { createBTCPayout } = await import('./nowpayments-service');
      const result = await createBTCPayout(toAddress, amount);
      
      if (result.success) {
        return {
          success: true,
          txHash: result.payoutId,
          fee: 0,
        };
      } else {
        return {
          success: false,
          error: result.error || 'BTC payout failed',
        };
      }
    } catch (e) {
      console.log('NOWPayments not available, BTC withdraw pending manual approval');
    }
  }
  
  // Option 2: Manual approval için pending olarak işaretle
  return {
    success: false,
    error: 'BTC withdrawals are processed manually. Your request has been queued.',
  };
}

// =====================
// MAIN WITHDRAW FUNCTION
// =====================
export async function processWithdraw(
  coin: string,
  toAddress: string,
  amount: number,
  tag?: number // For XRP Destination Tag
): Promise<WithdrawResult> {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Processing ${coin} withdrawal: ${amount} to ${toAddress}`);
  console.log(`${'='.repeat(50)}`);

  switch (coin.toUpperCase()) {
    case 'ETH':
      return withdrawETH(toAddress, amount);
    case 'USDT':
      return withdrawUSDT(toAddress, amount);
    case 'XRP':
      return withdrawXRP(toAddress, amount, tag);
    case 'SOL':
      return withdrawSOL(toAddress, amount);
    case 'BTC':
      return withdrawBTC(toAddress, amount);
    default:
      return { success: false, error: `Unsupported coin: ${coin}` };
  }
}

// =====================
// GET HOT WALLET BALANCES
// =====================
export async function getHotWalletBalances(): Promise<Record<string, number>> {
  const balances: Record<string, number> = {};

  try {
    // ETH & USDT
    const ethProvider = new ethers.JsonRpcProvider(process.env.ETH_MAINNET_RPC);
    const ethAddress = process.env.HOT_WALLET_ETH_ADDRESS!;
    
    const ethBalance = await ethProvider.getBalance(ethAddress);
    balances.ETH = parseFloat(ethers.formatEther(ethBalance));

    const USDT_CONTRACT = process.env.USDT_CONTRACT_ADDRESS || '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    const usdtContract = new ethers.Contract(USDT_CONTRACT, ERC20_ABI, ethProvider);
    const usdtBalance = await usdtContract.balanceOf(ethAddress);
    const decimals = await usdtContract.decimals();
    balances.USDT = parseFloat(ethers.formatUnits(usdtBalance, decimals));
  } catch (e) {
    console.error('Error fetching ETH/USDT balance:', e);
    balances.ETH = 0;
    balances.USDT = 0;
  }

  try {
    // XRP
    const xrpClient = new xrpl.Client('wss://xrplcluster.com');
    await xrpClient.connect();
    const accountInfo = await xrpClient.request({
      command: 'account_info',
      account: process.env.HOT_WALLET_XRP_ADDRESS!,
    });
    balances.XRP = parseFloat(accountInfo.result.account_data.Balance) / 1000000;
    await xrpClient.disconnect();
  } catch (e) {
    console.error('Error fetching XRP balance:', e);
    balances.XRP = 0;
  }

  try {
    // SOL
    const solConnection = new Connection(
      process.env.SOL_MAINNET_RPC || 'https://api.mainnet-beta.solana.com', 
      'confirmed'
    );
    const solBalance = await solConnection.getBalance(new PublicKey(process.env.HOT_WALLET_SOL_ADDRESS!));
    balances.SOL = solBalance / LAMPORTS_PER_SOL;
  } catch (e) {
    console.error('Error fetching SOL balance:', e);
    balances.SOL = 0;
  }

  // BTC - şimdilik 0 (manual tracking gerekli)
  balances.BTC = 0;

  return balances;
}
