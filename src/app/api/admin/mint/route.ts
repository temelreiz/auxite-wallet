import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

const CONTRACTS = {
  AUXG: process.env.NEXT_PUBLIC_AUXG_ADDRESS,
  AUXS: process.env.NEXT_PUBLIC_AUXS_ADDRESS,
  AUXPT: process.env.NEXT_PUBLIC_AUXPT_ADDRESS,
  AUXPD: process.env.NEXT_PUBLIC_AUXPD_ADDRESS,
};

const MINT_ABI = [
  'function mint(address to, uint256 amount) external',
  'function mintWithAllocation(address to, uint256 amount, string calldata custodian) external',
  'function decimals() view returns (uint8)',
];

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    if (token !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { address, to, amount, metal, custodian } = body;
    const recipient = to || address;

    if (!recipient || !amount || !metal) {
      return NextResponse.json({ error: 'Missing required fields: to, amount, metal' }, { status: 400 });
    }

    const contractAddress = CONTRACTS[metal as keyof typeof CONTRACTS];
    if (!contractAddress) {
      return NextResponse.json({ error: `Invalid metal: ${metal}` }, { status: 400 });
    }

    const rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;
    const privateKey = process.env.PRIVATE_KEY;

    if (!rpcUrl || !privateKey) {
      return NextResponse.json({ error: 'RPC_URL or PRIVATE_KEY not configured' }, { status: 500 });
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(contractAddress, MINT_ABI, wallet);

    // Get decimals (should be 18 for gram tokens)
    const decimals = await contract.decimals();
    const amountWei = ethers.parseUnits(amount.toString(), decimals);

    let tx;
    if (custodian) {
      // V7 with vault assignment
      tx = await contract.mintWithAllocation(recipient, amountWei, custodian);
    } else {
      // Simple mint
      tx = await contract.mint(recipient, amountWei);
    }

    // Don't wait for confirmation to avoid timeout
    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      metal,
      recipient,
      amount,
      custodian: custodian || 'N/A',
      message: `Minting ${amount}g ${metal} to ${to}`,
    });

  } catch (error: any) {
    console.error('Mint error:', error);
    return NextResponse.json({ 
      error: error.message || 'Mint failed',
      details: error.reason || error.code
    }, { status: 500 });
  }
}
