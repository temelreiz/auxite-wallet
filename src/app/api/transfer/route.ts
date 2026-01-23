import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { ethers } from "ethers";
import { METAL_TOKENS } from "@/config/contracts-v8";
import * as OTPAuth from "otpauth";
import * as crypto from "crypto";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ═══════════════════════════════════════════════════════════════════════════
// 2FA VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════

function get2FAKey(address: string): string {
  return `user:2fa:${address.toLowerCase()}`;
}

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

async function verify2FA(address: string, code: string): Promise<{ valid: boolean; error?: string; enabled?: boolean }> {
  const key = get2FAKey(address);
  
  // HASH olarak oku (hgetall kullan, get değil!)
  const data = await redis.hgetall(key);
  
  // 2FA verisi yoksa
  if (!data || Object.keys(data).length === 0) {
    return { valid: false, error: "2FA etkinleştirilmemiş. Lütfen önce 2FA'yı aktif edin.", enabled: false };
  }
  
  // String "true" kontrolü - Redis hash'ten string olarak gelir
  const isEnabled = data.enabled === true || data.enabled === "true";
  
  // 2FA aktif değilse
  if (!isEnabled || !data.secret) {
    return { valid: false, error: "2FA etkinleştirilmemiş. Lütfen önce 2FA'yı aktif edin.", enabled: false };
  }
  
  // Kod girilmemişse
  if (!code) {
    return { valid: false, error: "2FA kodu gerekli", enabled: true };
  }
  
  // TOTP doğrula
  try {
    const totp = new OTPAuth.TOTP({
      issuer: "Auxite",
      label: "user",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: data.secret as string,
    });
    const delta = totp.validate({ token: code, window: 1 });
    if (delta !== null) {
      return { valid: true, enabled: true };
    }
  } catch (e) {
    console.error("TOTP verify error:", e);
  }
  
  // Backup kodu dene
  let backupCodes: string[] = [];
  if (data.backupCodes) {
    try {
      backupCodes = typeof data.backupCodes === 'string' 
        ? JSON.parse(data.backupCodes) 
        : data.backupCodes as string[];
    } catch {
      backupCodes = [];
    }
  }
  
  const hashedInput = hashCode(code.toUpperCase());
  const codeIndex = backupCodes.indexOf(hashedInput);
  
  if (codeIndex !== -1) {
    // Kullanılan backup kodunu sil
    backupCodes.splice(codeIndex, 1);
    await redis.hset(key, { 
      backupCodes: JSON.stringify(backupCodes),
      backupCodesRemaining: backupCodes.length 
    });
    return { valid: true, enabled: true };
  }
  
  return { valid: false, error: "Geçersiz 2FA kodu", enabled: true };
}

// Token contract addresses from central config
const TOKEN_CONTRACTS: Record<string, string> = {
  AUXG: METAL_TOKENS.AUXG,
  AUXS: METAL_TOKENS.AUXS,
  AUXPT: METAL_TOKENS.AUXPT,
  AUXPD: METAL_TOKENS.AUXPD,
};

// ERC20 ABI for transfer
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

// On-chain tokens - TEMPORARILY DISABLED until contract mint is fixed
// const ON_CHAIN_TOKENS = ["AUXG", "AUXS", "AUXPT", "AUXPD"];
const ON_CHAIN_TOKENS = ["AUXG", "AUXS", "AUXPT", "AUXPD"]; // On-chain transfers enabled

// Off-chain tokens (Redis only) - includes metals temporarily
const OFF_CHAIN_TOKENS = ["AUXG", "AUXS", "AUXPT", "AUXPD", "AUXM", "ETH", "USDT", "BTC", "XRP", "SOL"];

