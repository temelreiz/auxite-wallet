// app/api/reserves/route.ts
// Fiziksel Metal Rezervleri API
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

// Kasa lokasyonları
const VAULTS = {
  IST: { name: 'Istanbul', country: 'Turkey', code: 'IST' },
  DB: { name: 'Dubai', country: 'UAE', code: 'DB' },
  ZH: { name: 'Zurich', country: 'Switzerland', code: 'ZH' },
  LN: { name: 'London', country: 'UK', code: 'LN' },
};

// Metal birimleri (gram)
const METAL_UNITS = {
  AUXG: [1, 5, 10, 20, 50, 100, 500, 1000], // 1g - 1kg
  AUXS: [50, 100, 250, 500, 1000, 311, 3110], // 50g - 100oz
  AUXPT: [1, 5, 10, 25, 50, 100, 500, 1000],
  AUXPD: [1, 5, 10, 25, 50, 100, 500, 1000],
};

// Seri numarası oluştur
function generateSerialNumber(metal: string, vault: string, sequence: number): string {
  const year = new Date().getFullYear();
  const seq = String(sequence).padStart(5, '0');
  return `AUX-${metal.replace('AUX', '')}-${year}-${vault}-${seq}`;
}

// GET - Rezervleri getir
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const metal = searchParams.get('metal');
    const vault = searchParams.get('vault');
    const detailed = searchParams.get('detailed') === 'true';

    // Toplam rezervleri getir
    const reserveKeys = await redis.keys('reserve:bar:*');
    
    let reserves: any[] = [];
    for (const key of reserveKeys) {
      const bar = await redis.hgetall(key);
      if (bar) {
        if (metal && bar.metal !== metal) continue;
        if (vault && bar.vault !== vault) continue;
        reserves.push(bar);
      }
    }

    // Özet hesapla
    const summary: Record<string, { total: number; allocated: number; available: number; byVault: Record<string, number> }> = {};
    
    for (const bar of reserves) {
      const m = bar.metal as string;
      if (!summary[m]) {
        summary[m] = { total: 0, allocated: 0, available: 0, byVault: {} };
      }
      const grams = parseFloat(bar.grams as string) || 0;
      summary[m].total += grams;
      if (bar.status === 'allocated') {
        summary[m].allocated += grams;
      } else {
        summary[m].available += grams;
      }
      
      const v = bar.vault as string;
      summary[m].byVault[v] = (summary[m].byVault[v] || 0) + grams;
    }

    // Token supply (blockchain'den - şimdilik mock)
    const tokenSupply = {
      AUXG: summary.AUXG?.total || 0,
      AUXS: summary.AUXS?.total || 0,
      AUXPT: summary.AUXPT?.total || 0,
      AUXPD: summary.AUXPD?.total || 0,
    };

    return NextResponse.json({
      success: true,
      summary,
      tokenSupply,
      backingRatio: '1:1',
      vaults: VAULTS,
      units: METAL_UNITS,
      totalBars: reserves.length,
      bars: detailed ? reserves : undefined,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Reserves fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Yeni külçe ekle (Admin only)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('x-admin-key');
    if (authHeader !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { metal, grams, vault, purity, supplier, purchaseDate, certificateUrl } = await request.json();

    if (!metal || !grams || !vault) {
      return NextResponse.json({ error: 'metal, grams, vault required' }, { status: 400 });
    }

    if (!['AUXG', 'AUXS', 'AUXPT', 'AUXPD'].includes(metal)) {
      return NextResponse.json({ error: 'Invalid metal' }, { status: 400 });
    }

    if (!Object.keys(VAULTS).includes(vault)) {
      return NextResponse.json({ error: 'Invalid vault' }, { status: 400 });
    }

    const seqKey = `reserve:seq:${metal}:${vault}`;
    const sequence = await redis.incr(seqKey);
    const serialNumber = generateSerialNumber(metal, vault, sequence);

    const bar = {
      serialNumber,
      metal,
      grams: grams.toString(),
      vault,
      purity: purity || (metal === 'AUXG' ? '999.9' : metal === 'AUXS' ? '999' : '999.5'),
      status: 'available',
      allocatedTo: null,
      supplier: supplier || null,
      purchaseDate: purchaseDate || new Date().toISOString(),
      certificateUrl: certificateUrl || null,
      createdAt: new Date().toISOString(),
    };

    await redis.hset(`reserve:bar:${serialNumber}`, bar);
    await redis.sadd(`reserve:index:${metal}`, serialNumber);
    await redis.sadd(`reserve:index:vault:${vault}`, serialNumber);
    await redis.sadd(`reserve:index:available`, serialNumber);

    console.log(`✅ New bar added: ${serialNumber} (${grams}g ${metal} @ ${vault})`);

    return NextResponse.json({ success: true, message: 'Bar added to reserves', bar });
  } catch (error: any) {
    console.error('Reserve add error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
