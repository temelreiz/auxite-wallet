// /api/admin/mint/route.ts
// 🔒 SECURITY: On-chain metal token minting — Full audit trail + Telegram alerts
import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { Redis } from '@upstash/redis';
import { kv } from '@vercel/kv';
import { sendTelegramMessage } from '@/lib/telegram';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const CONTRACTS = {
  AUXG: "0xBF74Fc9f0dD50A79f9FaC2e9Aa05a268E3dcE6b6",
  AUXS: "0x705D9B193e5E349847C2Efb18E68fe989eC2C0e9",
  AUXPT: "0x1819447f624D8e22C1A4F3B14e96693625B6d74F",
  AUXPD: "0xb23545dE86bE9F65093D3a51a6ce52Ace0d8935E",
};

const MINT_ABI = [
  'function adminMint(address buyer, uint256 grams, string calldata custodian) external',
];

// ═══════════════════════════════════════════════════════════════════════════
// 🔒 SECURITY HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

async function isAuthorized(request: NextRequest): Promise<{ authorized: boolean; method: string }> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { authorized: false, method: "none" };
  }

  const token = authHeader.replace('Bearer ', '');

  // Check session token from Vercel KV (admin panel login)
  try {
    const session = await kv.get(`admin:session:${token}`);
    if (session) return { authorized: true, method: "session" };
  } catch (e) {
    console.error("Session check error:", e);
  }

  // 🔒 Log failed auth attempt
  const ip = getClientIP(request);
  console.warn(`🚨 FAILED AUTH ATTEMPT on /api/admin/mint from IP: ${ip}`);
  await redis.lpush("admin:audit:failed_auth", JSON.stringify({
    endpoint: "/api/admin/mint",
    ip,
    userAgent: request.headers.get("user-agent") || "unknown",
    timestamp: Date.now(),
  })).catch(() => {});
  await redis.ltrim("admin:audit:failed_auth", 0, 499).catch(() => {});

  return { authorized: false, method: "invalid" };
}

export async function POST(request: NextRequest) {
  try {
    // 🔒 Auth check — session only, no legacy ADMIN_SECRET
    const auth = await isAuthorized(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ip = getClientIP(request);
    const body = await request.json();
    const { address, to, amount, metal, custodian } = body;
    const recipient = to || address;

    if (!recipient || !amount || !metal) {
      return NextResponse.json({ error: 'Missing required fields: address, amount, metal' }, { status: 400 });
    }

    const contractAddress = CONTRACTS[metal as keyof typeof CONTRACTS];
    if (!contractAddress) {
      return NextResponse.json({ error: `Invalid metal: ${metal}` }, { status: 400 });
    }

    // 🔒 AUDIT: Log mint attempt BEFORE execution
    const auditEntry = {
      action: "on_chain_mint",
      metal,
      amount,
      recipient,
      custodian: custodian || 'Zurich Vault',
      ip,
      userAgent: request.headers.get("user-agent") || "unknown",
      authMethod: auth.method,
      timestamp: Date.now(),
      date: new Date().toISOString(),
      status: "attempting",
    };
    await redis.lpush("admin:audit:mints", JSON.stringify(auditEntry));
    await redis.ltrim("admin:audit:mints", 0, 499);
    await redis.lpush("admin:audit:actions", JSON.stringify(auditEntry));
    await redis.ltrim("admin:audit:actions", 0, 999);

    // Base Mainnet for metal token minting
    const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL || process.env.BASE_RPC_URL || 'https://mainnet.base.org';
    const privateKey = process.env.PRIVATE_KEY;

    if (!rpcUrl || !privateKey) {
      return NextResponse.json({ error: 'RPC_URL or PRIVATE_KEY not configured' }, { status: 500 });
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(contractAddress, MINT_ABI, wallet);

    // adminMint expects grams as integer
    const grams = parseInt(amount);
    const custodianValue = custodian || 'Zurich Vault';

    const tx = await contract.adminMint(recipient, grams, custodianValue);

    // 🔒 AUDIT: Log successful mint
    const successEntry = {
      ...auditEntry,
      status: "success",
      txHash: tx.hash,
      completedAt: Date.now(),
    };
    await redis.lpush("admin:audit:mints", JSON.stringify(successEntry));
    await redis.ltrim("admin:audit:mints", 0, 499);

    // 🔒 SECURITY: Telegram alert for on-chain mint
    sendTelegramMessage(
      `🚨🚨 <b>ON-CHAIN MINT</b> 🚨🚨\n\n` +
      `<b>Metal:</b> ${metal}\n` +
      `<b>Miktar:</b> ${grams}g\n` +
      `<b>Hedef:</b> <code>${recipient}</code>\n` +
      `<b>Custodian:</b> ${custodianValue}\n` +
      `<b>TxHash:</b> <code>${tx.hash}</code>\n` +
      `<b>Contract:</b> <code>${contractAddress}</code>\n` +
      `<b>IP:</b> <code>${ip}</code>\n` +
      `<b>Auth:</b> ${auth.method}\n` +
      `<b>Zaman:</b> ${new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}\n\n` +
      `⚠️ Bu on-chain mint işlemini siz yapmadıysanız HEMEN kontrol edin!`
    ).catch((err) => console.error("Mint Telegram alert error:", err));

    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      metal,
      recipient,
      amount: grams,
      custodian: custodianValue,
      message: `Minting ${grams}g ${metal} to ${recipient}`,
    });

  } catch (error: any) {
    console.error('Mint error:', error);

    // 🔒 Log failed mint
    const ip = getClientIP(request);
    await redis.lpush("admin:audit:mints", JSON.stringify({
      action: "on_chain_mint",
      status: "failed",
      error: error.message,
      ip,
      timestamp: Date.now(),
    })).catch(() => {});

    return NextResponse.json({
      error: error.message || 'Mint failed',
      details: error.reason || error.code
    }, { status: 500 });
  }
}
