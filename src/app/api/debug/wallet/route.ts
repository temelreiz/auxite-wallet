// Debug endpoint - Remove in production!
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { createCustodialWallet } from "@/lib/kms-wallet";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address")?.toLowerCase();
  const searchAll = searchParams.get("searchAll") === "true";
  const listAll = searchParams.get("listAll") === "true";

  // List all custodial wallets
  if (listAll) {
    const walletKeys = await redis.keys("user:*:wallet");
    const wallets: any[] = [];

    for (const key of walletKeys) {
      const wallet = await redis.hgetall(key);
      if (wallet && wallet.encryptedPrivateKey) {
        const userId = key.replace("user:", "").replace(":wallet", "");
        wallets.push({
          userId,
          address: wallet.address,
          type: wallet.type,
          createdAt: wallet.createdAt,
        });
      }
    }

    return NextResponse.json({
      count: wallets.length,
      wallets,
    });
  }

  if (!address) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }

  // Check all possible keys
  const walletAddressKey = await redis.get(`wallet:address:${address}`);
  const userAddressKey = await redis.get(`user:address:${address}`);

  let walletData = null;
  let userData = null;

  const userId = walletAddressKey || userAddressKey;

  if (userId) {
    walletData = await redis.hgetall(`user:${userId}:wallet`);
    userData = await redis.hgetall(`user:${userId}`);
  }

  // If searchAll=true and no direct match, scan all users to find this address
  let foundInUsers: any[] = [];
  if (searchAll && !userId) {
    // Get all keys matching user:*
    const keys = await redis.keys("user:*:wallet");
    for (const key of keys) {
      const wallet = await redis.hgetall(key);
      if (wallet && (wallet.address as string)?.toLowerCase() === address) {
        const uid = key.replace("user:", "").replace(":wallet", "");
        const user = await redis.hgetall(`user:${uid}`);
        foundInUsers.push({
          userId: uid,
          walletData: wallet,
          userData: user,
        });
      }
    }

    // Also check user data directly
    const userKeys = await redis.keys("user:*");
    for (const key of userKeys) {
      if (key.includes(":wallet") || key.includes(":balance") || key.includes(":transactions")) continue;
      const user = await redis.hgetall(key);
      if (user && (user.walletAddress as string)?.toLowerCase() === address) {
        const uid = key.replace("user:", "");
        if (!foundInUsers.find(f => f.userId === uid)) {
          const wallet = await redis.hgetall(`user:${uid}:wallet`);
          foundInUsers.push({
            userId: uid,
            userData: user,
            walletData: wallet,
          });
        }
      }
    }
  }

  return NextResponse.json({
    address,
    keys: {
      "wallet:address": walletAddressKey,
      "user:address": userAddressKey,
    },
    userId,
    walletData: walletData ? {
      address: walletData.address,
      type: walletData.type,
      hasEncryptedKey: !!walletData.encryptedPrivateKey,
      createdAt: walletData.createdAt,
    } : null,
    userData: userData ? {
      id: userData.id,
      walletAddress: userData.walletAddress,
      walletType: userData.walletType,
      createdAt: userData.createdAt,
    } : null,
    isCustodial: !!(walletData?.encryptedPrivateKey || userData?.walletType === 'custodial'),
    foundInUsers: foundInUsers.length > 0 ? foundInUsers : undefined,
  });
}

