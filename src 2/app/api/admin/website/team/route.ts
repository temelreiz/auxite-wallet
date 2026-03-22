import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const TEAM_KEY = 'website:team';

const DEFAULT_TEAM = [
  {
    id: 'member_1',
    name: 'Alex Chen',
    role: { en: 'CEO & Co-Founder', tr: 'CEO & Kurucu Ortak' },
    bio: { 
      en: 'Former Goldman Sachs, 15+ years in precious metals trading and blockchain technology.', 
      tr: 'Eski Goldman Sachs, kıymetli maden ticareti ve blockchain teknolojisinde 15+ yıl deneyim.' 
    },
    avatar: '',
    linkedin: '#',
    twitter: '#',
    type: 'team',
    order: 1,
    active: true
  },
  {
    id: 'member_2',
    name: 'Sarah Mitchell',
    role: { en: 'CTO & Co-Founder', tr: 'CTO & Kurucu Ortak' },
    bio: { 
      en: 'Ex-Google engineer, smart contract specialist with deep DeFi experience.', 
      tr: 'Eski Google mühendisi, derin DeFi deneyimine sahip akıllı sözleşme uzmanı.' 
    },
    avatar: '',
    linkedin: '#',
    twitter: '#',
    type: 'team',
    order: 2,
    active: true
  },
  {
    id: 'advisor_1',
    name: 'Dr. Michael Park',
    role: { en: 'Blockchain Advisor', tr: 'Blockchain Danışmanı' },
    bio: { en: 'MIT Digital Currency Initiative', tr: 'MIT Dijital Para Birimi Girişimi' },
    avatar: '',
    linkedin: '#',
    type: 'advisor',
    order: 1,
    active: true
  },
  {
    id: 'partner_1',
    name: "Brink's",
    role: { en: 'Custody', tr: 'Saklama' },
    bio: { en: 'Global security and logistics', tr: 'Global güvenlik ve lojistik' },
    avatar: '🏦',
    type: 'partner',
    order: 1,
    active: true
  },
  {
    id: 'partner_2',
    name: 'Chainlink',
    role: { en: 'Oracle', tr: 'Oracle' },
    bio: { en: 'Decentralized oracle network', tr: 'Merkeziyetsiz oracle ağı' },
    avatar: '⛓️',
    type: 'partner',
    order: 2,
    active: true
  },
];

export async function GET() {
  try {
    let team = await redis.get(TEAM_KEY);
    if (!team) {
      await redis.set(TEAM_KEY, DEFAULT_TEAM);
      team = DEFAULT_TEAM;
    }
    return NextResponse.json(team);
  } catch (error) {
    console.error('Team fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const member = await req.json();
    const team: any[] = await redis.get(TEAM_KEY) || [];
    
    if (!member.id) {
      member.id = `member_${Date.now()}`;
    }
    
    team.push(member);
    await redis.set(TEAM_KEY, team);
    return NextResponse.json({ success: true, id: member.id });
  } catch (error) {
    console.error('Team create error:', error);
    return NextResponse.json({ error: 'Failed to create member' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const member = await req.json();
    const team: any[] = await redis.get(TEAM_KEY) || [];
    
    const index = team.findIndex(m => m.id === member.id);
    if (index === -1) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    
    team[index] = member;
    await redis.set(TEAM_KEY, team);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Team update error:', error);
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 });
  }
}
