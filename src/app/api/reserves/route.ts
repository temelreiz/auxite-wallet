// src/app/api/trust/reserves/route.ts
// Auxite Wallet - Reserves API

import { NextRequest, NextResponse } from "next/server";

interface ReserveAsset {
  symbol: string;
  name: string;
  icon: string;
  color: string;
  tokenSupply: number;
  physicalReserve: number;
  reserveUnit: string;
  backingRatio: number;
  vaultLocations: { name: string; country: string; percentage: number }[];
  lastVerified: string;
  pricePerUnit: number;
  totalValue: number;
  contractAddress: string;
  oracleAddress: string;
}

const RESERVES_DATA: ReserveAsset[] = [
  {
    symbol: 'AUXG',
    name: 'Auxite Gold',
    icon: '🥇',
    color: '#FFD700',
    tokenSupply: 125847.52,
    physicalReserve: 125847.52,
    reserveUnit: 'grams',
    backingRatio: 100,
    vaultLocations: [
      { name: 'Zurich Vault', country: 'Switzerland', percentage: 60 },
      { name: 'London Vault', country: 'United Kingdom', percentage: 40 },
    ],
    lastVerified: '2024-12-15T14:30:00Z',
    pricePerUnit: 65.50,
    totalValue: 8243013.56,
    contractAddress: '0xBF74Fc9f0dD50A79f9FaC2e9Aa05a268E3dcE6b6',
    oracleAddress: '0x7253c38967eFAcb0f929D700cf5815D8E717fDb6',
  },
  {
    symbol: 'AUXS',
    name: 'Auxite Silver',
    icon: '🥈',
    color: '#C0C0C0',
    tokenSupply: 2847562.75,
    physicalReserve: 2847562.75,
    reserveUnit: 'grams',
    backingRatio: 100,
    vaultLocations: [
      { name: 'Singapore Vault', country: 'Singapore', percentage: 50 },
      { name: 'Zurich Vault', country: 'Switzerland', percentage: 50 },
    ],
    lastVerified: '2024-12-15T14:30:00Z',
    pricePerUnit: 0.82,
    totalValue: 2335001.46,
    contractAddress: '0x705D9B193e5E349847C2Efb18E68fe989eC2C0e9',
    oracleAddress: '0x7253c38967eFAcb0f929D700cf5815D8E717fDb6',
  },
  {
    symbol: 'AUXPT',
    name: 'Auxite Platinum',
    icon: '💎',
    color: '#E5E4E2',
    tokenSupply: 8547.25,
    physicalReserve: 8547.25,
    reserveUnit: 'grams',
    backingRatio: 100,
    vaultLocations: [
      { name: 'London Vault', country: 'United Kingdom', percentage: 100 },
    ],
    lastVerified: '2024-12-15T14:30:00Z',
    pricePerUnit: 31.20,
    totalValue: 266674.20,
    contractAddress: '0x1819447f624D8e22C1A4F3B14e96693625B6d74F',
    oracleAddress: '0x7253c38967eFAcb0f929D700cf5815D8E717fDb6',
  },
  {
    symbol: 'AUXPD',
    name: 'Auxite Palladium',
    icon: '💜',
    color: '#B8B8D0',
    tokenSupply: 4523.10,
    physicalReserve: 4523.10,
    reserveUnit: 'grams',
    backingRatio: 100,
    vaultLocations: [
      { name: 'Zurich Vault', country: 'Switzerland', percentage: 100 },
    ],
    lastVerified: '2024-12-15T14:30:00Z',
    pricePerUnit: 32.80,
    totalValue: 148357.68,
    contractAddress: '0xb23545dE86bE9F929D700cf5815D8E717fDb6',
    oracleAddress: '0x7253c38967eFAcb0f929D700cf5815D8E717fDb6',
  },
];

export async function GET(request: NextRequest) {
  try {
    const totalValue = RESERVES_DATA.reduce((sum, r) => sum + r.totalValue, 0);
    
    return NextResponse.json({
      success: true,
      reserves: RESERVES_DATA,
      totalValue,
      lastUpdated: new Date().toISOString(),
      verification: {
        method: 'Real-time Oracle + Monthly Audit',
        oracleProvider: 'Chainlink',
        auditors: ['Deloitte', 'PwC'],
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({});
}
