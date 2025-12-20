/**
 * Auxiteer Tier API
 * GET: Kullanıcının tier bilgisini döndür
 * POST: Kullanıcı kaydı oluştur/güncelle
 */

import { NextRequest, NextResponse } from 'next/server';
import { redis, getUserBalance } from '@/lib/redis';
import { AUXITEER_TIERS, AuxiteerTierConfig } from '@/lib/auxiteer-config';

// ============================================
// HELPER FUNCTIONS
// ============================================

interface UserMeta {
  walletAddress: string;
  registeredAt: string;
  lastActiveAt: string;
  auxiteerTier: string;
  tierUpdatedAt: string;
  invitedToSovereign: boolean;
}

const KEYS = {
  userMeta: (address: string) => `user:${address.toLowerCase()}:meta`,
  kycData: (address: string) => `kyc:${address.toLowerCase()}`,
  leasePositions: (address: string) => `user:${address.toLowerCase()}:leases`,
};

async function getUserMeta(address: string): Promise<UserMeta | null> {
  const data = await redis.get(KEYS.userMeta(address));
  if (!data) return null;
  return typeof data === 'string' ? JSON.parse(data) as UserMeta : data as UserMeta;
}

async function setUserMeta(address: string, meta: Partial<UserMeta>): Promise<void> {
  const existing = await getUserMeta(address);
  const updated: UserMeta = {
    walletAddress: address.toLowerCase(),
    registeredAt: existing?.registeredAt || new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    auxiteerTier: meta.auxiteerTier || existing?.auxiteerTier || 'regular',
    tierUpdatedAt: meta.tierUpdatedAt || existing?.tierUpdatedAt || new Date().toISOString(),
    invitedToSovereign: meta.invitedToSovereign ?? existing?.invitedToSovereign ?? false,
    ...meta,
  };
  await redis.set(KEYS.userMeta(address), JSON.stringify(updated));
}

async function getKycStatus(address: string): Promise<{ isVerified: boolean; level: string }> {
  const kycData = await redis.get(KEYS.kycData(address));
  if (!kycData) return { isVerified: false, level: 'none' };
  
  const kyc = typeof kycData === 'string' ? JSON.parse(kycData) : kycData;
  const isVerified = kyc.status === 'approved' && ['verified', 'enhanced'].includes(kyc.level);
  return { isVerified, level: kyc.level || 'none' };
}

async function hasActiveLeasePosition(address: string): Promise<boolean> {
  const leases = await redis.get(KEYS.leasePositions(address));
  if (!leases) return false;
  
  const positions = typeof leases === 'string' ? JSON.parse(leases) : leases;
  if (!Array.isArray(positions)) return false;
  
  // Aktif lease var mı kontrol et
  return positions.some((p: any) => p.status === 'active' && p.endDate > new Date().toISOString());
}

