import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { requireAdmin } from "@/lib/admin-auth";

const redis = Redis.fromEnv();
const VAULTS_KEY = 'website:vaults';

const DEFAULT_VAULTS = [
  {
    id: 'zurich',
    city: 'Zurich',
    country: 'Switzerland',
    flag: '🇨🇭',
    status: 'active',
    capacity: '10,000 kg',
    metals: ['AUXG', 'AUXS', 'AUXPT', 'AUXPD'],
    coordinates: { x: 52, y: 35 },
    description: { en: 'Primary vault in Switzerland', tr: 'İsviçre ana kasası' }
  },
  {
    id: 'istanbul',
    city: 'Istanbul',
    country: 'Türkiye',
    flag: '🇹🇷',
    status: 'active',
    capacity: '8,000 kg',
    metals: ['AUXG', 'AUXS', 'AUXPT', 'AUXPD'],
    coordinates: { x: 56, y: 37 },
    description: { en: 'Istanbul vault', tr: 'İstanbul kasası' }
  },
  {
    id: 'dubai',
    city: 'Dubai',
    country: 'UAE',
    flag: '🇦🇪',
    status: 'active',
    capacity: '12,000 kg',
    metals: ['AUXG', 'AUXS', 'AUXPT', 'AUXPD'],
    coordinates: { x: 63, y: 45 },
    description: { en: 'Middle East hub', tr: 'Orta Doğu merkezi' }
  },
  {
    id: 'singapore',
    city: 'Singapore',
    country: 'Singapore',
    flag: '🇸🇬',
    status: 'active',
    capacity: '20,000 kg',
    metals: ['AUXG', 'AUXS', 'AUXPT', 'AUXPD'],
    coordinates: { x: 80, y: 58 },
    description: { en: 'Silver Bullion — Asia-Pacific custodian', tr: 'Silver Bullion — Asya-Pasifik custodian' }
  },
  {
    id: 'london',
    city: 'London',
    country: 'United Kingdom',
    flag: '🇬🇧',
    status: 'inactive',
    capacity: '15,000 kg',
    metals: ['AUXG', 'AUXS'],
    coordinates: { x: 48, y: 32 },
    description: { en: 'LBMA certified London vault (inactive)', tr: 'LBMA sertifikalı Londra kasası (inaktif)' }
  },
];

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.authorized) return auth.response!;

    let vaults = await redis.get(VAULTS_KEY);
    if (!vaults) {
      await redis.set(VAULTS_KEY, DEFAULT_VAULTS);
      vaults = DEFAULT_VAULTS;
    }
    return NextResponse.json(vaults);
  } catch (error) {
    console.error('Vaults fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch vaults' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.authorized) return auth.response!;

    const vault = await request.json();
    const vaults: any[] = await redis.get(VAULTS_KEY) || [];
    
    if (!vault.id) {
      vault.id = `vault_${Date.now()}`;
    }
    
    vaults.push(vault);
    await redis.set(VAULTS_KEY, vaults);
    return NextResponse.json({ success: true, id: vault.id });
  } catch (error) {
    console.error('Vault create error:', error);
    return NextResponse.json({ error: 'Failed to create vault' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.authorized) return auth.response!;

    const vault = await request.json();
    const vaults: any[] = await redis.get(VAULTS_KEY) || [];
    
    const index = vaults.findIndex(v => v.id === vault.id);
    if (index === -1) {
      return NextResponse.json({ error: 'Vault not found' }, { status: 404 });
    }
    
    vaults[index] = vault;
    await redis.set(VAULTS_KEY, vaults);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Vault update error:', error);
    return NextResponse.json({ error: 'Failed to update vault' }, { status: 500 });
  }
}
