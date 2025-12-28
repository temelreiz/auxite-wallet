// app/api/allocations/route.ts
// Kullanıcı Metal Allocation API - Bar Size Based Allocation
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { createHash } from 'crypto';
import { sendCertificateEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// Arka planda certificate anchor (non-blocking)
async function anchorCertificateBackground(certNumber: string, certHash: string) {
  try {
    const { anchorCertificate } = await import("@/lib/blockchain");
    console.log(`⛓️ Anchoring certificate ${certNumber}...`);
    const result = await anchorCertificate(certHash, certNumber);
    await redis.hset(`certificate:${certNumber}`, {
      txHash: result.txHash,
      anchoredAt: new Date().toISOString(),
      anchored: "true",
    });
    console.log(`✅ Certificate ${certNumber} anchored: ${result.txHash}`);
  } catch (error: any) {
    console.error(`❌ Anchor failed for ${certNumber}:`, error.message);
  }
}


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


const METAL_NAMES: Record<string, string> = {
  AUXG: "Gold",
  AUXS: "Silver",
  AUXPT: "Platinum",
  AUXPD: "Palladium",
};
// Bar boyutları (büyükten küçüğe - greedy allocation için)
const BAR_SIZES: Record<string, number[]> = {
  AUXG: [1000, 500, 100, 50, 20, 10, 5, 1],
  AUXS: [3110, 1000, 500, 311, 250, 100, 50],
  AUXPT: [1000, 500, 100, 50, 25, 10, 5, 1],
  AUXPD: [1000, 500, 100, 50, 25, 10, 5, 1],
};

// Gram'ı bar boyutlarına böl (coin change - greedy)
function splitIntoBarSizes(grams: number, metal: string): number[] {
  const sizes = BAR_SIZES[metal] || BAR_SIZES.AUXG;
  const result: number[] = [];
  let remaining = grams;

  for (const size of sizes) {
    while (remaining >= size) {
      result.push(size);
      remaining -= size;
    }
  }

  // Kalan varsa en küçük bar'a ekle (fractional - normalde olmamalı)
  if (remaining > 0) {
    result.push(remaining);
  }

  return result;
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

// POST - Yeni allocation oluştur (bar boyutlarına göre parçala)
export async function POST(request: NextRequest) {
  try {
    const { address, metal, grams, preferredVault, txHash, email, holderName } = await request.json();

    if (!address || !metal || !grams) {
      return NextResponse.json({ error: 'address, metal, grams required' }, { status: 400 });
    }

    // Partial Allocation: Sadece tam gramlar allocate edilir
    const wholeGrams = Math.floor(grams);
    const fractionalGrams = parseFloat((grams - wholeGrams).toFixed(4));

    // Minimum 1 gram gerekli
    if (wholeGrams < 1) {
      return NextResponse.json({ 
        error: "Minimum 1g required for allocation",
        allocatedGrams: wholeGrams,
      nonAllocatedGrams: fractionalGrams,
      totalGrams: grams,
        wholeGrams: 0,
        fractionalGrams,
        needMore: parseFloat((1 - fractionalGrams).toFixed(4)),
        message: "Insufficient for allocation"
      }, { status: 400 });
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

    // Gram'ı bar boyutlarına böl
    const barSizeBreakdown = splitIntoBarSizes(wholeGrams, metal);
    console.log(`📦 Allocation breakdown for ${grams}g ${metal}:`, barSizeBreakdown);

    // Her bar boyutu için uygun külçe bul
    const allocations: any[] = [];
    const now = new Date().toISOString();
    const certNumber = `AUX-CERT-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    for (const barSize of barSizeBreakdown) {
      // Bu boyutta available bar bul
      const serials = await redis.smembers(`reserve:index:${metal}`) as string[];
      let selectedBar: any = null;

      for (const serialNumber of serials) {
        const bar = await redis.hgetall(`reserve:bar:${serialNumber}`);
        if (!bar || bar.status === 'fully_allocated') continue;
        
        const barGrams = parseFloat(bar.grams as string) || 0;
        const barAllocated = parseFloat(bar.allocatedGrams as string) || 0;
        const barAvailable = barGrams - barAllocated;
        
        // Tam eşleşen bar boyutu tercih et
        if (barGrams === barSize && barAvailable >= barSize) {
          selectedBar = { ...bar, serialNumber, barGrams, barAllocated, barAvailable };
          break;
        }
      }

      // Tam eşleşme yoksa, yeterli available'ı olan herhangi bir bar kullan
      if (!selectedBar) {
        for (const serialNumber of serials) {
          const bar = await redis.hgetall(`reserve:bar:${serialNumber}`);
          if (!bar || bar.status === 'fully_allocated') continue;
          
          const barGrams = parseFloat(bar.grams as string) || 0;
          const barAllocated = parseFloat(bar.allocatedGrams as string) || 0;
          const barAvailable = barGrams - barAllocated;
          
          if (barAvailable >= barSize) {
            selectedBar = { ...bar, serialNumber, barGrams, barAllocated, barAvailable };
            break;
          }
        }
      }

      if (!selectedBar) {
        return NextResponse.json({ 
          error: `Insufficient reserve for ${barSize}g ${metal} bar`,
          requested: grams,
          breakdown: barSizeBreakdown,
          failedAt: barSize,
        }, { status: 400 });
      }

      // Allocation oluştur
      const allocation = {
        id: `${userUid}-${metal}-${String(existingAllocs.filter(a => a.metal === metal).length + allocations.length + 1).padStart(3, "0")}`,
        userUid,
        serialNumber: selectedBar.serialNumber,
        metal,
        grams: barSize.toString(),
        vault: selectedBar.vault,
        vaultName: VAULT_NAMES[selectedBar.vault] || selectedBar.vault,
        purity: selectedBar.purity,
        barSize: selectedBar.barGrams,
        status: 'active',
        txHash: txHash || null,
        allocatedAt: now,
        certificateNumber: certNumber,
      };

      existingAllocs.push(allocation);
      allocations.push(allocation);

      // Külçeyi güncelle
      const newAllocated = selectedBar.barAllocated + barSize;
      await redis.hset(`reserve:bar:${selectedBar.serialNumber}`, { 
        allocatedGrams: newAllocated.toString(),
        status: newAllocated >= selectedBar.barGrams ? 'fully_allocated' : 'available'
      });

      // Tam allocate olduysa available index'ten çıkar
      if (newAllocated >= selectedBar.barGrams) {
        await redis.srem('reserve:index:available', selectedBar.serialNumber);
      }

      console.log(`✅ Allocation: ${barSize}g ${metal} to ${userUid} from ${selectedBar.serialNumber}`);
    }

    // Sertifika oluştur (tüm allocation'lar için tek sertifika)
    const certificate = {
      certificateNumber: certNumber,
      userUid,
      address: address.toLowerCase(),
      metal,
      metalName: metal === "AUXG" ? "Gold" : metal === "AUXS" ? "Silver" : metal === "AUXPT" ? "Platinum" : "Palladium",
      grams: wholeGrams.toString(),
      // İlk allocation'ın bilgilerini kullan
      serialNumber: allocations.map(a => a.serialNumber).join(', '),
      vault: allocations[0]?.vault || '',
      vaultName: allocations[0]?.vaultName || '',
      purity: allocations[0]?.purity || '999.9',
      barSizes: barSizeBreakdown.join(', '),
      barCount: allocations.length.toString(),
      issuedAt: now,
      status: "active",
      issuer: "Auxite Precious Metals AG",
      allocationEventId: `ALLOC-EVT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      ledgerReference: `AUX-LEDGER-${new Date().getFullYear()}-${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`,
    };
    await redis.hset(`certificate:${certNumber}`, certificate);
    await redis.sadd(`certificates:user:${userUid}`, certNumber);

    // Sertifika hash oluştur ve blockchain'e anchor et
    const certHashData = JSON.stringify({
      certificateNumber: certNumber,
      userUid,
      metal,
      grams: wholeGrams.toString(),
      serialNumber: certificate.serialNumber,
      vault: certificate.vault,
      purity: certificate.purity,
      issuedAt: certificate.issuedAt,
    });
    const certHash = "0x" + createHash("sha256").update(certHashData).digest("hex");
    
    // Arka planda anchor et (non-blocking)
    await anchorCertificateBackground(certNumber, certHash);

    // Email gönder - yoksa Redis'ten user email'ini çek
    let userEmail = email;
    if (!userEmail) {
      try {
        // user:address:{address} -> userId -> user:{userId} hash'inden email al
        const userId = await redis.get(`user:address:${address.toLowerCase()}`);
        if (userId) {
          const userData = await redis.hgetall(`user:${userId}`);
          userEmail = userData?.email as string || "";
          console.log(`📧 Found user email from Redis: ${userEmail}`);
        }
      } catch (e) {
        console.warn("Could not fetch user email from Redis:", e);
      }
    }
    
    if (userEmail) {
      try {
        await sendCertificateEmail(userEmail, "", {
          certificateNumber: certNumber,
          metal,
          metalName: METAL_NAMES[metal] || metal,
          grams: wholeGrams.toString(),
          holderName: holderName || undefined,
        });
        console.log(`📧 Certificate email sent to ${email}`);
      } catch (emailErr: any) {
        console.error(`❌ Certificate email failed:`, emailErr.message);
      }
    }
    console.log(`✅ Certificate issued: ${certNumber} for ${allocations.length} bars`);

    // Listeyi kaydet
    await redis.set(`allocation:user:${userUid}:list`, JSON.stringify(existingAllocs));

    return NextResponse.json({
      success: true,
      message: `Allocated ${wholeGrams}g ${metal} across ${allocations.length} bar(s)`,
      userUid,
      allocations,
      breakdown: barSizeBreakdown,
      allocatedGrams: wholeGrams,
      nonAllocatedGrams: fractionalGrams,
      totalGrams: grams,
      barCount: allocations.length,
      certificateNumber: certNumber,
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
    const gramsParam = parseFloat(searchParams.get('grams') || '0');

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
