// app/api/certificates/verify/route.ts
// Certificate Verification API
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

    // Hash ile ara (TODO: implement hash lookup)
    if (!certificate && hash) {
      // Hash lookup için index gerekli
      return NextResponse.json({ 
        verified: false, 
        error: 'Hash lookup not yet implemented' 
      });
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
        anchored: !!certificate.txHash,
        hash: certHash,
        chain: process.env.NEXT_PUBLIC_CHAIN === 'mainnet' ? 'Base' : 'Base Sepolia',
        timestamp: certificate.anchoredAt || null,
        txHash: certificate.txHash || null,
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

// POST - Sertifikayı blockchain'e anchor et
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
    if (certificate.txHash) {
      return NextResponse.json({
        success: true,
        message: 'Already anchored',
        txHash: certificate.txHash,
      });
    }

    // Hash oluştur
    const certHash = generateCertificateHash(certificate);

    // TODO: Blockchain'e anchor et
    // Bu kısım contract deploy edildikten sonra aktif edilecek

    return NextResponse.json({
      success: true,
      message: 'Anchoring not yet implemented - contract deployment pending',
      hash: certHash,
    });
  } catch (error: any) {
    console.error('Certificate anchor error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
