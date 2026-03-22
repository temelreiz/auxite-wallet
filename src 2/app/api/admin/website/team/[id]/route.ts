import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const TEAM_KEY = 'website:team';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const team: any[] = await redis.get(TEAM_KEY) || [];
    const member = team.find(m => m.id === id);
    
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    
    return NextResponse.json(member);
  } catch (error) {
    console.error('Team member fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch member' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const team: any[] = await redis.get(TEAM_KEY) || [];
    const filtered = team.filter(m => m.id !== id);
    
    if (filtered.length === team.length) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    
    await redis.set(TEAM_KEY, filtered);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Team member delete error:', error);
    return NextResponse.json({ error: 'Failed to delete member' }, { status: 500 });
  }
}
