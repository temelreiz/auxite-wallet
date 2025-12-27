// app/api/allocations/route.ts
// Kullanıcı Metal Allocation API - Reserve'den düşer
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

// 12 haneli alfanümerik UID oluştur
function generateUID(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let uid = '';
  for (let i = 0; i < 12; i++) {
    uid += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return uid;
}

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
      userUid = await redis.get(`user:address:${address.toLowerCase()}:uid`) as string;
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

// POST - Yeni allocation oluştur (satın alma sonrası)
export async function POST(request: NextRequest) {
  try {
    const { address, metal, grams, vault, txHash } = await request.json();

    if (!address || !metal || !grams) {
      return NextResponse.json({ error: 'address, metal, grams required' }, { status: 400 });
    }

    // Kullanıcı UID'sini bul veya oluştur
    let userUid = await redis.get(`user:address:${address.toLowerCase()}:uid`) as string;
    
    if (!userUid) {
      userUid = generateUID();
      await redis.set(`user:address:${address.toLowerCase()}:uid`, userUid);
      await redis.set(`uid:${userUid}:address`, address.toLowerCase());
      console.log(`✅ New UID created: ${userUid} for ${address}`);
    }

    // Uygun külçe bul (yeterli gram'a sahip, available)
    const serials = await redis.smembers(`reserve:index:${metal}`) as string[];
    let selectedBar: any = null;

    for (const serialNumber of serials) {
      const bar = await redis.hgetall(`reserve:bar:${serialNumber}`);
      if (!bar || bar.status !== 'available') continue;
      if (vault && bar.vault !== vault) continue;
      
      const barGrams = parseFloat(bar.grams as string) || 0;
      const barAllocated = parseFloat(bar.allocatedGrams as string) || 0;
      const barAvailable = barGrams - barAllocated;
      
      if (barAvailable >= grams) {
        selectedBar = { ...bar, serialNumber, barGrams, barAllocated, barAvailable };
        break;
      }
    }

    if (!selectedBar) {
      return NextResponse.json({ 
        error: 'Insufficient reserve', 
        requested: { metal, grams, vault } 
      }, { status: 400 });
    }

    // Allocation oluştur
    const allocationId = `${userUid}-${selectedBar.serialNumber}-${Date.now()}`;
    const allocation = {
      id: allocationId,
      userUid,
      serialNumber: selectedBar.serialNumber,
      metal,
      grams: grams.toString(),
      vault: selectedBar.vault,
      vaultName: selectedBar.vault === 'IST' ? 'Istanbul' : 
                 selectedBar.vault === 'ZH' ? 'Zurich' : 
                 selectedBar.vault === 'DB' ? 'Dubai' : 
                 selectedBar.vault === 'LN' ? 'London' : selectedBar.vault,
      purity: selectedBar.purity,
      status: 'active',
      txHash: txHash || null,
      allocatedAt: new Date().toISOString(),
    };

    // Kullanıcının allocation listesine ekle
    const existingRaw = await redis.get(`allocation:user:${userUid}:list`);
    let existingAllocs: any[] = [];
    if (existingRaw) {
      existingAllocs = typeof existingRaw === 'string' ? JSON.parse(existingRaw) : existingRaw;
    }
    existingAllocs.push(allocation);
    await redis.set(`allocation:user:${userUid}:list`, JSON.stringify(existingAllocs));

    // Külçedeki allocated miktarı güncelle
    const newAllocated = selectedBar.barAllocated + grams;
    await redis.hset(`reserve:bar:${selectedBar.serialNumber}`, { 
      allocatedGrams: newAllocated.toString(),
      status: newAllocated >= selectedBar.barGrams ? 'fully_allocated' : 'available'
    });

    // Tam allocate olduysa available index'ten çıkar
    if (newAllocated >= selectedBar.barGrams) {
      await redis.srem('reserve:index:available', selectedBar.serialNumber);
    }

    console.log(`✅ Allocation: ${grams}g ${metal} to ${userUid} from ${selectedBar.serialNumber}`);

    return NextResponse.json({
      success: true,
      message: 'Allocation created',
      userUid,
      allocation,
      bar: {
        serialNumber: selectedBar.serialNumber,
        vault: selectedBar.vault,
        purity: selectedBar.purity,
        totalGrams: selectedBar.barGrams,
        allocatedGrams: newAllocated,
        remainingGrams: selectedBar.barGrams - newAllocated,
      }
    });
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
    const grams = parseFloat(searchParams.get('grams') || '0');

    if (!address || !allocationId) {
      return NextResponse.json({ error: 'address and id required' }, { status: 400 });
    }

    // Kullanıcı UID'sini bul
    const userUid = await redis.get(`user:address:${address.toLowerCase()}:uid`) as string;
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
    const releaseGrams = grams > 0 ? Math.min(grams, parseFloat(allocation.grams)) : parseFloat(allocation.grams);

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
      // Tamamen release - allocation'ı "released" yap
      allocations[allocIndex] = {
        ...allocation,
        status: 'released',
        releasedAt: new Date().toISOString(),
        releasedGrams: releaseGrams.toString(),
      };
    } else {
      // Kısmi release - gram'ı güncelle
      allocations[allocIndex] = {
        ...allocation,
        grams: remainingGrams.toString(),
      };
      // Yeni bir released kayıt ekle
      allocations.push({
        ...allocation,
        id: `${allocation.id}-released-${Date.now()}`,
        grams: releaseGrams.toString(),
        status: 'released',
        releasedAt: new Date().toISOString(),
      });
    }

    // Listeyi kaydet
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
