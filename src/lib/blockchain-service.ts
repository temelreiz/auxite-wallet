// lib/blockchain-service.ts
import { ethers } from 'ethers';
import * as xrpl from 'xrpl';
import { Connection, Keypair, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createBTCPayout } from './nowpayments-service';

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

    // Check hot wallet balance
    const balance = await provider.getBalance(wallet.address);
    const amountWei = ethers.parseEther(amount.toFixed(8));
    
    // Get current gas price
    const feeData = await provider.getFeeData();
    const gasLimit = 21000n; // Standard ETH transfer
    const maxFeePerGas = feeData.maxFeePerGas || ethers.parseUnits('50', 'gwei');
    const estimatedGasCost = gasLimit * maxFeePerGas;

    if (balance < amountWei + estimatedGasCost) {
      return { 
        success: false, 
        error: `Insufficient hot wallet balance. Required: ${ethers.formatEther(amountWei + estimatedGasCost)} ETH` 
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

    // Wait for confirmation
    const receipt = await tx.wait(1);

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
    
    const usdtContract = new ethers.Contract(
      process.env.USDT_CONTRACT_ADDRESS!,
      ERC20_ABI,
      wallet
    );

    // Check USDT balance
    const decimals = await usdtContract.decimals();
    const usdtBalance = await usdtContract.balanceOf(wallet.address);
    const amountInUnits = ethers.parseUnits(amount.toFixed(2), decimals);

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

    if (ethBalance < estimatedGasCost) {
      return { 
        success: false, 
        error: `Insufficient ETH for gas. Required: ${ethers.formatEther(estimatedGasCost)} ETH` 
      };
    }

    // Send USDT transfer
    const tx = await usdtContract.transfer(toAddress.trim(), amountInUnits, {
      maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || ethers.parseUnits('2', 'gwei'),
      gasLimit,
    });

    const receipt = await tx.wait(1);

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

    const wallet = xrpl.Wallet.fromSeed(process.env.HOT_WALLET_XRP_SECRET!);

    // Check balance
    const accountInfo = await client.request({
      command: 'account_info',
      account: wallet.classicAddress,
    });
    
    const balance = parseFloat(accountInfo.result.account_data.Balance) / 1000000; // drops to XRP
    const reserveAmount = 10; // XRP reserve requirement
    
    if (balance - amount < reserveAmount) {
      return { 
        success: false, 
        error: `Insufficient XRP balance. Available: ${(balance - reserveAmount).toFixed(2)} XRP (10 XRP reserve required)` 
      };
    }

    console.log("XRP Debug - toAddress:", toAddress);
    console.log("XRP Debug - amount:", amount);
    console.log("XRP Debug - tag:", tag);
    console.log("XRP Debug - wallet:", wallet.classicAddress);

    // Prepare payment with optional DestinationTag
    const payment: xrpl.Payment = {
      TransactionType: 'Payment',
      Account: wallet.classicAddress,
      Destination: toAddress.trim(),
      Amount: xrpl.xrpToDrops(amount.toFixed(2)),
      ...(tag !== undefined && tag !== null && { DestinationTag: tag }),
    };

    // Auto-fill and sign
    const prepared = await client.autofill(payment);
    const signed = wallet.sign(prepared);
    
    // Submit and wait
    const result = await client.submitAndWait(signed.tx_blob);
    console.log("XRP Submit Result:", JSON.stringify(result.result, null, 2));

    await client.disconnect();

    if (result.result.meta && typeof result.result.meta === 'object' && 'TransactionResult' in result.result.meta) {
      const txResult = result.result.meta.TransactionResult;
      if (txResult === 'tesSUCCESS') {
        return {
          success: true,
          txHash: result.result.hash,
          fee: parseFloat(xrpl.dropsToXrp(`${prepared.Fee || 12}`)),
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
    const connection = new Connection(process.env.SOL_MAINNET_RPC!, 'confirmed');
    
    // Decode private key from base64
    const privateKeyBytes = Buffer.from(process.env.HOT_WALLET_SOL_PRIVATE_KEY!, 'base64');
    const keypair = Keypair.fromSecretKey(privateKeyBytes);

    // Check balance
    const balance = await connection.getBalance(keypair.publicKey);
    const amountLamports = Math.floor(parseFloat(amount.toFixed(6)) * LAMPORTS_PER_SOL);
    const feeEstimate = 5000; // 5000 lamports is typical fee

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
// MAIN WITHDRAW FUNCTION
// =====================
export async function processWithdraw(
  coin: string,
  toAddress: string,
  amount: number,
  tag?: number // For XRP Destination Tag
): Promise<WithdrawResult> {
  switch (coin.toUpperCase()) {
    case 'ETH':
      return withdrawETH(toAddress, amount);
    case 'USDT':
      return withdrawUSDT(toAddress, amount);
    case 'XRP':
      return withdrawXRP(toAddress, amount, tag);
    case 'SOL':
      return withdrawSOL(toAddress, amount);
    case 'BTC': return withdrawBTC(toAddress, amount);// 
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
    const ethBalance = await ethProvider.getBalance(process.env.HOT_WALLET_ETH_ADDRESS!);
    balances.ETH = parseFloat(ethers.formatEther(ethBalance));

    const usdtContract = new ethers.Contract(
      process.env.USDT_CONTRACT_ADDRESS!,
      ERC20_ABI,
      ethProvider
    );
    const usdtBalance = await usdtContract.balanceOf(process.env.HOT_WALLET_ETH_ADDRESS!);
    const decimals = await usdtContract.decimals();
    balances.USDT = parseFloat(ethers.formatUnits(usdtBalance, decimals));
  } catch (e) {
    console.error('Error fetching ETH/USDT balance:', e);
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
  }

  try {
    // SOL
    const solConnection = new Connection(process.env.SOL_MAINNET_RPC!, 'confirmed');
    const solBalance = await solConnection.getBalance(new PublicKey(process.env.HOT_WALLET_SOL_ADDRESS!));
    balances.SOL = solBalance / LAMPORTS_PER_SOL;
  } catch (e) {
    console.error('Error fetching SOL balance:', e);
  }

  return balances;
}

// =====================
// BTC WITHDRAW (via NOWPayments)
// =====================

export async function withdrawBTC(
  toAddress: string,
  amount: number // in BTC
): Promise<WithdrawResult> {
  try {
    console.log("BTC Payout:", amount, "BTC to", toAddress);
    
    const result = await createBTCPayout(toAddress, amount);
    
    if (result.success) {
      return {
        success: true,
        txHash: result.payoutId, // NOWPayments payout ID
        fee: 0, // NOWPayments handles fees
      };
    } else {
      return {
        success: false,
        error: result.error || 'BTC payout failed',
      };
    }
  } catch (error: any) {
    console.error('BTC withdraw error:', error);
    return { success: false, error: error.message || 'BTC transfer failed' };
  }
}
