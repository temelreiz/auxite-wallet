// src/app/api/mobile/config/route.ts
// Auxite Wallet - Mobile App Configuration API

import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

// Keys
const APP_CONFIG_KEY = "auxite:mobile:app-config";
const MAINTENANCE_KEY = "auxite:mobile:maintenance";
const FEATURES_KEY = "auxite:mobile:features";

// Default configs
const DEFAULT_APP_CONFIG = {
  ios: {
    minVersion: "1.0.0",
    currentVersion: "1.0.0",
    forceUpdate: false,
    storeUrl: "https://apps.apple.com/app/auxite",
  },
  android: {
    minVersion: "1.0.0",
    currentVersion: "1.0.0",
    forceUpdate: false,
    storeUrl: "https://play.google.com/store/apps/details?id=com.auxite",
  },
};

const DEFAULT_MAINTENANCE = {
  enabled: false,
  message: {
    tr: "Bakım çalışması yapılmaktadır. Lütfen daha sonra tekrar deneyin.",
    en: "Maintenance in progress. Please try again later.",
  },
  estimatedEnd: null,
  allowedVersions: [],
};

const DEFAULT_FEATURES = {
  cryptoTrading: true,
  metalTrading: true,
  leasing: true,
  staking: false,
  p2pTransfer: true,
  fiatDeposit: true,
  fiatWithdraw: true,
  cryptoDeposit: true,
  cryptoWithdraw: true,
  biometricAuth: true,
  darkMode: true,
  priceAlerts: true,
  referralProgram: false,
  nftSupport: false,
  dcaEnabled: true,
  alertsEnabled: true,
};

// GET - Mobil config'leri getir
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all";
    
    let response: any = {};
    
    // App Config
    if (type === "all" || type === "app") {
      try {
        const appConfig = await kv.get(APP_CONFIG_KEY);
        response.appConfig = appConfig || DEFAULT_APP_CONFIG;
      } catch {
        response.appConfig = DEFAULT_APP_CONFIG;
      }
    }
    
    // Maintenance
    if (type === "all" || type === "maintenance") {
      try {
        const maintenance = await kv.get(MAINTENANCE_KEY);
        response.maintenance = maintenance || DEFAULT_MAINTENANCE;
      } catch {
        response.maintenance = DEFAULT_MAINTENANCE;
      }
    }
    
    // Features
    if (type === "all" || type === "features") {
      try {
        const features = await kv.get(FEATURES_KEY);
        response.features = features || DEFAULT_FEATURES;
      } catch {
        response.features = DEFAULT_FEATURES;
      }
    }
    
    return NextResponse.json({
      success: true,
      ...response,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error("Mobile config GET error:", error);
    return NextResponse.json({
      success: false,
      appConfig: DEFAULT_APP_CONFIG,
      maintenance: DEFAULT_MAINTENANCE,
      features: DEFAULT_FEATURES,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// POST - Config güncelle (Admin only)
export async function POST(request: NextRequest) {
  try {
    // Auth kontrolü
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    
    if (!token || token !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await request.json();
    const { action } = body;
    
    switch (action) {
      case "update-app-config": {
        const { ios, android } = body;
        const config = { ios, android };
        await kv.set(APP_CONFIG_KEY, config);
        return NextResponse.json({ success: true, message: "App config updated", config });
      }
      
      case "set-maintenance": {
        const { enabled, message, estimatedEnd, allowedVersions } = body;
        const maintenance = { enabled, message, estimatedEnd, allowedVersions: allowedVersions || [] };
        await kv.set(MAINTENANCE_KEY, maintenance);
        return NextResponse.json({ success: true, message: "Maintenance config updated", maintenance });
      }
      
      case "update-features": {
        const { features } = body;
        
        // Mevcut features'ı al ve merge et
        let currentFeatures = await kv.get(FEATURES_KEY) || DEFAULT_FEATURES;
        const updatedFeatures = { ...currentFeatures, ...features };
        
        await kv.set(FEATURES_KEY, updatedFeatures);
        return NextResponse.json({ success: true, message: "Features updated", features: updatedFeatures });
      }
      
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    
  } catch (error) {
    console.error("Mobile config POST error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

// OPTIONS - CORS
export async function OPTIONS() {
  return NextResponse.json({});
}
