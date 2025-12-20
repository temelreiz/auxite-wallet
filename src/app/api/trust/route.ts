// src/app/api/trust/overview/route.ts
// Auxite Wallet - Trust Center Overview API

import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const TRUST_DATA_KEY = "auxite:trust:overview";

interface SupplyData {
  symbol: string;
  name: string;
  totalSupply: number;
  circulatingSupply: number;
  reservesBacked: number;
  lastAudit: string;
  icon: string;
  color: string;
}

interface AuditReport {
  id: string;
  title: string;
  date: string;
  auditor: string;
  type: 'monthly' | 'quarterly' | 'annual';
  pdfUrl: string;
}

// Mock data for demonstration
const DEFAULT_SUPPLY: SupplyData[] = [
  { symbol: 'AUXG', name: 'Auxite Gold', totalSupply: 125847.52, circulatingSupply: 118234.18, reservesBacked: 100, lastAudit: '2024-12-15', icon: '🥇', color: '#FFD700' },
  { symbol: 'AUXS', name: 'Auxite Silver', totalSupply: 2847562.75, circulatingSupply: 2456123.50, reservesBacked: 100, lastAudit: '2024-12-15', icon: '🥈', color: '#C0C0C0' },
  { symbol: 'AUXPT', name: 'Auxite Platinum', totalSupply: 8547.25, circulatingSupply: 7823.80, reservesBacked: 100, lastAudit: '2024-12-15', icon: '💎', color: '#E5E4E2' },
  { symbol: 'AUXPD', name: 'Auxite Palladium', totalSupply: 4523.10, circulatingSupply: 4102.75, reservesBacked: 100, lastAudit: '2024-12-15', icon: '💜', color: '#B8B8D0' },
];

const DEFAULT_REPORTS: AuditReport[] = [
  { id: '1', title: 'December 2024 Reserve Attestation', date: '2024-12-15', auditor: 'Deloitte', type: 'monthly', pdfUrl: 'https://auxite.io/audits/dec-2024.pdf' },
  { id: '2', title: 'Q4 2024 Comprehensive Audit', date: '2024-12-01', auditor: 'PwC', type: 'quarterly', pdfUrl: 'https://auxite.io/audits/q4-2024.pdf' },
  { id: '3', title: 'November 2024 Reserve Attestation', date: '2024-11-15', auditor: 'Deloitte', type: 'monthly', pdfUrl: 'https://auxite.io/audits/nov-2024.pdf' },
  { id: '4', title: 'October 2024 Reserve Attestation', date: '2024-10-15', auditor: 'Deloitte', type: 'monthly', pdfUrl: 'https://auxite.io/audits/oct-2024.pdf' },
  { id: '5', title: 'Q3 2024 Comprehensive Audit', date: '2024-09-30', auditor: 'PwC', type: 'quarterly', pdfUrl: 'https://auxite.io/audits/q3-2024.pdf' },
];

// Calculate total reserves value
const calculateTotalReserves = (supply: SupplyData[]): string => {
  // Mock prices per gram in USD
  const prices: Record<string, number> = {
    AUXG: 65.50,  // Gold
    AUXS: 0.82,   // Silver
    AUXPT: 31.20, // Platinum
    AUXPD: 32.80, // Palladium
  };
  
  const total = supply.reduce((sum, asset) => {
    return sum + (asset.totalSupply * (prices[asset.symbol] || 0));
  }, 0);
  
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    maximumFractionDigits: 0 
  }).format(total);
};

export async function GET(request: NextRequest) {
  try {
    // Try to get cached data from KV
    let trustData = null;
    try {
      trustData = await kv.get(TRUST_DATA_KEY);
    } catch (e) {
      console.log("KV not available, using defaults");
    }
    
    // Use cached data or defaults
    const supply = trustData?.supply || DEFAULT_SUPPLY;
    const reports = trustData?.reports || DEFAULT_REPORTS;
    const totalReserves = calculateTotalReserves(supply);
    
    return NextResponse.json({
      success: true,
      supply,
      reports: reports.slice(0, 3), // Only latest 3 for overview
      totalReserves,
      lastUpdated: new Date().toISOString(),
      stats: {
        totalAssets: supply.length,
        backingRatio: 100,
        vaultCount: 3,
        auditorCount: 2,
      },
    });
    
  } catch (error) {
    console.error("Trust overview GET error:", error);
    return NextResponse.json({
      success: false,
      supply: DEFAULT_SUPPLY,
      reports: DEFAULT_REPORTS.slice(0, 3),
      totalReserves: calculateTotalReserves(DEFAULT_SUPPLY),
      lastUpdated: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function OPTIONS() {
  return NextResponse.json({});
}