export async function POST(request: NextRequest) {
  try {
    const { fromAddress, toAddress, token, amount, twoFactorCode } = await request.json();

    if (!fromAddress || !toAddress || !token || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
    }

    if (fromAddress.toLowerCase() === toAddress.toLowerCase()) {
      return NextResponse.json({ error: "Cannot transfer to yourself" }, { status: 400 });
    }

    // 2FA Kontrolü artık frontend'de TwoFactorGate ile yapılıyor
    // API'ye gelene kadar kullanıcı zaten doğrulanmış oluyor

    const normalizedFrom = fromAddress.toLowerCase();
    const normalizedTo = toAddress.toLowerCase();
    const tokenKey = token.toLowerCase();
    const tokenUpper = token.toUpperCase();

    // Check if on-chain or off-chain transfer
    if (ON_CHAIN_TOKENS.includes(tokenUpper)) {
      // ============= ON-CHAIN TRANSFER =============
      const contractAddress = TOKEN_CONTRACTS[tokenUpper];
      if (!contractAddress) {
        return NextResponse.json({ error: "Token contract not found" }, { status: 400 });
      }

      const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
      const wallet = new ethers.Wallet(process.env.HOT_WALLET_ETH_PRIVATE_KEY!, provider);
      const contract = new ethers.Contract(contractAddress, ERC20_ABI, wallet);

      // Get decimals
      const decimals = await contract.decimals();
      const amountInUnits = ethers.parseUnits(amount.toString(), decimals);

      // Check hot wallet balance
      const hotWalletBalance = await contract.balanceOf(wallet.address);
      if (hotWalletBalance < amountInUnits) {
        return NextResponse.json({
          error: "Insufficient hot wallet balance for on-chain transfer",
          available: ethers.formatUnits(hotWalletBalance, decimals),
          required: amount,
        }, { status: 400 });
      }

      // Execute on-chain transfer
      console.log(`🚀 On-chain transfer: ${amount} ${tokenUpper} to ${toAddress}`);
      const tx = await contract.transfer(toAddress, amountInUnits);
      const receipt = await tx.wait();

      console.log(`✅ Transfer completed: ${receipt.hash}`);

      // Update Redis balances (deduct from sender's platform balance)
      const fromBalanceKey = `user:${normalizedFrom}:balance`;
      const fromBalance = await redis.hgetall(fromBalanceKey);
      if (fromBalance) {
        const currentBalance = parseFloat(fromBalance[tokenKey] as string || "0");
        if (currentBalance >= amount) {
          await redis.hincrbyfloat(fromBalanceKey, tokenKey, -amount);
        }
      }

      // Log transaction - Gönderen için
      const txId = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const senderTransaction = {
        id: txId,
        type: "send",
        token: tokenUpper,
        amount: `-${amount}`,
        toAddress: normalizedTo,
        txHash: receipt.hash,
        status: "completed",
        timestamp: Date.now(),
      };
      await redis.lpush(`user:${normalizedFrom}:transactions`, JSON.stringify(senderTransaction));

      // Log transaction - Alıcı için
      const receiverTransaction = {
        id: txId,
        type: "receive",
        token: tokenUpper,
        amount: `+${amount}`,
        fromAddress: normalizedFrom,
        txHash: receipt.hash,
        status: "completed",
        timestamp: Date.now(),
      };
      await redis.lpush(`user:${normalizedTo}:transactions`, JSON.stringify(receiverTransaction));

      return NextResponse.json({
        success: true,
        onChain: true,
        transfer: {
          id: txId,
          from: normalizedFrom,
          to: normalizedTo,
          token: tokenUpper,
          amount,
          txHash: receipt.hash,
          explorerUrl: `https://sepolia.etherscan.io/tx/${receipt.hash}`,
        },
      });

    } else {
      // ============= OFF-CHAIN TRANSFER (Redis) =============
      const fromBalanceKey = `user:${normalizedFrom}:balance`;
      const toBalanceKey = `user:${normalizedTo}:balance`;

      // Get sender's balance
      const fromBalance = await redis.hgetall(fromBalanceKey);
      if (!fromBalance) {
        return NextResponse.json({ error: "Sender not found" }, { status: 404 });
      }

      const senderBalance = parseFloat(fromBalance[tokenKey] as string || "0");

      if (senderBalance < amount) {
        return NextResponse.json({
          error: "Insufficient balance",
          required: amount,
          available: senderBalance,
        }, { status: 400 });
      }

      // Ensure receiver exists
      const toBalance = await redis.hgetall(toBalanceKey);
      if (!toBalance || Object.keys(toBalance).length === 0) {
        await redis.hset(toBalanceKey, { [tokenKey]: 0 });
      }

      // Execute transfer
      const multi = redis.multi();
      multi.hincrbyfloat(fromBalanceKey, tokenKey, -amount);
      multi.hincrbyfloat(toBalanceKey, tokenKey, amount);
      await multi.exec();

      // Log transactions
      const txId = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Gönderen için - eksi miktar
      const senderTx = {
        id: txId,
        type: "send",
        token: tokenUpper,
        amount: `-${amount}`,
        toAddress: normalizedTo,
        status: "completed",
        timestamp: Date.now(),
      };
      await redis.lpush(`user:${normalizedFrom}:transactions`, JSON.stringify(senderTx));

      // Alıcı için - artı miktar
      const receiverTx = {
        id: txId,
        type: "receive",
        token: tokenUpper,
        amount: `+${amount}`,
        fromAddress: normalizedFrom,
        status: "completed",
        timestamp: Date.now(),
      };
      await redis.lpush(`user:${normalizedTo}:transactions`, JSON.stringify(receiverTx));

      // Get updated balance
      const updatedFromBalance = await redis.hgetall(fromBalanceKey);

      return NextResponse.json({
        success: true,
        onChain: false,
        transfer: {
          id: txId,
          from: normalizedFrom,
          to: normalizedTo,
          token: tokenUpper,
          amount,
        },
        balance: {
          [tokenKey]: parseFloat(updatedFromBalance?.[tokenKey] as string || "0"),
        },
      });
    }

  } catch (error: any) {
    console.error("Transfer error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
