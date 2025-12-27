// lib/blockchain.ts
// Blockchain utilities for certificate anchoring
import { createPublicClient, createWalletClient, http, parseAbi } from 'viem';
import { baseSepolia, base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const REGISTRY_ABI = parseAbi([
  'function anchor(bytes32 certHash, string calldata certNumber) external',
  'function verify(bytes32 certHash) external view returns (bool anchored, uint256 timestamp, string memory certNumber)',
  'function verifyByNumber(string calldata certNumber) external view returns (bool anchored, uint256 timestamp, bytes32 certHash)',
  'function totalAnchored() external view returns (uint256)',
  'event CertificateAnchored(bytes32 indexed certHash, string certNumber, uint256 timestamp, address indexed anchor)',
]);

const isMainnet = process.env.NEXT_PUBLIC_CHAIN === 'mainnet';
const chain = isMainnet ? base : baseSepolia;
const registryAddress = process.env.CERTIFICATE_REGISTRY_ADDRESS as `0x${string}`;

// Public client for reading
export const publicClient = createPublicClient({
  chain,
  transport: http(),
});

// Wallet client for writing (server-side only)
export function getWalletClient() {
  const privateKey = process.env.ANCHOR_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('ANCHOR_PRIVATE_KEY not configured');
  }
  
  const account = privateKeyToAccount(privateKey.startsWith('0x') ? privateKey as `0x${string}` : `0x${privateKey}`);
  
  return createWalletClient({
    account,
    chain,
    transport: http(),
  });
}

// Anchor certificate on-chain
export async function anchorCertificate(certHash: string, certNumber: string): Promise<{ txHash: string; timestamp: number }> {
  if (!registryAddress) {
    throw new Error('CERTIFICATE_REGISTRY_ADDRESS not configured');
  }

  const walletClient = getWalletClient();
  const hash32 = certHash.startsWith('0x') ? certHash : `0x${certHash}`;
  
  const txHash = await walletClient.writeContract({
    address: registryAddress,
    abi: REGISTRY_ABI,
    functionName: 'anchor',
    args: [hash32 as `0x${string}`, certNumber],
  });

  // Wait for confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  
  return {
    txHash,
    timestamp: Math.floor(Date.now() / 1000),
  };
}

// Verify certificate on-chain
export async function verifyCertificateOnChain(certNumber: string): Promise<{
  anchored: boolean;
  timestamp: number;
  certHash: string;
} | null> {
  if (!registryAddress) {
    return null;
  }

  try {
    const result = await publicClient.readContract({
      address: registryAddress,
      abi: REGISTRY_ABI,
      functionName: 'verifyByNumber',
      args: [certNumber],
    }) as [boolean, bigint, `0x${string}`];

    return {
      anchored: result[0],
      timestamp: Number(result[1]),
      certHash: result[2],
    };
  } catch (error) {
    console.error('On-chain verify error:', error);
    return null;
  }
}

// Get total anchored count
export async function getTotalAnchored(): Promise<number> {
  if (!registryAddress) {
    return 0;
  }

  try {
    const total = await publicClient.readContract({
      address: registryAddress,
      abi: REGISTRY_ABI,
      functionName: 'totalAnchored',
    }) as bigint;

    return Number(total);
  } catch (error) {
    console.error('Get total anchored error:', error);
    return 0;
  }
}
