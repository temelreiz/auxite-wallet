// app/api/allocations/route.ts
// Kullanıcı Metal Allocation API - Multiple Bar Support
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

const VAULT_NAMES: Record<string, string> = {
  IST: 'Istanbul',
  ZH: 'Zurich',
  DB: 'Dubai',
  LN: 'London',
};

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

// POST - Yeni allocation oluştur (birden fazla külçe desteği)
export async function POST(request: NextRequest) {
  try {
    const { address, metal, grams, preferredVault, txHash } = await request.json();

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

    // Mevcut allocation listesini al
    const existingRaw = await redis.get(`allocation:user:${userUid}:list`);
    let existingAllocs: any[] = [];
    if (existingRaw) {
      existingAllocs = typeof existingRaw === 'string' ? JSON.parse(existingRaw) : existingRaw;
    }

    // Tüm uygun külçeleri bul ve gram'a göre sırala
    const serials = await redis.smembers(`reserve:index:${metal}`) as string[];
    const availableBars: any[] = [];

    for (const serialNumber of serials) {
      const bar = await redis.hgetall(`reserve:bar:${serialNumber}`);
      if (!bar || bar.status === 'fully_allocated') continue;
      
      const barGrams = parseFloat(bar.grams as string) || 0;
      const barAllocated = parseFloat(bar.allocatedGrams as string) || 0;
      const barAvailable = barGrams - barAllocated;
      
      if (barAvailable > 0) {
        availableBars.push({ 
          ...bar, 
          serialNumber, 
          barGrams, 
          barAllocated, 
          barAvailable 
        });
      }
    }

    // Gram'a göre sırala (küçükten büyüğe - best fit)
    availableBars.sort((a, b) => a.barGrams - b.barGrams);

    // Greedy allocation - tam eşleşen külçeleri tercih et
    let remainingGrams = grams;
    const allocations: any[] = [];
    const usedBars: any[] = [];

    // Önce tam eşleşenleri bul
    for (const bar of availableBars) {
      if (bar.barAvailable === remainingGrams) {
        usedBars.push({ bar, allocGrams: bar.barAvailable });
        remainingGrams = 0;
        break;
      }
    }

    // Tam eşleşme yoksa, kombinasyon bul
    if (remainingGrams > 0) {
      // Büyükten küçüğe sırala
      availableBars.sort((a, b) => b.barGrams - a.barGrams);
      
      for (const bar of availableBars) {
        if (remainingGrams <= 0) break;
        if (usedBars.find(u => u.bar.serialNumber === bar.serialNumber)) continue;
        
        const allocGrams = Math.min(bar.barAvailable, remainingGrams);
        if (allocGrams > 0) {
          usedBars.push({ bar, allocGrams });
          remainingGrams -= allocGrams;
        }
      }
    }

    if (remainingGrams > 0) {
      return NextResponse.json({ 
        error: 'Insufficient reserve', 
        requested: grams,
        available: grams - remainingGrams,
        metal 
      }, { status: 400 });
    }

    // Allocation'ları oluştur
    const now = new Date().toISOString();
    
    for (const { bar, allocGrams } of usedBars) {
      const allocation = {
        id: `${userUid}-${bar.serialNumber}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userUid,
        serialNumber: bar.serialNumber,
        metal,
        grams: allocGrams.toString(),
        vault: bar.vault,
        vaultName: VAULT_NAMES[bar.vault] || bar.vault,
        purity: bar.purity,
        barSize: bar.barGrams,
        status: 'active',
        txHash: txHash || null,
        allocatedAt: now,
        certificateNumber: "",
      };

      existingAllocs.push(allocation);
      allocations.push(allocation);

      // Külçeyi güncelle
      const newAllocated = bar.barAllocated + allocGrams;
      await redis.hset(`reserve:bar:${bar.serialNumber}`, { 
        allocatedGrams: newAllocated.toString(),
        status: newAllocated >= bar.barGrams ? 'fully_allocated' : 'available'
      });

      // Tam allocate olduysa available index'ten çıkar
      if (newAllocated >= bar.barGrams) {
        await redis.srem('reserve:index:available', bar.serialNumber);
      }

      console.log(`✅ Allocation: ${allocGrams}g ${metal} to ${userUid} from ${bar.serialNumber}`);

      // Sertifika oluştur
      const certNumber = `AUX-CERT-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const certificate = {
        certificateNumber: certNumber,
        userUid,
        address: address.toLowerCase(),
        allocationId: allocation.id,
        metal,
        metalName: metal === "AUXG" ? "Gold" : metal === "AUXS" ? "Silver" : metal === "AUXPT" ? "Platinum" : "Palladium",
        grams: allocGrams.toString(),
        serialNumber: bar.serialNumber,
        vault: bar.vault,
        vaultName: VAULT_NAMES[bar.vault] || bar.vault,
        purity: bar.purity,
        barSize: bar.barGrams.toString(),
        issuedAt: now,
        status: "active",
        issuer: "Auxite Precious Metals AG",
      };
      await redis.hset(`certificate:${certNumber}`, certificate);
      await redis.sadd(`certificates:user:${userUid}`, certNumber);
      allocation.certificateNumber = certNumber;
      console.log(`✅ Certificate issued: ${certNumber}`);
    }

    // Listeyi kaydet
    await redis.set(`allocation:user:${userUid}:list`, JSON.stringify(existingAllocs));

    return NextResponse.json({
      success: true,
      message: `Allocated ${grams}g ${metal} across ${allocations.length} bar(s)`,
      userUid,
      allocations,
      totalGrams: grams,
      barCount: allocations.length,
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
