// lib/kms-wallet.ts
// AWS KMS-based custodial wallet management

import { KMSClient, EncryptCommand, DecryptCommand } from "@aws-sdk/client-kms";
import { ethers } from "ethers";
import { Redis } from "@upstash/redis";

// AWS KMS Client
const kmsClient = new KMSClient({
  region: process.env.AWS_REGION || "eu-central-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// KMS Key ID for wallet encryption
const KMS_KEY_ID = process.env.AWS_KMS_KEY_ID!;

// Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/**
 * Encrypt data using AWS KMS
 */
async function encryptWithKMS(plaintext: string): Promise<string> {
  const command = new EncryptCommand({
    KeyId: KMS_KEY_ID,
    Plaintext: Buffer.from(plaintext, "utf-8"),
  });

  const response = await kmsClient.send(command);

  if (!response.CiphertextBlob) {
    throw new Error("KMS encryption failed");
  }

  // Return base64 encoded ciphertext
  return Buffer.from(response.CiphertextBlob).toString("base64");
}

/**
 * Decrypt data using AWS KMS
 */
async function decryptWithKMS(ciphertext: string): Promise<string> {
  const command = new DecryptCommand({
    CiphertextBlob: Buffer.from(ciphertext, "base64"),
  });

  const response = await kmsClient.send(command);

  if (!response.Plaintext) {
    throw new Error("KMS decryption failed");
  }

  return Buffer.from(response.Plaintext).toString("utf-8");
}

/**
 * Create a new custodial wallet for a user
 * - Generates new Ethereum wallet
 * - Encrypts private key with KMS
 * - Stores encrypted key in Redis
 * - Returns public address
 */
export async function createCustodialWallet(userId: string): Promise<{
  address: string;
  created: boolean;
}> {
  // Check if user already has a wallet
  const existingWallet = await redis.hget(`user:${userId}:wallet`, "address");
  if (existingWallet) {
    return {
      address: existingWallet as string,
      created: false,
    };
  }

  // Generate new wallet
  const wallet = ethers.Wallet.createRandom();
  const address = wallet.address.toLowerCase();
  const privateKey = wallet.privateKey;

  console.log(`🔐 Creating custodial wallet for user ${userId}: ${address}`);

  // Encrypt private key with KMS
  const encryptedPrivateKey = await encryptWithKMS(privateKey);

  // Store in Redis
  await redis.hset(`user:${userId}:wallet`, {
    address: address,
    encryptedPrivateKey: encryptedPrivateKey,
    createdAt: new Date().toISOString(),
    type: "custodial",
  });

  // Also create address -> userId mapping
  await redis.set(`wallet:address:${address}`, userId);

  console.log(`✅ Custodial wallet created: ${address}`);

  return {
    address,
    created: true,
  };
}

/**
 * Get user's wallet address (without decrypting private key)
 */
export async function getWalletAddress(userId: string): Promise<string | null> {
  const address = await redis.hget(`user:${userId}:wallet`, "address");
  return address as string | null;
}

/**
 * Get decrypted wallet for signing transactions
 * WARNING: Private key is in memory only during transaction signing
 */
export async function getDecryptedWallet(
  userId: string,
  provider?: ethers.Provider
): Promise<ethers.Wallet | null> {
  const walletData = await redis.hgetall(`user:${userId}:wallet`);

  if (!walletData || !walletData.encryptedPrivateKey) {
    console.error(`No wallet found for user ${userId}`);
    return null;
  }

  try {
    // Decrypt private key
    const privateKey = await decryptWithKMS(walletData.encryptedPrivateKey as string);

    // Create wallet instance
    const wallet = new ethers.Wallet(privateKey, provider);

    return wallet;
  } catch (error) {
    console.error(`Failed to decrypt wallet for user ${userId}:`, error);
    return null;
  }
}

/**
 * Get user ID from wallet address
 */
export async function getUserIdFromAddress(address: string): Promise<string | null> {
  const userId = await redis.get(`wallet:address:${address.toLowerCase()}`);
  return userId as string | null;
}

/**
 * Sign and send ETH transaction
 */
export async function sendETH(
  fromUserId: string,
  toAddress: string,
  amountEth: number,
  provider: ethers.Provider
): Promise<{ txHash: string; success: boolean; error?: string }> {
  try {
    const wallet = await getDecryptedWallet(fromUserId, provider);

    if (!wallet) {
      return { txHash: "", success: false, error: "Wallet not found" };
    }

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    const amountWei = ethers.parseEther(amountEth.toString());

    // Estimate gas
    const gasPrice = await provider.getFeeData();
    const gasLimit = BigInt(21000); // Standard ETH transfer
    const gasCost = gasLimit * (gasPrice.gasPrice || BigInt(0));

    if (balance < amountWei + gasCost) {
      return {
        txHash: "",
        success: false,
        error: `Insufficient balance. Have: ${ethers.formatEther(balance)} ETH, Need: ${ethers.formatEther(amountWei + gasCost)} ETH (including gas)`,
      };
    }

    // Send transaction
    const tx = await wallet.sendTransaction({
      to: toAddress,
      value: amountWei,
    });

    console.log(`🚀 ETH transfer sent: ${tx.hash}`);

    // Wait for confirmation
    const receipt = await tx.wait();

    console.log(`✅ ETH transfer confirmed: ${receipt?.hash}`);

    return {
      txHash: receipt?.hash || tx.hash,
      success: true,
    };
  } catch (error: any) {
    console.error("ETH transfer error:", error);
    return {
      txHash: "",
      success: false,
      error: error.message || "Transfer failed",
    };
  }
}

/**
 * Sign and send ERC20 token transaction
 */
export async function sendERC20(
  fromUserId: string,
  toAddress: string,
  tokenAddress: string,
  amount: number,
  decimals: number,
  provider: ethers.Provider
): Promise<{ txHash: string; success: boolean; error?: string }> {
  try {
    const wallet = await getDecryptedWallet(fromUserId, provider);

    if (!wallet) {
      return { txHash: "", success: false, error: "Wallet not found" };
    }

    const ERC20_ABI = [
      "function transfer(address to, uint256 amount) returns (bool)",
      "function balanceOf(address account) view returns (uint256)",
    ];

    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);

    // Check token balance
    const balance = await contract.balanceOf(wallet.address);
    const amountInUnits = ethers.parseUnits(amount.toString(), decimals);

    if (balance < amountInUnits) {
      return {
        txHash: "",
        success: false,
        error: `Insufficient token balance. Have: ${ethers.formatUnits(balance, decimals)}, Need: ${amount}`,
      };
    }

    // Check ETH for gas
    const ethBalance = await provider.getBalance(wallet.address);
    const gasPrice = await provider.getFeeData();
    const estimatedGas = BigInt(100000); // ERC20 transfer estimate
    const gasCost = estimatedGas * (gasPrice.gasPrice || BigInt(0));

    if (ethBalance < gasCost) {
      return {
        txHash: "",
        success: false,
        error: `Insufficient ETH for gas. Have: ${ethers.formatEther(ethBalance)} ETH, Need: ~${ethers.formatEther(gasCost)} ETH`,
      };
    }

    // Send transaction
    const tx = await contract.transfer(toAddress, amountInUnits);

    console.log(`🚀 ERC20 transfer sent: ${tx.hash}`);

    // Wait for confirmation
    const receipt = await tx.wait();

    console.log(`✅ ERC20 transfer confirmed: ${receipt?.hash}`);

    return {
      txHash: receipt?.hash || tx.hash,
      success: true,
    };
  } catch (error: any) {
    console.error("ERC20 transfer error:", error);
    return {
      txHash: "",
      success: false,
      error: error.message || "Transfer failed",
    };
  }
}
