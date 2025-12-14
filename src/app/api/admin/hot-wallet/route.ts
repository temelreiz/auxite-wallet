// Multi-Chain Hot Wallet Management API
// Supports: ETH, USDT (ERC-20), BTC, XRP, SOL
import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ═══════════════════════════════════════════════════════════════════════════════
// WALLET ADDRESSES (from env)
// ═══════════════════════════════════════════════════════════════════════════════

const WALLETS = {
  ETH: {
    address: process.env.HOT_WALLET_ADDRESS || '0x2A6007a15A7B04FEAdd64f0d002A10A6867587F6',
    privateKey: process.env.HOT_WALLET_PRIVATE_KEY,
    network: 'Ethereum',
  },
  BTC: {
    address: process.env.BTC_WALLET_ADDRESS || '1L4h8XzsLzzek6LoxGKdDsFcSaD7oxyume',
    privateKey: process.env.BTC_WALLET_PRIVATE_KEY,
    network: 'Bitcoin',
  },
  XRP: {
    address: process.env.XRP_WALLET_ADDRESS || 'r4pNH6DdDtVknt8NZAhhbcY8Wqr46QoGae',
    secret: process.env.XRP_WALLET_SECRET,
    network: 'XRP Ledger',
    memo: '123456',
  },
  SOL: {
    address: process.env.SOL_WALLET_ADDRESS || '6orrQ2dRuiFwH5w3wddQjQNbPT6w7vEN7eMW9wUNM1Qe',
    privateKey: process.env.SOL_WALLET_PRIVATE_KEY,
    network: 'Solana',
  },
};

const USDT_CONTRACT = process.env.USDT_CONTRACT_ADDRESS || '0xdAC17F958D2ee523a2206206994597C13D831ec7';

// Redis Keys
const KEYS = {
  PENDING_WITHDRAWS: 'hot-wallet:pending-withdraws',
  WITHDRAW_HISTORY: 'hot-wallet:withdraw-history',
  DEPOSIT_HISTORY: 'hot-wallet:deposit-history',
  WALLET_STATS: 'hot-wallet:stats',
  CACHED_BALANCES: 'hot-wallet:balances:cache',
};

// ═══════════════════════════════════════════════════════════════════════════════
// BALANCE FETCHERS
// ═══════════════════════════════════════════════════════════════════════════════

async function getETHBalance(): Promise<{ eth: string; usdt: string }> {
  try {
    const { ethers } = await import('ethers');
    const rpcUrl = process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // ETH Balance
    const ethBalance = await provider.getBalance(WALLETS.ETH.address);
    const ethFormatted = ethers.formatEther(ethBalance);
    
    // USDT Balance (ERC-20)
    let usdtBalance = '0';
    try {
      const ERC20_ABI = ['function balanceOf(address) view returns (uint256)'];
      const usdtContract = new ethers.Contract(USDT_CONTRACT, ERC20_ABI, provider);
      const usdtRaw = await usdtContract.balanceOf(WALLETS.ETH.address);
      usdtBalance = ethers.formatUnits(usdtRaw, 6); // USDT has 6 decimals
    } catch (e) {
      console.error('USDT balance error:', e);
    }
    
    return { eth: ethFormatted, usdt: usdtBalance };
  } catch (e) {
    console.error('ETH balance error:', e);
    return { eth: '0', usdt: '0' };
  }
}

async function getBTCBalance(): Promise<string> {
  try {
    // Using BlockCypher API (free tier: 200 req/hour)
    const response = await fetch(
      `https://api.blockcypher.com/v1/btc/main/addrs/${WALLETS.BTC.address}/balance`
    );
    
    if (response.ok) {
      const data = await response.json();
      // Balance is in satoshis, convert to BTC
      return (data.balance / 100000000).toFixed(8);
    }
    return '0';
  } catch (e) {
    console.error('BTC balance error:', e);
    return '0';
  }
}

async function getXRPBalance(): Promise<string> {
  try {
    // Using XRP Ledger public API
    const response = await fetch('https://s1.ripple.com:51234/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'account_info',
        params: [{
          account: WALLETS.XRP.address,
          ledger_index: 'validated'
        }]
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.result?.account_data?.Balance) {
        // Balance is in drops (1 XRP = 1,000,000 drops)
        return (parseInt(data.result.account_data.Balance) / 1000000).toFixed(6);
      }
    }
    return '0';
  } catch (e) {
    console.error('XRP balance error:', e);
    return '0';
  }
}

