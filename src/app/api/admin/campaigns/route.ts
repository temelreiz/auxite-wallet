// src/app/api/admin/campaigns/route.ts
// Auxite Wallet - Campaign Management API

import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

interface Campaign {
  id: string;
  name: { tr: string; en: string };
  description: { tr: string; en: string };
  type: 'discount' | 'bonus' | 'cashback' | 'referral' | 'limited';
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
}

const CAMPAIGNS_KEY = "auxite:campaigns";

// Auth helper
const verifyAuth = (request: NextRequest): boolean => {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  return token === process.env.ADMIN_PASSWORD;
};

// GET - Kampanyaları getir
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";
    const code = searchParams.get("code");
    
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
    if (!verifyAuth(request)) {
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
