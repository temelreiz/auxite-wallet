// app/api/allocations/route.ts
// Kullanıcı Metal Allocation API - Bar Size Based Allocation
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { createAllocation } from '@/lib/allocation-service';

export const dynamic = 'force-dynamic';


// GET - Kullanıcının allocation'larını getir
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const uid = searchParams.get('uid');

    if (!address && !uid) {
      return NextResponse.json({ error: 'address or uid required' }, { status: 400 });
    }

    let userUid = uid;
    if (address && !uid) {
      userUid = await redis.get(`user:address:${address.toLowerCase()}`) as string;
    }

    if (!userUid) {
      return NextResponse.json({ 
        success: true, 
        uid: null,
        allocations: [], 
        summary: { AUXG: 0, AUXS: 0, AUXPT: 0, AUXPD: 0 } 
      });
    }

    const allocDataRaw = await redis.get(`allocation:user:${userUid}:list`);
    let allocations: any[] = [];
    
    if (allocDataRaw) {
      allocations = typeof allocDataRaw === 'string' ? JSON.parse(allocDataRaw) : allocDataRaw;
    }

    // Her allocation için bar bilgisini ekle
    for (const alloc of allocations) {
      if (alloc.serialNumber) {
        const bar = await redis.hgetall(`reserve:bar:${alloc.serialNumber}`);
        if (bar) {
          alloc.bar = {
            purity: bar.purity,
            vault: bar.vault,
            certificateUrl: bar.certificateUrl,
          };
        }
      }
    }

    const summary: Record<string, number> = { AUXG: 0, AUXS: 0, AUXPT: 0, AUXPD: 0 };
    for (const alloc of allocations) {
      if (alloc.status === 'active') {
        const metal = alloc.metal as string;
        const grams = parseFloat(alloc.grams) || 0;
        summary[metal] = (summary[metal] || 0) + grams;
      }
    }

    return NextResponse.json({
      success: true,
      uid: userUid,
      allocations: allocations.filter(a => a.status === 'active'),
      summary,
      totalAllocations: allocations.filter(a => a.status === 'active').length,
    });
  } catch (error: any) {
    console.error('Allocations fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Yeni allocation oluştur (bar boyutlarına göre parçala)
export async function POST(request: NextRequest) {
  try {
    const { address, metal, grams, preferredVault, txHash, email, holderName } = await request.json();

    const result = await createAllocation({ address, metal, grams, txHash, email, holderName, preferredVault });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Allocation create error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Allocation'ı release et (satış sonrası rezerve geri döner)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const allocationId = searchParams.get('id');
    const gramsParam = parseFloat(searchParams.get('grams') || '0');

    if (!address || !allocationId) {
      return NextResponse.json({ error: 'address and id required' }, { status: 400 });
    }

    // Kullanıcı UID'sini bul
    const userUid = await redis.get(`user:address:${address.toLowerCase()}`) as string;
    if (!userUid) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Kullanıcının allocation listesini al
    const allocDataRaw = await redis.get(`allocation:user:${userUid}:list`);
    if (!allocDataRaw) {
      return NextResponse.json({ error: 'No allocations found' }, { status: 404 });
    }

    let allocations: any[] = typeof allocDataRaw === 'string' ? JSON.parse(allocDataRaw) : allocDataRaw;
    
    // İlgili allocation'ı bul
    const allocIndex = allocations.findIndex(a => a.id === allocationId && a.status === 'active');
    if (allocIndex === -1) {
      return NextResponse.json({ error: 'Allocation not found' }, { status: 404 });
    }

    const allocation = allocations[allocIndex];
    const releaseGrams = gramsParam > 0 ? Math.min(gramsParam, parseFloat(allocation.grams)) : parseFloat(allocation.grams);

    // Külçeyi güncelle - allocated miktarı azalt
    const bar = await redis.hgetall(`reserve:bar:${allocation.serialNumber}`);
    if (bar) {
      const currentAllocated = parseFloat(bar.allocatedGrams as string) || 0;
      const newAllocated = Math.max(0, currentAllocated - releaseGrams);
      
      await redis.hset(`reserve:bar:${allocation.serialNumber}`, {
        allocatedGrams: newAllocated.toString(),
        status: 'available'
      });

      // Available index'e geri ekle
      await redis.sadd('reserve:index:available', allocation.serialNumber);
    }

    // Allocation'ı güncelle veya sil
    const remainingGrams = parseFloat(allocation.grams) - releaseGrams;
    if (remainingGrams <= 0) {
      allocations[allocIndex] = {
        ...allocation,
        status: 'released',
        releasedAt: new Date().toISOString(),
        releasedGrams: releaseGrams.toString(),
      };
    } else {
      allocations[allocIndex] = {
        ...allocation,
        grams: remainingGrams.toString(),
      };
      allocations.push({
        ...allocation,
        id: `${allocation.id}-released-${Date.now()}`,
        grams: releaseGrams.toString(),
        status: 'released',
        releasedAt: new Date().toISOString(),
      });
    }

    await redis.set(`allocation:user:${userUid}:list`, JSON.stringify(allocations));

    console.log(`✅ Released: ${releaseGrams}g from ${allocation.serialNumber} back to reserves`);

    return NextResponse.json({
      success: true,
      message: 'Allocation released',
      released: {
        allocationId,
        grams: releaseGrams,
        serialNumber: allocation.serialNumber,
        metal: allocation.metal,
      }
    });
  } catch (error: any) {
    console.error('Allocation release error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Allocation'ı başka kullanıcıya transfer et
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { fromAddress, toAddress, allocationId, grams: transferGrams } = body;

    if (!fromAddress || !toAddress || !allocationId) {
      return NextResponse.json({ error: 'fromAddress, toAddress and allocationId required' }, { status: 400 });
    }

    // Gönderen UID'sini bul
    const fromUid = await redis.get(`user:address:${fromAddress.toLowerCase()}`) as string;
    if (!fromUid) {
      return NextResponse.json({ error: 'Sender not found' }, { status: 404 });
    }

    // Alıcı UID'sini bul - Auxite kullanıcısı olmalı
    let toUid = await redis.get(`user:address:${toAddress.toLowerCase()}`) as string;
    if (!toUid) {
      return NextResponse.json({ 
        error: 'Recipient is not an Auxite user. Metals can only be transferred to registered Auxite users.',
        code: 'RECIPIENT_NOT_REGISTERED'
      }, { status: 400 });
    }

    // Gönderenin allocation listesini al
    const fromAllocDataRaw = await redis.get(`allocation:user:${fromUid}:list`);
    if (!fromAllocDataRaw) {
      return NextResponse.json({ error: 'No allocations found' }, { status: 404 });
    }
    let fromAllocations: any[] = typeof fromAllocDataRaw === 'string' ? JSON.parse(fromAllocDataRaw) : fromAllocDataRaw;

    // İlgili allocation'ı bul
    const allocIndex = fromAllocations.findIndex(a => a.id === allocationId && a.status === 'active');
    if (allocIndex === -1) {
      return NextResponse.json({ error: 'Allocation not found' }, { status: 404 });
    }

    const allocation = fromAllocations[allocIndex];
    const allocationGrams = parseFloat(allocation.grams);
    const gramsToTransfer = transferGrams ? Math.min(parseFloat(transferGrams), allocationGrams) : allocationGrams;

    // Eski sertifikayı VOID yap
    const oldCertNumber = allocation.certificateNumber;
    if (oldCertNumber) {
      await redis.hset(`certificate:${oldCertNumber}`, {
        status: 'VOID',
        voidedAt: new Date().toISOString(),
        voidReason: 'TRANSFERRED',
        transferredTo: toAddress.toLowerCase(),
      });
    }

    // Yeni sertifika numarası oluştur (aynı seri no ile)
    const year = new Date().getFullYear();
    const newCertUID = generateUID().substring(0, 6);
    const newCertNumber = `AUX-CERT-${year}-${newCertUID}`;

    // Alıcının allocation listesini al veya oluştur
    const toAllocDataRaw = await redis.get(`allocation:user:${toUid}:list`);
    let toAllocations: any[] = toAllocDataRaw 
      ? (typeof toAllocDataRaw === 'string' ? JSON.parse(toAllocDataRaw) : toAllocDataRaw)
      : [];

    // Yeni allocation kaydı oluştur (alıcı için)
    const newAllocationId = `${allocation.metal}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newAllocation = {
      id: newAllocationId,
      metal: allocation.metal,
      grams: gramsToTransfer.toString(),
      serialNumber: allocation.serialNumber, // Aynı bar
      barSize: allocation.barSize,
      certificateNumber: newCertNumber,
      allocatedAt: new Date().toISOString(),
      status: 'active',
      transferredFrom: fromAddress.toLowerCase(),
      originalCertificate: oldCertNumber,
    };

    toAllocations.push(newAllocation);
    await redis.set(`allocation:user:${toUid}:list`, JSON.stringify(toAllocations));

    // Gönderenin allocation'ını güncelle
    const remainingGrams = allocationGrams - gramsToTransfer;
    if (remainingGrams <= 0) {
      // Tamamı transfer edildi
      fromAllocations[allocIndex] = {
        ...allocation,
        status: 'transferred',
        transferredAt: new Date().toISOString(),
        transferredTo: toAddress.toLowerCase(),
        newCertificateNumber: newCertNumber,
      };
    } else {
      // Kısmi transfer
      fromAllocations[allocIndex] = {
        ...allocation,
        grams: remainingGrams.toString(),
      };
      fromAllocations.push({
        ...allocation,
        id: `${allocation.id}-transferred-${Date.now()}`,
        grams: gramsToTransfer.toString(),
        status: 'transferred',
        transferredAt: new Date().toISOString(),
        transferredTo: toAddress.toLowerCase(),
        newCertificateNumber: newCertNumber,
      });
    }
    await redis.set(`allocation:user:${fromUid}:list`, JSON.stringify(fromAllocations));

    // Yeni sertifikayı kaydet
    const metalName = METAL_NAMES[allocation.metal] || allocation.metal;
    const certData = {
      certificateNumber: newCertNumber,
      owner: toAddress.toLowerCase(),
      metal: allocation.metal,
      metalName,
      grams: gramsToTransfer,
      serialNumber: allocation.serialNumber,
      barSize: allocation.barSize,
      issuedAt: new Date().toISOString(),
      status: 'active',
      transferredFrom: fromAddress.toLowerCase(),
      originalCertificate: oldCertNumber,
    };
    
    // Sertifikayı hash'le
    const certHash = createHash('sha256').update(JSON.stringify(certData)).digest('hex');
    await redis.hset(`certificate:${newCertNumber}`, {
      ...certData,
      hash: certHash,
    });

    // Arka planda blockchain'e anchor et
    anchorCertificateBackground(newCertNumber, certHash);

    console.log(`✅ Allocation transferred: ${gramsToTransfer}g ${allocation.metal} from ${fromAddress} to ${toAddress}`);
    console.log(`   Old cert: ${oldCertNumber} (VOID) → New cert: ${newCertNumber}`);

    return NextResponse.json({
      success: true,
      message: 'Allocation transferred successfully',
      transfer: {
        from: fromAddress.toLowerCase(),
        to: toAddress.toLowerCase(),
        metal: allocation.metal,
        grams: gramsToTransfer,
        serialNumber: allocation.serialNumber,
        oldCertificate: oldCertNumber,
        newCertificate: newCertNumber,
        allocationId: newAllocationId,
      }
    });
  } catch (error: any) {
    console.error('Allocation transfer error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