function calculateDaysSinceRegistration(registeredAt: string): number {
  const regDate = new Date(registeredAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - regDate.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

async function calculateBalanceUsd(address: string, metalPrices: Record<string, number>): Promise<number> {
  const balance = await getUserBalance(address);
  
  // Metal bakiyelerini USD'ye çevir
  let totalUsd = 0;
  
  // AUXG (Gold) - 1 oz gold price
  totalUsd += (balance.auxg || 0) * (metalPrices.gold || 2650);
  
  // AUXS (Silver) - 1 oz silver price
  totalUsd += (balance.auxs || 0) * (metalPrices.silver || 31);
  
  // AUXPT (Platinum) - 1 oz platinum price
  totalUsd += (balance.auxpt || 0) * (metalPrices.platinum || 980);
  
  // AUXPD (Palladium) - 1 oz palladium price
  totalUsd += (balance.auxpd || 0) * (metalPrices.palladium || 1050);
  
  // Crypto & Fiat
  totalUsd += (balance.usdt || 0);
  totalUsd += (balance.usd || 0);
  
  // ETH, BTC, etc. (need prices)
  // For now, assume these are small amounts
  
  return totalUsd;
}

function determineTier(
  balanceUsd: number,
  daysSinceReg: number,
  isKycVerified: boolean,
  hasMetalAsset: boolean,
  hasActiveLease: boolean,
  invitedToSovereign: boolean
): AuxiteerTierConfig {
  // Tier'ları yüksekten düşüğe kontrol et
  const tiers = [...AUXITEER_TIERS].reverse();
  
  for (const tier of tiers) {
    const req = tier.requirements;
    
    // Sovereign için özel davet gerekli
    if (req.invitation && !invitedToSovereign) continue;
    
    // KYC kontrolü
    if (req.kyc && !isKycVerified) continue;
    
    // Balance kontrolü
    if (balanceUsd < req.minBalanceUsd) continue;
    
    // Gün kontrolü
    if (daysSinceReg < req.minDays) continue;
    
    // Metal varlık kontrolü
    if (req.metalAsset && !hasMetalAsset) continue;
    
    // Aktif lease kontrolü
    if (req.activeEarnLease && !hasActiveLease) continue;
    
    // Tüm şartlar sağlandı
    return tier;
  }
  
  // Default: Regular
  return AUXITEER_TIERS[0];
}

// ============================================
// API HANDLERS
// ============================================

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
    }

    const address = walletAddress.toLowerCase();

    // Kullanıcı meta bilgisini al veya oluştur
    let userMeta = await getUserMeta(address);
    if (!userMeta) {
      // İlk kez giriş yapıyor, kaydet
      await setUserMeta(address, {});
      userMeta = await getUserMeta(address);
    }

    // KYC durumu
    const { isVerified: isKycVerified, level: kycLevel } = await getKycStatus(address);

    // Balance ve metal varlıkları
    const balance = await getUserBalance(address);
    const hasMetalAsset = (balance.auxg > 0 || balance.auxs > 0 || balance.auxpt > 0 || balance.auxpd > 0);

    // Aktif lease
    const hasActiveLease = await hasActiveLeasePosition(address);

    // Kayıt tarihinden bu yana geçen gün
    const daysSinceReg = userMeta ? calculateDaysSinceRegistration(userMeta.registeredAt) : 0;

    // Metal fiyatları (basit cache veya API'den)
    // Şimdilik sabit değerler, gerçek uygulamada price API'den alınmalı
    const metalPrices = {
      gold: 2650,
      silver: 31,
      platinum: 980,
      palladium: 1050,
    };

    // USD cinsinden toplam bakiye
    const balanceUsd = await calculateBalanceUsd(address, metalPrices);

    // Tier hesapla
    const tier = determineTier(
      balanceUsd,
      daysSinceReg,
      isKycVerified,
      hasMetalAsset,
      hasActiveLease,
      userMeta?.invitedToSovereign || false
    );

    // Tier değiştiyse güncelle
    if (userMeta && userMeta.auxiteerTier !== tier.id) {
      await setUserMeta(address, {
        auxiteerTier: tier.id,
        tierUpdatedAt: new Date().toISOString(),
      });
    }

    // Sonraki tier için ilerleme
    const currentTierIndex = AUXITEER_TIERS.findIndex(t => t.id === tier.id);
    const nextTier = currentTierIndex < AUXITEER_TIERS.length - 1 
      ? AUXITEER_TIERS[currentTierIndex + 1] 
      : null;

    const progress = nextTier ? {
      nextTier: nextTier.id,
      nextTierName: nextTier.name,
      requirements: {
        balanceUsd: {
          current: balanceUsd,
          required: nextTier.requirements.minBalanceUsd,
          met: balanceUsd >= nextTier.requirements.minBalanceUsd,
        },
        days: {
          current: daysSinceReg,
          required: nextTier.requirements.minDays,
          met: daysSinceReg >= nextTier.requirements.minDays,
        },
        kyc: {
          current: isKycVerified,
          required: nextTier.requirements.kyc,
          met: !nextTier.requirements.kyc || isKycVerified,
        },
        metalAsset: {
          current: hasMetalAsset,
          required: nextTier.requirements.metalAsset,
          met: !nextTier.requirements.metalAsset || hasMetalAsset,
        },
        activeLease: {
          current: hasActiveLease,
          required: nextTier.requirements.activeEarnLease,
          met: !nextTier.requirements.activeEarnLease || hasActiveLease,
        },
      },
    } : null;

    return NextResponse.json({
      tier: {
        id: tier.id,
        name: tier.name,
        spread: tier.spread,
        fee: tier.fee,
      },
      stats: {
        balanceUsd: Math.round(balanceUsd * 100) / 100,
        daysSinceRegistration: daysSinceReg,
        registeredAt: userMeta?.registeredAt,
        isKycVerified,
        kycLevel,
        hasMetalAsset,
        hasActiveLease,
      },
      progress,
      allTiers: AUXITEER_TIERS.map(t => ({
        id: t.id,
        name: t.name,
        spread: t.spread,
        fee: t.fee,
        requirements: t.requirements,
        isCurrent: t.id === tier.id,
      })),
    });

  } catch (error) {
    console.error('Auxiteer GET error:', error);
    return NextResponse.json({ error: 'Failed to get tier info' }, { status: 500 });
  }
}

// POST: Kullanıcı kaydı güncelle (admin)
export async function POST(request: NextRequest) {
  try {
    const adminKey = request.headers.get('x-admin-key');
    if (adminKey !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { walletAddress, action, data } = body;

    if (!walletAddress || !action) {
      return NextResponse.json({ error: 'walletAddress and action required' }, { status: 400 });
    }

    const address = walletAddress.toLowerCase();

    switch (action) {
      case 'invite_sovereign':
        // Sovereign tier'a davet
        await setUserMeta(address, { invitedToSovereign: true });
        return NextResponse.json({ success: true, message: 'User invited to Sovereign tier' });

      case 'revoke_sovereign':
        // Sovereign davetini iptal et
        await setUserMeta(address, { invitedToSovereign: false });
        return NextResponse.json({ success: true, message: 'Sovereign invitation revoked' });

      case 'set_registration_date':
        // Kayıt tarihini manuel ayarla (migration için)
        if (!data?.registeredAt) {
          return NextResponse.json({ error: 'registeredAt required' }, { status: 400 });
        }
        await setUserMeta(address, { registeredAt: data.registeredAt });
        return NextResponse.json({ success: true, message: 'Registration date updated' });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Auxiteer POST error:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}
