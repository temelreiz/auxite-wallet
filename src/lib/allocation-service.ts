// lib/allocation-service.ts
// Shared allocation creation logic - used by both /api/trade and /api/allocations
import { redis } from '@/lib/redis';
import { createHash } from 'crypto';
import { sendCertificateEmail } from '@/lib/email';
import { getUserLanguage } from '@/lib/user-language';

// 12 haneli alfanümerik UID oluştur
export function generateUID(): string {
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

export const METAL_NAMES: Record<string, string> = {
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
export async function anchorCertificateBackground(certNumber: string, certHash: string) {
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

// ============================================================================
// DE-ALLOCATION — the reverse of createAllocation. Called when a user SELLS or
// converts metal whose whole grams are held in allocations (certificates + bar
// reservations). Consumes `gramsToReduce` whole grams oldest-first:
//   • frees the physical bar reservation (reserve:bar.allocatedGrams -=),
//   • marks the certificate redeemed (or partially_redeemed),
//   • marks/zeros the allocation entry.
// Without this, sells only debited the Redis fractional balance → it went
// negative while allocations + bar reservations stayed overstated (corrupting
// reserve proof). gramsToReduce is always whole by the caller's design.
// ============================================================================
export async function reduceAllocations(
  address: string,
  metal: string,
  gramsToReduce: number,
): Promise<{ reduced: number; freedBars: string[]; redeemedCerts: string[] }> {
  const m = (metal || "").toUpperCase();
  let remaining = Math.round((gramsToReduce || 0) * 1e6) / 1e6; // strip float dust
  const freedBars: string[] = [];
  const redeemedCerts = new Set<string>();
  if (remaining <= 0) return { reduced: 0, freedBars: [], redeemedCerts: [] };

  const userUid = (await redis.get(`user:address:${address.toLowerCase()}`)) as string;
  if (!userUid) return { reduced: 0, freedBars: [], redeemedCerts: [] };

  const listKey = `allocation:user:${userUid}:list`;
  const raw = await redis.get(listKey);
  const list: any[] = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : [];

  // Active entries of this metal, oldest-first.
  const targets = list
    .map((a, i) => ({ a, i }))
    .filter((x) => (x.a.metal || "").toUpperCase() === m && (x.a.status || "active") === "active" && (parseFloat(x.a.grams) || 0) > 0)
    .sort((x, y) => new Date(x.a.allocatedAt || 0).getTime() - new Date(y.a.allocatedAt || 0).getTime());

  const certConsumed: Record<string, number> = {};
  const now = new Date().toISOString();

  for (const { a, i } of targets) {
    if (remaining <= 1e-6) break;
    const entryGrams = parseFloat(a.grams) || 0;
    const take = Math.min(entryGrams, remaining);

    // Free the bar reservation.
    if (a.serialNumber) {
      const barKey = `reserve:bar:${a.serialNumber}`;
      const bar = await redis.hgetall(barKey);
      if (bar && Object.keys(bar).length) {
        const barGrams = parseFloat(bar.grams as string) || 0;
        const barAlloc = parseFloat(bar.allocatedGrams as string) || 0;
        const newAlloc = Math.max(0, barAlloc - take);
        await redis.hset(barKey, {
          allocatedGrams: newAlloc.toString(),
          status: newAlloc >= barGrams ? "fully_allocated" : "available",
        });
        if (newAlloc < barGrams) await redis.sadd("reserve:index:available", a.serialNumber);
        freedBars.push(a.serialNumber);
      }
    }

    // Reduce / redeem the allocation entry.
    const newEntryGrams = parseFloat((entryGrams - take).toFixed(6));
    list[i].grams = newEntryGrams.toString();
    if (newEntryGrams <= 1e-6) {
      list[i].status = "redeemed";
      list[i].redeemedAt = now;
    }

    if (a.certificateNumber) certConsumed[a.certificateNumber] = (certConsumed[a.certificateNumber] || 0) + take;
    remaining = parseFloat((remaining - take).toFixed(6));
  }

  // Update certificates (redeemed when fully consumed, else partially_redeemed).
  for (const [certNum, consumed] of Object.entries(certConsumed)) {
    const certKey = `certificate:${certNum}`;
    const cert = await redis.hgetall(certKey);
    if (!cert || !Object.keys(cert).length) continue;
    const certGrams = parseFloat(cert.grams as string) || 0;
    const newCertGrams = Math.max(0, parseFloat((certGrams - consumed).toFixed(6)));
    await redis.hset(certKey, {
      grams: newCertGrams.toString(),
      status: newCertGrams <= 1e-6 ? "redeemed" : "partially_redeemed",
      redeemedAt: now,
    });
    redeemedCerts.add(certNum);
  }

  await redis.set(listKey, JSON.stringify(list));

  const reduced = parseFloat(((Math.round((gramsToReduce || 0) * 1e6) / 1e6) - remaining).toFixed(6));
  console.log(`📉 De-allocated ${reduced}g ${m} for ${address.slice(0, 10)}… (freed ${freedBars.length} bar(s), ${redeemedCerts.size} cert(s))`);
  return { reduced, freedBars, redeemedCerts: [...redeemedCerts] };
}

// ============================================================================
// ENCUMBRANCE / LOCK GUARD  (Auxite Borrow — Phase 1: additive, behavior-neutral)
// A user's metal grams are in one of three states:
//   Free  ·  Locked (borrow collateral)  ·  Yielding (staked)
//   available = total(active allocations) − locked − yielding
// Every metal-OUT flow (sell, convert, withdraw, transfer, redeem, stake-enroll)
// MUST call assertAvailable() before reducing/moving metal — so locked/yielding
// grams can never be sold, withdrawn, converted, transferred or re-staked.
// Until a loan/stake sets an encumbrance, locked = yielding = 0 → available == total
// → NO behavior change for existing users. State lives in:
//   encumbrance:user:<uid>:<METAL>  = { locked, yielding }   (hash, grams)
// ============================================================================

type Encumbrance = { locked: number; yielding: number };

function encKey(userUid: string, metal: string): string {
  return `encumbrance:user:${userUid}:${(metal || "").toUpperCase()}`;
}

async function uidFor(address: string): Promise<string | null> {
  const uid = (await redis.get(`user:address:${(address || "").toLowerCase()}`)) as string;
  return uid || null;
}

const r6 = (n: number) => parseFloat((Number(n) || 0).toFixed(6));

/** Raw encumbrance (locked + yielding grams) for a user+metal. */
export async function getEncumbrance(address: string, metal: string): Promise<Encumbrance> {
  const uid = await uidFor(address);
  if (!uid) return { locked: 0, yielding: 0 };
  const raw = await redis.hgetall(encKey(uid, metal));
  return {
    locked: parseFloat((raw?.locked as string) || "0") || 0,
    yielding: parseFloat((raw?.yielding as string) || "0") || 0,
  };
}

/** Sum of ACTIVE allocation grams of a metal — the canonical custodial holding
 *  that reduceAllocations() operates on. assertAvailable uses the SAME basis. */
export async function getActiveTotal(address: string, metal: string): Promise<number> {
  const uid = await uidFor(address);
  if (!uid) return 0;
  const raw = await redis.get(`allocation:user:${uid}:list`);
  const list: any[] = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : [];
  const m = (metal || "").toUpperCase();
  let total = 0;
  for (const a of list) {
    if ((a.metal || "").toUpperCase() === m && (a.status || "active") === "active") {
      total += parseFloat(a.grams) || 0;
    }
  }
  return r6(total);
}

/** Full picture: total / locked / yielding / available for a user+metal. */
export async function getMetalTotals(
  address: string,
  metal: string,
): Promise<{ total: number; locked: number; yielding: number; available: number }> {
  const [total, enc] = await Promise.all([
    getActiveTotal(address, metal),
    getEncumbrance(address, metal),
  ]);
  const available = r6(Math.max(0, total - enc.locked - enc.yielding));
  return { total, locked: enc.locked, yielding: enc.yielding, available };
}

/** Convenience: available (free) grams of a metal. */
export async function getAvailable(address: string, metal: string): Promise<number> {
  return (await getMetalTotals(address, metal)).available;
}

/** GUARD — call at the top of EVERY metal-out flow before reducing/moving metal.
 *  { ok:true } if `grams` are free to spend; else { ok:false, error, ...totals }. */
export async function assertAvailable(
  address: string,
  metal: string,
  grams: number,
): Promise<{ ok: boolean; available: number; total: number; locked: number; yielding: number; error?: string }> {
  const t = await getMetalTotals(address, metal);
  const need = r6(grams);
  if (need <= t.available + 1e-6) return { ok: true, ...t };
  return {
    ok: false,
    ...t,
    error: `Insufficient available ${(metal || "").toUpperCase()}: need ${need}g, available ${t.available}g (locked ${t.locked}g, yielding ${t.yielding}g).`,
  };
}

/** BORROW — lock `grams` as loan collateral (checks availability first). */
export async function lockCollateral(
  address: string,
  metal: string,
  grams: number,
  loanId: string,
): Promise<{ ok: boolean; locked: number; available: number; error?: string }> {
  const uid = await uidFor(address);
  if (!uid) return { ok: false, locked: 0, available: 0, error: "No user UID for address" };
  const m = (metal || "").toUpperCase();
  const need = r6(grams);
  const t = await getMetalTotals(address, metal);
  if (need <= 0) return { ok: false, locked: t.locked, available: t.available, error: "grams must be > 0" };
  if (need > t.available + 1e-6) {
    return { ok: false, locked: t.locked, available: t.available, error: `Insufficient available ${m} to lock: need ${need}g, available ${t.available}g.` };
  }
  const newLocked = r6(t.locked + need);
  await redis.hset(encKey(uid, m), { locked: newLocked.toString() });
  await redis.hset(`encumbrance:loan:${loanId}`, {
    address: address.toLowerCase(), metal: m, grams: need.toString(), lockedAt: new Date().toISOString(),
  });
  await redis.sadd(`encumbrance:user:${uid}:loans`, loanId);
  console.log(`🔒 Locked ${need}g ${m} collateral (loan ${loanId}) for ${address.slice(0, 10)}… → locked ${newLocked}g`);
  return { ok: true, locked: newLocked, available: r6(t.available - need) };
}

/** BORROW — release `grams` of collateral (on repay / liquidation). */
export async function releaseCollateral(
  address: string,
  metal: string,
  grams: number,
  loanId: string,
): Promise<{ ok: boolean; locked: number }> {
  const uid = await uidFor(address);
  if (!uid) return { ok: false, locked: 0 };
  const m = (metal || "").toUpperCase();
  const enc = await getEncumbrance(address, metal);
  const newLocked = r6(Math.max(0, enc.locked - (Number(grams) || 0)));
  await redis.hset(encKey(uid, m), { locked: newLocked.toString() });
  await redis.srem(`encumbrance:user:${uid}:loans`, loanId);
  console.log(`🔓 Released ${r6(grams)}g ${m} collateral (loan ${loanId}) for ${address.slice(0, 10)}… → locked ${newLocked}g`);
  return { ok: true, locked: newLocked };
}

/** STAKING — mark `grams` as yielding (call on stake; checks availability). */
export async function addYielding(
  address: string,
  metal: string,
  grams: number,
): Promise<{ ok: boolean; yielding: number; error?: string }> {
  const uid = await uidFor(address);
  if (!uid) return { ok: false, yielding: 0, error: "No user UID for address" };
  const m = (metal || "").toUpperCase();
  const need = r6(grams);
  const t = await getMetalTotals(address, metal);
  if (need > t.available + 1e-6) {
    return { ok: false, yielding: t.yielding, error: `Insufficient available ${m} to stake: need ${need}g, available ${t.available}g.` };
  }
  const newY = r6(t.yielding + need);
  await redis.hset(encKey(uid, m), { yielding: newY.toString() });
  return { ok: true, yielding: newY };
}

/** STAKING — release `grams` of yielding (call on unstake / maturity). */
export async function releaseYielding(
  address: string,
  metal: string,
  grams: number,
): Promise<{ ok: boolean; yielding: number }> {
  const uid = await uidFor(address);
  if (!uid) return { ok: false, yielding: 0 };
  const m = (metal || "").toUpperCase();
  const enc = await getEncumbrance(address, metal);
  const newY = r6(Math.max(0, enc.yielding - (Number(grams) || 0)));
  await redis.hset(encKey(uid, m), { yielding: newY.toString() });
  return { ok: true, yielding: newY };
}
