// app/api/reserves/route.ts
// Auxite Fiziksel Metal Rezervleri - Toplam Stok
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

const VAULTS = {
  IST: { name: 'Istanbul', country: 'Turkey', code: 'IST' },
  DB: { name: 'Dubai', country: 'UAE', code: 'DB' },
  ZH: { name: 'Zurich', country: 'Switzerland', code: 'ZH' },
  LN: { name: 'London', country: 'UK', code: 'LN' },
};

const METAL_UNITS = {
  AUXG: [1, 5, 10, 20, 50, 100, 500, 1000],
  AUXS: [50, 100, 250, 500, 1000, 311, 3110],
  AUXPT: [1, 5, 10, 25, 50, 100, 500, 1000],
  AUXPD: [1, 5, 10, 25, 50, 100, 500, 1000],
};

function generateSerialNumber(metal: string, sequence: number): string {
  
  const baseNum = 1000000 + sequence;
  return `${metal}-${baseNum}`;
}

// GET - Auxite'ın toplam rezervlerini getir
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const metal = searchParams.get('metal');
    const vault = searchParams.get('vault');
    const detailed = searchParams.get('detailed') === 'true';

    const metals = metal ? [metal] : ['AUXG', 'AUXS', 'AUXPT', 'AUXPD'];
    let allSerials: string[] = [];
    
    for (const m of metals) {
      const serials = await redis.smembers(`reserve:index:${m}`) as string[];
      allSerials = [...allSerials, ...serials];
    }

    let reserves: any[] = [];
    for (const serialNumber of allSerials) {
      const bar = await redis.hgetall(`reserve:bar:${serialNumber}`);
      if (bar) {
        if (vault && bar.vault !== vault) continue;
        reserves.push({ ...bar, serialNumber });
      }
    }

    // Özet hesapla - allocated gram'ları da hesaba kat
    const summary: Record<string, { total: number; allocated: number; available: number; byVault: Record<string, number> }> = {};
    
    for (const bar of reserves) {
      const m = bar.metal as string;
      if (!summary[m]) {
        summary[m] = { total: 0, allocated: 0, available: 0, byVault: {} };
      }
      
      const totalGrams = parseFloat(bar.grams as string) || 0;
      const allocatedGrams = parseFloat(bar.allocatedGrams as string) || 0;
      const availableGrams = totalGrams - allocatedGrams;
      
      summary[m].total += totalGrams;
      summary[m].allocated += allocatedGrams;
      summary[m].available += availableGrams;
      
      const v = bar.vault as string;
      summary[m].byVault[v] = (summary[m].byVault[v] || 0) + availableGrams;
    }

    // Token supply = Toplam rezerv (1:1 backing)
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
    const serialNumber = generateSerialNumber(metal, sequence);

    const bar = {
      serialNumber,
      metal,
      grams: grams.toString(),
      allocatedGrams: '0',
      vault,
      purity: purity || (metal === 'AUXG' ? '999.9' : metal === 'AUXS' ? '999' : '999.5'),
      status: 'available',
      supplier: supplier || '',
      purchaseDate: purchaseDate || new Date().toISOString(),
      certificateUrl: certificateUrl || '',
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