// LIST all custodial wallets (for debugging)
export async function PUT(request: NextRequest) {
  try {
    const walletKeys = await redis.keys("user:*:wallet");
    const wallets: any[] = [];

    for (const key of walletKeys) {
      const wallet = await redis.hgetall(key);
      if (wallet && wallet.encryptedPrivateKey) {
        const userId = key.replace("user:", "").replace(":wallet", "");
        wallets.push({
          userId,
          address: wallet.address,
          type: wallet.type,
          createdAt: wallet.createdAt,
        });
      }
    }

    return NextResponse.json({
      count: wallets.length,
      wallets,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Convert user to custodial wallet OR transfer balances OR add balance
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, fromUserId, toUserId } = body;

    // Add balance to user wallet (for testing)
    if (action === 'addBalance') {
      const { address, token, amount } = body;
      if (!address || !token || amount === undefined) {
        return NextResponse.json({ error: "address, token, and amount required" }, { status: 400 });
      }

      const balanceKey = `user:${address.toLowerCase()}:balance`;
      const tokenLower = token.toLowerCase();

      // Get current balance
      const currentBalance = parseFloat(await redis.hget(balanceKey, tokenLower) as string || "0");
      const newBalance = currentBalance + parseFloat(amount);

      // Update balance
      await redis.hset(balanceKey, { [tokenLower]: newBalance.toString() });

      // Record transaction
      const tx = {
        type: "deposit",
        token: token.toUpperCase(),
        amount: parseFloat(amount),
        source: "debug_add_balance",
        timestamp: Date.now(),
        date: new Date().toISOString(),
      };
      await redis.lpush(`user:${address.toLowerCase()}:transactions`, JSON.stringify(tx));

      return NextResponse.json({
        success: true,
        message: `Added ${amount} ${token.toUpperCase()} to ${address}`,
        previousBalance: currentBalance,
        newBalance,
      });
    }

    // Transfer balances between users (by userId)
    if (action === 'transferBalances') {
      if (!fromUserId || !toUserId) {
        return NextResponse.json({ error: "fromUserId and toUserId required" }, { status: 400 });
      }

      // Get source user balances
      const fromBalances = await redis.hgetall(`user:${fromUserId}:balance`);
      if (!fromBalances || Object.keys(fromBalances).length === 0) {
        return NextResponse.json({ error: "Source user has no balances" }, { status: 404 });
      }

      // Get destination user to verify it exists
      const toUserData = await redis.hgetall(`user:${toUserId}`);
      if (!toUserData) {
        return NextResponse.json({ error: "Destination user not found" }, { status: 404 });
      }

      // Get existing destination balances
      const toBalances = await redis.hgetall(`user:${toUserId}:balance`) || {};

      // Merge balances
      const transferredBalances: Record<string, { from: number; to: number; total: number }> = {};

      for (const [token, amount] of Object.entries(fromBalances)) {
        const fromAmount = parseFloat(amount as string) || 0;
        const toAmount = parseFloat(toBalances[token] as string) || 0;
        const totalAmount = fromAmount + toAmount;

        transferredBalances[token] = {
          from: fromAmount,
          to: toAmount,
          total: totalAmount
        };

        // Update destination balance
        await redis.hset(`user:${toUserId}:balance`, { [token]: totalAmount.toString() });
      }

      // Clear source balances
      await redis.del(`user:${fromUserId}:balance`);

      return NextResponse.json({
        success: true,
        message: "Balances transferred successfully",
        fromUserId,
        toUserId,
        transferredBalances,
      });
    }

    // Transfer balances between addresses (Redis off-chain balances)
    if (action === 'transferByAddress') {
      const { fromAddress, toAddress } = body;
      if (!fromAddress || !toAddress) {
        return NextResponse.json({ error: "fromAddress and toAddress required" }, { status: 400 });
      }

      const fromKey = `user:${fromAddress.toLowerCase()}:balance`;
      const toKey = `user:${toAddress.toLowerCase()}:balance`;

      // Get source balances
      const fromBalances = await redis.hgetall(fromKey);
      if (!fromBalances || Object.keys(fromBalances).length === 0) {
        return NextResponse.json({ error: "Source address has no balances", fromKey }, { status: 404 });
      }

      // Get existing destination balances
      const toBalances = await redis.hgetall(toKey) || {};

      // Merge balances (only off-chain tokens)
      const offChainTokens = ['auxm', 'bonusauxm', 'bonusAuxm', 'btc', 'xrp', 'sol', 'usd', 'totalAuxm', 'bonusExpiresAt'];
      const transferredBalances: Record<string, { from: number; to: number; total: number }> = {};

      for (const [token, amount] of Object.entries(fromBalances)) {
        // Only transfer off-chain tokens
        if (!offChainTokens.includes(token.toLowerCase()) && !offChainTokens.includes(token)) {
          continue;
        }

        const fromAmount = parseFloat(amount as string) || 0;
        const toAmount = parseFloat(toBalances[token] as string) || 0;
        const totalAmount = fromAmount + toAmount;

        if (fromAmount > 0) {
          transferredBalances[token] = {
            from: fromAmount,
            to: toAmount,
            total: totalAmount
          };

          // Update destination balance
          await redis.hset(toKey, { [token]: totalAmount.toString() });
          // Clear from source
          await redis.hset(fromKey, { [token]: "0" });
        }
      }

      return NextResponse.json({
        success: true,
        message: "Off-chain balances transferred successfully",
        fromAddress,
        toAddress,
        transferredBalances,
        note: "On-chain tokens (ETH, AUXG, AUXS, etc.) cannot be transferred without private key"
      });
    }

    // Convert user to custodial (default action)
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    // Check if user exists
    const userData = await redis.hgetall(`user:${userId}`);
    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if already has custodial wallet
    const existingWallet = await redis.hgetall(`user:${userId}:wallet`);
    if (existingWallet && existingWallet.encryptedPrivateKey) {
      return NextResponse.json({
        error: "User already has custodial wallet",
        address: existingWallet.address,
      }, { status: 400 });
    }

    // Create new custodial wallet for this user
    const { address, created } = await createCustodialWallet(userId);

    // Update user data with new wallet
    const oldAddress = userData.walletAddress as string;
    await redis.hset(`user:${userId}`, {
      walletAddress: address,
      walletType: "custodial",
    });

    // Update address mappings
    if (oldAddress) {
      await redis.del(`user:address:${oldAddress.toLowerCase()}`);
      await redis.del(`wallet:address:${oldAddress.toLowerCase()}`);
    }
    await redis.set(`user:address:${address}`, userId);
    await redis.set(`wallet:address:${address}`, userId);

    return NextResponse.json({
      success: true,
      message: "User converted to custodial wallet",
      userId,
      oldAddress,
      newAddress: address,
      walletCreated: created,
    });
  } catch (error: any) {
    console.error("Convert to custodial error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Transfer balances from one user to another
export async function PATCH(request: NextRequest) {
  try {
    const { fromUserId, toUserId } = await request.json();

    if (!fromUserId || !toUserId) {
      return NextResponse.json({ error: "fromUserId and toUserId required" }, { status: 400 });
    }

    // Get source user balances
    const fromBalances = await redis.hgetall(`user:${fromUserId}:balance`);
    if (!fromBalances || Object.keys(fromBalances).length === 0) {
      return NextResponse.json({ error: "Source user has no balances" }, { status: 404 });
    }

    // Get destination user to verify it exists
    const toUserData = await redis.hgetall(`user:${toUserId}`);
    if (!toUserData) {
      return NextResponse.json({ error: "Destination user not found" }, { status: 404 });
    }

    // Get existing destination balances
    const toBalances = await redis.hgetall(`user:${toUserId}:balance`) || {};

    // Merge balances
    const transferredBalances: Record<string, { from: number; to: number; total: number }> = {};

    for (const [token, amount] of Object.entries(fromBalances)) {
      const fromAmount = parseFloat(amount as string) || 0;
      const toAmount = parseFloat(toBalances[token] as string) || 0;
      const totalAmount = fromAmount + toAmount;

      transferredBalances[token] = {
        from: fromAmount,
        to: toAmount,
        total: totalAmount
      };

      // Update destination balance
      await redis.hset(`user:${toUserId}:balance`, { [token]: totalAmount.toString() });
    }

    // Clear source balances
    await redis.del(`user:${fromUserId}:balance`);

    return NextResponse.json({
      success: true,
      message: "Balances transferred successfully",
      fromUserId,
      toUserId,
      transferredBalances,
    });
  } catch (error: any) {
    console.error("Transfer balances error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
