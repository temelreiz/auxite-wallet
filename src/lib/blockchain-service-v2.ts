// src/lib/blockchain-service-v2.ts
// Güvenli secret yönetimi ile blockchain işlemleri

import { ethers } from 'ethers';
import * as xrpl from 'xrpl';
import { Connection, Keypair, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getEthPrivateKey, getXrpSecret, getSolPrivateKey } from './security/secrets';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface WithdrawResult {
  success: boolean;
  txHash?: string;
  error?: string;
  fee?: number;
}

// ERC20 ABI (sadece transfer fonksiyonu)
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

// ═══════════════════════════════════════════════════════════════════════════════
// ETH WITHDRAW
// ═══════════════════════════════════════════════════════════════════════════════

export async function withdrawETH(
  toAddress: string,
  amount: number
): Promise<WithdrawResult> {
  try {
    // Güvenli secret retrieval
    const privateKey = await getEthPrivateKey();
    if (!privateKey) {
      return { success: false, error: 'ETH private key not configured' };
    }

    const provider = new ethers.JsonRpcProvider(process.env.ETH_MAINNET_RPC);
    const wallet = new ethers.Wallet(privateKey, provider);

    const balance = await provider.getBalance(wallet.address);
    const amountWei = ethers.parseEther(amount.toFixed(8));
    
    const feeData = await provider.getFeeData();
    const gasLimit = 21000n;
    const maxFeePerGas = feeData.maxFeePerGas || ethers.parseUnits('50', 'gwei');
    const estimatedGasCost = gasLimit * maxFeePerGas;

    if (balance < amountWei + estimatedGasCost) {
      return { 
        success: false, 
        error: `Insufficient hot wallet balance. Required: ${ethers.formatEther(amountWei + estimatedGasCost)} ETH` 
      };
    }

    const tx = await wallet.sendTransaction({
      to: toAddress.trim(),
      value: amountWei,
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
    console.error('ETH withdraw error:', error);
    return { success: false, error: error.message || 'ETH transfer failed' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// USDT (ERC20) WITHDRAW
// ═══════════════════════════════════════════════════════════════════════════════

export async function withdrawUSDT(
  toAddress: string,
  amount: number
): Promise<WithdrawResult> {
  try {
    const privateKey = await getEthPrivateKey();
    if (!privateKey) {
      return { success: false, error: 'ETH private key not configured' };
    }

    const provider = new ethers.JsonRpcProvider(process.env.ETH_MAINNET_RPC);
    const wallet = new ethers.Wallet(privateKey, provider);
    
    const usdtContract = new ethers.Contract(
      process.env.USDT_CONTRACT_ADDRESS!,
      ERC20_ABI,
      wallet
    );

    const decimals = await usdtContract.decimals();
    const usdtBalance = await usdtContract.balanceOf(wallet.address);
    const amountInUnits = ethers.parseUnits(amount.toFixed(2), decimals);

    if (usdtBalance < amountInUnits) {
      return { 
        success: false, 
        error: `Insufficient USDT balance. Available: ${ethers.formatUnits(usdtBalance, decimals)} USDT` 
      };
    }

    const ethBalance = await provider.getBalance(wallet.address);
    const feeData = await provider.getFeeData();
    const gasLimit = 100000n;
    const maxFeePerGas = feeData.maxFeePerGas || ethers.parseUnits('50', 'gwei');
    const estimatedGasCost = gasLimit * maxFeePerGas;

    if (ethBalance < estimatedGasCost) {
      return { 
        success: false, 
        error: `Insufficient ETH for gas. Required: ${ethers.formatEther(estimatedGasCost)} ETH` 
      };
    }

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

// ═══════════════════════════════════════════════════════════════════════════════
// XRP WITHDRAW
// ═══════════════════════════════════════════════════════════════════════════════

export async function withdrawXRP(
  toAddress: string,
  amount: number,
  tag?: number
): Promise<WithdrawResult> {
  const client = new xrpl.Client('wss://xrplcluster.com');
  
  try {
    const xrpSecret = await getXrpSecret();
    if (!xrpSecret) {
      return { success: false, error: 'XRP secret not configured' };
    }

    await client.connect();

    const wallet = xrpl.Wallet.fromSeed(xrpSecret);

    const accountInfo = await client.request({
      command: 'account_info',
      account: wallet.classicAddress,
    });
    
    const balance = parseFloat(accountInfo.result.account_data.Balance) / 1000000;
    const reserveAmount = 10;
    
    if (balance - amount < reserveAmount) {
      return { 
        success: false, 
        error: `Insufficient XRP balance. Available: ${(balance - reserveAmount).toFixed(2)} XRP` 
      };
    }

    const payment: xrpl.Payment = {
      TransactionType: 'Payment',
      Account: wallet.classicAddress,
      Destination: toAddress.trim(),
      Amount: xrpl.xrpToDrops(amount.toFixed(2)),
      ...(tag !== undefined && tag !== null && { DestinationTag: tag }),
    };

    const prepared = await client.autofill(payment);
    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);

    await client.disconnect();

    if (result.result.meta && typeof result.result.meta === 'object' && 'TransactionResult' in result.result.meta) {
      const txResult = result.result.meta.TransactionResult;
      if (txResult === 'tesSUCCESS') {
        return {
          success: true,
          txHash: result.result.hash,
          fee: 0.000012,
        };
      }
      return { success: false, error: `XRP transaction failed: ${txResult}` };
    }

    return { success: false, error: 'XRP transaction failed: Unknown error' };
  } catch (error: any) {
    console.error('XRP withdraw error:', error);
    await client.disconnect().catch(() => {});
    return { success: false, error: error.message || 'XRP transfer failed' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOL WITHDRAW
// ═══════════════════════════════════════════════════════════════════════════════

export async function withdrawSOL(
  toAddress: string,
  amount: number
): Promise<WithdrawResult> {
  try {
    const solPrivateKey = await getSolPrivateKey();
    if (!solPrivateKey) {
      return { success: false, error: 'SOL private key not configured' };
    }

    const connection = new Connection(process.env.SOL_MAINNET_RPC!, 'confirmed');
    
    const privateKeyBytes = Buffer.from(solPrivateKey, 'base64');
    const keypair = Keypair.fromSecretKey(privateKeyBytes);

    const balance = await connection.getBalance(keypair.publicKey);
    const amountLamports = Math.floor(parseFloat(amount.toFixed(6)) * LAMPORTS_PER_SOL);
    const feeEstimate = 5000;

    if (balance < amountLamports + feeEstimate) {
      return { 
        success: false, 
        error: `Insufficient SOL balance. Available: ${((balance - feeEstimate) / LAMPORTS_PER_SOL).toFixed(4)} SOL` 
      };
    }

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: new PublicKey(toAddress.trim()),
        lamports: amountLamports,
      })
    );

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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN WITHDRAW FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export async function processWithdraw(
  coin: string,
  toAddress: string,
  amount: number,
  tag?: number
): Promise<WithdrawResult> {
  // Input validation
  if (!toAddress || toAddress.trim() === '') {
    return { success: false, error: 'Invalid destination address' };
  }
  
  if (amount <= 0) {
    return { success: false, error: 'Amount must be positive' };
  }

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
      return { success: false, error: 'BTC withdrawals coming soon' };
    default:
      return { success: false, error: `Unsupported coin: ${coin}` };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOT WALLET BALANCES (Read-only - no secrets needed)
// ═══════════════════════════════════════════════════════════════════════════════

export async function getHotWalletBalances(): Promise<Record<string, number>> {
  const balances: Record<string, number> = {};

  // ETH & USDT - using public addresses from env
  try {
    const ethProvider = new ethers.JsonRpcProvider(process.env.ETH_MAINNET_RPC);
    const ethAddress = process.env.HOT_WALLET_ETH_ADDRESS;
    
    if (ethAddress) {
      const ethBalance = await ethProvider.getBalance(ethAddress);
      balances.ETH = parseFloat(ethers.formatEther(ethBalance));

      const usdtContract = new ethers.Contract(
        process.env.USDT_CONTRACT_ADDRESS!,
        ERC20_ABI,
        ethProvider
      );
      const usdtBalance = await usdtContract.balanceOf(ethAddress);
      const decimals = await usdtContract.decimals();
      balances.USDT = parseFloat(ethers.formatUnits(usdtBalance, decimals));
    }
  } catch (e) {
    console.error('Error fetching ETH/USDT balance:', e);
  }

  // XRP
  try {
    const xrpAddress = process.env.HOT_WALLET_XRP_ADDRESS;
    if (xrpAddress) {
      const xrpClient = new xrpl.Client('wss://xrplcluster.com');
      await xrpClient.connect();
      const accountInfo = await xrpClient.request({
        command: 'account_info',
        account: xrpAddress,
      });
      balances.XRP = parseFloat(accountInfo.result.account_data.Balance) / 1000000;
      await xrpClient.disconnect();
    }
  } catch (e) {
    console.error('Error fetching XRP balance:', e);
  }

  // SOL
  try {
    const solAddress = process.env.HOT_WALLET_SOL_ADDRESS;
    if (solAddress) {
      const solConnection = new Connection(process.env.SOL_MAINNET_RPC!, 'confirmed');
      const solBalance = await solConnection.getBalance(new PublicKey(solAddress));
      balances.SOL = solBalance / LAMPORTS_PER_SOL;
    }
  } catch (e) {
    console.error('Error fetching SOL balance:', e);
  }

  return balances;
}

export default {
  processWithdraw,
  getHotWalletBalances,
  withdrawETH,
  withdrawUSDT,
  withdrawXRP,
  withdrawSOL,
};
