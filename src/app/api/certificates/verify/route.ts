// app/api/certificates/verify/route.ts
// Certificate Verification API with On-Chain Verification
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { createHash } from 'crypto';

export const dynamic = 'force-dynamic';

// Sertifika hash'i oluştur
function generateCertificateHash(certificate: any): string {
  const data = JSON.stringify({
    certificateNumber: certificate.certificateNumber,
    userUid: certificate.userUid,
    metal: certificate.metal,
    grams: certificate.grams,
    serialNumber: certificate.serialNumber,
    vault: certificate.vault,
    purity: certificate.purity,
    issuedAt: certificate.issuedAt,
  });
  return '0x' + createHash('sha256').update(data).digest('hex');
}

// UID'yi maskele
function maskUid(uid: string): string {
  if (!uid || uid.length < 6) return uid;
  return uid.substring(0, 4) + '****' + uid.substring(uid.length - 2);
}

const VAULT_NAMES: Record<string, string> = {
  IST: 'Istanbul',
  ZH: 'Zurich',
  DB: 'Dubai',
  LN: 'London',
};

const METAL_NAMES: Record<string, string> = {
  AUXG: 'Gold',
  AUXS: 'Silver',
  AUXPT: 'Platinum',
  AUXPD: 'Palladium',
};

// On-chain verification
async function verifyOnChain(certNumber: string): Promise<{
  anchored: boolean;
  timestamp: number | null;
  certHash: string | null;
  txHash: string | null;
} | null> {
  try {
    const { verifyCertificateOnChain } = await import('@/lib/blockchain');
    const result = await verifyCertificateOnChain(certNumber);
    if (result) {
      return {
        anchored: result.anchored,
        timestamp: result.timestamp,
        certHash: result.certHash,
        txHash: null, // TX hash'i event'ten almak gerekir
      };
    }
  } catch (error) {
    console.error('On-chain verify error:', error);
  }
  return null;
}

// GET - Sertifika doğrula
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const certNumber = searchParams.get('certNumber');
    const hash = searchParams.get('hash');

    if (!certNumber && !hash) {
      return NextResponse.json({ 
        verified: false, 
        error: 'certNumber or hash required' 
      }, { status: 400 });
    }

    let certificate: any = null;

    // Sertifika numarası ile ara
    if (certNumber) {
      certificate = await redis.hgetall(`certificate:${certNumber}`);
    }

    if (!certificate || !certificate.certificateNumber) {
      return NextResponse.json({
        verified: false,
        error: 'Certificate not found',
        certNumber,
      });
    }

    // Hash oluştur
    const certHash = generateCertificateHash(certificate);

    // On-chain verification dene
    let onChainResult = null;
    if (certNumber) {
      onChainResult = await verifyOnChain(certNumber);
    }

    // Blockchain durumu - Redis'ten veya on-chain'den
    const isAnchored = certificate.anchored === 'true' || onChainResult?.anchored === true;
    const anchorTimestamp = onChainResult?.timestamp 
      ? new Date(onChainResult.timestamp * 1000).toISOString()
      : certificate.anchoredAt || null;

    // Yanıt oluştur (hassas bilgileri maskele)
    return NextResponse.json({
      verified: true,
      certificate: {
        certificateNumber: certificate.certificateNumber,
        userUid: maskUid(certificate.userUid),
        metal: certificate.metal,
        metalName: METAL_NAMES[certificate.metal] || certificate.metal,
        grams: certificate.grams,
        serialNumber: certificate.serialNumber,
        vault: certificate.vault,
        vaultName: VAULT_NAMES[certificate.vault] || certificate.vaultName || certificate.vault,
        purity: certificate.purity,
        issuedAt: certificate.issuedAt,
        issuer: certificate.issuer || 'Auxite Precious Metals AG',
        status: certificate.status,
      },
      blockchain: {
        anchored: isAnchored,
        hash: certHash,
        chain: process.env.NEXT_PUBLIC_CHAIN === 'mainnet' ? 'Base' : 'Base Sepolia',
        timestamp: anchorTimestamp,
        txHash: certificate.txHash || null,
        explorerUrl: certificate.txHash 
          ? `https://${process.env.NEXT_PUBLIC_CHAIN === 'mainnet' ? '' : 'sepolia.'}basescan.org/tx/${certificate.txHash}`
          : null,
      },
      verifiedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Certificate verify error:', error);
    return NextResponse.json({ 
      verified: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// POST - Sertifikayı manuel anchor et (admin)
export async function POST(request: NextRequest) {
  try {
    const { certNumber } = await request.json();

    if (!certNumber) {
      return NextResponse.json({ error: 'certNumber required' }, { status: 400 });
    }

    // Sertifikayı bul
    const certificate = await redis.hgetall(`certificate:${certNumber}`) as any;
    if (!certificate || !certificate.certificateNumber) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }

    // Zaten anchor edilmiş mi?
    if (certificate.anchored === 'true' || certificate.txHash) {
      return NextResponse.json({
        success: true,
        message: 'Already anchored',
        txHash: certificate.txHash,
      });
    }

    // Hash oluştur
    const certHash = generateCertificateHash(certificate);

    // Blockchain'e anchor et
    try {
      const { anchorCertificate } = await import('@/lib/blockchain');
      const result = await anchorCertificate(certHash, certNumber);
      
      // Redis'i güncelle
      await redis.hset(`certificate:${certNumber}`, {
        txHash: result.txHash,
        anchoredAt: new Date().toISOString(),
        anchored: 'true',
      });

      return NextResponse.json({
        success: true,
        message: 'Certificate anchored successfully',
        txHash: result.txHash,
        hash: certHash,
      });
    } catch (anchorError: any) {
      return NextResponse.json({
        success: false,
        error: `Anchoring failed: ${anchorError.message}`,
        hash: certHash,
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Certificate anchor error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
