import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const ROADMAP_KEY = 'website:roadmap';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const roadmap: any[] = await redis.get(ROADMAP_KEY) || [];
    const phase = roadmap.find(p => p.id === id);
    
    if (!phase) {
      return NextResponse.json({ error: 'Phase not found' }, { status: 404 });
    }
    
    return NextResponse.json(phase);
  } catch (error) {
    console.error('Roadmap fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch phase' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const roadmap: any[] = await redis.get(ROADMAP_KEY) || [];
    const filtered = roadmap.filter(p => p.id !== id);
    
    if (filtered.length === roadmap.length) {
      return NextResponse.json({ error: 'Phase not found' }, { status: 404 });
    }
    
    await redis.set(ROADMAP_KEY, filtered);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Roadmap delete error:', error);
    return NextResponse.json({ error: 'Failed to delete phase' }, { status: 500 });
  }
}
