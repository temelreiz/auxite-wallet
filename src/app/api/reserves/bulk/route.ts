// app/api/reserves/bulk/route.ts
// Toplu külçe ekleme (Admin only)
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

const VAULTS = ['IST', 'DB', 'ZH', 'LN'];

function generateSerialNumber(metal: string, sequence: number): string {
  
  const baseNum = 1000000 + sequence;
  return `${metal}-${baseNum}`;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('x-admin-key');
    if (authHeader !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { metal, distribution, clearExisting } = await request.json();
    // distribution: [{ grams: 1000, count: 50 }, { grams: 500, count: 40 }, ...]

    if (!metal || !distribution) {
      return NextResponse.json({ error: 'metal, distribution required' }, { status: 400 });
    }

    // Mevcut verileri temizle (opsiyonel)
    if (clearExisting) {
      const existingSerials = await redis.smembers(`reserve:index:${metal}`) as string[];
      for (const serial of existingSerials) {
        await redis.del(`reserve:bar:${serial}`);
      }
      await redis.del(`reserve:index:${metal}`);
      // Sequence'ı sıfırla
      for (const vault of VAULTS) {
        await redis.del(`reserve:seq:${metal}:${vault}`);
      }
    }

    let totalBars = 0;
    let totalGrams = 0;
    let vaultIndex = 0;

    for (const { grams, count } of distribution) {
      for (let i = 0; i < count; i++) {
        const vault = VAULTS[vaultIndex % VAULTS.length];
        vaultIndex++;

        const seqKey = `reserve:seq:${metal}:${vault}`;
        const sequence = await redis.incr(seqKey);
        const serialNumber = generateSerialNumber(metal, sequence);

        const bar = {
          serialNumber,
          metal,
          grams: grams.toString(),
          allocatedGrams: '0',
          vault,
          purity: metal === 'AUXG' ? '999.9' : metal === 'AUXS' ? '999' : '999.5',
          status: 'available',
          supplier: '',
          purchaseDate: new Date().toISOString(),
          certificateUrl: '',
          createdAt: new Date().toISOString(),
        };

        await redis.hset(`reserve:bar:${serialNumber}`, bar);
        await redis.sadd(`reserve:index:${metal}`, serialNumber);
        await redis.sadd(`reserve:index:vault:${vault}`, serialNumber);
        await redis.sadd(`reserve:index:available`, serialNumber);

        totalBars++;
        totalGrams += grams;
      }
    }

    console.log(`✅ Bulk added: ${totalBars} bars, ${totalGrams}g ${metal}`);

    return NextResponse.json({
      success: true,
      metal,
      totalBars,
      totalGrams,
      totalKg: totalGrams / 1000,
    });
  } catch (error: any) {
    console.error('Bulk reserve error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
