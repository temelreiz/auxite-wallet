import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { ethers } from "ethers";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Token contract addresses (V8)
const TOKEN_CONTRACTS: Record<string, string> = {
  AUXG: process.env.NEXT_PUBLIC_AUXG_V8 || "0xD14D32B1e03B3027D1f8381EeeC567e147De9CCe",
  AUXS: process.env.NEXT_PUBLIC_AUXS_V8 || "0xc924EE950BF5A5Fbe3c26eECB27D99031B441caD",
  AUXPT: process.env.NEXT_PUBLIC_AUXPT_V8 || "0x37402EA435a91567223C132414C3A50C6bBc7200",
  AUXPD: process.env.NEXT_PUBLIC_AUXPD_V8 || "0x6026338B9Bfd94fed07EA61cbE60b15e300911DC",
};

// ERC20 ABI for transfer
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

// On-chain tokens - TEMPORARILY DISABLED until contract mint is fixed
// const ON_CHAIN_TOKENS = ["AUXG", "AUXS", "AUXPT", "AUXPD"];
const ON_CHAIN_TOKENS: string[] = []; // All tokens use off-chain for now

// Off-chain tokens (Redis only) - includes metals temporarily
const OFF_CHAIN_TOKENS = ["AUXG", "AUXS", "AUXPT", "AUXPD", "AUXM", "ETH", "USDT", "BTC", "XRP", "SOL"];

export async function POST(request: NextRequest) {
  try {
    const { fromAddress, toAddress, token, amount } = await request.json();

    if (!fromAddress || !toAddress || !token || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
    }

    if (fromAddress.toLowerCase() === toAddress.toLowerCase()) {
      return NextResponse.json({ error: "Cannot transfer to yourself" }, { status: 400 });
    }

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

      // Log transaction
      const txId = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const transaction = {
        id: txId,
        type: "transfer_out",
        token: tokenUpper,
        amount: amount.toString(),
        toAddress: normalizedTo,
        txHash: receipt.hash,
        status: "completed",
        timestamp: Date.now(),
      };
      await redis.lpush(`user:${normalizedFrom}:transactions`, JSON.stringify(transaction));

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
      
      const senderTx = {
        id: txId,
        type: "transfer_out",
        token: tokenUpper,
        amount: amount.toString(),
        toAddress: normalizedTo,
        status: "completed",
        timestamp: Date.now(),
      };
      await redis.lpush(`user:${normalizedFrom}:transactions`, JSON.stringify(senderTx));

      const receiverTx = {
        id: txId,
        type: "transfer_in",
        token: tokenUpper,
        amount: amount.toString(),
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
