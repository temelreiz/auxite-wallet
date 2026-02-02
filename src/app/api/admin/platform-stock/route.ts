// /api/admin/platform-stock/route.ts
// Platform Metal Stoğu Yönetimi - Admin Only
import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const METALS = ['AUXG', 'AUXS', 'AUXPT', 'AUXPD'];

// Default thresholds
const DEFAULT_WARNING_THRESHOLD = 0.2; // %20

// ═══════════════════════════════════════════════════════════════════════════
// GET - Platform stoğunu getir
// ═══════════════════════════════════════════════════════════════════════════
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const metal = searchParams.get('metal');
    const detailed = searchParams.get('detailed') === 'true';

    const metals = metal ? [metal.toUpperCase()] : METALS;
    const stocks: Record<string, any> = {};

    for (const m of metals) {
      const stockKey = `platform:stock:${m}`;
      const data = await redis.hgetall(stockKey);

      if (data && Object.keys(data).length > 0) {
        const total = parseFloat(data.total as string || '0');
        const available = parseFloat(data.available as string || '0');
        const reserved = parseFloat(data.reserved as string || '0');
        const threshold = parseFloat(data.warningThreshold as string || String(DEFAULT_WARNING_THRESHOLD));

        stocks[m] = {
          total,
          available,
          reserved,
          allocated: parseFloat(data.allocated as string || '0'),
          warningThreshold: threshold,
          warningAmount: total * threshold,
          isLowStock: available <= (total * threshold),
          lowStockAlertSent: data.lowStockAlertSent === 'true',
          lastUpdated: data.lastUpdated || null,
          utilizationPercent: total > 0 ? ((total - available) / total * 100).toFixed(2) : '0',
        };

        // Detaylı istendiyse geçmişi de ekle
        if (detailed) {
          const history = await redis.lrange(`${stockKey}:history`, 0, 19) as string[];
          stocks[m].recentHistory = history.map(h => {
            try { return JSON.parse(h); } catch { return h; }
          });
        }
      } else {
        // Stok henüz oluşturulmamış
        stocks[m] = {
          total: 0,
          available: 0,
          reserved: 0,
          allocated: 0,
          warningThreshold: DEFAULT_WARNING_THRESHOLD,
          warningAmount: 0,
          isLowStock: true,
          lowStockAlertSent: false,
          lastUpdated: null,
          notInitialized: true,
        };
      }
    }

    // Genel özet
    const summary = {
      totalMetals: METALS.length,
      initializedMetals: Object.values(stocks).filter((s: any) => !s.notInitialized).length,
      lowStockMetals: Object.entries(stocks)
        .filter(([_, s]: [string, any]) => s.isLowStock && !s.notInitialized)
        .map(([m]) => m),
    };

    return NextResponse.json({
      success: true,
      stocks,
      summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Platform stock GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST - Stok ekle/çıkar/ayarla
// ═══════════════════════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
  try {
    // Admin authentication
    const adminKey = request.headers.get('x-admin-key');
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { metal, amount, action, reason, warningThreshold } = body;

    // Validation
    if (!metal || !METALS.includes(metal.toUpperCase())) {
      return NextResponse.json({ error: 'Invalid metal. Use: AUXG, AUXS, AUXPT, AUXPD' }, { status: 400 });
    }

    if (!action || !['add', 'remove', 'set', 'initialize'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Use: add, remove, set, initialize' }, { status: 400 });
    }

    if ((action !== 'initialize' || amount) && (isNaN(amount) || amount < 0)) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const metalUpper = metal.toUpperCase();
    const stockKey = `platform:stock:${metalUpper}`;

    // Get current stock
    const currentStock = await redis.hgetall(stockKey);
    const currentTotal = parseFloat(currentStock?.total as string || '0');
    const currentAvailable = parseFloat(currentStock?.available as string || '0');
    const currentReserved = parseFloat(currentStock?.reserved as string || '0');

    let newTotal = currentTotal;
    let newAvailable = currentAvailable;
    let operationResult = '';

    const multi = redis.multi();

    switch (action) {
      case 'initialize':
        // İlk kurulum - varsayılan değerlerle başlat
        const initAmount = amount || 0;
        multi.hset(stockKey, {
          total: initAmount.toString(),
          available: initAmount.toString(),
          reserved: '0',
          allocated: '0',
          warningThreshold: (warningThreshold || DEFAULT_WARNING_THRESHOLD).toString(),
          lowStockAlertSent: 'false',
          lastUpdated: Date.now().toString(),
        });
        newTotal = initAmount;
        newAvailable = initAmount;
        operationResult = `Initialized ${metalUpper} stock with ${initAmount}g`;
        break;

      case 'add':
        // Stok ekle (fiziksel alım yapıldığında)
        newTotal = currentTotal + amount;
        newAvailable = currentAvailable + amount;
        multi.hincrbyfloat(stockKey, 'total', amount);
        multi.hincrbyfloat(stockKey, 'available', amount);
        multi.hset(stockKey, { lastUpdated: Date.now().toString() });
        operationResult = `Added ${amount}g to ${metalUpper} stock`;
        break;

      case 'remove':
        // Stok çıkar (fiziksel transfer yapıldığında)
        if (amount > currentAvailable) {
          return NextResponse.json({
            error: `Cannot remove ${amount}g. Only ${currentAvailable}g available.`,
            available: currentAvailable,
          }, { status: 400 });
        }
        newTotal = currentTotal - amount;
        newAvailable = currentAvailable - amount;
        multi.hincrbyfloat(stockKey, 'total', -amount);
        multi.hincrbyfloat(stockKey, 'available', -amount);
        multi.hset(stockKey, { lastUpdated: Date.now().toString() });
        operationResult = `Removed ${amount}g from ${metalUpper} stock`;
        break;

      case 'set':
        // Stoku direkt ayarla (fiziksel sayım sonrası)
        newTotal = amount;
        newAvailable = amount - currentReserved; // Reserved'ı koru
        if (newAvailable < 0) newAvailable = 0;
        multi.hset(stockKey, {
          total: newTotal.toString(),
          available: newAvailable.toString(),
          lastUpdated: Date.now().toString(),
        });
        operationResult = `Set ${metalUpper} stock to ${amount}g (available: ${newAvailable}g after reserved)`;
        break;
    }

    // Update warning threshold if provided
    if (warningThreshold !== undefined && action !== 'initialize') {
      multi.hset(stockKey, { warningThreshold: warningThreshold.toString() });
    }

    // Check and reset low stock alert if stock improved
    const threshold = parseFloat(currentStock?.warningThreshold as string || String(DEFAULT_WARNING_THRESHOLD));
    const thresholdAmount = newTotal * threshold;
    if (newAvailable > thresholdAmount) {
      multi.hset(stockKey, { lowStockAlertSent: 'false' });
    }

    // Audit log
    const auditEntry = {
      timestamp: Date.now(),
      action,
      metal: metalUpper,
      amount,
      previousTotal: currentTotal,
      previousAvailable: currentAvailable,
      newTotal,
      newAvailable,
      reason: reason || '',
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
    };

    multi.lpush(`${stockKey}:history`, JSON.stringify(auditEntry));
    multi.ltrim(`${stockKey}:history`, 0, 999); // Keep last 1000 entries
    multi.lpush('admin:stock-operations', JSON.stringify(auditEntry));
    multi.ltrim('admin:stock-operations', 0, 999);

    await multi.exec();

    console.log(`✅ Stock operation: ${operationResult}`);

    return NextResponse.json({
      success: true,
      message: operationResult,
      stock: {
        metal: metalUpper,
        total: newTotal,
        available: newAvailable,
        reserved: currentReserved,
        isLowStock: newAvailable <= thresholdAmount,
      },
      audit: auditEntry,
    });
  } catch (error: any) {
    console.error('Platform stock POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DELETE - Stok sıfırla (dikkatli kullan!)
// ═══════════════════════════════════════════════════════════════════════════
export async function DELETE(request: NextRequest) {
  try {
    const adminKey = request.headers.get('x-admin-key');
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const metal = searchParams.get('metal');
    const confirm = searchParams.get('confirm');

    if (confirm !== 'yes-delete-stock') {
      return NextResponse.json({
        error: 'Confirmation required. Add ?confirm=yes-delete-stock',
      }, { status: 400 });
    }

    if (!metal || !METALS.includes(metal.toUpperCase())) {
      return NextResponse.json({ error: 'Invalid metal' }, { status: 400 });
    }

    const stockKey = `platform:stock:${metal.toUpperCase()}`;

    // Backup before delete
    const currentStock = await redis.hgetall(stockKey);

    await redis.del(stockKey);
    await redis.del(`${stockKey}:history`);

    // Log deletion
    await redis.lpush('admin:stock-operations', JSON.stringify({
      timestamp: Date.now(),
      action: 'DELETE',
      metal: metal.toUpperCase(),
      previousData: currentStock,
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
    }));

    return NextResponse.json({
      success: true,
      message: `${metal.toUpperCase()} stock data deleted`,
      deletedData: currentStock,
    });
  } catch (error: any) {
    console.error('Platform stock DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
