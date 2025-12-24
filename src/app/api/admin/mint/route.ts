import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

const CONTRACTS = {
  AUXG: "0xBF74Fc9f0dD50A79f9FaC2e9Aa05a268E3dcE6b6",
  AUXS: "0x705D9B193e5E349847C2Efb18E68fe989eC2C0e9",
  AUXPT: "0x1819447f624D8e22C1A4F3B14e96693625B6d74F",
  AUXPD: "0xb23545dE86bE9F65093D3a51a6ce52Ace0d8935E",
};

const MINT_ABI = [
  'function adminMint(address buyer, uint256 grams, string calldata custodian) external',
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
      return NextResponse.json({ error: 'Missing required fields: address, amount, metal' }, { status: 400 });
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

    // adminMint expects grams as integer
    const grams = parseInt(amount);
    const custodianValue = custodian || 'Zurich Vault';

    const tx = await contract.adminMint(recipient, grams, custodianValue);

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
    return NextResponse.json({ 
      error: error.message || 'Mint failed',
      details: error.reason || error.code
    }, { status: 500 });
  }
}
