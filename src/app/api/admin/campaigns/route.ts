// src/app/api/admin/campaigns/route.ts
// Auxite Wallet - Campaign Management API

import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { requireAdmin } from "@/lib/admin-auth";

interface Campaign {
  id: string;
  name: { tr: string; en: string };
  description: { tr: string; en: string };
  type: 'discount' | 'bonus' | 'cashback' | 'referral' | 'limited' | 'volume_bonus';
  value: number;
  valueType: 'percentage' | 'fixed';
  code?: string;
  minAmount?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usageCount: number;
  userLimit?: number;
  targetAssets?: string[];
  targetActions?: string[];
  startDate: string;
  endDate: string;
  active: boolean;
  createdAt: string;
  // ─── Volume Bonus only (admin-defined "trade $X → Y grams" campaign) ───
  // Filled in when type === 'volume_bonus'. Storage matches the shape used
  // by src/lib/volume-bonus.ts so the trade-route hook can read these
  // straight off the saved campaign record.
  bonusAsset?: 'AUXG' | 'AUXS' | 'AUXPT' | 'AUXPD';
  bonusAmountGrams?: number;
  minTradeUsd?: number;
  poolCap?: number;
  eligibility?: 'all' | 'kyc_verified' | 'no_kyc' | 'dormant_60d';
}

const CAMPAIGNS_KEY = "auxite:campaigns";

// Auth — same Redis-session check the rest of the admin endpoints use.
// The old verifyAuth() compared the bearer to ADMIN_PASSWORD verbatim,
// but the admin UI sends session tokens (auxite_admin_token), so writes
// silently 401'd and the form looked dead. requireAdmin() handles both
// path and signature correctly.
const verifyAuth = async (request: NextRequest): Promise<boolean> => {
  const result = await requireAdmin(request);
  return result.authorized;
};

// GET - Kampanyaları getir
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";
    const code = searchParams.get("code");
    const earlybird = searchParams.get("earlybird");

    // Early Bird (legacy) kampanya durumu
    if (earlybird === "status") {
      const count = (await kv.get<number>("campaign:earlybird:count")) || 0;
      const users = (await kv.lrange("campaign:earlybird:users", 0, -1)) || [];

      return NextResponse.json({
        success: true,
        earlyBird: {
          enabled: false,
          legacy: true,
          totalGranted: count,
          users: users.map((u: any) => typeof u === 'string' ? JSON.parse(u) : u),
        },
      });
    }

    // Bonus System v2 metrikleri
    const bonusStats = searchParams.get("bonus");
    if (bonusStats === "status") {
      const { getCampaignInfo } = await import("@/lib/metal-bonus-service");
      const info = await getCampaignInfo();

      return NextResponse.json({
        success: true,
        bonus: {
          ...info,
          unlockMethod: 'hybrid',
          unlockDays: 30,
          volumeMultiplier: 5,
          maxPerUserUsd: 100,
        },
      });
    }

    // Volume bonus live stats — usage count + pool remaining per campaign.
    // Reads the per-campaign Redis counters maintained by
    // src/lib/volume-bonus.ts so the admin progress cards stay in sync
    // with what users actually claimed (not just the saved usageCount).
    const volumeStats = searchParams.get("volume_stats");
    if (volumeStats === "1") {
      const { getVolumeBonusStats } = await import("@/lib/volume-bonus");
      const all = (await kv.get<Campaign[]>(CAMPAIGNS_KEY)) || [];
      const volume = all.filter((c) => c.type === 'volume_bonus');
      const stats = await Promise.all(
        volume.map(async (c) => ({
          id: c.id,
          name: c.name,
          active: c.active,
          startDate: c.startDate,
          endDate: c.endDate,
          minTradeUsd: c.minTradeUsd ?? 0,
          bonusAmountGrams: c.bonusAmountGrams ?? 0,
          eligibility: c.eligibility ?? 'all',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...(await getVolumeBonusStats(c as any)),
        })),
      );
      return NextResponse.json({ success: true, campaigns: stats });
    }

    let campaigns: Campaign[] = [];
    try {
      campaigns = await kv.get<Campaign[]>(CAMPAIGNS_KEY) || [];
    } catch {
      campaigns = [];
    }
    
    // Kod ile arama (promo code validation)
    if (code) {
      const campaign = campaigns.find(c => 
        c.code?.toLowerCase() === code.toLowerCase() && 
        c.active &&
        new Date(c.startDate) <= new Date() &&
        new Date(c.endDate) >= new Date() &&
        (!c.usageLimit || c.usageCount < c.usageLimit)
      );
      
      if (campaign) {
        return NextResponse.json({
          success: true,
          valid: true,
          campaign: {
            id: campaign.id,
            name: campaign.name,
            type: campaign.type,
            value: campaign.value,
            valueType: campaign.valueType,
            minAmount: campaign.minAmount,
            maxDiscount: campaign.maxDiscount,
          },
        });
      } else {
        return NextResponse.json({
          success: true,
          valid: false,
          message: "Invalid or expired promo code",
        });
      }
    }
    
    // Aktif kampanyalar
    if (activeOnly) {
      const now = new Date();
      campaigns = campaigns.filter(c => 
        c.active && 
        new Date(c.startDate) <= now && 
        new Date(c.endDate) >= now
      );
    }
    
    return NextResponse.json({
      success: true,
      campaigns: campaigns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    });
    
  } catch (error) {
    console.error("Campaigns GET error:", error);
    return NextResponse.json({
      success: false,
      campaigns: [],
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// POST - Kampanya işlemleri
export async function POST(request: NextRequest) {
  try {
    if (!(await verifyAuth(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await request.json();
    const { action, campaign, campaignId } = body;
    
    let campaigns: Campaign[] = await kv.get<Campaign[]>(CAMPAIGNS_KEY) || [];
    
    switch (action) {
      case "add": {
        const newCampaign: Campaign = {
          ...campaign,
          id: `campaign-${Date.now()}`,
          usageCount: 0,
          createdAt: new Date().toISOString(),
        };
        campaigns.push(newCampaign);
        break;
      }
      
      case "update": {
        const index = campaigns.findIndex(c => c.id === campaignId);
        if (index === -1) {
          return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
        }
        campaigns[index] = { ...campaigns[index], ...campaign };
        break;
      }
      
      case "toggle": {
        const idx = campaigns.findIndex(c => c.id === campaignId);
        if (idx !== -1) {
          campaigns[idx].active = !campaigns[idx].active;
        }
        break;
      }
      
      case "delete": {
        campaigns = campaigns.filter(c => c.id !== campaignId);
        break;
      }
      
      case "use": {
        // Kampanya kullanımını artır
        const idx = campaigns.findIndex(c => c.id === campaignId);
        if (idx !== -1) {
          campaigns[idx].usageCount += 1;
        }
        break;
      }
      
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    
    await kv.set(CAMPAIGNS_KEY, campaigns);
    
    return NextResponse.json({
      success: true,
      message: `Campaign ${action} successful`,
      campaigns,
    });
    
  } catch (error) {
    console.error("Campaigns POST error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({});
}
