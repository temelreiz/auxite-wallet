// lib/allocation-service.ts
// Shared allocation creation logic - used by both /api/trade and /api/allocations
import { redis } from '@/lib/redis';
import { createHash } from 'crypto';
import { sendCertificateEmail } from '@/lib/email';
import { getUserLanguage } from '@/lib/user-language';

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

  if (remaining > 0) {
    result.push(remaining);
  }

  return result;
}

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

export interface CreateAllocationParams {
  address: string;
  metal: string;
  grams: number;
  txHash?: string;
  email?: string;
  holderName?: string;
  preferredVault?: string;
}

export interface AllocationResult {
  success: boolean;
  error?: string;
  allocatedGrams: number;
  nonAllocatedGrams: number;
  totalGrams: number;
  certificateNumber?: string;
  userUid?: string;
  allocations?: any[];
  breakdown?: number[];
  barCount?: number;
  message?: string;
  wholeGrams?: number;
  fractionalGrams?: number;
  needMore?: number;
}

/**
 * Core allocation creation logic.
 * Creates bar-based allocation, certificate, anchors to blockchain, sends email.
 */
export async function createAllocation(params: CreateAllocationParams): Promise<AllocationResult> {
  const { address, metal, grams, txHash, email, holderName } = params;

  if (!address || !metal || !grams) {
    return { success: false, error: 'address, metal, grams required', allocatedGrams: 0, nonAllocatedGrams: grams || 0, totalGrams: grams || 0 };
  }

  // Partial Allocation: Sadece tam gramlar allocate edilir
  const wholeGrams = Math.floor(grams);
  const fractionalGrams = parseFloat((grams - wholeGrams).toFixed(4));

  // Minimum 1 gram gerekli
  if (wholeGrams < 1) {
    return {
      success: false,
      error: "Minimum 1g required for allocation",
      allocatedGrams: 0,
      nonAllocatedGrams: fractionalGrams,
      totalGrams: grams,
      wholeGrams: 0,
      fractionalGrams,
      needMore: parseFloat((1 - fractionalGrams).toFixed(4)),
      message: "Insufficient for allocation",
    };
  }

  // Kullanıcı UID'sini bul veya oluştur
  let userUid = await redis.get(`user:address:${address.toLowerCase()}`) as string;

  if (!userUid) {
    userUid = generateUID();
    await redis.set(`user:address:${address.toLowerCase()}`, userUid);
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
    const serials = await redis.smembers(`reserve:index:${metal}`) as string[];
    let selectedBar: any = null;

    for (const serialNumber of serials) {
      const bar = await redis.hgetall(`reserve:bar:${serialNumber}`);
      if (!bar || bar.status === 'fully_allocated') continue;

      const barGrams = parseFloat(bar.grams as string) || 0;
      const barAllocated = parseFloat(bar.allocatedGrams as string) || 0;
      const barAvailable = barGrams - barAllocated;

      if (barGrams === barSize && barAvailable >= barSize) {
        selectedBar = { ...bar, serialNumber, barGrams, barAllocated, barAvailable };
        break;
      }
    }

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
      return {
        success: false,
        error: `Insufficient reserve for ${barSize}g ${metal} bar`,
        allocatedGrams: 0,
        nonAllocatedGrams: grams,
        totalGrams: grams,
      };
    }

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

    const newAllocated = selectedBar.barAllocated + barSize;
    await redis.hset(`reserve:bar:${selectedBar.serialNumber}`, {
      allocatedGrams: newAllocated.toString(),
      status: newAllocated >= selectedBar.barGrams ? 'fully_allocated' : 'available'
    });

    if (newAllocated >= selectedBar.barGrams) {
      await redis.srem('reserve:index:available', selectedBar.serialNumber);
    }

    console.log(`✅ Allocation: ${barSize}g ${metal} to ${userUid} from ${selectedBar.serialNumber}`);
  }

  // Language lock
  const documentLanguage = await getUserLanguage(address.toLowerCase());

  // Sertifika oluştur
  const certificate = {
    certificateNumber: certNumber,
    userUid,
    address: address.toLowerCase(),
    metal,
    metalName: METAL_NAMES[metal] || metal,
    grams: wholeGrams.toString(),
    serialNumber: allocations.map(a => a.serialNumber).join(', '),
    vault: allocations[0]?.vault || '',
    vaultName: allocations[0]?.vaultName || '',
    purity: allocations[0]?.purity || '999.9',
    barSizes: barSizeBreakdown.join(', '),
    barCount: allocations.length.toString(),
    issuedAt: now,
    status: "active",
    issuer: "Auxite Precious Metals AG",
    document_language: documentLanguage,
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
  anchorCertificateBackground(certNumber, certHash);

  // Email gönder
  let userEmail = email;
  if (!userEmail) {
    try {
      const userId = await redis.get(`user:address:${address.toLowerCase()}`);
      if (userId) {
        const userData = await redis.hgetall(`user:${userId}`);
        userEmail = userData?.email as string || "";
      }
    } catch (e) {
      console.warn("Could not fetch user email from Redis:", e);
    }
  }

  if (userEmail) {
    try {
      const certLang = await getUserLanguage(address.toLowerCase());
      await sendCertificateEmail(userEmail, "", {
        certificateNumber: certNumber,
        metal,
        metalName: METAL_NAMES[metal] || metal,
        grams: wholeGrams.toString(),
        holderName: holderName || undefined,
        language: certLang,
      });
      console.log(`📧 Certificate email sent to ${userEmail}`);
    } catch (emailErr: any) {
      console.error(`❌ Certificate email failed:`, emailErr.message);
    }
  }

  console.log(`✅ Certificate issued: ${certNumber} for ${allocations.length} bars`);

  // Listeyi kaydet
  await redis.set(`allocation:user:${userUid}:list`, JSON.stringify(existingAllocs));

  return {
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
  };
}
