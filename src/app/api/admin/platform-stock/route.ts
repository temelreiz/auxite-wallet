// /api/admin/platform-stock/route.ts
// Platform Metal Stoğu Yönetimi - Admin Only
// Vault bazlı stok takibi ile
import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const METALS = ['AUXG', 'AUXS', 'AUXPT', 'AUXPD'];

// Metal display names
const METAL_NAMES: Record<string, { tr: string; en: string }> = {
  AUXG: { tr: 'Altın', en: 'Gold' },
  AUXS: { tr: 'Gümüş', en: 'Silver' },
  AUXPT: { tr: 'Platin', en: 'Platinum' },
  AUXPD: { tr: 'Paladyum', en: 'Palladium' },
};

// Available vaults
const VAULTS: Record<string, { name: string; country: string; code: string }> = {
  DXB: { name: 'Dubai Vault', country: 'UAE', code: 'DXB' },
  IST: { name: 'Istanbul Vault', country: 'Turkey', code: 'IST' },
  ZRH: { name: 'Zurich Vault', country: 'Switzerland', code: 'ZRH' },
  LDN: { name: 'London Vault', country: 'UK', code: 'LDN' },
};

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
    const vault = searchParams.get('vault');

    const metals = metal ? [metal.toUpperCase()] : METALS;
    const stocks: Record<string, any> = {};

    for (const m of metals) {
      const stockKey = `platform:stock:${m}`;
      const vaultKey = `${stockKey}:vaults`;

      const [data, vaultData] = await Promise.all([
        redis.hgetall(stockKey),
        redis.hgetall(vaultKey),
      ]);

      if (data && Object.keys(data).length > 0) {
        const total = parseFloat(data.total as string || '0');
        const available = parseFloat(data.available as string || '0');
        const reserved = parseFloat(data.reserved as string || '0');
        const threshold = parseFloat(data.warningThreshold as string || String(DEFAULT_WARNING_THRESHOLD));

        // Parse vault breakdown
        const byVault: Record<string, number> = {};
        if (vaultData && Object.keys(vaultData).length > 0) {
          for (const [vaultCode, amount] of Object.entries(vaultData)) {
            byVault[vaultCode] = parseFloat(amount as string || '0');
          }
        }

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
          byVault,
          metalName: METAL_NAMES[m],
        };

        // Detaylı istendiyse geçmişi de ekle
        if (detailed) {
          const history = await redis.lrange(`${stockKey}:history`, 0, 19) as string[];
          stocks[m].recentHistory = history.map(h => {
            try { return JSON.parse(h); } catch { return h; }
          });
        }

        // Belirli bir vault istendiyse sadece onu filtrele
        if (vault && VAULTS[vault.toUpperCase()]) {
          stocks[m].filteredVault = {
            code: vault.toUpperCase(),
            amount: byVault[vault.toUpperCase()] || 0,
          };
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
          byVault: {},
          metalName: METAL_NAMES[m],
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
      vaults: VAULTS,
    };

    return NextResponse.json({
      success: true,
      stocks,
      summary,
      vaults: VAULTS,
      metalNames: METAL_NAMES,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Platform stock GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST - Stok ekle/çıkar/ayarla (vault bazlı)
// ═══════════════════════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
  try {
    // Admin authentication
    const adminKey = request.headers.get('x-admin-key');
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { metal, amount, action, reason, warningThreshold, vault } = body;

    // Validation
    if (!metal || !METALS.includes(metal.toUpperCase())) {
      return NextResponse.json({ error: 'Invalid metal. Use: AUXG, AUXS, AUXPT, AUXPD' }, { status: 400 });
    }

    if (!action || !['add', 'remove', 'set', 'initialize', 'transfer'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Use: add, remove, set, initialize, transfer' }, { status: 400 });
    }

    // Vault required for add/remove operations
    if (['add', 'remove'].includes(action) && (!vault || !VAULTS[vault.toUpperCase()])) {
      return NextResponse.json({
        error: 'Vault required for add/remove. Use: DXB, IST, ZRH, LDN',
        availableVaults: Object.keys(VAULTS),
      }, { status: 400 });
    }

    if ((action !== 'initialize' || amount) && (isNaN(amount) || amount < 0)) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const metalUpper = metal.toUpperCase();
    const vaultUpper = vault?.toUpperCase();
    const stockKey = `platform:stock:${metalUpper}`;
    const vaultKey = `${stockKey}:vaults`;

    // Get current stock
    const [currentStock, currentVaults] = await Promise.all([
      redis.hgetall(stockKey),
      redis.hgetall(vaultKey),
    ]);

    const currentTotal = parseFloat(currentStock?.total as string || '0');
    const currentAvailable = parseFloat(currentStock?.available as string || '0');
    const currentReserved = parseFloat(currentStock?.reserved as string || '0');
    const currentVaultAmount = vaultUpper ? parseFloat(currentVaults?.[vaultUpper] as string || '0') : 0;

    let newTotal = currentTotal;
    let newAvailable = currentAvailable;
    let newVaultAmount = currentVaultAmount;
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
        // Eğer vault belirtildiyse oraya ekle
        if (vaultUpper && initAmount > 0) {
          multi.hset(vaultKey, { [vaultUpper]: initAmount.toString() });
          newVaultAmount = initAmount;
        }
        newTotal = initAmount;
        newAvailable = initAmount;
        operationResult = `Initialized ${metalUpper} stock with ${initAmount}g${vaultUpper ? ` in ${VAULTS[vaultUpper].name}` : ''}`;
        break;

      case 'add':
        // Stok ekle (fiziksel alım yapıldığında) - vault'a ekle
        newTotal = currentTotal + amount;
        newAvailable = currentAvailable + amount;
        newVaultAmount = currentVaultAmount + amount;

        multi.hincrbyfloat(stockKey, 'total', amount);
        multi.hincrbyfloat(stockKey, 'available', amount);
        multi.hset(stockKey, { lastUpdated: Date.now().toString() });
        multi.hincrbyfloat(vaultKey, vaultUpper!, amount);

        operationResult = `Added ${amount}g ${METAL_NAMES[metalUpper].en} to ${VAULTS[vaultUpper!].name}`;
        break;

      case 'remove':
        // Stok çıkar (fiziksel transfer yapıldığında) - vault'tan çıkar
        if (amount > currentVaultAmount) {
          return NextResponse.json({
            error: `Cannot remove ${amount}g from ${VAULTS[vaultUpper!].name}. Only ${currentVaultAmount}g available in this vault.`,
            vaultAvailable: currentVaultAmount,
            totalAvailable: currentAvailable,
          }, { status: 400 });
        }

        newTotal = currentTotal - amount;
        newAvailable = currentAvailable - amount;
        newVaultAmount = currentVaultAmount - amount;

        multi.hincrbyfloat(stockKey, 'total', -amount);
        multi.hincrbyfloat(stockKey, 'available', -amount);
        multi.hset(stockKey, { lastUpdated: Date.now().toString() });

        if (newVaultAmount <= 0) {
          multi.hdel(vaultKey, vaultUpper!);
        } else {
          multi.hset(vaultKey, { [vaultUpper!]: newVaultAmount.toString() });
        }

        operationResult = `Removed ${amount}g ${METAL_NAMES[metalUpper].en} from ${VAULTS[vaultUpper!].name}`;
        break;

      case 'set':
        // Stoku direkt ayarla (fiziksel sayım sonrası)
        newTotal = amount;
        newAvailable = amount - currentReserved;
        if (newAvailable < 0) newAvailable = 0;

        multi.hset(stockKey, {
          total: newTotal.toString(),
          available: newAvailable.toString(),
          lastUpdated: Date.now().toString(),
        });

        // Eğer vault belirtildiyse o vault'u ayarla
        if (vaultUpper) {
          multi.hset(vaultKey, { [vaultUpper]: amount.toString() });
          newVaultAmount = amount;
        }

        operationResult = `Set ${metalUpper} stock to ${amount}g${vaultUpper ? ` in ${VAULTS[vaultUpper].name}` : ''} (available: ${newAvailable}g after reserved)`;
        break;

      case 'transfer':
        // Vault arası transfer
        const { fromVault, toVault, transferAmount } = body;

        if (!fromVault || !toVault || !VAULTS[fromVault.toUpperCase()] || !VAULTS[toVault.toUpperCase()]) {
          return NextResponse.json({
            error: 'Both fromVault and toVault required for transfer',
            availableVaults: Object.keys(VAULTS),
          }, { status: 400 });
        }

        const fromVaultUpper = fromVault.toUpperCase();
        const toVaultUpper = toVault.toUpperCase();
        const fromAmount = parseFloat(currentVaults?.[fromVaultUpper] as string || '0');

        if (transferAmount > fromAmount) {
          return NextResponse.json({
            error: `Cannot transfer ${transferAmount}g from ${VAULTS[fromVaultUpper].name}. Only ${fromAmount}g available.`,
          }, { status: 400 });
        }

        const newFromAmount = fromAmount - transferAmount;
        const toAmount = parseFloat(currentVaults?.[toVaultUpper] as string || '0');
        const newToAmount = toAmount + transferAmount;

        if (newFromAmount <= 0) {
          multi.hdel(vaultKey, fromVaultUpper);
        } else {
          multi.hset(vaultKey, { [fromVaultUpper]: newFromAmount.toString() });
        }
        multi.hset(vaultKey, { [toVaultUpper]: newToAmount.toString() });
        multi.hset(stockKey, { lastUpdated: Date.now().toString() });

        operationResult = `Transferred ${transferAmount}g ${METAL_NAMES[metalUpper].en} from ${VAULTS[fromVaultUpper].name} to ${VAULTS[toVaultUpper].name}`;
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
      metalName: METAL_NAMES[metalUpper].en,
      amount: action === 'transfer' ? body.transferAmount : amount,
      vault: vaultUpper || (action === 'transfer' ? `${body.fromVault} → ${body.toVault}` : null),
      vaultName: vaultUpper ? VAULTS[vaultUpper]?.name : null,
      previousTotal: currentTotal,
      previousAvailable: currentAvailable,
      previousVaultAmount: currentVaultAmount,
      newTotal,
      newAvailable,
      newVaultAmount: action === 'transfer' ? undefined : newVaultAmount,
      reason: reason || '',
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
    };

    multi.lpush(`${stockKey}:history`, JSON.stringify(auditEntry));
    multi.ltrim(`${stockKey}:history`, 0, 999);
    multi.lpush('admin:stock-operations', JSON.stringify(auditEntry));
    multi.ltrim('admin:stock-operations', 0, 999);

    await multi.exec();

    console.log(`✅ Stock operation: ${operationResult}`);

    // Get updated vault breakdown
    const updatedVaults = await redis.hgetall(vaultKey);
    const byVault: Record<string, number> = {};
    if (updatedVaults) {
      for (const [v, amt] of Object.entries(updatedVaults)) {
        byVault[v] = parseFloat(amt as string || '0');
      }
    }

    return NextResponse.json({
      success: true,
      message: operationResult,
      stock: {
        metal: metalUpper,
        metalName: METAL_NAMES[metalUpper],
        total: newTotal,
        available: newAvailable,
        reserved: currentReserved,
        isLowStock: newAvailable <= thresholdAmount,
        byVault,
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
    const vaultKey = `${stockKey}:vaults`;

    // Backup before delete
    const [currentStock, currentVaults] = await Promise.all([
      redis.hgetall(stockKey),
      redis.hgetall(vaultKey),
    ]);

    await Promise.all([
      redis.del(stockKey),
      redis.del(vaultKey),
      redis.del(`${stockKey}:history`),
    ]);

    // Log deletion
    await redis.lpush('admin:stock-operations', JSON.stringify({
      timestamp: Date.now(),
      action: 'DELETE',
      metal: metal.toUpperCase(),
      previousData: currentStock,
      previousVaults: currentVaults,
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
    }));

    return NextResponse.json({
      success: true,
      message: `${metal.toUpperCase()} stock data deleted`,
      deletedData: currentStock,
      deletedVaults: currentVaults,
    });
  } catch (error: any) {
    console.error('Platform stock DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