async function getSOLBalance(): Promise<string> {
  try {
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [WALLETS.SOL.address]
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.result?.value !== undefined) {
        // Balance is in lamports (1 SOL = 1,000,000,000 lamports)
        return (data.result.value / 1000000000).toFixed(9);
      }
    }
    return '0';
  } catch (e) {
    console.error('SOL balance error:', e);
    return '0';
  }
}

// Get all balances with caching
async function getAllBalances(forceRefresh = false): Promise<any> {
  // Check cache first (5 minute TTL)
  if (!forceRefresh) {
    try {
      const cached = await redis.get(KEYS.CACHED_BALANCES);
      if (cached) {
        const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
        const cacheAge = Date.now() - (parsed.timestamp || 0);
        if (cacheAge < 5 * 60 * 1000) { // 5 minutes
          return parsed;
        }
      }
    } catch (e) {
      console.error('Cache read error:', e);
    }
  }

  // Fetch all balances in parallel
  const [ethData, btcBalance, xrpBalance, solBalance] = await Promise.all([
    getETHBalance(),
    getBTCBalance(),
    getXRPBalance(),
    getSOLBalance(),
  ]);

  const balances = {
    ETH: {
      address: WALLETS.ETH.address,
      balance: ethData.eth,
      network: 'Ethereum',
      explorer: `https://etherscan.io/address/${WALLETS.ETH.address}`,
    },
    USDT: {
      address: WALLETS.ETH.address,
      balance: ethData.usdt,
      network: 'Ethereum (ERC-20)',
      explorer: `https://etherscan.io/address/${WALLETS.ETH.address}`,
    },
    BTC: {
      address: WALLETS.BTC.address,
      balance: btcBalance,
      network: 'Bitcoin',
      explorer: `https://www.blockchain.com/btc/address/${WALLETS.BTC.address}`,
    },
    XRP: {
      address: WALLETS.XRP.address,
      balance: xrpBalance,
      network: 'XRP Ledger',
      memo: WALLETS.XRP.memo,
      explorer: `https://xrpscan.com/account/${WALLETS.XRP.address}`,
    },
    SOL: {
      address: WALLETS.SOL.address,
      balance: solBalance,
      network: 'Solana',
      explorer: `https://solscan.io/account/${WALLETS.SOL.address}`,
    },
    timestamp: Date.now(),
    lastUpdated: new Date().toISOString(),
  };

  // Cache the results
  try {
    await redis.set(KEYS.CACHED_BALANCES, JSON.stringify(balances), { ex: 300 }); // 5 min TTL
  } catch (e) {
    console.error('Cache write error:', e);
  }

  return balances;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSFER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function sendETH(toAddress: string, amount: string): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    if (!WALLETS.ETH.privateKey) {
      return { success: false, error: 'ETH private key not configured' };
    }

    const { ethers } = await import('ethers');
    const rpcUrl = process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(WALLETS.ETH.privateKey, provider);

    const tx = await wallet.sendTransaction({
      to: toAddress,
      value: ethers.parseEther(amount),
    });

    const receipt = await tx.wait();
    return { success: true, txHash: receipt?.hash };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function sendUSDT(toAddress: string, amount: string): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    if (!WALLETS.ETH.privateKey) {
      return { success: false, error: 'ETH private key not configured' };
    }

    const { ethers } = await import('ethers');
    const rpcUrl = process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(WALLETS.ETH.privateKey, provider);

    const ERC20_ABI = ['function transfer(address to, uint256 amount) returns (bool)'];
    const usdtContract = new ethers.Contract(USDT_CONTRACT, ERC20_ABI, wallet);

    const amountUnits = ethers.parseUnits(amount, 6); // USDT has 6 decimals
    const tx = await usdtContract.transfer(toAddress, amountUnits);
    const receipt = await tx.wait();

    return { success: true, txHash: receipt?.hash };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function sendBTC(toAddress: string, amount: string): Promise<{ success: boolean; txHash?: string; error?: string }> {
  // BTC transfers require more complex handling with UTXOs
  // For production, use a service like BlockCypher, BitGo, or run your own node
  
  if (!WALLETS.BTC.privateKey) {
    return { success: false, error: 'BTC private key not configured' };
  }

  try {
    // Using BlockCypher API for transaction creation
    const apiToken = process.env.BLOCKCYPHER_TOKEN || '';
    
    // Step 1: Create new transaction skeleton
    const newTxRes = await fetch(`https://api.blockcypher.com/v1/btc/main/txs/new?token=${apiToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputs: [{ addresses: [WALLETS.BTC.address] }],
        outputs: [{ addresses: [toAddress], value: Math.floor(parseFloat(amount) * 100000000) }]
      })
    });

    if (!newTxRes.ok) {
      const error = await newTxRes.json();
      return { success: false, error: error.error || 'Failed to create BTC transaction' };
    }

    // For full implementation, you would need to sign the transaction
    // This requires bitcoinjs-lib or similar library
    return { success: false, error: 'BTC signing not implemented - use BitGo or similar service for production' };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function sendXRP(toAddress: string, amount: string, destinationTag?: number): Promise<{ success: boolean; txHash?: string; error?: string }> {
  if (!WALLETS.XRP.secret) {
    return { success: false, error: 'XRP secret not configured' };
  }

  try {
    // Using xrpl.js would be ideal, but for API route we'll use REST API
    // For production, implement proper signing with xrpl library
    
    return { success: false, error: 'XRP signing requires xrpl.js - implement in separate service' };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function sendSOL(toAddress: string, amount: string): Promise<{ success: boolean; txHash?: string; error?: string }> {
  if (!WALLETS.SOL.privateKey) {
    return { success: false, error: 'SOL private key not configured' };
  }

  try {
    // Using @solana/web3.js would be ideal
    // For production, implement proper signing
    
    return { success: false, error: 'SOL signing requires @solana/web3.js - implement in separate service' };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'balances';
    const refresh = searchParams.get('refresh') === 'true';

    switch (type) {
      case 'balances': {
        const balances = await getAllBalances(refresh);
        
        // Get pending withdraws count
        const pendingCount = await redis.llen(KEYS.PENDING_WITHDRAWS) || 0;
        
        // Get stats
        const stats = await redis.get(KEYS.WALLET_STATS) || {};

        return NextResponse.json({
          success: true,
          balances,
          pendingWithdraws: pendingCount,
          stats,
        });
      }

      case 'pending-withdraws': {
        const pending = await redis.lrange(KEYS.PENDING_WITHDRAWS, 0, -1);
        const parsed = (pending || []).map((item: any) => 
          typeof item === 'string' ? JSON.parse(item) : item
        );
        return NextResponse.json({ success: true, withdraws: parsed });
      }

      case 'history': {
        const withdraws = await redis.lrange(KEYS.WITHDRAW_HISTORY, 0, 49);
        const deposits = await redis.lrange(KEYS.DEPOSIT_HISTORY, 0, 49);
        
        const parseItems = (items: any[]) => (items || []).map((item: any) =>
          typeof item === 'string' ? JSON.parse(item) : item
        );

        return NextResponse.json({
          success: true,
          withdraws: parseItems(withdraws),
          deposits: parseItems(deposits),
        });
      }

      case 'addresses': {
        return NextResponse.json({
          success: true,
          addresses: {
            ETH: { address: WALLETS.ETH.address, network: 'Ethereum' },
            USDT: { address: WALLETS.ETH.address, network: 'Ethereum (ERC-20)' },
            BTC: { address: WALLETS.BTC.address, network: 'Bitcoin' },
            XRP: { address: WALLETS.XRP.address, network: 'XRP Ledger', memo: WALLETS.XRP.memo },
            SOL: { address: WALLETS.SOL.address, network: 'Solana' },
          }
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Hot wallet GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'send': {
        const { token, toAddress, amount, memo } = body;

        if (!toAddress || !amount || !token) {
          return NextResponse.json({ error: 'Token, address and amount required' }, { status: 400 });
        }

        let result: { success: boolean; txHash?: string; error?: string };

        switch (token.toUpperCase()) {
          case 'ETH':
            result = await sendETH(toAddress, amount);
            break;
          case 'USDT':
            result = await sendUSDT(toAddress, amount);
            break;
          case 'BTC':
            result = await sendBTC(toAddress, amount);
            break;
          case 'XRP':
            result = await sendXRP(toAddress, amount, memo);
            break;
          case 'SOL':
            result = await sendSOL(toAddress, amount);
            break;
          default:
            return NextResponse.json({ error: 'Unsupported token' }, { status: 400 });
        }

        if (result.success) {
          // Log to history
          const withdrawRecord = {
            id: `wd_${Date.now()}`,
            txHash: result.txHash,
            token,
            from: WALLETS[token as keyof typeof WALLETS]?.address || WALLETS.ETH.address,
            to: toAddress,
            amount,
            status: 'completed',
            timestamp: new Date().toISOString(),
          };
          await redis.lpush(KEYS.WITHDRAW_HISTORY, JSON.stringify(withdrawRecord));
          
          // Clear balance cache
          await redis.del(KEYS.CACHED_BALANCES);
        }

        return NextResponse.json(result);
      }

      case 'add-pending-withdraw': {
        const { userId, address, amount, token, memo } = body;

        const withdrawRequest = {
          id: `req_${Date.now()}`,
          userId,
          address,
          amount,
          token,
          memo,
          status: 'pending',
          createdAt: new Date().toISOString(),
        };

        await redis.lpush(KEYS.PENDING_WITHDRAWS, JSON.stringify(withdrawRequest));

        return NextResponse.json({ success: true, request: withdrawRequest });
      }

      case 'approve-withdraw': {
        const { withdrawId } = body;
        
        const pending = await redis.lrange(KEYS.PENDING_WITHDRAWS, 0, -1);
        
        for (const item of pending) {
          const withdraw = typeof item === 'string' ? JSON.parse(item) : item;
          
          if (withdraw.id === withdrawId) {
            // Process the withdrawal
            let result: { success: boolean; txHash?: string; error?: string };
            
            switch (withdraw.token?.toUpperCase()) {
              case 'ETH':
                result = await sendETH(withdraw.address, withdraw.amount);
                break;
              case 'USDT':
                result = await sendUSDT(withdraw.address, withdraw.amount);
                break;
              case 'BTC':
                result = await sendBTC(withdraw.address, withdraw.amount);
                break;
              case 'XRP':
                result = await sendXRP(withdraw.address, withdraw.amount, withdraw.memo);
                break;
              case 'SOL':
                result = await sendSOL(withdraw.address, withdraw.amount);
                break;
              default:
                result = { success: false, error: 'Unsupported token' };
            }

            if (result.success) {
              // Remove from pending
              await redis.lrem(KEYS.PENDING_WITHDRAWS, 1, JSON.stringify(withdraw));
              
              // Add to history
              const historyRecord = { ...withdraw, txHash: result.txHash, status: 'completed', processedAt: new Date().toISOString() };
              await redis.lpush(KEYS.WITHDRAW_HISTORY, JSON.stringify(historyRecord));
              
              // Clear cache
              await redis.del(KEYS.CACHED_BALANCES);
            }

            return NextResponse.json(result);
          }
        }

        return NextResponse.json({ error: 'Withdraw not found' }, { status: 404 });
      }

      case 'cancel-withdraw': {
        const { withdrawId } = body;

        const pending = await redis.lrange(KEYS.PENDING_WITHDRAWS, 0, -1);
        
        for (const item of pending) {
          const withdraw = typeof item === 'string' ? JSON.parse(item) : item;
          
          if (withdraw.id === withdrawId) {
            await redis.lrem(KEYS.PENDING_WITHDRAWS, 1, JSON.stringify(withdraw));
            return NextResponse.json({ success: true, message: 'Withdraw cancelled' });
          }
        }

        return NextResponse.json({ error: 'Withdraw not found' }, { status: 404 });
      }

      case 'refresh-balances': {
        await redis.del(KEYS.CACHED_BALANCES);
        const balances = await getAllBalances(true);
        return NextResponse.json({ success: true, balances });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Hot wallet POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
