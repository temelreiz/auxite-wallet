// app/api/allocations/route.ts
// Kullanıcı Metal Allocation API - Updated with UID & Serial Numbers
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

    // UID'yi bul
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

    // Allocation'ları getir
    const allocData = await redis.get(`allocation:user:${userUid}:list`) as any[];
    const allocations = allocData || [];

    // Özet
    const summary: Record<string, number> = { AUXG: 0, AUXS: 0, AUXPT: 0, AUXPD: 0 };
    for (const alloc of allocations) {
      const metal = alloc.metal as string;
      const grams = parseFloat(alloc.grams) || 0;
      summary[metal] = (summary[metal] || 0) + grams;
    }

    return NextResponse.json({
      success: true,
      uid: userUid,
      allocations,
      summary,
      totalAllocations: allocations.length,
    });
  } catch (error: any) {
    console.error('Allocations fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Yeni allocation oluştur (metal satın alma sonrası)
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

    // Uygun külçe bul
    const metals = [metal];
    let availableBar: any = null;

    for (const m of metals) {
      const serials = await redis.smembers(`reserve:index:${m}`) as string[];
      for (const serialNumber of serials) {
        const bar = await redis.hgetall(`reserve:bar:${serialNumber}`);
        if (!bar || bar.status !== 'available') continue;
        if (vault && bar.vault !== vault) continue;
        
        const barGrams = parseFloat(bar.grams as string) || 0;
        if (barGrams >= grams) {
          availableBar = { ...bar, serialNumber };
          break;
        }
      }
      if (availableBar) break;
    }

    if (!availableBar) {
      return NextResponse.json({ 
        error: 'No available bars found', 
        requested: { metal, grams, vault } 
      }, { status: 404 });
    }

    // Allocation oluştur
    const allocationId = `${userUid}-${Date.now()}`;
    const allocation = {
      id: allocationId,
      userUid,
      serialNumber: availableBar.serialNumber,
      metal,
      grams: grams.toString(),
      vault: availableBar.vault,
      status: 'active',
      txHash: txHash || null,
      allocatedAt: new Date().toISOString(),
    };

    // Mevcut allocation listesini al
    const existingAllocs = await redis.get(`allocation:user:${userUid}:list`) as any[] || [];
    existingAllocs.push(allocation);
    await redis.set(`allocation:user:${userUid}:list`, JSON.stringify(existingAllocs));

    // Külçe durumunu güncelle
    const barGrams = parseFloat(availableBar.grams);
    if (grams >= barGrams) {
      await redis.hset(`reserve:bar:${availableBar.serialNumber}`, { 
        status: 'allocated', 
        allocatedTo: userUid 
      });
      await redis.srem('reserve:index:available', availableBar.serialNumber);
    }

    console.log(`✅ Allocation created: ${allocationId} (${grams}g ${metal} to ${userUid})`);

    return NextResponse.json({
      success: true,
      message: 'Allocation created',
      userUid,
      allocation,
      bar: {
        serialNumber: availableBar.serialNumber,
        vault: availableBar.vault,
        purity: availableBar.purity,
      }
    });
  } catch (error: any) {
    console.error('Allocation create error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
