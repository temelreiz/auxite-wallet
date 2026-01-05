import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const ROADMAP_KEY = 'website:roadmap';

const DEFAULT_ROADMAP = [
  {
    id: 'q1-2025',
    phase: 'Q1 2025',
    title: { en: 'Foundation', tr: 'Temel' },
    status: 'completed',
    items: [
      { text: { en: 'Smart contract development', tr: 'Akıllı sözleşme geliştirme' }, done: true },
      { text: { en: 'LBMA vault partnerships', tr: 'LBMA kasa ortaklıkları' }, done: true },
      { text: { en: 'Security audits', tr: 'Güvenlik denetimleri' }, done: true },
      { text: { en: 'Platform beta launch', tr: 'Platform beta lansmanı' }, done: true },
    ]
  },
  {
    id: 'q2-2025',
    phase: 'Q2 2025',
    title: { en: 'Soft Launch', tr: 'Yumuşak Lansman' },
    status: 'current',
    items: [
      { text: { en: 'Public soft launch', tr: 'Halka açık yumuşak lansman' }, done: true },
      { text: { en: 'AUXG & AUXS tokens live', tr: 'AUXG & AUXS tokenları canlı' }, done: true },
      { text: { en: 'Basic staking functionality', tr: 'Temel staking işlevselliği' }, done: true },
      { text: { en: 'Mobile app development', tr: 'Mobil uygulama geliştirme' }, done: false },
    ]
  },
  {
    id: 'q3-2025',
    phase: 'Q3 2025',
    title: { en: 'Expansion', tr: 'Genişleme' },
    status: 'upcoming',
    items: [
      { text: { en: 'AUXPT & AUXPD launch', tr: 'AUXPT & AUXPD lansmanı' }, done: false },
      { text: { en: 'Advanced staking tiers', tr: 'Gelişmiş staking seviyeleri' }, done: false },
      { text: { en: 'Dubai vault integration', tr: 'Dubai kasa entegrasyonu' }, done: false },
      { text: { en: 'Institutional API', tr: 'Kurumsal API' }, done: false },
    ]
  },
  {
    id: 'q4-2025',
    phase: 'Q4 2025',
    title: { en: 'Scale', tr: 'Ölçeklendirme' },
    status: 'upcoming',
    items: [
      { text: { en: 'Cross-chain bridges', tr: 'Çapraz zincir köprüleri' }, done: false },
      { text: { en: 'DeFi integrations', tr: 'DeFi entegrasyonları' }, done: false },
      { text: { en: 'Physical redemption', tr: 'Fiziksel teslim' }, done: false },
      { text: { en: 'Global expansion', tr: 'Global genişleme' }, done: false },
    ]
  },
];

export async function GET() {
  try {
    let roadmap = await redis.get(ROADMAP_KEY);
    if (!roadmap) {
      await redis.set(ROADMAP_KEY, DEFAULT_ROADMAP);
      roadmap = DEFAULT_ROADMAP;
    }
    return NextResponse.json(roadmap);
  } catch (error) {
    console.error('Roadmap fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch roadmap' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const phase = await req.json();
    const roadmap: any[] = await redis.get(ROADMAP_KEY) || [];
    
    if (!phase.id) {
      phase.id = `phase_${Date.now()}`;
    }
    
    roadmap.push(phase);
    await redis.set(ROADMAP_KEY, roadmap);
    return NextResponse.json({ success: true, id: phase.id });
  } catch (error) {
    console.error('Roadmap create error:', error);
    return NextResponse.json({ error: 'Failed to create phase' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const phase = await req.json();
    const roadmap: any[] = await redis.get(ROADMAP_KEY) || [];
    
    const index = roadmap.findIndex(p => p.id === phase.id);
    if (index === -1) {
      return NextResponse.json({ error: 'Phase not found' }, { status: 404 });
    }
    
    roadmap[index] = phase;
    await redis.set(ROADMAP_KEY, roadmap);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Roadmap update error:', error);
    return NextResponse.json({ error: 'Failed to update phase' }, { status: 500 });
  }
}
