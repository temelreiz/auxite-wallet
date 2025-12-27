// app/api/certificates/route.ts
// Digital Certificate Generation & Management
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

// Sertifika numarası oluştur
function generateCertificateNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `AUX-CERT-${year}-${random}`;
}

// GET - Kullanıcının sertifikalarını getir
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const certId = searchParams.get('id');

    if (certId) {
      // Tek sertifika getir
      const cert = await redis.hgetall(`certificate:${certId}`);
      if (!cert) {
        return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, certificate: cert });
    }

    if (!address) {
      return NextResponse.json({ error: 'address required' }, { status: 400 });
    }

    // Kullanıcı UID'sini bul
    const userUid = await redis.get(`user:address:${address.toLowerCase()}:uid`) as string;
    if (!userUid) {
      return NextResponse.json({ success: true, certificates: [] });
    }

    // Kullanıcının sertifika listesini al
    const certIds = await redis.smembers(`certificates:user:${userUid}`) as string[];
    const certificates: any[] = [];

    for (const id of certIds) {
      const cert = await redis.hgetall(`certificate:${id}`);
      if (cert) {
        certificates.push({ id, ...cert });
      }
    }

    // Tarihe göre sırala (yeniden eskiye)
    certificates.sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());

    return NextResponse.json({ 
      success: true, 
      certificates,
      total: certificates.length 
    });
  } catch (error: any) {
    console.error('Certificates fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Yeni sertifika oluştur
export async function POST(request: NextRequest) {
  try {
    const { 
      userUid, 
      address,
      allocationId,
      metal, 
      grams, 
      serialNumber, 
      vault, 
      vaultName,
      purity,
      barSize,
      txHash 
    } = await request.json();

    if (!userUid || !metal || !grams || !serialNumber) {
      return NextResponse.json({ error: 'userUid, metal, grams, serialNumber required' }, { status: 400 });
    }

    const certificateNumber = generateCertificateNumber();
    const issuedAt = new Date().toISOString();

    const certificate = {
      certificateNumber,
      userUid,
      address: address?.toLowerCase() || '',
      allocationId: allocationId || '',
      metal,
      metalName: metal === 'AUXG' ? 'Gold' : metal === 'AUXS' ? 'Silver' : metal === 'AUXPT' ? 'Platinum' : 'Palladium',
      grams: grams.toString(),
      serialNumber,
      vault: vault || '',
      vaultName: vaultName || vault || '',
      purity: purity || '999.9',
      barSize: barSize?.toString() || grams.toString(),
      txHash: txHash || '',
      issuedAt,
      status: 'active',
      issuer: 'Auxite Precious Metals AG',
      issuerAddress: 'Zurich, Switzerland',
    };

    // Sertifikayı kaydet
    await redis.hset(`certificate:${certificateNumber}`, certificate);
    
    // Kullanıcının sertifika listesine ekle
    await redis.sadd(`certificates:user:${userUid}`, certificateNumber);

    // Allocation'a sertifika numarasını ekle
    if (allocationId) {
      const allocDataRaw = await redis.get(`allocation:user:${userUid}:list`);
      if (allocDataRaw) {
        let allocations = typeof allocDataRaw === 'string' ? JSON.parse(allocDataRaw) : allocDataRaw;
        const allocIndex = allocations.findIndex((a: any) => a.id === allocationId);
        if (allocIndex !== -1) {
          allocations[allocIndex].certificateNumber = certificateNumber;
          await redis.set(`allocation:user:${userUid}:list`, JSON.stringify(allocations));
        }
      }
    }

    console.log(`✅ Certificate issued: ${certificateNumber} for ${userUid}`);

    return NextResponse.json({
      success: true,
      message: 'Certificate issued',
      certificate,
    });
  } catch (error: any) {
    console.error('Certificate create error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
